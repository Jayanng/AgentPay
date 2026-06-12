import { Router, type Router as ExpressRouter } from "express";
import { handleGetPublicProfile, handleGetServiceDetail } from "../api/public-profile.js";

const router: ExpressRouter = Router();

/**
 * @route   GET /@:username
 * @desc    Get public profile for a creator
 * @access  Public
 */
router.get("/@:username", handleGetPublicProfile);

/**
 * @route   GET /@:username/service/:serviceSlug
 * @desc    Get agent service detail for a creator
 * @access  Public
 */
router.get("/@:username/service/:serviceSlug", handleGetServiceDetail);

export default router;
