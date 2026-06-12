import { Router, type Router as ExpressRouter } from "express";
import { handleA2ARequest, handleAgentCard } from "../a2a/index.js";

const router: ExpressRouter = Router();

/**
 * @route   GET /.well-known/agent.json
 * @desc    A2A agent card discovery
 * @access  Public
 */
router.get("/.well-known/agent.json", handleAgentCard);

/**
 * @route   POST /a2a
 * @desc    A2A protocol request handler
 * @access  Public
 */
router.post("/a2a", handleA2ARequest);

export default router;
