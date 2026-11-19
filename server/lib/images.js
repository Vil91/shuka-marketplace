import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import { LARGE_DIR, THUMB_DIR, ensureDataDirs } from '../db.js';
import { AppError } from '../lib/constants.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB max per image
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: 5,
  },
});

export function handleUploadErrors(err, _req, _res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        new AppError(
          400,
          'FILE_TOO_LARGE',
          `Image exceeds the maximum allowed size of ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB`
        )
      );
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError(400, 'TOO_MANY_FILES', 'You can upload up to 5 images at a time'));
    }
    return next(new AppError(400, 'UPLOAD_ERROR', err.message));
  }
  return next(err);
}

/**
 * Validates actual image magic bytes via Sharp metadata & decoding,
 * resizes to large (<=1200px) and thumb (400x400), saves in uploads folder.
 * Rejects renamed .exe / text / corrupted files reliably.
 */
export async function processAndSaveImage(buffer) {
  ensureDataDirs();
  if (!buffer || buffer.length === 0) {
    throw new AppError(400, 'INVALID_IMAGE', 'Uploaded file is empty');
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new AppError(400, 'FILE_TOO_LARGE', 'Image exceeds maximum size of 5 MB');
  }

  let meta;
  try {
    meta = await sharp(buffer, { failOn: 'error' }).metadata();
  } catch {
    throw new AppError(
      400,
      'INVALID_IMAGE',
      'File is not a valid image. Please upload a JPEG, PNG, or WebP photo.'
    );
  }

  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new AppError(
      400,
      'INVALID_IMAGE_TYPE',
      `Unsupported image format (${meta.format || 'unknown'}). Allowed: JPEG, PNG, WebP.`
    );
  }

  const filename = `${crypto.randomUUID()}.webp`;
  const largeAbs = path.join(LARGE_DIR, filename);
  const thumbAbs = path.join(THUMB_DIR, filename);

  try {
    await sharp(buffer, { failOn: 'error' })
      .rotate()
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(largeAbs);

    await sharp(buffer, { failOn: 'error' })
      .rotate()
      .resize({ width: 400, height: 400, fit: 'cover' })
      .webp({ quality: 78 })
      .toFile(thumbAbs);
  } catch {
    await fs.rm(largeAbs, { force: true }).catch(() => {});
    await fs.rm(thumbAbs, { force: true }).catch(() => {});
    throw new AppError(
      400,
      'INVALID_IMAGE',
      'Image could not be decoded. Please upload a valid JPEG, PNG, or WebP file.'
    );
  }

  return `/uploads/large/${filename}`;
}

export async function deleteImageFiles(filePath) {
  if (!filePath || !filePath.startsWith('/uploads/large/')) return;
  const filename = path.basename(filePath);
  await fs.rm(path.join(LARGE_DIR, filename), { force: true }).catch(() => {});
  await fs.rm(path.join(THUMB_DIR, filename), { force: true }).catch(() => {});
}
