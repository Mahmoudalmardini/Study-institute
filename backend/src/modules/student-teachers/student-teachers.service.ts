import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentTeachersService {
  private readonly logger = new Logger(StudentTeachersService.name);
  
  constructor(private prisma: PrismaService) {}

  async assignTeacherToStudent(studentId: string, teacherId: string, assignedBy: string) {
    this.logger.log(`Assigning teacher ${teacherId} to student ${studentId} by ${assignedBy}`);
    
    try {
      // Check if student exists
      let student = await this.prisma.student.findUnique({
        where: { id: studentId },
      });
      
      if (!student) {
        this.logger.error(`Student profile not found: ${studentId}`);
        throw new NotFoundException('Student profile not found');
      }

      // Check if teacher profile exists, if not check if user exists and create teacher profile
      let teacher = await this.prisma.teacher.findFirst({
        where: { userId: teacherId },
      });
      
      if (!teacher) {
        this.logger.log(`Teacher profile not found for user ${teacherId}, checking if user exists`);
        
        // Check if user with TEACHER role exists
        const teacherUser = await this.prisma.user.findUnique({
          where: { id: teacherId },
        });
        
        if (!teacherUser || teacherUser.role !== 'TEACHER') {
          this.logger.error(`Teacher user not found or invalid role: ${teacherId}`);
          throw new NotFoundException('Teacher user not found or invalid role');
        }
        
        // Create teacher profile
        this.logger.log(`Creating teacher profile for user ${teacherId}`);
        teacher = await this.prisma.teacher.create({
          data: {
            userId: teacherId,
          },
        });
      }

      // Check if assignment already exists
      const existing = await this.prisma.studentTeacher.findUnique({
        where: {
          studentId_teacherId: {
            studentId: student.id,
            teacherId: teacher.id,
          },
        },
      });

      if (existing) {
        this.logger.warn(`Teacher ${teacher.id} is already assigned to student ${student.id}`);
        throw new ConflictException('This teacher is already assigned to this student');
      }

      this.logger.log(`Creating assignment: student ${student.id} <-> teacher ${teacher.id}`);
      
      const result = await this.prisma.studentTeacher.create({
        data: {
          studentId: student.id,
          teacherId: teacher.id,
          assignedBy,
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
      });
      
      this.logger.log(`Successfully assigned teacher to student`);
      return result;
    } catch (error) {
      this.logger.error(`Error in assignTeacherToStudent: ${error.message}`, error.stack);
      throw error;
    }
  }

  async removeTeacherFromStudent(studentId: string, teacherId: string) {
    this.logger.log(`Removing teacher ${teacherId} from student ${studentId}`);
    
    // Find teacher profile by userId (teacherId could be user ID or profile ID)
    let teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });
    
    if (!teacher) {
      // Try finding by userId
      teacher = await this.prisma.teacher.findFirst({
        where: { userId: teacherId },
      });
    }
    
    if (!teacher) {
      this.logger.error(`Teacher profile not found for ID: ${teacherId}`);
      throw new NotFoundException('Teacher profile not found');
    }
    
    this.logger.log(`Found teacher profile: ${teacher.id}`);
    
    const assignment = await this.prisma.studentTeacher.findUnique({
      where: {
        studentId_teacherId: {
          studentId,
          teacherId: teacher.id,
        },
      },
    });

    if (!assignment) {
      this.logger.error(`Assignment not found: student ${studentId} <-> teacher ${teacher.id}`);
      throw new NotFoundException('Assignment not found');
    }

    this.logger.log(`Deleting assignment: ${assignment.id}`);
    
    return this.prisma.studentTeacher.delete({
      where: {
        studentId_teacherId: {
          studentId,
          teacherId: teacher.id,
        },
      },
    });
  }

  async getStudentTeachers(studentId: string) {
    this.logger.log(`Fetching teachers for student: ${studentId}`);
    
    const assignments = await this.prisma.studentTeacher.findMany({
      where: { studentId },
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
    });
    
    this.logger.log(`Found ${assignments.length} teacher assignments for student ${studentId}`);
    
    return assignments;
  }

  async getTeacherStudents(teacherId: string) {
    // Find teacher profile by userId
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId: teacherId },
    });
    
    if (!teacher) {
      return []; // Return empty array if teacher profile doesn't exist yet
    }
    
    return this.prisma.studentTeacher.findMany({
      where: { teacherId: teacher.id },
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
  }

  async getAllAssignments() {
    return this.prisma.studentTeacher.findMany({
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
    });
  }
}

