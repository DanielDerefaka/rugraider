'use client';

import { useState, useEffect } from 'react';
import { TokenReportComponent } from '@/components/token/TokenReport';
import { RiskScore } from '@/components/token/RiskScore';
import { InsiderGraph } from '@/components/visualization/InsiderGraph';
import { useTokenAnalysis } from '@/contexts/TokenAnalysisContext';
import { useTokenReport, useTokenInsiderGraph, useTrendingTokens, useNewTokens, useVerifiedTokens } from '@/hooks/useRugCheck';
import { formatAddress, formatDate } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { useNotifications } from '@/contexts/NotificationContext';

export default function TokenAnalysisPage() {
  const { selectedToken, setSelectedToken, isInWatchlist, addToWatchlist, removeFromWatchlist } = useTokenAnalysis();
  const { addNotification } = useNotifications();
  
  // Add error handling state
  const [retryCount, setRetryCount] = useState(0);
  
  // Fetch token report if a token is selected
  const { data: tokenReport, isLoading: isLoadingReport, error: reportError, refetch: refetchReport } = useTokenReport(selectedToken);
  
  // Fetch token insider graph if a token is selected - now returns empty arrays instead of throwing
  const { data: insiderGraph, isLoading: isLoadingGraph } = useTokenInsiderGraph(selectedToken);
  
  // Fetch token lists with improved error handling - now returns empty arrays instead of throwing
  const { data: trendingTokens = [], isLoading: isLoadingTrending, refetch: refetchTrending } = useTrendingTokens(10);
  const { data: newTokens = [], isLoading: isLoadingNew, refetch: refetchNew } = useNewTokens(10);
  const { data: verifiedTokens = [], isLoading: isLoadingVerified, refetch: refetchVerified } = useVerifiedTokens(10);
  
  // Tab management
  const [activeTab, setActiveTab] = useState<'trending' | 'new' | 'verified'>('trending');
  
  // Effect to handle automatic refetching on error
  useEffect(() => {
    const hasError = reportError || (selectedToken && !tokenReport && !isLoadingReport);
    
    if (hasError && retryCount < 3) {
      const timer = setTimeout(() => {
        console.log(`Retry attempt ${retryCount + 1} for data fetching`);
        
        if (reportError && selectedToken) {
          refetchReport();
        }
        
        // Only refetch lists if they're empty
        if (activeTab === 'trending' && trendingTokens.length === 0 && !isLoadingTrending) {
          refetchTrending();
        }
        
        if (activeTab === 'new' && newTokens.length === 0 && !isLoadingNew) {
          refetchNew();
        }
        
        if (activeTab === 'verified' && verifiedTokens.length === 0 && !isLoadingVerified) {
          refetchVerified();
        }
        
        setRetryCount(prev => prev + 1);
      }, 3000); // Retry after 3 seconds
      
      return () => clearTimeout(timer);
    }
    
    // Reset retry count if no errors or we have data
    if ((!hasError || (selectedToken && tokenReport)) && retryCount > 0) {
      setRetryCount(0);
    }
  }, [
    reportError, retryCount, refetchReport, selectedToken, tokenReport, isLoadingReport,
    activeTab, trendingTokens, newTokens, verifiedTokens, 
    isLoadingTrending, isLoadingNew, isLoadingVerified,
    refetchTrending, refetchNew, refetchVerified
  ]);
  
  // Handle API errors with user-friendly notifications
  useEffect(() => {
    if (reportError && selectedToken && retryCount >= 3) {
      addNotification({
        type: 'system',
        title: 'Error Loading Token Report',
        message: 'We encountered an issue loading the token report. Please try again later.',
        priority: 'medium',
      });
    }
  }, [reportError, selectedToken, retryCount, addNotification]);
  
  // Switch active list based on tab
  const activeTokenList = (() => {
    switch (activeTab) {
      case 'trending':
        return { 
          tokens: trendingTokens, 
          isLoading: isLoadingTrending, 
          error: trendingTokens.length === 0 && !isLoadingTrending, 
          refetch: refetchTrending 
        };
      case 'new':
        return { 
          tokens: newTokens, 
          isLoading: isLoadingNew, 
          error: newTokens.length === 0 && !isLoadingNew, 
          refetch: refetchNew 
        };
      case 'verified':
        return { 
          tokens: verifiedTokens, 
          isLoading: isLoadingVerified, 
          error: verifiedTokens.length === 0 && !isLoadingVerified, 
          refetch: refetchVerified 
        };
      default:
        return { 
          tokens: trendingTokens, 
          isLoading: isLoadingTrending, 
          error: trendingTokens.length === 0 && !isLoadingTrending, 
          refetch: refetchTrending 
        };
    }
  })();
  
  // Handle token selection
  const handleSelectToken = (address: string) => {
    setSelectedToken(address);
    setRetryCount(0); // Reset retry count when selecting a new token
    
    // Scroll to top on mobile
    if (window.innerWidth < 1024) {
      window.scrollTo(0, 0);
    }
  };
  
  // Handle retry for token list
  const handleRetryTokenList = () => {
    activeTokenList.refetch();
  };
  
  // Handle retry for token report
  const handleRetryTokenReport = () => {
    if (selectedToken) {
      refetchReport();
    }
  };
  
  // Handle watchlist toggle with notification
  const handleWatchlistToggle = () => {
    if (!selectedToken || !tokenReport) return;
    
    try {
      if (isInWatchlist(selectedToken)) {
        removeFromWatchlist(selectedToken);
        addNotification({
          type: 'system',
          title: 'Removed from Watchlist',
          message: `${tokenReport.metadata.symbol} has been removed from your watchlist`,
          priority: 'low',
        });
      } else {
        addToWatchlist(selectedToken, tokenReport.metadata);
        addNotification({
          type: 'system',
          title: 'Added to Watchlist',
          message: `${tokenReport.metadata.symbol} has been added to your watchlist`,
          priority: 'low',
        });
      }
    } catch (e) {
      console.error('Error updating watchlist:', e);
      addNotification({
        type: 'system',
        title: 'Watchlist Error',
        message: 'Failed to update watchlist',
        priority: 'medium',
      });
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
              ) : activeTokenList.error ? (
                <div className="text-center py-4 text-red-500">
                  <p>Error loading tokens. Please try again.</p>
                  <button 
                    onClick={handleRetryTokenList}
                    className="mt-2 btn btn-sm btn-outline"
                  >
                    Retry
                  </button>
                </div>
              ) : activeTokenList.tokens.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No tokens available</p>
              ) : (
                <div className="space-y-3">
                  {activeTokenList.tokens.map((token) => (
                    <div 
                      key={token.id || token.address || Math.random().toString()} 
                      className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        selectedToken === token.address 
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => token.address && handleSelectToken(token.address)}
                    >
                      <div className="flex-shrink-0 h-10 w-10 mr-3">
                        {token.logoURI ? (
                          <div className="h-full w-full rounded-full overflow-hidden">
                            <Image
                              src={token.logoURI} 
                              alt={token.symbol || 'Token'} 
                              width={40}
                              height={40}
                              className="h-full w-full rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://placehold.co/40x40/gray/white?text=${(token.symbol || '?').charAt(0)}`;
                              }}
                            />
                          </div>
                        ) : (
                          <div className="h-full w-full rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium">
                            {(token.symbol || '?').charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {token.name || token.symbol || 'Unknown Token'}
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
                          {token.symbol || 'UNKNOWN'} • {token.address ? formatAddress(token.address) : 'No address'}
                        </div>
                        {activeTab === 'new' && token.createdAt && (
                          <div className="text-xs text-gray-500 mt-1">
                            Created: {formatDate(new Date(token.createdAt).getTime() / 1000)}
                          </div>
                        )}
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        <RiskScore
                          score={token.riskScore || 50}
                          level={token.riskLevel || 'medium'}
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
                  ) : reportError ? (
                    <div className="text-center py-6 text-red-500">
                      <p>Failed to load token report. Please try again.</p>
                      <button 
                        onClick={handleRetryTokenReport}
                        className="mt-3 btn btn-primary"
                      >
                        Retry Loading Report
                      </button>
                    </div>
                  ) : tokenReport ? (
                    <TokenReportComponent report={tokenReport} />
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-500">No token report available</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Insider graph */}
              {insiderGraph && insiderGraph.nodes && insiderGraph.nodes.length > 0 ? (
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
              ) : isLoadingGraph ? (
                <div className="card">
                  <div className="card-header">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Token Transaction Graph</h2>
                  </div>
                  <div className="card-body">
                    <div className="animate-pulse h-96 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ) : null}
              
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
                  onClick={handleWatchlistToggle}
                  className={`btn ${isInWatchlist(selectedToken) ? 'btn-warning' : 'btn-secondary'} text-sm py-2 px-4`}
                  disabled={!tokenReport} // Disable if no token report is available
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
      
      {/* Add the debugger in development only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8">
          <TokenApiDebugger />
        </div>
      )}
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
  const { data: tokenReport, isLoading, error } = useTokenReport(tokenAddress);
  
  if (isLoading) {
    return (
      <div className="animate-pulse border rounded-lg p-3 h-20"></div>
    );
  }
  
  if (error || !tokenReport) {
    return (
      <div className="border rounded-lg p-3 text-center text-sm text-gray-500">
        <p>Token info unavailable</p>
        <p className="text-xs">{formatAddress(tokenAddress)}</p>
      </div>
    );
  }
  
  return (
    <div 
      className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
      onClick={() => onSelect(tokenAddress)}
    >
      <div className="flex-shrink-0 h-10 w-10 mr-3">
        {tokenReport.metadata.logoURI ? (
          <Image
            src={tokenReport.metadata.logoURI} 
            alt={tokenReport.metadata.symbol} 
            width={40}
            height={40}
            className="h-full w-full rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/40x40/gray/white?text=${(tokenReport.metadata.symbol || '?').charAt(0)}`;
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

// Simple debug component - only used in development
const TokenApiDebugger = () => {
  const [expanded, setExpanded] = useState(false);
  
  const handleRefresh = () => {
    window.location.reload();
  };
  
  return (
    <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Debug Tools</h3>
        <div className="space-x-2">
          <button 
            className="btn btn-sm btn-outline" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide' : 'Show'}
          </button>
          {expanded && (
            <button className="btn btn-sm btn-primary" onClick={handleRefresh}>
              Refresh Page
            </button>
          )}
        </div>
      </div>
      
      {expanded && (
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-2">
            Debugging information for troubleshooting API issues.
          </p>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left">Component</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-2 border-t">Trending Token Hook</td>
                <td className="px-4 py-2 border-t">Enhanced + Error Handling</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-t">New Token Hook</td>
                <td className="px-4 py-2 border-t">Enhanced + Error Handling</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-t">Verified Token Hook</td>
                <td className="px-4 py-2 border-t">Enhanced + Error Handling</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-t">Token Report Hook</td>
                <td className="px-4 py-2 border-t">Enhanced + Response Parsing</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-t">Insider Graph Hook</td>
                <td className="px-4 py-2 border-t">Enhanced + Error Fallback</td>
              </tr>
            </tbody>
          </table>
          
          <div className="mt-4">
            <h4 className="font-medium mb-2">Current Cache Status</h4>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs">
              <code>React Query cache size: {window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__?.getCacheSize?.() || 'Unknown'}</code>
            </div>
          </div>
          
          <div className="mt-4 flex space-x-2">
            <button 
              className="btn btn-sm btn-outline"
              onClick={() => {
                // Clear local cache
                try {
                  window.sessionStorage.clear();
                  window.localStorage.removeItem('rugcheck_jwt');
                  alert('Local storage cleared');
                } catch (e) {
                  console.error('Error clearing cache:', e);
                  alert('Error clearing cache: ' + e);
                }
              }}
            >
              Clear Local Cache
            </button>
            
            <button 
              className="btn btn-sm btn-outline"
              onClick={() => {
                // Open console
                console.log('=== DEBUG INFO ===');
                console.log('Current environment:', process.env.NODE_ENV);
                console.log('React Query Cache:', window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__?.getQueries?.());
                console.log('=== END DEBUG INFO ===');
                alert('Check browser console for debug info');
              }}
            >
              Log Debug Info
            </button>
          </div>
        </div>
      )}
    </div>
  );
};