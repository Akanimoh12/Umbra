'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { Toaster } from 'sonner';
import { WagmiProvider, http } from 'wagmi';
import { flareTestnet } from 'wagmi/chains';
import { useState } from 'react';

const config = getDefaultConfig({
  appName: 'Umbra',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? 'umbra-dev-placeholder',
  chains: [flareTestnet],
  transports: {
    [flareTestnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
  },
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#8b5cf6', borderRadius: 'large' })}>
          {children}
          <Toaster theme="dark" position="bottom-right" />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
