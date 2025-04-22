'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWalletContext } from '@/contexts/WalletContext';
import { useMutation } from '@tanstack/react-query';
import { rugCheckAPI } from '@/lib/rugcheck';
import { formatAddress } from '@/lib/utils';
import { useNotifications } from '@/contexts/NotificationContext';
import bs58 from 'bs58';

interface IntegratedWalletConnectProps {
  className?: string;
  showBalance?: boolean;
  variant?: 'default' | 'minimal';
}

export const IntegratedWalletConnect: React.FC<IntegratedWalletConnectProps> = ({
  className = '',
  showBalance = false,
  variant = 'default',
}) => {
  const { publicKey, connected, wallet, signMessage, disconnect } = useWallet();
  const { tokens, isLoadingTokens } = useWalletContext();
  const { addNotification } = useNotifications();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Check if already authenticated with RugCheck
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check if there's a stored token on client side
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('rugcheck_jwt');
    }
    return false;
  });

  // Auth mutation for RugCheck
  const authMutation = useMutation({
    mutationFn: async () => {
      if (!publicKey || !signMessage) {
        throw new Error('Wallet not connected or does not support signing');
      }

      // Create the message to sign
      const message = `Sign-in to Rugcheck.xyz`;
      setIsAuthenticating(true);
      setAuthError(null);
      
      try {
        // Request signature from wallet
        const encodedMessage = new TextEncoder().encode(message);
        const signature = await signMessage(encodedMessage);
        
        // Convert signature to base58 string
        const signatureString = bs58.encode(signature);
        
        // Request body format as shown in API docs
        const requestBody = {
          "message": {
            "message": message,
            "publicKey": publicKey.toBase58(),
            "timestamp": Math.floor(Date.now() / 1000)
          },
          "signature": {
            "data": signatureString,
            "type": "string"
          },
          "wallet": publicKey.toBase58()
        };
        
        // Send to RugCheck API
        const response = await rugCheckAPI.loginWithSolana(
          signatureString,
          message,
          publicKey.toBase58()
        );
        
        // Update authentication state
        setIsAuthenticated(true);
        return response;
      } catch (error) {
        console.error('Failed to sign message:', error);
        throw error;
      } finally {
        setIsAuthenticating(false);
      }
    },
    onSuccess: () => {
      addNotification({
        type: 'system',
        title: 'Authentication Success',
        message: 'Successfully authenticated with RugCheck',
        priority: 'low'
      });
    },
    onError: (error) => {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
      addNotification({
        type: 'system',
        title: 'Authentication Failed',
        message: error instanceof Error ? error.message : 'Failed to authenticate with RugCheck',
        priority: 'high'
      });
    }
  });

  // Handle wallet connection and trigger auth
  useEffect(() => {
    if (connected && publicKey && !isAuthenticated && !isAuthenticating && !authError) {
      // Auto-initiate authentication when wallet connects
      authMutation.mutate();
    }
  }, [connected, publicKey, isAuthenticated, isAuthenticating]);
  
  // Logout from both wallet and RugCheck
  const handleLogout = () => {
    rugCheckAPI.clearToken();
    setIsAuthenticated(false);
    disconnect();
    
    addNotification({
      type: 'system',
      title: 'Logged Out',
      message: 'You have been disconnected from wallet and RugCheck',
      priority: 'low'
    });
  };
  
  // If authenticating, show loading state
  if (connected && isAuthenticating) {
    return (
      <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg flex items-center" disabled>
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Authenticating...
      </button>
    );
  }

  // If connected and authenticated, show address
  if (connected && isAuthenticated) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showBalance && (
          <div className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
            {isLoadingTokens ? (
              <span className="animate-pulse">Loading...</span>
            ) : (
              `${tokens.length} Tokens`
            )}
          </div>
        )}
        
        <div className="flex items-center">
          <span className="inline-flex h-2 w-2 items-center rounded-full bg-green-400 mr-2"></span>
          <button 
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
            onClick={handleLogout}
          >
            {formatAddress(publicKey.toBase58())}
          </button>
        </div>
      </div>
    );
  }
  
  // If there was an auth error but still connected, show retry option
  if (connected && authError) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="text-xs text-red-600">{authError}</div>
        <button 
          className="px-3 py-1 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          onClick={() => authMutation.mutate()}
        >
          Retry Auth
        </button>
        <button
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
          onClick={handleLogout}
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Use the wallet adapter button for connecting
  return <WalletMultiButton className={className} />;
};