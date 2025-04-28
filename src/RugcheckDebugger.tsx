'use client';

import React, { useState } from 'react';
import { rugCheckAPI } from '@/lib/rugcheck';

export default function TokenApiDebugger() {
  const [debugResults, setDebugResults] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<'trending' | 'new' | 'verified'>('trending');
  const [expanded, setExpanded] = useState<boolean>(false);

  const runDebug = async () => {
    setLoading(true);
    try {

      const results = await debugTokenLists();
      setDebugResults(results);
    } catch (error) {
      console.error('Debug error:', error);
      setDebugResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  
  async function debugTokenLists() {
    const results: any = {};
    
  
    try {
      const trending = await rugCheckAPI.getTrendingTokens(3);
      results.trending = {
        status: trending?.status,
        data: trending?.data,
        sample: Array.isArray(trending?.data) && trending.data.length > 0 ? trending.data[0] : null,
      };
    } catch (e) {
      results.trending = { error: e instanceof Error ? e.message : 'Unknown error' };
    }
    
   
    try {
      const newTokens = await rugCheckAPI.getNewTokens(3);
      results.new = {
        status: newTokens?.status,
        data: newTokens?.data,
        sample: Array.isArray(newTokens?.data) && newTokens.data.length > 0 ? newTokens.data[0] : null,
      };
    } catch (e) {
      results.new = { error: e instanceof Error ? e.message : 'Unknown error' };
    }
    
 
    try {
      const verified = await rugCheckAPI.getVerifiedTokens(3);
      results.verified = {
        status: verified?.status,
        data: verified?.data,
        sample: Array.isArray(verified?.data) && verified.data.length > 0 ? verified.data[0] : null,
      };
    } catch (e) {
      results.verified = { error: e instanceof Error ? e.message : 'Unknown error' };
    }
    
    console.log("Debug results:", results);
    return results;
  }


  return (
    <div className="mt-8 border border-gray-200 rounded-lg dark:border-gray-700">
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-t-lg flex justify-between items-center">
        <h3 className="text-lg font-medium">API Debug Tool</h3>
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      {expanded && (
        <div className="p-4">
          <button
            onClick={runDebug}
            disabled={loading}
            className="btn btn-primary mb-4"
          >
            {loading ? 'Running...' : 'Run API Debug'}
          </button>
          
          {debugResults && (
            <div className="mt-4">
              <div className="flex border-b mb-4">
                <button
                  onClick={() => setSelectedTab('trending')}
                  className={`px-4 py-2 ${selectedTab === 'trending' ? 'border-b-2 border-primary-500 text-primary-500' : 'text-gray-500'}`}
                >
                  Trending
                </button>
                <button
                  onClick={() => setSelectedTab('new')}
                  className={`px-4 py-2 ${selectedTab === 'new' ? 'border-b-2 border-primary-500 text-primary-500' : 'text-gray-500'}`}
                >
                  New
                </button>
                <button
                  onClick={() => setSelectedTab('verified')}
                  className={`px-4 py-2 ${selectedTab === 'verified' ? 'border-b-2 border-primary-500 text-primary-500' : 'text-gray-500'}`}
                >
                  Verified
                </button>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Status: {debugResults[selectedTab]?.status || 'N/A'}</h4>
                
                {debugResults[selectedTab]?.error ? (
                  <div className="text-red-500">Error: {debugResults[selectedTab].error}</div>
                ) : debugResults[selectedTab]?.sample ? (
                  <div>
                    <h4 className="font-medium mb-2">Sample Token Data</h4>
                    <pre className="bg-gray-200 dark:bg-gray-700 p-3 rounded overflow-auto text-xs">
                      {JSON.stringify(debugResults[selectedTab].sample, null, 2)}
                    </pre>
                    
                    <h4 className="font-medium mt-4 mb-2">Available Fields</h4>
                    <ul className="list-disc pl-5">
                      {Object.keys(debugResults[selectedTab].sample).map((key) => (
                        <li key={key} className="mb-1">
                          <span className="font-mono text-sm">{key}</span>: 
                          <span className="text-gray-500 ml-2">{typeof debugResults[selectedTab].sample[key]}</span>
                          {typeof debugResults[selectedTab].sample[key] !== 'object' && 
                            <span className="ml-2 text-gray-600">
                              {String(debugResults[selectedTab].sample[key]).substring(0, 30)}
                              {String(debugResults[selectedTab].sample[key]).length > 30 ? '...' : ''}
                            </span>
                          }
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-gray-500">No sample data available</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}