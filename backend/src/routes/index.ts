/**
 * Root router.
 * Mounts the versioned API sub-routers and a health-check endpoint.
 */
import { Router, type Request, type Response } from "express";
import certificateRoutes from "./certificate.routes";

const router = Router();

/**
 * GET /health
 * Unversioned health check – used by load balancers and Docker HEALTHCHECK.
 */
router.get("/health", (_req: Request, res: Response): void => {
  res.json({
    status: "ok",
    service: "stellarproof-backend",
    timestamp: new Date().toISOString(),
  });
});

/**
 * /api/v1/certificates  →  Paginated certificate portfolio for a creator
 */
router.use("/api/v1/certificates", certificateRoutes);

export default router;
