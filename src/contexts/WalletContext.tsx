'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { 
  ConnectionProvider, 
  WalletProvider as SolanaWalletProvider,
  useWallet,
  useConnection
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  CloverWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletToken } from '@/types/token';
import { getWalletTokens } from '@/lib/solana';
import { getConnection } from '@/lib/solana-connection';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletContextValue {
  walletAddress: string | null;
  connected: boolean;
  tokens: WalletToken[];
  isLoadingTokens: boolean;
  error: string | null;
  riskSummary: {
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    unknownCount: number;
    totalTokens: number;
  };
  refreshTokens: () => Promise<void>;
  clearError: () => void;
}

// Create context with defaults
const WalletContext = createContext<WalletContextValue>({
  walletAddress: null,
  connected: false,
  tokens: [],
  isLoadingTokens: false,
  error: null,
  riskSummary: {
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
    unknownCount: 0,
    totalTokens: 0,
  },
  refreshTokens: async () => {},
  clearError: () => {},
});

export const useWalletContext = () => useContext(WalletContext);

export const WalletContextProvider = ({ children }: { children: ReactNode }) => {
  // Configure Solana network
  const network = WalletAdapterNetwork.Mainnet;
  
  // Use our custom RPC connection configuration
  // Instead of clusterApiUrl(network), we now use our managed connection
  const endpoint = getConnection().rpcEndpoint;
  
  // Set up wallet adapters
  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new TorusWalletAdapter(),
    new LedgerWalletAdapter(),
    new CloverWalletAdapter()
  ];
  
  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletDataProvider>
            {children}
          </WalletDataProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};

// Inner provider that handles the data
const WalletDataProvider = ({ children }: { children: ReactNode }) => {
  const { publicKey, connected } = useWallet();
  
  const walletAddress = publicKey?.toBase58() || null;
  
  const [tokens, setTokens] = useState<WalletToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchAttempt, setLastFetchAttempt] = useState<number>(0);
  
  // Calculate risk summary
  const riskSummary = {
    highRiskCount: tokens.filter(t => t.riskLevel === 'high' || t.riskLevel === 'critical').length,
    mediumRiskCount: tokens.filter(t => t.riskLevel === 'medium').length,
    lowRiskCount: tokens.filter(t => t.riskLevel === 'low').length,
    unknownCount: tokens.filter(t => !t.riskLevel).length,
    totalTokens: tokens.length,
  };
  
  // Clear error state
  const clearError = () => {
    setError(null);
  };
  
  // Fetch tokens with error handling and debouncing
  const fetchTokens = async () => {
    if (!walletAddress) {
      setTokens([]);
      return;
    }
    
    // Avoid repeated fetching on errors (simple debouncing)
    const now = Date.now();
    if (now - lastFetchAttempt < 10000) {
      return;
    }
    
    setLastFetchAttempt(now);
    setIsLoadingTokens(true);
    setError(null);
    
    try {
      const walletTokens = await getWalletTokens(walletAddress);
      setTokens(walletTokens);
    } catch (error: any) {
      console.error('Error fetching wallet tokens:', error);
      
      // Format a user-friendly error message
      let errorMessage = 'Failed to load tokens. ';
      
      if (error?.message?.includes('403') || error?.message?.includes('Access forbidden')) {
        errorMessage += 'The RPC server connection was blocked. This could be due to rate limiting.';
      } else if (error?.message?.includes('429') || error?.message?.includes('Too many requests')) {
        errorMessage += 'Too many requests to the Solana network. Please try again in a moment.';
      } else if (error?.message?.includes('timeout')) {
        errorMessage += 'The connection to Solana network timed out. Please check your internet connection.';
      } else {
        errorMessage += error?.message || 'Unknown error occurred.';
      }
      
      setError(errorMessage);
      
      // Return a minimal set of tokens if we have them cached
      // This allows the UI to continue functioning with stale data if needed
    } finally {
      setIsLoadingTokens(false);
    }
  };
  
  // Refresh tokens (for manual refresh)
  const refreshTokens = async () => {
    // Reset last fetch attempt to force a refresh
    setLastFetchAttempt(0);
    await fetchTokens();
  };
  
  // Initial fetch and refresh on wallet change
  useEffect(() => {
    if (connected && walletAddress) {
      fetchTokens();
    } else {
      setTokens([]);
      clearError();
    }
  }, [walletAddress, connected]);
  
  const contextValue: WalletContextValue = {
    walletAddress,
    connected,
    tokens,
    isLoadingTokens,
    error,
    riskSummary,
    refreshTokens,
    clearError,
  };
  
  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletContextProvider;