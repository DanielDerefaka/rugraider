'use client';

import React, { createContext, useContext, ReactNode, useState } from 'react';
import { 
  TokenReport, 
  WalletToken, 
  TokenRiskScore,
  TokenInsiderGraph 
} from '@/types/token';
import { useNotifications } from '@/contexts/NotificationContext';

interface TokenAnalysisContextValue {
  selectedToken: string | null;
  watchlist: string[];
  recentTokens: string[];
  cachedReports: Record<string, TokenReport>;
  setSelectedToken: (address: string | null) => void;
  addToWatchlist: (address: string, metadata?: Partial<WalletToken>) => void;
  removeFromWatchlist: (address: string) => void;
  isInWatchlist: (address: string) => boolean;
  addToRecentTokens: (address: string) => void;
  cacheTokenReport: (address: string, report: TokenReport) => void;
  getCachedReport: (address: string) => TokenReport | null;
}

const TokenAnalysisContext = createContext<TokenAnalysisContextValue>({
  selectedToken: null,
  watchlist: [],
  recentTokens: [],
  cachedReports: {},
  setSelectedToken: () => {},
  addToWatchlist: () => {},
  removeFromWatchlist: () => {},
  isInWatchlist: () => false,
  addToRecentTokens: () => {},
  cacheTokenReport: () => {},
  getCachedReport: () => null,
});

export const useTokenAnalysis = () => useContext(TokenAnalysisContext);

export const TokenAnalysisProvider = ({ children }: { children: ReactNode }) => {
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [recentTokens, setRecentTokens] = useState<string[]>([]);
  const [cachedReports, setCachedReports] = useState<Record<string, TokenReport>>({});
  
  const { addNotification } = useNotifications();
  
 
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
   
      const savedWatchlist = localStorage.getItem('watchlist');
      if (savedWatchlist) {
        try {
          setWatchlist(JSON.parse(savedWatchlist));
        } catch (error) {
          console.error('Error parsing saved watchlist:', error);
        }
      }
      
    
      const savedRecentTokens = localStorage.getItem('recentTokens');
      if (savedRecentTokens) {
        try {
          setRecentTokens(JSON.parse(savedRecentTokens));
        } catch (error) {
          console.error('Error parsing saved recent tokens:', error);
        }
      }
      
      // Load cached reports
      const savedCachedReports = localStorage.getItem('cachedReports');
      if (savedCachedReports) {
        try {
          setCachedReports(JSON.parse(savedCachedReports));
        } catch (error) {
          console.error('Error parsing saved cached reports:', error);
        }
      }
    }
  }, []);
  
  // Save watchlist to localStorage whenever it changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
    }
  }, [watchlist]);
  
  // Save recent tokens to localStorage whenever they change
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('recentTokens', JSON.stringify(recentTokens));
    }
  }, [recentTokens]);
  
  // Save cached reports to localStorage whenever they change
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cachedReports', JSON.stringify(cachedReports));
    }
  }, [cachedReports]);
  
  // Add token to watchlist
  const addToWatchlist = (address: string, metadata?: Partial<WalletToken>) => {
    if (!watchlist.includes(address)) {
      setWatchlist(prev => [...prev, address]);
      
      // Notify user
      addNotification({
        type: 'token',
        title: 'Token Added to Watchlist',
        message: `${metadata?.symbol || 'Token'} has been added to your watchlist.`,
        priority: 'low',
        data: {
          tokenAddress: address,
          tokenName: metadata?.name,
          tokenSymbol: metadata?.symbol,
        },
      });
    }
  };
  
  // Remove token from watchlist
  const removeFromWatchlist = (address: string) => {
    setWatchlist(prev => prev.filter(item => item !== address));
  };
  
  // Check if token is in watchlist
  const isInWatchlist = (address: string) => {
    return watchlist.includes(address);
  };
  
  // Add token to recent tokens
  const addToRecentTokens = (address: string) => {
    setRecentTokens(prev => {
      // Remove if already exists
      const filtered = prev.filter(item => item !== address);
      // Add to beginning and limit to 10 items
      return [address, ...filtered].slice(0, 10);
    });
  };
  
  // Cache token report
  const cacheTokenReport = (address: string, report: TokenReport) => {
    setCachedReports(prev => ({
      ...prev,
      [address]: report,
    }));
  };
  
  // Get cached token report
  const getCachedReport = (address: string): TokenReport | null => {
    return cachedReports[address] || null;
  };
  
  const contextValue: TokenAnalysisContextValue = {
    selectedToken,
    watchlist,
    recentTokens,
    cachedReports,
    setSelectedToken,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    addToRecentTokens,
    cacheTokenReport,
    getCachedReport,
  };
  
  return (
    <TokenAnalysisContext.Provider value={contextValue}>
      {children}
    </TokenAnalysisContext.Provider>
  );
};