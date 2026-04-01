import crypto from 'crypto'
import mongoose from 'mongoose'
import KMSKey, { IKMSKey } from '../models/KMSKey.model'


class KMSService {
  private readonly ALGORITHM = 'aes-256-gcm'
  private readonly KEY_LENGTH = 32 // 32 bytes = 256 bits
  private readonly IV_LENGTH = 12  // 12 bytes for GCM


  private getMasterKey(): Buffer {
    const masterKey = process.env.KMS_MASTER_KEY

    if (!masterKey) {
      throw new Error('KMS master key is not configured')
    }

    const keyBuffer = Buffer.from(masterKey, 'base64')

    if (keyBuffer.length !== 32) {
      throw new Error('KMS master key must be 32 bytes (base64 encoded)')
    }

    return keyBuffer
  }


  private encryptWithMasterKey(plainKey: Buffer) {
    const masterKey = this.getMasterKey()

    const iv = crypto.randomBytes(this.IV_LENGTH)
    const cipher = crypto.createCipheriv(this.ALGORITHM, masterKey, iv)

    const encrypted = Buffer.concat([
      cipher.update(plainKey),
      cipher.final(),
    ])

    const authTag = cipher.getAuthTag()

    return {
      encryptedKey: Buffer.concat([encrypted, authTag]).toString('base64'),
      iv: iv.toString('base64'),
    }
  }

  async generateKey(params: {
    creatorId: string
    keyVersion?: string
    expiresAt?: Date
  }): Promise<IKMSKey> {
    try {
      const rawKey = crypto.randomBytes(this.KEY_LENGTH)

      const { encryptedKey, iv } = this.encryptWithMasterKey(rawKey)

      const kmsKey = await KMSKey.create({
        creatorId: new mongoose.Types.ObjectId(params.creatorId),
        keyVersion: params.keyVersion || 'v1',
        algorithm: 'AES-256-GCM',
        encryptedKeyValue: encryptedKey,
        iv,
        isActive: true,
        expiresAt: params.expiresAt,
      })

      return kmsKey
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to generate KMS key',
        { cause: error }
      )
    }
  }
}

export const kmsService = new KMSService()
