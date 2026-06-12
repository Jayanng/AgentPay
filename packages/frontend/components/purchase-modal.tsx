"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  useX402Payment,
  type ResourceResult,
  type PaymentStatus,
} from "@/hooks/use-x402-payment";
import { getCurrencyDisplay, getTxUrl } from "@/lib/chain-config";
import {
  Code,
  FileText,
  Globe,
  Bot,
  Loader2,
  Wallet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { marked } from "marked";

// ── Item types ──────────────────────────────────────

export interface ResourceItem {
  id: string;
  slug?: string;
  type: "api" | "file" | "article" | "agent";
  name: string;
  description: string | null;
  priceUsdc: number;
  accessCount?: number;
  creator?: { name: string; username?: string };
}

export type PurchaseItem = { kind: "resource"; data: ResourceItem };

interface PurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PurchaseItem | null;
}

// ── Helpers ─────────────────────────────────────────

const TYPE_CONFIG: Record<string, { icon: typeof Code; color: string; label: string }> = {
  api: { icon: Code, color: "text-sp-blue bg-sp-blue/15", label: "API" },
  file: { icon: FileText, color: "text-sp-gold bg-sp-gold/15", label: "File" },
  article: { icon: Globe, color: "text-sp-coral bg-sp-coral/15", label: "Article" },
  agent: { icon: Bot, color: "text-sp-blue bg-sp-blue/15", label: "Agent" },
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  idle: "",
  "fetching-requirements": "Preparing payment...",
  "switching-network": "Switching network...",
  "awaiting-approval": "Approve transaction in your wallet",
  "confirming-tx": "Confirming transaction...",
  "verifying-payment": "Verifying payment...",
  success: "Payment successful!",
  error: "Payment failed",
};

// ── Component ───────────────────────────────────────

export function PurchaseModal({ open, onOpenChange, item }: PurchaseModalProps) {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { payForResource, status, error, txHash, reset } = useX402Payment();

  const [resourceResult, setResourceResult] = useState<ResourceResult | null>(null);

  // Reset state when modal opens/closes or item changes
  useEffect(() => {
    if (open) {
      reset();
      setResourceResult(null);
    }
  }, [open, item, reset]);

  // Revoke blob URLs when modal closes or component unmounts
  useEffect(() => {
    return () => {
      if (resourceResult?.downloaded?.url) {
        URL.revokeObjectURL(resourceResult.downloaded.url);
      }
    };
  }, [resourceResult]);

  if (!item) return null;

  const isProcessing = status !== "idle" && status !== "success" && status !== "error";

  const price = `${item.data.priceUsdc} ${getCurrencyDisplay()}`;

  const typeConfig = TYPE_CONFIG[item.data.type] || TYPE_CONFIG.api;
  const TypeIcon = typeConfig.icon;

  // ── Handlers ────────────────────────────────────

  const handleBuy = async () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    try {
      const result = await payForResource(item.data.slug || item.data.id);
      setResourceResult(result);
    } catch {
      // Error state is handled by the hook
    }
  };

  const handleRetry = () => {
    reset();
    setResourceResult(null);
  };

  // ── Render ──────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isProcessing) onOpenChange(o); }}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-3xl w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center ${typeConfig.color}`}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-bold truncate">
                {item.data.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">{typeConfig.label}</Badge>
                {item.data.creator && (
                  <span className="text-xs text-muted-foreground">
                    by {item.data.creator.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          {item.data.description && (
            <DialogDescription className="mt-3 text-sm text-muted-foreground">
              {item.data.description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Price */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted border border-border">
          <span className="text-sm text-muted-foreground font-medium">Price</span>
          <span className="text-xl font-bold text-primary">{price}</span>
        </div>

        {/* Payment status */}
        {isProcessing && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
            <div className="flex items-center gap-3">
              {status === "awaiting-approval" ? (
                <Wallet className="h-5 w-5 text-primary animate-pulse" />
              ) : (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              )}
              <span className="text-sm font-medium text-foreground">
                {STATUS_LABELS[status]}
              </span>
            </div>
            {txHash && (
              <a
                href={getTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View transaction <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {/* Error */}
        {status === "error" && error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Success: Resource (file download) */}
        {status === "success" && resourceResult?.downloaded && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Payment successful!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {resourceResult.downloaded.filename} is ready to download
                </p>
              </div>
            </div>
            {txHash && (
              <a
                href={getTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View transaction <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {resourceResult.downloaded.url && (
              <a
                href={resourceResult.downloaded.url}
                download={resourceResult.downloaded.filename}
                className="flex items-center justify-center gap-2 w-full p-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/10"
              >
                <FileText className="h-5 w-5" />
                Download {resourceResult.downloaded.filename}
              </a>
            )}
          </div>
        )}

        {/* Success: Resource (non-file) */}
        {status === "success" && resourceResult && !resourceResult.downloaded && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Access granted!</span>
            </div>
            {txHash && (
              <a
                href={getTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View transaction <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {/* Content display */}
            {(() => {
              // Extract article content (may be nested in response object)
              const raw = resourceResult.content as any;
              const articleText = raw?.content || (typeof raw === "string" ? raw : null);
              const isMarkdown = articleText && (
                resourceResult.contentType?.includes("markdown") ||
                raw?.contentType === "markdown" ||
                articleText.startsWith("#")
              );

              if (isMarkdown || (articleText && typeof articleText === "string")) {
                const htmlContent = marked.parse(articleText, { breaks: true }) as string;
                return (
                  <div className="p-6 rounded-xl bg-muted border border-border max-h-[50vh] overflow-y-auto">
                    <article
                      className="prose prose-sm prose-invert max-w-none prose-headings:text-foreground prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-primary prose-code:text-primary prose-code:bg-background prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-background prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4 prose-strong:text-foreground prose-li:text-muted-foreground prose-ul:list-disc prose-ol:list-decimal prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                  </div>
                );
              }

              // Fallback: JSON/raw content (APIs return JSON)
              return (
                <div className="p-4 rounded-xl bg-muted border border-border max-h-[50vh] overflow-y-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">
                    {typeof raw === "string" ? raw : JSON.stringify(raw, null, 2)}
                  </pre>
                </div>
              );
            })()}
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="gap-2 sm:gap-2">
          {status === "idle" && !isConnected && (
            <Button
              onClick={() => openConnectModal?.()}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold py-6"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet to Buy
            </Button>
          )}
          {status === "idle" && isConnected && (
            <Button
              onClick={handleBuy}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold py-6"
            >
              {item.data.type === "article" ? "Read for" : "Pay"} {price}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {status === "error" && (
            <Button
              onClick={handleRetry}
              variant="outline"
              className="w-full rounded-xl font-bold py-6 border-border"
            >
              Try Again
            </Button>
          )}
          {status === "success" && (
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold py-6"
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
