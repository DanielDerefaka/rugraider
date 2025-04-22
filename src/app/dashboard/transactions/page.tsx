'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getRecentTransactions, getTransactionDetails } from '@/lib/solana';
import { formatAddress, formatRelativeTime } from '@/lib/utils';
import { useNotifications } from '@/contexts/NotificationContext';
import Link from 'next/link';

export default function TransactionsPage() {
  const { publicKey } = useWallet();
  const { addNotification } = useNotifications();
  const walletAddress = publicKey?.toBase58();
  
  // Fetch recent transactions
  const { data: transactions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['transactions', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const txs = await getRecentTransactions(walletAddress, 20);
      return txs;
    },
    enabled: !!walletAddress,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Selected transaction for details
  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  
  // Fetch transaction details
  const { data: txDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['transaction', selectedTx],
    queryFn: async () => {
      if (!selectedTx) return null;
      return getTransactionDetails(selectedTx);
    },
    enabled: !!selectedTx,
  });
  
  // Check for suspicious transactions
  useEffect(() => {
    if (transactions.length > 0) {
      // This is a simple example - in a real app, you would have more sophisticated detection
      // of suspicious transactions
      const recentTransaction = transactions[0];
      
      if (recentTransaction && Date.now() / 1000 - (recentTransaction.blockTime || 0) < 60) {
        addNotification({
          type: 'transaction',
          title: 'New Transaction Detected',
          message: `Transaction ${recentTransaction.signature.substring(0, 8)}... was confirmed recently`,
          priority: 'medium',
          data: {
            transactionId: recentTransaction.signature,
          },
        });
      }
    }
  }, [transactions, addNotification]);
  
  return (

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transaction Monitor</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor and analyze your Solana transactions
          </p>
        </div>
        
        {!walletAddress ? (
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
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Connect Your Wallet</h3>
              <p className="mt-2 text-gray-500">
                Connect your Solana wallet to view your transaction history
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Transactions list */}
            <div className="lg:col-span-1">
              <div className="card">
                <div className="card-header flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Transactions</h2>
                  
                  <button
                    className="btn btn-outline py-1 px-2 text-xs"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    Refresh
                  </button>
                </div>
                <div className="card-body p-0">
                  {isLoading ? (
                    <div className="animate-pulse p-4 space-y-3">
                      {Array(8).fill(0).map((_, i) => (
                        <div key={i} className="h-16 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  ) : error ? (
                    <div className="text-center py-8 text-red-500">
                      Error loading transactions
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No transactions found
                    </div>
                  ) : (
                    <div className="divide-y">
                      {transactions.map((tx) => (
                        <div 
                          key={tx.signature}
                          className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                            selectedTx === tx.signature ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                          }`}
                          onClick={() => setSelectedTx(tx.signature)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {tx.signature.substring(0, 8)}...{tx.signature.substring(tx.signature.length - 8)}
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                {tx.blockTime ? formatRelativeTime(tx.blockTime) : 'Pending'}
                              </div>
                            </div>
                            <div className={`px-2 py-1 text-xs rounded-full ${
                              tx.err ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {tx.err ? 'Failed' : 'Success'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Transaction details */}
            <div className="lg:col-span-2">
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Transaction Details</h2>
                </div>
                <div className="card-body">
                  {!selectedTx ? (
                    <div className="text-center py-8 text-gray-500">
                      Select a transaction to view details
                    </div>
                  ) : isLoadingDetails ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-40 bg-gray-200 rounded"></div>
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  ) : !txDetails ? (
                    <div className="text-center py-8 text-red-500">
                      Error loading transaction details
                    </div>
                  ) : (
                    <div>
                      <div className="mb-6">
                        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Transaction ID</h3>
                        <div className="flex items-center">
                          <span className="font-mono text-sm break-all">{selectedTx}</span>
                          <button 
                            className="ml-2 text-primary-600 hover:text-primary-700"
                            onClick={() => navigator.clipboard.writeText(selectedTx)}
                            title="Copy transaction ID"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Status</h3>
                          <p className={`mt-1 font-medium ${
                            txDetails.meta?.err ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {txDetails.meta?.err ? 'Failed' : 'Success'}
                          </p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Timestamp</h3>
                          <p className="mt-1 font-medium">
                            {txDetails.blockTime ? new Date(txDetails.blockTime * 1000).toLocaleString() : 'Pending'}
                          </p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Block</h3>
                          <p className="mt-1 font-medium">{txDetails.slot?.toLocaleString() || 'Unknown'}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Fee</h3>
                          <p className="mt-1 font-medium">
                            {txDetails.meta?.fee ? (txDetails.meta.fee / 1e9).toFixed(6) + ' SOL' : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Instructions */}
                      <div className="mb-6">
                        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Instructions</h3>
                        <div className="space-y-3">
                          {txDetails.transaction?.message?.instructions?.map((instruction, index) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start">
                                <div className="text-sm font-medium">Instruction {index + 1}</div>
                                <div className="text-xs text-gray-500">
                                  Program: {formatAddress(instruction.programId.toString())}
                                </div>
                              </div>
                              {instruction.accounts && instruction.accounts.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-xs text-gray-500">Accounts:</div>
                                  <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {instruction.accounts.map((account, i) => (
                                      <div key={i} className="text-xs font-mono truncate">
                                        {formatAddress(account.toString(), 8)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* View on Explorer */}
                      <div className="mt-4 flex space-x-3">
                        <a 
                          href={`https://solscan.io/tx/${selectedTx}`} 
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
                          href={`https://explorer.solana.com/tx/${selectedTx}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-outline text-sm py-2 px-4"
                        >
                          View on Solana Explorer
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Transaction monitoring info */}
              <div className="card mt-6">
                <div className="card-header">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Transaction Monitoring</h2>
                </div>
                <div className="card-body">
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    Our platform automatically monitors your transactions for suspicious activity. We analyze:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Unusual token transfers</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Interactions with high-risk contracts</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Unauthorized approvals</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Transactions with high-risk tokens</span>
                    </li>
                  </ul>
                  <div className="mt-4">
                    <Link href="/dashboard/notifications" className="text-primary-600 hover:text-primary-700 text-sm">
                      Configure transaction notifications →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

  );
}