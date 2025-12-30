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
    </AdminLayout>
  );
}
