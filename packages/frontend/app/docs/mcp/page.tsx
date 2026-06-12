"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Copy, Check } from "lucide-react";
import { useState } from "react";

function CodeBlock({ code, language = "typescript" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={copyToClipboard}
        className="absolute right-4 top-4 p-2 rounded-lg bg-muted hover:bg-muted/80 transition-all opacity-0 group-hover:opacity-100 z-10"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
      </button>
      <pre className="bg-muted p-6 rounded-xl overflow-x-auto text-sm border border-border">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
}

export default function MCPDocsPage() {
  return (
    <div>
      <div>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold mb-6">
            <Zap className="h-4 w-4" />
            MCP Server
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            Model Context Protocol
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            Enable AI agents like Claude to discover and pay for resources on AgentPay using the Model Context Protocol (MCP)
          </p>
        </div>

        <div className="space-y-8">
          {/* What is MCP */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-2xl">What is MCP?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Model Context Protocol (MCP) is an open standard that enables AI agents to securely interact with external tools and services.
              </p>
              <p>
                Think of it as &quot;APIs for AI&quot; — MCP allows agents to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Discover available tools and resources</li>
                <li>Execute actions (like making payments)</li>
                <li>Retrieve data from external systems</li>
                <li>All through a standardized JSON-RPC 2.0 interface</li>
              </ul>
              <p className="pt-4">
                <strong className="text-foreground">AgentPay&apos;s MCP server</strong> exposes payment-enabled resource access tools that agents can use autonomously via the x402 protocol and Cobo Agentic Wallet.
              </p>
            </CardContent>
          </Card>

          {/* Setup */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-2xl">Installation & Setup</CardTitle>
              <CardDescription className="text-muted-foreground">
                Configure Claude Desktop to use AgentPay&apos;s MCP server
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Step 1: Locate MCP Client</h3>
                <p className="text-muted-foreground mb-3">
                  The MCP client is located at <code className="bg-muted px-2 py-1 rounded">packages/mcp-client/agentpay-x402.js</code>
                </p>
                <CodeBlock code={`cd packages/mcp-client
pnpm install`} language="bash" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Step 2: Configure Claude Desktop</h3>
                <p className="text-muted-foreground mb-3">
                  Edit your Claude Desktop configuration file:
                </p>
                <div className="space-y-2 mb-3">
                  <p className="text-sm text-muted-foreground">
                    • macOS: <code className="bg-muted px-2 py-1 rounded">~/Library/Application Support/Claude/claude_desktop_config.json</code>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • Windows: <code className="bg-muted px-2 py-1 rounded">%APPDATA%\Claude\claude_desktop_config.json</code>
                  </p>
                </div>
                <CodeBlock code={`{
  "mcpServers": {
    "agentpay": {
      "command": "node",
      "args": [
        "/absolute/path/to/agentpay/packages/mcp-client/agentpay-x402.js"
      ],
      "env": {
        "AGENTPAY_SERVER": "http://localhost:3001",
        "WALLET_PRIVATE_KEY": "0xYourPrivateKeyHere",
        "X402_CHAIN": "sepolia",
        "MAX_AUTO_PAYMENT": "10.00",
        "CAW_API_KEY": "your-caw-api-key",
        "CAW_WALLET_ID": "your-caw-wallet-id"
      }
    }
  }
}`} language="json" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Step 3: Restart Claude</h3>
                <p className="text-muted-foreground">
                  Quit Claude Desktop completely and relaunch it. You should see MCP tools available in the chat interface.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Options */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-2xl">Configuration Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-bold text-foreground mb-2">AGENTPAY_SERVER</h4>
                  <p className="text-muted-foreground mb-1">URL of your AgentPay backend server</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded">http://localhost:3001</code>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-bold text-foreground mb-2">WALLET_PRIVATE_KEY</h4>
                  <p className="text-muted-foreground mb-1">Ethereum wallet private key (with 0x prefix) — not needed in CAW mode</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded">0x...</code>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-bold text-foreground mb-2">X402_CHAIN</h4>
                  <p className="text-muted-foreground mb-1">EVM network to use for payments</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded">sepolia</code> or <code className="text-sm bg-muted px-2 py-1 rounded">base</code> or <code className="text-sm bg-muted px-2 py-1 rounded">polygon</code>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-bold text-foreground mb-2">CAW_API_KEY / CAW_WALLET_ID</h4>
                  <p className="text-muted-foreground mb-1">Cobo Agentic Wallet credentials (enables CAW mode with MPC signing and permission policies)</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded">Optional — enables policy-gated payments</code>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-bold text-foreground mb-2">MAX_AUTO_PAYMENT</h4>
                  <p className="text-muted-foreground mb-1">Maximum amount (in USDC) agent can pay automatically</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded">10.00</code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Tools */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-2xl">Available MCP Tools</CardTitle>
              <CardDescription className="text-muted-foreground">
                Tools exposed by the AgentPay MCP server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  {
                    name: "x402_wallet",
                    description: "Check ETH and USDC token balance",
                    example: "Check my wallet balance"
                  },
                  {
                    name: "x402_discover",
                    description: "Discover if a URL supports x402 payments",
                    example: "Does https://api.example.com/data support x402?"
                  },
                  {
                    name: "x402_list_resources",
                    description: "List all payment-gated resources (APIs, files, articles)",
                    example: "Show me available resources on AgentPay"
                  },
                  {
                    name: "x402_request",
                    description: "Access paid content — auto-pays if HTTP 402 returned",
                    example: "Access the market-data API resource"
                  },
                  {
                    name: "x402_send",
                    description: "Send USDC payment to an address",
                    example: "Send 0.50 USDC to 0x1234..."
                  }
                ].map((tool, index) => (
                  <div key={index} className="border-l-4 border-primary pl-4">
                    <h4 className="font-bold text-foreground mb-2 font-mono">{tool.name}</h4>
                    <p className="text-muted-foreground mb-2">{tool.description}</p>
                    <div className="bg-muted p-3 rounded-lg border border-border">
                      <p className="text-sm text-muted-foreground">Example prompt:</p>
                      <p className="text-sm text-foreground mt-1">&quot;{tool.example}&quot;</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Example Conversation */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-2xl">Example Conversation with Claude</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <p className="text-sm text-muted-foreground mb-1">You:</p>
                  <p className="text-foreground">&quot;Check my AgentPay wallet balance&quot;</p>
                </div>

                <div className="bg-primary/10 border-l-4 border-primary p-4 rounded-r-lg">
                  <p className="text-sm text-muted-foreground mb-1">Claude:</p>
                  <p className="text-foreground">Your AgentPay wallet has:</p>
                  <ul className="text-foreground mt-2 space-y-1">
                    <li>• 50.25 USDC ($50.25 USD)</li>
                    <li>• 0.15 ETH (for gas fees)</li>
                  </ul>
                </div>

                <div className="bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <p className="text-sm text-muted-foreground mb-1">You:</p>
                  <p className="text-foreground">&quot;Show me available resources on AgentPay&quot;</p>
                </div>

                <div className="bg-primary/10 border-l-4 border-primary p-4 rounded-r-lg">
                  <p className="text-sm text-muted-foreground mb-1">Claude:</p>
                  <p className="text-foreground">I found 3 resources:</p>
                  <ul className="text-foreground mt-2 space-y-2">
                    <li>1. Market Data API — $0.50 (API)</li>
                    <li>2. Smart Contract Audit Checklist — $2.00 (File)</li>
                    <li>3. AI Agent Development Guide — $1.00 (Article)</li>
                  </ul>
                </div>

                <div className="bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <p className="text-sm text-muted-foreground mb-1">You:</p>
                  <p className="text-foreground">&quot;Access the Market Data API&quot;</p>
                </div>

                <div className="bg-primary/10 border-l-4 border-primary p-4 rounded-r-lg">
                  <p className="text-sm text-muted-foreground mb-1">Claude:</p>
                  <p className="text-foreground">Payment complete! Resource accessed.</p>
                  <ul className="text-foreground mt-2 space-y-1">
                    <li>• Paid: 0.50 USDC via CAW</li>
                    <li>• Tx: 0xabc123... on Ethereum Sepolia</li>
                    <li>{"• Data: {\"AAPL\": 187.42, \"GOOGL\": 142.56...}"}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-2xl">Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground mb-2">MCP tools not appearing?</p>
                <p>Make sure you&apos;ve completely quit and restarted Claude Desktop. Check the Console app (macOS) or Event Viewer (Windows) for error messages.</p>
              </div>

              <div>
                <p className="font-semibold text-foreground mb-2">Connection errors?</p>
                <p>Verify that your AgentPay backend is running on the specified port (default: 3001) and that the AGENTPAY_SERVER URL is correct.</p>
              </div>

              <div>
                <p className="font-semibold text-foreground mb-2">Payment failures?</p>
                <p>Ensure your wallet has both USDC tokens for payment AND ETH for gas fees. Check that you&apos;re on the correct network (sepolia for testnet). If using CAW, verify your API key and wallet ID.</p>
              </div>

              <div>
                <p className="font-semibold text-foreground mb-2">Wallet balance showing 0?</p>
                <p>Verify that WALLET_PRIVATE_KEY is correctly set and includes the 0x prefix. Make sure the wallet has been funded with USDC and ETH. In CAW mode, check that CAW_API_KEY and CAW_WALLET_ID are set.</p>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-2xl">Security Considerations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-primary font-bold">!</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Use CAW for Policy-Gated Payments</p>
                  <p>Cobo Agentic Wallet provides MPC signing, permission policies (spending limits, chain/token whitelists), and full audit trail. No private key is ever exposed to the agent.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-primary font-bold">!</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Set Payment Limits</p>
                  <p>Always configure MAX_AUTO_PAYMENT to prevent agents from spending more than intended. CAW enforces this via Pact policies.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-primary font-bold">!</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Use Dedicated Wallets</p>
                  <p>Create a separate wallet for MCP with limited funds. Don&apos;t use your main wallet. CAW creates agent-specific wallets with scoped permissions.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="bg-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Learn More</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground">
                Explore AI agent integration and SDK documentation
              </p>
              <div className="flex gap-4">
                <Link href="/docs/ai-agents">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    AI Agent Examples
                  </Button>
                </Link>
                <Link href="/docs/sdk">
                  <Button variant="outline" className="border-border text-foreground">
                    SDK Reference
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
