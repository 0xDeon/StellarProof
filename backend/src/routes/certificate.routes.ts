/**
 * Certificate Routes – request validation schemas and route definitions.
 *
 * Endpoints:
 *   GET /api/v1/certificates?creatorId=G...&limit=20&skip=0
 *     Returns a paginated list of certificates owned by the given Stellar address.
 *
 * All Zod schemas are co-located with the routes that use them.
 * Regex follows the Stellar address specification:
 *   - Public keys → G + 55 base32 chars (Ed25519, 56 chars total)
 */
import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { certificateController } from "../controllers/certificate.controller";

// ---------------------------------------------------------------------------
// Validation patterns
// ---------------------------------------------------------------------------
const STELLAR_PUBLIC_KEY_REGEX = /^G[A-Z2-7]{55}$/;

// ---------------------------------------------------------------------------
// Zod schema – query parameters for the certificate list endpoint
// ---------------------------------------------------------------------------
const listCertificatesQuerySchema = z.object({
  creatorId: z
    .string()
    .regex(
      STELLAR_PUBLIC_KEY_REGEX,
      "creatorId must be a valid Stellar public key (G...)"
    ),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform(Number)
    .pipe(
      z
        .number()
        .int("limit must be an integer")
        .min(1, "limit must be at least 1")
        .max(100, "limit must be at most 100")
    ),
  skip: z
    .string()
    .optional()
    .default("0")
    .transform(Number)
    .pipe(
      z
        .number()
        .int("skip must be an integer")
        .min(0, "skip must be a non-negative integer")
    ),
});

// ---------------------------------------------------------------------------
// Query validation middleware
// ---------------------------------------------------------------------------
function validateListCertificatesQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = listCertificatesQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: "Invalid query parameters",
      details: result.error.flatten().fieldErrors,
    });
    return;
  }
  // Overwrite req.query with the coerced + validated values so the controller
  // receives already-parsed numbers rather than raw strings.
  req.query = result.data as unknown as typeof req.query;
  next();
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const router = Router();

/**
 * GET /api/v1/certificates?creatorId=G...&limit=20&skip=0
 *
 * Query parameters:
 *   - creatorId  (required) – Stellar G-address of the certificate owner.
 *   - limit      (optional, 1–100, default 20) – page size.
 *   - skip       (optional, ≥0, default 0)     – offset for pagination.
 *
 * Response 200:
 * {
 *   "success": true,
 *   "data": {
 *     "certificates": [ ...ICertificate ],
 *     "total": 42,
 *     "limit": 20,
 *     "skip": 0
 *   }
 * }
 */
router.get(
  "/",
  validateListCertificatesQuery,
  certificateController.listCertificates.bind(certificateController)
);

export default router;
