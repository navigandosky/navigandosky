import { useState, useEffect } from "react";
import { Loader2, Languages, Save, Upload, FileText, Image, File, Trash2, Download, Eye } from "lucide-react";
import axios from "axios";
import AdminLayout from "../../components/AdminLayout";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// File type icons
const getFileIcon = (type) => {
  switch (type) {
    case 'pdf':
      return <FileText className="w-8 h-8 text-red-500" />;
    case 'doc':
    case 'docx':
      return <FileText className="w-8 h-8 text-blue-500" />;
    case 'xls':
    case 'xlsx':
      return <FileText className="w-8 h-8 text-green-500" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
      return <Image className="w-8 h-8 text-purple-500" />;
    default:
      return <File className="w-8 h-8 text-gray-500" />;
  }
};

// Check if file is previewable
const isPreviewable = (type) => {
  return ['pdf', 'jpg', 'jpeg', 'png'].includes(type);
};

export default function AdminProject() {
  const [content, setContent] = useState({
    it: "",
    en: "",
    fr: "",
    de: ""
  });
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [newDocDescription, setNewDocDescription] = useState("");

  useEffect(() => {
    fetchProject();
  }, []);

  const fetchProject = async () => {
    try {
      const response = await axios.get(`${API}/project`);
      if (response.data.content) {
        setContent(response.data.content);
      }
      if (response.data.documents) {
        setDocuments(response.data.documents);
      }
    } catch (error) {
      toast.error("Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!content.it) {
      toast.error("Inserisci prima il testo in italiano");
      return;
    }

    setTranslating(true);
    try {
      const response = await axios.post(`${API}/translate`, {
        text: content.it,
        source_lang: "it",
        target_langs: ["en", "fr", "de"]
      });

      setContent(prev => ({
        ...prev,
        ...response.data.translations
      }));
      toast.success("Traduzione completata");
    } catch (error) {
      toast.error("Errore nella traduzione");
    } finally {
      setTranslating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/project`, { content });
      toast.success("Contenuto salvato");
    } catch (error) {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', newDocDescription);

      const response = await axios.post(`${API}/project/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setDocuments(prev => [...prev, response.data]);
      toast.success("✅ Documento caricato!");
      setUploadDialogOpen(false);
      setNewDocDescription("");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.detail || "Errore nel caricamento");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;

    try {
      await axios.delete(`${API}/project/documents/${docToDelete.id}`);
      setDocuments(prev => prev.filter(d => d.id !== docToDelete.id));
      toast.success("Documento eliminato");
      setDeleteDialogOpen(false);
      setDocToDelete(null);
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const openPreview = (doc) => {
    setPreviewDoc(doc);
    setPreviewDialogOpen(true);
  };

  const downloadDocument = (doc) => {
    const url = doc.url.startsWith('http') ? doc.url : `${process.env.REACT_APP_BACKEND_URL}${doc.url}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <AdminLayout title="Progetto Spoke">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Progetto Spoke">
      {/* Content Section */}
      <div className="bg-white rounded-sm border border-[#E5E0D8] p-6 lg:p-8 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
          <p className="font-sans text-[#666058]">
            Modifica il contenuto della pagina "Il Progetto Spoke"
          </p>
          <Button
            variant="outline"
            onClick={handleTranslate}
            disabled={translating}
            className="text-sm"
          >
            {translating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Languages className="w-4 h-4 mr-2" />
            )}
            Traduci automaticamente
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {["it", "en", "fr", "de"].map((lang) => (
            <div key={lang}>
              <label className="block font-sans text-sm text-[#666058] mb-2 uppercase">
                {lang === "it" ? "Italiano *" : lang === "en" ? "English" : lang === "fr" ? "Français" : "Deutsch"}
              </label>
              <Textarea
                value={content[lang]}
                onChange={(e) => setContent(prev => ({ ...prev, [lang]: e.target.value }))}
                rows={15}
                className="border-[#E5E0D8] focus:border-[#C5A059] font-sans text-sm"
                placeholder={lang === "it" ? "Inserisci il testo del progetto in italiano..." : ""}
                data-testid={`project-content-${lang}`}
              />
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-[#E5E0D8] flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="btn-gold"
            data-testid="save-project-btn"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salva contenuto
          </Button>
        </div>
      </div>

      {/* Documents Section */}
      <div className="bg-white rounded-sm border border-[#E5E0D8] p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="font-serif text-xl text-[#2A2A2A] mb-1">Documenti Allegati</h2>
            <p className="font-sans text-sm text-[#666058]">
              Carica documenti (PDF, Word, Excel) o immagini da allegare al progetto
            </p>
          </div>
          <Button
            onClick={() => setUploadDialogOpen(true)}
            className="btn-gold"
          >
            <Upload className="w-4 h-4 mr-2" />
            Carica Documento
          </Button>
        </div>

        {/* Documents Grid */}
        {documents.length === 0 ? (
          <div className="text-center py-12 bg-[#F9F8F6] rounded-sm border border-dashed border-[#E5E0D8]">
            <FileText className="w-12 h-12 mx-auto text-[#C5A059]/50 mb-4" />
            <p className="font-sans text-[#666058]">Nessun documento caricato</p>
            <p className="font-sans text-sm text-[#666058]/70 mt-1">
              Clicca "Carica Documento" per aggiungere file
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map((doc) => (
              <div 
                key={doc.id}
                className="border border-[#E5E0D8] rounded-lg p-4 hover:border-[#C5A059]/50 transition-colors bg-white"
              >
                {/* Preview thumbnail for images */}
                {['jpg', 'jpeg', 'png'].includes(doc.file_type) ? (
                  <div 
                    className="w-full h-32 mb-3 rounded bg-cover bg-center cursor-pointer"
                    style={{ 
                      backgroundImage: `url(${doc.url.startsWith('http') ? doc.url : process.env.REACT_APP_BACKEND_URL + doc.url})` 
                    }}
                    onClick={() => openPreview(doc)}
                  />
                ) : (
                  <div 
                    className="w-full h-32 mb-3 rounded bg-[#F9F8F6] flex items-center justify-center cursor-pointer"
                    onClick={() => isPreviewable(doc.file_type) ? openPreview(doc) : downloadDocument(doc)}
                  >
                    {getFileIcon(doc.file_type)}
                  </div>
                )}

                {/* File info */}
                <p className="font-sans text-sm text-[#2A2A2A] truncate mb-1" title={doc.original_name}>
                  {doc.original_name}
                </p>
                {doc.description && (
                  <p className="font-sans text-xs text-[#666058] line-clamp-2 mb-2">
                    {doc.description}
                  </p>
                )}
                <p className="font-mono text-[10px] text-[#666058]/60 uppercase mb-3">
                  {doc.file_type}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  {isPreviewable(doc.file_type) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPreview(doc)}
                      className="flex-1 text-xs h-8"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Anteprima
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadDocument(doc)}
                    className="flex-1 text-xs h-8"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Scarica
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setDocToDelete(doc); setDeleteDialogOpen(true); }}
                    className="text-xs h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Carica Documento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block font-sans text-sm text-[#666058] mb-2">
                Descrizione (opzionale)
              </label>
              <Input
                value={newDocDescription}
                onChange={(e) => setNewDocDescription(e.target.value)}
                placeholder="Descrivi il documento..."
                className="border-[#E5E0D8] focus:border-[#C5A059]"
              />
            </div>

            <div>
              <label className="block font-sans text-sm text-[#666058] mb-2">
                Seleziona file
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                disabled={uploading}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:bg-[#C5A059] file:text-white hover:file:bg-[#B08D45] file:cursor-pointer"
              />
              <p className="text-xs text-[#666058]/70 mt-2">
                Formati supportati: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), Immagini (.jpg, .png)
              </p>
            </div>

            {uploading && (
              <div className="flex items-center gap-2 text-sm text-[#666058]">
                <Loader2 className="w-4 h-4 animate-spin" />
                Caricamento in corso...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {previewDoc?.original_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {previewDoc && ['jpg', 'jpeg', 'png'].includes(previewDoc.file_type) ? (
              <img 
                src={previewDoc.url.startsWith('http') ? previewDoc.url : `${process.env.REACT_APP_BACKEND_URL}${previewDoc.url}`}
                alt={previewDoc.original_name}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            ) : previewDoc?.file_type === 'pdf' ? (
              <iframe
                src={previewDoc.url.startsWith('http') ? previewDoc.url : `${process.env.REACT_APP_BACKEND_URL}${previewDoc.url}`}
                className="w-full h-[70vh]"
                title={previewDoc.original_name}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-[#666058]">Anteprima non disponibile per questo tipo di file</p>
                <Button 
                  onClick={() => previewDoc && downloadDocument(previewDoc)}
                  className="mt-4 btn-gold"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Scarica file
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Elimina documento</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare "{docToDelete?.original_name}"? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteDocument}
              className="bg-red-500 hover:bg-red-600"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
