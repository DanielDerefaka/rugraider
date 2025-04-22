import { PublicKey } from '@solana/web3.js';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  logoURI?: string;
  decimals: number;
  totalSupply?: string;
  marketCap?: number;
  price?: number;
  volume24h?: number;
}

export interface TokenRiskFactor {
  category: string;
  description: string;
  severity: RiskLevel;
  evidence?: string;
  impact?: string;
}

export interface TokenRiskScore {
  score: number; // 0-100
  level: RiskLevel;
  factors: TokenRiskFactor[];
  summary: string;
  recommendations: string[];
}

export interface TokenReport {
  metadata: TokenMetadata;
  riskScore: TokenRiskScore;
  rugCheckVerified: boolean;
  creationDate?: string;
  deployerAddress?: string;
  transactionVolume?: number;
  holders?: number;
  insiderTransactions?: {
    address: string;
    amount: string;
    timestamp: number;
    type: 'buy' | 'sell' | 'transfer';
  }[];
  socialSentiment?: {
    score: number; // -1 to 1
    source: string;
    mentions: number;
  }[];
  history?: {
    timestamp: number;
    price?: number;
    volume?: number;
    riskScore?: number;
  }[];
}

export interface WalletToken {
  mint: string;
  owner: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  symbol?: string;
  name?: string;
  logoURI?: string;
  riskScore?: number;
  riskLevel?: RiskLevel;
}

export interface TokenInsiderNode {
  id: string;
  address: string;
  type: 'deployer' | 'holder' | 'exchange' | 'token' | 'unknown';
  weight: number;
  value: number;
}

export interface TokenInsiderLink {
  source: string;
  target: string;
  value: number;
  type: 'transfer' | 'swap' | 'mint' | 'burn';
}

export interface TokenInsiderGraph {
  nodes: TokenInsiderNode[];
  links: TokenInsiderLink[];
}