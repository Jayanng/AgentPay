# AgentPay MCP Client - Demo Setup

## Quick Setup for Claude Desktop (Localhost Demo)

### 1. Find Your Claude Desktop Config

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```bash
~/.config/Claude/claude_desktop_config.json
```

### 2. Add AgentPay MCP Server

Open `claude_desktop_config.json` and add:

```json
{
  "mcpServers": {
    "agentpay-x402": {
      "command": "node",
      "args": [
        "./packages/mcp-client/agentpay-x402.js"
      ],
      "env": {
        "AGENTPAY_SERVER": "http://localhost:3001",
        "X402_CHAIN": "sepolia",
        "X402_CURRENCY": "USDC",
        "MAX_AUTO_PAYMENT": "10.00",
        "CAW_API_KEY": "your-caw-api-key",
        "CAW_WALLET_ID": "your-caw-wallet-uuid"
      }
    }
  }
}
```

**Important:** Update the `args` path to match your actual project location!

For CAW mode (recommended): Set `CAW_API_KEY` and `CAW_WALLET_ID` — all payments route through Cobo Agentic Wallet with permission policies.

For viem mode (legacy): Set `WALLET_PRIVATE_KEY` instead.

### 3. Restart Claude Desktop

Close and reopen Claude Desktop completely.

### 4. Verify Connection

In Claude Desktop, try these prompts:

```
Can you show me what's available on AgentPay?
```

```
List all resources on AgentPay
```

```
What resources cost less than $1?
```

## Available MCP Tools

Once configured, Claude can use these tools:

- `x402_discover` - Discover platform overview and supported networks
- `x402_list_resources` - Browse APIs, files, articles for sale
- `x402_pay_for_access` - Pay for and access a resource (x402 flow)
- `x402_request` - Access a purchased/free resource
- `x402_wallet` - Check wallet balance
- `x402_send` - Send crypto payments
- `x402_shopping_search` - Search for products/resources

## Demo Workflow

### Example 1: Discover and Browse
```
Agent: "Show me what's available on AgentPay"
(Uses x402_discover)

Agent: "List all API resources under $1"
(Uses x402_list_resources, filters by price)
```

### Example 2: Purchase Resource
```
Agent: "I want to buy the Weather API"
(Uses x402_list_resources to find it)
(Uses x402_pay_for_access to purchase with CAW or viem)
(Shows transaction hash and explorer link)
```

### Example 3: Check Wallet
```
Agent: "What's my USDC balance?"
(Uses x402_wallet)

Agent: "Do I have enough to buy the premium API?"
(Checks balance, compares to price)
```

## Troubleshooting

### Tools Not Showing Up
1. Make sure Claude Desktop is completely restarted
2. Check the path to `agentpay-x402.js` is correct
3. Verify Node.js is installed: `node --version`

### Connection Errors
1. Ensure local server is running: `./dev.sh`
2. Check server is accessible: `curl http://localhost:3001/health`
3. Verify backend and frontend are both running

### Payment Errors
1. Check wallet has USDC balance (or CAW wallet is funded)
2. Verify network is `sepolia` (Ethereum Sepolia testnet)
3. For viem mode: ensure `WALLET_PRIVATE_KEY` is set correctly
4. For CAW mode: ensure `CAW_API_KEY` and `CAW_WALLET_ID` are set

## Security Note

For production:
- Use CAW mode (Cobo Agentic Wallet) for policy-controlled payments
- Set MAX_AUTO_PAYMENT to a safe limit
- Monitor transactions via CAW audit logs
