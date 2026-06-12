#!/usr/bin/env node
/**
 * AgentPay x402 — MCP Client for AI Agents
 *
 * Entry point: assembles tools from all modules, provides CLI mode
 * and MCP STDIO protocol handler.
 */

import { createInterface } from "readline";
import { SERVER_URL, NETWORK, CURRENCY, MAX_AUTO_PAYMENT } from "./config.js";
import { log, initializeWallet, isCawActive, getCawAddress } from "./wallet.js";

import * as discovery from "./tools/discovery.js";
import * as services from "./tools/shopping.js";
import * as requests from "./tools/requests.js";

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED TOOLS
// ═══════════════════════════════════════════════════════════════════════════

export const TOOLS = [
  ...discovery.TOOLS,
  ...services.TOOLS,
  ...requests.TOOLS,
];

// ═══════════════════════════════════════════════════════════════════════════
// MERGED HANDLER DISPATCH
// ═══════════════════════════════════════════════════════════════════════════

const allHandlers = {
  ...discovery.handlers,
  ...services.handlers,
  ...requests.handlers,
};

export async function handleTool(name, args) {
  try {
    const handler = allHandlers[name];
    if (handler) {
      return await handler(args);
    }
    return { error: `Unknown tool: ${name}` };
  } catch (err) {
    log(`Error in ${name}: ${err.message}`);
    return { error: err.message, tool: name };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI MODE -- for direct invocation by AI agents
// Usage: node agentpay-x402.js <command> [json-args]
// ═══════════════════════════════════════════════════════════════════════════

const CLI_COMMANDS = {
  "list-resources": "x402_list_resources",
  "search": "x402_search_resources",
  "list-services": "x402_list_agent_services",
  "browse-services": "x402_browse_services",
  "request": "x402_request",
  "pay": "x402_pay_for_access",
  "wallet": "x402_wallet",
  "send": "x402_send",
  "discover": "x402_discover",
  "preview": "x402_request",
};

const cliCommand = process.argv[2];

if (cliCommand && CLI_COMMANDS[cliCommand]) {
  // CLI mode: run the command and exit
  const toolName = CLI_COMMANDS[cliCommand];
  let args = {};

  // Parse remaining args as JSON, or as key=value pairs
  const rawArg = process.argv[3];
  if (rawArg) {
    try {
      args = JSON.parse(rawArg);
    } catch {
      // Try key=value format: url=http://... method=GET
      for (let i = 3; i < process.argv.length; i++) {
        const [key, ...rest] = process.argv[i].split("=");
        if (key && rest.length > 0) {
          args[key] = rest.join("=");
        }
      }
    }
  } else {
    // Also try key=value pairs from remaining argv
    for (let i = 3; i < process.argv.length; i++) {
      const [key, ...rest] = process.argv[i].split("=");
      if (key && rest.length > 0) {
        args[key] = rest.join("=");
      }
    }
  }

  // Auto-inject preview flag for the preview command
  if (cliCommand === "preview") {
    args.preview = true;
  }

  (async () => {
    try {
      const result = await handleTool(toolName, args);
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    } catch (err) {
      console.error(JSON.stringify({ error: err.message }));
      process.exit(1);
    }
  })();
} else if (cliCommand === "help" || cliCommand === "--help") {
  console.log(`AgentPay x402 CLI \u2014 AI Agent Marketplace

Usage: node agentpay-x402.js <command> [json-args]

Commands:
  list-resources          List all available resources with prices
  search                  Search resources by keyword
  list-services           List agent services
  browse-services         Browse agent services with filters
  request                 Access a paid resource (auto-pays if 402)
  preview                 Check resource price without paying
  pay                     Pay for access to a specific resource
  wallet                  Check wallet balance
  send                    Send USDC to a wallet address
  discover                Probe a URL for x402 support

Examples:
  node agentpay-x402.js list-resources
  node agentpay-x402.js search '{"query":"weather"}'
  node agentpay-x402.js wallet
  node agentpay-x402.js request '{"url":"${SERVER_URL}/x402/resource/my-resource"}'
  node agentpay-x402.js pay '{"resourceId":"my-resource"}'

Environment:
  AGENTPAY_SERVER=${SERVER_URL}
  X402_CHAIN=${NETWORK}
  X402_CURRENCY=${CURRENCY}
  MAX_AUTO_PAYMENT=${MAX_AUTO_PAYMENT}
`);
  process.exit(0);
} else if (cliCommand) {
  console.error(`Unknown command: ${cliCommand}. Run with --help to see available commands.`);
  process.exit(1);
} else {
  // ═══════════════════════════════════════════════════════════════════════════
  // MCP STDIO PROTOCOL -- for MCP hosts (Claude Desktop, etc.)
  // ═══════════════════════════════════════════════════════════════════════════

  // Initialize wallet (CAW or viem) before processing requests
  await initializeWallet();
  const walletMode = isCawActive() ? "CAW (Cobo Agentic Wallet)" : "Viem (Private Key)";
  const walletAddr = getCawAddress() || "not configured";

  const rl = createInterface({ input: process.stdin, terminal: false });

  rl.on("line", async (line) => {
    try {
      const request = JSON.parse(line);
      const { method, params, id } = request;

      let response;

      switch (method) {
        case "initialize":
          const clientVersion = params?.protocolVersion || "2024-11-05";
          response = {
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: clientVersion,
              capabilities: { tools: {} },
              serverInfo: {
                name: "agentpay-x402",
                version: "2.0.0",
              },
            },
          };
          break;

        case "notifications/initialized":
          // Client acknowledged initialization - no response needed
          return;

        case "tools/list":
          response = {
            jsonrpc: "2.0",
            id,
            result: { tools: TOOLS },
          };
          break;

        case "tools/call":
          const result = await handleTool(params.name, params.arguments || {});
          response = {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            },
          };
          break;

        default:
          response = {
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: `Unknown method: ${method}` },
          };
      }

      console.log(JSON.stringify(response));
    } catch (err) {
      console.log(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        })
      );
    }
  });

  log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
  log("  AGENTPAY x402 MCP Client Ready \u26a1");
  log(`  Network: ${NETWORK} | Token: ${CURRENCY}`);
  log(`  Wallet: ${walletMode} | ${walletAddr}`);
  log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
}
