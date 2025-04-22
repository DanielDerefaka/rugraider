/**
 * OpenAI Client
 * Utility for interacting with the OpenAI API
 */

import OpenAI from 'openai';

// Cache the client to avoid creating multiple instances
let openaiClient = null;

/**
 * Get OpenAI client
 * @returns {Object} OpenAI client
 */
export function getOpenAIClient() {
  if (openaiClient) {
    return openaiClient;
  }
  
  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('Missing OpenAI API key');
    throw new Error('Missing OpenAI API key. Set OPENAI_API_KEY environment variable.');
  }
  
  // Create a new client
  openaiClient = new OpenAI({
    apiKey: apiKey
  });
  
  return openaiClient;
}

/**
 * Analyze text with GPT model
 * @param {string} prompt - System prompt
 * @param {string} input - User input
 * @param {Object} options - Additional options
 * @returns {Promise<string>} Generated text
 */
export async function analyzeWithGPT(prompt, input, options = {}) {
  const client = getOpenAIClient();
  
  // Default options
  const defaultOptions = {
    model: 'gpt-4',
    temperature: 0.3,
    max_tokens: 1000,
    responseFormat: { type: 'text' }
  };
  
  // Merge options
  const mergedOptions = { ...defaultOptions, ...options };
  
  try {
    const response = await client.chat.completions.create({
      model: mergedOptions.model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: input }
      ],
      temperature: mergedOptions.temperature,
      max_tokens: mergedOptions.max_tokens,
      response_format: mergedOptions.responseFormat
    });
    
    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error analyzing with GPT:', error);
    throw error;
  }
}

/**
 * Analyze transaction security
 * @param {Object} transaction - Transaction data
 * @param {Object} riskAnalysis - Risk analysis data
 * @returns {Promise<Object>} Security analysis
 */
export async function analyzeTransactionSecurity(transaction, riskAnalysis) {
  const prompt = `You are a Solana blockchain security expert. Your task is to analyze a transaction for security risks.
  
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
- recommendations: Array of specific recommendations for the user`;
  
  // Format transaction for analysis
  const input = formatTransactionForAnalysis(transaction, riskAnalysis);
  
  try {
    const response = await analyzeWithGPT(prompt, input, {
      responseFormat: { type: 'json_object' }
    });
    
    // Parse JSON response
    return JSON.parse(response);
  } catch (error) {
    console.error('Error analyzing transaction security:', error);
    throw error;
  }
}

/**
 * Format transaction for analysis
 * @param {Object} transaction - Transaction data
 * @param {Object} riskAnalysis - Risk analysis data
 * @returns {string} Formatted transaction
 */
function formatTransactionForAnalysis(transaction, riskAnalysis) {
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
  }
  
  return formatted;
}