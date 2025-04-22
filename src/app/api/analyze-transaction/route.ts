/**
 * Transaction Analysis API
 * 
 * This API endpoint analyzes Solana transactions for security risks
 * and enriches them with AI-powered explanations.
 */

import { Configuration, OpenAIApi } from 'openai';
import { Connection, PublicKey } from '@solana/web3.js';
import { checkAddressBlacklist } from '../../../lib/securityChecks';
import { getTokenMetadata } from '../../../lib/tokenService';

// Initialize Solana connection
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

// Initialize OpenAI configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Extract data from request
    const { transaction, url } = req.body;
    
    if (!transaction) {
      return res.status(400).json({
        error: 'Transaction data is required'
      });
    }
    
    // Enrich transaction data with additional info
    const enrichedTransaction = await enrichTransactionData(transaction, url);
    
    // Perform security analysis
    const securityAnalysis = await analyzeTransaction(enrichedTransaction);
    
    // Generate AI explanation if OpenAI API key is available
    let aiAnalysis = null;
    if (configuration.apiKey) {
      try {
        aiAnalysis = await generateAIAnalysis(enrichedTransaction, securityAnalysis);
      } catch (aiError) {
        console.error('Error generating AI analysis:', aiError);
      }
    }
    
    // Combine all analysis results
    const result = {
      ...securityAnalysis,
      aiAnalysis,
      timestamp: Date.now()
    };
    
    // Log the analysis for monitoring and improvement
    try {
      await logTransactionAnalysis({
        transaction: enrichedTransaction,
        analysis: result,
        url
      });
    } catch (logError) {
      console.error('Error logging transaction analysis:', logError);
    }
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('Error analyzing transaction:', error);
    return res.status(500).json({
      error: 'An error occurred during transaction analysis',
      message: error.message
    });
  }
}

/**
 * Enrich transaction data with additional information
 * @param {Object} transaction - Raw transaction data
 * @param {string} url - Originating URL
 * @returns {Object} Enriched transaction data
 */
async function enrichTransactionData(transaction, url) {
  const enriched = { ...transaction, url };
  
  // Get token information if token address is available
  if (transaction.token && transaction.token.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
    try {
      const tokenInfo = await getTokenMetadata(transaction.token);
      if (tokenInfo) {
        enriched.tokenInfo = tokenInfo;
      }
    } catch (error) {
      console.error('Error getting token metadata:', error);
    }
  }
  
  // Validate addresses
  if (transaction.to && transaction.to.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
    try {
      // Check if destination is blacklisted
      const isBlacklisted = await checkAddressBlacklist(transaction.to);
      if (isBlacklisted) {
        enriched.destinationBlacklisted = true;
        enriched.blacklistReason = isBlacklisted.reason || 'Address is blacklisted';
      }
      
      // Get on-chain account info
      try {
        const publicKey = new PublicKey(transaction.to);
        const accountInfo = await connection.getAccountInfo(publicKey);
        
        if (accountInfo) {
          enriched.destinationAccountExists = true;
          enriched.destinationAccountInfo = {
            owner: accountInfo.owner.toString(),
            executable: accountInfo.executable,
            lamports: accountInfo.lamports
          };
        } else {
          enriched.destinationAccountExists = false;
        }
      } catch (solanaError) {
        console.error('Error getting Solana account info:', solanaError);
      }
    } catch (error) {
      console.error('Error checking address blacklist:', error);
    }
  }
  
  return enriched;
}

/**
 * Analyze transaction for security risks
 * @param {Object} transaction - Transaction data
 * @returns {Object} Security analysis result
 */
async function analyzeTransaction(transaction) {
  // Initialize risk analysis
  let riskScore = 20; // Base risk
  const riskFactors = [];
  
  // Check transaction type
  const transactionType = transaction.type || 'unknown';
  
  // Unknown transaction types are riskier
  if (transactionType === 'unknown') {
    riskScore += 20;
    riskFactors.push({
      category: 'Unknown Type',
      description: 'Unable to determine transaction type',
      severity: 'medium'
    });
  }
  
  // Check approval transactions
  if (transactionType === 'approve' || transactionType === 'approval') {
    riskScore += 15;
    riskFactors.push({
      category: 'Token Approval',
      description: 'Transaction grants permission to spend tokens on your behalf',
      severity: 'medium'
    });
  }
  
  // Check blacklisted destination
  if (transaction.destinationBlacklisted) {
    riskScore += 50;
    riskFactors.push({
      category: 'Blacklisted Address',
      description: transaction.blacklistReason || 'Destination address is blacklisted',
      severity: 'high'
    });
  }
  
  // Check URL for suspicious patterns
  if (transaction.url) {
    const url = transaction.url.toLowerCase();
    const highRiskPatterns = ['airdrop', 'free', 'claim', 'giveaway', 'reward', 'nft.gift'];
    const mediumRiskPatterns = ['swap', 'stake', 'presale', 'mint', 'verify'];
    
    if (highRiskPatterns.some(pattern => url.includes(pattern))) {
      riskScore += 35;
      riskFactors.push({
        category: 'Suspicious Website',
        description: 'Transaction initiated from a potentially suspicious website',
        severity: 'high'
      });
    } else if (mediumRiskPatterns.some(pattern => url.includes(pattern))) {
      riskScore += 15;
      riskFactors.push({
        category: 'Caution Website',
        description: 'Transaction initiated from a website that requires caution',
        severity: 'medium'
      });
    }
  }
  
  // Check token information
  if (transaction.tokenInfo) {
    // Check new tokens (potential scams)
    if (transaction.tokenInfo.createdAt) {
      const createdDate = new Date(transaction.tokenInfo.createdAt);
      const now = new Date();
      const daysSinceCreation = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
      
      if (daysSinceCreation < 7) {
        riskScore += 20;
        riskFactors.push({
          category: 'New Token',
          description: `Token was created only ${daysSinceCreation} days ago`,
          severity: 'high'
        });
      } else if (daysSinceCreation < 30) {
        riskScore += 10;
        riskFactors.push({
          category: 'Recent Token',
          description: `Token was created ${daysSinceCreation} days ago`,
          severity: 'medium'
        });
      }
    }
    
    // Check suspicious token names
    const suspiciousTokenPatterns = ['elon', 'musk', 'safe', 'moon', 'shib', 'inu', 'doge', 'pepe'];
    if (transaction.tokenInfo.name && suspiciousTokenPatterns.some(pattern => 
        transaction.tokenInfo.name.toLowerCase().includes(pattern))) {
      riskScore += 15;
      riskFactors.push({
        category: 'Suspicious Token Name',
        description: 'Token name contains patterns common in scam tokens',
        severity: 'medium'
      });
    }
  }
  
  // Check transaction amount for large transfers
  if (transaction.amount) {
    const amount = parseFloat(transaction.amount);
    if (!isNaN(amount)) {
      if (amount > 1000) {
        riskScore += 15;
        riskFactors.push({
          category: 'Large Transfer',
          description: `Transaction involves a large amount: ${amount}`,
          severity: 'medium'
        });
      }
    }
  }
  
  // Cap risk score at 100
  riskScore = Math.min(Math.round(riskScore), 100);
  
  // Determine risk level
  let riskLevel = 'low';
  if (riskScore > 70) {
    riskLevel = 'high';
  } else if (riskScore > 40) {
    riskLevel = 'medium';
  }
  
  // Generate summary
  let summary = '';
  
  if (riskScore > 70) {
    summary = `This ${transactionType} transaction has a high risk score (${riskScore}/100). Review carefully before proceeding.`;
  } else if (riskScore > 40) {
    summary = `This ${transactionType} transaction has a medium risk score (${riskScore}/100). Consider reviewing before proceeding.`;
  } else {
    summary = `This ${transactionType} transaction has a low risk score (${riskScore}/100).`;
  }
  
  return {
    riskScore,
    riskLevel,
    transactionType,
    riskFactors,
    summary
  };
}

/**
 * Generate AI explanation of transaction risks
 * @param {Object} transaction - Transaction data
 * @param {Object} analysis - Security analysis
 * @returns {Object} AI analysis result
 */
async function generateAIAnalysis(transaction, analysis) {
  try {
    // Format transaction data for analysis
    let transactionDescription = `Transaction Type: ${transaction.type || 'Unknown'}\n`;
    
    if (transaction.from) {
      transactionDescription += `From Address: ${transaction.from}\n`;
    }
    
    if (transaction.to) {
      transactionDescription += `To Address: ${transaction.to}\n`;
    }
    
    if (transaction.amount) {
      transactionDescription += `Amount: ${transaction.amount}\n`;
    }
    
    if (transaction.token) {
      transactionDescription += `Token: ${transaction.token}\n`;
    }
    
    if (transaction.tokenInfo) {
      transactionDescription += `Token Name: ${transaction.tokenInfo.name || 'Unknown'}\n`;
      transactionDescription += `Token Symbol: ${transaction.tokenInfo.symbol || 'Unknown'}\n`;
      if (transaction.tokenInfo.createdAt) {
        transactionDescription += `Token Creation Date: ${new Date(transaction.tokenInfo.createdAt).toDateString()}\n`;
      }
    }
    
    if (transaction.url) {
      transactionDescription += `Originating Website: ${transaction.url}\n`;
    }
    
    transactionDescription += `\nRisk Score: ${analysis.riskScore}/100 (${analysis.riskLevel} risk)\n`;
    
    if (analysis.riskFactors && analysis.riskFactors.length > 0) {
      transactionDescription += `\nIdentified Risk Factors:\n`;
      
      analysis.riskFactors.forEach(factor => {
        transactionDescription += `- ${factor.category}: ${factor.description} (${factor.severity} severity)\n`;
      });
    }
    
    // Send to OpenAI for analysis
    const completion = await openai.createChatCompletion({
      model: "gpt-4", // Using a capable model
      messages: [
        {
          role: "system",
          content: `You are a blockchain security expert specializing in Solana transactions. 
                   Your job is to analyze transaction details and explain the potential security risks and recommendations in simple terms.
                   Keep your explanations concise (3-4 sentences max), non-technical, and focused on actionable advice.
                   Be straightforward about risks, but don't be alarmist unless there are clear danger signs.`
        },
        {
          role: "user",
          content: `Analyze this Solana transaction for security risks and explain in simple terms what the user should know:\n\n${transactionDescription}`
        }
      ],
      max_tokens: 200,
      temperature: 0.5,
    });
    
    return {
      explanation: completion.data.choices[0].message.content,
      confidence: 'high'
    };
    
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    return {
      explanation: "Unable to generate AI analysis at this time.",
      confidence: 'none',
      error: true
    };
  }
}

/**
 * Log transaction analysis for monitoring and improvement
 * @param {Object} data - Analysis data to log
 */
async function logTransactionAnalysis(data) {
  try {
    // This would typically store to a database
    console.log('Transaction analysis logged:', JSON.stringify(data));
    
    // In a production environment, you would store this data in a database
    // const response = await fetch(`${process.env.LOGGING_API_URL}/transaction-logs`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.LOGGING_API_KEY}`
    //   },
    //   body: JSON.stringify(data)
    // });
    
    // if (!response.ok) {
    //   throw new Error(`Logging API error: ${response.status}`);
    // }
    
    return true;
  } catch (error) {
    console.error('Error logging transaction analysis:', error);
    return false;
  }
}