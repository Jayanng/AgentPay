# @agentpay/x402-sdk

> TypeScript SDK for implementing HTTP 402 payment flows on Ethereum and EVM chains

**@agentpay/x402-sdk** enables you to build payment-gated APIs and applications using the HTTP 402 Payment Required status code with USDC stablecoin payments on EVM chains.

## Features

- ✅ **HTTP 402 Payment Protocol** - Standard-based payment flow
- ✅ **EVM Native** - Built on Ethereum and EVM-compatible chains with USDC token
- ✅ **TypeScript First** - Fully typed for excellent DX
- ✅ **Express Middleware** - Drop-in server-side protection
- ✅ **Automatic Client** - Client that auto-pays when 402 is returned
- ✅ **On-Chain Verification** - Payment verification via blockchain
- ✅ **Zero Fees** - Peer-to-peer payments, no middleman

## Installation

```bash
npm install @agentpay/x402-sdk viem
# or
pnpm add @agentpay/x402-sdk viem
# or
yarn add @agentpay/x402-sdk viem
```

## Quick Start

### Server-Side (Express)

```typescript
import express from 'express';
import { X402Server } from '@agentpay/x402-sdk';

const app = express();
const x402 = new X402Server({
  network: 'sepolia',
  privateKey: process.env.ETH_PRIVATE_KEY!,
  recipientAddress: process.env.ETH_RECIPIENT_ADDRESS!,
  tokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC on Sepolia
});

// Protected endpoint requiring 1.00 USDC payment
app.get('/api/premium-data', 
  x402.middleware({ price: '1.00' }),
  (req, res) => {
    res.json({ 
      message: 'This is premium data!',
      data: { /* your protected content */ }
    });
  }
);

app.listen(3001);
```

### Client-Side

```typescript
import { X402Client } from '@agentpay/x402-sdk';

const client = new X402Client({
  network: 'sepolia',
  privateKey: process.env.WALLET_PRIVATE_KEY!,
  tokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC on Sepolia
});

// Automatically pays if 402 is returned
const response = await client.fetch('https://api.example.com/premium-data');
const data = await response.json();

console.log(data);
```

## Supported Networks

| Network | Chain ID | USDC Address | Type |
|---------|----------|-------------|------|
| Ethereum Mainnet | 1 | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | Mainnet |
| Sepolia | 11155111 | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | Testnet |
| Base | 8453 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Mainnet |
| Base Sepolia | 84532 | `0xa059e27967e5a573a14a62c706ebd1be75333f9a` | Testnet |
| Polygon | 137 | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` | Mainnet |
| Arbitrum | 42161 | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | Mainnet |
| Optimism | 10 | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` | Mainnet |
| Mantle Sepolia | 5003 | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | Testnet |
| Cronos | 25 | `0x0656d4295530cC9843A0c9e3F0C7c0A28A0aBda7` | Mainnet |

> **Note:** The default network for AgentPay is **Sepolia** (Ethereum testnet). All payment flows use **USDC** as the payment token.

## API Reference

### X402Server

Server-side payment verification and middleware.

#### Constructor

```typescript
const x402 = new X402Server({
  network: 'mainnet' | 'sepolia' | 'base-sepolia' | 'mantle-sepolia' | ...,
  privateKey: string,              // Your private key
  recipientAddress: string,        // Address to receive payments
  tokenAddress: string,            // USDC token address for the chosen network
  rpcUrl?: string,                 // Optional custom RPC
});
```

#### Middleware

```typescript
app.get('/api/resource',
  x402.middleware({
    price: '1.00',                 // Price in USDC (e.g., "1.00" = $1.00)
    metadata?: {                   // Optional metadata
      resourceId: 'xyz',
      description: 'Premium data access'
    }
  }),
  (req, res) => {
    // Payment verified, serve content
    res.json({ data: 'protected content' });
  }
);
```

#### Verify Payment

```typescript
const result = await x402.verifyPayment({
  txHash: '0xabc123...',           // Transaction hash
  expectedAmount: '1000000',       // Amount in token decimals (6 for USDC)
  expectedRecipient: '0x...',      // Your recipient address
});

if (result.verified) {
  console.log('Payment verified!');
  console.log('From:', result.from);
  console.log('Amount:', result.amount);
}
```

### X402Client

Client-side automatic payment handling.

#### Constructor

```typescript
const client = new X402Client({
  network: 'mainnet' | 'sepolia' | 'base-sepolia' | 'mantle-sepolia' | ...,
  privateKey: string,              // Your wallet private key
  tokenAddress: string,            // USDC token address for the chosen network
  rpcUrl?: string,                 // Optional custom RPC
  maxAutoPayment?: string,         // Max auto-payment (default: "10.00")
});
```

#### Fetch

```typescript
// Automatically handles 402 responses and makes payment
const response = await client.fetch(
  'https://api.example.com/resource',
  {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  }
);

const data = await response.json();
```

#### Manual Payment

```typescript
const txHash = await client.pay({
  to: '0x...',                     // Recipient address
  amount: '1.00',                  // Amount in USDC
});

console.log('Payment sent:', txHash);
```

#### Check Balance

```typescript
const balance = await client.getBalance();
console.log('USDC Balance:', balance.formatted);
console.log('ETH Balance:', balance.eth);
```

## TypeScript Types

```typescript
interface X402ServerConfig {
  network: NetworkId;
  privateKey: string;
  recipientAddress: string;
  tokenAddress: string;
  rpcUrl?: string;
}

interface X402ClientConfig {
  network: NetworkId;
  privateKey: string;
  tokenAddress: string;
  rpcUrl?: string;
  maxAutoPayment?: string;
}

interface MiddlewareOptions {
  price: string;
  metadata?: Record<string, any>;
  onPaymentVerified?: (payment: PaymentVerification) => Promise<void>;
}

interface PaymentVerification {
  verified: boolean;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  blockNumber: number;
}
```

## Examples

### Dynamic Pricing

```typescript
app.get('/api/dynamic',
  async (req, res, next) => {
    const price = calculatePrice(req.user);
    await x402.middleware({ price })(req, res, next);
  },
  (req, res) => {
    res.json({ data: 'content' });
  }
);
```

### Payment Callbacks

```typescript
app.get('/api/resource',
  x402.middleware({ 
    price: '1.00',
    onPaymentVerified: async (payment) => {
      await db.orders.create({
        txHash: payment.txHash,
        from: payment.from,
        amount: payment.amount,
      });
    }
  }),
  (req, res) => {
    res.json({ data: 'content' });
  }
);
```

### Error Handling

```typescript
try {
  const response = await client.fetch('https://api.example.com/resource');
  const data = await response.json();
} catch (error) {
  if (error.code === 'INSUFFICIENT_BALANCE') {
    console.error('Not enough USDC tokens');
  } else if (error.code === 'PAYMENT_REQUIRED') {
    console.error('Payment required but auto-pay disabled');
  } else if (error.code === 'PAYMENT_FAILED') {
    console.error('Payment transaction failed');
  }
}
```

## Contributing

Contributions are welcome! Please open an issue or PR.

## License

MIT

## Links

- [HTTP 402 Payment Required](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/402)
- [viem](https://viem.sh)
