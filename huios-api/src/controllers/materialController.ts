import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

export const uploadMaterial = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const material = await prisma.lessonMaterial.create({
      data: {
        lessonId,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        description: description || null
      }
    });

    res.status(201).json(material);
  } catch (error) {
    console.error('Error uploading material:', error);
    res.status(500).json({ error: 'Erro ao fazer upload do material' });
  }
};

export const getMaterialsByLesson = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const materials = await prisma.lessonMaterial.findMany({
      where: { lessonId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(materials);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Erro ao buscar materiais' });
  }
};

export const deleteMaterial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const material = await prisma.lessonMaterial.findUnique({
      where: { id }
    });

    if (!material) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    // Delete existing file
    if (fs.existsSync(material.filePath)) {
      fs.unlinkSync(material.filePath);
    }

    await prisma.lessonMaterial.delete({
      where: { id }
    });

    res.json({ message: 'Material removido com sucesso' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Erro ao deletar material' });
  }
};

export const downloadMaterial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const material = await prisma.lessonMaterial.findUnique({
      where: { id }
    });

    if (!material || !fs.existsSync(material.filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    res.download(material.filePath, material.fileName);
  } catch (error) {
    console.error('Error downloading material:', error);
    res.status(500).json({ error: 'Erro ao baixar material' });
  }
};
