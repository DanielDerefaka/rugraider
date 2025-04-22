import { Connection, PublicKey, ConnectionConfig } from '@solana/web3.js';

// RPC node configuration
const CONNECTION_CONFIG: ConnectionConfig = {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
  disableRetryOnRateLimit: false,
};

// List of available RPC endpoints
const RPC_ENDPOINTS = [
  // 'https://solana-mainnet.g.alchemy.com/v2/uXEESXWDyeWYXYeXDYJcaLfNT97Gv4vW',
  'https://mainnet.helius-rpc.com/?api-key=56ad7ab1-3b24-442a-9141-0b362594dac9',
];

// Tracking RPC request stats
interface EndpointStats {
  requestCount: number;
  lastRequestTime: number;
  errorCount: number;
  lastErrorTime: number | null;
  cooldownUntil: number | null;
}

// Create a connection with intelligent endpoint selection
class SolanaConnectionManager {
  private endpoints: string[] = RPC_ENDPOINTS;
  private currentEndpointIndex = 0;
  private connection: Connection;
  
  // Track endpoint stats to make smarter decisions
  private endpointStats: EndpointStats[] = [];
  
  // Request throttling
  private requestTimestamps: number[] = [];
  private maxRequestsPerMinute = 45; // Conservative limit
  
  constructor() {
    // Initialize stats for all endpoints
    this.endpoints.forEach(() => {
      this.endpointStats.push({
        requestCount: 0,
        lastRequestTime: 0,
        errorCount: 0,
        lastErrorTime: null,
        cooldownUntil: null,
      });
    });
    
    // Start with first endpoint
    this.connection = new Connection(
      this.endpoints[this.currentEndpointIndex],
      CONNECTION_CONFIG
    );
  }

  // Get the current connection
  getConnection(): Connection {
    return this.connection;
  }

  // Check if we should throttle our requests
  private shouldThrottle(): boolean {
    const now = Date.now();
    
    // Clean up old timestamps (older than 1 minute)
    this.requestTimestamps = this.requestTimestamps.filter(
      time => now - time < 60000
    );
    
    // If we've made too many requests in the last minute, throttle
    return this.requestTimestamps.length >= this.maxRequestsPerMinute;
  }

  // Select the best endpoint to use based on error history and cooldowns
  private selectBestEndpoint(): number {
    const now = Date.now();
    
    // Check for endpoints not in cooldown
    const availableEndpoints = this.endpointStats
      .map((stats, index) => ({ stats, index }))
      .filter(({ stats }) => !stats.cooldownUntil || now > stats.cooldownUntil);
    
    if (availableEndpoints.length === 0) {
      // All endpoints in cooldown, use the one with shortest cooldown time
      const endpointsSorted = this.endpointStats
        .map((stats, index) => ({ stats, index }))
        .sort((a, b) => (a.stats.cooldownUntil || 0) - (b.stats.cooldownUntil || 0));
      
      return endpointsSorted[0].index;
    }
    
    // Prefer endpoints with fewer errors
    return availableEndpoints
      .sort((a, b) => a.stats.errorCount - b.stats.errorCount)
      [0].index;
  }

  // Switch to best RPC endpoint
  switchEndpoint(): Connection {
    const previousEndpoint = this.currentEndpointIndex;
    this.currentEndpointIndex = this.selectBestEndpoint();
    
    // Only create new connection if endpoint actually changed
    if (previousEndpoint !== this.currentEndpointIndex) {
      this.connection = new Connection(
        this.endpoints[this.currentEndpointIndex],
        CONNECTION_CONFIG
      );
      console.log(`Switched to RPC endpoint: ${this.endpoints[this.currentEndpointIndex]}`);
    }
    
    return this.connection;
  }

  // Execute a function with smart RPC endpoint selection and throttling
  async executeWithFallback<T>(
    fn: (connection: Connection) => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let retries = 0;
    
    while (retries < maxRetries) {
      // Check if we need to throttle requests
      if (this.shouldThrottle()) {
        // Wait 2 seconds if we're making too many requests
        console.warn("Throttling requests to avoid rate limits. Waiting 2 seconds...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Record this request timestamp for throttling
      const now = Date.now();
      this.requestTimestamps.push(now);
      
      // Update stats for current endpoint
      const stats = this.endpointStats[this.currentEndpointIndex];
      stats.requestCount++;
      stats.lastRequestTime = now;
      
      try {
        // Execute the RPC call
        return await fn(this.connection);
      } catch (error: any) {
        const errorMessage = error?.message || '';
        
        // Update error stats for current endpoint
        stats.errorCount++;
        stats.lastErrorTime = now;
        
        // Check if error is related to RPC limitations
        const isRpcError = errorMessage.includes('403') || 
                          errorMessage.includes('429') || 
                          errorMessage.includes('Access forbidden') ||
                          errorMessage.includes('Too many requests') ||
                          errorMessage.includes('Rate limit exceeded');
        
        if (isRpcError) {
          // Put endpoint in cooldown for progressively longer times based on error count
          const cooldownTime = Math.min(30000, stats.errorCount * 5000); // Max 30 sec cooldown
          stats.cooldownUntil = now + cooldownTime;
          
          console.warn(`RPC error (${errorMessage}). Endpoint in cooldown for ${cooldownTime/1000}s.`);
          
          if (retries < maxRetries - 1) {
            this.switchEndpoint(); // Switch to a better endpoint
            retries++;
            // Add delay between retries to avoid immediate rate limit on next endpoint
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw error;
          }
        } else {
          // Non-RPC error, just throw it
          throw error;
        }
      }
    }
    
    throw new Error('Exhausted all RPC fallback attempts');
  }

  // Check endpoint health and dynamically adjust request limits
  async checkEndpointHealth(): Promise<void> {
    // Call this periodically to test endpoints and adjust limits
    for (let i = 0; i < this.endpoints.length; i++) {
      const connection = new Connection(this.endpoints[i], CONNECTION_CONFIG);
      try {
        // Simple health check
        await connection.getSlot();
        
        // Reset error count slightly for successful check
        if (this.endpointStats[i].errorCount > 0) {
          this.endpointStats[i].errorCount = Math.max(0, this.endpointStats[i].errorCount - 1);
        }
      } catch (error) {
        console.warn(`Health check failed for endpoint ${i}:`, error);
        this.endpointStats[i].errorCount++;
      }
    }
  }
}

// Create and export a singleton instance
export const connectionManager = new SolanaConnectionManager();

// Helper function to get the current connection
export const getConnection = (): Connection => {
  return connectionManager.getConnection();
};

// Set up periodic health checks (every 5 minutes)
setInterval(() => {
  connectionManager.checkEndpointHealth().catch(console.error);
}, 5 * 60 * 1000);