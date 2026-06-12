/**
 * On-chain wallet for making ERC20 payments.
 *
 * Supports two modes:
 * 1. CAW Mode (Cobo Agentic Wallet) — All payments via CAW API with permission policies
 * 2. Viem Mode (Private Key) — Direct on-chain signing (legacy)
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  defineChain,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AgentConfig } from "./config.js";

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export class Wallet {
  public address: Address;
  public walletMode: "caw" | "viem";
  private account: any;
  private publicClient: any;
  private walletClient: any;
  private config: AgentConfig;
  private cawClient: any; // CAW client, loaded dynamically
  private _cawReady: Promise<void>; // tracks async CAW init

  constructor(config: AgentConfig) {
    this.config = config;
    this.walletMode = config.walletMode;

    if (this.walletMode === "caw") {
      // CAW Mode: address set after async init
      this.address = "0x0000000000000000000000000000000000000000" as Address;
      this.account = null;
      this.publicClient = null;
      this.walletClient = null;
      // Start async init — callers MUST await wallet.ready() before using
      this._cawReady = this.initCaw();
    } else {
      // Viem Mode: Direct on-chain signing
      if (!config.walletPrivateKey) {
        throw new Error("WALLET_PRIVATE_KEY required for viem mode");
      }
      this.account = privateKeyToAccount(config.walletPrivateKey);
      this.address = this.account.address;
      this._cawReady = Promise.resolve();

      const chain = defineChain({
        id: config.chainId,
        name: config.network,
        network: config.network,
        nativeCurrency: { decimals: 18, name: "ETH", symbol: "ETH" },
        rpcUrls: {
          default: { http: [config.rpcUrl] },
        },
        testnet: true,
      });

      this.publicClient = createPublicClient({
        chain,
        transport: http(config.rpcUrl),
      });
      this.walletClient = createWalletClient({
        account: this.account,
        chain,
        transport: http(config.rpcUrl),
      });
    }
  }

  /** Await this before calling any wallet methods — ensures CAW is initialized */
  async ready(): Promise<void> {
    await this._cawReady;
  }

  /** Initialize CAW client */
  private async initCaw(): Promise<void> {
    try {
      const { CawAgentWallet } = await import("@agentpay/caw-wallet");
      const networkMap: Record<string, { cawChainId: string; cawTokenId: string; evmChainId: number }> = {
        sepolia: { cawChainId: "SETH", cawTokenId: "SETH_USDC", evmChainId: 11155111 },
      };
      const netConfig = networkMap[this.config.network] || networkMap["sepolia"];

      const explorerUrlMap: Record<string, string> = {
        sepolia: "https://sepolia.etherscan.io",
      };

      const cawWallet = new CawAgentWallet({
        apiKey: this.config.cawApiKey!,
        walletId: this.config.cawWalletId!,
        apiUrl: this.config.cawApiUrl,
        cawChainId: this.config.cawChainId || netConfig.cawChainId,
        cawTokenId: this.config.cawTokenId || netConfig.cawTokenId,
        evmChainId: this.config.chainId,
        networkName: this.config.network,
        explorerUrl: explorerUrlMap[this.config.network] || explorerUrlMap["sepolia"],
        maxAutoPayment: 10.00,
      });

      await cawWallet.initialize();
      this.address = cawWallet.getAddress() as Address;
      this.cawClient = cawWallet;

      console.error(`[wallet] CAW mode initialized: ${this.address}`);
    } catch (err) {
      console.error(`[wallet] CAW initialization failed: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  /** Get USDC balance in human-readable format */
  async getUsdcBalance(): Promise<string> {
    if (this.walletMode === "caw" && this.cawClient) {
      const balance = await this.cawClient.getBalance();
      return balance.balances?.USDC || "0";
    }

    const balance = await this.publicClient!.readContract({
      address: this.config.usdcAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [this.address],
    });
    return formatUnits(balance as bigint, 6);
  }

  /** Transfer USDC to a recipient. Amount in base units (6 decimals). */
  async transferUsdc(to: Address, amountBaseUnits: string): Promise<Hash> {
    if (this.walletMode === "caw" && this.cawClient) {
      const result = await this.cawClient.makePayment(to, amountBaseUnits);
      if (!result.success) {
        throw new Error(`CAW payment failed: ${result.error}`);
      }
      return result.txHash as Hash;
    }

    const amount = BigInt(amountBaseUnits);

    const { request } = await this.publicClient!.simulateContract({
      address: this.config.usdcAddress,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [to, amount],
      account: this.account!,
    });

    return this.walletClient!.writeContract(request);
  }

  /** Wait for a transaction to be confirmed */
  async waitForTx(hash: Hash): Promise<boolean> {
    if (this.walletMode === "caw") {
      // CAW handles confirmation internally
      return true;
    }

    const receipt = await this.publicClient!.waitForTransactionReceipt({
      hash,
      confirmations: 0,
    });
    return receipt.status === "success";
  }

  /** Format base units to display amount */
  formatUsdc(baseUnits: string): string {
    return formatUnits(BigInt(baseUnits), 6);
  }

  /** Sign an arbitrary message with the wallet's private key (EIP-191) */
  async signMessage(message: string): Promise<`0x${string}`> {
    if (this.walletMode === "caw") {
      throw new Error("Message signing not supported in CAW mode — use CAW API for signing");
    }
    return this.account!.signMessage({ message });
  }
}
