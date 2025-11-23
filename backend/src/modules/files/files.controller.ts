import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  Public,
} from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { existsSync, createReadStream } from 'fs';
import * as path from 'path';

@Controller('uploads')
export class FilesController {
  @Public()
  @Get(':filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    try {
      // Security: Prevent path traversal attacks
      const safeFilename = path.basename(filename);
      
      // Construct the full file path
      const filePath = join(process.cwd(), 'uploads', safeFilename);
      
      // Check if file exists
      if (!existsSync(filePath)) {
        console.error(`[FilesController] File not found: ${filePath}`);
        throw new NotFoundException(`File not found: ${safeFilename}`);
      }
      
      // Determine content type
      const ext = path.extname(safeFilename).toLowerCase();
      const contentTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
        '.zip': 'application/zip',
      };
      
      const contentType = contentTypes[ext] || 'application/octet-stream';
      
      // Set headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
      
      // Stream the file
      const fileStream = createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('[FilesController] Error serving file:', error);
      throw new NotFoundException(`Error serving file: ${filename}`);
    }
  }
}

