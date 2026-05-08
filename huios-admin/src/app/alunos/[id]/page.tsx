import { getStudentData } from '../enrollment-actions';
import { notFound } from 'next/navigation';
import StudentDetailClient from './StudentDetailClient';

interface AlunoPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AlunoPage({ params }: AlunoPageProps) {
  const { id } = await params;
  const student = await getStudentData(id);

  if (!student) {
    notFound();
  }

  return <StudentDetailClient student={student} />;
}
