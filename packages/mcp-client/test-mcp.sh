#!/bin/bash

# Test MCP Client for Claude Desktop

echo "Testing agentpay-x402 MCP client..."
echo ""

# Set environment — Default to Ethereum Sepolia testnet
export AGENTPAY_SERVER="http://localhost:3001"
export X402_CHAIN="sepolia"
export X402_CURRENCY="USDC"
export MAX_AUTO_PAYMENT="10.00"

# CAW mode (recommended) — uncomment and set your credentials:
# export CAW_API_KEY="your-caw-api-key"
# export CAW_WALLET_ID="your-caw-wallet-uuid"

# OR viem mode (legacy) — uncomment and set your private key:
# export WALLET_PRIVATE_KEY="0x..."

# Start MCP server in background
node agentpay-x402.js > /tmp/mcp-output.log 2>&1 &
MCP_PID=$!

echo "MCP server started (PID: $MCP_PID)"
sleep 2

# Check stderr for startup logs
echo ""
echo "Startup logs:"
head -20 /tmp/mcp-output.log 2>/dev/null || echo "No logs yet"

# Kill MCP server
kill $MCP_PID 2>/dev/null

echo ""
echo "MCP client test complete!"
echo ""
echo "To use with Claude Desktop:"
echo "  1. Make sure backend is running: ./dev.sh"
echo "  2. Restart Claude Desktop (Cmd+Q, then reopen)"
echo "  3. In Claude, ask: 'List available x402 resources'"
