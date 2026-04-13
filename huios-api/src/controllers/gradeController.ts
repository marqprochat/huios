import { Request, Response } from 'express';
import { GradeType } from '@prisma/client';
import { prisma } from '../services/prisma';

// Get grades by student
export const getStudentGrades = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { disciplineId } = req.query;

    const where: any = { studentId };
    if (disciplineId) where.disciplineId = disciplineId as string;

    const grades = await prisma.grade.findMany({
      where,
      include: {
        discipline: {
          select: {
            id: true,
            name: true,
            courseClass: {
              select: {
                name: true
              }
            }
          }
        },
        exam: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate weighted average
    const totalWeight = grades.reduce((sum, g) => sum + g.weight, 0);
    const weightedScore = grades.reduce((sum, g) => sum + (g.score * g.weight), 0);
    const average = totalWeight > 0 ? weightedScore / totalWeight : 0;

    // Group by discipline
    const byDiscipline: any = {};
    grades.forEach(grade => {
      const discId = grade.discipline.id;
      if (!byDiscipline[discId]) {
        byDiscipline[discId] = {
          discipline: grade.discipline,
          grades: [],
          average: 0
        };
      }
      byDiscipline[discId].grades.push(grade);
    });

    // Calculate per-discipline averages
    Object.values(byDiscipline).forEach((disc: any) => {
      const discWeight = disc.grades.reduce((sum: number, g: any) => sum + g.weight, 0);
      const discScore = disc.grades.reduce((sum: number, g: any) => sum + (g.score * g.weight), 0);
      disc.average = discWeight > 0 ? discScore / discWeight : 0;
    });

    res.json({
      grades,
      average: Math.round(average * 100) / 100,
      byDiscipline: Object.values(byDiscipline)
    });
  } catch (error) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({ error: 'Failed to fetch student grades' });
  }
};

// Get grades by discipline
export const getDisciplineGrades = async (req: Request, res: Response) => {
  try {
    const { disciplineId } = req.params;

    const grades = await prisma.grade.findMany({
      where: { disciplineId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        exam: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group by student
    const byStudent: any = {};
    grades.forEach(grade => {
      const studId = grade.student.id;
      if (!byStudent[studId]) {
        byStudent[studId] = {
          student: grade.student,
          grades: [],
          average: 0
        };
      }
      byStudent[studId].grades.push(grade);
    });

    // Calculate per-student averages
    Object.values(byStudent).forEach((stud: any) => {
      const studWeight = stud.grades.reduce((sum: number, g: any) => sum + g.weight, 0);
      const studScore = stud.grades.reduce((sum: number, g: any) => sum + (g.score * g.weight), 0);
      stud.average = studWeight > 0 ? studScore / studWeight : 0;
    });

    res.json({
      grades,
      byStudent: Object.values(byStudent)
    });
  } catch (error) {
    console.error('Error fetching discipline grades:', error);
    res.status(500).json({ error: 'Failed to fetch discipline grades' });
  }
};

// Create manual grade
export const createGrade = async (req: Request, res: Response) => {
  try {
    const {
      studentId,
      disciplineId,
      type = 'MANUAL',
      score,
      weight = 1.0,
      title,
      description
    } = req.body;

    const userId = (req as any).user?.id || 'system';

    // Validation
    if (!studentId || !disciplineId || score === undefined) {
      return res.status(400).json({ 
        error: 'Student, discipline, and score are required' 
      });
    }

    if (score < 0 || score > 10) {
      return res.status(400).json({ 
        error: 'Score must be between 0 and 10' 
      });
    }

    const grade = await prisma.grade.create({
      data: {
        studentId,
        disciplineId,
        type: type as GradeType,
        score: parseFloat(score),
        weight: parseFloat(weight),
        title,
        description,
        createdById: userId
      },
      include: {
        student: {
          select: {
            id: true,
            name: true
          }
        },
        discipline: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json(grade);
  } catch (error) {
    console.error('Error creating grade:', error);
    res.status(500).json({ error: 'Failed to create grade' });
  }
};

// Update grade
export const updateGrade = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      score,
      weight,
      title,
      description
    } = req.body;

    if (score !== undefined && (score < 0 || score > 10)) {
      return res.status(400).json({ 
        error: 'Score must be between 0 and 10' 
      });
    }

    const grade = await prisma.grade.update({
      where: { id },
      data: {
        score: score !== undefined ? parseFloat(score) : undefined,
        weight: weight !== undefined ? parseFloat(weight) : undefined,
        title,
        description
      },
      include: {
        student: {
          select: {
            id: true,
            name: true
          }
        },
        discipline: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json(grade);
  } catch (error) {
    console.error('Error updating grade:', error);
    res.status(500).json({ error: 'Failed to update grade' });
  }
};

// Delete grade
export const deleteGrade = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.grade.delete({
      where: { id }
    });

    res.json({ message: 'Grade deleted successfully' });
  } catch (error) {
    console.error('Error deleting grade:', error);
    res.status(500).json({ error: 'Failed to delete grade' });
  }
};

// Create grade from exam submission (automatic)
export const createGradeFromSubmission = async (
  examId: string,
  studentId: string,
  disciplineId: string,
  score: number
) => {
  try {
    const userId = 'system';

    await prisma.grade.upsert({
      where: {
        // Using a unique constraint would be better, but for now we'll use examId
        // In a real scenario, we should add a unique constraint for examId + studentId
        id: ''
      },
      create: {
        studentId,
        disciplineId,
        examId,
        type: 'EXAM',
        score,
        weight: 1.0,
        title: 'Prova Online',
        createdById: userId
      },
      update: {
        score
      }
    });
  } catch (error) {
    console.error('Error creating grade from submission:', error);
  }
};

// Get report card (boletim) for student
export const getReportCard = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    // Get student data
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get all enrollments for this student (regardless of status if they are in the database)
    // To be more robust, we fetch all enrollments that aren't CANCELLED
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: { in: ['ACTIVE', 'COMPLETED', 'Ativa', 'Concluída'] } // Broader status support
      },
      include: {
        class: {
          include: {
            disciplines: {
              include: {
                teacher: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Get all grades for this student
    const grades = await prisma.grade.findMany({
      where: { studentId },
      include: {
        exam: {
          select: {
            title: true
          }
        }
      }
    });

    // Build report card
    const reportCard: any[] = [];
    enrollments.forEach(enrollment => {
      if (enrollment.class && enrollment.class.disciplines) {
        enrollment.class.disciplines.forEach(discipline => {
          const disciplineGrades = grades.filter(g => g.disciplineId === discipline.id);
          
          // Calculate average
          const totalWeight = disciplineGrades.reduce((sum, g) => sum + g.weight, 0);
          const weightedScore = disciplineGrades.reduce((sum, g) => sum + (g.score * g.weight), 0);
          const average = totalWeight > 0 ? weightedScore / totalWeight : 0;

          reportCard.push({
            discipline: {
              id: discipline.id,
              name: discipline.name,
              workload: discipline.workload,
              teacher: discipline.teacher ? { name: discipline.teacher.name } : null
            },
            grades: disciplineGrades,
            average: Math.round(average * 100) / 100,
            status: average >= 6 ? 'Aprovado' : average >= 4 ? 'Recuperação' : 'Reprovado'
          });
        });
      }
    });

    // Calculate overall average
    const overallAverage = reportCard.length > 0
      ? reportCard.reduce((sum, r) => sum + r.average, 0) / reportCard.length
      : 0;

    res.json({
      student,
      disciplines: reportCard,
      overallAverage: Math.round(overallAverage * 100) / 100,
      totalDisciplines: reportCard.length,
      approved: reportCard.filter(r => r.average >= 6).length,
      recovery: reportCard.filter(r => r.average >= 4 && r.average < 6).length,
      failed: reportCard.filter(r => r.average < 4).length
    });
  } catch (error) {
    console.error('Error generating report card:', error);
    res.status(500).json({ error: 'Failed to generate report card' });
  }
};
