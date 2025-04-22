import { getRiskPatterns } from '@/lib/risk-patterns';
import { getSolanaClient } from '@/lib/solanaclient';

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get transaction data from request body
    const transaction = req.body;
    
    // Validate transaction
    if (!transaction) {
      return res.status(400).json({ error: 'Missing transaction data' });
    }
    
    // Get risk patterns
    const riskPatterns = await getRiskPatterns();
    
    // Analyze transaction risk
    const riskAnalysis = analyzeTransactionRisk(transaction, riskPatterns);
    
    // Return result
    return res.status(200).json(riskAnalysis);
  } catch (error) {
    console.error('Error analyzing transaction:', error);
    return res.status(500).json({ error: 'Failed to analyze transaction' });
  }
}

/**
 * Analyze transaction for risks
 * @param {Object} transaction - Transaction data
 * @param {Object} riskPatterns - Risk patterns
 * @returns {Object} Risk analysis result
 */
function analyzeTransactionRisk(transaction, riskPatterns) {
  // Initialize risk scores
  let addressRisk = 0;
  let programRisk = 0;
  let tokenRisk = 0;
  let instructionRisk = 0;
  let transactionRisk = 0;
  
  // Initialize risk factors
  const riskFactors = [];
  
  // Timestamp for analysis
  const analysisTimestamp = Date.now();
  
  // Check address risks
  addressRisk = analyzeAddressRisk(transaction, riskPatterns, riskFactors);
  
  // Check program risks
  programRisk = analyzeProgramRisk(transaction, riskPatterns, riskFactors);
  
  // Check token risks
  tokenRisk = analyzeTokenRisk(transaction, riskPatterns, riskFactors);
  
  // Check instruction risks
  instructionRisk = analyzeInstructionRisk(transaction, riskPatterns, riskFactors);
  
  // Check transaction pattern risks
  transactionRisk = analyzeTransactionPatternRisk(transaction, riskPatterns, riskFactors);
  
  // Risk weights for different factors
  const RISK_WEIGHTS = {
    ADDRESS: 0.3,
    PROGRAM: 0.25,
    TOKEN: 0.15,
    INSTRUCTION: 0.2,
    TRANSACTION: 0.1
  };
  
  // Calculate weighted risk score
  const riskScore = (
    (addressRisk * RISK_WEIGHTS.ADDRESS) +
    (programRisk * RISK_WEIGHTS.PROGRAM) +
    (tokenRisk * RISK_WEIGHTS.TOKEN) +
    (instructionRisk * RISK_WEIGHTS.INSTRUCTION) +
    (transactionRisk * RISK_WEIGHTS.TRANSACTION)
  );
  
  // Determine risk level based on thresholds
  let riskLevel;
  if (riskScore >= 70) {
    riskLevel = 'high';
  } else if (riskScore >= 40) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }
  
  // Prepare result
  return {
    riskLevel,
    riskScore: Math.round(riskScore),
    riskFactors,
    riskComponents: {
      addressRisk: Math.round(addressRisk),
      programRisk: Math.round(programRisk),
      tokenRisk: Math.round(tokenRisk),
      instructionRisk: Math.round(instructionRisk),
      transactionRisk: Math.round(transactionRisk)
    },
    analysisTimestamp
  };
}

/**
 * Analyze address risks
 * @param {Object} transaction - Transaction data
 * @param {Object} riskPatterns - Risk patterns
 * @param {Array} riskFactors - Risk factors array to update
 * @returns {number} Risk score (0-100)
 */
function analyzeAddressRisk(transaction, riskPatterns, riskFactors) {
  let riskScore = 0;
  
  // Check recipient against high-risk addresses
  if (transaction.recipient) {
    if (riskPatterns.ADDRESSES.HIGH_RISK.includes(transaction.recipient)) {
      riskScore += 100;
      riskFactors.push('Recipient is a known high-risk address');
    } else if (riskPatterns.ADDRESSES.MEDIUM_RISK.includes(transaction.recipient)) {
      riskScore += 60;
      riskFactors.push('Recipient has previous suspicious activity');
    }
  }
  
  // Check accounts in transaction
  if (transaction.accounts && transaction.accounts.length > 0) {
    for (const account of transaction.accounts) {
      if (riskPatterns.ADDRESSES.HIGH_RISK.includes(account.pubkey)) {
        riskScore += 100;
        riskFactors.push('Transaction involves a known high-risk address');
        break; // One high-risk address is enough
      } else if (riskPatterns.ADDRESSES.MEDIUM_RISK.includes(account.pubkey)) {
        riskScore += 60;
        riskFactors.push('Transaction involves an address with suspicious history');
      }
    }
  }
  
  // If it's a high-value transaction to an unknown address, increase risk
  if (transaction.amount && parseFloat(transaction.amount) > 100) {
    riskScore += 40;
    riskFactors.push('High-value transaction (> 100 SOL)');
  }
  
  return Math.min(riskScore, 100); // Cap at 100
}

/**
 * Analyze program risks
 * @param {Object} transaction - Transaction data
 * @param {Object} riskPatterns - Risk patterns
 * @param {Array} riskFactors - Risk factors array to update
 * @returns {number} Risk score (0-100)
 */
function analyzeProgramRisk(transaction, riskPatterns, riskFactors) {
  let riskScore = 0;
  
  // Extract all program IDs from transaction
  const programIds = [];
  
  if (transaction.instructions && transaction.instructions.length > 0) {
    transaction.instructions.forEach(instruction => {
      if (instruction.programId && !programIds.includes(instruction.programId)) {
        programIds.push(instruction.programId);
      }
    });
  }
  
  // Check against known risky programs
  for (const programId of programIds) {
    if (riskPatterns.PROGRAMS.HIGH_RISK.includes(programId)) {
      riskScore += 100;
      riskFactors.push(`Transaction involves a high-risk program: ${programId}`);
      break; // One high-risk program is enough
    } else if (riskPatterns.PROGRAMS.MEDIUM_RISK.includes(programId)) {
      riskScore += 60;
      riskFactors.push(`Transaction involves a program with known vulnerabilities: ${programId}`);
    }
  }
  
  // Check for unknown programs (not common ones)
  const commonPrograms = [
    '11111111111111111111111111111111', // System Program
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // Associated Token Program
  ];
  
  const unknownPrograms = programIds.filter(id => !commonPrograms.includes(id));
  if (unknownPrograms.length > 0) {
    riskScore += 30;
    riskFactors.push('Transaction involves uncommon programs');
  }
  
  return Math.min(riskScore, 100); // Cap at 100
}

/**
 * Analyze token risks
 * @param {Object} transaction - Transaction data
 * @param {Object} riskPatterns - Risk patterns
 * @param {Array} riskFactors - Risk factors array to update
 * @returns {number} Risk score (0-100)
 */
function analyzeTokenRisk(transaction, riskPatterns, riskFactors) {
  let riskScore = 0;
  
  // Extract all token mints from transaction
  const tokenMints = [];
  
  if (transaction.tokens && transaction.tokens.length > 0) {
    transaction.tokens.forEach(token => {
      if (token.mint && !tokenMints.includes(token.mint)) {
        tokenMints.push(token.mint);
      }
    });
  }
  
  // Check against known risky tokens
  for (const mint of tokenMints) {
    if (riskPatterns.TOKENS.HIGH_RISK.includes(mint)) {
      riskScore += 100;
      riskFactors.push(`Transaction involves a known scam token: ${mint}`);
      break; // One high-risk token is enough
    }
  }
  
  // Check for multiple token transfers in one transaction
  if (tokenMints.length > 2) {
    riskScore += 40;
    riskFactors.push('Transaction involves multiple tokens (unusual)');
  }
  
  return Math.min(riskScore, 100); // Cap at 100
}

/**
 * Analyze instruction risks
 * @param {Object} transaction - Transaction data
 * @param {Object} riskPatterns - Risk patterns
 * @param {Array} riskFactors - Risk factors array to update
 * @returns {number} Risk score (0-100)
 */
function analyzeInstructionRisk(transaction, riskPatterns, riskFactors) {
  let riskScore = 0;
  
  if (!transaction.instructions || transaction.instructions.length === 0) {
    return riskScore;
  }
  
  // Check for high-risk instruction patterns
  for (const instruction of transaction.instructions) {
    // Check instruction type/data against high-risk patterns
    for (const pattern of riskPatterns.INSTRUCTIONS.HIGH_RISK) {
      if (instruction.type && instruction.type.toLowerCase().includes(pattern.pattern.toLowerCase()) || 
          (instruction.data && instruction.data.toLowerCase().includes(pattern.pattern.toLowerCase()))) {
        riskScore += 80;
        riskFactors.push(`High-risk operation detected: ${pattern.description}`);
      }
    }
    
    // Check instruction type/data against medium-risk patterns
    for (const pattern of riskPatterns.INSTRUCTIONS.MEDIUM_RISK) {
      if (instruction.type && instruction.type.toLowerCase().includes(pattern.pattern.toLowerCase()) || 
          (instruction.data && instruction.data.toLowerCase().includes(pattern.pattern.toLowerCase()))) {
        riskScore += 50;
        riskFactors.push(`Potentially risky operation: ${pattern.description}`);
      }
    }
  }
  
  // Check for large number of instructions
  if (transaction.instructions.length > 5) {
    riskScore += 30;
    riskFactors.push('Complex transaction with many instructions');
  }
  
  return Math.min(riskScore, 100); // Cap at 100
}

/**
 * Analyze transaction pattern risks
 * @param {Object} transaction - Transaction data
 * @param {Object} riskPatterns - Risk patterns
 * @param {Array} riskFactors - Risk factors array to update
 * @returns {number} Risk score (0-100)
 */
function analyzeTransactionPatternRisk(transaction, riskPatterns, riskFactors) {
  let riskScore = 0;
  
  // Check for high-value transfers to unknown addresses
  if (transaction.type === 'SOL Transfer' && 
      transaction.amount && 
      parseFloat(transaction.amount) > 50) {
    
    // Check if recipient is known/trusted
    const isTrustedRecipient = false; // Would need a mechanism to check this
    
    if (!isTrustedRecipient) {
      riskScore += 60;
      riskFactors.push('High-value transfer to unknown address');
    }
  }
  
  // Check for token approval patterns
  const hasApproval = transaction.instructions && 
                    transaction.instructions.some(i => i.type === 'Approve');
  
  if (hasApproval) {
    riskScore += 50;
    riskFactors.push('Transaction grants token approval to another address');
  }
  
  // Check for multiple approvals in one transaction
  const approvalCount = transaction.instructions ? 
                      transaction.instructions.filter(i => i.type === 'Approve').length : 0;
  
  if (approvalCount > 1) {
    riskScore += 70;
    riskFactors.push('Transaction grants multiple token approvals (unusual)');
  }
  
  // Check for known risky transaction patterns
  for (const pattern of riskPatterns.TRANSACTIONS.HIGH_RISK) {
    if (checkTransactionPattern(transaction, pattern.pattern)) {
      riskScore += 80;
      riskFactors.push(pattern.description);
    }
  }
  
  for (const pattern of riskPatterns.TRANSACTIONS.MEDIUM_RISK) {
    if (checkTransactionPattern(transaction, pattern.pattern)) {
      riskScore += 50;
      riskFactors.push(pattern.description);
    }
  }
  
  return Math.min(riskScore, 100); // Cap at 100
}

/**
 * Check if transaction matches a pattern
 * @param {Object} transaction - Transaction data
 * @param {string} pattern - Pattern to check
 * @returns {boolean} True if matches
 */
function checkTransactionPattern(transaction, pattern) {
  // Simple pattern matching for now
  switch (pattern) {
    case 'multiple_token_approvals':
      return transaction.instructions && 
             transaction.instructions.filter(i => i.type === 'Approve').length > 1;
      
    case 'high_value_transfer':
      return transaction.type === 'SOL Transfer' && 
             transaction.amount && 
             parseFloat(transaction.amount) > 50;
      
    case 'new_program_interaction':
      if (!transaction.instructions) return false;
      
      const commonPrograms = [
        '11111111111111111111111111111111', // System Program
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // Associated Token Program
      ];
      
      return transaction.instructions.some(i => 
        i.programId && !commonPrograms.includes(i.programId)
      );
      
    default:
      return false;
  }
}