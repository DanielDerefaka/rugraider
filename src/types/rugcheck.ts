export interface RugCheckAuthResponse {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    publicKey: string;
  };
}

export interface RugCheckVerifyRequest {
  tokenAddress: string;
}

export interface RugCheckVerifyResponse {
  success: boolean;
  message: string;
  data?: {
    tokenAddress: string;
    eligible: boolean;
    status: 'pending' | 'verified' | 'rejected';
    transactionId?: string;
    reason?: string;
  };
}

export interface RugCheckTokenReportResponse {
  success: boolean;
  message: string;
  data?: {
    tokenId: string;
    tokenAddress: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply?: string;
    logoURI?: string;
    verified: boolean;
    verifiedAt?: string;
    createdAt: string;
    deployerAddress: string;
    holders?: number;
    riskScore: number;
    riskLevel: string;
    riskFactors: {
      id: string;
      category: string;
      description: string;
      severity: string;
      impact?: string;
      evidence?: string;
    }[];
    socialStats?: {
      twitter?: {
        followers: number;
        following: number;
        tweets: number;
        sentiment: number;
      };
      telegram?: {
        members: number;
        online: number;
        messages: number;
      };
      discord?: {
        members: number;
        online: number;
        channels: number;
      };
    };
    contractAnalysis?: {
      hasProxy: boolean;
      hasMintFunction: boolean;
      hasFeeOnTransfer: boolean;
      hasBlacklist: boolean;
      hasPauseFunction: boolean;
      hasTimeLock: boolean;
      issues: {
        severity: string;
        description: string;
        location?: string;
      }[];
    };
  };
}

export interface RugCheckTokenInsiderGraphResponse {
  success: boolean;
  message: string;
  data?: {
    tokenId: string;
    tokenAddress: string;
    nodes: {
      id: string;
      address: string;
      type: string;
      weight: number;
      value: number;
    }[];
    links: {
      source: string;
      target: string;
      value: number;
      type: string;
    }[];
  };
}

export interface RugCheckStatsNewTokensResponse {
  success: boolean;
  message: string;
  data?: {
    tokens: {
      id: string;
      address: string;
      name: string;
      symbol: string;
      logoURI?: string;
      verified: boolean;
      createdAt: string;
      riskScore: number;
      riskLevel: string;
    }[];
  };
}

export interface RugCheckStatsTrendingTokensResponse {
  success: boolean;
  message: string;
  data?: {
    tokens: {
      id: string;
      address: string;
      name: string;
      symbol: string;
      logoURI?: string;
      verified: boolean;
      votes: number;
      views: number;
      riskScore: number;
      riskLevel: string;
    }[];
  };
}

export interface RugCheckLeaderboardResponse {
  success: boolean;
  message: string;
  data?: {
    users: {
      id: string;
      publicKey: string;
      verified: number;
      points: number;
      rank: number;
    }[];
  };
}