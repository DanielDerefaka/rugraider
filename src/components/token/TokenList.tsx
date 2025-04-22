'use client';

import React, { useState } from 'react';
import { WalletToken } from '@/types/token';
import { RiskScore } from './RiskScore';
import { RiskIndicator } from './RiskIndicator';
import { formatTokenAmount, formatAddress } from '@/lib/utils';
import { useTokenAnalysis } from '@/contexts/TokenAnalysisContext';

interface TokenListProps {
  tokens: WalletToken[];
  isLoading?: boolean;
  emptyMessage?: string;
  onSelectToken?: (address: string) => void;
  selectedToken?: string | null;
  showRiskScore?: boolean;
}

export const TokenList: React.FC<TokenListProps> = ({
  tokens,
  isLoading = false,
  emptyMessage = 'No tokens found',
  onSelectToken,
  selectedToken = null,
  showRiskScore = true,
}) => {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useTokenAnalysis();
  const [sortBy, setSortBy] = useState<'symbol' | 'amount' | 'risk'>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<string>('');

  // Handle sort change
  const handleSortChange = (column: 'symbol' | 'amount' | 'risk') => {
    if (sortBy === column) {
      // Toggle sort order if clicking the same column
      setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column with default order
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Filter and sort tokens
  const filteredAndSortedTokens = React.useMemo(() => {
    // Filter first
    let filteredTokens = tokens;
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filteredTokens = tokens.filter(
        token => 
          token.symbol?.toLowerCase().includes(lowerFilter) || 
          token.name?.toLowerCase().includes(lowerFilter) || 
          token.mint.toLowerCase().includes(lowerFilter)
      );
    }

    // Then sort
    return [...filteredTokens].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'symbol':
          comparison = (a.symbol || '').localeCompare(b.symbol || '');
          break;
        case 'amount':
          comparison = a.uiAmount - b.uiAmount;
          break;
        case 'risk':
          comparison = (a.riskScore || 0) - (b.riskScore || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [tokens, filter, sortBy, sortOrder]);

  // Handle token selection
  const handleTokenClick = (tokenAddress: string) => {
    if (onSelectToken) {
      onSelectToken(tokenAddress);
    }
  };

  // Handle watchlist toggle
  const handleWatchlistToggle = (e: React.MouseEvent, token: WalletToken) => {
    e.stopPropagation();
    
    if (isInWatchlist(token.mint)) {
      removeFromWatchlist(token.mint);
    } else {
      addToWatchlist(token.mint, token);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col space-y-2 animate-pulse">
        {[...Array(5)].map((_, index) => (
          <div 
            key={index} 
            className="bg-gray-100 dark:bg-gray-800 h-16 rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (!tokens.length) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Search and sort controls */}
      <div className="flex items-center mb-4 space-x-2">
        <input 
          type="text"
          placeholder="Search tokens..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Sort:</span>
          <button
            className={`px-2 py-1 text-sm rounded-md ${sortBy === 'symbol' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => handleSortChange('symbol')}
          >
            Symbol {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            className={`px-2 py-1 text-sm rounded-md ${sortBy === 'amount' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => handleSortChange('amount')}
          >
            Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            className={`px-2 py-1 text-sm rounded-md ${sortBy === 'risk' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => handleSortChange('risk')}
          >
            Risk {sortBy === 'risk' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>
      
      {/* Tokens list */}
      <div className="space-y-2">
        {filteredAndSortedTokens.map((token) => (
          <div 
            key={token.mint}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors duration-200 ${
              selectedToken === token.mint 
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
            }`}
            onClick={() => handleTokenClick(token.mint)}
          >
            {/* Token logo/icon */}
            <div className="flex-shrink-0 w-10 h-10 mr-4 overflow-hidden bg-gray-100 rounded-full dark:bg-gray-700">
              {token.logoURI ? (
                <img 
                  src={token.logoURI} 
                  alt={token.symbol || 'Token'} 
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/40x40/gray/white?text=' + (token.symbol || '?').charAt(0);
                  }}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-lg font-bold text-gray-500">
                  {(token.symbol || '?').charAt(0)}
                </div>
              )}
            </div>
            
            {/* Token info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start">
                <h3 className="text-base font-medium text-gray-900 truncate dark:text-white">
                  {token.symbol || 'Unknown'}{' '}
                  {token.riskLevel && (
                    <RiskIndicator 
                      level={token.riskLevel} 
                      size="xs" 
                      variant="pill" 
                      className="ml-2"
                    />
                  )}
                </h3>
              </div>
              <p className="mt-1 text-sm text-gray-500 truncate dark:text-gray-400">
                {token.name || 'Unknown Token'} · {formatAddress(token.mint)}
              </p>
            </div>
            
            {/* Token amount */}
            <div className="flex flex-col items-end ml-4">
              <span className="text-sm font-medium">
                {formatTokenAmount(token.amount, token.decimals)}
              </span>
              <span className="text-xs text-gray-500">
                {token.mint.substring(0, 4)}...{token.mint.substring(token.mint.length - 4)}
              </span>
            </div>
            
            {/* Risk score */}
            {showRiskScore && token.riskScore !== undefined && (
              <div className="ml-6">
                <RiskScore 
                  score={token.riskScore} 
                  level={token.riskLevel || 'medium'} 
                  size="sm"
                  showLabel={false}
                  showBadge={false}
                />
              </div>
            )}
            
            {/* Watchlist button */}
            <button
              className="p-2 ml-4 text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={(e) => handleWatchlistToggle(e, token)}
              title={isInWatchlist(token.mint) ? "Remove from watchlist" : "Add to watchlist"}
            >
              {isInWatchlist(token.mint) ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};