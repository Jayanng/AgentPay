<div align="center">

# AgentPay

### **Agent-Native Payments on the Internet**

*AI agents autonomously discover, pay for, and consume digital resources using x402 protocol — powered by Cobo Agentic Wallet.*

[![Cobo Agentic Wallet](https://img.shields.io/badge/CAW-Powered-brightgreen)](https://www.cobo.com/agentic-wallet)
[![x402 Protocol](https://img.shields.io/badge/x402-Enabled-blue)](https://x402.org)
[![Ethereum Sepolia](https://img.shields.io/badge/Ethereum_Sepolia-Testnet-blue)](https://sepolia.etherscan.io)
[![MCP Protocol](https://img.shields.io/badge/MCP-Integrated-purple)](https://modelcontextprotocol.io)

**AI x Web3 Agentic Builders Hackathon — Track 1: Agent-Native Payments x Cobo Agentic Wallet**

[CAW Workflow](./CAW_WORKFLOW.md) · [Setup Guide](#quick-start)

</div>

---

## Hackathon Submission

**Track:** Cobo | Agentic Economy x Cobo Agentic Wallet

**Direction:** 01 — Agent-Native Payments: Make Agents first-class payment participants on the internet

**What it is:** A marketplace where AI agents autonomously complete HTTP 402 payments without API keys or human pre-registration — every payment flows through Cobo Agentic Wallet with automatic permission policy evaluation, MPC signing, and full audit trail.

**Core Stack:**
- **Cobo Agentic Wallet (CAW)** — Critical payment infrastructure: MPC signing, permission policies, risk boundaries, audit trail
- **x402 Protocol** — HTTP 402 payment gating for agent resource access
- **Ethereum Sepolia Testnet** — USDC payments with on-chain verification
- **MCP** — Model Context Protocol (Claude Desktop / AI agent integration)

---

## The Problem

AI agents can research, write, and plan — but they can't **pay** for anything on the internet. Paid APIs, datasets, and compute are locked behind API keys, credit cards, and human registration flows. Every paid endpoint requires a developer to manually provision credentials, set up billing, and manage access tokens. There is no standard way for an autonomous agent to hold funds, evaluate whether a payment is safe, and complete it without human intervention.

This creates a fundamental bottleneck: agents are cognitively capable but financially paralyzed. They can find the perfect dataset or API but cannot actually use it because the internet's payment layer was designed for humans, not machines.

## The Solution

AgentPay makes agents **first-class payment participants** on the internet by combining the x402 protocol with Cobo Agentic Wallet:

**How it works:**
```
1. Agent discovers a paid resource on the marketplace
2. Agent requests the resource -> receives HTTP 402 Payment Required
3. Cobo Agentic Wallet evaluates permission policies automatically:
   + Is the chain allowed? (Sepolia only — can't pay on mainnet)
   + Is the token allowed? (USDC only — can't drain ETH)
   + Is the amount within limits? (< 10 USDC per tx)
   + Is the daily budget OK? (< $50/24h rolling)
4. CAW executes the USDC transfer via MPC signing (no private key exposed)
5. Agent retries with payment proof -> server verifies on-chain -> serves resource
```

**Why CAW is critical (not replaceable):**
- Remove CAW -> No payment execution possible (CAW signs via MPC, private key never exposed)
- No permission policies -> Agent could drain wallet on any chain, any token, any amount
- No audit trail -> No way to track what the agent spent or where funds went
- No risk boundaries -> Unlimited financial exposure with no safety net
- CAW is not a nice-to-have wrapper — it is the **only** way funds move, and every movement is gated by policy

---

## Architecture

```
+------------------------------------------------------------------+
|                        AGENT SURFACES                             |
|                                                                   |
|   +-------------+   +-------------+   +-----------------+        |
|   |   Claude    |   |  Standalone  |   |   Any LLM      |        |
|   |   Desktop   |   |  AI Agent    |   |   (via MCP)    |        |
|   +------+------+   +------+------ +   +-------+--------+       |
|          |                  |                  |                  |
|     MCP Server        AI SDK (Vercel)    MCP Client              |
|     (stdio/JSON-RPC)  (Anthropic/       (CLI mode)              |
|                         OpenAI/Google)                           |
|          +-----------------+------------------+                  |
|                            |                                     |
|                            v                                     |
|              +------------------------------+                     |
|              |  CAW Agent Wallet            |                     |
|              |  (@agentpay/caw-wallet)      |                     |
|              |                              |                     |
|              |  - x402_request (pay)        |                     |
|              |  - x402_wallet (balance)     |                     |
|              |  - x402_send (transfer)      |                     |
|              +-------------+----------------+                     |
|                            |                                      |
+----------------------------+--------------------------------------+
                             |
                             v
+------------------------------------------------------------------+
|              COBO AGENTIC WALLET (CAW)                            |
|                                                                   |
|   +-----------------+  +---------------+  +------------------+   |
|   | Policy Engine   |  | MPC Signing   |  | Audit Trail      |   |
|   |                 |  |               |  |                  |   |
|   | - Chain/token   |  | - No private  |  | - Every allowed/ |   |
|   |   whitelists    |  |   key exposed |  |   denied op      |   |
|   | - Spending      |  | - Server-side |  |   logged         |   |
|   |   limits        |  |   MPC         |  | - Structured     |   |
|   | - Rolling       |  | - Idempotent  |  |   context        |   |
|   |   budgets       |  |   requests    |  |                  |   |
|   | - Review        |  |               |  |                  |   |
|   |   thresholds    |  |               |  |                  |   |
|   +-----------------+  +---------------+  +------------------+   |
|                                                                   |
+------------------------------+------------------------------------+
                               |
                               v
+------------------------------------------------------------------+
|                     AGENTPAY PLATFORM                            |
|                                                                   |
|   +--------------+  +--------------+  +------------------+       |
|   | x402 Gateway |  |  Resource    |  |  Payment         |       |
|   | (HTTP 402)   |  |  Marketplace |  |  Verification    |       |
|   +------+-------+  +------+-------+  +--------+---------+       |
|          |                  |                   |                 |
|   +------+------------------+-------------------+---------+       |
|   |              Express Backend (TypeScript)              |      |
|   |  - HTTP 402 payment gating                            |      |
|   |  - On-chain payment verification                      |      |
|   |  - Resource marketplace (26+ resources)               |      |
|   |  - MongoDB state management                           |      |
|   +------------------------+-------------------------------+      |
|                            |                                      |
|   +------------------------+-------------------------------+      |
|   |              Next.js Frontend                           |      |
|   |  - Marketplace explorer                                |      |
|   |  - Wallet connect (RainbowKit)                         |      |
|   |  - Creator dashboard                                   |      |
|   +--------------------------------------------------------+      |
|                                                                   |
+------------------------------------------------------------------+
                            |
                            v
                +------------------------+
                |  Ethereum Sepolia Testnet  |
                |                        |
                |  - USDC payments       |
                |  - Chain ID: 11155111  |
                |  - On-chain receipts   |
                |  - CAW wallet ops      |
                +------------------------+
```

---

## Cobo Agentic Wallet (CAW) Integration

> **Track 1, Direction 01: Agent-Native Payments** — Making agents first-class payment participants on the internet.

AgentPay integrates **Cobo Agentic Wallet (CAW)** as the critical payment infrastructure. Every fund operation — from x402 resource payments to peer-to-peer transfers — flows through CAW's API with automatic permission policy evaluation, MPC signing, and complete audit trail.

### How CAW Powers Agent-Native Payments

```
+-----------------+     HTTP 402     +-----------------+     CAW API      +-----------------+
|   Agent (MCP)   | --------------> |  AgentPay       | --------------> |  Cobo Agentic   |
|                 |                  |  x402 Server    |                  |  Wallet (CAW)   |
|  CAW Agent      | <-------------- |                 | <-------------- |                 |
|  Wallet         |   X-PAYMENT     |  Verify on-chain|   tx_hash        |  Policy Engine  |
|                 |   proof + data  |                 |                  |  MPC Signing    |
+-----------------+                 +-----------------+                  +-----------------+
```

**CAW is the critical component — remove it and no payments can happen:**
- **Payment execution**: All transfers route through CAW API (MPC signing, no private keys exposed to the agent)
- **Permission control**: Policy engine enforces spending limits, chain/token whitelists, destination restrictions before every transfer
- **Risk boundaries**: Per-transaction caps, rolling 24h budgets, review thresholds for large payments
- **Auditability**: Full audit trail of every allowed and denied operation with structured context

### The Agent-Native Payment Flow

```
1. Agent requests paid resource -> HTTP 402 Payment Required
2. CAW evaluates permission policies (spending limits, chain/token whitelists)
3. CAW executes USDC transfer (if policy allows; otherwise returns denial reason)
4. Agent retries with payment proof (X-PAYMENT header)
5. Server verifies on-chain -> serves resource
```

### Permission Policies (Risk Boundaries)

| Policy | Value | Risk Boundary |
|--------|-------|---------------|
| Allowed chains | Sepolia only | Agent can't pay on mainnet or other chains |
| Allowed tokens | USDC only | Agent can't drain ETH or other tokens |
| Max per transaction | 10 USDC | Single payment cap |
| Rolling 24h spend | $50 | Daily budget limit |
| Review threshold | $5 | Human-in-the-loop for large payments |
| Destination whitelist | Configurable | Agent can only pay verified recipients |

### Dual Wallet Mode

AgentPay supports two wallet modes for maximum flexibility:

| Mode | When | Signing | Policies | Audit Trail |
|------|------|---------|----------|-------------|
| **CAW** (recommended) | `CAW_API_KEY` + `CAW_WALLET_ID` set | MPC (server-side) | Yes | Yes |
| **Viem** (fallback) | Only `WALLET_PRIVATE_KEY` set | Local private key | No | No |

The CAW mode is the default for the hackathon submission. Set `CAW_API_KEY` and `CAW_WALLET_ID` in your environment to activate it.

### Quick Start with CAW

```bash
# 1. Set environment variables
export CAW_API_KEY="your-cobo-api-key"
export CAW_WALLET_ID="your-wallet-id"
export X402_CHAIN="sepolia"

# 2. Run the CAW demo
cd packages/caw-wallet && pnpm demo

# The demo will:
# - Initialize CAW Agent Wallet
# - Review active permission policies
# - Fund wallet from faucet (testnet)
# - Check balance
# - Simulate an x402 payment
# - Show audit trail
```

📖 **Full CAW documentation**: See [CAW_WORKFLOW.md](./CAW_WORKFLOW.md)

---

## Features

### Agent-Native x402 Payments

- **HTTP 402 Auto-Pay** — Agent receives 402, evaluates policy, pays via CAW, retries with proof
- **Policy-Gated Spending** — Every payment checked against CAW permission policies before execution
- **MPC Signing** — No private key ever exposed to the agent; CAW signs server-side
- **Full Audit Trail** — Every allowed/denied operation logged with amount, recipient, timestamp, policy result

### AI Agent Surfaces

- **MCP Server** (Claude Desktop) — 10 tools for marketplace operations
- **Standalone AI Agent** — Multi-LLM CLI (Anthropic, OpenAI, Google)
- **A2A Protocol** — Agent-to-agent discovery and communication

### Search -> Preview -> Confirm -> Pay -> Deliver

- **Search** — `"find me a weather API"` searches the marketplace
- **Preview** — Shows resource name, description, and price before paying
- **Confirm** — Asks `"Want me to buy Weather API for $0.50 USDC?"` and waits
- **Pay** — Executes on-chain USDC transfer via CAW after policy check
- **Deliver** — Returns the resource content + transaction receipt

### MCP Server (Claude Desktop)

10 tools exposed via Model Context Protocol:

| Tool | Description |
|------|-------------|
| `x402_discover` | Probe any URL for x402 payment support |
| `x402_list_resources` | Browse all digital resources |
| `x402_search_resources` | Search resources by keyword |
| `x402_pay_for_access` | Pay for and access a resource (x402 flow) |
| `x402_request` | Access a free or previously-purchased resource |
| `x402_wallet` | Check CAW wallet balance |
| `x402_send` | Send USDC via CAW to any address |
| `x402_shopping_search` | Search for products/resources |

### A2A Server (Agent-to-Agent)

Discoverable at `/.well-known/agent.json` with:
- JSON-RPC 2.0 endpoint at `/a2a`
- Skills: purchase, resource-access, ap2-shopping

### AP2 Shopping Flow (Google Agent Payments Protocol)

Full mandate-based shopping:
```
IntentMandate (what the agent wants to buy)
    -> CartMandate (itemized cart with W3C PaymentRequest)
        -> PaymentMandate (on-chain tx hash as proof)
            -> PaymentReceipt (verified settlement)
```

### Standalone AI Agent

Multi-LLM CLI agent supporting Anthropic, OpenAI, and Google:
```bash
pnpm agent                          # Interactive mode
pnpm agent "buy me a weather API"   # One-shot mode
```

### Web Platform

- **Explore** — Browse all resources with prices
- **Creator Dashboard** — Manage resources, view orders, analytics
- **Wallet Connect** — RainbowKit integration
- **Creator Profiles** — Public pages with tipping

---

## Monorepo Structure

```
agentpay/
+-- packages/
|   +-- frontend/          Next.js 16 + React 19 + Tailwind 4
|   +-- backend/           Express + MongoDB + A2A + AP2 + x402
|   +-- caw-wallet/        Cobo Agentic Wallet integration (@agentpay/caw-wallet)
|   +-- mcp-client/        MCP server + CLI (agentpay-x402.js)
|   +-- ai-agent/          Standalone AI agent (Anthropic/OpenAI/Google)
|   +-- x402-sdk-eth/      Payment verification SDK (@agentpay/x402-sdk)
|   +-- contracts/         Smart contracts (MockUSDC)
+-- dev.sh                 Start all services
+-- package.json           pnpm workspace root
```

---

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 8+
- MongoDB

### 1. Clone and Install

```bash
git clone https://github.com/AIProjects402/agentpay.git
cd agentpay
pnpm install
```

### 2. Environment Setup

```bash
cp .env.production.example .env
```

Key environment variables:

```bash
# Server
PORT=3001
MONGODB_URI=mongodb://localhost:27017/x402

# Blockchain
X402_CHAIN=sepolia
RPC_URL=https://rpc.sepolia.org
USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

# Cobo Agentic Wallet (RECOMMENDED — Agent-Native Payments mode)
CAW_API_KEY=your-cobo-api-key
CAW_WALLET_ID=your-wallet-id
CAW_API_URL=https://api.agenticwallet.cobo.com
CAW_CHAIN_ID=SETH
CAW_TOKEN_ID=SETH_USDC

# Fallback: Direct wallet (legacy mode without CAW policies)
WALLET_PRIVATE_KEY=0x...

# Auth
JWT_SECRET=your-secret

# LLM (for ai-agent)
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Start Development

```bash
./dev.sh
```

This starts:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Payment Service**: x402 verification

### 4. Claude Desktop Setup

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agentpay-x402": {
      "command": "node",
      "args": ["/path/to/agentpay/packages/mcp-client/agentpay-x402.js"],
      "env": {
        "AGENTPAY_SERVER": "http://localhost:3001",
        "CAW_API_KEY": "your-cobo-api-key",
        "CAW_WALLET_ID": "your-wallet-id",
        "CAW_API_URL": "https://api.agenticwallet.cobo.com",
        "X402_CURRENCY": "USDC",
        "MAX_AUTO_PAYMENT": "10.00"
      }
    }
  }
}
```

Restart Claude Desktop, then ask: *"List all resources on AgentPay"*

### 5. Standalone AI Agent

```bash
pnpm agent                          # Interactive REPL
pnpm agent "show me all resources"  # One-shot
```

---

## x402 Payment Flow with CAW

```
  |                         |                          |                  |
  |  GET /x402/resource/X   |                          |                  |
  |------------------------>|                          |                  |
  |                         |                          |                  |
  |  402 Payment Required   |                          |                  |
  |  {amount, recipient,    |                          |                  |
  |   chainId, payScheme}   |                          |                  |
  |<------------------------|                          |                  |
  |                         |                          |                  |
  |  (preview mode stops    |                          |                  |
  |   here — returns price  |                          |                  |
  |   to user for confirm)  |                          |                  |
  |                         |                          |                  |
  |  CAW: evaluate policy   |                          |                  |
  |  CAW: MPC sign + pay    |                          |                  |
  |  USDC.transfer(to, amt) |                          |                  |
  |-------------------------+------------------------->|                  |
  |                         |                          |                  |
  |                         |        tx confirmed      |                  |
  |                         |<-------------------------|                  |
  |                         |                          |                  |
  |  GET /x402/resource/X   |                          |                  |
  |  X-PAYMENT: {txHash}    |                          |                  |
  |------------------------>|                          |                  |
  |                         |  verify on-chain         |                  |
  |                         |------------------------->|                  |
  |                         |<-------------------------|                  |
  |  200 OK + content       |                          |                  |
  |<------------------------|                          |                  |
```

---

## Agent Discovery

### A2A Agent Card

```bash
curl http://localhost:3001/.well-known/agent.json
```

```json
{
  "name": "agentpay-merchant-agent",
  "url": "http://localhost:3001/a2a",
  "version": "0.3.0",
  "skills": [
    { "id": "purchase", "name": "Product Purchase" },
    { "id": "resource-access", "name": "Resource Access" },
    { "id": "ap2-shopping", "name": "AP2 Shopping Flow" }
  ],
  "extensions": [
    { "uri": "urn:x-a2a:extension:x402-payment" },
    { "uri": "https://github.com/google-agentic-commerce/ap2/v1" }
  ]
}
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 16, React 19, Tailwind 4 | Marketplace, dashboard, creator profiles |
| **Backend** | Express, TypeScript, MongoDB | API, A2A server, AP2 handler, x402 gateway |
| **CAW Wallet** | @agentpay/caw-wallet, viem | Cobo Agentic Wallet integration (MPC, policies, audit) |
| **MCP Client** | Node.js, viem | Claude Desktop integration (10 tools) |
| **AI Agent** | Vercel AI SDK | Multi-LLM CLI agent (Anthropic/OpenAI/Google) |
| **SDK** | @agentpay/x402-sdk | Payment verification middleware |
| **Wallet** | RainbowKit, wagmi | Browser wallet connection |

### Protocols

| Protocol | Purpose | Spec |
|----------|---------|------|
| **x402** | HTTP 402 payment-gated resources | [x402.org](https://x402.org) |
| **A2A** | Agent-to-agent discovery and communication | JSON-RPC 2.0 |
| **AP2** | Mandate-based agent shopping | [google-agentic-commerce/ap2](https://github.com/google-agentic-commerce/ap2) |
| **MCP** | LLM tool integration | [modelcontextprotocol.io](https://modelcontextprotocol.io) |
| **CAW** | Agent wallet with MPC signing and policies | [Cobo Agentic Wallet](https://www.cobo.com/agentic-wallet) |

---

## Network Details

| Property | Value |
|----------|-------|
| **Network** | Ethereum Sepolia Testnet |
| **Chain ID** | 11155111 |
| **USDC Contract** | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| **Token** | USDC (6 decimals) |
| **Explorer** | `https://sepolia.etherscan.io` |
| **Faucet** | Available via CAW API |

---

## API Endpoints

```bash
# Health
GET  /health

# Resources
GET  /x402/resources                    # List all resources
GET  /x402/resource/:slug               # Access resource (402 if unpaid)

# Agent Discovery
GET  /.well-known/agent.json            # A2A Agent Card

# A2A
POST /a2a                               # JSON-RPC 2.0 endpoint

# MCP
POST /mcp/universal                     # MCP server endpoint
```

---

## Demo Scenarios

### 1. Claude Desktop (MCP) — Agent-Native Payment
1. **"List all resources on AgentPay"** — calls `x402_list_resources`
2. **"Access the Advanced Git Workflows guide"** — calls `x402_request`, CAW evaluates policy, pays, returns content
3. **"What's my balance?"** — calls `x402_wallet`, shows CAW wallet balance
4. **"Send 1 USDC to 0x1234..."** — calls `x402_send`, CAW policy check, MPC sign, transfer

### 2. Standalone AI Agent
```bash
$ pnpm agent "buy me a weather API"

  AgentPay Agent v1.0.0
  Wallet Mode: CAW (Cobo Agentic Wallet)
  Wallet: 0x20a0...4F72  |  1,000.00 USDC
  Model: anthropic/claude-sonnet-4-20250514

  > buy me a weather API

  I found the Weather API for $0.50 USDC on Ethereum Sepolia.
  CAW Policy Check: PASSED (within 10 USDC limit, USDC token allowed, Sepolia chain allowed)
  Want me to purchase it?
  > yes

  CAW MPC Signing: Complete
  Paid 0.50 USDC — tx: 0x01e59f01...
  Here's the weather data: { temperature: 72, ... }
```

### 3. CAW Demo Script
```bash
cd packages/caw-wallet && pnpm demo
```
Walks through: initialize wallet -> review policies -> fund from faucet -> check balance -> simulate x402 payment -> show audit trail

### 4. AI as Creator (Agent-Generated Content)
An AI agent autonomously creates and sells content on the marketplace:
1. Agent writes a guide, dataset, or code template
2. Agent lists it on AgentPay with a title, description, and price
3. Other agents and humans discover it via search or browse
4. Buyers pay USDC via CAW -> content delivered -> creator agent earns revenue

---

## Judging Criteria Alignment

| Criterion | How AgentPay Addresses It |
|-----------|--------------------------|
| **Scenario Fit** | x402 + CAW is the most natural fit for Direction 01: Agent-Native Payments — every action is an agent paying for something autonomously |
| **CAW Criticality** | CAW is not a wrapper — it is the only way funds move. Remove CAW and no payment can execute (no MPC signing, no policy engine, no audit trail) |
| **Funding Flow Completeness** | Full loop: discover resource -> HTTP 402 -> CAW policy check -> MPC sign -> on-chain transfer -> verify -> deliver content |
| **Demo Quality** | Three demo surfaces: MCP (Claude Desktop), CLI agent, CAW demo script — all showing real CAW policy evaluation and MPC signing |
| **Risk Boundary Explanation** | Permission policies table above + code-level policy checks + CAW audit trail showing every allowed/denied operation |

---

## Security

- **CAW MPC Signing** — No private key exposed to agent; all signing via Cobo's server-side MPC
- **Permission Policies** — Chain/token whitelists, spending caps, rolling budgets, review thresholds
- **Spending caps** — `MAX_AUTO_PAYMENT` limits per-transaction spend
- **Confirmation flow** — Agent previews price and asks before paying
- **Time-bounded** — 15-minute payment windows
- **Audit trail** — Every CAW operation logged with amount, recipient, timestamp, policy result

---

## Links

| Resource | URL |
|----------|-----|
| **Live Demo** | Coming soon |
| **GitHub** | [AIProjects402/agentpay](https://github.com/AIProjects402/agentpay) |
| **Cobo Agentic Wallet** | [cobo.com/agentic-wallet](https://www.cobo.com/agentic-wallet) |
| **x402 Protocol** | [x402.org](https://x402.org) |
| **MCP Docs** | [modelcontextprotocol.io](https://modelcontextprotocol.io) |
| **AP2 Spec** | [google-agentic-commerce/ap2](https://github.com/google-agentic-commerce/ap2) |

---

<div align="center">

**AgentPay** — Making Agents First-Class Payment Participants on the Internet

Built for AI x Web3 Agentic Builders Hackathon 2026

</div>
