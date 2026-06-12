import { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * MCP Server Handler for AgentPay Service Agent
 * Implements JSON-RPC 2.0 protocol for x402-gated agent service access
 *
 * Tools:
 *   list_services      — List all available x402-gated agent services (resources)
 *   get_service_details — Get details of a specific service/resource by ID or slug
 *   pay_for_access     — Pay USDC via x402 to access a service
 *   list_my_access     — List resources the agent has already paid for
 */

let mcpServerInstance: McpServer | null = null;

/**
 * Helper to call backend APIs
 */
const BACKEND_URL = process.env.BACKEND_URL || process.env.APP_URL || "http://localhost:3001";

async function callBackendAPI(
  endpoint: string,
  method: string = "GET",
  body?: any,
  headers?: any
): Promise<{ status: number; data: any }> {
  const url = `${BACKEND_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    status: response.status,
    data,
  };
}

// ============================================================
// Tool Handlers
// ============================================================

/**
 * Handler: List all available x402-gated agent services
 */
async function handleListServices(args: { type?: string }): Promise<any> {
  console.log(`[handleListServices] 📋 Fetching services...`);

  const endpoint = args.type
    ? `/x402/resources?type=${encodeURIComponent(args.type)}`
    : "/x402/resources";

  const result = await callBackendAPI(endpoint);

  console.log(`[handleListServices] 📥 Response status: ${result.status}`);

  if (result.status !== 200) {
    console.error(`[handleListServices] ❌ API call failed`);
    return {
      error: "Failed to fetch services",
      status: result.status,
      details: result.data,
    };
  }

  const resources = result.data.resources || [];
  console.log(`[handleListServices] ✅ Found ${resources.length} service(s)`);

  return {
    success: true,
    services: resources.map((r: any) => ({
      id: r.id || r._id,
      slug: r.slug,
      name: r.name,
      type: r.type,
      description: r.description,
      priceUsdc: r.priceUsdc,
      currency: r.currency || "USDC",
      accessCount: r.accessCount,
      endpoint: r.endpoint || `/x402/resource/${r.slug || r.id || r._id}`,
      creator: r.creator,
    })),
    count: resources.length,
  };
}

/**
 * Handler: Get details of a specific service/resource
 * Calls the x402 gateway which returns 402 with payment requirements,
 * or 200 if already paid (when walletAddress is provided).
 */
async function handleGetServiceDetails(args: {
  serviceId: string;
  walletAddress?: string;
}): Promise<any> {
  const { serviceId, walletAddress } = args;
  const encodedId = encodeURIComponent(serviceId);
  console.log(`[handleGetServiceDetails] 🔍 Service ID: ${serviceId}`);

  const walletQuery = walletAddress
    ? `?wallet=${encodeURIComponent(walletAddress.toLowerCase())}`
    : "";

  const headers: Record<string, string> = {};
  const result = await callBackendAPI(
    `/x402/resource/${encodedId}${walletQuery}`,
    "GET",
    undefined,
    headers
  );

  console.log(`[handleGetServiceDetails] 📥 Response status: ${result.status}`);

  if (result.status === 402) {
    // Expected: service requires payment — 402 response contains payment details
    return {
      success: true,
      requiresPayment: true,
      serviceId: result.data.resourceId || serviceId,
      serviceName: result.data.resourceName,
      serviceType: result.data.resourceType,
      description: result.data.description,
      paymentRequirements: {
        network: result.data.network,
        chainId: result.data.chainId,
        token: result.data.token,
        amount: result.data.amount,
        recipient: result.data.recipient,
        scheme: result.data.scheme,
      },
      message: `Payment required: ${result.data.amount} base units of ${result.data.token}`,
      nextStep: "Use pay_for_access with payment proof to access this service",
    };
  }

  if (result.status === 200) {
    return {
      success: true,
      requiresPayment: false,
      serviceId,
      message: "Service is accessible (no payment required or already paid)",
      data: result.data,
    };
  }

  if (result.status === 404) {
    return {
      success: false,
      error: "Service not found",
      serviceId,
    };
  }

  return {
    error: "Failed to get service details",
    status: result.status,
    details: result.data,
  };
}

/**
 * Handler: Pay USDC via x402 to access a service
 * Sends payment proof in X-PAYMENT header to the x402 gateway.
 * If walletAddress is provided and already paid, skips payment proof.
 */
async function handlePayForAccess(args: {
  serviceId: string;
  walletAddress?: string;
  paymentProof?: {
    transactionHash: string;
    network: string;
    chainId?: number;
    timestamp: number;
  };
}): Promise<any> {
  const { serviceId, walletAddress, paymentProof } = args;
  const encodedId = encodeURIComponent(serviceId);
  console.log(`[handlePayForAccess] 🔓 Accessing service: ${serviceId}`);
  if (paymentProof) {
    console.log(`[handlePayForAccess] 💳 Payment: ${paymentProof.transactionHash}`);
  } else if (walletAddress) {
    console.log(`[handlePayForAccess] 👛 Checking prior access for wallet: ${walletAddress}`);
  }

  const walletQuery = walletAddress
    ? `?wallet=${encodeURIComponent(walletAddress.toLowerCase())}`
    : "";

  const requestHeaders: Record<string, string> = {};
  if (paymentProof) {
    requestHeaders["X-PAYMENT"] = JSON.stringify(paymentProof);
  }

  const result = await callBackendAPI(
    `/x402/resource/${encodedId}${walletQuery}`,
    "POST",
    undefined,
    requestHeaders
  );

  console.log(`[handlePayForAccess] 📥 Response status: ${result.status}`);

  if (result.status === 200) {
    console.log(`[handlePayForAccess] ✅ Service accessed successfully`);
    return {
      success: true,
      serviceId,
      data: result.data,
      message: "Service accessed successfully with valid payment",
    };
  }

  if (result.status === 402) {
    // Payment verification failed or no payment provided
    return {
      success: false,
      requiresPayment: true,
      error: paymentProof
        ? "Payment verification failed — transaction may not be confirmed yet or sent to incorrect recipient"
        : "Payment required to access this service",
      status: 402,
      paymentRequirements: {
        network: result.data.network,
        chainId: result.data.chainId,
        token: result.data.token,
        amount: result.data.amount,
        recipient: result.data.recipient,
        scheme: result.data.scheme,
      },
      hint: paymentProof
        ? "Ensure the transaction is confirmed and sent to the correct recipient with the correct amount"
        : "First get service details to see payment requirements, then provide paymentProof",
    };
  }

  return {
    success: false,
    error: "Failed to access service",
    status: result.status,
    details: result.data,
  };
}

/**
 * Handler: List resources the agent has already paid for
 * Queries the backend for access logs by wallet address.
 */
async function handleListMyAccess(args: {
  walletAddress: string;
}): Promise<any> {
  const { walletAddress } = args;
  const normalizedWallet = walletAddress.toLowerCase();
  console.log(`[handleListMyAccess] 📋 Fetching access history for wallet: ${normalizedWallet}`);

  const result = await callBackendAPI(
    `/x402/my-access?wallet=${encodeURIComponent(normalizedWallet)}`
  );

  console.log(`[handleListMyAccess] 📥 Response status: ${result.status}`);

  if (result.status === 200) {
    const accessList = result.data.accessLogs || result.data.accesses || result.data || [];
    const count = Array.isArray(accessList) ? accessList.length : 0;
    console.log(`[handleListMyAccess] ✅ Found ${count} access record(s)`);
    return {
      success: true,
      walletAddress: normalizedWallet,
      accesses: accessList,
      count,
    };
  }

  if (result.status === 404) {
    // Endpoint not yet implemented — return graceful fallback
    console.log(`[handleListMyAccess] ⚠️  /x402/my-access endpoint not available`);
    return {
      success: false,
      error: "Access history endpoint not available. The /x402/my-access route needs to be implemented on the backend.",
      walletAddress: normalizedWallet,
      hint: "You can check individual service access by calling get_service_details with your walletAddress",
    };
  }

  return {
    error: "Failed to fetch access history",
    status: result.status,
    details: result.data,
  };
}

// ============================================================
// MCP Server Initialization
// ============================================================

/**
 * Initialize MCP server with agent-service tools
 */
async function initializeMCPServer(): Promise<McpServer> {
  if (mcpServerInstance) {
    return mcpServerInstance;
  }

  const server = new McpServer({
    name: "agentpay-service-agent",
    version: "2.0.0",
  });

  // Register list_services tool
  server.tool(
    "list_services",
    "List all available x402-gated agent services (resources). Optionally filter by type (api, file, article).",
    {
      type: z
        .string()
        .optional()
        .describe("Filter by service type: api, file, article"),
    },
    async (args) => {
      return await handleListServices(args as { type?: string });
    }
  );

  // Register get_service_details tool
  server.tool(
    "get_service_details",
    "Get details and payment requirements for a specific agent service. Returns 402 payment info if payment is needed, or service data if already accessible. Pass walletAddress to check if already paid.",
    {
      serviceId: z
        .string()
        .describe("The service ID or slug (e.g., 'weather-api')"),
      walletAddress: z
        .string()
        .optional()
        .describe("Wallet address to check for prior payment (0x...)"),
    },
    async (args) => {
      return await handleGetServiceDetails(args as {
        serviceId: string;
        walletAddress?: string;
      });
    }
  );

  // Register pay_for_access tool
  server.tool(
    "pay_for_access",
    "Pay USDC via x402 to access a service. Provide paymentProof from a completed transaction. If walletAddress is provided and you already paid, the service data is returned without requiring paymentProof.",
    {
      serviceId: z
        .string()
        .describe("The service ID or slug to access"),
      walletAddress: z
        .string()
        .optional()
        .describe("Your wallet address (0x...) — skips payment if already paid for this service"),
      paymentProof: z
        .object({
          transactionHash: z.string().describe("EVM transaction hash (0x...)"),
          network: z
            .string()
            .describe("Network where transaction was executed (e.g., sepolia, base)"),
          chainId: z.number().optional().describe("Chain ID of the network"),
          timestamp: z.number().describe("Unix timestamp of payment"),
        })
        .optional()
        .describe("Payment proof from a completed on-chain transaction"),
    },
    async (args) => {
      return await handlePayForAccess(args as {
        serviceId: string;
        walletAddress?: string;
        paymentProof?: {
          transactionHash: string;
          network: string;
          chainId?: number;
          timestamp: number;
        };
      });
    }
  );

  // Register list_my_access tool
  server.tool(
    "list_my_access",
    "List all agent services (resources) that a wallet has already paid for and can access without additional payment.",
    {
      walletAddress: z
        .string()
        .describe("Your wallet address to look up access history (0x...)"),
    },
    async (args) => {
      return await handleListMyAccess(args as { walletAddress: string });
    }
  );

  mcpServerInstance = server;
  return server;
}

/**
 * Get or create the MCP server instance
 */
export async function getMCPServer(): Promise<McpServer> {
  return await initializeMCPServer();
}

// ============================================================
// JSON-RPC 2.0 HTTP Handler
// ============================================================

/**
 * Handle MCP requests via HTTP using JSON-RPC 2.0 protocol
 */
export async function handleMCPRequest(req: Request, res: Response) {
  const requestId = `mcp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const startTime = Date.now();

  console.log(`\n${"=".repeat(80)}`);
  console.log(`[${requestId}] 🤖 MCP HTTP Request Received (JSON-RPC 2.0)`);
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] URL: ${req.url}`);
  console.log(`${"=".repeat(80)}`);

  try {
    const body = req.body;
    console.log(`[${requestId}] 📨 Request body:`, JSON.stringify(body, null, 2));

    // Initialize MCP server
    console.log(`[${requestId}] 📌 Initializing MCP server...`);
    await initializeMCPServer();
    console.log(`[${requestId}] ✓ MCP server ready`);

    // Handle JSON-RPC 2.0 request
    console.log(`[${requestId}] ⚙️  Processing JSON-RPC request...`);
    const jsonRpcRequest = body;
    const method = jsonRpcRequest.method;
    const params = jsonRpcRequest.params || {};
    const id = jsonRpcRequest.id;

    console.log(`[${requestId}] 🔧 Method: ${method}`);
    console.log(`[${requestId}] 📝 Params:`, JSON.stringify(params, null, 2));

    let jsonRpcResponse: any;

    // Handle different JSON-RPC methods
    if (method === "initialize") {
      console.log(`[${requestId}] 🔌 Handling initialize request...`);
      jsonRpcResponse = {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2025-06-18",
          capabilities: {
            tools: {},
            resources: { subscribe: false },
            prompts: {},
          },
          serverInfo: {
            name: "agentpay-service-agent",
            version: "2.0.0",
          },
        },
      };
      console.log(`[${requestId}] ✅ Initialize response prepared`);
    } else if (method === "tools/list") {
      console.log(`[${requestId}] 🔧 Handling tools/list request...`);
      const tools = [
        {
          name: "list_services",
          description:
            "List all available x402-gated agent services (resources). Optionally filter by type (api, file, article).",
          inputSchema: {
            type: "object",
            properties: {
              type: {
                type: "string",
                description: "Filter by service type: api, file, article",
              },
            },
            required: [],
          },
        },
        {
          name: "get_service_details",
          description:
            "Get details and payment requirements for a specific agent service. Returns 402 payment info if payment is needed, or service data if already accessible. Pass walletAddress to check if already paid.",
          inputSchema: {
            type: "object",
            properties: {
              serviceId: {
                type: "string",
                description: "The service ID or slug (e.g., 'weather-api')",
              },
              walletAddress: {
                type: "string",
                description: "Wallet address to check for prior payment (0x...)",
              },
            },
            required: ["serviceId"],
          },
        },
        {
          name: "pay_for_access",
          description:
            "Pay USDC via x402 to access a service. Provide paymentProof from a completed transaction. If walletAddress is provided and you already paid, the service data is returned without requiring paymentProof.",
          inputSchema: {
            type: "object",
            properties: {
              serviceId: {
                type: "string",
                description: "The service ID or slug to access",
              },
              walletAddress: {
                type: "string",
                description:
                  "Your wallet address (0x...) — skips payment if already paid",
              },
              paymentProof: {
                type: "object",
                properties: {
                  transactionHash: {
                    type: "string",
                    description: "EVM transaction hash (0x...)",
                  },
                  network: {
                    type: "string",
                    description:
                      "Network where transaction was executed (e.g., sepolia, base)",
                  },
                  chainId: {
                    type: "number",
                    description: "Chain ID of the network",
                  },
                  timestamp: {
                    type: "number",
                    description: "Unix timestamp of payment",
                  },
                },
                required: ["transactionHash", "network", "timestamp"],
              },
            },
            required: ["serviceId"],
          },
        },
        {
          name: "list_my_access",
          description:
            "List all agent services (resources) that a wallet has already paid for and can access without additional payment.",
          inputSchema: {
            type: "object",
            properties: {
              walletAddress: {
                type: "string",
                description: "Your wallet address to look up access history (0x...)",
              },
            },
            required: ["walletAddress"],
          },
        },
      ];

      jsonRpcResponse = {
        jsonrpc: "2.0",
        id,
        result: { tools },
      };
      console.log(`[${requestId}] ✅ Tools list prepared (${tools.length} tools)`);
    } else if (method === "tools/call") {
      console.log(`[${requestId}] 🔨 Handling tools/call request...`);
      const toolName = params.name;
      const toolArgs = params.arguments || {};

      console.log(`[${requestId}] 📝 Tool name: ${toolName}`);
      console.log(`[${requestId}] 📋 Tool arguments:`, JSON.stringify(toolArgs, null, 2));

      let toolResult;
      switch (toolName) {
        case "list_services":
          console.log(`[${requestId}] → Calling handleListServices...`);
          toolResult = await handleListServices(toolArgs);
          break;
        case "get_service_details":
          console.log(`[${requestId}] → Calling handleGetServiceDetails...`);
          toolResult = await handleGetServiceDetails(toolArgs);
          break;
        case "pay_for_access":
          console.log(`[${requestId}] → Calling handlePayForAccess...`);
          toolResult = await handlePayForAccess(toolArgs);
          break;
        case "list_my_access":
          console.log(`[${requestId}] → Calling handleListMyAccess...`);
          toolResult = await handleListMyAccess(toolArgs);
          break;
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      console.log(`[${requestId}] ✅ Tool execution completed`);
      console.log(`[${requestId}] 📊 Tool result:`, JSON.stringify(toolResult, null, 2));

      jsonRpcResponse = {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(toolResult, null, 2),
            },
          ],
        },
      };

      console.log(`[${requestId}] 📨 JSON-RPC Response:`, JSON.stringify(jsonRpcResponse, null, 2));
    } else {
      console.error(`[${requestId}] ❌ Unknown JSON-RPC method: ${method}`);
      jsonRpcResponse = {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      };
    }

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] 📤 Sending JSON-RPC response...`);
    console.log(`[${requestId}] ⏱️  Request completed in ${duration}ms`);
    console.log(`[${requestId}] ${"=".repeat(76)}\n`);

    return res.status(200).json(jsonRpcResponse);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Request processing failed`);
    console.error(`[${requestId}] Error type:`, error?.constructor?.name);
    console.error(`[${requestId}] Error message:`, error?.message);
    console.error(`[${requestId}] Stack:`, error?.stack);
    console.log(`[${requestId}] ⏱️  Request failed after ${duration}ms`);
    console.log(`[${requestId}] ${"=".repeat(76)}\n`);

    return res.status(200).json({
      jsonrpc: "2.0",
      id: req.body?.id || null,
      error: {
        code: -32603,
        message: "Internal server error",
        data: error.message,
      },
    });
  }
}
