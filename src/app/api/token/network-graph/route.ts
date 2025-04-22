// app/api/token/network-graph/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rugCheckAPI } from '@/lib/rugcheck';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const tokenAddress = searchParams.get('address');
    
    if (!tokenAddress) {
      return NextResponse.json(
        { error: 'Token address is required' },
        { status: 400 }
      );
    }
    
    // First try to get from RugCheck API
    try {
      const insiderGraph = await rugCheckAPI.getTokenInsiderGraph(tokenAddress);
      
      if (insiderGraph?.success && insiderGraph?.data) {
        return NextResponse.json({
          nodes: insiderGraph.data.nodes || [],
          links: insiderGraph.data.links || []
        });
      }
    } catch (error) {
      console.error('Error fetching from RugCheck:', error);
      // Continue to fallback method
    }
    
    // If RugCheck fails, generate a simpler graph based on on-chain data
    // This would be a simpler implementation but still useful
    // For a real app, you would query the blockchain for token transfers
    
    return NextResponse.json({
      nodes: [
        { id: tokenAddress, address: tokenAddress, type: 'token', weight: 10, value: 100 },
        // In a real implementation, you would add actual holders and other nodes
      ],
      links: [
        // In a real implementation, you would add actual connections between nodes
      ]
    });
  } catch (error) {
    console.error('Error generating network graph:', error);
    return NextResponse.json(
      { error: 'Failed to generate network graph' },
      { status: 500 }
    );
  }
}