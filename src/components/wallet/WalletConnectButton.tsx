'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWalletContext } from '@/contexts/WalletContext';
import { formatAddress } from '@/lib/utils';

interface WalletConnectButtonProps {
  className?: string;
  showBalance?: boolean;
  variant?: 'default' | 'minimal';
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  className = '',
  showBalance = false,
  variant = 'default',
}) => {
  const { publicKey } = useWallet();
  const { tokens, isLoadingTokens } = useWalletContext();
  
  // Use the built-in WalletMultiButton if using default variant
  if (variant === 'default') {
    return <WalletMultiButton className={className} />;
  }
  
  // If not connected, show minimal connect button
  if (!publicKey) {
    return (
      <button 
        className={`px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 ${className}`}
        onClick={() => document.querySelector('.wallet-adapter-button')?.click()}
      >
        Connect Wallet
      </button>
    );
  }
  
  // If connected, show address and balance
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
      
      <button 
        className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
        onClick={() => document.querySelector('.wallet-adapter-button')?.click()}
      >
        {formatAddress(publicKey.toBase58())}
      </button>
    </div>
  );
};