/**
 * Mongoose model for provenance Certificate documents.
 *
 * Schema design decisions:
 * - `creatorId` is indexed: enables efficient paginated lookups by user.
 * - `contentHash` is unique: prevents duplicate certificates for the same content.
 * - `onChainCertId` is sparse-unique: only enforced when the field is present,
 *   allowing pending certificates (not yet minted on-chain) without conflicts.
 * - Timestamps are enabled via Mongoose options (adds `createdAt` / `updatedAt`).
 */
import { Schema, model, Document } from "mongoose";
import type { ICertificate, CertificateStatus } from "../types/certificate.types";

const CERTIFICATE_STATUSES: CertificateStatus[] = [
  "pending",
  "confirmed",
  "revoked",
];

export type CertificateDocument = ICertificate & Document;

const CertificateSchema = new Schema<CertificateDocument>(
  {
    creatorId: {
      type: String,
      required: [true, "creatorId is required"],
      trim: true,
      index: true,
    },
    contentHash: {
      type: String,
      required: [true, "contentHash is required"],
      unique: true,
      trim: true,
    },
    manifestHash: {
      type: String,
      required: [true, "manifestHash is required"],
      trim: true,
    },
    attestationHash: {
      type: String,
      required: [true, "attestationHash is required"],
      trim: true,
    },
    storageId: {
      type: String,
      required: [true, "storageId is required"],
      trim: true,
    },
    onChainCertId: {
      type: Number,
      sparse: true,
      default: undefined,
    },
    stellarTxHash: {
      type: String,
      trim: true,
      default: undefined,
    },
    status: {
      type: String,
      required: [true, "status is required"],
      enum: {
        values: CERTIFICATE_STATUSES,
        message: `status must be one of: ${CERTIFICATE_STATUSES.join(", ")}`,
      },
      default: "pending",
    },
    onChainTimestamp: {
      type: Number,
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const CertificateModel = model<CertificateDocument>(
  "Certificate",
  CertificateSchema
);
