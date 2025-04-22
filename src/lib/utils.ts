


import { RiskLevel } from '@/types/token';
import { formatDistanceToNow } from 'date-fns';
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"



export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


// Format Solana address for display
export function formatAddress(address: string, length: number = 4): string {
  if (!address || address.length < 10) return address || '';
  return `${address.substring(0, length)}...${address.substring(address.length - length)}`;
}

// Format token amount based on decimals
export function formatTokenAmount(amount: string, decimals: number): string {
  const actualAmount = parseInt(amount) / Math.pow(10, decimals);
  
  if (actualAmount === 0) return '0';
  
  if (actualAmount < 0.001) {
    return '<0.001';
  }
  
  if (actualAmount < 1) {
    return actualAmount.toFixed(4);
  }
  
  if (actualAmount < 10000) {
    return actualAmount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  
  // For large numbers, use K, M, B, T notation
  const tiers = [
    { value: 1, symbol: '' },
    { value: 1e3, symbol: 'K' },
    { value: 1e6, symbol: 'M' },
    { value: 1e9, symbol: 'B' },
    { value: 1e12, symbol: 'T' }
  ];
  
  const tier = tiers
    .slice()
    .reverse()
    .find(tier => actualAmount >= tier.value);
  
  if (tier) {
    const scaled = actualAmount / tier.value;
    return scaled.toFixed(2) + tier.symbol;
  }
  
  return actualAmount.toFixed(2);
}

// Format date for display
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString();
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return formatDistanceToNow(date, { addSuffix: true });
}

// Get color based on risk level
export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return 'text-risk-low';
    case 'medium':
      return 'text-risk-medium';
    case 'high':
      return 'text-risk-high';
    case 'critical':
      return 'text-risk-critical';
    default:
      return 'text-gray-500';
  }
}

// Get background color based on risk level
export function getRiskBgColor(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return 'bg-green-100 text-green-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'critical':
      return 'bg-red-700 text-white';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Format risk score as percentage
export function formatRiskScore(score: number): string {
  return `${Math.round(score)}%`;
}

// Determine risk level from score
export function getRiskLevelFromScore(score: number): RiskLevel {
  if (score < 25) return 'low';
  if (score < 50) return 'medium';
  if (score < 75) return 'high';
  return 'critical';
}

// Format SOL amount
export function formatSOL(lamports: number): string {
  const sol = lamports / 10 ** 9;
  if (sol < 0.001) return '<0.001 SOL';
  return `${sol.toLocaleString(undefined, { maximumFractionDigits: 3 })} SOL`;
}

// Debounce function
export function debounce<F extends (...args: any[]) => any>(func: F, wait: number): (...args: Parameters<F>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<F>) {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Calculate value in USD
export function calculateUSDValue(amount: string, decimals: number, price?: number): string {
  if (!price) return 'N/A';
  
  const actualAmount = parseInt(amount) / Math.pow(10, decimals);
  const value = actualAmount * price;
  
  return formatUSD(value);
}

// Format USD amount
export function formatUSD(amount: number): string {
  if (amount === 0) return '$0.00';
  
  if (amount < 0.01) {
    return '<$0.01';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength) + '...';
}

// Parse error messages
export function parseErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return 'An unknown error occurred';
}