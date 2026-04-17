'use client';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { X, Upload, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { api, safeToastError } from './utilities';

export default function ImageUploader({ images = [], onChange, maxImages = 3 }) {
  const [previews, setPreviews] = useState(images);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const remaining = maxImages - previews.length;
    if (files.length > remaining) {
      toast.error(`Puoi caricare massimo ${maxImages} immagini. Spazio disponibile: ${remaining}`);
      return;
    }

    setUploading(true);
    const newPreviews = [];
    const base64Images = [];

    for (const file of files) {
      // Validazione dimensione (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} è troppo grande. Massimo 5MB`);
        continue;
      }

      // Validazione tipo
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} non è un'immagine valida`);
        continue;
      }

      // Leggi come base64
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });

      newPreviews.push(base64);
      base64Images.push(base64);
    }

    try {
      // Carica le immagini al server
      const res = await api('upload', { method: 'POST', body: { images: base64Images } });
      
      if (res.error) {
        safeToastError(res.error);
        setUploading(false);
        return;
      }

      const updatedImages = [...previews, ...res.urls];
      setPreviews(updatedImages);
      onChange(updatedImages);
      toast.success(`${res.count} ${res.count === 1 ? 'immagine caricata' : 'immagini caricate'}!`);
    } catch (err) {
      toast.error('Errore durante l\'upload');
    }
    
    setUploading(false);
  };

  const removeImage = (index) => {
    const updated = previews.filter((_, i) => i !== index);
    setPreviews(updated);
    onChange(updated);
    toast.success('Immagine rimossa');
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4" />
        Immagini (max {maxImages})
      </Label>
      
      <div className="grid grid-cols-3 gap-3">
        {previews.map((img, idx) => (
          <div key={idx} className="relative group">
            <img
              src={img.startsWith('data:') ? img : img}
              alt={`Preview ${idx + 1}`}
              className="w-full h-24 object-cover rounded-lg border"
            />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        
        {previews.length < maxImages && (
          <label className="w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Carica</span>
              </>
            )}
          </label>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Formati supportati: JPG, PNG, WebP. Massimo 5MB per immagine.
      </p>
    </div>
  );
}
