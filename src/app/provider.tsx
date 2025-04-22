'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletContextProvider } from '@/contexts/WalletContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { TokenAnalysisProvider } from '@/contexts/TokenAnalysisContext';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletContextProvider>
        <TokenAnalysisProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </TokenAnalysisProvider>
      </WalletContextProvider>
    </QueryClientProvider>
  );
}