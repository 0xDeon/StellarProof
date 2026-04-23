import { Router } from 'express';
import multer from 'multer';
import { protect } from '../middlewares/auth.middleware';
import { uploadEncryptedAsset, getSPVRecord } from '../controllers/spv.controller';

const router = Router();

// Store uploads in memory so the service receives a Buffer directly
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', protect, upload.single('file'), uploadEncryptedAsset);
router.get('/:spvId', protect, getSPVRecord);

export default router;
