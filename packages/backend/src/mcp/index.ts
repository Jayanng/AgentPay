/**
 * MCP Module - Modular Model Context Protocol Implementation
 * 
 * This module provides a pluggable MCP server system with:
 * - Tool registry for centralized tool management
 * - Category-based tool organization
 * - Shared JSON-RPC 2.0 handler
 * - Pre-built tools for payments, resources, and A2A
 */

// Core exports
export { toolRegistry, defineTool } from "./tool-registry.js";
export { createMCPHandler, type MCPHandlerOptions } from "./base-handler.js";
export type { 
  MCPToolDefinition, 
  MCPToolMetadata, 
  MCPToolResult,
  MCPServerInfo,
  JsonRpcRequest,
  JsonRpcResponse,
} from "./types.js";

// Tool registration exports
export { registerPaymentTools } from "./tools/payment.js";
export { registerResourceTools } from "./tools/resources.js";
export { registerA2ATools } from "./tools/a2a.js";

// Import for internal use
import { registerPaymentTools } from "./tools/payment.js";
import { registerResourceTools } from "./tools/resources.js";
import { registerA2ATools } from "./tools/a2a.js";
import { createMCPHandler } from "./base-handler.js";

/**
 * Initialize all MCP tools
 * Call this once at server startup
 */
export function initializeMCPTools(): void {
  registerPaymentTools();
  registerResourceTools();
  registerA2ATools();

  console.log("[MCP] All tools initialized");
}

/**
 * Create pre-configured MCP handlers
 */
export function createMCPServers() {
  // Payment Agent - blockchain payment tools
  const paymentHandler = createMCPHandler({
    serverInfo: {
      name: "agentpay-payment-agent",
      version: "2.0.0",
      description: "Agent-Native Payment tools via Cobo Agentic Wallet and x402 protocol",
    },
    category: "payment",
  });

  // Resource Agent - x402 resource access tools
  const resourceHandler = createMCPHandler({
    serverInfo: {
      name: "agentpay-resource-agent",
      version: "2.0.0",
      description: "Tools for accessing payment-gated resources",
    },
    category: "resources",
  });

  // A2A Agent - agent-to-agent protocol tools
  const a2aHandler = createMCPHandler({
    serverInfo: {
      name: "agentpay-a2a-agent",
      version: "2.0.0",
      description: "A2A protocol tools for agent-to-agent commerce with x402 payments",
    },
    category: "a2a",
  });

  // Universal Agent - all tools
  const universalHandler = createMCPHandler({
    serverInfo: {
      name: "agentpay-universal-agent",
      version: "2.0.0",
      description: "Complete AgentPay agent with payment, resource access, and A2A tools",
    },
    // No category filter = all tools
  });

  return {
    payment: paymentHandler,
    resources: resourceHandler,
    a2a: a2aHandler,
    universal: universalHandler,
  };
}
