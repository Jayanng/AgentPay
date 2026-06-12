/**
 * Payment execution logic for AgentPay x402.
 * Handles both native token (ETH/MNT) and ERC20 token transfers.
 *
 * CAW Mode: When CAW is active, payments route through the CAW API
 * instead of direct viem signing. This ensures every payment is
 * evaluated against permission policies before execution.
 */

import {
  CURRENCY,
  TOKEN_CONTRACT,
  ERC20_ABI,
} from "./config.js";
import { isCawActive } from "./caw-bridge.js";

// NOTE: We import wallet/publicClient/walletClient lazily to break the
// circular dependency between wallet.js and payment.js.
// wallet.js imports payment.js (for sendToken -> makePayment),
// so payment.js cannot import wallet.js at the top level.

let _walletModule = null;

async function getWalletModule() {
  if (!_walletModule) {
    _walletModule = await import("./wallet.js");
  }
  return _walletModule;
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

export async function makePayment(recipientAddress, amountBaseUnits) {
  const { log } = await getWalletModule();

  // CAW Mode: Route payment through CAW API
  // The CAW API handles signing, policy evaluation, and execution.
  // If the payment violates any policy (spending limits, chain/token
  // restrictions, destination whitelist), CAW denies it with a
  // structured error including the violation details and suggestion.
  if (isCawActive()) {
    const { getCawBridge } = await import("./caw-bridge.js");
    const bridge = getCawBridge();

    if (bridge) {
      log(`[CAW] Executing payment via Cobo Agentic Wallet...`);
      log(`[CAW] Recipient: ${recipientAddress}`);
      log(`[CAW] Amount: ${amountBaseUnits} base units`);

      const result = await bridge.sendToken(
        recipientAddress,
        // Convert base units back to token amount for CAW
        (parseInt(amountBaseUnits) / 1_000_000).toString(),
        "x402 payment"
      );

      if (result.success) {
        log(`[CAW] Payment successful: ${result.txHash}`);
        return { success: true, txHash: result.txHash };
      } else {
        log(`[CAW] Payment denied: ${result.error}`);
        if (result.policyDenied) {
          return {
            success: false,
            error: `CAW Policy Denied: ${result.policyDenied.code} — ${result.policyDenied.message}`,
            policyDenied: result.policyDenied,
          };
        }
        return { success: false, error: result.error };
      }
    }
  }

  // Viem Mode: Direct on-chain payment (legacy)
  const { wallet, publicClient, walletClient } = await getWalletModule();

  try {
    let txHash;

    // Ensure recipient is a valid address string
    const recipient = String(recipientAddress).toLowerCase();
    log(`Payment recipient: ${recipient}`);
    log(`Payment amount: ${amountBaseUnits} wei`);

    // Check if we're using native token (ETH/MNT) or ERC20
    if (TOKEN_CONTRACT === "0x0000000000000000000000000000000000000000" ||
        CURRENCY === "ETH" || CURRENCY === "MNT") {
      // Native token transfer
      log(`Sending native ${CURRENCY} transfer...`);
      txHash = await walletClient.sendTransaction({
        to: recipient,
        value: BigInt(amountBaseUnits),
      });
    } else {
      // ERC20 token transfer
      log(`Sending ERC20 ${CURRENCY} transfer...`);
      txHash = await walletClient.writeContract({
        address: TOKEN_CONTRACT,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [recipient, BigInt(amountBaseUnits)],
      });
    }

    log(`Transaction sent: ${txHash}`);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 60_000, // 60 seconds for Mantle
    });

    if (receipt.status === "reverted") {
      return { success: false, error: "Transaction reverted" };
    }

    return { success: true, txHash };
  } catch (err) {
    log(`Payment error: ${err.message}`);
    return { success: false, error: err.message };
  }
}
