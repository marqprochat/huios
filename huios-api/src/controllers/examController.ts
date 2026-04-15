import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List all exams
export const getExams = async (req: Request, res: Response) => {
  try {
    const { disciplineId, status } = req.query;
    
    const where: any = {};
    if (disciplineId) where.disciplineId = disciplineId as string;
    if (status === 'published') where.isPublished = true;
    if (status === 'draft') where.isPublished = false;

    const exams = await prisma.exam.findMany({
      where,
      include: {
        discipline: {
          select: {
            id: true,
            name: true,
            courseClasses: {
              select: {
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            questions: true,
            submissions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(exams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
};

// Get exam by ID
export const getExamById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        discipline: {
          select: {
            id: true,
            name: true,
            courseClasses: {
              select: {
                name: true,
                enrollments: {
                  where: { status: 'ACTIVE' },
                  select: { id: true }
                }
              }
            }
          }
        },
        questions: {
          include: {
            alternatives: true
          },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            submissions: true
          }
        }
      }
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    res.json(exam);
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).json({ error: 'Failed to fetch exam' });
  }
};

// Create new exam
export const createExam = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      disciplineId,
      startDate,
      endDate,
      duration,
      maxAttempts = 1
    } = req.body;

    // Validation
    if (!title || !disciplineId || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Title, discipline, start date, and end date are required' 
      });
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        description,
        disciplineId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        duration: duration ? parseInt(duration) : null,
        maxAttempts: parseInt(maxAttempts),
        isPublished: false
      },
      include: {
        discipline: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json(exam);
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({ error: 'Failed to create exam' });
  }
};

// Update exam
export const updateExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      disciplineId,
      startDate,
      endDate,
      duration,
      maxAttempts
    } = req.body;

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        title,
        description,
        disciplineId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        duration: duration !== undefined ? (duration ? parseInt(duration) : null) : undefined,
        maxAttempts: maxAttempts !== undefined ? parseInt(maxAttempts) : undefined
      },
      include: {
        discipline: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json(exam);
  } catch (error) {
    console.error('Error updating exam:', error);
    res.status(500).json({ error: 'Failed to update exam' });
  }
};

// Publish exam
export const publishExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const exam = await prisma.exam.update({
      where: { id },
      data: { isPublished: true }
    });

    res.json(exam);
  } catch (error) {
    console.error('Error publishing exam:', error);
    res.status(500).json({ error: 'Failed to publish exam' });
  }
};

// Unpublish exam
export const unpublishExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const exam = await prisma.exam.update({
      where: { id },
      data: { isPublished: false }
    });

    res.json(exam);
  } catch (error) {
    console.error('Error unpublishing exam:', error);
    res.status(500).json({ error: 'Failed to unpublish exam' });
  }
};

// Duplicate exam
export const duplicateExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, startDate, endDate } = req.body;

    // Get original exam with questions
    const originalExam = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            alternatives: true
          }
        }
      }
    });

    if (!originalExam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Create new exam
    const newExam = await prisma.exam.create({
      data: {
        title: title || `${originalExam.title} (Cópia)`,
        description: originalExam.description,
        disciplineId: originalExam.disciplineId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        duration: originalExam.duration,
        maxAttempts: originalExam.maxAttempts,
        isPublished: false,
        questions: {
          create: originalExam.questions.map(q => ({
            statement: q.statement,
            type: q.type,
            order: q.order,
            weight: q.weight,
            alternatives: {
              create: q.alternatives.map(a => ({
                letter: a.letter,
                text: a.text,
                isCorrect: a.isCorrect
              }))
            }
          }))
        }
      },
      include: {
        discipline: {
          select: {
            id: true,
            name: true
          }
        },
        questions: {
          include: {
            alternatives: true
          }
        }
      }
    });

    res.status(201).json(newExam);
  } catch (error) {
    console.error('Error duplicating exam:', error);
    res.status(500).json({ error: 'Failed to duplicate exam' });
  }
};

// Delete exam
export const deleteExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.exam.delete({
      where: { id }
    });

    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
};

// Get exam results/statistics
export const getExamResults = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const submissions = await prisma.examSubmission.findMany({
      where: { examId: id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    const stats = {
      totalSubmissions: submissions.length,
      averageScore: submissions.length > 0 
        ? submissions.reduce((acc, s) => acc + (s.score || 0), 0) / submissions.length 
        : 0,
      submissions
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching exam results:', error);
    res.status(500).json({ error: 'Failed to fetch exam results' });
  }
};
