import { Router, type Router as ExpressRouter, Request, Response, NextFunction } from "express";
import { handleResourceAccess } from "../api/x402-gateway.js";

const router: ExpressRouter = Router();

// ============================================================
// x402 RESOURCE DISCOVERY
// ============================================================

/**
 * @route   GET /x402/resources
 * @desc    List x402 resources
 * @access  Public
 */
router.get("/resources", async (req: Request, res: Response, next: NextFunction) => {
  const { listX402Resources } = await import("../controllers/resourcesController.js");
  return listX402Resources(req, res, next);
});

// ============================================================
// x402 ACCESS LOGS (for agents checking prior payments)
// ============================================================

/**
 * @route   GET /x402/my-access
 * @desc    List resources a wallet has already paid for
 * @access  Public (query param: wallet)
 */
router.get("/my-access", async (req: Request, res: Response) => {
  try {
    const wallet = (req.query.wallet as string)?.toLowerCase();
    if (!wallet) {
      return res.status(400).json({ error: "wallet query parameter is required" });
    }
    const { AccessLog } = await import("../models/index.js");
    const logs = await AccessLog.find({ walletAddress: wallet })
      .populate("resourceId", "name type slug priceUsdc")
      .sort({ accessedAt: -1 })
      .limit(100)
      .lean();

    const accessList = logs.map((log: any) => ({
      resourceId: log.resourceId?._id?.toString() || log.resourceId?.toString(),
      resourceName: log.resourceId?.name || "Unknown",
      resourceType: log.resourceId?.type || "unknown",
      slug: log.resourceId?.slug,
      priceUsdc: log.resourceId?.priceUsdc,
      amountPaid: log.amountUsdc,
      accessedAt: log.accessedAt,
      txSignature: log.paymentSignature,
    }));

    return res.json({ wallet, access: accessList, count: accessList.length });
  } catch (err: any) {
    console.error("[my-access] Error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

// ============================================================
// x402 UNIVERSAL GATEWAY (Public - payment protected)
// ============================================================

/**
 * @route   GET /x402/resource/:resourceId
 * @desc    Access a payment-gated resource (GET)
 * @access  Public (payment protected)
 */
router.get("/resource/:resourceId", handleResourceAccess);

/**
 * @route   POST /x402/resource/:resourceId
 * @desc    Access a payment-gated resource (POST)
 * @access  Public (payment protected)
 */
router.post("/resource/:resourceId", handleResourceAccess);

export default router;
