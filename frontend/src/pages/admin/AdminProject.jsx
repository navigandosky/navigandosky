import { useState, useEffect, useRef } from "react";
import { Loader2, Languages, Save, Upload, FileText, Download, Trash2 } from "lucide-react";
import axios from "axios";
import AdminLayout from "../../components/AdminLayout";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
  const [newDocDescription, setNewDocDescription] = useState("");
  const fileInputRef = useRef(null);

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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("description", newDocDescription || file.name);

      const response = await axios.post(`${API}/upload/document`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setDocuments(prev => [...prev, response.data]);
      setNewDocDescription("");
      toast.success("Documento caricato");
    } catch (error) {
      toast.error("Errore nel caricamento del documento");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm("Eliminare questo documento?")) return;
    
    try {
      await axios.delete(`${API}/documents/${docId}`);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      toast.success("Documento eliminato");
    } catch (error) {
      toast.error("Errore nell'eliminazione");
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
      <div className="bg-white rounded-sm border border-[#E5E0D8] p-8">
        <div className="flex items-center justify-between mb-6">
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

        <div className="mt-8 pt-6 border-t border-[#E5E0D8]">
          {/* Documents Section */}
          <div className="mb-8">
            <h3 className="font-serif text-lg text-[#2A2A2A] mb-4">Documenti Allegati</h3>
            
            {/* Upload New Document */}
            <div className="flex gap-3 mb-4">
              <Input
                placeholder="Descrizione documento"
                value={newDocDescription}
                onChange={(e) => setNewDocDescription(e.target.value)}
                className="flex-1 border-[#E5E0D8]"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Carica File
              </Button>
            </div>

            {/* Documents List */}
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-[#F9F8F6] rounded border border-[#E5E0D8]">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-[#C5A059]" />
                      <div>
                        <p className="font-sans text-sm font-medium text-[#2A2A2A]">
                          {doc.description || doc.original_name}
                        </p>
                        <p className="font-sans text-xs text-[#666058]">
                          {doc.original_name} • {doc.file_type?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`${API}${doc.url}`, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#666058] italic">Nessun documento allegato</p>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
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
      </div>
    </AdminLayout>
  );
}
