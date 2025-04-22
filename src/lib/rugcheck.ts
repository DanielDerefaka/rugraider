import axios, { AxiosError } from 'axios';
import {
  RugCheckAuthResponse,
  RugCheckVerifyRequest,
  RugCheckVerifyResponse,
  RugCheckTokenReportResponse,
  RugCheckTokenInsiderGraphResponse,
  RugCheckStatsNewTokensResponse,
  RugCheckStatsTrendingTokensResponse,
  RugCheckLeaderboardResponse
} from '@/types/rugcheck';

const BASE_URL = process.env.NEXT_PUBLIC_RUGCHECK_API_URL || 'https://api.rugcheck.xyz/v1';

class RugCheckAPI {
  private jwt: string | null = null;
  
  // Check if we're running on the client
  private isClient = typeof window !== 'undefined';
  
  constructor() {
    // Load token from localStorage on client side
    if (this.isClient) {
      this.jwt = localStorage.getItem('rugcheck_jwt');
    }
  }
  
  // Set JWT token after authentication
  setToken(token: string) {
    this.jwt = token;
    
    // Store token in localStorage on client side
    if (this.isClient) {
      localStorage.setItem('rugcheck_jwt', token);
    }
  }
  
  // Clear token (logout)
  clearToken() {
    this.jwt = null;
    
    // Remove token from localStorage on client side
    if (this.isClient) {
      localStorage.removeItem('rugcheck_jwt');
    }
  }
  
  // Check if authenticated
  isAuthenticated() {
    return !!this.jwt;
  }
  
  // Get headers with authentication
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.jwt ? { 'Authorization': `Bearer ${this.jwt}` } : {})
    };
  }
  
  // Error handler
  private handleError(error: unknown) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // Handle authentication errors
      if (axiosError.response?.status === 401) {
        this.clearToken();
      }
      
      // Extract error message from response
      const errorMessage = axiosError.response?.data?.message || axiosError.message;
      console.error('RugCheck API Error:', errorMessage);
      
      throw new Error(`RugCheck API Error: ${errorMessage}`);
    }
    
    // For other errors
    console.error('Unexpected error:', error);
    throw error;
  }
  
  // Authentication with Solana wallet
  async loginWithSolana(signature: string, message: string, publicKey: string): Promise<RugCheckAuthResponse> {
    try {
      console.log("Attempting to authenticate with RugCheck...");
      
      // The request body matching RugCheck API format
      const requestBody = {
        message: {
          message: message,
          publicKey: publicKey,
          timestamp: Math.floor(Date.now() / 1000)
        },
        signature: {
          data: signature,
          type: "string"
        },
        wallet: publicKey
      };
      
      console.log("Auth request payload:", JSON.stringify(requestBody, null, 2));
      
      const response = await axios.post(
        `${BASE_URL}/auth/login/solana`,
        requestBody,
        { headers: this.getHeaders() }
      );
      
      console.log("Auth response:", response.data);
      
      if (response.data?.token) {
        this.setToken(response.data.token);
        console.log("Authentication successful, token stored");
      } else {
        console.warn("Auth response did not contain token:", response.data);
      }
      
      return response.data;
    } catch (error) {
      console.error("Authentication failed:", error);
      return this.handleError(error);
    }
  }
  
  // Token Verification
  async verifyToken(tokenAddress: string): Promise<RugCheckVerifyResponse> {
    try {
      const response = await axios.post(
        `${BASE_URL}/tokens/verify`,
        { tokenAddress },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  // Check token eligibility for verification
  async checkTokenEligibility(tokenAddress: string): Promise<RugCheckVerifyResponse> {
    try {
      const response = await axios.post(
        `${BASE_URL}/tokens/verify/eligible`,
        { tokenAddress },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  // Get Token Report
  async getTokenReport(tokenId: string): Promise<RugCheckTokenReportResponse> {
    try {
      const response = await axios.get(
        `${BASE_URL}/tokens/${tokenId}/report`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  // Get Token Report Summary
  async getTokenReportSummary(tokenId: string): Promise<RugCheckTokenReportResponse> {
    try {
      const response = await axios.get(
        `${BASE_URL}/tokens/${tokenId}/report/summary`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  // Get Token Insider Graph
  async getTokenInsiderGraph(tokenId: string): Promise<RugCheckTokenInsiderGraphResponse> {
    try {
      // Check authentication before making the request
      if (!this.isAuthenticated()) {
        throw new Error('Authentication required to access token insider graph');
      }
      
      const response = await axios.get(
        `${BASE_URL}/tokens/${tokenId}/insiders/graph`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  // Get New Tokens
  async getNewTokens(limit: number = 10): Promise<RugCheckStatsNewTokensResponse> {
    try {
      const response = await axios.get(
        `${BASE_URL}/stats/new_tokens?limit=${limit}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  // Get Trending Tokens
  async getTrendingTokens(limit: number = 10): Promise<RugCheckStatsTrendingTokensResponse> {
    try {
      const response = await axios.get(
        `${BASE_URL}/stats/trending?limit=${limit}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  // Get Recently Verified Tokens
  async getVerifiedTokens(limit: number = 10): Promise<RugCheckStatsNewTokensResponse> {
    try {
      const response = await axios.get(
        `${BASE_URL}/stats/verified?limit=${limit}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  // Get Leaderboard
  async getLeaderboard(limit: number = 10): Promise<RugCheckLeaderboardResponse> {
    try {
      const response = await axios.get(
        `${BASE_URL}/leaderboard?limit=${limit}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  // Get registered domains
  async getDomains(limit: number = 10): Promise<any> {
    try {
      const response = await axios.get(
        `${BASE_URL}/domains?limit=${limit}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  // Lookup domain address
  async lookupDomain(id: string): Promise<any> {
    try {
      const response = await axios.get(
        `${BASE_URL}/domains/lookup/${id}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Create singleton instance
export const rugCheckAPI = new RugCheckAPI();