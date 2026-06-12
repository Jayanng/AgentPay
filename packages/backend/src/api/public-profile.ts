/**
 * Public Profile API
 * 
 * Handles public creator profiles at /@username
 */

import { Request, Response } from "express";
import { Creator, Resource } from "../models/index.js";

/**
 * GET /@:username
 * Get creator's public profile with all content
 */
export async function handleGetPublicProfile(req: Request, res: Response) {
  try {
    const { username } = req.params;

    // Find creator
    const creator = await Creator.findOne({
      username: username.toLowerCase(),
      isPublic: true,
    }).lean();

    if (!creator) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Fetch digital resources
    const resources = await Resource.find({
      creatorId: creator._id,
      isPublic: true,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Format response
    return res.json({
      profile: {
        username: creator.username,
        displayName: creator.displayName || creator.name,
        avatarUrl: creator.avatarUrl,
        bio: creator.bio,
        website: creator.website,
        walletAddress: creator.walletAddress,
        socialLinks: creator.socialLinks,
        stats: creator.showStats
          ? {
              totalSales: creator.totalSales,
              totalRevenue: creator.totalRevenueUsdc,
            }
          : null,
      },
      content: {
        resources: resources.map((r) => ({
          id: r._id.toString(),
          slug: r.slug,
          type: r.type,
          name: r.name,
          description: r.description,
          price: r.priceUsdc,
          accessCount: r.accessCount,
        })),
      },
    });
  } catch (err: any) {
    console.error("Get public profile error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}

/**
 * GET /@:username/service/:serviceSlug
 * Get details for a specific agent service
 */
export async function handleGetServiceDetail(req: Request, res: Response) {
  try {
    const { username, serviceSlug } = req.params;

    // Find creator
    const creator = await Creator.findOne({
      username: username.toLowerCase(),
      isPublic: true,
    }).lean();

    if (!creator) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Find resource by slug
    const resource = await Resource.findOne({
      creatorId: creator._id,
      $or: [
        { slug: serviceSlug },
        { id: `agent/${serviceSlug}` },
      ],
      isActive: true,
    }).lean();

    if (!resource) {
      return res.status(404).json({ error: "Service not found" });
    }

    return res.json({
      service: {
        id: resource._id.toString(),
        slug: resource.slug,
        type: resource.type,
        name: resource.name,
        description: resource.description,
        price: resource.priceUsdc,
        accessCount: resource.accessCount,
        endpoint: `/x402/resource/${resource.slug || resource._id}`,
      },
      creator: {
        username: creator.username,
        displayName: creator.displayName || creator.name,
        avatarUrl: creator.avatarUrl,
      },
    });
  } catch (err: any) {
    console.error("Get service detail error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
