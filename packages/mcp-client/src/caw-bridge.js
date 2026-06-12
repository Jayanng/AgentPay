/**
 * CAW Integration Bridge for AgentPay MCP Client.
 *
 * When CAW_API_KEY and CAW_WALLET_ID are set, this module provides
 * wallet and payment functions that route through Cobo Agentic Wallet
 * instead of viem private keys.
 *
 * This is the integration point that makes CAW the critical component
 * in AgentPay's Agent-Native Payment flow.
 */

import { CawMcpBridge, isCawEnabled, buildCawConfig } from "@agentpay/caw-wallet";

// ─── Singleton ───────────────────────────────────────────────────────────────

let _cawBridge = null;

/**
 * Initialize the CAW bridge. Called once at startup.
 */
export async function initCawBridge() {
  if (!isCawEnabled(process.env)) {
    return null;
  }

  if (_cawBridge) return _cawBridge;

  try {
    const config = buildCawConfig(process.env);
    _cawBridge = new CawMcpBridge(config);
    await _cawBridge.init();
    return _cawBridge;
  } catch (err) {
    console.error(`[caw-bridge] Failed to initialize: ${err.message}`);
    return null;
  }
}

/**
 * Get the initialized CAW bridge, or null if not configured.
 */
export function getCawBridge() {
  return _cawBridge;
}

/**
 * Check if CAW mode is active.
 */
export function isCawActive() {
  return _cawBridge !== null && _cawBridge.isConfigured();
}

/**
 * Get wallet address (CAW or viem).
 */
export function getCawAddress() {
  if (!_cawBridge) return null;
  return _cawBridge.getAddress();
}

/**
 * Get wallet balance via CAW.
 */
export async function getCawBalance() {
  if (!_cawBridge) return null;
  return _cawBridge.getBalance();
}

/**
 * Send tokens via CAW.
 */
export async function cawSendToken(to, amount, memo) {
  if (!_cawBridge) return null;
  return _cawBridge.sendToken(to, amount, memo);
}

/**
 * Execute x402 request via CAW.
 */
export async function cawX402Request(params) {
  if (!_cawBridge) return null;
  return _cawBridge.x402Request(params);
}

/**
 * Get CAW audit logs.
 */
export async function getCawAuditLogs() {
  if (!_cawBridge) return null;
  return _cawBridge.getAuditLogs();
}

/**
 * Fund wallet from testnet faucet.
 */
export async function cawFundFromFaucet() {
  if (!_cawBridge) return null;
  return _cawBridge.fundFromFaucet();
}
