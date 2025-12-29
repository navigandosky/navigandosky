import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, X, Languages } from "lucide-react";
import axios from "axios";
import AdminLayout from "../../components/AdminLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
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

const EMPTY_TRANSLATION = { it: "", en: "", fr: "", de: "" };

export default function AdminSpaces() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    model_id: "",
    name: { ...EMPTY_TRANSLATION },
    description: { ...EMPTY_TRANSLATION },
    cover_image: "",
    is_active: true,
    mpskin_url: ""
  });

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    try {
      const response = await axios.get(`${API}/spaces`);
      setSpaces(response.data);
    } catch (error) {
      toast.error("Errore nel caricamento degli spazi");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setSelectedSpace(null);
    setFormData({
      model_id: "",
      name: { ...EMPTY_TRANSLATION },
      description: { ...EMPTY_TRANSLATION },
      cover_image: "",
      is_active: true,
      mpskin_url: ""
    });
    setDialogOpen(true);
  };

  const openEditDialog = (space) => {
    setSelectedSpace(space);
    setFormData({
      model_id: space.model_id,
      name: space.name || { ...EMPTY_TRANSLATION },
      description: space.description || { ...EMPTY_TRANSLATION },
      cover_image: space.cover_image || "",
      is_active: space.is_active,
      mpskin_url: space.mpskin_url || ""
    });
    setDialogOpen(true);
  };

  const handleTranslate = async (field) => {
    const sourceText = formData[field].it;
    if (!sourceText) {
      toast.error("Inserisci prima il testo in italiano");
      return;
    }

    setTranslating(true);
    try {
      const response = await axios.post(`${API}/translate`, {
        text: sourceText,
        source_lang: "it",
        target_langs: ["en", "fr", "de"]
      });

      setFormData(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          ...response.data.translations
        }
      }));
      toast.success("Traduzione completata");
    } catch (error) {
      toast.error("Errore nella traduzione");
    } finally {
      setTranslating(false);
    }
  };

  const handleSave = async () => {
    if (!formData.model_id || !formData.name.it) {
      toast.error("Compila i campi obbligatori");
      return;
    }

    setSaving(true);
    try {
      if (selectedSpace) {
        await axios.put(`${API}/spaces/${selectedSpace.id}`, formData);
        toast.success("Spazio aggiornato");
      } else {
        await axios.post(`${API}/spaces`, formData);
        toast.success("Spazio creato");
      }
      setDialogOpen(false);
      fetchSpaces();
    } catch (error) {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSpace) return;

    try {
      await axios.delete(`${API}/spaces/${selectedSpace.id}`);
      toast.success("Spazio eliminato");
      setDeleteDialogOpen(false);
      fetchSpaces();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  return (
    <AdminLayout title="Spazi Matterport">
      {/* Actions */}
      <div className="mb-6">
        <Button
          onClick={openCreateDialog}
          className="btn-gold rounded-sm"
          data-testid="add-space-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi Spazio
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
        </div>
      ) : spaces.length === 0 ? (
        <div className="bg-white rounded-sm border border-[#E5E0D8] p-12 text-center">
          <p className="font-sans text-[#666058]">Nessuno spazio presente</p>
        </div>
      ) : (
        <div className="bg-white rounded-sm border border-[#E5E0D8] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F2F0EB]">
              <tr>
                <th className="px-6 py-4 text-left font-sans text-sm text-[#666058]">Nome</th>
                <th className="px-6 py-4 text-left font-sans text-sm text-[#666058]">Model ID</th>
                <th className="px-6 py-4 text-left font-sans text-sm text-[#666058]">Stato</th>
                <th className="px-6 py-4 text-right font-sans text-sm text-[#666058]">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {spaces.map((space) => (
                <tr key={space.id} className="border-t border-[#E5E0D8]">
                  <td className="px-6 py-4">
                    <p className="font-serif text-[#2A2A2A]">{space.name?.it || "—"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <code className="font-mono text-sm text-[#666058]">{space.model_id}</code>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-sans ${
                      space.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    }`}>
                      {space.is_active ? "Attivo" : "Inattivo"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(space)}
                      data-testid={`edit-space-${space.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedSpace(space);
                        setDeleteDialogOpen(true);
                      }}
                      data-testid={`delete-space-${space.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {selectedSpace ? "Modifica Spazio" : "Nuovo Spazio"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Model ID */}
            <div>
              <label className="block font-sans text-sm text-[#666058] mb-2">
                Model ID Matterport *
              </label>
              <Input
                value={formData.model_id}
                onChange={(e) => setFormData(prev => ({ ...prev, model_id: e.target.value }))}
                placeholder="es. abc123xyz"
                className="border-[#E5E0D8] focus:border-[#C5A059]"
                data-testid="space-model-id"
              />
            </div>

            {/* Cover Image */}
            <div>
              <label className="block font-sans text-sm text-[#666058] mb-2">
                URL Immagine di copertina
              </label>
              <Input
                value={formData.cover_image}
                onChange={(e) => setFormData(prev => ({ ...prev, cover_image: e.target.value }))}
                placeholder="https://..."
                className="border-[#E5E0D8] focus:border-[#C5A059]"
                data-testid="space-cover-image"
              />
            </div>

            {/* Mpskin URL - Overlay Alternativo */}
            <div>
              <label className="block font-sans text-sm text-[#666058] mb-2">
                URL Mpskin (Overlay Alternativo)
              </label>
              <Input
                value={formData.mpskin_url}
                onChange={(e) => setFormData(prev => ({ ...prev, mpskin_url: e.target.value }))}
                placeholder="https://mpskin.com/... (se valorizzato, sostituisce Matterport)"
                className="border-[#E5E0D8] focus:border-[#C5A059]"
                data-testid="space-mpskin-url"
              />
              <p className="text-xs text-[#666058] mt-1">
                Se questo campo è compilato, verrà usato al posto dell'iframe Matterport standard
              </p>
            </div>

            {/* Name (multilingual) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-sans text-sm text-[#666058]">Nome *</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTranslate("name")}
                  disabled={translating}
                  className="text-xs"
                >
                  {translating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Languages className="w-3 h-3 mr-1" />}
                  Traduci automaticamente
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["it", "en", "fr", "de"].map((lang) => (
                  <div key={lang}>
                    <label className="block text-xs text-[#666058] mb-1 uppercase">{lang}</label>
                    <Input
                      value={formData.name[lang]}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        name: { ...prev.name, [lang]: e.target.value }
                      }))}
                      className="border-[#E5E0D8] focus:border-[#C5A059]"
                      data-testid={`space-name-${lang}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Description (multilingual) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-sans text-sm text-[#666058]">Descrizione</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTranslate("description")}
                  disabled={translating}
                  className="text-xs"
                >
                  {translating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Languages className="w-3 h-3 mr-1" />}
                  Traduci automaticamente
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["it", "en", "fr", "de"].map((lang) => (
                  <div key={lang}>
                    <label className="block text-xs text-[#666058] mb-1 uppercase">{lang}</label>
                    <Textarea
                      value={formData.description[lang]}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        description: { ...prev.description, [lang]: e.target.value }
                      }))}
                      rows={3}
                      className="border-[#E5E0D8] focus:border-[#C5A059]"
                      data-testid={`space-desc-${lang}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Active Switch */}
            <div className="flex items-center justify-between">
              <label className="font-sans text-sm text-[#666058]">Spazio attivo</label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                data-testid="space-active-switch"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E0D8]">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="btn-gold"
              data-testid="save-space-btn"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salva"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo spazio? Verranno eliminati anche tutti i POI associati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
