import { getSolanaClient } from '@/lib/solanaclient';
import { getRiskPatterns } from '@/lib/risk-patterns';
import { getOpenAIClient } from '@/lib/openaiextension';

export default async function handler(req, res) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get address from query params
    const { address, options } = req.query;
    
    // Validate address
    if (!address || address.length < 32) {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }
    
    // Parse options
    const scanOptions = {
      deepScan: options?.deepScan !== 'false',
      tokenScan: options?.tokenScan !== 'false',
      aiAnalysis: options?.aiAnalysis !== 'false'
    };
    
    // Get Solana client
    const solana = getSolanaClient();
    
    // Get risk patterns
    const riskPatterns = await getRiskPatterns();
    
    // Scan address
    const scanResult = await scanSolanaAddress(solana, address, riskPatterns, scanOptions);
    
    // Return result
    return res.status(200).json(scanResult);
  } catch (error) {
    console.error('Error scanning address:', error);
    return res.status(500).json({ error: 'Failed to scan address' });
  }
}

/**
 * Scan a Solana address for security risks
 * @param {Object} solana - Solana client
 * @param {string} address - Solana address to scan
 * @param {Object} riskPatterns - Risk patterns
 * @param {Object} options - Scan options
 * @returns {Object} Scan result
 */
async function scanSolanaAddress(solana, address, riskPatterns, options) {
  try {
    // Initial scan result
    const result = {
      address,
      timestamp: Date.now(),
      riskLevel: 'unknown',
      riskScore: 0,
      riskFactors: [],
      recommendations: [],
      aiAnalysis: null
    };
    
    // Check if address is in high-risk list
    if (riskPatterns.ADDRESSES.HIGH_RISK.includes(address)) {
      result.riskLevel = 'high';
      result.riskScore = 100;
      result.riskFactors.push('Address is known to be associated with scams or malicious activity');
      result.recommendations.push('Avoid any interactions with this address');
    } else if (riskPatterns.ADDRESSES.MEDIUM_RISK.includes(address)) {
      result.riskLevel = 'medium';
      result.riskScore = 60;
      result.riskFactors.push('Address has suspicious history or has been reported for questionable activity');
      result.recommendations.push('Proceed with extreme caution when interacting with this address');
    }
    
    // Get basic account info
    const accountInfo = await getAccountInfo(solana, address);
    Object.assign(result, accountInfo);
    
    // Get transaction history if doing deep scan
    if (options.deepScan) {
      const txHistory = await getTransactionHistory(solana, address);
      result.transactions = txHistory.transactions;
      result.transactionCount = txHistory.total;
      
      // Analyze transaction patterns
      const txAnalysis = analyzeTransactionPatterns(txHistory.transactions, riskPatterns);
      
      // Update risk factors based on transaction analysis
      result.riskFactors = [...result.riskFactors, ...txAnalysis.riskFactors];
      
      // Update recommendations based on transaction analysis
      result.recommendations = [...result.recommendations, ...txAnalysis.recommendations];
      
      // Update risk score based on transaction analysis
      if (result.riskScore < txAnalysis.riskScore) {
        result.riskScore = txAnalysis.riskScore;
        
        // Update risk level based on new score
        if (result.riskScore >= 70) {
          result.riskLevel = 'high';
        } else if (result.riskScore >= 40) {
          result.riskLevel = 'medium';
        } else {
          result.riskLevel = 'low';
        }
      }
    }
    
    // Get token holdings if doing token scan
    if (options.tokenScan) {
      const tokenHoldings = await getTokenHoldings(solana, address);
      result.tokens = tokenHoldings.tokens;
      
      // Check tokens against known risk patterns
      const tokenAnalysis = analyzeTokens(tokenHoldings.tokens, riskPatterns);
      
      // Update risk factors based on token analysis
      result.riskFactors = [...result.riskFactors, ...tokenAnalysis.riskFactors];
      
      // Update risk score based on token analysis
      if (result.riskScore < tokenAnalysis.riskScore) {
        result.riskScore = tokenAnalysis.riskScore;
        
        // Update risk level based on new score
        if (result.riskScore >= 70) {
          result.riskLevel = 'high';
        } else if (result.riskScore >= 40) {
          result.riskLevel = 'medium';
        } else {
          result.riskLevel = 'low';
        }
      }
    }
    
    // If risk level is still unknown after all analysis, set to low
    if (result.riskLevel === 'unknown') {
      result.riskLevel = 'low';
      result.riskScore = Math.min(result.riskScore, 30);
    }
    
    // Get AI analysis if option is enabled
    if (options.aiAnalysis) {
      try {
        const aiAnalysis = await getAIAnalysis(address, result);
        result.aiAnalysis = aiAnalysis;
      } catch (error) {
        console.error('Error getting AI analysis:', error);
        result.aiAnalysis = null;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error scanning address:', error);
    throw error;
  }
}

/**
 * Get account information
 * @param {Object} solana - Solana client
 * @param {string} address - Solana address
 * @returns {Object} Account information
 */
async function getAccountInfo(solana, address) {
  try {
    // Get account info from Solana
    const accountInfo = await solana.connection.getAccountInfo(
      new solana.PublicKey(address)
    );
    
    // Get SOL balance
    const balance = await solana.connection.getBalance(
      new solana.PublicKey(address)
    );
    
    // Convert lamports to SOL
    const solBalance = balance / 1000000000;
    
    return {
      exists: !!accountInfo,
      solBalance,
      owner: accountInfo?.owner?.toString() || null,
      executable: accountInfo?.executable || false,
      programData: accountInfo?.data?.length > 0,
    };
  } catch (error) {
    console.error('Error getting account info:', error);
    return {
      exists: false,
      solBalance: 0,
      owner: null,
      executable: false,
      programData: false
    };
  }
}

/**
 * Get transaction history
 * @param {Object} solana - Solana client
 * @param {string} address - Solana address
 * @returns {Object} Transaction history
 */
async function getTransactionHistory(solana, address) {
  try {
    // Get recent transactions
    const publicKey = new solana.PublicKey(address);
    const transactionSignatures = await solana.connection.getSignaturesForAddress(
      publicKey,
      { limit: 10 } // Limit to 10 most recent transactions for performance
    );
    
    // Process signatures
    const transactions = [];
    
    for (const signature of transactionSignatures) {
      try {
        // Get transaction details
        const tx = await solana.connection.getTransaction(signature.signature);
        
        if (tx) {
          // Extract basic transaction info
          const transaction = {
            signature: signature.signature,
            timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
            status: tx.meta?.err ? 'failed' : 'success',
            fee: tx.meta?.fee / 1000000000, // Convert lamports to SOL
            type: determineTransactionType(tx)
          };
          
          // Extract amount for transfers
          if (transaction.type === 'Transfer') {
            const preBalances = tx.meta?.preBalances || [];
            const postBalances = tx.meta?.postBalances || [];
            const accountKeys = tx.transaction?.message?.accountKeys || [];
            
            // Find index of our address
            const addressIndex = accountKeys.findIndex(key => 
              key.toString() === address
            );
            
            if (addressIndex >= 0) {
              // Calculate amount based on balance change
              const balanceDiff = Math.abs(
                (postBalances[addressIndex] || 0) - (preBalances[addressIndex] || 0)
              );
              
              // Convert lamports to SOL and adjust for fee if sender
              transaction.amount = balanceDiff / 1000000000;
              
              // Determine if incoming or outgoing
              if ((postBalances[addressIndex] || 0) < (preBalances[addressIndex] || 0)) {
                transaction.direction = 'outgoing';
              } else {
                transaction.direction = 'incoming';
              }
            }
          }
          
          transactions.push(transaction);
        }
      } catch (error) {
        console.error('Error processing transaction:', error);
        // Continue with next transaction
      }
    }
    
    return {
      total: transactionSignatures.length,
      transactions
    };
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return {
      total: 0,
      transactions: []
    };
  }
}

/**
 * Get token holdings
 * @param {Object} solana - Solana client
 * @param {string} address - Solana address
 * @returns {Object} Token holdings
 */
async function getTokenHoldings(solana, address) {
  try {
    // Get token accounts
    const tokenAccounts = await solana.connection.getParsedTokenAccountsByOwner(
      new solana.PublicKey(address),
      { programId: new solana.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );
    
    const tokens = {};
    
    // Process token accounts
    for (const account of tokenAccounts.value) {
      const tokenInfo = account.account.data.parsed?.info;
      
      if (tokenInfo && tokenInfo.mint && tokenInfo.tokenAmount) {
        const mint = tokenInfo.mint;
        const amount = tokenInfo.tokenAmount.uiAmount || 0;
        const decimals = tokenInfo.tokenAmount.decimals || 0;
        
        // Use mint as key, eventually would be replaced with symbol lookup
        const symbol = getTokenSymbol(mint) || mint.slice(0, 6);
        
        tokens[symbol] = {
          mint,
          balance: amount,
          decimals
        };
      }
    }
    
    return {
      tokens
    };
  } catch (error) {
    console.error('Error getting token holdings:', error);
    return {
      tokens: {}
    };
  }
}

/**
 * Analyze transaction patterns
 * @param {Array} transactions - Transaction data
 * @param {Object} riskPatterns - Risk patterns
 * @returns {Object} Analysis result
 */
function analyzeTransactionPatterns(transactions, riskPatterns) {
  const result = {
    riskFactors: [],
    recommendations: [],
    riskScore: 0
  };
  
  // Skip if no transactions
  if (!transactions || transactions.length === 0) {
    return result;
  }
  
  // Check for high value outgoing transfers
  const highValueOutgoing = transactions.filter(tx => 
    tx.direction === 'outgoing' && 
    tx.amount && 
    tx.amount > 50
  );
  
  if (highValueOutgoing.length > 0) {
    result.riskFactors.push(`${highValueOutgoing.length} high-value outgoing transfers detected`);
    result.recommendations.push('Monitor large outgoing transfers carefully');
    result.riskScore = Math.max(result.riskScore, 40);
  }
  
  // Check for high frequency of transactions
  const now = Date.now();
  const recentTransactions = transactions.filter(tx => 
    tx.timestamp && 
    (now - tx.timestamp) < 24 * 60 * 60 * 1000 // Last 24 hours
  );
  
  if (recentTransactions.length > 5) {
    result.riskFactors.push(`High transaction frequency: ${recentTransactions.length} transactions in the last 24 hours`);
    result.riskScore = Math.max(result.riskScore, 30);
  }
  
  // Check for failed transactions
  const failedTransactions = transactions.filter(tx => tx.status === 'failed');
  
  if (failedTransactions.length > 2) {
    result.riskFactors.push(`${failedTransactions.length} failed transactions detected`);
    result.recommendations.push('Review recent failed transactions for potential issues');
    result.riskScore = Math.max(result.riskScore, 20);
  }
  
  return result;
}

/**
 * Analyze token holdings
 * @param {Object} tokens - Token holdings
 * @param {Object} riskPatterns - Risk patterns
 * @returns {Object} Analysis result
 */
function analyzeTokens(tokens, riskPatterns) {
  const result = {
    riskFactors: [],
    riskScore: 0
  };
  
  // Skip if no tokens
  if (!tokens || Object.keys(tokens).length === 0) {
    return result;
  }
  
  // Check for known scam tokens
  for (const [symbol, token] of Object.entries(tokens)) {
    if (riskPatterns.TOKENS.HIGH_RISK.includes(token.mint)) {
      result.riskFactors.push(`Holding known scam token: ${symbol}`);
      result.riskScore = 100;
    }
  }
  
  // Check for unusually large number of tokens
  if (Object.keys(tokens).length > 30) {
    result.riskFactors.push(`Unusually large number of different tokens: ${Object.keys(tokens).length}`);
    result.riskScore = Math.max(result.riskScore, 40);
  }
  
  return result;
}

/**
 * Get AI analysis of an address
 * @param {string} address - Solana address
 * @param {Object} scanResult - Scan result
 * @returns {Object} AI analysis
 */
async function getAIAnalysis(address, scanResult) {
  try {
    // Get OpenAI client
    const openai = getOpenAIClient();
    
    // Format input for AI
    const input = formatAddressForAI(address, scanResult);
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: `You are a Solana blockchain security expert. Analyze the provided address information and provide security insights.
          
Format your response as JSON with the following fields:
- summary: A brief one-sentence summary of the address risk assessment
- details: A detailed explanation of any security concerns or notable patterns
- recommendations: Array of specific recommendations for interacting with this address`
        },
        { role: 'user', content: input }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 800
    });
    
    // Parse response
    const content = response.choices[0]?.message?.content;
    const parsedResponse = JSON.parse(content);
    
    return {
      ...parsedResponse,
      generatedBy: 'openai',
      model: 'gpt-4',
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error getting AI analysis:', error);
    
    // Return fallback analysis
    return generateFallbackAnalysis(address, scanResult);
  }
}

/**
 * Format address data for AI analysis
 * @param {string} address - Solana address
 * @param {Object} scanResult - Scan result
 * @returns {string} Formatted address data
 */
function formatAddressForAI(address, scanResult) {
  let formatted = `## Address Information\n\n`;
  
  formatted += `Address: ${address}\n\n`;
  
  // Add basic account info
  formatted += `SOL Balance: ${scanResult.solBalance || 0} SOL\n`;
  formatted += `Risk Level: ${scanResult.riskLevel || 'Unknown'}\n`;
  formatted += `Risk Score: ${scanResult.riskScore || 0}/100\n\n`;
  
  // Add risk factors
  if (scanResult.riskFactors && scanResult.riskFactors.length > 0) {
    formatted += `## Risk Factors\n\n`;
    
    scanResult.riskFactors.forEach((factor, index) => {
      formatted += `${index + 1}. ${factor}\n`;
    });
    
    formatted += `\n`;
  }
  
  // Add transaction information
  if (scanResult.transactions && scanResult.transactions.length > 0) {
    formatted += `## Recent Transactions\n\n`;
    formatted += `Total Transactions: ${scanResult.transactionCount || scanResult.transactions.length}\n\n`;
    
    scanResult.transactions.slice(0, 5).forEach((tx, index) => {
      formatted += `### Transaction ${index + 1}\n`;
      formatted += `Type: ${tx.type || 'Unknown'}\n`;
      formatted += `Amount: ${tx.amount || 'Unknown'} SOL\n`;
      formatted += `Direction: ${tx.direction || 'Unknown'}\n`;
      formatted += `Status: ${tx.status || 'Unknown'}\n\n`;
    });
  }
  
  // Add token information
  if (scanResult.tokens && Object.keys(scanResult.tokens).length > 0) {
    formatted += `## Token Holdings\n\n`;
    
    Object.entries(scanResult.tokens).slice(0, 10).forEach(([symbol, token]) => {
      formatted += `- ${symbol}: ${token.balance || 0}\n`;
    });
    
    const totalTokens = Object.keys(scanResult.tokens).length;
    if (totalTokens > 10) {
      formatted += `- ... and ${totalTokens - 10} more tokens\n`;
    }
    
    formatted += `\n`;
  }
  
  return formatted;
}

/**
 * Generate fallback AI analysis
 * @param {string} address - Solana address
 * @param {Object} scanResult - Scan result
 * @returns {Object} Fallback analysis
 */
function generateFallbackAnalysis(address, scanResult) {
  let summary = '';
  let details = '';
  let recommendations = [];
  
  // Generate summary based on risk level
  switch (scanResult.riskLevel) {
    case 'high':
      summary = 'This address has been identified as high risk and should be approached with extreme caution.';
      details = 'Our security scan has detected significant risk factors associated with this address. ';
      
      if (scanResult.riskFactors && scanResult.riskFactors.length > 0) {
        details += `Specific concerns include: ${scanResult.riskFactors.join(', ')}. `;
      }
      
      recommendations = [
        'Avoid sending funds to this address',
        'Do not approve any token permissions requested by this address',
        'Report this address if you have been asked to interact with it'
      ];
      break;
      
    case 'medium':
      summary = 'This address shows some potentially concerning patterns and should be approached with caution.';
      details = 'Our security scan has detected some potential risk factors associated with this address. ';
      
      if (scanResult.riskFactors && scanResult.riskFactors.length > 0) {
        details += `Specific concerns include: ${scanResult.riskFactors.join(', ')}. `;
      }
      
      recommendations = [
        'Verify the legitimacy of this address through trusted channels',
        'Limit exposure when interacting with this address',
        'Monitor transactions carefully'
      ];
      break;
      
    case 'low':
      summary = 'This address appears to have a normal activity pattern with no significant security concerns.';
      details = 'Our security scan did not detect any significant risk factors associated with this address. ';
      
      if (scanResult.solBalance && scanResult.solBalance > 0) {
        details += `The address holds ${scanResult.solBalance} SOL. `;
      }
      
      if (scanResult.tokens && Object.keys(scanResult.tokens).length > 0) {
        details += `The address holds ${Object.keys(scanResult.tokens).length} different tokens. `;
      }
      
      recommendations = [
        'Follow standard security practices when interacting with this address',
        'Always verify the address is correct before sending funds'
      ];
      break;
      
    default:
      summary = 'Limited information is available for this address.';
      details = 'Our security scan was unable to gather sufficient information to provide a comprehensive analysis.';
      recommendations = [
        'Proceed with caution when interacting with addresses that have limited history',
        'Verify the address through trusted channels before sending any significant funds'
      ];
  }
  
  return {
    summary,
    details,
    recommendations,
    generatedBy: 'fallback',
    timestamp: Date.now()
  };
}

/**
 * Determine transaction type
 * @param {Object} tx - Transaction data
 * @returns {string} Transaction type
 */
function determineTransactionType(tx) {
  // Check for system program transfers
  const message = tx.transaction?.message;
  const instructions = message?.instructions || [];
  
  // Check for simple SOL transfer
  const hasSystemTransfer = instructions.some(ix => 
    ix.programId?.toString() === '11111111111111111111111111111111' && 
    ix.parsed?.type === 'transfer'
  );
  
  if (hasSystemTransfer) {
    return 'Transfer';
  }
  
  // Check for token transfers
  const hasTokenTransfer = instructions.some(ix => 
    ix.programId?.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' && 
    ix.parsed?.type === 'transfer'
  );
  
  if (hasTokenTransfer) {
    return 'Token Transfer';
  }
  
  // Check for token swaps (simplified)
  const hasMultipleTokenInstructions = instructions.filter(ix => 
    ix.programId?.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
  ).length > 2;
  
  if (hasMultipleTokenInstructions) {
    return 'Swap';
  }
  
  // Check for NFT-related operations
  const hasMetaplexInstruction = instructions.some(ix => 
    ix.programId?.toString() === 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
  );
  
  if (hasMetaplexInstruction) {
    return 'NFT';
  }
  
  // Default to "Other" for unknown transaction types
  return 'Other';
}

/**
 * Get token symbol for a mint
 * @param {string} mint - Token mint address
 * @returns {string|null} Token symbol
 */
function getTokenSymbol(mint) {
  // Map of known token mints to symbols
  const knownTokens = {
    'So11111111111111111111111111111111111111112': 'SOL',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
    // Add more known tokens here
  };
  
  return knownTokens[mint] || null;
}