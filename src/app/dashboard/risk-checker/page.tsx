'use client';

import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { TokenReportComponent } from '@/components/token/TokenReport';
import { InsiderGraph } from '@/components/visualization/InsiderGraph';
import { useTokenReport, useTokenInsiderGraph, useCheckTokenEligibility, useVerifyToken } from '@/hooks/useRugCheck';
import { useTokenAnalysis } from '@/contexts/TokenAnalysisContext';

export default function RiskCheckerPage() {
  const [tokenAddress, setTokenAddress] = useState('');
  const [searchedAddress, setSearchedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { setSelectedToken } = useTokenAnalysis();
  

  const { 
    data: tokenReport, 
    isLoading: isLoadingReport,
    isError: isReportError,
    error: reportError
  } = useTokenReport(searchedAddress);
  

  const { 
    data: insiderGraph, 
    isLoading: isLoadingGraph 
  } = useTokenInsiderGraph(searchedAddress);
  

  const { 
    data: eligibilityData, 
    isLoading: isCheckingEligibility 
  } = useCheckTokenEligibility(searchedAddress);
  

  const { 
    mutate: verifyToken, 
    isPending: isVerifying 
  } = useVerifyToken();
  
  // Handle search submission
  const handleSearch = () => {
    setError(null);
    
    // Validate Solana address
    try {
      if (!tokenAddress.trim()) {
        setError('Please enter a token address');
        return;
      }
      
      // Check if it's a valid Solana address
      new PublicKey(tokenAddress);
      
      // Set the searched address and update selected token for context
      setSearchedAddress(tokenAddress);
      setSelectedToken(tokenAddress);
    } catch (err) {
      setError('Invalid Solana address');
      console.error('Address validation error:', err);
    }
  };
  
  // Handle verification request
  const handleVerify = () => {
    if (searchedAddress) {
      verifyToken(searchedAddress);
    }
  };
  
  return (

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Risk Checker</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Analyze any Solana token for potential risks and scams
          </p>
        </div>
        
        {/* Search box */}
        <div className="card mb-8">
          <div className="card-body">
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="flex-grow">
                <label htmlFor="tokenAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Token Address
                </label>
                <input
                  type="text"
                  id="tokenAddress"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  placeholder="Enter Solana token address (e.g., SRM...)"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
                {error && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-500">{error}</p>
                )}
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSearch}
                  className="w-full sm:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Analyze Token
                </button>
              </div>
            </div>
            
            {/* Examples */}
            <div className="mt-4">
              <span className="text-sm text-gray-500">Examples: </span>
              <button
                className="ml-2 text-xs text-primary-600 hover:text-primary-700"
                onClick={() => setTokenAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')}
              >
                USDC
              </button>
              <button
                className="ml-2 text-xs text-primary-600 hover:text-primary-700"
                onClick={() => setTokenAddress('So11111111111111111111111111111111111111112')}
              >
                Wrapped SOL
              </button>
              <button
                className="ml-2 text-xs text-primary-600 hover:text-primary-700"
                onClick={() => setTokenAddress('mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So')}
              >
                Marinade SOL
              </button>
            </div>
          </div>
        </div>
        
        {/* Results */}
        {searchedAddress && (
          <div className="space-y-6">
            {/* Token report */}
            <div className="card">
              <div className="card-header flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Token Analysis</h2>
                
                {/* Verification button */}
                {eligibilityData?.eligible && !tokenReport?.rugCheckVerified && (
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="btn btn-primary"
                  >
                    {isVerifying ? 'Verifying...' : 'Verify Token'}
                  </button>
                )}
              </div>
              <div className="card-body">
                {isLoadingReport ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-10 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-40 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                ) : isReportError ? (
                  <div className="text-center py-6">
                    <p className="text-red-500">Error analyzing token</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {reportError instanceof Error ? reportError.message : 'An unknown error occurred'}
                    </p>
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
                    width={800}
                    height={600}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

  );
}