"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  Code,
  FileText,
  Globe,
  Bot,
  ExternalLink,
  Pencil,
  Trash2,
  Loader2,
  Copy,
  Check,
  Eye,
} from "lucide-react";
import { getCurrencyDisplay } from "@/lib/chain-config";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Resource {
  id: string;
  slug: string;
  type: "api" | "file" | "article" | "agent";
  name: string;
  description: string | null;
  priceUsdc: number;
  isActive: boolean;
  isPublic: boolean;
  accessCount: number;
  totalEarnings: number;
  createdAt: string;
}

const typeIcons = {
  api: Code,
  file: FileText,
  article: Globe,
  agent: Bot,
};

const typeColors = {
  api: "text-sp-blue bg-sp-blue/10",
  file: "text-sp-gold bg-sp-gold/10",
  article: "text-sp-coral bg-sp-coral/10",
  agent: "text-sp-blue bg-sp-blue/10",
};

export default function ResourcesPage() {
  const { token } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Filtering state
  const [activeTab, setActiveTab] = useState<"all" | "api" | "file" | "article" | "agent">("all");

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        // Fetch resources (authenticated)
        const resRes = await fetch(`${API_URL}/api/resources`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resRes.ok) {
          const data = await resRes.json();
          setResources(data.resources || []);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;

    try {
      const res = await fetch(`${API_URL}/api/resources/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setResources((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete resource:", err);
    }
  };

  const copyEndpoint = (resource: Resource) => {
    const endpoint = `${API_URL}/x402/resource/${resource.slug || resource.id}`;
    navigator.clipboard.writeText(endpoint);
    setCopiedId(resource.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
    return formatted + ' ' + getCurrencyDisplay();
  };

  const handlePreview = async (resource: Resource) => {
    setPreviewResource(resource);
    setLoadingPreview(true);
    setPreviewData(null);

    try {
      // Fetch resource details
      const res = await fetch(`${API_URL}/api/resources/${resource.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
      }
    } catch (err) {
      console.error("Failed to fetch preview:", err);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Filter resources
  const filteredResources = resources.filter((r) => {
    if (activeTab === "all") return true;
    return r.type === activeTab;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-sp-gold" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Resources</h1>
          <p className="text-muted-foreground mt-1">Manage your paywalled content</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/resources/new">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sp-gold text-white hover:bg-sp-gold/90 transition-colors shadow-lg shadow-sp-gold/10">
              <Plus className="h-4 w-4" />
              <span className="text-sm font-bold">New Resource</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${
            activeTab === "all"
              ? "bg-sp-gold text-white shadow-lg shadow-sp-gold/10"
              : "text-muted-foreground hover:text-sp-gold hover:bg-sp-gold/10"
          }`}
        >
          All ({resources.length})
        </button>
        <button
          onClick={() => setActiveTab("api")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "api"
              ? "bg-sp-gold text-white shadow-lg shadow-sp-gold/10"
              : "text-muted-foreground hover:text-sp-gold hover:bg-sp-gold/10"
          }`}
        >
          <Code className="h-4 w-4" />
          API ({resources.filter((r) => r.type === "api").length})
        </button>
        <button
          onClick={() => setActiveTab("file")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "file"
              ? "bg-sp-gold text-white shadow-lg shadow-sp-gold/10"
              : "text-muted-foreground hover:text-sp-gold hover:bg-sp-gold/10"
          }`}
        >
          <FileText className="h-4 w-4" />
          Files ({resources.filter((r) => r.type === "file").length})
        </button>
        <button
          onClick={() => setActiveTab("article")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "article"
              ? "bg-sp-gold text-white shadow-lg shadow-sp-gold/10"
              : "text-muted-foreground hover:text-sp-gold hover:bg-sp-gold/10"
          }`}
        >
          <Globe className="h-4 w-4" />
          Articles ({resources.filter((r) => r.type === "article").length})
        </button>
        <button
          onClick={() => setActiveTab("agent")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "agent"
              ? "bg-sp-gold text-white shadow-lg shadow-sp-gold/10"
              : "text-muted-foreground hover:text-sp-gold hover:bg-sp-gold/10"
          }`}
        >
          <Bot className="h-4 w-4" />
          Agents ({resources.filter((r) => r.type === "agent").length})
        </button>

      </div>

      {/* Resources List */}
      {filteredResources.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-sp-gold/10 flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-sp-gold" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No resources yet</h3>
            <p className="text-muted-foreground text-sm mb-6 text-center max-w-sm">
              {`Create your first paywalled resource to start earning ${getCurrencyDisplay()}`}
            </p>
            <Link href="/dashboard/resources/new">
              <button className="px-4 py-2 rounded-xl bg-sp-gold text-white hover:bg-sp-gold/90 transition-colors shadow-lg shadow-sp-gold/10 font-bold">
                Create Resource
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredResources.map((resource) => {
              const Icon = typeIcons[resource.type];
              return (
                <div
                  key={resource.id}
                  className="bg-card border border-border hover:border-sp-gold/30 transition-all rounded-2xl p-4 group"
                >
                  <div className="flex items-start gap-4">
                    {/* Type Icon */}
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-sp-gold/10 text-sp-gold group-hover:bg-sp-gold group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-foreground truncate">{resource.name}</h3>
                          {!resource.isActive && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                              Inactive
                            </span>
                          )}
                        </div>
                        {resource.description && (
                          <p className="text-sm text-muted-foreground truncate mb-2">
                            {resource.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="capitalize">{resource.type}</span>
                          <span>•</span>
                          <span className="text-sp-gold font-medium">{formatCurrency(resource.priceUsdc)}</span>
                          <span>•</span>
                          <span>{resource.accessCount || 0} accesses</span>
                          <span>•</span>
                          <span className="text-sp-gold font-medium">{formatCurrency(resource.totalEarnings || 0)} earned</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePreview(resource)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-sp-gold hover:bg-sp-gold/10 transition-colors"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => copyEndpoint(resource)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-sp-gold hover:bg-sp-gold/10 transition-colors"
                          title="Copy endpoint"
                        >
                          {copiedId === resource.id ? (
                            <Check className="h-4 w-4 text-sp-gold" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <a
                          href={`${API_URL}/x402/resource/${resource.slug || resource.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg text-muted-foreground hover:text-sp-gold hover:bg-sp-gold/10 transition-colors"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-lg text-muted-foreground hover:text-sp-gold hover:bg-sp-gold/10 transition-colors">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/dashboard/resources/${resource.id}/edit`}
                                className="flex items-center gap-2 text-foreground hover:text-sp-gold"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(resource.id)}
                              className="text-red-400 focus:text-red-400"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
              );
            })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewResource} onOpenChange={() => setPreviewResource(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {previewResource && (
                <>
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${typeColors[previewResource.type]}`}>
                    {(() => {
                      const Icon = typeIcons[previewResource.type];
                      return <Icon className="h-5 w-5" />;
                    })()}
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{previewResource.name}</div>
                    <div className="text-sm text-muted-foreground font-normal capitalize">
                      {previewResource.type} Resource
                    </div>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {loadingPreview ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-sp-gold" />
            </div>
          ) : previewData ? (
            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Description</div>
                <div className="text-sm">{previewResource?.description || "No description"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Price</div>
                <div className="text-sm">{formatCurrency(previewResource?.priceUsdc || 0)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Stats</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Accesses:</span> {previewResource?.accessCount}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Earned:</span> {formatCurrency(previewResource?.totalEarnings || 0)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No preview data available
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
