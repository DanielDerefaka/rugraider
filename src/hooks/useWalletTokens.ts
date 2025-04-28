'use client';

import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { WalletToken, TokenRiskScore } from '@/types/token';
import { getWalletTokens, getTokenMetadata, analyzeTokenRisks } from '@/lib/solana';
import { rugCheckAPI } from '@/lib/rugcheck';
import { useNotifications } from '@/contexts/NotificationContext';
import { getRiskLevelFromScore } from '@/lib/utils';
import { useMemo } from 'react';

// Configuration constants
const QUERY_CONFIG = {
  walletTokens: {
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  },
  tokenRiskAnalysis: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 30 * 60 * 1000, // 30 minutes
  }
};

/**
 * Transform basic token data with metadata
 */
const transformTokenWithMetadata = async (token: WalletToken): Promise<WalletToken> => {
  try {
    // Get token metadata (name, symbol, logo)
    const metadata = await getTokenMetadata(token.mint);
    
    // Get basic risk assessment
    const riskFactors = await analyzeTokenRisks(token.mint);
    
    // Calculate initial risk score based on on-chain factors
    let initialRiskScore = 0;
    if (riskFactors.hasHighSupply) initialRiskScore += 10;
    if (riskFactors.hasLowLiquidity) initialRiskScore += 25;
    if (riskFactors.hasLargeHolders) initialRiskScore += 30;
    if (riskFactors.isNewToken) initialRiskScore += 15;
    if (riskFactors.hasSuspiciousTransactions) initialRiskScore += 20;
    
    // Cap at 100
    initialRiskScore = Math.min(initialRiskScore, 100);
    
    return {
      ...token,
      symbol: metadata?.symbol || 'Unknown',
      name: metadata?.name || 'Unknown Token',
      logoURI: metadata?.logoURI,
      riskScore: initialRiskScore,
      riskLevel: getRiskLevelFromScore(initialRiskScore),
    };
  } catch (error) {
    console.error(`Error processing token ${token.mint}:`, error);
    return {
      ...token,
      symbol: 'Unknown',
      name: 'Unknown Token',
      riskScore: 50, // Medium risk for unknown tokens
      riskLevel: 'medium' as const,
    };
  }
};

/**
 * Hook to get basic token data from a wallet
 */
export function useWalletTokens(walletAddress: string | null) {
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['walletTokens', walletAddress],
    queryFn: async (): Promise<WalletToken[]> => {
      if (!walletAddress) {
        return [];
      }
      
      try {
        // Fetch token accounts from Solana
        const tokens = await getWalletTokens(walletAddress);
        
        // Process tokens in batches to avoid overwhelming the network
        const batchSize = 5;
        const tokensWithMetadata: WalletToken[] = [];
        
        for (let i = 0; i < tokens.length; i += batchSize) {
          const batch = tokens.slice(i, i + batchSize);
          const processedBatch = await Promise.all(
            batch.map(token => transformTokenWithMetadata(token))
          );
          tokensWithMetadata.push(...processedBatch);
          
          // Update the cache with partial results for better UX
          if (i + batchSize < tokens.length) {
            queryClient.setQueryData(['walletTokens', walletAddress], [...tokensWithMetadata]);
          }
        }
        
        // Check for high-risk tokens and notify user
        const highRiskTokens = tokensWithMetadata.filter(
          token => token.riskLevel === 'high' || token.riskLevel === 'critical'
        );
        
        if (highRiskTokens.length > 0) {
          addNotification({
            type: 'risk',
            title: 'High Risk Tokens Detected',
            message: `Your wallet contains ${highRiskTokens.length} high risk tokens.`,
            priority: 'high',
            data: { walletAddress },
          });
        }
        
        return tokensWithMetadata;
      } catch (error) {
        console.error('Error fetching wallet tokens:', error);
        addNotification({
          type: 'error',
          title: 'Error Loading Tokens',
          message: 'Failed to load wallet tokens. Please try again.',
          priority: 'high',
        });
        throw error; // Let React Query handle the error state
      }
    },
    enabled: !!walletAddress,
    staleTime: QUERY_CONFIG.walletTokens.staleTime,
    refetchInterval: QUERY_CONFIG.walletTokens.refetchInterval,
    retry: 2,
  });
}

/**
 * Prefetch token data for a wallet
 */
export function prefetchWalletTokens(queryClient: any, walletAddress: string) {
  if (!walletAddress) return;
  
  queryClient.prefetchQuery({
    queryKey: ['walletTokens', walletAddress],
    queryFn: async () => {
      const tokens = await getWalletTokens(walletAddress);
      return tokens.map(token => ({
        ...token,
        symbol: 'Loading...',
        name: 'Loading...',
        riskScore: 0,
        riskLevel: 'unknown' as const,
      }));
    },
  });
}

/**
 * Get detailed risk analysis for a single token
 */
export function useTokenRiskAnalysis(tokenMint: string) {
  return useQuery({
    queryKey: ['tokenRiskAnalysis', tokenMint],
    queryFn: async (): Promise<TokenRiskScore | null> => {
      try {
        const response = await rugCheckAPI.getTokenReport(tokenMint);
        
        if (response && response.success && response.data) {
          return {
            score: response.data.riskScore,
            level: (response.data.riskLevel?.toLowerCase() || 'medium') as any,
            factors: (response.data.riskFactors || []).map(factor => ({
              category: factor.category,
              description: factor.description,
              severity: (factor.severity?.toLowerCase() || 'medium') as any,
              evidence: factor.evidence,
              impact: factor.impact,
            })),
            summary: `Risk score: ${response.data.riskScore}/100. ${response.data.riskLevel} risk.`,
            recommendations: ['Conduct thorough research before investing.'],
          };
        }
        
        return null;
      } catch (error) {
        console.error(`Error analyzing risk for token ${tokenMint}:`, error);
        return null;
      }
    },
    staleTime: QUERY_CONFIG.tokenRiskAnalysis.staleTime,
    refetchInterval: QUERY_CONFIG.tokenRiskAnalysis.refetchInterval,
  });
}

/**
 * Get detailed risk analysis for multiple wallet tokens
 */
export function useWalletTokensRiskAnalysis(walletAddress: string | null, tokens: WalletToken[]) {
  // Only analyze tokens that have mint addresses
  const validTokens = useMemo(() => 
    tokens.filter(token => !!token.mint),
    [tokens]
  );
  
  // Fetch detailed risk reports for each token in parallel
  const tokenQueries = useQueries({
    queries: validTokens.map(token => ({
      queryKey: ['tokenRiskAnalysis', token.mint],
      queryFn: async (): Promise<TokenRiskScore | null> => {
        // Reuse the token risk analysis logic
        try {
          const response = await rugCheckAPI.getTokenReport(token.mint);
          
          if (response && response.success && response.data) {
            return {
              score: response.data.riskScore,
              level: (response.data.riskLevel?.toLowerCase() || 'medium') as any,
              factors: (response.data.riskFactors || []).map(factor => ({
                category: factor.category,
                description: factor.description,
                severity: (factor.severity?.toLowerCase() || 'medium') as any,
                evidence: factor.evidence,
                impact: factor.impact,
              })),
              summary: `Risk score: ${response.data.riskScore}/100. ${response.data.riskLevel} risk.`,
              recommendations: ['Conduct thorough research before investing.'],
            };
          }
          
          return null;
        } catch (error) {
          console.error(`Error analyzing risk for token ${token.mint}:`, error);
          return null;
        }
      },
      enabled: !!walletAddress && !!validTokens.length,
      staleTime: QUERY_CONFIG.tokenRiskAnalysis.staleTime,
      refetchInterval: QUERY_CONFIG.tokenRiskAnalysis.refetchInterval,
      retry: 1,
    })),
  });
  
  // Combine token data with risk analysis
  const tokensWithRisk = useMemo(() => {
    return validTokens.map((token, index) => {
      const query = tokenQueries[index];
      const riskScore = query.data;
      
      if (query.isSuccess && riskScore) {
        return {
          ...token,
          riskScore: riskScore.score,
          riskLevel: riskScore.level,
          riskDetails: riskScore,
        };
      }
      
      return token;
    });
  }, [validTokens, tokenQueries]);
  
  // Calculate risk statistics
  const stats = useMemo(() => {
    const highRiskCount = tokensWithRisk.filter(
      token => token.riskLevel === 'high' || token.riskLevel === 'critical'
    ).length;
    
    const mediumRiskCount = tokensWithRisk.filter(
      token => token.riskLevel === 'medium'
    ).length;
    
    const lowRiskCount = tokensWithRisk.filter(
      token => token.riskLevel === 'low'
    ).length;
    
    return {
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      totalTokens: tokensWithRisk.length,
    };
  }, [tokensWithRisk]);
  
  return {
    tokens: tokensWithRisk,
    isLoading: tokenQueries.some(query => query.isLoading),
    isError: tokenQueries.some(query => query.isError && !query.isPaused),
    stats,
    refetch: () => tokenQueries.forEach(query => query.refetch()),
  };
}


export function useMarkTokenReviewed() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tokenMint, walletAddress }: { tokenMint: string, walletAddress: string }) => {

      return { success: true };
    },
    onSuccess: (_, { tokenMint, walletAddress }) => {
      // Update the wallet tokens cache
      queryClient.setQueryData(['walletTokens', walletAddress], (oldData: WalletToken[] | undefined) => {
        if (!oldData) return [];
        
        return oldData.map(token => {
          if (token.mint === tokenMint) {
            return {
              ...token,
              reviewed: true,
            };
          }
          return token;
        });
      });
      
      // Invalidate the risk analysis to refetch it
      queryClient.invalidateQueries({ queryKey: ['tokenRiskAnalysis', tokenMint] });
    },
  });
}

/**
 * A simplified hook that combines wallet tokens and risk analysis 
 * for easier consumption in components
 */
export function useWalletTokensWithRisk(walletAddress: string | null) {
  const { 
    data: tokens = [], 
    isLoading: isLoadingTokens,
    error: tokensError 
  } = useWalletTokens(walletAddress);
  
  const {
    tokens: tokensWithRisk,
    isLoading: isLoadingRisk,
    isError: isRiskError,
    stats,
    refetch: refetchRisk
  } = useWalletTokensRiskAnalysis(walletAddress, tokens);
  
  return {
    tokens: tokensWithRisk,
    isLoading: isLoadingTokens || isLoadingRisk,
    error: tokensError || isRiskError,
    stats,
    refetch: refetchRisk,
  };
}