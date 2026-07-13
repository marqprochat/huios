import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Anexos de lançamentos financeiros (comprovantes: PDFs, imagens, prints).
// Espelha o padrão de materiais de aula (materialController).

export const uploadAttachment = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const { description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const attachment = await prisma.transactionAttachment.create({
      data: {
        transactionId,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        description: description || null,
      },
    });

    res.status(201).json(attachment);
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ error: 'Erro ao fazer upload do anexo' });
  }
};

export const getAttachmentsByTransaction = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const attachments = await prisma.transactionAttachment.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(attachments);
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({ error: 'Erro ao buscar anexos' });
  }
};

export const deleteAttachment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const attachment = await prisma.transactionAttachment.findUnique({ where: { id } });

    if (!attachment) {
      return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    if (fs.existsSync(attachment.filePath)) {
      fs.unlinkSync(attachment.filePath);
    }

    await prisma.transactionAttachment.delete({ where: { id } });
    res.json({ message: 'Anexo removido com sucesso' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'Erro ao deletar anexo' });
  }
};

export const downloadAttachment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const attachment = await prisma.transactionAttachment.findUnique({ where: { id } });

    if (!attachment || !fs.existsSync(attachment.filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    res.download(attachment.filePath, attachment.fileName);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ error: 'Erro ao baixar anexo' });
  }
};

// Abre o arquivo inline no navegador (consulta futura de comprovantes).
export const viewAttachment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const attachment = await prisma.transactionAttachment.findUnique({ where: { id } });

    if (!attachment || !fs.existsSync(attachment.filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(attachment.fileName)}"`
    );
    fs.createReadStream(path.resolve(attachment.filePath)).pipe(res);
  } catch (error) {
    console.error('Error viewing attachment:', error);
    res.status(500).json({ error: 'Erro ao abrir anexo' });
  }
};
