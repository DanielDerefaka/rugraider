import { getOpenAIClient } from '@/lib/openaiextension'

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get data from request body
    const { transaction, riskAnalysis } = req.body;
    
    // Validate data
    if (!transaction || !riskAnalysis) {
      return res.status(400).json({ error: 'Missing transaction or risk analysis data' });
    }
    
    // Get OpenAI client
    const openai = getOpenAIClient();
    
    // Format input for AI analysis
    const input = formatTransactionForAI(transaction, riskAnalysis);
    
    // Call OpenAI API
    const aiAnalysis = await analyzeWithAI(openai, input);
    
    // Return result
    return res.status(200).json(aiAnalysis);
  } catch (error) {
    console.error('Error analyzing transaction with AI:', error);
    
    // Return fallback analysis
    return res.status(200).json(
      generateFallbackAnalysis(req.body.transaction, req.body.riskAnalysis)
    );
  }
}

/**
 * Analyze transaction with OpenAI
 * @param {Object} openai - OpenAI client
 * @param {string} input - Formatted transaction data
 * @returns {Object} AI analysis result
 */
async function analyzeWithAI(openai, input) {
  // Prepare system prompt
  const systemPrompt = `You are a Solana blockchain security expert. Your task is to analyze a transaction for security risks.
  
Based on the transaction data and risk analysis provided, assess:
1. The potential security implications 
2. What the transaction is trying to do
3. Whether the transaction appears suspicious
4. Risk factors that users should be aware of
5. Advice for the user

Format your response as JSON with the following fields:
- summary: A brief one-sentence summary of the transaction risk
- explanation: A detailed explanation of the transaction and potential risks
- advice: Clear advice for the user on how to proceed
- riskLevel: Your assessment of risk ("high", "medium", or "low")
- recommendations: Array of specific recommendations for the user
`;

  // Call OpenAI API
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1000
  });
  
  try {
    // Parse the response
    const content = response.choices[0]?.message?.content;
    const parsedResponse = JSON.parse(content);
    
    // Add metadata
    return {
      ...parsedResponse,
      generatedBy: 'openai',
      model: 'gpt-4',
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw new Error('Failed to parse AI response');
  }
}

/**
 * Format transaction for AI analysis
 * @param {Object} transaction - Transaction data
 * @param {Object} riskAnalysis - Risk analysis result
 * @returns {string} Formatted transaction data
 */
function formatTransactionForAI(transaction, riskAnalysis) {
  let formatted = `## Transaction Data\n\n`;
  
  // Add transaction type
  formatted += `Transaction Type: ${transaction.type || 'Unknown'}\n\n`;
  
  // Add sender and recipient
  formatted += `From: ${transaction.sender || 'Unknown'}\n`;
  formatted += `To: ${transaction.recipient || 'Unknown'}\n\n`;
  
  // Add amount if available
  if (transaction.amount) {
    formatted += `Amount: ${transaction.amount} SOL\n`;
  }
  
  // Add fee if available
  if (transaction.fee) {
    formatted += `Fee: ${transaction.fee} SOL\n`;
  }
  
  // Add wallet provider if available
  if (transaction.walletProvider) {
    formatted += `Wallet: ${transaction.walletProvider}\n`;
  }
  
  formatted += `\n## Instructions\n\n`;
  
  // Add instructions if available
  if (transaction.instructions && transaction.instructions.length > 0) {
    transaction.instructions.forEach((instruction, index) => {
      formatted += `### Instruction ${index + 1}: ${instruction.type || 'Unknown'}\n`;
      formatted += `Program: ${instruction.programName || instruction.programId || 'Unknown'}\n`;
      
      if (instruction.data) {
        formatted += `Data: ${instruction.data.substring(0, 100)}${instruction.data.length > 100 ? '...' : ''}\n`;
      }
      
      formatted += `\n`;
    });
  } else {
    formatted += `No instructions available\n\n`;
  }
  
  // Add tokens if available
  if (transaction.tokens && transaction.tokens.length > 0) {
    formatted += `## Tokens Involved\n\n`;
    
    transaction.tokens.forEach((token, index) => {
      formatted += `- ${token.symbol || 'Unknown Token'} (Mint: ${token.mint || 'Unknown'})\n`;
    });
    
    formatted += `\n`;
  }
  
  // Add risk analysis
  formatted += `## Risk Analysis\n\n`;
  formatted += `Risk Level: ${riskAnalysis.riskLevel || 'Unknown'}\n`;
  formatted += `Risk Score: ${riskAnalysis.riskScore || 0}/100\n\n`;
  
  // Add risk factors
  if (riskAnalysis.riskFactors && riskAnalysis.riskFactors.length > 0) {
    formatted += `### Risk Factors\n\n`;
    
    riskAnalysis.riskFactors.forEach((factor, index) => {
      formatted += `- ${factor}\n`;
    });
    
    formatted += `\n`;
  }
  
  return formatted;
}

/**
 * Generate fallback analysis when AI service is unavailable
 * @param {Object} transaction - Transaction data
 * @param {Object} riskAnalysis - Risk analysis result
 * @returns {Object} Fallback analysis
 */
function generateFallbackAnalysis(transaction, riskAnalysis) {
  // Generate explanation based on risk level and factors
  let summary = '';
  let explanation = '';
  let advice = '';
  let recommendations = [];
  
  switch (riskAnalysis.riskLevel) {
    case 'high':
      summary = 'This transaction appears to be high risk.';
      explanation = `This transaction has been flagged as high risk (score: ${riskAnalysis.riskScore}/100). `;
      
      if (riskAnalysis.riskFactors && riskAnalysis.riskFactors.length > 0) {
        explanation += `Risk factors include: ${riskAnalysis.riskFactors.join(', ')}. `;
      }
      
      explanation += 'High-risk transactions often involve security threats such as fund draining, unauthorized token approvals, or interaction with known malicious contracts.';
      
      advice = 'It is strongly recommended to cancel this transaction and verify the details with the intended recipient through a separate communication channel.';
      
      recommendations = [
        'Cancel this transaction',
        'Verify the recipient address through a trusted channel',
        'Check for any recent security alerts related to this address',
        'Never approve token spending to unknown addresses'
      ];
      break;
      
    case 'medium':
      summary = 'This transaction has some potential risks.';
      explanation = `This transaction has been flagged as medium risk (score: ${riskAnalysis.riskScore}/100). `;
      
      if (riskAnalysis.riskFactors && riskAnalysis.riskFactors.length > 0) {
        explanation += `Risk factors include: ${riskAnalysis.riskFactors.join(', ')}. `;
      }
      
      explanation += 'Medium-risk transactions may involve uncommon operations or significant value transfers that warrant extra scrutiny.';
      
      advice = 'Review the transaction details carefully before proceeding, especially the recipient address and transaction amount.';
      
      recommendations = [
        'Double-check the recipient address',
        'Verify the transaction amount is correct',
        'Ensure you understand what the transaction is doing',
        'Proceed with caution if everything looks correct'
      ];
      break;
      
    case 'low':
      summary = 'This transaction appears to be safe.';
      explanation = `This transaction has been flagged as low risk (score: ${riskAnalysis.riskScore}/100). `;
      explanation += 'The transaction follows common patterns and does not involve any known risky addresses or operations.';
      
      advice = 'This transaction appears safe, but it\'s always good practice to verify the recipient address.';
      
      recommendations = [
        'Verify the recipient address is correct',
        'Proceed with the transaction'
      ];
      break;
      
    default:
      summary = 'Unable to determine risk level for this transaction.';
      explanation = 'Our security analysis could not determine a risk level for this transaction.';
      advice = 'Exercise caution and verify transaction details before proceeding.';
      recommendations = [
        'Double-check all transaction details',
        'Proceed with caution'
      ];
  }
  
  // Add transaction type specific explanation
  if (transaction.type) {
    let typeExplanation = '';
    
    switch (transaction.type) {
      case 'SOL Transfer':
        typeExplanation = `This is a simple SOL transfer${transaction.amount ? ` of ${transaction.amount} SOL` : ''} to ${transaction.recipient || 'an address'}.`;
        break;
        
      case 'Token Transfer':
        typeExplanation = `This is a token transfer${transaction.tokens && transaction.tokens.length > 0 ? ` of ${transaction.tokens[0].symbol || 'tokens'}` : ''}.`;
        break;
        
      case 'Token Swap':
        typeExplanation = 'This is a token swap transaction, exchanging one type of token for another.';
        break;
        
      case 'NFT Operation':
        typeExplanation = 'This transaction involves NFT-related operations.';
        break;
        
      case 'Complex Transaction':
        typeExplanation = 'This is a complex transaction with multiple operations.';
        break;
        
      default:
        typeExplanation = `This is a ${transaction.type} transaction.`;
    }
    
    explanation = `${typeExplanation} ${explanation}`;
  }
  
  return {
    summary,
    explanation,
    advice,
    riskLevel: riskAnalysis.riskLevel,
    recommendations,
    generatedBy: 'fallback',
    timestamp: Date.now()
  };
}