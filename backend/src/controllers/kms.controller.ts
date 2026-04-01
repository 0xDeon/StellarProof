import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import KMSKey from "../models/KMSKey.model";
import { kmsService } from "../services/kms.service";

export class KMSController {
  async createKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id as string | undefined;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const key = await kmsService.generateKey({ creatorId: userId });

      res.status(201).json({
        success: true,
        data: {
          keyId: key._id,
          keyVersion: key.keyVersion,
          algorithm: key.algorithm,
          isActive: key.isActive,
          createdAt: key.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getKey(req: Request, res: Response): Promise<void> {
    void req;
    res.status(501).json({
      success: false,
      error: "Not implemented",
    });
  }

  async listKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id as string | undefined;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const keys = await KMSKey.find({ creatorId: userId })
        .select("_id keyVersion algorithm isActive createdAt updatedAt expiresAt")
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({
        success: true,
        data: keys,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { keyId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(keyId)) {
        res.status(400).json({ success: false, error: "Invalid keyId" });
        return;
      }

      await KMSKey.deleteOne({ _id: keyId }).exec();
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async deactivateKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { keyId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(keyId)) {
        res.status(400).json({ success: false, error: "Invalid keyId" });
        return;
      }

      await KMSKey.updateOne({ _id: keyId }, { $set: { isActive: false } }).exec();
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async rotateKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id as string | undefined;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }

      const key = await kmsService.generateKey({ creatorId: userId, keyVersion: "v2" });

      res.status(200).json({
        success: true,
        data: {
          keyId: key._id,
          keyVersion: key.keyVersion,
          algorithm: key.algorithm,
          isActive: key.isActive,
          createdAt: key.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const kmsController = new KMSController();
