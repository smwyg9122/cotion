import { Request, Response } from 'express';
import { FilesService } from '../services/files.service';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export const filesController = {
  upload: asyncHandler(async (req: AuthRequest, res: Response) => {
    const file = req.file;

    console.log('[FileUpload] Request received, file present:', !!file, 'user:', req.user?.userId);

    if (!file) {
      console.error('[FileUpload] No file in request. Headers:', JSON.stringify(req.headers['content-type']));
      throw new AppError(400, 'VALIDATION_ERROR', '파일이 제공되지 않았습니다');
    }

    console.log('[FileUpload] File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    const result = await FilesService.saveFile(file, req.user!.userId);
    console.log('[FileUpload] File saved, id:', result.id);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/api/files/${result.id}`;

    res.status(201).json({
      success: true,
      data: {
        id: result.id,
        url,
        originalName: result.originalName,
        mimeType: result.mimeType,
        size: result.size,
      },
    });
  }),

  download: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const file = await FilesService.getFile(id);

    // 이미지만 inline, 나머지는 다운로드 강제
    const isImage = file.mime_type.startsWith('image/');
    const disposition = isImage ? 'inline' : 'attachment';

    res.set({
      'Content-Type': file.mime_type,
      'Content-Length': file.size.toString(),
      'Content-Disposition': `${disposition}; filename="${encodeURIComponent(file.original_name)}"`,
      'Cache-Control': 'private, max-age=3600',
    });

    res.send(file.data);
  }),
};
