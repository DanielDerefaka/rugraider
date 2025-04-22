
'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useMutation } from '@tanstack/react-query';
import { rugCheckAPI } from '@/lib/rugcheck';
import bs58 from 'bs58';
import { useNotifications } from '../contexts/NotificationContext';

export function useRugCheckAuth() {
  const { publicKey, signMessage } = useWallet();
  const { addNotification } = useNotifications();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check if there's a stored token on client side
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('rugcheck_jwt');
    }
    return false;
  });

  // Mutation for RugCheck login
  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!publicKey || !signMessage) {
        throw new Error('Wallet not connected or does not support signing');
      }

      // Create the message to sign
      const message = `Sign-in to Rugcheck.xyz`;
      
      try {
        // Request signature from wallet
        const encodedMessage = new TextEncoder().encode(message);
        const signature = await signMessage(encodedMessage);
        
        // Convert signature to base58 string
        const signatureString = bs58.encode(signature);
        
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
      addNotification({
        type: 'system',
        title: 'Authentication Failed',
        message: error instanceof Error ? error.message : 'Failed to authenticate with RugCheck',
        priority: 'high'
      });
    }
  });

  // Logout function
  const logout = () => {
    rugCheckAPI.clearToken();
    setIsAuthenticated(false);
    addNotification({
      type: 'system',
      title: 'Logged Out',
      message: 'You have been logged out from RugCheck',
      priority: 'low'
    });
  };

  return {
    isAuthenticated,
    login: loginMutation.mutate,
    logout,
    isLoggingIn: loginMutation.isPending,
    error: loginMutation.error
  };
}