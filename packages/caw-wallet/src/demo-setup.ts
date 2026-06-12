/**
 * Demo Setup Script for Cobo Agentic Wallet (CAW) Integration.
 *
 * This script demonstrates how to set up a CAW-powered Agent
 * for Agent-Native Payments via x402.
 *
 * Prerequisites:
 * 1. Install the CAW CLI: curl -fsSL https://raw.githubusercontent.com/CoboGlobal/cobo-agentic-wallet/master/install.sh | bash
 * 2. Run: caw onboard --wait  (creates your agent wallet)
 * 3. Run: caw wallet current --show-api-key  (get API key + wallet ID)
 * 4. Set environment variables (see below)
 *
 * Environment Variables:
 * - CAW_API_KEY: Your CAW API key
 * - CAW_WALLET_ID: Your CAW wallet ID (UUID)
 * - X402_CHAIN: Network (default: sepolia)
 */

import { CawAgentWallet, getDefaultPolicies } from "./caw-agent-wallet.js";
import { CawClient } from "./caw-client.js";
import type { CawConfig, PactResponse } from "./types.js";

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(message: string) {
  console.error(`[demo-setup] ${message}`);
}

function banner(text: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${text}`);
  console.log(`${"=".repeat(60)}\n`);
}

function step(num: number, text: string) {
  console.log(`\n📌 Step ${num}: ${text}`);
  console.log(`${"─".repeat(50)}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  banner("AgentPay × Cobo Agentic Wallet — Demo Setup");

  // Check environment variables
  const apiKey = process.env.CAW_API_KEY;
  const walletId = process.env.CAW_WALLET_ID;
  const network = process.env.X402_CHAIN || "sepolia";

  if (!apiKey || !walletId) {
    console.error(`
❌ Missing required environment variables!

Please set:
  export CAW_API_KEY="your-caw-api-key"
  export CAW_WALLET_ID="your-caw-wallet-id"

How to get these:
  1. Install CAW CLI: curl -fsSL https://raw.githubusercontent.com/CoboGlobal/cobo-agentic-wallet/master/install.sh | bash
  2. Create wallet: caw onboard --wait
  3. Get credentials: caw wallet current --show-api-key

Or sign up at: https://agenticwallet.cobo.com
`);
    process.exit(1);
  }

  // ─── Step 1: Initialize CAW Client ──────────────────────────────────

  step(1, "Initialize CAW Client");

  const networkMap: Record<string, { cawChainId: string; cawTokenId: string; evmChainId: number; explorerUrl: string }> = {
    sepolia: {
      cawChainId: "SETH",
      cawTokenId: "SETH_USDC",
      evmChainId: 11155111,
      explorerUrl: "https://sepolia.etherscan.io",
    },
  };

  const netConfig = networkMap[network] || networkMap.sepolia;

  const config: CawConfig = {
    apiUrl: process.env.CAW_API_URL || "https://api.agenticwallet.cobo.com",
    apiKey,
    walletId,
    cawChainId: process.env.CAW_CHAIN_ID || netConfig.cawChainId,
    cawTokenId: process.env.CAW_TOKEN_ID || netConfig.cawTokenId,
    evmChainId: netConfig.evmChainId,
    networkName: network,
    explorerUrl: netConfig.explorerUrl,
    maxAutoPayment: parseFloat(process.env.MAX_AUTO_PAYMENT || "10.00"),
  };

  const agentWallet = new CawAgentWallet(config);

  console.log(`✓ CAW Client initialized`);
  console.log(`  API URL: ${config.apiUrl}`);
  console.log(`  Wallet ID: ${config.walletId}`);
  console.log(`  Chain: ${config.cawChainId} (${network})`);
  console.log(`  Token: ${config.cawTokenId}`);
  console.log(`  Max Auto Payment: $${config.maxAutoPayment}`);

  // ─── Step 2: Initialize Agent Wallet ────────────────────────────────

  step(2, "Initialize Agent Wallet");

  try {
    await agentWallet.initialize();
    console.log(`✓ Agent wallet initialized`);
    console.log(`  Address: ${agentWallet.getAddress()}`);
    console.log(`  Status: ${agentWallet.getWalletInfo()?.status}`);
  } catch (err) {
    console.error(`✗ Failed to initialize wallet: ${err instanceof Error ? err.message : err}`);
    console.error(`  Make sure your CAW_API_KEY and CAW_WALLET_ID are correct.`);
    process.exit(1);
  }

  // ─── Step 3: Create Pact with Permission Policies ───────────────────

  step(3, "Create Pact with Permission Policies");

  const pact = agentWallet.getActivePact();
  if (pact) {
    console.log(`✓ Active pact found: ${pact.pact_id}`);
    console.log(`  Intent: ${pact.intent}`);
    console.log(`  Status: ${pact.status}`);
  } else {
    console.log(`⚠ No active pact — this is expected for new wallets`);
  }

  // Show the permission policies
  const policies = getDefaultPolicies(config.cawChainId, config.cawTokenId, config.maxAutoPayment);
  console.log(`\n📋 Default Permission Policies:`);
  console.log(`   Allowed chains: ${policies.allowedChains?.join(", ") || config.cawChainId}`);
  console.log(`   Allowed tokens: ${policies.allowedTokens?.map(t => t.token_id).join(", ") || config.cawTokenId}`);
  console.log(`   Max per transaction: ${policies.maxAmountPerTx ? `$${parseInt(policies.maxAmountPerTx) / 1_000_000} USDC` : "Unlimited"}`);
  console.log(`   Rolling 24h limit: $${policies.rolling24hLimit || "None"}`);
  console.log(`   Rolling 24h tx count: ${policies.rolling24hTxCount || "None"}`);
  console.log(`   Review threshold: $${policies.reviewThreshold || "None"}`);

  // ─── Step 4: Fund from Faucet (Testnet) ─────────────────────────────

  step(4, "Fund Wallet from Testnet Faucet");

  const faucetResult = await agentWallet.fundFromFaucet();
  if (faucetResult) {
    console.log(`✓ Faucet deposit submitted: ${faucetResult.tx_id}`);
  } else {
    console.log(`⚠ Faucet deposit skipped (may have reached daily limit)`);
    console.log(`  You can also fund manually via the CAW CLI:`);
    console.log(`  caw faucet deposit --token-id ${config.cawTokenId} --address ${agentWallet.getAddress()}`);
  }

  // ─── Step 5: Check Balance ──────────────────────────────────────────

  step(5, "Check Wallet Balance");

  const balance = await agentWallet.getBalance();
  console.log(`✓ Wallet balance:`);
  console.log(`  Address: ${balance.wallet}`);
  console.log(`  Network: ${balance.network}`);
  console.log(`  Source: ${balance.source} (Cobo Agentic Wallet)`);
  console.log(`  Pact ID: ${balance.pactId || "none"}`);

  // ─── Summary ────────────────────────────────────────────────────────

  banner("Setup Complete — Agent-Native Payments Ready");

  console.log(`
🎉 Your CAW-powered Agent is ready for x402 payments!

Next steps:
1. Start the AgentPay backend:  pnpm --filter backend run dev
2. Start the MCP client with CAW: CAW_API_KEY=${apiKey} CAW_WALLET_ID=${walletId} pnpm --filter mcp-client run start
3. Use x402_request tool to access paid resources — CAW handles payments automatically

Key environment variables for your .env:
  CAW_API_KEY=${apiKey}
  CAW_WALLET_ID=${walletId}
  X402_CHAIN=${network}
  MAX_AUTO_PAYMENT=10.00

For the hackathon demo, show:
1. Agent requests a paid resource → gets HTTP 402
2. CAW evaluates permission policies automatically
3. CAW executes the USDC payment (if within limits)
4. Agent retries with payment proof → resource served
5. Check audit logs: all payments are tracked by CAW
`);
}

main().catch((err) => {
  console.error(`Fatal error: ${err}`);
  process.exit(1);
});
