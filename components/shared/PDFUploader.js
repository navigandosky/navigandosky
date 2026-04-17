'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, Trash2, Upload, RefreshCw } from 'lucide-react';
import { api, safeToastError } from './utilities';

export default function PDFUploader({ pdfUrl = '', onChange }) {
  const [uploading, setUploading] = useState(false);
  const [currentPdf, setCurrentPdf] = useState(pdfUrl);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validazione tipo
    if (file.type !== 'application/pdf') {
      toast.error('Solo file PDF sono accettati');
      return;
    }

    // Validazione dimensione (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File troppo grande. Massimo 10MB');
      return;
    }

    setUploading(true);

    try {
      // Leggi come base64
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });

      // Carica il PDF al server
      const res = await api('upload-pdf', { method: 'POST', body: { pdf: base64, filename: file.name } });
      
      if (res.error) {
        safeToastError(res.error);
        setUploading(false);
        return;
      }

      setCurrentPdf(res.url);
      onChange(res.url);
      toast.success('PDF caricato con successo!');
    } catch (err) {
      toast.error('Errore durante l\'upload del PDF');
    }
    
    setUploading(false);
  };

  const removePdf = () => {
    setCurrentPdf('');
    onChange('');
    toast.success('PDF rimosso');
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Download className="w-4 h-4" />
        Condizioni di Servizio (PDF)
      </Label>
      
      {currentPdf ? (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
          <div className="flex-1 flex items-center gap-2">
            <Download className="w-5 h-5 text-red-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Condizioni_servizio.pdf</p>
              <p className="text-xs text-muted-foreground">PDF caricato</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={removePdf}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Caricamento...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clicca per caricare PDF</span>
            </>
          )}
        </label>
      )}
      
      <p className="text-xs text-muted-foreground">
        Carica un file PDF con le condizioni e descrizione del servizio. Massimo 10MB.
      </p>
    </div>
  );
}
