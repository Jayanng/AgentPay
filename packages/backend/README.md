# AgentPay Backend

A backend service for agent-native commerce using the HTTP 402 Payment Required protocol for cryptocurrency payments (USDC on EVM chains) via x402, with MCP and A2A protocol support.

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Setup Environment
Create a `.env` file:
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/agentpay

# Authentication
JWT_SECRET=your-secret-key

# Server
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
PORT=3001
```

### 3. Start Development Server
```bash
pnpm run dev
```

## Overview

AgentPay enables AI agents to discover, purchase, and access digital resources using USDC payments on EVM-compatible chains. The backend implements:

- **x402 Protocol**: HTTP 402 Payment Required flow for resource access
- **MCP Server**: Model Context Protocol for AI agent tool integration
- **A2A Protocol**: Agent-to-Agent communication with well-known agent cards
- **Resource Management**: CRUD for digital resources (APIs, files, articles, agents)

## Architecture

### Tech Stack
- **Framework**: Express.js (Node.js, ESM)
- **Database**: MongoDB (Mongoose ODM)
- **Payments**: EVM chains (USDC via ERC-20)
- **Protocols**: HTTP 402 + MCP (JSON-RPC 2.0) + A2A

### Key Packages
- `packages/backend` — API server (this package)
- `packages/frontend` — Next.js dashboard and marketplace
- `packages/x402-sdk-eth` — x402 SDK for EVM chains
- `packages/mcp-client` — MCP client for AI agents
- `packages/ai-agent` — Standalone AI agent
- `packages/caw-wallet` — Cobo Agentic Wallet integration

## API Endpoints

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/nonce` | Get sign-in nonce |
| POST | `/api/auth/verify` | Verify wallet signature |

### Resources
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/resources` | List resources (public) |
| POST | `/api/resources` | Create resource (auth) |
| GET | `/api/resources/:id` | Get resource |
| PUT | `/api/resources/:id` | Update resource (auth) |
| DELETE | `/api/resources/:id` | Delete resource (auth) |
| POST | `/api/upload` | Upload file resource (auth) |

### x402 Gateway
| Method | Path | Description |
|--------|------|-------------|
| GET | `/x402/resources` | Discover public resources |
| GET | `/x402/resource/:id` | Access resource (402 flow) |

### Explore
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/explore` | Public marketplace overview |

### Creators
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/creators` | List creators |
| GET | `/api/creators/:username` | Get creator profile |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/overview` | Earnings & stats (auth) |
| GET | `/api/analytics/earnings` | Transaction history (auth) |
| GET | `/api/analytics/chart` | Time-series chart data (auth) |

### MCP Server
| Method | Path | Description |
|--------|------|-------------|
| POST | `/mcp` | MCP JSON-RPC 2.0 endpoint |

### A2A Protocol
| Method | Path | Description |
|--------|------|-------------|
| GET | `/.well-known/agent.json` | Agent card |
| POST | `/a2a` | A2A task handling |

## x402 Payment Flow

The x402 protocol uses HTTP 402 to gate paid content:

1. **Client requests resource** → Server returns `402 Payment Required` with payment details
2. **Client sends USDC on-chain** → ERC-20 transfer to the specified recipient
3. **Client retries with payment proof** → Includes `X-PAYMENT` header with tx hash
4. **Server verifies on-chain** → Serves the resource content

## MCP Tools

The MCP server exposes these tools for AI agents:

| Tool | Description |
|------|-------------|
| `x402_discover` | Probe a URL for x402 support |
| `x402_list_resources` | List available resources |
| `x402_request` | Access a resource (auto-pays if 402) |
| `x402_pay_for_access` | Pay for and retrieve resource content |

## Database Models

### Creator
Wallet-based identity with username, avatar, bio, and social links.

### Resource
Digital resources with type (api, file, article, agent), pricing, and access control.

### AccessLog
Tracks every resource access with payment verification and timestamp.

### AuthNonce
Ephemeral nonces for wallet-based authentication.

## Environment Variables

```bash
# Required
MONGODB_URI=mongodb://localhost:27017/agentpay
JWT_SECRET=your-secret-key
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Optional
PORT=3001
```

## Development

```bash
# Run in development mode
pnpm run dev

# Build for production
pnpm run build

# Run tests
pnpm run test
```
