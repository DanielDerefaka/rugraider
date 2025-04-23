// token-utils.ts
import {
  PublicKey,
  ParsedAccountData,
  ConfirmedSignatureInfo,
  ParsedTransactionWithMeta,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  Account,
  TokenAccountNotFoundError,
  getAccount,
  TokenInvalidAccountOwnerError,
  createTransferInstruction,
} from '@solana/spl-token';
import { WalletToken } from '@/types/token';
import { connectionManager } from './solana-connection';

// Cache results to reduce RPC calls
const tokenMetadataCache: Record<string, {
  data: any; 
  timestamp: number;
}> = {};
const tokenAccountsCache: Record<string, {
  data: { pubkey: PublicKey; account: ParsedAccountData }[];
  timestamp: number;
}> = {};
const riskAssessmentCache: Record<string, {
  data: any;
  timestamp: number;
}> = {};

// Cache expiration times (in milliseconds)
const CACHE_TIMES = {
  TOKEN_METADATA: 30 * 60 * 1000, // 30 minutes
  TOKEN_ACCOUNTS: 30 * 1000,      // 30 seconds
  RISK_ASSESSMENT: 60 * 60 * 1000, // 1 hour
};

// Get token accounts for a wallet with fallback RPC support and caching
export async function getTokenAccounts(
  walletAddress: string
): Promise<{ pubkey: PublicKey; account: ParsedAccountData }[]> {
  try {
    // Check cache first
    const cacheKey = `accounts:${walletAddress}`;
    const cachedData = tokenAccountsCache[cacheKey];
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TIMES.TOKEN_ACCOUNTS)) {
      return cachedData.data;
    }
    
    const walletPublicKey = new PublicKey(walletAddress);
    
    // Use the connection manager with improved fallback capability
    const accounts = await connectionManager.executeWithFallback(async (connection) => {
      const tokenResp = await connection.getParsedTokenAccountsByOwner(
        walletPublicKey,
        {
          programId: TOKEN_PROGRAM_ID,
        }
      );
      
      return tokenResp.value;
    });
    
    // Update cache
    tokenAccountsCache[cacheKey] = {
      data: accounts,
      timestamp: Date.now()
    };
    
    return accounts;
  } catch (error) {
    console.error('Error fetching token accounts:', error);
    
    // Return cached data even if expired in case of error
    const cacheKey = `accounts:${walletAddress}`;
    const cachedData = tokenAccountsCache[cacheKey];
    
    if (cachedData) {
      console.log('Returning cached token accounts data due to RPC error');
      return cachedData.data;
    }
    
    throw error;
  }
}

// Format token account data with risk assessment and caching
export async function getWalletTokens(walletAddress: string): Promise<WalletToken[]> {
  try {
    const accounts = await getTokenAccounts(walletAddress);
    
    // Filter to only include accounts with non-zero balance
    const filteredAccounts = accounts.filter(
      (acc) => parseInt(acc.account.data.parsed.info.tokenAmount.amount) > 0
    );

    // Map account data to WalletToken format
    const tokens = filteredAccounts.map((acc) => {
      const parsedInfo = acc.account.data.parsed.info;
      
      return {
        mint: parsedInfo.mint,
        owner: walletAddress,
        amount: parsedInfo.tokenAmount.amount,
        decimals: parsedInfo.tokenAmount.decimals,
        uiAmount: parsedInfo.tokenAmount.uiAmount,
      };
    });

    // Get metadata and risk assessment for each token (with batch processing)
    // Process tokens in batches to avoid overwhelming RPC nodes
    const BATCH_SIZE = 5;
    const tokensWithMetadata: WalletToken[] = [];
    
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(async (token) => {
          // Fetch metadata and risk assessment in parallel, with caching
          const [metadata, riskAssessment] = await Promise.all([
            getTokenMetadata(token.mint),
            analyzeTokenRisks(token.mint),
          ]);

          // Determine risk level
          let riskLevel: 'low' | 'medium' | 'high' | 'critical' | undefined = undefined;
          
          if (riskAssessment) {
            const { hasHighSupply, hasLowLiquidity, hasLargeHolders, isNewToken, hasSuspiciousTransactions } = riskAssessment;
            
            // Calculate risk score (simple heuristic)
            let riskFactors = 0;
            if (hasHighSupply) riskFactors++;
            if (hasLowLiquidity) riskFactors += 2;
            if (hasLargeHolders) riskFactors += 2;
            if (isNewToken) riskFactors++;
            if (hasSuspiciousTransactions) riskFactors += 3;
            
            // Assign risk level
            if (riskFactors >= 5) riskLevel = 'critical';
            else if (riskFactors >= 3) riskLevel = 'high';
            else if (riskFactors >= 1) riskLevel = 'medium';
            else riskLevel = 'low';
          }

          return {
            ...token,
            name: metadata?.name || 'Unknown Token',
            symbol: metadata?.symbol || '',
            logoURI: metadata?.logoURI,
            riskLevel,
            riskFactors: riskAssessment || {},
          };
        })
      );
      
      tokensWithMetadata.push(...batchResults);
      
      // If there are more batches to process, add a small delay to avoid rate limiting
      if (i + BATCH_SIZE < tokens.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return tokensWithMetadata;
  } catch (error) {
    console.error('Error formatting wallet tokens:', error);
    throw error;
  }
}

// Get recent transactions for a wallet with fallback and exponential backoff
export async function getRecentTransactions(
  walletAddress: string,
  limit: number = 10
): Promise<ConfirmedSignatureInfo[]> {
  try {
    const walletPublicKey = new PublicKey(walletAddress);
    
    return await connectionManager.executeWithFallback(
      async (connection) => {
        return await connection.getSignaturesForAddress(
          walletPublicKey,
          { limit }
        );
      },
      'confirmed',
      5, // More retries for transaction history
      300 // Lower initial delay for faster first retry
    );
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    throw error;
  }
}

// Get parsed transaction details with fallback
export async function getTransactionDetails(
  signature: string
): Promise<ParsedTransactionWithMeta | null> {
  try {
    return await connectionManager.executeWithFallback(
      async (connection) => {
        return await connection.getParsedTransaction(
          signature,
          'confirmed'
        );
      }
    );
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    throw error;
  }
}

// Check if token account exists with caching
export async function checkTokenAccount(
  walletAddress: string,
  mintAddress: string
): Promise<Account | null> {
  try {
    const walletPublicKey = new PublicKey(walletAddress);
    const mintPublicKey = new PublicKey(mintAddress);
    
    // Get associated token account
    const tokenAddress = await getAssociatedTokenAddress(
      mintPublicKey,
      walletPublicKey
    );
    
    try {
      // Check if account exists and get balance
      return await connectionManager.executeWithFallback(async (connection) => {
        return await getAccount(connection, tokenAddress);
      });
    } catch (error) {
      if (
        error instanceof TokenAccountNotFoundError ||
        error instanceof TokenInvalidAccountOwnerError
      ) {
        // Account doesn't exist
        return null;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error checking token account:', error);
    throw error;
  }
}

// Get token metadata with caching
export async function getTokenMetadata(mintAddress: string): Promise<{
  name?: string;
  symbol?: string;
  logoURI?: string;
} | null> {
  try {
    // Check cache first
    const cacheKey = `metadata:${mintAddress}`;
    const cachedData = tokenMetadataCache[cacheKey];
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TIMES.TOKEN_METADATA)) {
      return cachedData.data;
    }
    
    // Implement a circuit breaker pattern for the token API calls
    const fetchWithTimeout = async (url: string, timeout = 5000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };
    
    // First try to get from Jupiter Aggregator token list (more comprehensive)
    try {
      const jupiterResponse = await fetchWithTimeout('https://token.jup.ag/all');
      if (jupiterResponse.ok) {
        const jupiterTokens = await jupiterResponse.json();
        const token = jupiterTokens.find((t: any) => t.address === mintAddress);
        
        if (token) {
          const metadata = {
            name: token.name,
            symbol: token.symbol,
            logoURI: token.logoURI
          };
          
          // Update cache
          tokenMetadataCache[cacheKey] = {
            data: metadata,
            timestamp: Date.now()
          };
          
          return metadata;
        }
      }
    } catch (error) {
      console.warn('Jupiter token list fetch failed, falling back to Solana list:', error);
    }
    
    // Fallback to Solana token list
    try {
      const response = await fetchWithTimeout('https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json');
      if (response.ok) {
        const tokenList = await response.json();
        const token = tokenList.tokens.find((t: any) => t.address === mintAddress);
        
        if (token) {
          const metadata = {
            name: token.name,
            symbol: token.symbol,
            logoURI: token.logoURI
          };
          
          // Update cache
          tokenMetadataCache[cacheKey] = {
            data: metadata,
            timestamp: Date.now()
          };
          
          return metadata;
        }
      }
    } catch (error) {
      console.warn('Solana token list fetch failed:', error);
    }
    
    // If not found in token lists, token might be unlisted
    const unknownToken = {
      name: 'Unknown Token',
      symbol: '???',
      logoURI: undefined
    };
    
    // Cache the unknown result too
    tokenMetadataCache[cacheKey] = {
      data: unknownToken,
      timestamp: Date.now()
    };
    
    return unknownToken;
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    
    // Return cached data even if expired in case of error
    const cacheKey = `metadata:${mintAddress}`;
    const cachedData = tokenMetadataCache[cacheKey];
    
    if (cachedData) {
      return cachedData.data;
    }
    
    return null;
  }
}

// Check for potential token risks with caching
export async function analyzeTokenRisks(mintAddress: string): Promise<{
  hasHighSupply: boolean;
  hasLowLiquidity: boolean;
  hasLargeHolders: boolean;
  isNewToken: boolean;
  hasSuspiciousTransactions: boolean;
} | null> {
  try {
    // Check cache first
    const cacheKey = `risk:${mintAddress}`;
    const cachedData = riskAssessmentCache[cacheKey];
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TIMES.RISK_ASSESSMENT)) {
      return cachedData.data;
    }
    
    const mintPublicKey = new PublicKey(mintAddress);
    
    const riskData = await connectionManager.executeWithFallback(async (connection) => {
      try {
        // Get token supply with retries and backoff
        const supplyPromise = connection.getTokenSupply(mintPublicKey)
          .catch(error => {
            console.warn('Error getting token supply, skipping this metric:', error);
            return { value: { amount: '0' } };
          });
        
        // Get larger token holders with retries and backoff
        const holdersPromise = connection.getTokenLargestAccounts(mintPublicKey)
          .catch(error => {
            console.warn('Error getting token holders, skipping this metric:', error);
            return { value: [] };
          });
        
        // Get token creation info with retries and backoff
        const signaturesPromise = connection.getSignaturesForAddress(mintPublicKey, { limit: 1 })
          .catch(error => {
            console.warn('Error getting token signatures, skipping this metric:', error);
            return [];
          });
        
        // Execute all queries in parallel
        const [supply, largestAccounts, signatures] = await Promise.all([
          supplyPromise,
          holdersPromise,
          signaturesPromise
        ]);
        
        // Token creation date check
        const isNewToken = signatures.length > 0 && 
          (new Date().getTime() - new Date(signatures[0].blockTime! * 1000).getTime()) < 7 * 24 * 60 * 60 * 1000; // 7 days
        
        // Analyze token distribution
        const totalAccounts = largestAccounts.value.length;
        const largestHolderPercentage = largestAccounts.value[0] ? 
          parseInt(largestAccounts.value[0].amount) / parseInt(supply.value.amount) : 0;
        
        const riskAssessment = {
          hasHighSupply: parseInt(supply.value.amount) > 1_000_000_000_000_000, // Very high supply
          hasLowLiquidity: totalAccounts < 10, // Low number of holders
          hasLargeHolders: largestHolderPercentage > 0.8, // Single holder owns >80%
          isNewToken: isNewToken,
          hasSuspiciousTransactions: false, // Would require deeper transaction analysis
        };
        
        // Update cache
        riskAssessmentCache[cacheKey] = {
          data: riskAssessment,
          timestamp: Date.now()
        };
        
        return riskAssessment;
      } catch (error) {
        console.warn('Error in token risk analysis, continuing with partial data:', error);
        // Return default values in case of error with this specific analysis
        const defaultRisk = {
          hasHighSupply: false,
          hasLowLiquidity: false,
          hasLargeHolders: false,
          isNewToken: false,
          hasSuspiciousTransactions: false,
        };
        
        // Update cache even for default values
        riskAssessmentCache[cacheKey] = {
          data: defaultRisk,
          timestamp: Date.now()
        };
        
        return defaultRisk;
      }
    });
    
    return riskData;
  } catch (error) {
    console.error('Error analyzing token risks:', error);
    
    // Return cached data even if expired in case of error
    const cacheKey = `risk:${mintAddress}`;
    const cachedData = riskAssessmentCache[cacheKey];
    
    if (cachedData) {
      return cachedData.data;
    }
    
    return null;
  }
}

// Create an associated token account if it doesn't exist
export async function createTokenAccountIfNeeded(
  wallet: any,
  mintAddress: string
): Promise<string> {
  try {
    const walletPublicKey = wallet.publicKey;
    const mintPublicKey = new PublicKey(mintAddress);
    
    // Get associated token account address
    const tokenAddress = await getAssociatedTokenAddress(
      mintPublicKey,
      walletPublicKey
    );
    
    // Check if account exists
    try {
      await connectionManager.executeWithFallback(async (connection) => {
        return await getAccount(connection, tokenAddress);
      });
      return tokenAddress.toString();
    } catch (error) {
      if (
        error instanceof TokenAccountNotFoundError ||
        error instanceof TokenInvalidAccountOwnerError
      ) {
        // Account doesn't exist, create it
        return await connectionManager.executeWithFallback(async (connection) => {
          const transaction = new Transaction().add(
            createAssociatedTokenAccountInstruction(
              walletPublicKey,
              tokenAddress,
              walletPublicKey,
              mintPublicKey
            )
          );
          
          const signature = await wallet.sendTransaction(transaction, connection);
          await connection.confirmTransaction(signature, 'confirmed');
          
          return tokenAddress.toString();
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating token account:', error);
    throw error;
  }
}

// Clear all caches (useful for testing or when changing networks)
export function clearTokenCaches(): void {
  Object.keys(tokenMetadataCache).forEach(key => {
    delete tokenMetadataCache[key];
  });
  
  Object.keys(tokenAccountsCache).forEach(key => {
    delete tokenAccountsCache[key];
  });
  
  Object.keys(riskAssessmentCache).forEach(key => {
    delete riskAssessmentCache[key];
  });
}