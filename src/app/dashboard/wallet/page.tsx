'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TokenList } from '@/components/token/TokenList';
import { RiskScore } from '@/components/token/RiskScore';
import { useWalletContext } from '@/contexts/WalletContext';
import { useWalletTokensRiskAnalysis } from '@/hooks/useWalletTokens';
import { useNotifications } from '@/contexts/NotificationContext';
import { RiskLevel } from '@/types/token';
import { formatAddress } from '@/lib/utils';

// Risk distribution chart component using Recharts
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';

export default function WalletAnalysisPage() {
  const { publicKey } = useWallet();
  const { tokens, isLoadingTokens, refreshTokens } = useWalletContext();
  const { addNotification } = useNotifications();
  
  // Get detailed risk analysis for wallet tokens
  const { 
    tokens: tokensWithRisk, 
    isLoading: isLoadingRiskAnalysis,
    stats
  } = useWalletTokensRiskAnalysis(publicKey?.toBase58() || null, tokens);
  
  // Create data for the risk distribution chart
  const riskDistributionData = [
    { name: 'Low Risk', value: stats.lowRiskCount, color: '#10b981' },
    { name: 'Medium Risk', value: stats.mediumRiskCount, color: '#f59e0b' },
    { name: 'High Risk', value: stats.highRiskCount, color: '#ef4444' },
  ];
  
  // Filter tokens by risk level
  const [filterRisk, setFilterRisk] = useState<RiskLevel | 'all'>('all');
  
  const filteredTokens = filterRisk === 'all' 
    ? tokensWithRisk 
    : tokensWithRisk.filter(token => token.riskLevel === filterRisk);
  
  // Calculate overall wallet risk score (weighted average)
  const calculateWalletRiskScore = () => {
    if (!tokensWithRisk.length) return 0;
    
    let totalRiskWeight = 0;
    let totalWeight = 0;
    
    tokensWithRisk.forEach(token => {
      // Use token value or amount as weight
      const weight = token.uiAmount || 1;
      totalRiskWeight += (token.riskScore || 50) * weight;
      totalWeight += weight;
    });
    
    return totalWeight ? Math.round(totalRiskWeight / totalWeight) : 0;
  };
  
  const walletRiskScore = calculateWalletRiskScore();
  const walletRiskLevel: RiskLevel = 
    walletRiskScore < 25 ? 'low' : 
    walletRiskScore < 50 ? 'medium' : 
    walletRiskScore < 75 ? 'high' : 
    'critical';
  
  // Check for high risk tokens on mount
  useEffect(() => {
    if (stats.highRiskCount > 0 && !isLoadingRiskAnalysis) {
      addNotification({
        type: 'risk',
        title: 'Wallet Security Alert',
        message: `Your wallet contains ${stats.highRiskCount} high risk tokens. Review them for potential security threats.`,
        priority: 'high',
        data: {
          walletAddress: publicKey?.toBase58(),
        },
      });
    }
  }, [stats.highRiskCount, isLoadingRiskAnalysis, addNotification, publicKey]);
  
  return (

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wallet Security Analysis</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Analyze and monitor your wallet for potential security risks
          </p>
        </div>
        
        {!publicKey ? (
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
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Connect Your Wallet</h3>
              <p className="mt-2 text-gray-500">
                Connect your Solana wallet to analyze its security risks
              </p>
              <div className="mt-6">
                <button 
                  className="btn btn-primary"
                  onClick={() => document.querySelector('.wallet-adapter-button')?.click()}
                >
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Wallet overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="card col-span-2">
                <div className="card-header">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Wallet Overview</h2>
                </div>
                <div className="card-body">
                  <div className="flex flex-col md:flex-row justify-between">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Wallet Address</div>
                      <div className="flex items-center">
                        <span className="font-mono text-sm">
                          {formatAddress(publicKey.toBase58(), 8)}
                        </span>
                        <button 
                          className="ml-2 text-primary-600 hover:text-primary-700"
                          onClick={() => navigator.clipboard.writeText(publicKey.toBase58())}
                          title="Copy address"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mt-6">
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Total Tokens</div>
                          <div className="text-2xl font-semibold">{stats.totalTokens}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-1">High Risk Tokens</div>
                          <div className="text-2xl font-semibold text-red-600">{stats.highRiskCount}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Security Status</div>
                          <div className={`text-lg font-semibold ${
                            walletRiskLevel === 'low' ? 'text-green-600' :
                            walletRiskLevel === 'medium' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {walletRiskLevel === 'low' ? 'Good' :
                             walletRiskLevel === 'medium' ? 'Caution' :
                             'At Risk'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <button
                          className="btn btn-primary"
                          onClick={refreshTokens}
                        >
                          Refresh Analysis
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-8 md:mt-0 flex items-center justify-center">
                      <div className="text-center">
                        <RiskScore
                          score={walletRiskScore}
                          level={walletRiskLevel}
                          size="lg"
                          showLabel={true}
                          showBadge={true}
                        />
                        <div className="mt-2 text-sm text-gray-500">Wallet Risk Score</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Risk distribution chart */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Risk Distribution</h2>
                </div>
                <div className="card-body">
                  {stats.totalTokens > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={riskDistributionData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {riskDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} tokens`, 'Count']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      No token data available
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Token list */}
            <div className="card">
              <div className="card-header">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Tokens in Your Wallet</h2>
                  
                  {/* Risk filter */}
                  <div className="flex space-x-2">
                    <button
                      className={`px-3 py-1 text-sm rounded-md ${
                        filterRisk === 'all' 
                          ? 'bg-primary-100 text-primary-700 border border-primary-300' 
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                      onClick={() => setFilterRisk('all')}
                    >
                      All
                    </button>
                    <button
                      className={`px-3 py-1 text-sm rounded-md ${
                        filterRisk === 'low' 
                          ? 'bg-green-100 text-green-700 border border-green-300' 
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                      onClick={() => setFilterRisk('low')}
                    >
                      Low Risk
                    </button>
                    <button
                      className={`px-3 py-1 text-sm rounded-md ${
                        filterRisk === 'medium' 
                          ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' 
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                      onClick={() => setFilterRisk('medium')}
                    >
                      Medium Risk
                    </button>
                    <button
                      className={`px-3 py-1 text-sm rounded-md ${
                        filterRisk === 'high' || filterRisk === 'critical'
                          ? 'bg-red-100 text-red-700 border border-red-300' 
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                      onClick={() => setFilterRisk('high')}
                    >
                      High Risk
                    </button>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <TokenList
                  tokens={filteredTokens}
                  isLoading={isLoadingTokens || isLoadingRiskAnalysis}
                  emptyMessage={
                    filterRisk !== 'all' 
                      ? `No ${filterRisk} risk tokens found` 
                      : 'No tokens found in your wallet'
                  }
                  showRiskScore={true}
                />
              </div>
            </div>
            
            {/* Security recommendations */}
            <div className="card mt-8">
              <div className="card-header">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Security Recommendations</h2>
              </div>
              <div className="card-body">
                <ul className="space-y-4">
                  {stats.highRiskCount > 0 && (
                    <li className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">High Risk Tokens Detected</h3>
                        <div className="mt-1 text-sm text-gray-700">
                          Your wallet contains {stats.highRiskCount} high risk tokens. Consider transferring these tokens to a separate wallet to isolate potential security threats.
                        </div>
                      </div>
                    </li>
                  )}
                  
                  <li className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Use a Hardware Wallet</h3>
                      <div className="mt-1 text-sm text-gray-700">
                        For improved security, consider using a hardware wallet like Ledger or Trezor to store your main assets.
                      </div>
                    </div>
                  </li>
                  
                  <li className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Regular Security Checks</h3>
                      <div className="mt-1 text-sm text-gray-700">
                        Perform regular security checks on your wallet. Check token approvals and revoke any unnecessary permissions.
                      </div>
                    </div>
                  </li>
                  
                  <li className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Enable Notifications</h3>
                      <div className="mt-1 text-sm text-gray-700">
                        Enable notifications to receive alerts about suspicious token transfers and changes in risk scores.
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
 
  );
}