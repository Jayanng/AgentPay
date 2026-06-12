# AgentPay x Cobo Agentic Wallet — CAW Integration

## How CAW Powers Agent-Native Payments in AgentPay

AgentPay is an agent marketplace where AI agents discover, pay for, and consume digital resources using the x402 (HTTP 402) protocol. **Cobo Agentic Wallet (CAW) is the critical payment infrastructure** — every fund operation flows through CAW's API with automatic permission policy evaluation, MPC signing, and complete audit trail.

---

## Architecture

```
+-----------------+     HTTP 402     +-----------------+     CAW API      +-----------------+
|   Agent (MCP)   | --------------> |  AgentPay       | --------------> |  Cobo Agentic   |
|                 |                  |  x402 Server    |                  |  Wallet (CAW)   |
|  CAW Agent      | <-------------- |                 | <-------------- |                 |
|  Wallet         |   X-PAYMENT     |  Verify on-chain|   tx_hash        |  Policy Engine  |
|                 |   proof + data  |                 |                  |  MPC Signing    |
+-----------------+                 +-----------------+                  +-----------------+
```

### Why CAW is Critical (Not Replaceable)

| Component | Without CAW | With CAW |
|-----------|-------------|----------|
| Payment execution | Raw private key — no guardrails | API-based with MPC security |
| Permission control | None — agent can drain wallet | Policy engine: spending limits, chain/token/destination whitelists |
| Risk boundaries | Unlimited exposure | Per-transaction limits, rolling budgets, review thresholds |
| Auditability | None | Full audit trail of allowed/denied operations |
| Key security | Private key exposed to agent process | MPC — no single party holds the key |

**Remove CAW from the flow and no payments can happen.** It is not a display element — it IS the payment engine.

---

## The Complete Agent-Native Payment Flow

This is the core flow that the demo shows. It maps directly to **Track 1, Direction 01: Agent-Native Payments**.

```
1. DISCOVER
   Agent A (e.g., Research Agent) discovers Agent B's paid resource
   on the AgentPay marketplace.

2. REQUEST
   Agent A calls: GET /x402/resource/market-data
   -> Server responds: HTTP 402 Payment Required
   -> Body: { amount: "500000", recipient: "0x...", scheme: "spay", network: "sepolia" }

3. EVALUATE (CAW Policy Engine)
   CAW evaluates the payment against active Pact policies:
   [ok] Chain allowed?     SETH (Ethereum Sepolia) — YES
   [ok] Token allowed?     SETH_USDC — YES
   [ok] Amount within limit? 0.50 USDC < 10.00 USDC — YES
   [ok] Destination OK?    0x... (not restricted) — YES
   [ok] Rolling budget OK? 0.50 < $50/24h — YES
   -> All checks pass -> Payment APPROVED

4. EXECUTE (CAW API)
   POST /api/v1/wallets/{walletId}/transfer
   -> CAW signs with MPC (no private key exposed)
   -> USDC transfer executed on Ethereum Sepolia
   -> Returns: tx_hash = "0xabc123..."

5. PROVE
   Agent A retries: GET /x402/resource/market-data
   Header: X-PAYMENT: { "txHash": "0xabc123...", "network": "sepolia", "chainId": 11155111 }

6. VERIFY
   Server verifies on-chain:
   [ok] Transaction exists and succeeded
   [ok] Correct recipient
   [ok] Correct amount (0.50 USDC)
   [ok] Correct token contract (USDC)

7. SERVE
   Server returns: 200 OK + resource data
   Agent A now has the market data it needs.
```

---

## CAW Permission Policies (Risk Boundaries)

Every agent wallet has an active **Pact** — a structured authorization with permission policies. These policies are evaluated by CAW before every payment.

### Default Policy Configuration

```json
{
  "name": "agentpay-x402-payment-policy",
  "type": "transfer",
  "rules": {
    "effect": "allow",
    "when": {
      "chain_in": ["SETH"],
      "token_in": [{ "chain_id": "SETH", "token_id": "SETH_USDC" }]
    },
    "deny_if": {
      "amount_gt": "10000000",
      "usage_limits": {
        "rolling_24h": {
          "amount_usd_gt": "50",
          "tx_count_gt": 100
        }
      }
    },
    "review_if": {
      "amount_usd_gt": "5"
    }
  }
}
```

### What This Means

| Policy | Value | Risk Boundary |
|--------|-------|---------------|
| Allowed chains | Ethereum Sepolia only | Agent can't pay on mainnet |
| Allowed tokens | USDC on Sepolia only | Agent can't drain ETH for gas |
| Max per transaction | 10 USDC | Single payment cap |
| Rolling 24h spend | $50 | Daily budget limit |
| Rolling 24h tx count | 100 | Rate limit |
| Review threshold | $5 | Payments > $5 require owner approval |

### Three-Stage Policy Gate

Every payment goes through three checks:

1. **API Key Scope** — Is the API key authorized for this operation?
2. **Policy Rule Evaluation** — Does the payment match the allow rules? Does it trigger any deny_if conditions?
3. **Counter Check** — Are rolling spend limits exceeded?

If ANY check fails, the payment is denied with a structured error:
```json
{
  "code": "TRANSFER_LIMIT_EXCEEDED",
  "message": "Transfer amount exceeds the maximum allowed per transaction",
  "details": { "limit_value": "10000000", "attempted": "50000000" },
  "suggestion": "Retry with amount <= 10 USDC"
}
```

---

## Code Integration Points

### 1. `packages/caw-wallet/` — CAW SDK Integration Layer

| File | Purpose |
|------|---------|
| `src/caw-client.ts` | REST API client — wraps all CAW endpoints |
| `src/caw-agent-wallet.ts` | High-level agent wallet — init, pacts, payments, x402 |
| `src/caw-mcp-bridge.ts` | MCP client bridge — drop-in replacement for viem wallet |
| `src/types.ts` | Type definitions for all CAW API structures |
| `src/demo.ts` | Full demo script showing the Agent-Native Payment flow |
| `src/demo-setup.ts` | Setup script for CAW wallet initialization |

### 2. `packages/mcp-client/` — MCP Client (Modified)

| File | Change |
|------|--------|
| `src/caw-bridge.js` | NEW — Bridge between MCP client and CAW wallet |
| `src/wallet.js` | MODIFIED — Detects CAW mode, routes payments through CAW |
| `src/payment.js` | MODIFIED — CAW payment path for x402 transactions |
| `src/tools/requests.js` | MODIFIED — x402 requests via CAW when configured |
| `src/config.js` | MODIFIED — Added CAW environment variables |

### 3. `packages/ai-agent/` — AI Agent (Modified)

| File | Change |
|------|--------|
| `src/config.ts` | MODIFIED — Added CAW config, dual wallet mode |
| `src/wallet.ts` | MODIFIED — CAW wallet mode with dynamic import |

---

## How to Run the Demo

### Prerequisites

1. Get CAW credentials:
   ```bash
   # Install CAW CLI
   curl -fsSL https://raw.githubusercontent.com/CoboGlobal/cobo-agentic-wallet/master/install.sh | bash

   # Create agent wallet
   caw onboard --wait

   # Get API credentials
   caw wallet current --show-api-key

   # Fund with testnet tokens
   caw faucet deposit --token-id SETH --address <your-address>
   caw faucet deposit --token-id SETH_USDC --address <your-address>
   ```

2. Or sign up at: https://agenticwallet.cobo.com

### Run the Demo

```bash
# Set CAW environment variables
export CAW_API_KEY="your-caw-api-key"
export CAW_WALLET_ID="your-caw-wallet-uuid"
export X402_CHAIN="sepolia"

# Option A: Run the standalone demo
cd packages/caw-wallet
pnpm demo

# Option B: Full AgentPay with CAW
# Terminal 1: Start backend
pnpm --filter backend run dev

# Terminal 2: Start MCP client with CAW
CAW_API_KEY=$CAW_API_KEY CAW_WALLET_ID=$CAW_WALLET_ID \
  pnpm --filter mcp-client run start

# Terminal 3: Run AI agent with CAW
CAW_API_KEY=$CAW_API_KEY CAW_WALLET_ID=$CAW_WALLET_ID \
  pnpm --filter ai-agent run dev
```

---

## On-Chain Evidence (Testnet)

For hackathon submission, provide:

| Evidence | Where to Find |
|----------|---------------|
| Agent Wallet Address | `caw wallet current` or demo output |
| Transaction Hash | From CAW demo output or Sepolia Etherscan |
| Pact ID | From CAW demo output |
| Audit Logs | `caw audit-logs` or demo Step 6 |

### Example Testnet Addresses

- **Network**: Ethereum Sepolia (Chain ID: 11155111)
- **Explorer**: https://sepolia.etherscan.io
- **USDC Contract**: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
- **CAW Chain ID**: SETH
- **CAW Token ID**: SETH_USDC

---

## Judging Criteria Alignment

### Scenario Fit
AgentPay clearly reflects Agentic Commerce — AI agents are first-class payment participants on the internet. They discover resources, receive HTTP 402, and autonomously complete payments via CAW. This is not a wallet add-on; it's the entire payment layer.

### CAW Criticality
CAW is the key component in the funding flow. Remove it and:
- No payments can be executed (CAW signs via MPC)
- No permission policies exist (CAW enforces them server-side)
- No audit trail exists (CAW logs every allowed/denied operation)
- No risk boundaries exist (CAW's policy engine is the only guard)

### Funding Flow Completeness
The demo clearly shows:
1. Agent task trigger (needs market data)
2. HTTP 402 payment requirement
3. CAW policy evaluation (automatic)
4. CAW payment execution (USDC transfer)
5. Payment proof verification
6. Resource delivered

### Risk Boundary Explanation
Explicitly documented in the Pact policies:
- Per-transaction spending limits
- Rolling 24h budgets
- Chain/token whitelists
- Destination address restrictions
- Review thresholds for large payments
- Three-stage policy gate (scope -> rules -> counters)

### Demo Quality
The demo shows:
- Complete x402 flow with CAW
- Policy evaluation results (allowed/denied)
- On-chain transaction confirmation
- Audit trail of all operations

---

## Key Flows for Demo Video

### Flow 1: Successful Agent-Native Payment
1. Agent requests paid resource -> HTTP 402
2. CAW evaluates policies -> All checks pass
3. CAW executes USDC transfer -> tx confirmed
4. Agent retries with proof -> Resource served
5. Check audit logs -> Payment recorded

### Flow 2: Policy Denied Payment (Risk Boundaries)
1. Agent tries to pay > $10 -> Policy denied
2. CAW returns: "TRANSFER_LIMIT_EXCEEDED"
3. Agent receives structured error with suggestion
4. No funds lost — risk boundary worked

### Flow 3: A2A Payment (Agent-to-Agent)
1. Agent A hires Agent B on AgentPay
2. Agent A's CAW wallet pays Agent B's CAW wallet
3. Both agents have independent wallets with separate policies
4. Demonstrates Agent Economy with CAW at the center
