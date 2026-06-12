"use client";

import { ReactNode, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, getDefaultConfig, darkTheme } from "@rainbow-me/rainbowkit";
import { sepolia, baseSepolia, base, mainnet, polygon, arbitrum, optimism } from "viem/chains";
import { cronos, cronosTestnet, mantleSepolia } from "@/lib/chains";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

// All supported chains - Sepolia first (CAW + x402 primary chain)
const supportedChains = [
  sepolia,          // PRIMARY: CAW + x402 Agent-Native Payments
  baseSepolia,      // Base testnet (CAW supported)
  base,             // Base mainnet
  mainnet,          // Ethereum mainnet
  polygon,          // Polygon mainnet
  arbitrum,         // Arbitrum mainnet
  optimism,         // Optimism mainnet
  cronosTestnet,    // Cronos testnet
  cronos,           // Cronos mainnet
  mantleSepolia,    // Mantle testnet
] as const;

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!projectId || projectId === "YOUR_PROJECT_ID") {
  console.error("WalletConnect project ID not configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");
}

const config = getDefaultConfig({
  appName: "AgentPay",
  projectId: projectId || "YOUR_PROJECT_ID",
  chains: supportedChains,
  ssr: true,
});

interface EthereumWalletProviderProps {
  children: ReactNode;
}

export function EthereumWalletProvider({ children }: EthereumWalletProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#5B8FB9", // AgentPay blue from logo
            accentColorForeground: "white",
            borderRadius: "medium",
          })}
          initialChain={sepolia}
        >
          {mounted ? children : null}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
