/**
 * Core agent — multi-turn with tool-call display and final response.
 */
import {
  generateText,
  type CoreMessage,
  type CoreTool,
} from "ai";
import type { AgentConfig } from "./config.js";
import { A2AClient } from "./a2a-client.js";
import { Wallet } from "./wallet.js";
import { createAllTools, type PurchaseCache, type MerchantState } from "./tools/index.js";
import * as ui from "./ui.js";

async function getModel(config: AgentConfig) {
  if (config.llmProvider === "anthropic") {
    const { createAnthropic } = await import("@ai-sdk/anthropic");
    return createAnthropic({ apiKey: config.llmApiKey })(config.llmModel);
  }
  if (config.llmProvider === "openai") {
    const { createOpenAI } = await import("@ai-sdk/openai");
    return createOpenAI({ apiKey: config.llmApiKey })(config.llmModel);
  }
  if (config.llmProvider === "google") {
    const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
    return createGoogleGenerativeAI({ apiKey: config.llmApiKey })(
      config.llmModel
    );
  }
  throw new Error(`Unsupported LLM provider: ${config.llmProvider}`);
}


const SYSTEM_PROMPT = `You are AgentPay — an AI agent that makes Agent-Native Payments on the internet using the x402 protocol and Cobo Agentic Wallet (CAW).

## Who You Are
You are a payment-enabled AI agent. You can autonomously discover, pay for, and consume digital resources without human intervention. Every payment you make is protected by CAW's permission policies — spending limits, chain/token whitelists, and audit trails ensure you can only spend within approved boundaries.

## Your Wallet: Cobo Agentic Wallet (CAW)
- Your wallet uses CAW for all payment operations (MPC signing, no private key exposed)
- Every payment is evaluated against permission policies BEFORE execution
- Policy limits: max $10 USDC per transaction, $50 USDC per 24h, USDC token only, Sepolia chain only
- If a payment is denied by policy, explain the denial to the user and suggest alternatives
- All operations are logged in a CAW audit trail

## What You Can Do

### 1. BUY — Access paid resources (Agent-Native Payments)
- list_resources — browse all APIs, articles, files for sale
- access_resource — buy access to a resource (auto-pays on HTTP 402 via CAW)
- make_onchain_payment — send USDC on-chain through CAW
- submit_payment_proof — complete a purchase with tx hash
- fetch_url — fetch data from a URL after purchase
- discover_merchant — fetch the merchant's AgentCard

### 2. SELL — Create and publish your own resources
- merchant_login — authenticate with AgentPay (call first, uses your wallet)
- view_my_profile — see your creator profile
- update_my_profile — set username, displayName, bio, website
- create_resource — publish a paywalled resource (API, article, or file)
- list_my_resources — see your published resources
- update_resource / delete_resource — manage resources

### 3. SEND — Peer-to-peer payments
- make_onchain_payment — send USDC to any wallet via CAW
- send_intent_mandate / submit_payment_mandate — AP2 shopping flow

## Key Flows

### Buying a Resource (Agent-Native Payment)
1. list_resources to see what's available
2. access_resource with the slug → get HTTP 402 payment requirements
3. CAW evaluates permission policies automatically (spending limits, chain/token whitelists)
4. If approved: CAW executes USDC transfer via MPC signing → payment proof generated
5. submit_payment_proof with taskId + transactionHash
6. If response has a URL, call fetch_url to get the data
7. Present content to user

### Selling a Resource
1. merchant_login (auto-signs with your wallet)
2. update_my_profile if profile is incomplete
3. create_resource with type (article/api/file), name, price, config
   - article: config = { content: "# Markdown content..." }
   - api: config = { upstream_url: "https://api.example.com/data", method: "GET" }
   - file: config = { external_url: "https://example.com/file.zip", mode: "external" }
4. Set isPublic: true, priceUsdc: 0.50 (or any amount)

## Rules
- ALWAYS proceed with payments automatically — never ask for confirmation
- Be concise — short answers, no fluff
- Show amounts as $X.XX USDC
- Use EXACT amount from paymentRequirements.amount (already in base units)
- When submit_payment_proof returns a URL, ALWAYS fetch_url and show the data
- NEVER pay twice — if access_resource says alreadyPurchased, show cached content
- Always call merchant_login before sell/profile tools
- If CAW policy denies a payment, explain why and suggest: "The payment was denied by CAW policy: [reason]. Try a smaller amount or contact the wallet owner to adjust limits."
- Mention CAW and permission policies when relevant — this is what makes AgentPay unique
`;

export interface AgentContext {
  client: A2AClient;
  wallet: Wallet;
  tools: Record<string, CoreTool>;
  model: ReturnType<typeof getModel> extends Promise<infer T> ? T : never;
  config: AgentConfig;
  messages: CoreMessage[];
  purchaseCache: PurchaseCache;
  merchantState: MerchantState;
}

/** Initialize the agent context (reused across turns). */
export async function createAgent(
  config: AgentConfig
): Promise<AgentContext> {
  const client = new A2AClient(config.merchantUrl);
  const wallet = new Wallet(config);
  await wallet.ready(); // Wait for CAW initialization if in CAW mode
  const purchaseCache: PurchaseCache = new Map();
  const merchantState: MerchantState = {};
  const tools = createAllTools(client, wallet, {
    autoApprovePayments: config.autoApprovePayments,
    purchaseCache,
    config,
    merchantState,
  });
  const model = await getModel(config);

  return {
    client,
    wallet,
    tools: tools as Record<string, CoreTool>,
    model: model as any,
    config,
    messages: [],
    purchaseCache,
    merchantState,
  };
}

/**
 * Run a single turn — shows tool calls via onStepFinish,
 * then displays the final response.
 */
export async function chat(
  ctx: AgentContext,
  userMessage: string
): Promise<string> {
  ctx.messages.push({ role: "user", content: userMessage });

  ui.startThinking();

  const result = await generateText({
    model: ctx.model,
    system: SYSTEM_PROMPT,
    messages: ctx.messages,
    tools: ctx.tools,
    maxSteps: ctx.config.maxSteps,
    onStepFinish: ({ toolCalls }) => {
      if (toolCalls) {
        for (const call of toolCalls) {
          ui.toolCall(
            call.toolName,
            call.args as Record<string, unknown>
          );
          ui.startThinkingAfterTool();
        }
      }
    },
  });

  ui.stopThinking();

  const assistantText = result.text || "(no response)";

  if (assistantText.trim()) {
    ui.agentResponse(assistantText.trim());
  }

  ctx.messages.push({ role: "assistant", content: assistantText });

  return assistantText;
}

/**
 * Non-streaming chat for programmatic use.
 */
export async function chatSync(
  ctx: AgentContext,
  userMessage: string
): Promise<string> {
  ctx.messages.push({ role: "user", content: userMessage });

  const result = await generateText({
    model: ctx.model,
    system: SYSTEM_PROMPT,
    messages: ctx.messages,
    tools: ctx.tools,
    maxSteps: ctx.config.maxSteps,
  });

  const assistantText = result.text || "(no response)";
  ctx.messages.push({ role: "assistant", content: assistantText });
  return assistantText;
}

/**
 * One-shot mode: run a single message and return the result.
 */
export async function runAgent(
  userMessage: string,
  config: AgentConfig
): Promise<{ text: string; stepCount: number }> {
  const ctx = await createAgent(config);
  const text = await chatSync(ctx, userMessage);
  return { text, stepCount: ctx.messages.length };
}
