'use client';

import { useState } from 'react';

import { TokenReportComponent } from '@/components/token/TokenReport';
import { RiskScore } from '@/components/token/RiskScore';
import { InsiderGraph } from '@/components/visualization/InsiderGraph';
import { useTokenAnalysis } from '@/contexts/TokenAnalysisContext';
import { useTokenReport, useTokenInsiderGraph, useTrendingTokens, useNewTokens, useVerifiedTokens } from '@/hooks/useRugCheck';
import { formatAddress, formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function TokenAnalysisPage() {
  const { selectedToken, setSelectedToken, isInWatchlist, addToWatchlist, removeFromWatchlist } = useTokenAnalysis();
  
  // Fetch token report if a token is selected
  const { data: tokenReport, isLoading: isLoadingReport } = useTokenReport(selectedToken);
  
  // Fetch token insider graph if a token is selected
  const { data: insiderGraph, isLoading: isLoadingGraph } = useTokenInsiderGraph(selectedToken);
  
  // Fetch token lists
  const { data: trendingTokens = [], isLoading: isLoadingTrending } = useTrendingTokens(10);
  const { data: newTokens = [], isLoading: isLoadingNew } = useNewTokens(10);
  const { data: verifiedTokens = [], isLoading: isLoadingVerified } = useVerifiedTokens(10);
  
  // Tab management
  const [activeTab, setActiveTab] = useState<'trending' | 'new' | 'verified'>('trending');
  
  // Switch active list based on tab
  const activeTokenList = (() => {
    switch (activeTab) {
      case 'trending':
        return { tokens: trendingTokens, isLoading: isLoadingTrending };
      case 'new':
        return { tokens: newTokens, isLoading: isLoadingNew };
      case 'verified':
        return { tokens: verifiedTokens, isLoading: isLoadingVerified };
      default:
        return { tokens: trendingTokens, isLoading: isLoadingTrending };
    }
  })();
  
  // Handle token selection
  const handleSelectToken = (address: string) => {
    setSelectedToken(address);
    
    // Scroll to top on mobile
    if (window.innerWidth < 1024) {
      window.scrollTo(0, 0);
    }
  };
  
  return (

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Token Analysis</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Explore and analyze tokens in the Solana ecosystem
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel - Token lists */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="card-header p-0">
                <div className="flex border-b">
                  <button
                    className={`flex-1 py-3 px-4 text-sm font-medium text-center ${
                      activeTab === 'trending' 
                        ? 'text-primary-600 border-b-2 border-primary-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('trending')}
                  >
                    Trending
                  </button>
                  <button
                    className={`flex-1 py-3 px-4 text-sm font-medium text-center ${
                      activeTab === 'new' 
                        ? 'text-primary-600 border-b-2 border-primary-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('new')}
                  >
                    New
                  </button>
                  <button
                    className={`flex-1 py-3 px-4 text-sm font-medium text-center ${
                      activeTab === 'verified' 
                        ? 'text-primary-600 border-b-2 border-primary-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('verified')}
                  >
                    Verified
                  </button>
                </div>
              </div>
              <div className="card-body">
                {activeTokenList.isLoading ? (
                  <div className="animate-pulse space-y-3">
                    {Array(10).fill(0).map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : activeTokenList.tokens.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No tokens available</p>
                ) : (
                  <div className="space-y-3">
                    {activeTokenList.tokens.map((token) => (
                      <div 
                        key={token.id} 
                        className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          selectedToken === token.address 
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                        onClick={() => handleSelectToken(token.address)}
                      >
                        <div className="flex-shrink-0 h-10 w-10 mr-3">
                          {token.logoURI ? (
                            <img 
                              src={token.logoURI} 
                              alt={token.symbol} 
                              className="h-full w-full rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/40x40/gray/white?text=' + (token.symbol || '?').charAt(0);
                              }}
                            />
                          ) : (
                            <div className="h-full w-full rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium">
                              {token.symbol?.[0] || '?'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {token.symbol}
                            {token.verified && (
                              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Verified
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {formatAddress(token.address)}
                          </div>
                          {activeTab === 'new' && token.createdAt && (
                            <div className="text-xs text-gray-500 mt-1">
                              Created: {formatDate(new Date(token.createdAt).getTime() / 1000)}
                            </div>
                          )}
                        </div>
                        <div className="ml-3 flex-shrink-0">
                          <RiskScore
                            score={token.riskScore}
                            level={(token.riskLevel?.toLowerCase() || 'medium') as any}
                            size="sm"
                            showLabel={false}
                            showBadge={false}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Link to Risk Checker */}
            <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-lg dark:bg-primary-900/20 dark:border-primary-800">
              <h3 className="text-sm font-medium text-primary-800 dark:text-primary-300">
                Check Specific Token
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Use our Risk Checker to analyze any Solana token by address
              </p>
              <div className="mt-3">
                <Link href="/dashboard/risk-checker" className="btn btn-primary text-xs py-1 px-3">
                  Go to Risk Checker
                </Link>
              </div>
            </div>
          </div>
          
          {/* Right panel - Token details */}
          <div className="lg:col-span-2">
            {selectedToken ? (
              <>
                {/* Token report */}
                <div className="card mb-6">
                  <div className="card-header">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Token Analysis</h2>
                  </div>
                  <div className="card-body">
                    {isLoadingReport ? (
                      <div className="animate-pulse space-y-4">
                        <div className="h-10 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-40 bg-gray-200 rounded"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                      </div>
                    ) : tokenReport ? (
                      <TokenReportComponent report={tokenReport} />
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-gray-500">Failed to load token report</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Insider graph */}
                {insiderGraph && insiderGraph.nodes.length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <h2 className="text-lg font-medium text-gray-900 dark:text-white">Token Transaction Graph</h2>
                    </div>
                    <div className="card-body">
                      <InsiderGraph 
                        data={insiderGraph}
                        width={600}
                        height={400}
                      />
                    </div>
                    <div className="card-footer bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs text-gray-500">
                        This graph shows the relationships between token holders, including the token deployer and major exchanges.
                        Larger nodes represent higher token value. You can drag nodes to explore the network.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Show token actions */}
                <div className="mt-6 flex space-x-3">
                  <a 
                    href={`https://solscan.io/token/${selectedToken}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-outline text-sm py-2 px-4"
                  >
                    View on Solscan
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  
                  <a 
                    href={`https://solana.fm/address/${selectedToken}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-outline text-sm py-2 px-4"
                  >
                    View on Solana FM
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  
                  <button
                    onClick={() => isInWatchlist(selectedToken) 
                      ? removeFromWatchlist(selectedToken) 
                      : addToWatchlist(selectedToken, tokenReport?.metadata)
                    }
                    className={`btn ${isInWatchlist(selectedToken) ? 'btn-warning' : 'btn-secondary'} text-sm py-2 px-4`}
                  >
                    {isInWatchlist(selectedToken) ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Remove from Watchlist
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        Add to Watchlist
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="card">
                <div className="card-body text-center py-12">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-16 w-16 mx-auto text-gray-400"
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Select a Token</h3>
                  <p className="mt-2 text-gray-500">
                    Choose a token from the list to view detailed analysis and risk assessment
                  </p>
                  <div className="mt-6">
                    <Link href="/dashboard/risk-checker" className="btn btn-primary">
                      Check a specific token
                    </Link>
                  </div>
                </div>
              </div>
            )}
            
            {/* Recently viewed tokens */}
            {!selectedToken && (
              <div className="card mt-6">
                <div className="card-header">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Your Recently Viewed Tokens</h2>
                </div>
                <div className="card-body">
                  <TokenRecentlyViewed onSelectToken={handleSelectToken} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

  );
}

// Recently viewed tokens component
const TokenRecentlyViewed = ({ onSelectToken }: { onSelectToken: (address: string) => void }) => {
  const { recentTokens } = useTokenAnalysis();
  
  if (recentTokens.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        No recently viewed tokens
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {recentTokens.slice(0, 6).map((tokenAddress) => (
        <TokenRecentItem 
          key={tokenAddress} 
          tokenAddress={tokenAddress} 
          onSelect={onSelectToken}
        />
      ))}
    </div>
  );
};

// Single recently viewed token
const TokenRecentItem = ({ 
  tokenAddress, 
  onSelect 
}: { 
  tokenAddress: string; 
  onSelect: (address: string) => void 
}) => {
  const { data: tokenReport, isLoading } = useTokenReport(tokenAddress);
  
  if (isLoading) {
    return (
      <div className="animate-pulse border rounded-lg p-3 h-20"></div>
    );
  }
  
  if (!tokenReport) {
    return null;
  }
  
  return (
    <div 
      className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
      onClick={() => onSelect(tokenAddress)}
    >
      <div className="flex-shrink-0 h-10 w-10 mr-3">
        {tokenReport.metadata.logoURI ? (
          <img 
            src={tokenReport.metadata.logoURI} 
            alt={tokenReport.metadata.symbol} 
            className="h-full w-full rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/40x40/gray/white?text=' + (tokenReport.metadata.symbol || '?').charAt(0);
            }}
          />
        ) : (
          <div className="h-full w-full rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium">
            {tokenReport.metadata.symbol?.[0] || '?'}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {tokenReport.metadata.symbol}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {formatAddress(tokenAddress)}
        </div>
      </div>
      <div className="ml-3 flex-shrink-0">
        <RiskScore
          score={tokenReport.riskScore.score}
          level={tokenReport.riskScore.level}
          size="sm"
          showLabel={false}
          showBadge={false}
        />
      </div>
    </div>
  );
};