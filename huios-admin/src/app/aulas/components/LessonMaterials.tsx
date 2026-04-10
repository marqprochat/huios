'use client';

import { useState, useEffect } from 'react';
import { deleteLessonMaterial, getLessonMaterials } from '../actions';
import { useToast } from '@/app/components/Toast/useToast';

interface Material {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

interface LessonMaterialsProps {
  lessonId: string;
}

export default function LessonMaterials({ lessonId }: LessonMaterialsProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMaterials();
  }, [lessonId]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const data = await getLessonMaterials(lessonId);
      setMaterials(data as any);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Use API for upload
      const response = await fetch(`http://localhost:3001/api/lessons/${lessonId}/materials`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        fetchMaterials();
      } else {
        const data = await response.json();
        toast('error', 'Erro ao enviar arquivo', data.error || 'Tente novamente mais tarde.');
      }
    } catch (error) {
      console.error('Error uploading:', error);
      toast('error', 'Erro de conexão', 'Não foi possível enviar o arquivo. Verifique sua internet.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este material?')) return;
    
    try {
      // Call API or Action to delete
      const response = await fetch(`http://localhost:3001/api/lessons/${lessonId}/materials/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setMaterials(prev => prev.filter(m => m.id !== id));
        toast('success', 'Material excluído', 'O arquivo foi removido com sucesso.');
      } else {
        toast('error', 'Erro ao excluir', 'Não foi possível excluir o material.');
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mime: string) => {
    if (mime.includes('image')) return <span className="material-symbols-outlined text-amber-500">image</span>;
    if (mime.includes('pdf')) return <span className="material-symbols-outlined text-rose-500">picture_as_pdf</span>;
    if (mime.includes('word') || mime.includes('text')) return <span className="material-symbols-outlined text-blue-500">description</span>;
    return <span className="material-symbols-outlined text-slate-400">file_present</span>;
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
         <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Documentação</h4>
         <label className="cursor-pointer bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black px-3 py-1.5 rounded-full transition-all border border-primary/20 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">add</span>
            Anexar
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
         </label>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {loading ? (
          <div className="flex items-center justify-center p-8 text-slate-300 animate-pulse">
            <span className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin"></span>
          </div>
        ) : materials.length === 0 ? (
          <div className="border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-slate-900/50">
             <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">cloud_upload</span>
             <p className="text-xs text-slate-400 font-bold">Nenhum material anexado</p>
          </div>
        ) : (
          materials.map(material => (
            <div key={material.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3 group">
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                {getFileIcon(material.mimeType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate" title={material.fileName}>
                  {material.fileName}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {formatFileSize(material.fileSize)}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a 
                  href={`http://localhost:3001/api/lessons/${lessonId}/materials/${material.id}/download`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                </a>
                <button 
                  onClick={() => handleDelete(material.id)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {uploading && (
        <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl flex items-center gap-3 animate-pulse">
           <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>
           <span className="text-[10px] font-black text-primary uppercase">Enviando material...</span>
        </div>
      )}
    </div>
  );
}
