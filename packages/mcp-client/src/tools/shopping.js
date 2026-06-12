/**
 * AgentPay x402 — Agent Service Tools
 * 
 * Tools for AI agents to discover and pay for other agent services
 * via the x402 protocol with Cobo Agentic Wallet integration.
 */

import {
  SERVER_URL,
  NETWORK,
  CURRENCY,
  TOKEN_CONTRACT,
  TOKEN_DECIMALS,
  MAX_AUTO_PAYMENT,
  CHAINS,
} from "../config.js";
import { wallet, log, getExplorerUrl } from "../wallet.js";
import { makePayment } from "../payment.js";

// ═══════════════════════════════════════════════════════════════════════════
// TOOL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export const TOOLS = [
  {
    name: "x402_list_agent_services",
    description:
      "List all available x402-enabled agent services. Returns service IDs, names, pricing, and descriptions.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "x402_browse_services",
    description:
      "Browse agent services and their details. Returns service IDs, descriptions, prices, and availability.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "Filter by type: api, file, article, agent",
        },
        search: {
          type: "string",
          description: "Optional search query to filter services",
        },
      },
      required: [],
    },
  },
  {
    name: "x402_pay_for_access",
    description:
      `Pay for access to an x402-gated resource. Automatically handles the full payment flow: requests access, makes ${CURRENCY} payment on ${NETWORK}, and retrieves the content.`,
    inputSchema: {
      type: "object",
      properties: {
        resourceId: {
          type: "string",
          description: "Resource ID or slug to purchase access for",
        },
        wallet: {
          type: "string",
          description: "Your wallet address (for buy-once resource verification)",
        },
      },
      required: ["resourceId"],
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function listAgentServices() {
  const res = await fetch(`${SERVER_URL}/x402/resources?limit=50`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.error || `Failed to list services: ${res.status}` };
  }

  const data = await res.json();
  const resources = data.resources || [];

  return {
    services: resources.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      type: r.type,
      price: r.priceUsdc,
      accessCount: r.accessCount,
    })),
    count: resources.length,
    paymentInfo: {
      currency: CURRENCY,
      network: NETWORK,
      contract: TOKEN_CONTRACT,
    },
  };
}

async function browseServices(type, search) {
  let url = `${SERVER_URL}/x402/resources?limit=50`;
  if (type) url += `&type=${encodeURIComponent(type)}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;

  const res = await fetch(url);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.error || `Failed to browse services: ${res.status}` };
  }

  const data = await res.json();
  const resources = data.resources || [];

  return {
    services: resources.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      type: r.type,
      price: r.priceUsdc,
      priceFormatted: r.priceFormatted,
      accessCount: r.accessCount,
      endpoint: r.endpoint,
    })),
    count: resources.length,
    paymentInfo: {
      currency: CURRENCY,
      network: NETWORK,
    },
  };
}

async function payForAccess({ resourceId, wallet: walletAddress }) {
  if (!wallet) {
    return {
      error: "No wallet configured. Set WALLET_PRIVATE_KEY environment variable.",
    };
  }

  log(`Requesting access to resource: ${resourceId}`);

  // Step 1: Request access (expect 402)
  let accessUrl = `${SERVER_URL}/x402/resource/${encodeURIComponent(resourceId)}`;
  if (walletAddress) accessUrl += `?wallet=${encodeURIComponent(walletAddress)}`;

  let initRes;
  try {
    initRes = await fetch(accessUrl);
  } catch (fetchErr) {
    return { error: `Access request failed: ${fetchErr.message}` };
  }

  // If access granted (200), return content directly
  if (initRes.status === 200) {
    const content = await initRes.json();
    return {
      success: true,
      alreadyPurchased: true,
      content,
    };
  }

  if (initRes.status !== 402) {
    const err = await initRes.json().catch(() => ({}));
    return {
      error: err.error || `Access request failed with status ${initRes.status}`,
    };
  }

  const paymentReq = await initRes.json();
  const paymentRequirements = paymentReq.accepts?.[0] || paymentReq;

  const rawAmount = paymentRequirements.amount;
  if (!rawAmount || isNaN(parseInt(rawAmount))) {
    return { error: "Invalid payment amount" };
  }
  const amountToken = parseInt(rawAmount) / (10 ** TOKEN_DECIMALS);
  const recipient = paymentRequirements.recipient || paymentRequirements.payTo;

  log(`Payment required - ${amountToken} ${CURRENCY} to ${recipient}`);

  // Check max payment limit
  if (amountToken > MAX_AUTO_PAYMENT) {
    return {
      error: `Payment of ${amountToken} ${CURRENCY} exceeds max auto-payment limit of ${MAX_AUTO_PAYMENT} ${CURRENCY}`,
      paymentRequired: {
        amount: paymentRequirements.amount,
        amountFormatted: amountToken,
        currency: CURRENCY,
        payTo: recipient,
      },
    };
  }

  // Step 2: Make payment
  const paymentResult = await makePayment(recipient, paymentRequirements.amount);

  if (!paymentResult.success) {
    return { error: `Payment failed: ${paymentResult.error}` };
  }

  log(`Payment sent - ${paymentResult.txHash}`);

  // Step 3: Re-request with payment proof
  const retryRes = await fetch(accessUrl, {
    headers: {
      "X-PAYMENT": JSON.stringify({
        txHash: paymentResult.txHash,
        transactionHash: paymentResult.txHash,
        network: NETWORK,
        chainId: CHAINS[NETWORK]?.id || 1,
        timestamp: Date.now(),
      }),
    },
  });

  if (!retryRes.ok) {
    const err = await retryRes.json().catch(() => ({}));
    return {
      error: err.error || "Access denied after payment",
      payment: { txHash: paymentResult.txHash },
    };
  }

  const content = await retryRes.json();

  log(`Access granted for resource: ${resourceId}`);

  return {
    success: true,
    resourceId,
    content,
    payment: {
      amount: amountToken,
      currency: CURRENCY,
      txHash: paymentResult.txHash,
      network: NETWORK,
      explorer: getExplorerUrl(paymentResult.txHash),
    },
  };
}

export const handlers = {
  x402_list_agent_services: () => listAgentServices(),
  x402_browse_services: (args) => browseServices(args.type, args.search),
  x402_pay_for_access: (args) => payForAccess(args),
};
