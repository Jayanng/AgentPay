/**
 * Wallet setup and utilities for AgentPay x402.
 *
 * Supports TWO wallet modes:
 * 1. CAW Mode (Cobo Agentic Wallet) — When CAW_API_KEY + CAW_WALLET_ID are set
 *    All fund operations route through CAW API with permission policies.
 *    This is the recommended mode for Agent-Native Payments.
 *
 * 2. Viem Mode (Private Key) — Legacy mode using viem + WALLET_PRIVATE_KEY
 *    Direct on-chain signing without CAW's policy engine.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  CHAINS,
  NETWORK,
  CURRENCY,
  WALLET_PRIVATE_KEY,
  SERVER_URL,
  TOKEN_CONTRACT,
  TOKEN_DECIMALS,
  MAX_AUTO_PAYMENT,
  ERC20_ABI,
  formatUnits,
  parseUnits,
} from "./config.js";
import { makePayment } from "./payment.js";
import { isCawActive, getCawAddress, getCawBalance, cawSendToken, initCawBridge } from "./caw-bridge.js";

// ═══════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════

// Simple logging to stderr (stdout is reserved for MCP protocol)
export function log(message) {
  console.error(`[agentpay-x402] ${message}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPLORER URL
// ═══════════════════════════════════════════════════════════════════════════

// Get blockchain explorer URL based on network
export function getExplorerUrl(txHash) {
  const explorers = {
    'mainnet': `https://etherscan.io/tx/${txHash}`,
    'sepolia': `https://sepolia.etherscan.io/tx/${txHash}`,
    'base': `https://basescan.org/tx/${txHash}`,
    'base-sepolia': `https://sepolia.basescan.org/tx/${txHash}`,
    'polygon': `https://polygonscan.com/tx/${txHash}`,
    'polygon-amoy': `https://amoy.polygonscan.com/tx/${txHash}`,
    'arbitrum': `https://arbiscan.io/tx/${txHash}`,
    'arbitrum-sepolia': `https://sepolia.arbiscan.io/tx/${txHash}`,
    'optimism': `https://optimistic.etherscan.io/tx/${txHash}`,
    'optimism-sepolia': `https://sepolia-optimism.etherscan.io/tx/${txHash}`,
    'mantle-sepolia': `https://sepolia.mantlescan.xyz/tx/${txHash}`,
    'mantle': `https://mantlescan.xyz/tx/${txHash}`,
    'cronos-testnet': `https://explorer.cronos.org/testnet/tx/${txHash}`,
    'cronos': `https://explorer.cronos.org/tx/${txHash}`,
  };
  return explorers[NETWORK] || `https://sepolia.etherscan.io/tx/${txHash}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// WALLET MODE DETECTION
// ═══════════════════════════════════════════════════════════════════════════

// CAW (Cobo Agentic Wallet) is the PRIMARY wallet mode.
// Viem (Private Key) is a fallback for local development only.
export const WALLET_MODE = (process.env.CAW_API_KEY && process.env.CAW_WALLET_ID) ? "caw" : "viem";

if (WALLET_MODE === "caw") {
  log(`🔑 Wallet mode: CAW (Cobo Agentic Wallet) — PRIMARY`);
  log(`   All payments route through CAW API with permission policies`);
  log(`   Every fund operation is evaluated against Pact policies`);
} else {
  log(`🔑 Wallet mode: Viem (Private Key) — FALLBACK`);
  log(`   ⚠ CAW_API_KEY + CAW_WALLET_ID not set — running without CAW`);
  log(`   For Agent-Native Payments, set CAW credentials`);
}

// ═══════════════════════════════════════════════════════════════════════════
// VIEM WALLET SETUP (Legacy / Fallback)
// ═══════════════════════════════════════════════════════════════════════════

export let wallet = null;
export let publicClient = null;
export let walletClient = null;

if (WALLET_MODE === "viem" && WALLET_PRIVATE_KEY) {
  try {
    const chain = CHAINS[NETWORK] || CHAINS.mainnet;
    const privateKey = WALLET_PRIVATE_KEY.startsWith("0x")
      ? WALLET_PRIVATE_KEY
      : `0x${WALLET_PRIVATE_KEY}`;

    wallet = privateKeyToAccount(privateKey);

    publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    walletClient = createWalletClient({
      account: wallet,
      chain,
      transport: http(),
    });

    log(`✓ Wallet loaded: ${wallet.address.slice(0, 10)}...`);
    log(`✓ Network: ${NETWORK}`);
    log(`✓ Token: ${CURRENCY} (${TOKEN_CONTRACT.slice(0, 10)}...)`);
    log(`✓ Server: ${SERVER_URL}`);
  } catch (e) {
    log(`✗ Invalid wallet key: ${e.message}`);
  }
} else if (WALLET_MODE === "viem") {
  log(`⚠ No wallet configured (WALLET_PRIVATE_KEY not set)`);
  log(`  Payment tools will be disabled`);
}

// ═══════════════════════════════════════════════════════════════════════════
// WALLET: Get balance
// ═══════════════════════════════════════════════════════════════════════════

export async function getWalletBalance() {
  // CAW Mode: Use CAW API
  if (WALLET_MODE === "caw") {
    const cawBalance = await getCawBalance();
    if (cawBalance) return cawBalance;
    // Fallback to viem if CAW fails
  }

  // Viem Mode: Direct on-chain query
  if (!wallet) {
    return { error: "No wallet configured. Set WALLET_PRIVATE_KEY or CAW_API_KEY+CAW_WALLET_ID environment variables." };
  }

  try {
    // Determine native currency based on network
    const nativeCurrency = NETWORK.includes('mantle') ? 'MNT'
      : NETWORK.includes('cronos') ? (NETWORK.includes('testnet') ? 'TCRO' : 'CRO')
      : 'ETH';

    // Get native token balance (ETH/MNT)
    const nativeBalance = await publicClient.getBalance({ address: wallet.address });

    // Get ERC20 token balance (if using USDC/USDT/DAI)
    let tokenBalance = 0n;
    const isNativeToken = TOKEN_CONTRACT === "0x0000000000000000000000000000000000000000" ||
                          CURRENCY === nativeCurrency;

    if (!isNativeToken) {
      try {
        tokenBalance = await publicClient.readContract({
          address: TOKEN_CONTRACT,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [wallet.address],
        });
      } catch (e) {
        log(`Could not fetch ${CURRENCY} balance: ${e.message}`);
      }
    }

    // Format balances with proper decimal handling
    const nativeFormatted = formatUnits(nativeBalance, 18);
    const tokenFormatted = formatUnits(tokenBalance, TOKEN_DECIMALS);

    // Parse and format with commas and proper decimal places
    const nativeValue = parseFloat(nativeFormatted);
    const tokenValue = parseFloat(tokenFormatted);

    // Format native: show up to 6 decimal places
    const nativeDisplay = nativeValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });

    // Format token: show up to 2 decimal places
    const tokenDisplay = tokenValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Build balances object
    const balances = {
      [nativeCurrency]: nativeDisplay,
    };
    const balancesRaw = {
      [nativeCurrency]: nativeFormatted,
    };

    // If using ERC20 token and it's different from native, show both
    if (!isNativeToken && CURRENCY !== nativeCurrency) {
      balances[CURRENCY] = tokenDisplay;
      balancesRaw[CURRENCY] = tokenFormatted;
    }

    return {
      wallet: wallet.address,
      network: NETWORK,
      chain: NETWORK,
      balances,
      balancesRaw,
      maxAutoPayment: MAX_AUTO_PAYMENT,
      tokenContract: TOKEN_CONTRACT,
      paymentCurrency: CURRENCY,
      note: `${nativeCurrency} balance for ${isNativeToken ? 'payments and ' : ''}gas fees.${!isNativeToken ? ` ${CURRENCY} balance for payments.` : ''}`,
    };
  } catch (err) {
    return { error: `Failed to get balance: ${err.message}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WALLET: Send token
// ═══════════════════════════════════════════════════════════════════════════

export async function sendToken(to, amount, memo) {
  // CAW Mode: Use CAW API for payment
  if (WALLET_MODE === "caw") {
    const result = await cawSendToken(to, amount, memo);
    if (result) return result;
    // Fallback to viem if CAW fails
  }

  // Viem Mode: Direct on-chain transfer
  if (!wallet) {
    return { error: "No wallet configured" };
  }

  const amountToken = parseFloat(amount);
  if (isNaN(amountToken) || amountToken <= 0) {
    return { error: "Invalid amount" };
  }

  const amountBaseUnits = parseUnits(amount, TOKEN_DECIMALS);

  log(`Sending ${amountToken} ${CURRENCY} to ${to}`);

  const paymentResult = await makePayment(to, amountBaseUnits.toString());

  if (!paymentResult.success) {
    return { error: paymentResult.error };
  }

  return {
    success: true,
    to,
    amount: amountToken,
    currency: CURRENCY,
    memo: memo || null,
    txHash: paymentResult.txHash,
    network: NETWORK,
    explorer: getExplorerUrl(paymentResult.txHash),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CAW INITIALIZATION (async, called at startup)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize CAW wallet if configured.
 * Called by the MCP server startup in index.js.
 */
export async function initializeWallet() {
  if (WALLET_MODE === "caw") {
    log(`Initializing CAW wallet...`);
    const bridge = await initCawBridge();
    if (bridge) {
      const address = getCawAddress();
      log(`✓ CAW wallet ready: ${address}`);
      log(`  All payments will be routed through Cobo Agentic Wallet`);
      log(`  Permission policies active (spending limits, chain/token whitelists)`);
    } else {
      log(`✗ CAW initialization failed, falling back to viem wallet`);
    }
    return bridge;
  }
  return null;
}
