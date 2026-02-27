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

export class FilesService {
  static async saveFile(
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    userId: string
  ): Promise<{ id: string; originalName: string; mimeType: string; size: number }> {
    const [record] = await db('files')
      .insert({
        original_name: file.originalname,
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
