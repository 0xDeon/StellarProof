/**
 * Certificate Controller – thin HTTP adapter layer.
 *
 * Each method:
 *  1. Extracts validated data from the request (query params are already
 *     validated by route middleware before reaching here).
 *  2. Delegates to the certificate service layer.
 *  3. Wraps the result in the standard ApiResponse envelope.
 *  4. Forwards any errors to the global error handler via `next(err)`.
 *
 * No business logic lives here.
 */
import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { certificateService } from "../services/certificate.service";
import type { ListCertificatesQuery } from "../types/certificate.types";

export class CertificateController {
  /**
   * GET /api/v1/certificates?creatorId=G...&limit=20&skip=0
   * Returns a paginated list of certificates belonging to the given creator.
   */
  async listCertificates(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query: ListCertificatesQuery = {
        creatorId: req.query.creatorId as string,
        limit: Number(req.query.limit),
        skip: Number(req.query.skip),
      };

      const result = await certificateService.listCertificates(query);

      res.status(StatusCodes.OK).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const certificateController = new CertificateController();
