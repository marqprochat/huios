'use client';

import { useState, useEffect } from 'react';
import { API_URL } from '@/lib/api';
import { useToast } from '@/app/components/Toast/useToast';

// Anexos de lançamentos financeiros (comprovantes). Espelha LessonMaterials,
// consumindo /api/transactions/:id/attachments via proxy.

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

const fmtSize = (bytes: number) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const fileIcon = (mime: string) => {
  if (mime.includes('image')) return { icon: 'image', color: 'text-amber-500' };
  if (mime.includes('pdf')) return { icon: 'picture_as_pdf', color: 'text-rose-500' };
  return { icon: 'file_present', color: 'text-slate-400' };
};

export default function TransactionAttachments({ transactionId }: { transactionId: string }) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const base = `${API_URL}/api/transactions/${transactionId}/attachments`;

  useEffect(() => { fetchItems(); /* eslint-disable-next-line */ }, [transactionId]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(base);
      if (res.ok) setItems(await res.json());
    } catch (e) {
      console.error('Erro ao buscar anexos:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(base, { method: 'POST', body: fd });
      if (res.ok) {
        await fetchItems();
        toast('success', 'Anexo enviado', file.name);
      } else {
        const d = await res.json().catch(() => ({}));
        toast('error', 'Erro ao enviar', d.error || 'Tente novamente.');
      }
    } catch {
      toast('error', 'Erro de conexão', 'Não foi possível enviar o arquivo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este anexo?')) return;
    try {
      const res = await fetch(`${base}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(prev => prev.filter(a => a.id !== id));
        toast('success', 'Anexo excluído', '');
      } else {
        toast('error', 'Erro ao excluir', '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Comprovantes / Anexos</h4>
        <label className="cursor-pointer bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded-full transition-all border border-primary/20 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">attach_file</span>
          Anexar
          <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-6 text-slate-300">
          <span className="w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin"></span>
        </div>
      ) : items.length === 0 ? (
        <div className="border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl p-6 text-center bg-slate-50/50 dark:bg-slate-900/50">
          <span className="material-symbols-outlined text-slate-300 text-3xl mb-1">cloud_upload</span>
          <p className="text-xs text-slate-400 font-bold">Nenhum comprovante anexado</p>
          <p className="text-[10px] text-slate-400">PDF ou imagem (foto/print), até 10MB</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(a => {
            const fi = fileIcon(a.mimeType);
            return (
              <div key={a.id} className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3 group">
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className={`material-symbols-outlined ${fi.color}`}>{fi.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate" title={a.fileName}>{a.fileName}</div>
                  <div className="text-[10px] text-slate-400 font-medium">{fmtSize(a.fileSize)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <a href={`${base}/${a.id}/view`} target="_blank" rel="noreferrer" title="Ver"
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-lg">visibility</span>
                  </a>
                  <a href={`${base}/${a.id}/download`} target="_blank" rel="noreferrer" title="Baixar"
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-lg">download</span>
                  </a>
                  <button type="button" onClick={() => handleDelete(a.id)} title="Excluir"
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {uploading && (
        <div className="bg-primary/5 border border-primary/20 p-2.5 rounded-xl flex items-center gap-3">
          <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>
          <span className="text-[10px] font-bold text-primary uppercase">Enviando anexo...</span>
        </div>
      )}
    </div>
  );
}
