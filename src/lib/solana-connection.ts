import { Connection, PublicKey, ConnectionConfig } from '@solana/web3.js';

// RPC node configuration
const CONNECTION_CONFIG: ConnectionConfig = {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
  disableRetryOnRateLimit: true, // We'll handle rate limits ourselves
};

// List of available RPC endpoints - add more options for better fallback capabilities
const RPC_ENDPOINTS = [
  // Your current endpoint
  'https://mainnet.helius-rpc.com/?api-key=56ad7ab1-3b24-442a-9141-0b362594dac9',
  'https://solana-api.projectserum.com',
  'https://ssc-dao.genesysgo.net',
  'https://api.metaplex.solana.com',
  

];

 // Public RPCs (add these as backups)
  // 'https://api.mainnet-beta.solana.com',
  // 'https://solana-api.projectserum.com',
  // 'https://rpc.ankr.com/solana', 
  // 'https://solana-mainnet.rpc.extrnode.com',
  
  // Add your Alchemy API if you have one (commented out for now)
  // 'https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY',

// Tracking RPC request stats with enhanced metrics
interface EndpointStats {
  url: string;
  requestCount: number;
  lastRequestTime: number;
  errorCount: number;
  consecutiveErrors: number;
  lastErrorTime: number | null;
  cooldownUntil: number | null;
  avgResponseTime: number;
  successRate: number;
  requestLog: {
    timestamp: number;
    success: boolean;
    responseTime?: number;
  }[];
}

// Create a connection with intelligent endpoint selection
class SolanaConnectionManager {
  private endpoints: string[] = RPC_ENDPOINTS;
  private currentEndpointIndex = 0;
  private connection: Connection;
  
  // Track endpoint stats to make smarter decisions
  private endpointStats: EndpointStats[] = [];
  
  // Request throttling with per-endpoint tracking
  private maxRequestsPerMinute = 45; // Conservative limit
  private globalRequestsPerMinute = 100; // Global limit across all endpoints
  private globalRequestLog: number[] = []; // Timestamps of all requests
  
  // Track pending requests to avoid overwhelming the node
  private pendingRequests = 0;
  private maxConcurrentRequests = 10;
  
  constructor() {
    // Initialize stats for all endpoints
    this.endpoints.forEach((url) => {
      this.endpointStats.push({
        url,
        requestCount: 0,
        lastRequestTime: 0,
        errorCount: 0,
        consecutiveErrors: 0,
        lastErrorTime: null,
        cooldownUntil: null,
        avgResponseTime: 0,
        successRate: 1.0, // Start optimistic
        requestLog: [],
      });
    });
    
    // Start with first endpoint
    this.connection = new Connection(
      this.endpoints[this.currentEndpointIndex],
      CONNECTION_CONFIG
    );
    
    // Set up periodic health checks and stats calculation
    this.setupPeriodicTasks();
  }

  // Get the current connection
  getConnection(): Connection {
    return this.connection;
  }

  // Setup periodic maintenance tasks
  private setupPeriodicTasks(): void {
    // Check endpoint health every 2 minutes
    setInterval(() => {
      this.checkEndpointHealth().catch(console.error);
    }, 2 * 60 * 1000);
    
    // Recalculate endpoint stats every minute
    setInterval(() => {
      this.recalculateEndpointStats();
    }, 60 * 1000);
    
    // Cleanup old request logs every 5 minutes
    setInterval(() => {
      this.cleanupOldLogs();
    }, 5 * 60 * 1000);
  }
  
  // Clean up old request logs to prevent memory bloat
  private cleanupOldLogs(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Clean global request log
    this.globalRequestLog = this.globalRequestLog.filter(time => time > oneHourAgo);
    
    // Clean endpoint-specific logs
    this.endpointStats.forEach(stats => {
      stats.requestLog = stats.requestLog.filter(log => log.timestamp > oneHourAgo);
    });
  }

  // Check if we should throttle our requests
  private shouldThrottle(endpointIndex: number): boolean {
    const now = Date.now();
    const stats = this.endpointStats[endpointIndex];
    
    // Check if endpoint is in cooldown
    if (stats.cooldownUntil && now < stats.cooldownUntil) {
      return true;
    }
    
    // Count requests in the last minute for this endpoint
    const recentRequests = stats.requestLog.filter(
      log => log.timestamp > now - 60000
    ).length;
    
    // Clean up old global timestamps (older than 1 minute)
    this.globalRequestLog = this.globalRequestLog.filter(
      time => time > now - 60000
    );
    
    // Check if we're over our per-endpoint or global limits
    const overPerEndpointLimit = recentRequests >= this.maxRequestsPerMinute;
    const overGlobalLimit = this.globalRequestLog.length >= this.globalRequestsPerMinute;
    const tooManyConcurrent = this.pendingRequests >= this.maxConcurrentRequests;
    
    return overPerEndpointLimit || overGlobalLimit || tooManyConcurrent;
  }

  // Recalculate endpoint statistics
  private recalculateEndpointStats(): void {
    const now = Date.now();
    const recentWindow = now - 10 * 60 * 1000; // Last 10 minutes
    
    this.endpointStats.forEach(stats => {
      const recentLogs = stats.requestLog.filter(log => log.timestamp > recentWindow);
      
      if (recentLogs.length > 0) {
        // Calculate success rate
        const successfulRequests = recentLogs.filter(log => log.success).length;
        stats.successRate = successfulRequests / recentLogs.length;
        
        // Calculate average response time
        const responseTimes = recentLogs
          .filter(log => log.responseTime !== undefined)
          .map(log => log.responseTime as number);
          
        if (responseTimes.length > 0) {
          stats.avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        }
      }
    });
  }

  // Select the best endpoint to use based on comprehensive metrics
  private selectBestEndpoint(): number {
    const now = Date.now();
    
    // Step 1: Filter out endpoints in cooldown
    let availableEndpoints = this.endpointStats
      .map((stats, index) => ({ stats, index }))
      .filter(({ stats }) => !stats.cooldownUntil || now > stats.cooldownUntil);
    
    // If all endpoints are in cooldown, use the one with shortest cooldown time
    if (availableEndpoints.length === 0) {
      const endpointsSorted = this.endpointStats
        .map((stats, index) => ({ stats, index }))
        .sort((a, b) => (a.stats.cooldownUntil || Infinity) - (b.stats.cooldownUntil || Infinity));
      
      return endpointsSorted[0].index;
    }
    
    // Step 2: Score endpoints based on multiple factors
    const scoredEndpoints = availableEndpoints.map(({ stats, index }) => {
      // Calculate a score (higher is better)
      const errorPenalty = stats.errorCount * 5;
      const responsePenalty = stats.avgResponseTime / 50; // Penalty for slow responses
      const successBonus = stats.successRate * 100;
      
      const score = successBonus - errorPenalty - responsePenalty;
      
      return { index, score };
    });
    
    // Step 3: Sort by score and pick the best
    scoredEndpoints.sort((a, b) => b.score - a.score);
    return scoredEndpoints[0].index;
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

  // Calculate dynamic backoff time based on consecutive errors and endpoint health
  private calculateBackoffTime(endpointIndex: number): number {
    const stats = this.endpointStats[endpointIndex];
    
    // Exponential backoff based on consecutive errors
    // Start at 1 second, double each time, cap at 60 seconds
    const baseTime = Math.min(1000 * Math.pow(2, stats.consecutiveErrors), 60000);
    
    // Add jitter to prevent all clients from retrying simultaneously
    const jitter = Math.random() * 1000;
    
    return baseTime + jitter;
  }

  // Execute a function with advanced fallback, throttling, and retry logic
  async executeWithFallback<T>(
    fn: (connection: Connection) => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let retries = 0;
    let result: T;
    let lastError: Error | null = null;
    
    // Try until success or max retries reached
    while (retries <= maxRetries) {
      // Get best endpoint before each attempt
      if (retries > 0) {
        this.switchEndpoint();
      }
      
      const endpointIndex = this.currentEndpointIndex;
      const endpoint = this.endpoints[endpointIndex];
      const stats = this.endpointStats[endpointIndex];
      
      // Check if we need to throttle requests
      if (this.shouldThrottle(endpointIndex)) {
        const backoffTime = this.calculateBackoffTime(endpointIndex);
        console.warn(`Throttling requests to endpoint ${endpoint}. Waiting ${backoffTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        continue; // Try again with possibly a different endpoint
      }
      
      // Record this request timestamp for throttling (both global and endpoint-specific)
      const now = Date.now();
      this.globalRequestLog.push(now);
      
      // Create request log entry
      const requestLogEntry = {
        timestamp: now,
        success: false,
      };
      stats.requestLog.push(requestLogEntry);
      
      // Update stats for current endpoint
      stats.requestCount++;
      stats.lastRequestTime = now;
      this.pendingRequests++;
      
      // Measure response time
      const startTime = performance.now();
      
      try {
        // Execute the RPC call
        result = await fn(this.connection);
        
        // Record successful request
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        requestLogEntry.success = true;
        requestLogEntry.responseTime = responseTime;
        
        // Reset consecutive error count on success
        stats.consecutiveErrors = 0;
        
        // Recover slightly from previous errors
        if (stats.errorCount > 0) {
          stats.errorCount = Math.max(0, stats.errorCount - 0.5);
        }
        
        this.pendingRequests--;
        return result;
      } catch (error: any) {
        this.pendingRequests--;
        const endTime = performance.now();
        requestLogEntry.responseTime = endTime - startTime;
        
        const errorMessage = error?.message || '';
        lastError = error;
        
        // Update error stats for current endpoint
        stats.errorCount++;
        stats.consecutiveErrors++;
        stats.lastErrorTime = now;
        
        // Identify different types of RPC errors
        const isRateLimit = 
          errorMessage.includes('429') || 
          errorMessage.includes('Too many requests') ||
          errorMessage.includes('Rate limit exceeded');
          
        const isServerError = 
          errorMessage.includes('500') || 
          errorMessage.includes('502') ||
          errorMessage.includes('503') ||
          errorMessage.includes('504') ||
          errorMessage.includes('Internal Server Error');
          
        const isAuthError = 
          errorMessage.includes('403') || 
          errorMessage.includes('401') ||
          errorMessage.includes('Access forbidden') ||
          errorMessage.includes('Unauthorized');
        
        // Apply different strategies based on error type
        if (isRateLimit) {
          // For rate limits, apply longer cooldown
          const cooldownTime = Math.min(60000, stats.consecutiveErrors * 10000); // Max 60 sec
          stats.cooldownUntil = now + cooldownTime;
          
          console.warn(`Rate limit (429) on endpoint ${endpoint}. Cooldown for ${cooldownTime/1000}s.`);
          
          // Immediate switch to another endpoint
          this.switchEndpoint();
        } else if (isServerError) {
          // For server errors, apply short cooldown
          const cooldownTime = Math.min(30000, stats.consecutiveErrors * 5000); // Max 30 sec
          stats.cooldownUntil = now + cooldownTime;
          
          console.warn(`Server error on endpoint ${endpoint}. Cooldown for ${cooldownTime/1000}s.`);
        } else if (isAuthError) {
          // For auth errors, apply longer cooldown as they won't resolve quickly
          stats.cooldownUntil = now + 5 * 60 * 1000; // 5 minutes
          
          console.warn(`Auth error on endpoint ${endpoint}. Cooldown for 5 minutes.`);
        }
        
        if (retries < maxRetries) {
          // Apply backoff before retry
          const backoffTime = this.calculateBackoffTime(endpointIndex);
          
          console.warn(`RPC error (${errorMessage}). Retrying in ${backoffTime/1000}s (${retries + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          
          retries++;
        } else {
          console.error(`Exhausted all retries (${maxRetries}). Last error:`, error);
          throw error;
        }
      }
    }
    
    throw lastError || new Error('Exhausted all RPC fallback attempts');
  }

  // Add a custom RPC endpoint
  addEndpoint(url: string): void {
    // Check if endpoint already exists
    if (!this.endpoints.includes(url)) {
      this.endpoints.push(url);
      
      // Initialize stats for the new endpoint
      this.endpointStats.push({
        url,
        requestCount: 0,
        lastRequestTime: 0,
        errorCount: 0,
        consecutiveErrors: 0,
        lastErrorTime: null,
        cooldownUntil: null,
        avgResponseTime: 0,
        successRate: 1.0, // Start optimistic
        requestLog: [],
      });
      
      console.log(`Added new RPC endpoint: ${url}`);
    }
  }
  
  // Remove an RPC endpoint
  removeEndpoint(url: string): void {
    const index = this.endpoints.indexOf(url);
    if (index >= 0) {
      this.endpoints.splice(index, 1);
      this.endpointStats.splice(index, 1);
      
      // If current endpoint was removed, switch to another
      if (this.currentEndpointIndex === index) {
        this.switchEndpoint();
      } else if (this.currentEndpointIndex > index) {
        // Adjust current index if it's after the removed one
        this.currentEndpointIndex--;
      }
      
      console.log(`Removed RPC endpoint: ${url}`);
    }
  }
  
  // Prioritize a specific endpoint
  prioritizeEndpoint(url: string): void {
    const index = this.endpoints.indexOf(url);
    if (index >= 0) {
      // Reset errors and cooldown
      const stats = this.endpointStats[index];
      stats.errorCount = 0;
      stats.consecutiveErrors = 0;
      stats.cooldownUntil = null;
      
      // Switch to this endpoint
      this.currentEndpointIndex = index;
      this.connection = new Connection(url, CONNECTION_CONFIG);
      
      console.log(`Prioritized RPC endpoint: ${url}`);
    }
  }

  // Check endpoint health and dynamically adjust request limits
  async checkEndpointHealth(): Promise<void> {
    // Test all endpoints with a simple request
    for (let i = 0; i < this.endpoints.length; i++) {
      const endpoint = this.endpoints[i];
      const stats = this.endpointStats[i];
      
      // Skip endpoints in cooldown
      if (stats.cooldownUntil && Date.now() < stats.cooldownUntil) {
        continue;
      }
      
      // Create isolated connection for health check
      const connection = new Connection(endpoint, CONNECTION_CONFIG);
      
      try {
        // Measure response time
        const startTime = performance.now();
        
        // Simple health check
        await connection.getSlot();
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        // Update success stats
        stats.requestLog.push({
          timestamp: Date.now(),
          success: true,
          responseTime
        });
        
        // Reset error counts slightly for successful check
        stats.consecutiveErrors = 0;
        if (stats.errorCount > 0) {
          stats.errorCount = Math.max(0, stats.errorCount - 1);
        }
      } catch (error) {
        console.warn(`Health check failed for endpoint ${endpoint}:`, error);
        
        // Log failure
        stats.requestLog.push({
          timestamp: Date.now(),
          success: false
        });
        
        stats.errorCount++;
        stats.consecutiveErrors++;
      }
    }
    
    // Recalculate stats after health checks
    this.recalculateEndpointStats();
  }
  
  // Get health status for reporting
  getEndpointStatus(): {
    currentEndpoint: string;
    endpointStats: {
      url: string;
      status: 'healthy' | 'degraded' | 'unhealthy' | 'cooldown';
      successRate: number;
      avgResponseTime: number;
      errorCount: number;
      inCooldown: boolean;
    }[];
  } {
    const currentEndpoint = this.endpoints[this.currentEndpointIndex];
    const now = Date.now();
    
    return {
      currentEndpoint,
      endpointStats: this.endpointStats.map(stats => {
        // Determine status
        let status: 'healthy' | 'degraded' | 'unhealthy' | 'cooldown';
        
        if (stats.cooldownUntil && now < stats.cooldownUntil) {
          status = 'cooldown';
        } else if (stats.successRate > 0.9 && stats.consecutiveErrors === 0) {
          status = 'healthy';
        } else if (stats.successRate > 0.5) {
          status = 'degraded';
        } else {
          status = 'unhealthy';
        }
        
        return {
          url: stats.url,
          status,
          successRate: Math.round(stats.successRate * 100) / 100,
          avgResponseTime: Math.round(stats.avgResponseTime),
          errorCount: stats.errorCount,
          inCooldown: !!(stats.cooldownUntil && now < stats.cooldownUntil)
        };
      })
    };
  }
}

// Create and export a singleton instance
export const connectionManager = new SolanaConnectionManager();

// Helper function to get the current connection
export const getConnection = (): Connection => {
  return connectionManager.getConnection();
};