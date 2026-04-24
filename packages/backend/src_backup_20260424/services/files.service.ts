import { db } from '../database/connection';
import { AppError } from '../middleware/error.middleware';

export interface FileRecord {
  id: string;
  original_name: string;
  mime_type: string;
  size: number;
  data: Buffer;
  uploaded_by: string | null;
  created_at: string;
}

function fixFilename(name: string): string {
  try {
    // multer/busboy decodes filenames as latin1 — re-decode as utf8
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    if (decoded !== name && !decoded.includes('\ufffd')) {
      return decoded.normalize('NFC');
    }
  } catch {}
  return name.normalize('NFC');
}

export class FilesService {
  static async saveFile(
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    userId: string
  ): Promise<{ id: string; originalName: string; mimeType: string; size: number }> {
    const originalName = fixFilename(file.originalname);
    const [record] = await db('files')
      .insert({
        original_name: originalName,
        mime_type: file.mimetype,
        size: file.size,
        data: file.buffer,
        uploaded_by: userId,
      })
      .returning(['id', 'original_name', 'mime_type', 'size']);

    return {
      id: record.id,
      originalName: record.original_name,
      mimeType: record.mime_type,
      size: record.size,
    };
  }

  static async getFile(fileId: string): Promise<FileRecord> {
    const file = await db('files').where({ id: fileId }).first();

    if (!file) {
      throw new AppError(404, 'NOT_FOUND', '파일을 찾을 수 없습니다');
    }

    return file;
  }
}
