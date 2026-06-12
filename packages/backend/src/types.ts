// AgentPay Service & Payment Types

// Resource Types
export type ResourceConfig = {
  upstream_url?: string;
  method?: string;
  headers?: Record<string, string>;
  storage_key?: string;
  mime_type?: string;
  filename?: string;
  size_bytes?: number;
  content?: string;
  agent_endpoint?: string;
};

export type ResourceType = "api" | "file" | "article" | "agent";

export type AgentService = {
  id: string;
  slug?: string;
  type: ResourceType;
  name: string;
  description?: string;
  priceUsdc: number;
  config?: ResourceConfig;
  isActive: boolean;
  accessCount: number;
  totalRevenue: number;
  createdAt: Date;
  updatedAt: Date;
};

// Payment Types
export type Amounts = {
  total: string;
  currency: string;
};

export type PaymentRequirements = {
  scheme: string;
  network: string;
  chainId: number;
  token: string;
  amount: string;
  recipient: string;
  requestId?: string;
  memo?: string;
};

export type PaymentProof = {
  txHash: string;
  transactionHash: string;
  network: string;
  chainId: number;
  timestamp: number;
};



// Access Log Types
export type AccessRecord = {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  amountPaid: number;
  accessedAt: Date;
  txSignature: string;
};

// API Response Types
export type ApiErrorResponse = {
  error: string;
  details?: any;
  status?: number;
};

export type ApiSuccessResponse<T> = T;
