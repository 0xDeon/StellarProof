/**
 * Domain types for the Certificate service.
 * Shared across all layers: models, services, controllers, and routes.
 *
 * Certificate fields mirror the on-chain Soroban `Certificate` struct
 * defined in contracts/provenance/src/lib.rs.
 */

/** Lifecycle state of a provenance certificate. */
export type CertificateStatus = "pending" | "confirmed" | "revoked";

/**
 * Shape of a Certificate document as stored in MongoDB.
 * The `_id` field is added by Mongoose at persistence time.
 */
export interface ICertificate {
  _id?: string;
  /**
   * Stellar G-address of the certificate creator (the verified asset owner).
   * Indexed for efficient paginated lookups by user.
   */
  creatorId: string;
  /** SHA-256 hex digest of the verified content. */
  contentHash: string;
  /** SHA-256 hex digest of the associated manifest. */
  manifestHash: string;
  /** Hash of the attestation produced by the TEE oracle. */
  attestationHash: string;
  /** IPFS CID or off-chain storage reference for the certified asset. */
  storageId: string;
  /** On-chain certificate ID assigned by the Soroban provenance contract. */
  onChainCertId?: number;
  /** Stellar transaction hash of the mint transaction. */
  stellarTxHash?: string;
  /** Lifecycle state of this certificate. */
  status: CertificateStatus;
  /** Unix ledger timestamp set by the Soroban contract at mint time. */
  onChainTimestamp?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Validated query parameters for GET /api/v1/certificates */
export interface ListCertificatesQuery {
  creatorId: string;
  /** Maximum number of records to return (1–100, default 20). */
  limit: number;
  /** Number of records to skip for offset-based pagination (default 0). */
  skip: number;
}

/** Paginated response envelope for the certificate list endpoint. */
export interface CertificateListResult {
  certificates: ICertificate[];
  total: number;
  limit: number;
  skip: number;
}

/** Standard JSON envelope returned by every endpoint. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
