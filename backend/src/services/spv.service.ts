import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import crypto from 'crypto';
import { Readable } from 'stream';
import mongoose from 'mongoose';
import SPVRecord, { ISPVRecord } from '../models/SPVRecord.model';
import KMSKey from '../models/KMSKey.model';
import Asset, { IAsset } from '../models/Asset.model';

function resolveCloudinaryConfig(): void {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      'Missing Cloudinary environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
    );
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
}

function resolveMasterKey(): Buffer {
  const hex = process.env.KMS_MASTER_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('KMS_MASTER_KEY must be a 64-character hex string (32 bytes for AES-256)');
  }
  return Buffer.from(hex, 'hex');
}

export interface UploadEncryptedAssetParams {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  creatorId: mongoose.Types.ObjectId;
  accessType: ISPVRecord['accessType'];
  allowedUsers?: mongoose.Types.ObjectId[];
  nftContractAddress?: string;
}

export interface UploadEncryptedAssetResult {
  spvRecord: ISPVRecord;
  asset: IAsset;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
}

class SPVService {
  async uploadEncryptedAsset(params: UploadEncryptedAssetParams): Promise<UploadEncryptedAssetResult> {
    // 1. Generate a one-time AES-256-GCM key and nonce for this asset
    const symmetricKey = crypto.randomBytes(32); // 256-bit key
    const assetIv = crypto.randomBytes(12);       // 96-bit GCM nonce

    // 2. Encrypt the file buffer
    const cipher = crypto.createCipheriv('aes-256-gcm', symmetricKey, assetIv);
    const ciphertext = Buffer.concat([cipher.update(params.fileBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag(); // 128-bit integrity tag

    // Upload layout: [16-byte authTag | 12-byte IV | ciphertext]
    // The IV is embedded so the decryptor is self-contained
    const uploadBuffer = Buffer.concat([authTag, assetIv, ciphertext]);

    // 3. Wrap the symmetric key with the server master key before DB storage
    const masterKey = resolveMasterKey();
    const keyIv = crypto.randomBytes(12);
    const keyCipher = crypto.createCipheriv('aes-256-gcm', masterKey, keyIv);
    const wrappedKey = Buffer.concat([keyCipher.update(symmetricKey), keyCipher.final()]);
    const keyAuthTag = keyCipher.getAuthTag();
    // Stored value layout: base64([16-byte authTag | wrappedKey])
    const encryptedKeyValue = Buffer.concat([keyAuthTag, wrappedKey]).toString('base64');

    // 4. Upload the encrypted payload to Cloudinary with resource_type: 'raw'
    //    This bypasses Cloudinary's image/video processing pipeline and stores
    //    the raw byte stream without transformation or validation.
    resolveCloudinaryConfig();
    const publicId = `stellarproof/spv/${params.creatorId}/${crypto.randomUUID()}`;
    const cloudinaryResult = await this.streamToCloudinary(uploadBuffer, publicId);

    // 5. Persist to MongoDB — roll back the Cloudinary asset on any DB failure
    try {
      const kmsKey = await KMSKey.create({
        creatorId: params.creatorId,
        keyVersion: 'v1',
        algorithm: 'AES-256-GCM',
        encryptedKeyValue,
        iv: keyIv.toString('hex'),
        isActive: true,
      });

      const asset = await Asset.create({
        creatorId: params.creatorId,
        fileName: params.fileName,
        mimeType: params.mimeType,
        sizeBytes: params.fileBuffer.length,
        storageProvider: 'cloudinary',
        storageReferenceId: cloudinaryResult.public_id,
        isEncrypted: true,
        encryptionKeyVersion: kmsKey.keyVersion,
        accessPolicy: params.accessType,
      });

      const spvRecord = await SPVRecord.create({
        assetId: asset._id,
        creatorId: params.creatorId,
        kmsKeyId: kmsKey._id,
        accessType: params.accessType,
        allowedUsers: params.allowedUsers ?? [],
        nftContractAddress: params.nftContractAddress,
        isSealed: true,
      });

      return {
        spvRecord,
        asset,
        cloudinaryUrl: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id,
      };
    } catch (dbError) {
      // Prevent orphaned Cloudinary resources when DB operations fail
      await cloudinary.uploader
        .destroy(cloudinaryResult.public_id, { resource_type: 'raw' })
        .catch(() => undefined);
      throw dbError;
    }
  }

  async getSPVRecord(
    spvId: string,
    requestingUserId: mongoose.Types.ObjectId,
  ): Promise<ISPVRecord | null> {
    if (!mongoose.Types.ObjectId.isValid(spvId)) return null;

    const record = await SPVRecord.findById(spvId)
      .populate('assetId')
      .populate('kmsKeyId', '-encryptedKeyValue -iv') // never expose raw key material
      .exec();

    if (!record) return null;

    const isCreator = record.creatorId.equals(requestingUserId);

    if (record.accessType === 'private' && !isCreator) return null;

    if (record.accessType === 'specific_users') {
      const isAllowed = record.allowedUsers?.some((id) => id.equals(requestingUserId));
      if (!isCreator && !isAllowed) return null;
    }

    return record;
  }

  private streamToCloudinary(buffer: Buffer, publicId: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw', // Accept encrypted byte streams without image/video processing
          public_id: publicId,
          overwrite: false,
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload_stream returned no result'));
            return;
          }
          resolve(result);
        },
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  }
}

export const spvService = new SPVService();
