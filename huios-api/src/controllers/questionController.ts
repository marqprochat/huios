import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get questions by exam ID
export const getQuestionsByExam = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    
    const questions = await prisma.question.findMany({
      where: { examId },
      include: {
        alternatives: true
      },
      orderBy: { order: 'asc' }
    });

    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
};

// Get question by ID
export const getQuestionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        alternatives: true
      }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
};

// Create question with alternatives
export const createQuestion = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const {
      statement,
      type = 'MULTIPLE_CHOICE',
      weight = 1.0,
      order,
      alternatives
    } = req.body;

    // Validation
    if (!statement) {
      return res.status(400).json({ error: 'Statement is required' });
    }

    if (!alternatives || alternatives.length < 2) {
      return res.status(400).json({ error: 'At least 2 alternatives are required' });
    }

    // Check if at least one alternative is marked as correct
    const correctAlternatives = alternatives.filter((a: any) => a.isCorrect);
    if (correctAlternatives.length === 0) {
      return res.status(400).json({ error: 'At least one alternative must be marked as correct' });
    }

    // Get next order if not provided
    let questionOrder = order;
    if (questionOrder === undefined) {
      const lastQuestion = await prisma.question.findFirst({
        where: { examId },
        orderBy: { order: 'desc' }
      });
      questionOrder = lastQuestion ? lastQuestion.order + 1 : 0;
    }

    const question = await prisma.question.create({
      data: {
        examId,
        statement,
        type,
        weight: parseFloat(weight),
        order: parseInt(questionOrder),
        alternatives: {
          create: alternatives.map((alt: any) => ({
            letter: alt.letter,
            text: alt.text,
            isCorrect: alt.isCorrect || false
          }))
        }
      },
      include: {
        alternatives: true
      }
    });

    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
};

// Update question
export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      statement,
      type,
      weight,
      order,
      alternatives
    } = req.body;

    // Update question
    const question = await prisma.question.update({
      where: { id },
      data: {
        statement,
        type,
        weight: weight !== undefined ? parseFloat(weight) : undefined,
        order: order !== undefined ? parseInt(order) : undefined
      }
    });

    // If alternatives provided, update them
    if (alternatives && alternatives.length > 0) {
      // Delete existing alternatives and create new ones
      await prisma.alternative.deleteMany({
        where: { questionId: id }
      });

      await prisma.alternative.createMany({
        data: alternatives.map((alt: any) => ({
          questionId: id,
          letter: alt.letter,
          text: alt.text,
          isCorrect: alt.isCorrect || false
        }))
      });
    }

    // Fetch updated question with alternatives
    const updatedQuestion = await prisma.question.findUnique({
      where: { id },
      include: {
        alternatives: true
      }
    });

    res.json(updatedQuestion);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
};

// Delete question
export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.question.delete({
      where: { id }
    });

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
};

// Reorder questions
export const reorderQuestions = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds)) {
      return res.status(400).json({ error: 'questionIds must be an array' });
    }

    // Update order for each question
    const updates = questionIds.map((questionId, index) => 
      prisma.question.update({
        where: { id: questionId },
        data: { order: index }
      })
    );

    await prisma.$transaction(updates);

    // Fetch updated questions
    const questions = await prisma.question.findMany({
      where: { examId },
      include: {
        alternatives: true
      },
      orderBy: { order: 'asc' }
    });

    res.json(questions);
  } catch (error) {
    console.error('Error reordering questions:', error);
    res.status(500).json({ error: 'Failed to reorder questions' });
  }
};
