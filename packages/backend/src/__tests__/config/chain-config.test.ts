import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CHAIN_REGISTRY,
  TOKEN_DECIMALS,
  DEFAULT_NETWORK,
  DEFAULT_ASSET,
  SPAY_SCHEME,
  isValidNetwork,
  getChainMetadata,
  getChainId,
  isNativeToken,
  getTokenDecimalsForNetwork,
  getTokenAddressForNetwork,
  getAvailableTokens,
  getDefaultPaymentToken,
  getCurrencyDisplayName,
  getSupportedNetworks,
  getChainConfig,
  getNetwork,
  getCurrency,
  getTokenAddress,
  getTokenDecimals,
  isTestnet,
  getCurrencyDisplay,
  getTxUrl,
  type NetworkId,
} from "../../config/chain-config.js";

describe("Module constants", () => {
  it("should export DEFAULT_NETWORK as a valid network", () => {
    expect(isValidNetwork(DEFAULT_NETWORK)).toBe(true);
  });

  it("should export DEFAULT_ASSET", () => {
    expect(DEFAULT_ASSET).toBe("USDC");
  });

  it("should export SPAY_SCHEME", () => {
    expect(SPAY_SCHEME).toBe("spay");
  });
});

describe("CHAIN_REGISTRY", () => {
  it("should have 13 networks", () => {
    expect(Object.keys(CHAIN_REGISTRY).length).toBe(13);
  });

  it("should have Sepolia", () => {
    const sep = CHAIN_REGISTRY["sepolia"];
    expect(sep.chainId).toBe(11155111);
    expect(sep.name).toBe("Sepolia Testnet");
    expect(sep.isTestnet).toBe(true);
    expect(sep.tokens.USDC?.address).toBe(
      "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
    );
  });
});

describe("isValidNetwork", () => {
  it("should return true for valid networks", () => {
    expect(isValidNetwork("mainnet")).toBe(true);
    expect(isValidNetwork("sepolia")).toBe(true);
  });

  it("should return false for invalid networks", () => {
    expect(isValidNetwork("bogus")).toBe(false);
    expect(isValidNetwork("")).toBe(false);
  });
});

describe("getChainMetadata", () => {
  it("should return metadata for valid network", () => {
    const meta = getChainMetadata("mainnet");
    expect(meta.chainId).toBe(1);
    expect(meta.name).toBe("Ethereum Mainnet");
  });

  it("should throw for invalid network", () => {
    expect(() => getChainMetadata("bogus" as NetworkId)).toThrow();
  });
});

describe("getChainId", () => {
  it("should return chain IDs", () => {
    expect(getChainId("mainnet")).toBe(1);
    expect(getChainId("sepolia")).toBe(11155111);
  });
});

describe("isNativeToken", () => {
  it("should identify native tokens", () => {
    expect(isNativeToken("ETH")).toBe(true);
    expect(isNativeToken("CRO")).toBe(true);
    expect(isNativeToken("MNT")).toBe(true);
  });

  it("should identify non-native tokens", () => {
    expect(isNativeToken("USDC")).toBe(false);
    expect(isNativeToken("USDT")).toBe(false);
  });
});

describe("getTokenDecimalsForNetwork", () => {
  it("should return native token decimals", () => {
    expect(getTokenDecimalsForNetwork("mainnet", "ETH")).toBe(18);
  });

  it("should return ERC20 decimals", () => {
    expect(getTokenDecimalsForNetwork("mainnet", "USDC")).toBe(6);
  });
});

describe("getTokenAddressForNetwork", () => {
  it("should return null for native tokens", () => {
    expect(getTokenAddressForNetwork("mainnet", "ETH")).toBeNull();
  });

  it("should return address for ERC20", () => {
    const addr = getTokenAddressForNetwork("mainnet", "USDC");
    expect(addr).toBeTruthy();
    expect(addr!.startsWith("0x")).toBe(true);
  });
});

describe("getAvailableTokens", () => {
  it("should include native and ERC20 tokens", () => {
    const tokens = getAvailableTokens("sepolia");
    expect(tokens).toContain("ETH");
    expect(tokens).toContain("USDC");
  });
});

describe("getDefaultPaymentToken", () => {
  it("should return defaults", () => {
    expect(getDefaultPaymentToken("mainnet")).toBe("USDC");
    expect(getDefaultPaymentToken("mantle-sepolia")).toBe("MNT");
  });
});

describe("getCurrencyDisplayName", () => {
  it("should use displayCurrency for special networks", () => {
    expect(getCurrencyDisplayName("sepolia", "USDC")).toBe("USDC");
    expect(getCurrencyDisplayName("cronos-testnet", "USDC")).toBe("devUSDC.e");
  });

  it("should return symbol for normal networks", () => {
    expect(getCurrencyDisplayName("mainnet", "USDC")).toBe("USDC");
  });
});

describe("getSupportedNetworks", () => {
  it("should return all networks", () => {
    const networks = getSupportedNetworks();
    expect(networks.length).toBe(13);
    expect(networks).toContain("mainnet");
    expect(networks).toContain("sepolia");
  });
});

describe("getChainConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should default to sepolia", () => {
    delete process.env.X402_CHAIN;
    delete process.env.X402_CURRENCY;
    delete process.env.X402_TOKEN_ADDRESS;
    delete process.env.X402_TOKEN_DECIMALS;
    const config = getChainConfig();
    expect(config.network).toBe("sepolia");
    expect(config.chainId).toBe(11155111);
    expect(config.isTestnet).toBe(true);
  },

  it("should respect X402_CHAIN env var", () => {
    process.env.X402_CHAIN = "mainnet";
    const config = getChainConfig();
    expect(config.network).toBe("mainnet");
    expect(config.chainId).toBe(1);
  });

  it("should fall back for unknown network", () => {
    process.env.X402_CHAIN = "nonexistent";
    const config = getChainConfig();
    expect(config.network).toBe("sepolia");
  });

  it("should respect X402_CURRENCY env var", () => {
    process.env.X402_CURRENCY = "ETH";
    const config = getChainConfig();
    expect(config.currency).toBe("ETH");
  });

  it("should respect X402_TOKEN_DECIMALS env var", () => {
    process.env.X402_TOKEN_DECIMALS = "8";
    const config = getChainConfig();
    expect(config.tokenDecimals).toBe(8);
  });
});

describe("Convenience functions", () => {
  it("getTxUrl should build explorer URL", () => {
    const url = getTxUrl("0xabc");
    expect(url).toContain("/tx/0xabc");
  });
});

describe("TOKEN_DECIMALS", () => {
  it("should have all token decimals", () => {
    expect(TOKEN_DECIMALS.ETH).toBe(18);
    expect(TOKEN_DECIMALS.USDC).toBe(6);
    expect(TOKEN_DECIMALS.USDT).toBe(6);
    expect(TOKEN_DECIMALS.DAI).toBe(18);
  });
});
