# AgentPay Frontend — Agent-Native Payment Platform

A modern web application for creators and API providers to monetize digital resources using agent-native payments via the HTTP 402 (x402) protocol, with all fund operations routed through Cobo Agentic Wallet (CAW).

## Overview

The frontend provides a user-friendly interface for:

- Creating and managing paid resources (APIs, files, articles) protected by x402
- Configuring payment requirements (amount, network, token)
- Monitoring AI agent purchases and payment transactions
- Managing Cobo Agentic Wallet (CAW) permission policies
- Viewing analytics and revenue dashboards

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components (Card, Button, Input, etc.)
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useEffect)
- **Wallet Integration**: Cobo Agentic Wallet (CAW) via x402 protocol
- **Storage**: Browser localStorage

## Pages & Routes

### 1. Home Page (`/`)

**Purpose**: Landing page that introduces AgentPay to creators and API providers.

**Features**:
- Hero section highlighting agent-native payments via x402 + CAW
- Feature highlights (Cobo Agentic Wallet integration, HTTP 402 protocol, AI agent discovery)
- Benefits section explaining autonomous payment flows
- Call-to-action buttons for getting started

**Key Sections**:
- **Headline**: "Agent-Native Payments with x402"
- **Tagline**: Let AI agents discover and pay for your resources autonomously
- **Benefits**:
  - Autonomous Agent Payments
  - CAW Permission Policies
  - 2-Minute Setup
- **Feature Grid**:
  - Expand Revenue Streams
  - Zero Integration Hassle
  - Cobo Agentic Wallet

**User Flow**: Users arrive here, learn about the platform, and click "Get Started" to create their account.

---

### 2. Onboarding Page (`/onboarding`)

**Purpose**: First step of onboarding — set up your AgentPay creator profile.

**Features**:
- Choose a username and display name
- Set up your public profile
- Navigate to dashboard after completion

---

### 3. Dashboard — Resources (`/dashboard/resources`)

**Purpose**: Create and manage paid resources that AI agents can discover and purchase.

**Resource Types**:
- **API**: REST endpoints with x402 payment gating
- **File**: Downloadable content (PDFs, datasets, code)
- **Article**: Premium blog posts or documentation
- **Agent**: Agent service endpoints with x402 payment gating

Each resource card shows:
- Resource type icon
- Name and description
- Price in USDC
- Network (Sepolia, etc.)
- Number of purchases

---

### 4. Dashboard — Analytics (`/dashboard/analytics`)

**Purpose**: Overview of payment activity, revenue, and agent interactions.

**Metrics**:
- Total revenue (USDC)
- Active resources
- Agent purchases
- Payment success rate

---

### 6. Documentation (`/docs/*`)

**Purpose**: Developer documentation for integrating with AgentPay.

**Sections**:
- **Quick Start**: Get up and running with x402
- **SDK Reference**: x402 SDK for EVM chains
- **REST API**: Backend API documentation
- **AI Agent Payments**: How AI agents use x402
- **MCP Server**: Model Context Protocol integration
- **Skills Reference**: Available MCP tools
- **CAW Wallet Setup**: Cobo Agentic Wallet configuration

## Architecture

```
AI Agent → MCP Client → x402 HTTP 402 → AgentPay Backend → CAW API → Blockchain
                                          ↓
                                    Payment Verification
                                    Resource Delivery
```

### Payment Flow

1. AI agent discovers a resource via MCP tools (`x402_list_resources`)
2. Agent requests access (`x402_request`)
3. Server returns HTTP 402 with payment requirements
4. MCP client routes payment through CAW (if configured) or viem wallet
5. CAW evaluates permission policies (spending limits, chain/token whitelists)
6. If approved, CAW signs and submits the transaction
7. Server verifies on-chain payment
8. Resource content is delivered to the agent

## Environment Variables

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# Chain configuration
NEXT_PUBLIC_X402_CHAIN=sepolia
NEXT_PUBLIC_X402_CURRENCY=USDC

# WalletConnect (for browser wallet connection)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
```

## Running the Frontend

### Prerequisites
- Node.js 18+
- pnpm

### Setup

1. Install dependencies:
```bash
pnpm install
```

2. Start development server:
```bash
pnpm dev
```

Frontend will run on `http://localhost:3000`

3. Build for production:
```bash
pnpm build
pnpm start
```

## Key Features

### Cobo Agentic Wallet (CAW) Integration
- All agent payments route through CAW with automatic permission policy evaluation
- Spending limits, chain/token whitelists, and destination restrictions
- MPC-based transaction signing without exposing private keys
- Full audit trail of all agent-initiated payments

### x402 Protocol
- Standard HTTP 402 Payment Required responses
- Clients auto-pay and retry — seamless agent experience
- Supports exact, spay (AgentPay scheme), and upto billing modes
- On-chain payment verification before resource delivery

### Multi-Chain Support
- Ethereum Sepolia (default testnet)
- Base, Polygon, Arbitrum, Optimism, Cronos, Mantle
- Easy chain switching via environment variables

### Security
- CAW permission policies prevent unauthorized spending
- On-chain payment verification with confirmation checks
- JWT-based authentication for dashboard access
- CORS protection for API endpoints
