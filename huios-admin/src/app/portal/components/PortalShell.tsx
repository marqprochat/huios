'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import PortalSidebar from './PortalSidebar';
import PortalHeader from './PortalHeader';
import BottomNav from './BottomNav';

interface StudentData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  student: {
    id: string;
    name: string;
    email: string;
    cpf: string | null;
    enrollments: Array<{
      id: string;
      status: string;
      class: {
        id: string;
        name: string;
        course: {
          id: string;
          name: string;
        };
      };
    }>;
    grades: Array<any>;
    attendances: Array<any>;
  };
}

interface StudentContextType {
  data: StudentData | null;
  loading: boolean;
  refresh: () => void;
}

const StudentContext = createContext<StudentContextType>({
  data: null,
  loading: true,
  refresh: () => {},
});

export const useStudent = () => useContext(StudentContext);

export default function PortalShell({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname?.startsWith('/portal/login');

  const fetchStudent = async () => {
    try {
      const res = await fetch('/api/auth/aluno/me');
      const studentData = await res.json();

      if (res.ok) {
        setData(studentData);
      } else {
        console.warn('Student fetch failed:', studentData.error || res.statusText);
        if (!isLoginPage) {
          router.push('/portal/login');
        }
      }
    } catch (err: any) {
      console.error('Network or parsing error fetching student:', err.message);
      if (!isLoginPage) {
        router.push('/portal/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }
    fetchStudent();
  }, [isLoginPage, pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f5f7]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 flex items-center justify-center animate-pulse">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Huios Logo" className="w-full h-full object-contain" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const studentName = data.student.name;
  const courseName = data.student.enrollments?.[0]?.class?.course?.name || 'Sem matrícula';

  return (
    <StudentContext.Provider value={{ data, loading, refresh: fetchStudent }}>
      <div className="flex min-h-screen">
        <PortalSidebar studentName={studentName} courseName={courseName} />
        <div className="flex-1 flex flex-col min-w-0">
          <PortalHeader studentName={studentName} />
          <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
            {children}
          </main>
          <BottomNav />
        </div>
      </div>
    </StudentContext.Provider>
  );
}
