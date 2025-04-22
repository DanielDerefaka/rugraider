/**
 * Community alerts API endpoint
 * Provides security alerts for the Solana ecosystem
 */

export default async function handler(req, res) {
    // Only accept GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
      // Get alerts from database or external service
      // For demo purposes, we'll return static alerts
      const alerts = getCommunityAlerts();
      
      // Return result
      return res.status(200).json({ alerts });
    } catch (error) {
      console.error('Error getting community alerts:', error);
      return res.status(500).json({ error: 'Failed to get community alerts' });
    }
  }
  
  /**
   * Get community alerts
   * In a real implementation, this would pull from a database
   * @returns {Array} Alerts
   */
  function getCommunityAlerts() {
    // Current date for reference
    const now = Date.now();
    
    // Example alerts (static for demo)
    return [
      {
        id: 'alert-001',
        title: 'Phishing campaign targeting Solana wallet users',
        description: 'Users are receiving emails and Discord messages claiming to offer SOL rewards. These messages contain links to fake websites that steal private keys.',
        severity: 'high',
        category: 'phishing',
        affectedWallets: ['Phantom', 'Solflare'],
        timestamp: now - 24 * 60 * 60 * 1000, // 1 day ago
        active: true
      },
      {
        id: 'alert-002',
        title: 'Suspicious token airdrop activity',
        description: 'Several users have reported receiving unknown tokens that prompt them to visit malicious websites to "claim" additional rewards.',
        severity: 'medium',
        category: 'scam',
        affectedWallets: ['All Solana wallets'],
        timestamp: now - 48 * 60 * 60 * 1000, // 2 days ago
        active: true
      },
      {
        id: 'alert-003',
        title: 'Wallet draining exploit patched',
        description: 'A recently discovered vulnerability affecting Solana wallet extensions has been patched. Users should update their wallet software immediately.',
        severity: 'critical',
        category: 'vulnerability',
        affectedWallets: ['Phantom'],
        timestamp: now - 5 * 24 * 60 * 60 * 1000, // 5 days ago
        active: true
      },
      {
        id: 'alert-004',
        title: 'Fake NFT marketplace scam',
        description: 'A fraudulent NFT marketplace is operating under a name similar to a popular platform. Always verify URLs carefully.',
        severity: 'medium',
        category: 'scam',
        affectedWallets: ['All Solana wallets'],
        timestamp: now - 7 * 24 * 60 * 60 * 1000, // 7 days ago
        active: true
      },
      {
        id: 'alert-005',
        title: 'Counterfeit token warning',
        description: 'Counterfeit tokens with names similar to popular projects are being distributed. Always verify token addresses before trading.',
        severity: 'medium',
        category: 'scam',
        affectedWallets: ['All Solana wallets'],
        timestamp: now - 10 * 24 * 60 * 60 * 1000, // 10 days ago
        active: true
      }
    ];
  }