import { Request, Response } from 'express';
import { prisma } from '../services/prisma';

export const getClasses = async (req: Request, res: Response) => {
  try {
    const classes = await prisma.class.findMany({
      include: { module: true, teacher: true },
      orderBy: { name: 'asc' },
    });
    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ message: 'Erro ao buscar turmas' });
  }
};