import { tool } from "ai";
import { z } from "zod";
import type { A2AClient } from "../a2a-client.js";

export function createBrowseTools(client: A2AClient) {
  const listResources = tool({
    description:
      "List all payment-gated resources (APIs, files, content, agent services). Returns resource slugs, names, prices, and types. Use the 'slug' field when calling access_resource.",
    parameters: z.object({}),
    execute: async () => {
      const resources = await client.listResources();
      return {
        resources: resources.map((r: any) => ({
          slug: r.slug || r._id || r.id,
          name: r.name || r.title,
          priceUsdc: r.priceUsdc || r.price,
          type: r.type,
          description: r.description?.slice(0, 200),
        })),
      };
    },
  });

  return { listResources };
}
