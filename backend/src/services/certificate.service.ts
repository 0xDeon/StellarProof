/**
 * Certificate Service – business logic for retrieving a user's certificate portfolio.
 *
 * Certificates are queried from MongoDB filtered by `creatorId` (the Stellar
 * public key of the certificate owner).
 *
 * Pagination is implemented with MongoDB `skip` / `limit` and a parallel
 * `countDocuments` call so callers always know the full result-set size.
 */
import { StatusCodes } from "http-status-codes";
import { CertificateModel } from "../models/certificate.model";
import { AppError } from "../errors/AppError";
import type {
  ICertificate,
  ListCertificatesQuery,
  CertificateListResult,
} from "../types/certificate.types";

/**
 * Returns a paginated list of certificates belonging to the given creator.
 * Results are sorted newest-first (`createdAt` descending).
 *
 * @throws {AppError} 400 – if `limit` or `skip` values are out of range.
 * @throws {AppError} 404 – if the creator has no certificates.
 */
async function listCertificates(
  query: ListCertificatesQuery
): Promise<CertificateListResult> {
  const { creatorId, limit, skip } = query;

  if (limit < 1 || limit > 100) {
    throw new AppError(
      "limit must be between 1 and 100",
      StatusCodes.BAD_REQUEST,
      "INVALID_PAGINATION"
    );
  }

  if (skip < 0) {
    throw new AppError(
      "skip must be a non-negative integer",
      StatusCodes.BAD_REQUEST,
      "INVALID_PAGINATION"
    );
  }

  const filter = { creatorId };

  const [certificates, total] = await Promise.all([
    CertificateModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<ICertificate[]>(),
    CertificateModel.countDocuments(filter),
  ]);

  return { certificates, total, limit, skip };
}

export const certificateService = {
  listCertificates,
} as const;
