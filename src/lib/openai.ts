import OpenAI from 'openai';
import { TokenRiskScore, TokenReport, TokenRiskFactor } from '@/types/token';
import { RugCheckTokenReportResponse } from '@/types/rugcheck';

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: true
});

// Analyze token with RugCheck report data
export async function analyzeTokenWithReportData(
  tokenAddress: string,
  rugCheckReport: RugCheckTokenReportResponse
): Promise<TokenRiskScore> {
  try {
    const prompt = `
      You are a Solana blockchain security expert. Analyze this token report from RugCheck and provide a detailed security analysis.
      
      Token Address: ${tokenAddress}
      
      RugCheck Report Data:
      ${JSON.stringify(rugCheckReport, null, 2)}
      
      Provide a detailed security analysis including:
      1. An overall risk score from 0-100 (0 being safest, 100 being highest risk)
      2. Risk level (Low, Medium, High, or Critical)
      3. A brief summary of findings
      4. Specific risk factors identified, each with category, description, and severity
      5. Recommendations for users
      
      Format your response as a JSON object.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a blockchain security expert specialized in Solana token risk analysis."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const analysisData = JSON.parse(response.choices[0].message.content || "{}");
    
    // Format response to match our type
    return {
      score: analysisData.riskScore || 50,
      level: mapRiskLevel(analysisData.riskLevel),
      summary: analysisData.summary || "Analysis could not be completed",
      factors: (analysisData.riskFactors || []).map((factor: any) => ({
        category: factor.category,
        description: factor.description,
        severity: mapRiskLevel(factor.severity),
        evidence: factor.evidence || undefined,
        impact: factor.impact || undefined
      })),
      recommendations: analysisData.recommendations || ["Exercise caution with this token."]
    };
  } catch (error) {
    console.error("Error analyzing token with report data:", error);
    return {
      score: 50,
      level: 'medium',
      summary: "Unable to complete analysis due to an error.",
      factors: [
        {
          category: "Analysis Error",
          description: "The system encountered an error while analyzing this token.",
          severity: 'medium'
        }
      ],
      recommendations: ["Try again later or analyze this token manually."]
    };
  }
}

// Analyze token contract
export async function analyzeTokenContract(
  tokenAddress: string,
  contractCode: string
): Promise<TokenRiskFactor[]> {
  try {
    const prompt = `
      You are a Solana blockchain security expert. Analyze this token contract code and identify any security risks or suspicious patterns.
      
      Token Address: ${tokenAddress}
      
      Contract Code:
      ${contractCode}
      
      Identify any security risks, vulnerabilities, or suspicious patterns in this contract.
      Focus on issues like:
      1. Backdoors
      2. Unlimited minting capabilities
      3. Fee manipulation
      4. Ownership concentration
      5. Blacklisting capabilities
      6. Pause functions
      7. Suspicious transfer restrictions
      
      Format your response as a JSON array of risk factors, each containing:
      - category: The type of risk
      - description: Detailed explanation of the issue
      - severity: Risk level (low, medium, high, critical)
      - evidence: Specific code snippets or patterns that indicate the risk
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a blockchain security expert specialized in Solana token contract analysis."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const analysisData = JSON.parse(response.choices[0].message.content || "{}");
    
    // Format response to match our type
    return (analysisData.riskFactors || []).map((factor: any) => ({
      category: factor.category,
      description: factor.description,
      severity: mapRiskLevel(factor.severity),
      evidence: factor.evidence || undefined
    }));
  } catch (error) {
    console.error("Error analyzing token contract:", error);
    return [
      {
        category: "Analysis Error",
        description: "The system encountered an error while analyzing the token contract.",
        severity: 'medium'
      }
    ];
  }
}

// Analyze social sentiment for a token
export async function analyzeSocialSentiment(
  tokenName: string,
  tokenSymbol: string,
  socialData: string
): Promise<{
  score: number;
  sentiment: string;
  summary: string;
  risks: TokenRiskFactor[];
}> {
  try {
    const prompt = `
      You are a blockchain social media analyst. Analyze the social media data for this token and provide a sentiment analysis.
      
      Token Name: ${tokenName}
      Token Symbol: ${tokenSymbol}
      
      Social Media Data:
      ${socialData}
      
      Provide a detailed sentiment analysis including:
      1. A sentiment score from -1 to 1 (-1 being extremely negative, 1 being extremely positive)
      2. Overall sentiment classification (Negative, Neutral, Positive)
      3. A brief summary of the sentiment analysis
      4. Any risk factors identified from social signals (marketing tactics, community behavior, etc.)
      
      Format your response as a JSON object.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a blockchain social media analyst specialized in crypto token sentiment analysis."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const analysisData = JSON.parse(response.choices[0].message.content || "{}");
    
    // Format response to match our type
    return {
      score: analysisData.sentimentScore || 0,
      sentiment: analysisData.sentimentClassification || "Neutral",
      summary: analysisData.summary || "No significant sentiment detected.",
      risks: (analysisData.riskFactors || []).map((factor: any) => ({
        category: factor.category || "Social Risk",
        description: factor.description,
        severity: mapRiskLevel(factor.severity),
      }))
    };
  } catch (error) {
    console.error("Error analyzing social sentiment:", error);
    return {
      score: 0,
      sentiment: "Neutral",
      summary: "Unable to complete sentiment analysis due to an error.",
      risks: [
        {
          category: "Analysis Error",
          description: "The system encountered an error while analyzing social sentiment.",
          severity: 'medium'
        }
      ]
    };
  }
}

// Helper function to map risk levels to our enum
function mapRiskLevel(level: string | undefined): 'low' | 'medium' | 'high' | 'critical' {
  if (!level) return 'medium';
  
  const normalizedLevel = level.toLowerCase();
  
  if (normalizedLevel.includes('low')) return 'low';
  if (normalizedLevel.includes('medium') || normalizedLevel.includes('moderate')) return 'medium';
  if (normalizedLevel.includes('high')) return 'high';
  if (normalizedLevel.includes('critical') || normalizedLevel.includes('severe')) return 'critical';
  
  return 'medium'; // Default
}