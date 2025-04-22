'use client';

import { useQuery, useQueries } from '@tanstack/react-query';
import { WalletToken, TokenRiskScore } from '@/types/token';
import { getWalletTokens, getTokenMetadata, analyzeTokenRisks } from '@/lib/solana';
import { rugCheckAPI } from '@/lib/rugcheck';
import { useTokenReport } from './useRugCheck';
import { useNotifications } from '@/contexts/NotificationContext';
import { getRiskLevelFromScore } from '@/lib/utils';

// Hook to get tokens in a wallet
export function useWalletTokens(walletAddress: string | null) {
  const { addNotification } = useNotifications();

  return useQuery({
    queryKey: ['walletTokens', walletAddress],
    queryFn: async (): Promise<WalletToken[]> => {
      if (!walletAddress) {
        return [];
      }
      
      // Fetch token accounts from Solana
      const tokens = await getWalletTokens(walletAddress);
      
      // Fetch metadata for each token
      const tokensWithMetadata = await Promise.all(
        tokens.map(async (token) => {
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
            console.error(`Error fetching metadata for token ${token.mint}:`, error);
            return {
              ...token,
              symbol: 'Unknown',
              name: 'Unknown Token',
              riskScore: 50, // Medium risk for unknown tokens
              riskLevel: 'medium' as const,
            };
          }
        })
      );
      
      // If any high-risk tokens are found, send a notification
      const highRiskTokens = tokensWithMetadata.filter(
        (token) => token.riskLevel === 'high' || token.riskLevel === 'critical'
      );
      
      if (highRiskTokens.length > 0) {
        addNotification({
          type: 'risk',
          title: 'High Risk Tokens Detected',
          message: `Your wallet contains ${highRiskTokens.length} high risk tokens.`,
          priority: 'high',
          data: {
            walletAddress,
          },
        });
      }
      
      return tokensWithMetadata;
    },
    enabled: !!walletAddress,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

// Hook to get detailed risk scores for wallet tokens
export function useWalletTokensRiskAnalysis(walletAddress: string | null, tokens: WalletToken[]) {
  // Fetch detailed risk reports for each token in parallel
  const tokenQueries = useQueries({
    queries: tokens.map(token => ({
      queryKey: ['tokenRiskAnalysis', token.mint],
      queryFn: async (): Promise<{ token: WalletToken, riskScore: TokenRiskScore | null }> => {
        try {
          // Try to get risk report from RugCheck
          const response = await rugCheckAPI.getTokenReport(token.mint);
          
          if (response.success && response.data) {
            // Map the risk data
            const riskScore: TokenRiskScore = {
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
            
            return {
              token: {
                ...token,
                riskScore: riskScore.score,
                riskLevel: riskScore.level,
              },
              riskScore,
            };
          }
          
          // If RugCheck doesn't have data, use our initial assessment
          return { token, riskScore: null };
        } catch (error) {
          console.error(`Error analyzing risk for token ${token.mint}:`, error);
          return { token, riskScore: null };
        }
      },
      enabled: !!walletAddress && !!tokens.length,
      staleTime: 10 * 60 * 1000, // 10 minutes
    })),
  });
  
  // Check if all queries are completed
  const isLoading = tokenQueries.some(query => query.isLoading);
  const isError = tokenQueries.some(query => query.isError);
  
  // Combine results
  const tokens_with_risk = tokenQueries
    .filter(query => query.isSuccess && query.data)
    .map(query => query.data!.token);
  
  // Calculate stats
  const highRiskCount = tokens_with_risk.filter(
    token => token.riskLevel === 'high' || token.riskLevel === 'critical'
  ).length;
  
  const mediumRiskCount = tokens_with_risk.filter(
    token => token.riskLevel === 'medium'
  ).length;
  
  const lowRiskCount = tokens_with_risk.filter(
    token => token.riskLevel === 'low'
  ).length;
  
  return {
    tokens: tokens_with_risk,
    isLoading,
    isError,
    stats: {
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      totalTokens: tokens_with_risk.length,
    },
  };
}