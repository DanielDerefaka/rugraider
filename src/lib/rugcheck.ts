import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { jwtDecode } from 'jwt-decode';
import {
  RugCheckAuthResponse,
  RugCheckVerifyResponse,
  RugCheckTokenReportResponse,
  RugCheckTokenInsiderGraphResponse,
  RugCheckStatsNewTokensResponse,
  RugCheckStatsTrendingTokensResponse,
  RugCheckLeaderboardResponse
} from '@/types/rugcheck';

// Use environment variable or fallback to default URL
const BASE_URL = process.env.RUGCHECK_API_URL || 'https://api.rugcheck.xyz/v1';

// Maximum retry attempts for API calls
const MAX_RETRIES = 3;

// Define retry-able status codes
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

class RugCheckAPI {
  private jwt: string | null = null;
  private isClient = typeof window !== 'undefined';
  private logger = {
    info: (message: string, ...args: any[]) => {
      console.info(`[RugCheckAPI Info] ${message}`, ...args);
    },
    error: (message: string, error: any) => {
      console.error(`[RugCheckAPI Error] ${message}`, error?.message || error);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(`[RugCheckAPI Warning] ${message}`, ...args);
    },
    debug: (message: string, ...args: any[]) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[RugCheckAPI Debug] ${message}`, ...args);
      }
    }
  };

  constructor() {
    if (this.isClient) {
      try {
        this.jwt = localStorage.getItem('rugcheck_jwt');
        this.logger.debug('Initialized RugCheckAPI client');
        
        if (this.jwt) {
          try {
            const decoded: { exp: number } = jwtDecode(this.jwt);
            if (decoded.exp * 1000 <= Date.now()) {
              this.logger.warn('JWT token expired, clearing');
              this.clearToken();
            } else {
              this.logger.debug('Retrieved valid JWT from localStorage');
            }
          } catch (error) {
            this.logger.warn('Invalid JWT in localStorage, clearing', error);
            this.clearToken();
          }
        }
      } catch (e) {
        // Handle localStorage access errors (e.g., in private browsing mode)
        this.logger.warn('Could not access localStorage', e);
      }
    } else {
      this.logger.debug('Initialized RugCheckAPI server');
    }

    // Add request interceptor for automatic retry
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;
        
        // Only retry the request if we haven't already tried too many times
        // and if the status code is one we want to retry
        if (
          config && 
          (!config.retryAttempt || config.retryAttempt < MAX_RETRIES) &&
          error.response && 
          RETRY_STATUS_CODES.includes(error.response.status)
        ) {
          config.retryAttempt = config.retryAttempt ? config.retryAttempt + 1 : 1;
          
          const delay = Math.min(1000 * (2 ** config.retryAttempt), 10000);
          this.logger.warn(`Retrying request to ${config.url} (attempt ${config.retryAttempt}/${MAX_RETRIES}) after ${delay}ms`);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return axios(config);
        }
        
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.logger.debug('Setting JWT token');
    this.jwt = token;
    if (this.isClient) {
      try {
        localStorage.setItem('rugcheck_jwt', token);
      } catch (e) {
        this.logger.warn('Could not store JWT in localStorage', e);
      }
    }
  }

  clearToken() {
    this.logger.debug('Clearing JWT token');
    this.jwt = null;
    if (this.isClient) {
      try {
        localStorage.removeItem('rugcheck_jwt');
      } catch (e) {
        this.logger.warn('Could not remove JWT from localStorage', e);
      }
    }
  }

  isAuthenticated() {
    if (!this.jwt) return false;

    try {
      const decoded: { exp: number } = jwtDecode(this.jwt);
      const isValid = decoded.exp * 1000 > Date.now();
      
      if (!isValid) {
        this.logger.warn('Authentication check failed - token expired');
        this.clearToken();
      }
      
      return isValid;
    } catch (error) {
      this.logger.warn('Authentication check failed - invalid token', error);
      this.clearToken();
      return false;
    }
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.jwt) {
      headers['Authorization'] = `Bearer ${this.jwt}`;
    }

    return headers;
  }

  private handleError(error: unknown, methodName: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const errorMessage = axiosError.response?.data?.message || axiosError.message;
      const url = axiosError.config?.url || 'unknown URL';

      this.logger.error(`API Error in ${methodName} (${url}) [Status: ${status}]`, errorMessage);
      
      // Handle specific error codes
      if (status === 401) {
        this.clearToken();
        throw new Error(`Authentication error: ${errorMessage}`);
      } else if (status === 404) {
        throw new Error(`Resource not found: ${errorMessage}`);
      } else if (status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (status && status >= 500) {
        throw new Error(`Server error (${status}). Please try again later.`);
      } else {
        throw new Error(`API Error: ${errorMessage}`);
      }
    }

    this.logger.error(`Unexpected error in ${methodName}:`, error);
    throw error instanceof Error ? error : new Error('An unknown error occurred');
  }

  private async makeRequest<T>(
    method: 'get' | 'post',
    endpoint: string, 
    data?: any, 
    callerMethod: string,
    config: AxiosRequestConfig = {}
  ): Promise<T> {
    try {
      this.logger.debug(`Making ${method.toUpperCase()} request to: ${endpoint}`, data);
      
      // Add headers to config
      config.headers = {
        ...config.headers,
        ...this.getHeaders()
      };
      
      // Set timeout for all requests
      config.timeout = config.timeout || 15000;
      
      const response = method === 'get' 
        ? await axios.get(`${BASE_URL}${endpoint}`, config)
        : await axios.post(`${BASE_URL}${endpoint}`, data, config);
      
      this.logger.debug(`Response from ${endpoint}:`, { status: response.status });
      return response.data;
    } catch (error) {
      return this.handleError(error, callerMethod);
    }
  }

  async loginWithSolana(signature: string, message: string, publicKey: string): Promise<RugCheckAuthResponse> {
    try {
      this.logger.info('Attempting to login with Solana', { publicKey });
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        signature,
        message,
        publicKey
      }, { timeout: 20000 }); // Extended timeout for auth

      const authResponse = response.data;
      this.setToken(authResponse.token);
      this.logger.info('Login successful', { publicKey });
      return authResponse;
    } catch (error) {
      return this.handleError(error, 'loginWithSolana');
    }
  }

  async verifyToken(tokenAddress: string): Promise<RugCheckVerifyResponse> {
    return this.makeRequest<RugCheckVerifyResponse>(
      'post',
      '/tokens/verify',
      { tokenAddress },
      'verifyToken'
    );
  }

  async checkTokenEligibility(tokenAddress: string): Promise<RugCheckVerifyResponse> {
    return this.makeRequest<RugCheckVerifyResponse>(
      'post',
      '/tokens/verify/eligible',
      { tokenAddress },
      'checkTokenEligibility'
    );
  }

  async getTokenReport(tokenId: string): Promise<RugCheckTokenReportResponse> {
    this.logger.debug('Getting token report', { tokenId });
    try {
      // Try to get from cache first (if exists)
      if (this.isClient) {
        try {
          const cachedData = sessionStorage.getItem(`token_report:${tokenId}`);
          if (cachedData) {
            const { data, timestamp } = JSON.parse(cachedData);
            // Check if cache is still valid (less than 5 minutes old)
            if (Date.now() - timestamp < 5 * 60 * 1000) {
              this.logger.debug('Returning cached token report');
              return data;
            }
          }
        } catch (e) {
          this.logger.warn('Error accessing session storage cache', e);
        }
      }
      
      // Fetch from API
      const response = await axios.get(
        `${BASE_URL}/tokens/${tokenId}/report`,
        { 
          headers: this.getHeaders(),
          timeout: 15000
        }
      );
      
      // Store in cache
      if (this.isClient && response.data) {
        try {
          sessionStorage.setItem(`token_report:${tokenId}`, JSON.stringify({
            data: response.data,
            timestamp: Date.now()
          }));
        } catch (e) {
          this.logger.warn('Error caching token report', e);
        }
      }
      
      this.logger.debug('Token report retrieved successfully');
      return response.data;
    } catch (error) {
      return this.handleError(error, 'getTokenReport');
    }
  }

  async getTokenReportSummary(tokenId: string): Promise<RugCheckTokenReportResponse> {
    return this.makeRequest<RugCheckTokenReportResponse>(
      'get',
      `/tokens/${tokenId}/report/summary`,
      undefined,
      'getTokenReportSummary'
    );
  }

  async getTokenInsiderGraph(tokenId: string): Promise<RugCheckTokenInsiderGraphResponse> {
    return this.makeRequest<RugCheckTokenInsiderGraphResponse>(
      'get',
      `/tokens/${tokenId}/insiders/graph`,
      undefined,
      'getTokenInsiderGraph',
      { timeout: 20000 } // Graphs may take longer to generate
    );
  }

  async getNewTokens(limit: number = 10): Promise<RugCheckStatsNewTokensResponse> {
    // Add a cache buster parameter to avoid stale data
    const cacheBuster = `_cb=${Date.now()}`;
    return this.makeRequest<RugCheckStatsNewTokensResponse>(
      'get',
      `/stats/new_tokens?limit=${limit}&${cacheBuster}`,
      undefined,
      'getNewTokens'
    );
  }

  async getTrendingTokens(limit: number = 10): Promise<RugCheckStatsTrendingTokensResponse> {
    // Add a cache buster parameter to avoid stale data
    const cacheBuster = `_cb=${Date.now()}`;
    return this.makeRequest<RugCheckStatsTrendingTokensResponse>(
      'get',
      `/stats/trending?limit=${limit}&${cacheBuster}`,
      undefined,
      'getTrendingTokens'
    );
  }

  async getVerifiedTokens(limit: number = 10): Promise<RugCheckStatsNewTokensResponse> {
    // Add a cache buster parameter to avoid stale data
    const cacheBuster = `_cb=${Date.now()}`;
    return this.makeRequest<RugCheckStatsNewTokensResponse>(
      'get',
      `/stats/verified?limit=${limit}&${cacheBuster}`,
      undefined,
      'getVerifiedTokens'
    );
  }

  async getLeaderboard(limit: number = 10): Promise<RugCheckLeaderboardResponse> {
    return this.makeRequest<RugCheckLeaderboardResponse>(
      'get',
      `/leaderboard?limit=${limit}`,
      undefined,
      'getLeaderboard'
    );
  }

  async getDomains(limit: number = 10): Promise<any> {
    return this.makeRequest<any>(
      'get',
      `/domains?limit=${limit}`,
      undefined,
      'getDomains'
    );
  }

  async lookupDomain(id: string): Promise<any> {
    return this.makeRequest<any>(
      'get',
      `/domains/lookup/${id}`,
      undefined,
      'lookupDomain'
    );
  }

  // Helper method to clear all API caches
  clearCache() {
    if (this.isClient) {
      try {
        // Get all keys from sessionStorage
        const keys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith('token_report:')) {
            keys.push(key);
          }
        }
        
        // Remove all cached items
        keys.forEach(key => sessionStorage.removeItem(key));
        
        this.logger.info(`Cleared ${keys.length} items from API cache`);
      } catch (e) {
        this.logger.warn('Error clearing API cache', e);
      }
    }
  }
}

export const rugCheckAPI = new RugCheckAPI();