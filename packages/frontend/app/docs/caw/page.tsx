"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CAWWalletSetupPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3">Cobo Agentic Wallet (CAW) Setup</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          AgentPay uses Cobo Agentic Wallet as the primary wallet for all agent-native payment operations. CAW provides MPC-based transaction signing with automatic permission policy evaluation — enabling safe, autonomous agent payments.
        </p>
      </div>

      {/* Why CAW */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Why CAW?</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Permission Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Every payment request is evaluated against CAW Pact policies — spending limits, chain/token whitelists, and destination restrictions. Agents can only spend within defined boundaries.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">MPC Security</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Transactions are signed using Multi-Party Computation (MPC). Private keys are never exposed to the agent or the application — CAW handles signing securely.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All agent-initiated payments are logged with full transaction details, policy evaluations, and approval/denial records. Complete visibility into agent spending.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Auto-Payment Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                When an AI agent encounters an HTTP 402 response, the MCP client automatically routes payment through CAW. If the policy allows it, the transaction is signed and submitted — zero human intervention.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Setup Steps */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Setup Guide</h2>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline" className="font-mono">1</Badge>
                Install CAW CLI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                <code>npm install -g @cobo/agentic-wallet-cli</code>
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline" className="font-mono">2</Badge>
                Onboard Your Agent Wallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                <code>caw onboard --wait</code>
              </pre>
              <p className="text-sm text-muted-foreground mt-2">
                This creates your agent wallet on the Cobo platform and waits for the onboarding transaction to complete.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline" className="font-mono">3</Badge>
                Get Your API Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                <code>caw wallet current --show-api-key</code>
              </pre>
              <p className="text-sm text-muted-foreground mt-2">
                This returns your CAW API key and wallet ID. You will need both for the environment configuration.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline" className="font-mono">4</Badge>
                Configure Environment Variables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Add the following to your <code className="bg-muted px-1 rounded">.env.production</code> file:
              </p>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`# CAW Configuration
CAW_API_KEY=your-caw-api-key
CAW_WALLET_ID=your-caw-wallet-uuid
CAW_API_URL=https://api.agenticwallet.cobo.com
CAW_CHAIN_ID=SETH
CAW_TOKEN_ID=SETH_USDC`}
              </pre>
              <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-xs font-bold text-primary mb-1">Chain IDs for CAW</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li><code className="bg-muted px-1 rounded">SETH</code> — Ethereum Sepolia</li>
                  <li><code className="bg-muted px-1 rounded">SETH_USDC</code> — USDC on Sepolia</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline" className="font-mono">5</Badge>
                Set Permission Policies (Pacts)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Define spending boundaries for your agent using CAW Pacts:
              </p>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`# Set a spending limit
caw pact create \\
  --type spending-limit \\
  --max-amount 10.00 \\
  --token USDC \\
  --period daily

# Whitelist allowed chains
caw pact create \\
  --type chain-whitelist \\
  --chains sepolia

# Restrict payment destinations
caw pact create \\
  --type destination-whitelist \\
  --addresses 0xRecipient1,0xRecipient2`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Payment Flow */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Payment Flow with CAW</h2>
        <div className="bg-muted/50 border rounded-xl p-6">
          <div className="space-y-3 text-sm font-mono">
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5 shrink-0">1</Badge>
              <span>AI Agent calls <code className="bg-muted px-1 rounded">x402_request</code> via MCP</span>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5 shrink-0">2</Badge>
              <span>Server returns HTTP 402 + payment requirements</span>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5 shrink-0">3</Badge>
              <span>MCP client detects CAW mode, routes payment to CAW API</span>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5 shrink-0">4</Badge>
              <span>CAW evaluates Pact policies (spending limit, chain, destination)</span>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5 shrink-0">5</Badge>
              <span>If approved: CAW signs via MPC, submits on-chain transaction</span>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5 shrink-0">6</Badge>
              <span>Server verifies on-chain payment, delivers resource content</span>
            </div>
          </div>
        </div>
      </section>

      {/* Fallback Mode */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Viem Fallback Mode</h2>
        <p className="text-muted-foreground leading-relaxed">
          If CAW credentials are not configured (<code className="bg-muted px-1 rounded">CAW_API_KEY</code> + <code className="bg-muted px-1 rounded">CAW_WALLET_ID</code>), AgentPay falls back to Viem mode using a local private key. This mode is intended for local development only — it does not include CAW&apos;s permission policy engine or MPC security. For production agent-native payments, always use CAW mode.
        </p>
      </section>

      {/* CAW API Reference */}
      <section>
        <h2 className="text-2xl font-bold mb-4">CAW API Reference</h2>
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono">GET /wallet/balances</CardTitle>
              <CardDescription>Get all token balances for the agent wallet</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono">POST /wallet/transfer</CardTitle>
              <CardDescription>Transfer tokens to a destination address (subject to Pact policies)</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono">POST /wallet/faucet</CardTitle>
              <CardDescription>Request testnet tokens from the CAW faucet</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono">GET /pact/list</CardTitle>
              <CardDescription>List all permission policies (Pacts) for the wallet</CardDescription>
            </CardHeader>
          </Card>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Base URL: <code className="bg-muted px-1 rounded">https://api.agenticwallet.cobo.com</code>
        </p>
      </section>
    </div>
  );
}
