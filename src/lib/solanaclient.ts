/**
 * Solana Client
 * Utilities for interacting with the Solana blockchain
 */

// Import Solana web3.js library
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

// Cache the client to avoid creating multiple connections
let solanaClient = null;

/**
 * Get Solana client
 * @param {string} cluster - Solana cluster to connect to (default: 'mainnet-beta')
 * @returns {Object} Solana client
 */
export function getSolanaClient(cluster = 'mainnet-beta') {
  if (solanaClient) {
    return solanaClient;
  }
  
  // Create a new connection
  const connection = new Connection(
    clusterApiUrl(cluster),
    'confirmed'
  );
  
  // Create client object with utilities
  solanaClient = {
    connection,
    PublicKey,
    
    /**
     * Get account information
     * @param {string} address - Account address
     * @returns {Promise<Object>} Account information
     */
    async getAccountInfo(address) {
      try {
        const publicKey = new PublicKey(address);
        const accountInfo = await connection.getAccountInfo(publicKey);
        return accountInfo;
      } catch (error) {
        console.error('Error getting account info:', error);
        throw error;
      }
    },
    
    /**
     * Get account balance
     * @param {string} address - Account address
     * @returns {Promise<number>} Balance in SOL
     */
    async getBalance(address) {
      try {
        const publicKey = new PublicKey(address);
        const balance = await connection.getBalance(publicKey);
        return balance / 1_000_000_000; // Convert lamports to SOL
      } catch (error) {
        console.error('Error getting balance:', error);
        throw error;
      }
    },
    
    /**
     * Get transaction
     * @param {string} signature - Transaction signature
     * @returns {Promise<Object>} Transaction data
     */
    async getTransaction(signature) {
      try {
        const transaction = await connection.getTransaction(
          signature,
          { commitment: 'confirmed' }
        );
        return transaction;
      } catch (error) {
        console.error('Error getting transaction:', error);
        throw error;
      }
    },
    
    /**
     * Get recent transactions for an address
     * @param {string} address - Account address
     * @param {number} limit - Maximum number of transactions to return
     * @returns {Promise<Array>} Array of transactions
     */
    async getRecentTransactions(address, limit = 10) {
      try {
        const publicKey = new PublicKey(address);
        
        // Get signatures
        const signatures = await connection.getSignaturesForAddress(
          publicKey, 
          { limit }
        );
        
        // Get transactions
        const transactions = [];
        for (const sig of signatures) {
          const tx = await this.getTransaction(sig.signature);
          if (tx) {
            transactions.push({
              signature: sig.signature,
              blockTime: tx.blockTime,
              slot: tx.slot,
              transaction: tx
            });
          }
        }
        
        return transactions;
      } catch (error) {
        console.error('Error getting recent transactions:', error);
        throw error;
      }
    },
    
    /**
     * Get token accounts
     * @param {string} address - Account address
     * @returns {Promise<Array>} Array of token accounts
     */
    async getTokenAccounts(address) {
      try {
        const publicKey = new PublicKey(address);
        const tokenProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        
        const accounts = await connection.getParsedTokenAccountsByOwner(
          publicKey, 
          { programId: tokenProgramId }
        );
        
        return accounts.value;
      } catch (error) {
        console.error('Error getting token accounts:', error);
        throw error;
      }
    },
    
    /**
     * Parse a transaction to extract key information
     * @param {Object} transaction - Transaction data
     * @returns {Object} Parsed transaction
     */
    parseTransaction(transaction) {
      try {
        if (!transaction || !transaction.transaction) {
          return null;
        }
        
        const { transaction: tx, meta } = transaction;
        
        // Basic transaction info
        const parsedTx = {
          signature: transaction.signature,
          blockTime: transaction.blockTime ? new Date(transaction.blockTime * 1000) : null,
          slot: transaction.slot,
          success: meta ? !meta.err : null,
          fee: meta ? meta.fee / 1_000_000_000 : null, // Convert lamports to SOL
          instructions: []
        };
        
        // Parse instructions
        if (tx.message && tx.message.instructions) {
          tx.message.instructions.forEach((ix, index) => {
            const programId = tx.message.accountKeys[ix.programId].toBase58();
            const accounts = ix.accounts.map(acc => tx.message.accountKeys[acc].toBase58());
            
            // Parse data based on program
            let parsedInstruction = {
              programId,
              accounts,
              data: ix.data,
              parsed: null
            };
            
            // Add parsed instruction
            parsedTx.instructions.push(parsedInstruction);
          });
        }
        
        return parsedTx;
      } catch (error) {
        console.error('Error parsing transaction:', error);
        return null;
      }
    }
  };
  
  return solanaClient;
}