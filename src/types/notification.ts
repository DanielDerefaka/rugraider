import { RiskLevel } from './token';

export type NotificationType = 'risk' | 'transaction' | 'token' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  data?: {
    tokenAddress?: string;
    tokenName?: string;
    tokenSymbol?: string;
    riskLevel?: RiskLevel;
    riskScore?: number;
    transactionId?: string;
    walletAddress?: string;
    amount?: string;
  };
}

export interface NotificationSettings {
  enabled: boolean;
  riskLevelThreshold: RiskLevel;
  transactionNotifications: boolean;
  newTokens: boolean;
  riskChanges: boolean;
  systemAnnouncements: boolean;
}