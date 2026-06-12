# AGENTPAY x402 - MCP Client for AI Agents


## Features

- 💳 **x402 Payments** - Automatic payment handling for paid APIs and content
- 🔍 **Resource Discovery** - Find paid APIs, files, articles, and agent services
- 💰 **Wallet Management** - Check balances, send USDC
- 🔐 **CAW Support** - Cobo Agentic Wallet integration with MPC signing and permission policies

## Installation

```bash
cd packages/mcp-client
npm install
```

## Configuration for Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agentpay-x402": {
      "command": "node",
      "args": ["/absolute/path/to/agentpay/packages/mcp-client/agentpay-x402.js"],
      "env": {
        "AGENTPAY_SERVER": "http://localhost:3001",
        "WALLET_PRIVATE_KEY": "0xYourPrivateKeyHere",
        "X402_CHAIN": "sepolia",
        "X402_CURRENCY": "USDC",
        "MAX_AUTO_PAYMENT": "10.00",
        "CAW_API_KEY": "your-caw-api-key",
        "CAW_WALLET_ID": "your-caw-wallet-id"
      }
    }
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AGENTPAY_SERVER` | AgentPay backend server URL | `http://localhost:3001` |
| `WALLET_PRIVATE_KEY` | Ethereum private key (with 0x prefix) | Required for payments (not needed in CAW mode) |
| `X402_CHAIN` | Network (`sepolia`, `mainnet`, etc.) | `sepolia` |
| `X402_CURRENCY` | Payment currency (`USDC`, `USDT`, `DAI`) | `USDC` |
| `MAX_AUTO_PAYMENT` | Maximum USDC amount agent can pay automatically | `10.00` |
| `CAW_API_KEY` | Cobo Agentic Wallet API key | Optional — enables CAW mode |
| `CAW_WALLET_ID` | Cobo Agentic Wallet ID | Optional — enables CAW mode |

## Available Tools

### Discovery
- `x402_discover` - Check if a URL supports x402 payments
- `x402_list_resources` - List all public resources (APIs, files, articles, agent services)

### Resource Access
- `x402_pay_for_access` - Pay for and access a resource (x402 payment flow)
- `x402_request` - Make API requests (auto-pays on HTTP 402)

### Payments
- `x402_wallet` - Check CAW or viem wallet balance
- `x402_send` - Send USDC to any address

---

## Test Examples for Claude

Copy these prompts into Claude to test the MCP client:

### 1. Check Wallet Balance
```
Check my AgentPay wallet balance
```

### 2. List Available Resources
```
Show me the available resources on AgentPay
```

### 3. Check Payment Requirements
```
Discover if http://localhost:3001/x402/resource/market-data supports x402 payments
```

### 4. Access a Paid Resource
```
Access the resource "market-data" on AgentPay (it costs 0.50 USDC)
```

---

## Example Claude Conversations

### Conversation 1: Explore and Access
```
User: What resources are available on AgentPay?

Claude: [Uses x402_list_resources]
I found 3 resources:
1. **Market Data API** - $0.50 USDC (API)
2. **Smart Contract Audit Checklist** - $2.00 USDC (File)
3. **AI Agent Development Guide** - $1.00 USDC (Article)

User: Access the Market Data API for me.

Claude: [Uses x402_request]
This API requires 0.50 USDC payment. I'll pay and access it...

✅ Paid 0.50 USDC
TX: 0x...

Here's the data: {"AAPL": 187.42, "GOOGL": 142.56...}
```

### Conversation 2: Access Paid Content
```
User: Can you access the article "AI Agent Development Guide" on AgentPay?

Claude: [Uses x402_discover, then x402_request]
This article requires 1.00 USDC payment. I'll pay and access it...

✅ Paid 1.00 USDC
TX: 0x...

Here's the content: [article content]
```

---

## Token Information

**USDC** is a USD-backed stablecoin:
- Contract: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- Decimals: 6
- Network: Ethereum Sepolia
- Chain ID: 11155111

---

## Troubleshooting

### "No wallet configured"
Set the `WALLET_PRIVATE_KEY` environment variable with your Ethereum private key, or configure `CAW_API_KEY` and `CAW_WALLET_ID` for CAW mode.

### "Payment failed: insufficient funds"
Make sure your wallet has enough USDC tokens and ETH for gas fees.

### "Failed to connect to server"
Ensure the AgentPay backend is running at the URL specified in `AGENTPAY_SERVER`.

---

## License

MIT
