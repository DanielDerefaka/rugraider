/**
 * Risk Patterns Database
 * Centralized database of risk patterns for security analysis
 */

// In-memory cache for patterns
let patternsCache = null;
let lastUpdate = 0;

/**
 * Get risk patterns
 * @returns {Promise<Object>} Risk patterns
 */
export async function getRiskPatterns() {
  // Cache for 1 hour
  const now = Date.now();
  const cacheTime = 60 * 60 * 1000; // 1 hour
  
  if (patternsCache && (now - lastUpdate < cacheTime)) {
    return patternsCache;
  }
  
  try {
    // In a real implementation, this would fetch from a database or API
    // For demo purposes, we'll return static patterns
    patternsCache = getStaticRiskPatterns();
    lastUpdate = now;
    return patternsCache;
  } catch (error) {
    console.error('Error getting risk patterns:', error);
    // Return last cached patterns if available, otherwise fallback to static patterns
    return patternsCache || getStaticRiskPatterns();
  }
}

/**
 * Get static risk patterns
 * @returns {Object} Risk patterns
 */
function getStaticRiskPatterns() {
  return {
    // Address-based risk patterns
    ADDRESSES: {
      HIGH_RISK: [
        // Known scam/phishing addresses (dummy examples for the demo)
        '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
        '3CCPPwTxSix7nt1qJzqR4qPsYHnKsK5APJVWbNPJ4Vxo',
        '7YttLkHMK3rkZvwvRYTLBdijEvnkhSh2NScRqL8JBLrb'
      ],
      MEDIUM_RISK: [
        // Addresses with previous suspicious activity (dummy examples)
        '7YHZVGWRpCJBBPixEpYMbm3UQP5NyN6Uof2N4LoYMxS9',
        '5Zzguz4NsSRFxGkHfM4FmsFpGZiCDvL8h7PavtN3BfXg'
      ]
    },
    
    // Program-based risk patterns
    PROGRAMS: {
      HIGH_RISK: [
        // Known malicious programs (dummy examples)
        'MaLiC10usPr0graMh3re1234567890123456789012',
        'ScamD3tect0rProgramAddr3ss123456789012345678'
      ],
      MEDIUM_RISK: [
        // Programs with previous vulnerabilities (dummy examples)
        'Vu1n3rab13Pr0gram1234567890123456789012345'
      ],
      LOW_RISK: []
    },
    
    // Token-based risk patterns
    TOKENS: {
      HIGH_RISK: [
        // Known scam tokens (dummy examples)
        'ScamT0k3nM1ntAddr3ss1234567890123456789012',
        'FAKE123456789012345678901234567890123456789'
      ],
      MEDIUM_RISK: [],
      LOW_RISK: []
    },
    
    // Instruction-based risk patterns
    INSTRUCTIONS: {
      HIGH_RISK: [
        // High-risk instruction patterns
        {
          pattern: 'setAuthority',
          description: 'Changing account authority'
        },
        {
          pattern: 'closeAccount',
          description: 'Closing an account and withdrawing funds'
        }
      ],
      MEDIUM_RISK: [
        // Medium-risk instruction patterns
        {
          pattern: 'approve',
          description: 'Approving token delegation'
        }
      ],
      LOW_RISK: []
    },
    
    // Transaction-based risk patterns
    TRANSACTIONS: {
      HIGH_RISK: [
        // High-risk transaction patterns
        {
          pattern: 'multiple_token_approvals',
          description: 'Multiple token approvals in one transaction'
        },
        {
          pattern: 'high_value_transfer',
          description: 'High-value transfer to unknown address'
        }
      ],
      MEDIUM_RISK: [
        // Medium-risk transaction patterns
        {
          pattern: 'new_program_interaction',
          description: 'Interaction with a new program'
        }
      ],
      LOW_RISK: []
    }
  };
}

/**
 * Update risk patterns
 * @param {Object} newPatterns - New risk patterns
 * @returns {Promise<boolean>} Success status
 */
export async function updateRiskPatterns(newPatterns) {
  try {
    // In a real implementation, this would update patterns in a database
    // For demo purposes, we'll just update the cache
    patternsCache = newPatterns;
    lastUpdate = Date.now();
    return true;
  } catch (error) {
    console.error('Error updating risk patterns:', error);
    return false;
  }
}