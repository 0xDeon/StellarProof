import { Router } from 'express';
import { kmsController } from '../controllers/kms.controller';

const router = Router();

// Create a new encrypted key
router.post('/keys', kmsController.createKey);

// List all keys (metadata only)
router.get('/keys', kmsController.listKeys);

// Retrieve and decrypt a key
router.get('/keys/:keyId', kmsController.getKey);

// Delete a key
router.delete('/keys/:keyId', kmsController.deleteKey);

// Deactivate a key (soft delete)
router.post('/keys/:keyId/deactivate', kmsController.deactivateKey);

// Rotate a key
router.post('/keys/:keyId/rotate', kmsController.rotateKey);

export default router;