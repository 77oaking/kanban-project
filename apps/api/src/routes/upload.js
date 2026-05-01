import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { uploadBuffer, isCloudinaryConfigured } from '../lib/cloudinary.js';
import { HttpError } from '../middleware/error.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = /^(image\/(png|jpe?g|gif|webp)|application\/pdf)$/.test(file.mimetype);
    cb(allowed ? null : new HttpError(400, 'Unsupported file type'), allowed);
  },
});

/**
 * @openapi
 * /api/upload:
 *   post:
 *     tags: [Upload]
 *     summary: Upload an avatar or attachment to Cloudinary
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *               folder: { type: string }
 *     responses:
 *       200: { description: Upload result with secure_url }
 */
router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, 'No file provided');
    if (!isCloudinaryConfigured()) {
      throw new HttpError(503, 'Cloudinary is not configured on the server');
    }
    const folder = (req.body.folder || 'fredocloud/uploads').toString();
    const result = await uploadBuffer(req.file.buffer, {
      folder,
      publicId: `${req.user.id}-${Date.now()}`,
    });
    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
