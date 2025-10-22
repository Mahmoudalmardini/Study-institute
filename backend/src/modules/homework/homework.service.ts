import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { TeacherEvaluateSubmissionDto } from './dto/teacher-evaluate-submission.dto';
import { AdminReviewSubmissionDto } from './dto/admin-review-submission.dto';
import { SubmissionStatus, ReviewStatus } from '@prisma/client';

@Injectable()
export class HomeworkService {
  constructor(private prisma: PrismaService) {}

  async create(teacherId: string, dto: CreateHomeworkDto) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher profile not found');
    }

    const classExists = await this.prisma.class.findUnique({
      where: { id: dto.classId },
    });

    if (!classExists) {
      throw new NotFoundException('Class not found');
    }

    const homework = await this.prisma.homework.create({
      data: {
        ...dto,
        teacherId: teacher.id,
      },
      include: {
        class: true,
        teacher: {
          include: {
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

    return homework;
  }

  async findAll(classId?: string, teacherId?: string) {
    const where: any = {};

    if (classId) {
      where.classId = classId;
    }

    if (teacherId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: teacherId },
      });
      if (teacher) {
        where.teacherId = teacher.id;
      }
    }

    const homework = await this.prisma.homework.findMany({
      where,
      include: {
        class: true,
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: { dueDate: 'desc' },
    });

    return homework;
  }

  async findOne(id: string) {
    const homework = await this.prisma.homework.findUnique({
      where: { id },
      include: {
        class: true,
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        submissions: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    return homework;
  }

  async update(id: string, teacherId: string, dto: UpdateHomeworkDto) {
    const homework = await this.prisma.homework.findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    // Check if the teacher owns this homework
    if (homework.teacher && homework.teacher.userId !== teacherId) {
      throw new ForbiddenException('You can only update your own homework');
    }

    const updatedHomework = await this.prisma.homework.update({
      where: { id },
      data: dto,
      include: {
        class: true,
        teacher: {
          include: {
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

    return updatedHomework;
  }

  async remove(id: string, teacherId: string) {
    const homework = await this.prisma.homework.findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    // Check if the teacher owns this homework
    if (homework.teacher && homework.teacher.userId !== teacherId) {
      throw new ForbiddenException('You can only delete your own homework');
    }

    await this.prisma.homework.delete({
      where: { id },
    });

    return { message: 'Homework deleted successfully' };
  }

  // Submission methods
  async createSubmission(studentUserId: string, dto: CreateSubmissionDto) {
    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const homework = await this.prisma.homework.findUnique({
      where: { id: dto.homeworkId },
    });

    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    // Check if student already submitted
    const existingSubmission = await this.prisma.submission.findFirst({
      where: {
        homeworkId: dto.homeworkId,
        studentId: student.id,
      },
    });

    if (existingSubmission) {
      throw new BadRequestException('You have already submitted this homework');
    }

    const isLate = homework.dueDate ? new Date() > new Date(homework.dueDate) : false;

    const submission = await this.prisma.submission.create({
      data: {
        homeworkId: dto.homeworkId,
        studentId: student.id,
        fileUrls: dto.fileUrls || [],
        submittedAt: new Date(),
        status: isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED,
      },
      include: {
        homework: true,
        student: {
          include: {
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

    return submission;
  }

  async getMySubmissions(studentUserId: string, homeworkId?: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const where: any = {
      studentId: student.id,
    };

    if (homeworkId) {
      where.homeworkId = homeworkId;
    }

    const submissions = await this.prisma.submission.findMany({
      where,
      include: {
        homework: {
          include: {
            class: true,
            teacher: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return submissions;
  }

  async gradeSubmission(
    submissionId: string,
    teacherId: string,
    dto: GradeSubmissionDto,
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        homework: {
          include: {
            teacher: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Check if the teacher owns this homework
    if (submission.homework && submission.homework.teacher && submission.homework.teacher.userId !== teacherId) {
      throw new ForbiddenException(
        'You can only grade submissions for your homework',
      );
    }

    const gradedSubmission = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        grade: dto.grade,
        feedback: dto.feedback,
        status: SubmissionStatus.GRADED,
      },
      include: {
        homework: true,
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return gradedSubmission;
  }

  async getSubmissions(homeworkId: string, teacherId?: string) {
    const homework = await this.prisma.homework.findUnique({
      where: { id: homeworkId },
      include: { teacher: true },
    });

    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    // If teacher ID is provided, verify ownership
    if (teacherId && homework.teacher && homework.teacher.userId !== teacherId) {
      throw new ForbiddenException(
        'You can only view submissions for your homework',
      );
    }

    const submissions = await this.prisma.submission.findMany({
      where: { homeworkId },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return submissions;
  }

  // Direct student submissions to teachers (without homework assignment)
  async submitToTeacher(
    studentUserId: string,
    dto: any,
    files?: Express.Multer.File[],
  ) {
    console.log('[submitToTeacher] Student user ID:', studentUserId);
    console.log('[submitToTeacher] DTO:', dto);
    console.log('[submitToTeacher] Files received:', files?.length || 0);
    console.log('[submitToTeacher] File details:', files?.map(f => ({
      filename: f.filename,
      originalname: f.originalname,
      path: f.path,
      size: f.size,
    })));
    
    // Find student profile
    let student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
    });

    console.log('[submitToTeacher] Student profile:', student);

    if (!student) {
      // Auto-create student profile if it doesn't exist
      console.log('[submitToTeacher] Creating student profile');
      student = await this.prisma.student.create({
        data: { userId: studentUserId },
      });
      console.log('[submitToTeacher] Created student profile:', student);
    }

    // Verify teacher exists
    console.log('[submitToTeacher] Looking for teacher with ID:', dto.teacherId);
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: dto.teacherId },
    });

    console.log('[submitToTeacher] Teacher profile:', teacher);

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Create a simple homework assignment for this submission
    console.log('[submitToTeacher] Creating homework with teacherId:', teacher.id);
    const homework = await this.prisma.homework.create({
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: new Date(), // Immediate submission
        teacherId: teacher.id,
        classId: student.classId || null, // Use student's class or null
      },
    });

    console.log('[submitToTeacher] Created homework:', homework);

    // Build file URLs from uploaded files
    const fileUrls = files ? files.map((f) => f.path) : [];
    console.log('[submitToTeacher] File URLs to save:', fileUrls);

    // Create submission
    const submission = await this.prisma.submission.create({
      data: {
        homeworkId: homework.id,
        studentId: student.id,
        submittedAt: new Date(),
        status: 'PENDING',
        fileUrls: fileUrls,
      },
      include: {
        homework: true,
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    console.log('[submitToTeacher] Created submission:', submission);
    console.log('[submitToTeacher] Submission fileUrls:', submission.fileUrls);

    return submission;
  }

  async getTeacherSubmissions(teacherUserId: string) {
    console.log('[getTeacherSubmissions] Fetching submissions for teacher user:', teacherUserId);
    
    // Find teacher profile
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId: teacherUserId },
    });

    console.log('[getTeacherSubmissions] Teacher profile found:', teacher);

    if (!teacher) {
      console.log('[getTeacherSubmissions] No teacher profile found, returning empty array');
      return []; // Return empty array if no teacher profile
    }

    console.log('[getTeacherSubmissions] Searching for submissions with teacherId:', teacher.id);

    // Get all submissions for homework created by this teacher
    const submissions = await this.prisma.submission.findMany({
      where: {
        homework: {
          teacherId: teacher.id,
        },
      },
      include: {
        homework: {
          select: {
            id: true,
            title: true,
            description: true,
            dueDate: true,
          },
        },
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    console.log('[getTeacherSubmissions] Found submissions:', submissions.length);
    console.log('[getTeacherSubmissions] Submissions:', JSON.stringify(submissions, null, 2));

    return submissions;
  }

  // Admin Review Workflow Methods
  async teacherEvaluateSubmission(
    submissionId: string,
    teacherId: string,
    dto: TeacherEvaluateSubmissionDto,
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        homework: {
          include: {
            teacher: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Check if the teacher owns this homework
    if (submission.homework && submission.homework.teacher && submission.homework.teacher.userId !== teacherId) {
      throw new ForbiddenException(
        'You can only evaluate submissions for your homework',
      );
    }

    // Update submission with teacher evaluation
    const evaluatedSubmission = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        teacherEvaluation: dto.evaluation,
        teacherFeedback: dto.feedback,
        teacherReviewedAt: new Date(),
        reviewStatus: ReviewStatus.PENDING_ADMIN_REVIEW,
        status: SubmissionStatus.SUBMITTED, // Keep as submitted until admin approves
      },
      include: {
        homework: true,
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return evaluatedSubmission;
  }

  async getSubmissionsPendingAdminReview() {
    const submissions = await this.prisma.submission.findMany({
      where: {
        reviewStatus: ReviewStatus.PENDING_ADMIN_REVIEW,
      },
      include: {
        homework: {
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { teacherReviewedAt: 'asc' }, // Oldest first
    });

    return submissions;
  }

  async adminReviewSubmission(
    submissionId: string,
    adminUserId: string,
    dto: AdminReviewSubmissionDto,
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.reviewStatus !== ReviewStatus.PENDING_ADMIN_REVIEW) {
      throw new BadRequestException(
        'This submission is not pending admin review',
      );
    }

    // Update submission with admin review
    const reviewedSubmission = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        adminEvaluation: dto.evaluation,
        adminFeedback: dto.feedback,
        adminReviewedBy: adminUserId,
        adminReviewedAt: new Date(),
        reviewStatus: ReviewStatus.APPROVED_BY_ADMIN,
        status: SubmissionStatus.GRADED, // Mark as graded when approved
      },
      include: {
        homework: true,
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return reviewedSubmission;
  }

  async getStudentHomeworkResults(studentUserId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const submissions = await this.prisma.submission.findMany({
      where: {
        studentId: student.id,
        reviewStatus: ReviewStatus.APPROVED_BY_ADMIN,
      },
      include: {
        homework: {
          select: {
            id: true,
            title: true,
            description: true,
            dueDate: true,
          },
        },
      },
      orderBy: { adminReviewedAt: 'desc' },
    });

    // Format the results for the student
    return submissions.map((submission) => ({
      id: submission.id,
      homeworkId: submission.homework?.id,
      homeworkTitle: submission.homework?.title || submission.title,
      homeworkDescription: submission.homework?.description || submission.description,
      submittedAt: submission.submittedAt,
      result: submission.adminEvaluation,
      feedback: submission.adminFeedback,
      reviewedAt: submission.adminReviewedAt,
    }));
  }

  // Submit homework directly to a subject (no assignment required)
  async submitToSubject(
    studentUserId: string,
    dto: any,
    files?: Express.Multer.File[],
  ) {
    console.log('[submitToSubject] Student user ID:', studentUserId);
    console.log('[submitToSubject] DTO:', dto);
    console.log('[submitToSubject] Files received:', files?.length || 0);

    // Find student profile
    let student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
    });

    if (!student) {
      // Auto-create student profile if it doesn't exist
      student = await this.prisma.student.create({
        data: { userId: studentUserId },
      });
    }

    // Verify subject exists
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
      include: {
        class: true,
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Verify student is enrolled in this subject
    const enrollment = await this.prisma.studentSubject.findUnique({
      where: {
        studentId_subjectId: {
          studentId: student.id,
          subjectId: subject.id,
        },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'You are not enrolled in this subject',
      );
    }

    // Build file URLs from uploaded files
    const fileUrls = files ? files.map((f) => f.path) : [];

    // Create submission directly to subject (without homework assignment)
    const submission = await this.prisma.submission.create({
      data: {
        title: dto.title,
        description: dto.description,
        subjectId: subject.id,
        studentId: student.id,
        submittedAt: new Date(),
        status: 'PENDING',
        fileUrls: fileUrls,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    console.log('[submitToSubject] Created submission:', submission);
    return submission;
  }

  // Get submissions by subject
  async getSubmissionsBySubject(subjectId: string, teacherUserId?: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // If teacher is specified, verify they teach this subject
    if (teacherUserId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: teacherUserId },
      });

      if (teacher) {
        const teacherSubject = await this.prisma.teacherSubject.findFirst({
          where: {
            teacherId: teacher.id,
            subjectId: subjectId,
          },
        });

        if (!teacherSubject) {
          throw new ForbiddenException(
            'You do not teach this subject',
          );
        }
      }
    }

    const submissions = await this.prisma.submission.findMany({
      where: { subjectId },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return submissions;
  }

  // Get student's subjects for homework submission
  async getStudentSubjects(studentUserId: string) {
    let student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
    });

    if (!student) {
      // Auto-create student profile if it doesn't exist
      student = await this.prisma.student.create({
        data: { userId: studentUserId },
      });
    }

    return this.prisma.studentSubject.findMany({
      where: { studentId: student.id },
      include: {
        subject: {
          include: {
            class: true,
            teachers: {
              include: {
                teacher: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}
