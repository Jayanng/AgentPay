import { Router, type Router as ExpressRouter, Request, Response } from "express";
import { Resource, Creator } from "../models/index.js";

const router: ExpressRouter = Router();

/**
 * @route   GET /api/explore
 * @desc    Get all data for explore page (resources, creators)
 * @access  Public
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { type, search, limit, offset } = req.query;
    const limitNum = Math.max(1, Math.min(parseInt(limit as string) || 50, 100));
    const offsetNum = Math.max(0, parseInt(offset as string) || 0);

    const resourceFilter: any = { isActive: true, isPublic: true };
    if (type) resourceFilter.type = type;
    if (search) {
      const escapedSearch = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      resourceFilter.name = { $regex: escapedSearch, $options: 'i' };
    }

    const [resources, creators] = await Promise.all([
      Resource.find(resourceFilter)
        .populate('creatorId', 'walletAddress name username avatarUrl')
        .sort({ accessCount: -1 })
        .skip(offsetNum)
        .limit(limitNum)
        .lean(),
      Creator.find({ isPublic: true })
        .sort({ totalSales: -1 })
        .limit(20)
        .lean(),
    ]);

    const formattedResources = resources.map((r: any) => ({
      id: r._id.toString(),
      slug: r.slug,
      type: r.type,
      name: r.name,
      description: r.description,
      priceUsdc: r.priceUsdc,
      accessCount: r.accessCount,
      endpoint: `/x402/resource/${r.slug || r._id}`,
      creator: r.creatorId ? {
        id: r.creatorId._id?.toString(),
        walletAddress: r.creatorId.walletAddress,
        name: r.creatorId.name,
        username: r.creatorId.username,
        avatarUrl: r.creatorId.avatarUrl,
      } : null,
    }));

    const formattedCreators = creators.map((c: any) => ({
      id: c._id.toString(),
      username: c.username,
      name: c.name || c.displayName,
      avatarUrl: c.avatarUrl,
      totalSales: c.totalSales,
      totalRevenue: c.totalRevenueUsdc,
    }));

    return res.json({
      resources: formattedResources,
      creators: formattedCreators,
      count: formattedResources.length,
      nextOffset: formattedResources.length === limitNum ? offsetNum + limitNum : null,
    });
  } catch (err: any) {
    console.error("[Explore] Error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

export default router;
