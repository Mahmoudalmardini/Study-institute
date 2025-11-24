import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class SubmissionCleanupService {
  private readonly logger = new Logger(SubmissionCleanupService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Runs daily at midnight to clean up submission files older than 7 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldSubmissionFiles() {
    this.logger.log('Starting cleanup of old submission files...');

    try {
      // Calculate cutoff date (7 days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      this.logger.log(`Cutoff date: ${cutoffDate.toISOString()}`);

      // Find submissions submitted before the cutoff that have files
      const submissions = await this.prisma.submission.findMany({
        where: {
          submittedAt: {
            lte: cutoffDate,
          },
          fileUrls: {
            isEmpty: false,
          },
        },
        select: {
          id: true,
          fileUrls: true,
          submittedAt: true,
          student: {
            select: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Found ${submissions.length} submissions with files to clean up`);

      let totalFilesDeleted = 0;
      let totalFilesFailed = 0;

      for (const submission of submissions) {
        const filesDeleted: string[] = [];
        const filesFailed: string[] = [];

        // Delete each file from the filesystem
        for (const fileUrl of submission.fileUrls) {
          try {
            // Extract filename from URL or path
            // fileUrl could be like "uploads/files-1234567890-123456789.png" or just "files-1234567890-123456789.png"
            const filename = fileUrl.includes('/') 
              ? fileUrl.split('/').pop() 
              : fileUrl;

            if (!filename) {
              this.logger.warn(`Could not extract filename from: ${fileUrl}`);
              filesFailed.push(fileUrl);
              continue;
            }

            const filePath = join(process.cwd(), 'uploads', filename);

            // Check if file exists before attempting deletion
            if (existsSync(filePath)) {
              await unlink(filePath);
              filesDeleted.push(fileUrl);
              this.logger.debug(`Deleted file: ${filePath}`);
            } else {
              this.logger.debug(`File already deleted or not found: ${filePath}`);
              filesDeleted.push(fileUrl); // Still count as deleted since it's not there
            }
          } catch (error) {
            this.logger.error(`Failed to delete file ${fileUrl}:`, error);
            filesFailed.push(fileUrl);
          }
        }

        totalFilesDeleted += filesDeleted.length;
        totalFilesFailed += filesFailed.length;

        // Update submission record to clear fileUrls
        await this.prisma.submission.update({
          where: { id: submission.id },
          data: {
            fileUrls: [],
          },
        });

        // Delete associated File records from database
        await this.prisma.file.deleteMany({
          where: {
            submissionId: submission.id,
          },
        });

        this.logger.log(
          `Cleaned submission ${submission.id} (${submission.student?.user?.firstName} ${submission.student?.user?.lastName}): ` +
          `${filesDeleted.length} files deleted, ${filesFailed.length} failed`
        );
      }

      this.logger.log(
        `Cleanup completed: ${submissions.length} submissions processed, ` +
        `${totalFilesDeleted} files deleted, ${totalFilesFailed} files failed`
      );
    } catch (error) {
      this.logger.error('Error during submission file cleanup:', error);
    }
  }

  /**
   * Manual cleanup method for testing or admin-triggered cleanup
   * Can be called via an admin endpoint if needed
   */
  async manualCleanup(daysOld: number = 7) {
    this.logger.log(`Manual cleanup triggered for files older than ${daysOld} days`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const submissions = await this.prisma.submission.findMany({
      where: {
        submittedAt: {
          lte: cutoffDate,
        },
        fileUrls: {
          isEmpty: false,
        },
      },
    });

    return {
      message: `Found ${submissions.length} submissions to clean up`,
      submissionsCount: submissions.length,
      cutoffDate: cutoffDate.toISOString(),
    };
  }
}

