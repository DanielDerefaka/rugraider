'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rugCheckAPI } from '@/lib/rugcheck';
import { useTokenAnalysis } from '@/contexts/TokenAnalysisContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { analyzeTokenWithReportData } from '@/lib/openai';
import { TokenReport, TokenRiskScore } from '@/types/token';
import { parseErrorMessage } from '@/lib/utils';

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

// Hook to get token report
export function useTokenReport(tokenAddress: string | null) {
  const queryClient = useQueryClient();
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
      
      // Fetch from RugCheck API
      const response = await rugCheckAPI.getTokenReport(tokenAddress);
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to get token report');
      }
      
      // Enhanced analysis with OpenAI
      let enhancedRiskScore: TokenRiskScore | null = null;
      try {
        enhancedRiskScore = await analyzeTokenWithReportData(tokenAddress, response);
      } catch (error) {
        console.error('Error enhancing token report with OpenAI:', error);
        // Continue with basic report if OpenAI enhancement fails
      }
      
      // Map response to our TokenReport type
      const tokenReport: TokenReport = {
        metadata: {
          address: tokenAddress,
          name: response.data.name || 'Unknown Token',
          symbol: response.data.symbol || '???',
          decimals: response.data.decimals || 0,
          logoURI: response.data.logoURI,
          totalSupply: response.data.totalSupply,
        },
        riskScore: enhancedRiskScore || {
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
        },
        rugCheckVerified: response.data.verified || false,
        creationDate: response.data.createdAt,
        deployerAddress: response.data.deployerAddress,
        holders: response.data.holders,
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
    },
    enabled: !!tokenAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

// Hook to get token insider graph
export function useTokenInsiderGraph(tokenAddress: string | null) {
  return useQuery({
    queryKey: ['rugcheck', 'insiderGraph', tokenAddress],
    queryFn: async () => {
      if (!tokenAddress) {
        throw new Error('Token address is required');
      }
      
      const response = await rugCheckAPI.getTokenInsiderGraph(tokenAddress);
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to get token insider graph');
      }
      
      return {
        nodes: response.data.nodes || [],
        links: response.data.links || [],
      };
    },
    enabled: !!tokenAddress,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}

// Hook to get new tokens
export function useNewTokens(limit: number = 10) {
  return useQuery({
    queryKey: ['rugcheck', 'newTokens', limit],
    queryFn: async () => {
      const response = await rugCheckAPI.getNewTokens(limit);
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to get new tokens');
      }
      
      return response.data.tokens || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
}

// Hook to get trending tokens
export function useTrendingTokens(limit: number = 10) {
  return useQuery({
    queryKey: ['rugcheck', 'trendingTokens', limit],
    queryFn: async () => {
      const response = await rugCheckAPI.getTrendingTokens(limit);
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to get trending tokens');
      }
      
      return response.data.tokens || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
}

// Hook to get verified tokens
export function useVerifiedTokens(limit: number = 10) {
  return useQuery({
    queryKey: ['rugcheck', 'verifiedTokens', limit],
    queryFn: async () => {
      const response = await rugCheckAPI.getVerifiedTokens(limit);
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to get verified tokens');
      }
      
      return response.data.tokens || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
}

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
  return useQuery({
    queryKey: ['rugcheck', 'eligibility', tokenAddress],
    queryFn: async () => {
      if (!tokenAddress) {
        throw new Error('Token address is required');
      }
      
      const response = await rugCheckAPI.checkTokenEligibility(tokenAddress);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to check token eligibility');
      }
      
      return response.data || { eligible: false };
    },
    enabled: !!tokenAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}