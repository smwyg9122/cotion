import { Request, Response } from 'express';
import { FilesService } from '../services/files.service';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export const filesController = {
  upload: asyncHandler(async (req: AuthRequest, res: Response) => {
    const file = req.file;

    if (!file) {
      throw new AppError(400, 'VALIDATION_ERROR', '파일이 제공되지 않았습니다');
    }

    const result = await FilesService.saveFile(file, req.user!.userId);

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

    res.set({
      'Content-Type': file.mime_type,
      'Content-Length': file.size.toString(),
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.original_name)}"`,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    res.send(file.data);
  }),
};
