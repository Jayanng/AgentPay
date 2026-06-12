#!/usr/bin/env bash
# ──────────────────────────────────────────────
#  AgentPay Dev — starts all services
# ──────────────────────────────────────────────
set -e

# Kill any processes already using our ports
for port in 3000 3001; do
  pid=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo "  Killing process on port $port (pid $pid)"
    kill -9 $pid 2>/dev/null || true
  fi
done

# Build SDK if dist doesn't exist
if [ ! -f "packages/x402-sdk-eth/dist/index.js" ]; then
  echo "  Building x402-sdk-eth..."
  cd packages/x402-sdk-eth && npx tsup src/index.ts --format cjs,esm && cd ../..
fi

echo ""
echo "  ┌──────────────────────────────────────┐"
echo "  │  AgentPay Dev                        │"
echo "  ├──────────────────────────────────────┤"
echo "  │  Frontend        http://localhost:3000│"
echo "  │  Backend API     http://localhost:3001│"
echo "  │  AI Agent        pnpm agent           │"
echo "  └──────────────────────────────────────┘"
echo ""

exec npx concurrently \
  -n "backend,frontend,sdk" \
  -c "blue,yellow,magenta" \
  --kill-others-on-fail \
  "pnpm --filter backend run dev" \
  "pnpm --filter frontend run dev" \
  "pnpm --filter @agentpay/x402-sdk run dev"
