import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { join } from 'path';
import { existsSync, createReadStream } from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

const CONTENT_TYPES: Record<string, string> = {
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

// Uploaded files are homework submissions; the global JwtAuthGuard applies (no @Public)
@Controller('uploads')
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get(':filename')
  async serveFile(
    @Param('filename') filename: string,
    @CurrentUser() user: CurrentUserData,
    @Res() res: Response,
  ) {
    // Security: Prevent path traversal attacks
    const safeFilename = path.basename(filename);
    const filePath = join(process.cwd(), 'uploads', safeFilename);

    // 404 (not 403) when the caller may not see the file, so existence is not revealed
    if (!(await this.canAccess(user, safeFilename)) || !existsSync(filePath)) {
      throw new NotFoundException(`File not found: ${safeFilename}`);
    }

    const ext = path.extname(safeFilename).toLowerCase();
    res.setHeader('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.setHeader('Cache-Control', 'private, no-store');

    createReadStream(filePath)
      .on('error', (error) => {
        this.logger.error(`Error streaming ${safeFilename}: ${error.message}`);
        if (!res.headersSent) res.status(404).end();
      })
      .pipe(res);
  }

  private async canAccess(user: CurrentUserData, filename: string): Promise<boolean> {
    if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) return true;

    // Submissions store multer's path (uploads/x or uploads\x) or the bare filename
    const stored = [filename, `uploads/${filename}`, `uploads\\${filename}`, `./uploads/${filename}`];
    const fileOf = { fileUrls: { hasSome: stored } };

    if (user.role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!student) return false;
      return !!(await this.prisma.submission.findFirst({
        where: { ...fileOf, studentId: student.id },
        select: { id: true },
      }));
    }

    if (user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: user.id },
        select: { id: true, subjects: { select: { subjectId: true } } },
      });
      if (!teacher) return false;
      return !!(await this.prisma.submission.findFirst({
        where: {
          ...fileOf,
          OR: [
            { teacherId: teacher.id },
            { homework: { teacherId: teacher.id } },
            { subjectId: { in: teacher.subjects.map((s) => s.subjectId) } },
          ],
        },
        select: { id: true },
      }));
    }

    return false;
  }
}
