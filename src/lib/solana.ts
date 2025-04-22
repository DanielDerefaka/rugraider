import {
    PublicKey,
    ParsedAccountData,
    ConfirmedSignatureInfo,
    ParsedTransactionWithMeta,
    Transaction,
    SystemProgram,
    Keypair,
    sendAndConfirmTransaction,
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
  import { connectionManager, getConnection } from './solana-connection';
  
  // Get token accounts for a wallet with fallback RPC support
  export async function getTokenAccounts(
    walletAddress: string
  ): Promise<{ pubkey: PublicKey; account: ParsedAccountData }[]> {
    try {
      const walletPublicKey = new PublicKey(walletAddress);
      
      // Use the connection manager with fallback capability
      return await connectionManager.executeWithFallback(async (connection) => {
        const tokenResp = await connection.getParsedTokenAccountsByOwner(
          walletPublicKey,
          {
            programId: TOKEN_PROGRAM_ID,
          }
        );
        
        return tokenResp.value;
      });
    } catch (error) {
      console.error('Error fetching token accounts:', error);
      throw error;
    }
  }
  
  // Format token account data with risk assessment
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
  
      // Get metadata and risk assessment for each token
      const tokensWithMetadata = await Promise.all(
        tokens.map(async (token) => {
          // Fetch metadata in parallel
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
  
      return tokensWithMetadata;
    } catch (error) {
      console.error('Error formatting wallet tokens:', error);
      throw error;
    }
  }
  
  // Get recent transactions for a wallet
  export async function getRecentTransactions(
    walletAddress: string,
    limit: number = 10
  ): Promise<ConfirmedSignatureInfo[]> {
    try {
      const walletPublicKey = new PublicKey(walletAddress);
      
      return await connectionManager.executeWithFallback(async (connection) => {
        return await connection.getSignaturesForAddress(
          walletPublicKey,
          { limit }
        );
      });
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      throw error;
    }
  }
  
  // Get parsed transaction details
  export async function getTransactionDetails(
    signature: string
  ): Promise<ParsedTransactionWithMeta | null> {
    try {
      return await connectionManager.executeWithFallback(async (connection) => {
        return await connection.getParsedTransaction(
          signature,
          'confirmed'
        );
      });
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      throw error;
    }
  }
  
  // Check if token account exists
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
  
  // Get token metadata (name, symbol)
  export async function getTokenMetadata(mintAddress: string): Promise<{
    name?: string;
    symbol?: string;
    logoURI?: string;
  } | null> {
    try {
      // First try to get from Jupiter Aggregator token list (more comprehensive)
      const jupiterResponse = await fetch('https://token.jup.ag/all');
      if (jupiterResponse.ok) {
        const jupiterTokens = await jupiterResponse.json();
        const token = jupiterTokens.find((t: any) => t.address === mintAddress);
        
        if (token) {
          return {
            name: token.name,
            symbol: token.symbol,
            logoURI: token.logoURI
          };
        }
      }
      
      // Fallback to Solana token list
      const response = await fetch('https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json');
      if (response.ok) {
        const tokenList = await response.json();
        const token = tokenList.tokens.find((t: any) => t.address === mintAddress);
        
        if (token) {
          return {
            name: token.name,
            symbol: token.symbol,
            logoURI: token.logoURI
          };
        }
      }
      
      // If not found in token lists, token might be unlisted
      return {
        name: 'Unknown Token',
        symbol: '???',
        logoURI: undefined
      };
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      return null;
    }
  }
  
  // Check for potential token risks based on contract and transactions
  export async function analyzeTokenRisks(mintAddress: string): Promise<{
    hasHighSupply: boolean;
    hasLowLiquidity: boolean;
    hasLargeHolders: boolean;
    isNewToken: boolean;
    hasSuspiciousTransactions: boolean;
  } | null> {
    try {
      const mintPublicKey = new PublicKey(mintAddress);
      
      return await connectionManager.executeWithFallback(async (connection) => {
        try {
          // Get token supply
          const supply = await connection.getTokenSupply(mintPublicKey);
          
          // Get larger token holders
          const largestAccounts = await connection.getTokenLargestAccounts(mintPublicKey);
          
          // Get token creation info (via first transaction)
          const signatures = await connection.getSignaturesForAddress(mintPublicKey, { limit: 1 });
          const isNewToken = signatures.length > 0 && 
            (new Date().getTime() - new Date(signatures[0].blockTime! * 1000).getTime()) < 7 * 24 * 60 * 60 * 1000; // 7 days
          
          // Analyze token distribution
          const totalAccounts = largestAccounts.value.length;
          const largestHolderPercentage = largestAccounts.value[0] ? 
            parseInt(largestAccounts.value[0].amount) / parseInt(supply.value.amount) : 0;
          
          return {
            hasHighSupply: parseInt(supply.value.amount) > 1_000_000_000_000_000, // Very high supply
            hasLowLiquidity: totalAccounts < 10, // Low number of holders
            hasLargeHolders: largestHolderPercentage > 0.8, // Single holder owns >80%
            isNewToken: isNewToken,
            hasSuspiciousTransactions: false, // Would require deeper transaction analysis
          };
        } catch (error) {
          console.warn('Error in token risk analysis, continuing with partial data:', error);
          // Return default values in case of error with this specific analysis
          return {
            hasHighSupply: false,
            hasLowLiquidity: false,
            hasLargeHolders: false,
            isNewToken: false,
            hasSuspiciousTransactions: false,
          };
        }
      });
    } catch (error) {
      console.error('Error analyzing token risks:', error);
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