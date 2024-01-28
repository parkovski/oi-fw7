import type { UploadedFile } from 'express-fileupload';
import crypto from 'node:crypto';
import path from 'node:path';
import { StatusError } from '../util/error.js';
import sharp from 'sharp';

interface UploadOptions {
  useTempDir?: boolean;
  allowedExtensions?: string[] | Set<string>;
}

interface UploadReturn {
  path: string;
  filename: string;
}

export default class PhotoModel {
  private _photo: UploadedFile;

  constructor(photo: UploadedFile) {
    this._photo = photo;
  }

  upload(): Promise<UploadReturn>;
  upload(options: UploadOptions): Promise<UploadReturn>;
  upload(allowedExtensions: string[] | Set<string>): Promise<UploadReturn>;
  async upload(options?: UploadOptions | string[] | Set<string>): Promise<UploadReturn> {
    if (!options) {
      options = {};
    } else if (Array.isArray(options) || options instanceof Set) {
      options = {
        allowedExtensions: options,
      };
    }

    const randomBytes = new Promise<string>((resolve, reject) => {
      crypto.randomBytes(32, (err, buf) => {
        if (err) reject(err);
        resolve(buf.toString('base64').replaceAll(/\//g, '_').replaceAll(/\+/g, '-'));
      });
    });
    const name = await randomBytes;
    const ext = path.extname(this._photo.name).toLowerCase();
    if (options.allowedExtensions) {
      if (Array.isArray(options.allowedExtensions)) {
        if (!options.allowedExtensions.some(allowed => ext === allowed)) {
          throw new StatusError(400, 'File type not allowed');
        }
      } else {
        if (!options.allowedExtensions.has(ext)) {
          throw new StatusError(400, 'File type not allowed');
        }
      }
    }
    const filename = `${name}${ext}`;
    let uploadPath;
    if (options.useTempDir) {
      uploadPath = `${process.env.TEMP_DIR || process.env.UPLOAD_DIR}/${name}.tmp${ext}`;
    } else {
      uploadPath = `${process.env.UPLOAD_DIR}/${filename}`;
    }

    await this._photo.mv(uploadPath);
    return {
      path: uploadPath,
      filename,
    };
  }

  // Creates a thumbnail of at most width x height. The actual size is scaled
  // to maintain the photo's aspect ratio.
  static async createThumbnail(uploadPath: string, size?: number) {
    const photo = sharp(uploadPath);
    const metadata = await photo.metadata();
    const photoWidth = metadata.width || 160;
    const photoHeight = metadata.height || 160;
    let width = null;
    let height = null;
    size ??= 160;
    if (photoWidth > photoHeight) {
      width = size;
      //height = photoHeight * width / photoWidth;
    } else {
      height = size;
      //width = photoWidth * height / photoHeight;
    }
    const randomBytes = new Promise<string>((resolve, reject) => {
      crypto.randomBytes(32, (err, buf) => {
        if (err) reject(err);
        resolve(buf.toString('base64').replaceAll(/\//g, '_').replaceAll(/\+/g, '-'));
      });
    });
    const ext = path.extname(uploadPath);
    const filename = `${await randomBytes}${ext}`;
    await photo.resize(width, height).rotate().toFile(`${process.env.UPLOAD_DIR}/${filename}`);
    return filename;
  }
}
