'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rugCheckAPI } from '@/lib/rugcheck';
import { useTokenAnalysis } from '@/contexts/TokenAnalysisContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { analyzeTokenWithReportData } from '@/lib/openai';
import { TokenReport, TokenRiskScore } from '@/types/token';
import { parseErrorMessage } from '@/lib/utils';

// =============================================
// AUTHENTICATION HOOKS
// =============================================

// Hook for Solana login
export function useRugCheckLogin() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  
  return useMutation({
    mutationFn: async ({
      signature,
      message,
      publicKey,
    }: {
      signature: string;
      message: string;
      publicKey: string;
    }) => {
      return rugCheckAPI.loginWithSolana(signature, message, publicKey);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rugcheck', 'auth'] });
      
      addNotification({
        type: 'system',
        title: 'Successfully Authenticated',
        message: 'You are now logged in to RugCheck API.',
        priority: 'low',
      });
    },
    onError: (error) => {
      console.error('RugCheck login error:', error);
      
      addNotification({
        type: 'system',
        title: 'Authentication Failed',
        message: parseErrorMessage(error),
        priority: 'high',
      });
    },
  });
}

// Hook to check if user is authenticated with RugCheck
export function useRugCheckAuth() {
  return useQuery({
    queryKey: ['rugcheck', 'auth'],
    queryFn: () => {
      return { isAuthenticated: rugCheckAPI.isAuthenticated() };
    },
    staleTime: Infinity, // This data doesn't change until login/logout
  });
}

// =============================================
// TOKEN REPORT HOOKS
// =============================================

// Hook to get token report with proper response handling
export function useTokenReport(tokenAddress: string | null) {
  const { addToRecentTokens, cacheTokenReport, getCachedReport } = useTokenAnalysis();
  const { addNotification } = useNotifications();
  
  return useQuery({
    queryKey: ['rugcheck', 'tokenReport', tokenAddress],
    queryFn: async () => {
      if (!tokenAddress) {
        throw new Error('Token address is required');
      }
      
      // Add to recent tokens
      addToRecentTokens(tokenAddress);
      
      // Check for cached report
      const cachedReport = getCachedReport(tokenAddress);
      if (cachedReport) {
        return cachedReport;
      }
      
      try {
        // Set a timeout for API requests to prevent long loading times
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 15000);
        });
  
        // Fetch from RugCheck API with timeout
        const responsePromise = rugCheckAPI.getTokenReport(tokenAddress);
        const response = await Promise.race([responsePromise, timeoutPromise]) as any;
  
        // The issue is here - sometimes the API returns data directly without a status field
        // Check if we have a proper response object with a data field or if the response itself is the data
        const responseData = response.data || response;
        
        // Check if we have a valid response
        if (!responseData || (!responseData.mint && !responseData.token && !responseData.tokenMeta && !responseData.risks)) {
          console.error('Invalid token report data', responseData);
          throw new Error('Invalid token report data received');
        }
        
        console.log('Successfully retrieved token data:', tokenAddress);
        
        // Parse risks into risk factors
        const riskFactors = Array.isArray(responseData.risks) 
          ? responseData.risks.map(risk => ({
              category: risk.name || 'Unknown Risk',
              description: risk.description || 'No description provided',
              severity: mapRiskLevelToSeverity(risk.level),
              evidence: risk.value || '',
              impact: '',
            }))
          : [];
        
        // Calculate overall risk level from score
        const score = responseData.score_normalised || responseData.score || 50;
        const riskLevel = calculateRiskLevel(score);
        
        // Map token data to our format
        const tokenReport: TokenReport = {
          metadata: {
            address: tokenAddress,
            name: getTokenName(responseData),
            symbol: getTokenSymbol(responseData),
            decimals: getTokenDecimals(responseData),
            logoURI: responseData.logoURI || responseData.logo || null,
            totalSupply: getTokenSupply(responseData),
          },
          riskScore: {
            score: score,
            level: riskLevel,
            factors: riskFactors,
            summary: `Risk score: ${score}/100. ${capitalizeFirstLetter(riskLevel)} risk.`,
            recommendations: generateRecommendations(riskLevel, riskFactors),
          },
          rugCheckVerified: Boolean(responseData.verification),
          creationDate: responseData.detectedAt || null,
          deployerAddress: responseData.creator || responseData.mintAuthority || null,
          holders: responseData.totalHolders || 0,
        };
        
        // Cache the report
        cacheTokenReport(tokenAddress, tokenReport);
        
        // Notify if high risk
        if (tokenReport.riskScore.level === 'high' || tokenReport.riskScore.level === 'critical') {
          addNotification({
            type: 'risk',
            title: 'High Risk Token Detected',
            message: `${tokenReport.metadata.symbol} has a high risk score of ${tokenReport.riskScore.score}/100.`,
            priority: 'high',
            data: {
              tokenAddress,
              tokenName: tokenReport.metadata.name,
              tokenSymbol: tokenReport.metadata.symbol,
              riskLevel: tokenReport.riskScore.level,
              riskScore: tokenReport.riskScore.score,
            },
          });
        }
        
        return tokenReport;
      } catch (error) {
        console.error('Error processing token report:', error);
        
        // Add helpful notification on errors
        addNotification({
          type: 'system',
          title: 'Token Report Error',
          message: parseErrorMessage(error) || 'Failed to load token data',
          priority: 'high',
        });
        
        throw error;
      }
    },
    enabled: !!tokenAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

// Hook to get token insider graph with enhanced error handling
export function useTokenInsiderGraph(tokenAddress: string | null) {
  const { addNotification } = useNotifications();
  
  return useQuery({
    queryKey: ['rugcheck', 'insiderGraph', tokenAddress],
    queryFn: async () => {
      if (!tokenAddress) {
        throw new Error('Token address is required');
      }
      
      try {
        // Set a timeout for API requests
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 20000); // Longer timeout for graph data
        });
        
        // Fetch from RugCheck API with timeout
        const responsePromise = rugCheckAPI.getTokenInsiderGraph(tokenAddress);
        const response = await Promise.race([responsePromise, timeoutPromise]) as any;
        
        // Check if we have a proper response
        const responseData = response.data || response;
        
        // Ensure nodes and links are arrays, even if empty
        return {
          nodes: Array.isArray(responseData.nodes) ? responseData.nodes : [],
          links: Array.isArray(responseData.links) ? responseData.links : [],
        };
      } catch (error) {
        console.error('Error fetching token insider graph:', error);
        
        // Add helpful notification on errors
        addNotification({
          type: 'system',
          title: 'Graph Data Error',
          message: 'Unable to load token relationship graph',
          priority: 'low',
        });
        
        // Return empty graph structure instead of throwing
        return { nodes: [], links: [] };
      }
    },
    enabled: !!tokenAddress,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}


export function useTrendingTokens(limit: number = 10) {
  const { addNotification } = useNotifications();
  
  return useQuery({
    queryKey: ['rugcheck', 'trendingTokens', limit],
    queryFn: async () => {
      try {
       
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 15000);
        });

        // Fetch from RugCheck API with timeout
        const responsePromise = rugCheckAPI.getTrendingTokens(limit);
        const response = await Promise.race([responsePromise, timeoutPromise]) as any;
        
        // Check if we have a proper response - either with data field or direct response
        const responseData = response.data || response;
        
        // Check if the response is an array or has a data array inside it
        const tokenList = Array.isArray(responseData) ? responseData : 
                         (responseData.data && Array.isArray(responseData.data)) ? responseData.data : [];

        // Get token reports for all tokens in parallel
        const tokenReports = await Promise.all(
          tokenList.map(async (token: any) => {
            const tokenAddress = token.mint || token.address;
            if (!tokenAddress) return null;
            
            try {
              const report = await rugCheckAPI.getTokenReport(tokenAddress);
              return {
                address: tokenAddress,
                report: report.data || report
              };
            } catch (error) {
              console.error(`Error fetching report for token ${tokenAddress}:`, error);
              return {
                address: tokenAddress,
                report: null
              };
            }
          })
        );

        // Map the response to match the expected format using the token reports
        return tokenList.map((token: any, index: number) => {
          const tokenAddress = token.mint || token.address;
          const tokenReport = tokenReports[index]?.report || {};
          
          // Use data from token report if available, otherwise fall back to basic data
          const name = getTokenName(tokenReport) || getTokenName(token);
          const symbol = getTokenSymbol(tokenReport) || getTokenSymbol(token);
          
          // Calculate risk score from report if available
          let riskScore = 50; // Default value
          if (typeof tokenReport.score_normalised === 'number') {
            riskScore = tokenReport.score_normalised;
          } else if (typeof tokenReport.score === 'number') {
            riskScore = tokenReport.score;
          } else if (typeof token.riskScore === 'number') {
            riskScore = token.riskScore;
          }
          
          const riskLevel = calculateRiskLevel(riskScore);
          
          return {
            id: tokenAddress || `trending-token-${Math.random()}`,
            address: tokenAddress,
            symbol,
            name,
            logoURI: tokenReport.logoURI || tokenReport.logo || token.logoURI || token.image || token.logo,
            riskScore,
            riskLevel,
            verified: Boolean(tokenReport.verification || token.jup_verified || token.verified),
            deployerAddress: tokenReport.creator || tokenReport.mintAuthority || token.creator || token.payer,
            createdAt: tokenReport.detectedAt || token.createdAt || token.createAt,
          };
        }).filter(token => token.address); // Filter out any invalid tokens
      } catch (error) {
        console.error('Error fetching trending tokens:', error);
        
        addNotification({
          type: 'system',
          title: 'Failed to Load Trending Tokens',
          message: parseErrorMessage(error) || 'Could not retrieve trending tokens',
          priority: 'medium',
        });
        
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

// Enhanced hook to get new tokens using token report for consistent data
export function useNewTokens(limit: number = 10) {
  const { addNotification } = useNotifications();
  
  return useQuery({
    queryKey: ['rugcheck', 'newTokens', limit],
    queryFn: async () => {
      try {
        // Set a timeout for API requests to prevent long loading times
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 15000);
        });

        // Fetch from RugCheck API with timeout
        const responsePromise = rugCheckAPI.getNewTokens(limit);
        const response = await Promise.race([responsePromise, timeoutPromise]) as any;
        
        // Check if we have a proper response - either with data field or direct response
        const responseData = response.data || response;
        
        // Check if the response is an array or has a data array inside it
        const tokenList = Array.isArray(responseData) ? responseData : 
                        (responseData.data && Array.isArray(responseData.data)) ? responseData.data : [];

        // Get token reports for all tokens in parallel
        const tokenReports = await Promise.all(
          tokenList.map(async (token: any) => {
            const tokenAddress = token.mint || token.address;
            if (!tokenAddress) return null;
            
            try {
              const report = await rugCheckAPI.getTokenReport(tokenAddress);
              return {
                address: tokenAddress,
                report: report.data || report
              };
            } catch (error) {
              console.error(`Error fetching report for token ${tokenAddress}:`, error);
              return {
                address: tokenAddress,
                report: null
              };
            }
          })
        );

        // Map the response to match the expected format using the token reports
        return tokenList.map((token: any, index: number) => {
          const tokenAddress = token.mint || token.address;
          const tokenReport = tokenReports[index]?.report || {};
          
          // Use data from token report if available, otherwise fall back to basic data
          const name = getTokenName(tokenReport) || getTokenName(token);
          const symbol = getTokenSymbol(tokenReport) || getTokenSymbol(token);
          
          // Calculate risk score from report if available
          let riskScore = 50; // Default value
          if (typeof tokenReport.score_normalised === 'number') {
            riskScore = tokenReport.score_normalised;
          } else if (typeof tokenReport.score === 'number') {
            riskScore = tokenReport.score;
          } else if (typeof token.riskScore === 'number') {
            riskScore = token.riskScore;
          }
          
          const riskLevel = calculateRiskLevel(riskScore);
          
          return {
            id: tokenAddress || `new-token-${Math.random()}`,
            address: tokenAddress,
            symbol,
            name,
            logoURI: tokenReport.logoURI || tokenReport.logo || token.logoURI || token.image || token.logo,
            riskScore,
            riskLevel,
            verified: Boolean(tokenReport.verification || token.jup_verified || token.verified),
            deployerAddress: tokenReport.creator || tokenReport.mintAuthority || token.creator || token.payer,
            createdAt: tokenReport.detectedAt || token.createdAt || token.createAt,
            decimals: typeof tokenReport.decimals === 'number' ? tokenReport.decimals : 
                     getTokenDecimals(tokenReport) || getTokenDecimals(token) || 9
          };
        }).filter(token => token.address); // Filter out any invalid tokens
      } catch (error) {
        console.error('Error fetching new tokens:', error);
        
        addNotification({
          type: 'system',
          title: 'Failed to Load New Tokens',
          message: parseErrorMessage(error) || 'Could not retrieve new tokens',
          priority: 'medium',
        });
        
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

// Enhanced hook to get verified tokens using token report for consistent data
export function useVerifiedTokens(limit: number = 10) {
  const { addNotification } = useNotifications();
  
  return useQuery({
    queryKey: ['rugcheck', 'verifiedTokens', limit],
    queryFn: async () => {
      try {
        // Set a timeout for API requests to prevent long loading times
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 15000);
        });

        // Fetch from RugCheck API with timeout
        const responsePromise = rugCheckAPI.getVerifiedTokens(limit);
        const response = await Promise.race([responsePromise, timeoutPromise]) as any;
        
        // Check if we have a proper response - either with data field or direct response
        const responseData = response.data || response;
        
        // Check if the response is an array or has a data array inside it
        const tokenList = Array.isArray(responseData) ? responseData : 
                        (responseData.data && Array.isArray(responseData.data)) ? responseData.data : [];

        // Get token reports for all tokens in parallel
        const tokenReports = await Promise.all(
          tokenList.map(async (token: any) => {
            const tokenAddress = token.mint || token.address;
            if (!tokenAddress) return null;
            
            try {
              const report = await rugCheckAPI.getTokenReport(tokenAddress);
              return {
                address: tokenAddress,
                report: report.data || report
              };
            } catch (error) {
              console.error(`Error fetching report for token ${tokenAddress}:`, error);
              return {
                address: tokenAddress,
                report: null
              };
            }
          })
        );

        // Map the response to match the expected format using the token reports
        return tokenList.map((token: any, index: number) => {
          const tokenAddress = token.mint || token.address;
          const tokenReport = tokenReports[index]?.report || {};
          
          // Use data from token report if available, otherwise fall back to basic data
          const name = getTokenName(tokenReport) || getTokenName(token);
          const symbol = getTokenSymbol(tokenReport) || getTokenSymbol(token);
          
          // For verified tokens, we assume a lower risk score by default but still check report
          let riskScore = 10;
          if (typeof tokenReport.score_normalised === 'number') {
            riskScore = tokenReport.score_normalised;
          } else if (typeof tokenReport.score === 'number') {
            riskScore = tokenReport.score;
          } else if (typeof token.riskScore === 'number') {
            riskScore = token.riskScore;
          }
          
          const riskLevel = calculateRiskLevel(riskScore);
          
          return {
            id: tokenAddress || `verified-token-${Math.random()}`,
            address: tokenAddress,
            symbol,
            name,
            logoURI: tokenReport.logoURI || tokenReport.logo || token.logoURI || token.image || token.logo,
            riskScore,
            riskLevel,
            verified: true, // Always true for verified tokens
            deployerAddress: tokenReport.creator || tokenReport.mintAuthority || token.payer || token.creator,
            description: tokenReport.description || token.description,
            createdAt: tokenReport.detectedAt || token.createdAt || token.createAt,
          };
        }).filter(token => token.address); // Filter out any invalid tokens
      } catch (error) {
        console.error('Error fetching verified tokens:', error);
        
        addNotification({
          type: 'system',
          title: 'Failed to Load Verified Tokens',
          message: parseErrorMessage(error) || 'Could not retrieve verified tokens',
          priority: 'medium',
        });
        
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

// =============================================
// TOKEN VERIFICATION HOOKS
// =============================================

// Hook to verify a token
export function useVerifyToken() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  
  return useMutation({
    mutationFn: async (tokenAddress: string) => {
      return rugCheckAPI.verifyToken(tokenAddress);
    },
    onSuccess: (data, tokenAddress) => {
      queryClient.invalidateQueries({ 
        queryKey: ['rugcheck', 'tokenReport', tokenAddress]
      });
      
      addNotification({
        type: 'token',
        title: 'Token Verification Started',
        message: `Verification process has started for ${tokenAddress}.`,
        priority: 'medium',
        data: {
          tokenAddress,
        },
      });
    },
    onError: (error, tokenAddress) => {
      console.error('Token verification error:', error);
      
      addNotification({
        type: 'token',
        title: 'Token Verification Failed',
        message: parseErrorMessage(error),
        priority: 'high',
        data: {
          tokenAddress,
        },
      });
    },
  });
}

// Hook to check token eligibility for verification
export function useCheckTokenEligibility(tokenAddress: string | null) {
  const { addNotification } = useNotifications();
  
  return useQuery({
    queryKey: ['rugcheck', 'eligibility', tokenAddress],
    queryFn: async () => {
      if (!tokenAddress) {
        throw new Error('Token address is required');
      }
      
      try {
        const response = await rugCheckAPI.checkTokenEligibility(tokenAddress);
        
        // Check if we have a proper response
        const responseData = response.data || response;
        
        return responseData?.eligible ? responseData : { eligible: false };
      } catch (error) {
        console.error('Error checking token eligibility:', error);
        
      
        addNotification({
          type: 'system',
          title: 'Eligibility Check Failed',
          message: 'Unable to check if this token is eligible for verification',
          priority: 'medium',
        });
        
       
        return { eligible: false };
      }
    },
    enabled: !!tokenAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

// =============================================
// HELPER FUNCTIONS
// =============================================

// Helper functions to safely extract data from API response
function getTokenName(data: any): string {
  // Check all possible locations for name
  console.log(data)
  if (data.tokenMeta && data.tokenMeta.name) return data.tokenMeta.name;
  if (data.token && data.token.name) return data.token.name;
  if (data.name) return data.name;
  
  // If it's a TRUMP token, use a custom name
  if (data.symbol && data.symbol.includes('TRUMP')) return 'TRUMP 2052';
  
  return 'Unknown Token';
}

function getTokenSymbol(data: any): string {
  // Check all possible locations for symbol
  if (data.tokenMeta && data.tokenMeta.symbol) return data.tokenMeta.symbol;
  if (data.token && data.token.symbol) return data.token.symbol;
  if (data.symbol) return data.symbol;
  
  // If it has a name but no symbol, use the name
  if (data.name) return data.name.substring(0, 8);
  
  return 'UNKNOWN';
}

function getTokenDecimals(data: any): number {
  if (data.token && typeof data.token.decimals === 'number') return data.token.decimals;
  if (typeof data.decimals === 'number') return data.decimals;
  return 9; // Default to 9 decimals for Solana tokens
}

function getTokenSupply(data: any): number {
  if (data.token && data.token.supply) return data.token.supply;
  if (data.supply) return data.supply;
  return 0;
}

// Map risk level from API to our severity levels
function mapRiskLevelToSeverity(level: string): 'low' | 'medium' | 'high' | 'critical' {
  if (!level) return 'medium';
  
  switch (level.toLowerCase()) {
    case 'danger':
      return 'critical';
    case 'warn':
      return 'high';
    case 'info':
      return 'medium';
    case 'safe':
      return 'low';
    default:
      return 'medium';
  }
}

// Calculate risk level based on score
function calculateRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

// Generate recommendations based on risk level and factors
function generateRecommendations(riskLevel: string, factors: any[]): string[] {
  const recommendations: string[] = [];
  
  if (riskLevel === 'critical' || riskLevel === 'high') {
    recommendations.push('Exercise extreme caution with this token.');
    recommendations.push('Research thoroughly before investing any funds.');
  }
  
  // Add specific recommendations based on risk factors
  factors.forEach(factor => {
    if (factor.severity === 'critical' || factor.severity === 'high') {
      if (factor.category.includes('Mint Authority')) {
        recommendations.push('The token creator can mint unlimited tokens, creating dilution risk.');
      }
      
      if (factor.category.includes('holder')) {
        recommendations.push('Token ownership is highly concentrated, creating price manipulation risk.');
      }
      
      if (factor.category.includes('Liquidity')) {
        recommendations.push('Low liquidity makes this token difficult to trade without price impact.');
      }
    }
  });
  
  if (recommendations.length === 0) {
    recommendations.push('Conduct thorough research before investing.');
  }
  
  return [...new Set(recommendations)]; // Remove duplicates
}

function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}