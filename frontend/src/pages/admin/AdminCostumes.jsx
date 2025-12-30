import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, Languages, Volume2, Upload, X } from "lucide-react";
import axios from "axios";
import AdminLayout from "../../components/AdminLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EMPTY_TRANSLATION = { it: "", en: "", fr: "", de: "" };

export default function AdminCostumes() {
  const [costumes, setCostumes] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCostume, setSelectedCostume] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    id_risorsa: "",
    description: { ...EMPTY_TRANSLATION },
    ricamatrice: "",
    proprieta: "",
    valore: "",
    data_realizzazione: "",
    photos: [],
    matterport_tag_id: "",
    space_id: "",
    audio_url: { it: "", en: "", fr: "", de: "" }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [costumesRes, spacesRes] = await Promise.all([
        axios.get(`${API}/costumes`),
        axios.get(`${API}/spaces`)
      ]);
      setCostumes(costumesRes.data);
      setSpaces(spacesRes.data);
    } catch (error) {
      toast.error("Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setSelectedCostume(null);
    setFormData({
      id_risorsa: "",
      description: { ...EMPTY_TRANSLATION },
      ricamatrice: "",
      proprieta: "",
      valore: "",
      data_realizzazione: "",
      photos: [],
      matterport_tag_id: "",
      space_id: "",
      audio_url: { it: "", en: "", fr: "", de: "" }
    });
    setDialogOpen(true);
  };

  const openEditDialog = (costume) => {
    setSelectedCostume(costume);
    setFormData({
      id_risorsa: costume.id_risorsa,
      description: costume.description || { ...EMPTY_TRANSLATION },
      ricamatrice: costume.ricamatrice || "",
      proprieta: costume.proprieta || "",
      valore: costume.valore || "",
      data_realizzazione: costume.data_realizzazione || "",
      photos: costume.photos || [],
      matterport_tag_id: costume.matterport_tag_id || "",
      space_id: costume.space_id || "",
      audio_url: costume.audio_url || { it: "", en: "", fr: "", de: "" }
    });
    setDialogOpen(true);
  };

  const handleTranslate = async () => {
    const sourceText = formData.description.it;
    if (!sourceText) {
      toast.error("Inserisci prima la descrizione in italiano");
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
        description: {
          ...prev.description,
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

  const handleGenerateAudio = async (lang) => {
    const text = formData.description[lang];
    if (!text) {
      toast.error(`Inserisci prima la descrizione in ${lang.toUpperCase()}`);
      return;
    }

    setGeneratingAudio(prev => ({ ...prev, [lang]: true }));
    try {
      const response = await axios.post(`${API}/tts`, {
        text,
        lang
      });

      setFormData(prev => ({
        ...prev,
        audio_url: {
          ...prev.audio_url,
          [lang]: response.data.audio_url
        }
      }));
      toast.success(`Audio ${lang.toUpperCase()} generato`);
    } catch (error) {
      toast.error("Errore nella generazione audio");
    } finally {
      setGeneratingAudio(prev => ({ ...prev, [lang]: false }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    try {
      const response = await axios.post(`${API}/upload/image`, formDataUpload, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, response.data.url]
      }));
      toast.success("Immagine caricata");
    } catch (error) {
      toast.error("Errore nel caricamento dell'immagine");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!formData.id_risorsa || !formData.description.it) {
      toast.error("Compila i campi obbligatori");
      return;
    }

    setSaving(true);
    try {
      if (selectedCostume) {
        await axios.put(`${API}/costumes/${selectedCostume.id}`, formData);
        toast.success("Costume aggiornato");
      } else {
        await axios.post(`${API}/costumes`, formData);
        toast.success("Costume creato");
      }
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCostume) return;

    try {
      await axios.delete(`${API}/costumes/${selectedCostume.id}`);
      toast.success("Costume eliminato");
      setDeleteDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  return (
    <AdminLayout title="Archivio Costumi">
      {/* Actions */}
      <div className="mb-6">
        <Button
          onClick={openCreateDialog}
          className="btn-gold rounded-sm"
          data-testid="add-costume-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi Costume
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
        </div>
      ) : costumes.length === 0 ? (
        <div className="bg-white rounded-sm border border-[#E5E0D8] p-12 text-center">
          <p className="font-sans text-[#666058]">Nessun costume presente</p>
        </div>
      ) : (
        <div className="bg-white rounded-sm border border-[#E5E0D8] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F2F0EB]">
              <tr>
                <th className="px-6 py-4 text-left font-sans text-sm text-[#666058]">ID Risorsa</th>
                <th className="px-6 py-4 text-left font-sans text-sm text-[#666058]">Descrizione</th>
                <th className="px-6 py-4 text-left font-sans text-sm text-[#666058]">Ricamatrice</th>
                <th className="px-6 py-4 text-left font-sans text-sm text-[#666058]">Foto</th>
                <th className="px-6 py-4 text-right font-sans text-sm text-[#666058]">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {costumes.map((costume) => (
                <tr key={costume.id} className="border-t border-[#E5E0D8]">
                  <td className="px-6 py-4">
                    <code className="font-mono text-sm text-[#C5A059]">{costume.id_risorsa}</code>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-sans text-sm text-[#2A2A2A] line-clamp-2">
                      {costume.description?.it || "—"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-sans text-sm text-[#666058]">{costume.ricamatrice || "—"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#666058]">{costume.photos?.length || 0}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(costume)}
                      data-testid={`edit-costume-${costume.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCostume(costume);
                        setDeleteDialogOpen(true);
                      }}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {selectedCostume ? "Modifica Costume" : "Nuovo Costume"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info Row */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block font-sans text-sm text-[#666058] mb-2">
                  ID Risorsa *
                </label>
                <Input
                  value={formData.id_risorsa}
                  onChange={(e) => setFormData(prev => ({ ...prev, id_risorsa: e.target.value }))}
                  className="border-[#E5E0D8] focus:border-[#C5A059]"
                  data-testid="costume-id-risorsa"
                />
              </div>
              <div>
                <label className="block font-sans text-sm text-[#666058] mb-2">
                  Ricamatrice
                </label>
                <Input
                  value={formData.ricamatrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, ricamatrice: e.target.value }))}
                  className="border-[#E5E0D8] focus:border-[#C5A059]"
                />
              </div>
            </div>

            {/* More Info Row */}
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block font-sans text-sm text-[#666058] mb-2">
                  Proprietà
                </label>
                <Input
                  value={formData.proprieta}
                  onChange={(e) => setFormData(prev => ({ ...prev, proprieta: e.target.value }))}
                  className="border-[#E5E0D8] focus:border-[#C5A059]"
                />
              </div>
              <div>
                <label className="block font-sans text-sm text-[#666058] mb-2">
                  Valore
                </label>
                <Input
                  value={formData.valore}
                  onChange={(e) => setFormData(prev => ({ ...prev, valore: e.target.value }))}
                  className="border-[#E5E0D8] focus:border-[#C5A059]"
                />
              </div>
              <div>
                <label className="block font-sans text-sm text-[#666058] mb-2">
                  Data Realizzazione
                </label>
                <Input
                  value={formData.data_realizzazione}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_realizzazione: e.target.value }))}
                  className="border-[#E5E0D8] focus:border-[#C5A059]"
                />
              </div>
            </div>

            {/* Matterport Link */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block font-sans text-sm text-[#666058] mb-2">
                  Spazio Matterport
                </label>
                <Select
                  value={formData.space_id || "none"}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, space_id: value === "none" ? "" : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona uno spazio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuno</SelectItem>
                    {spaces.map((space) => (
                      <SelectItem key={space.id} value={space.id}>
                        {space.name?.it || space.model_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block font-sans text-sm text-[#666058] mb-2">
                  Tag ID Matterport
                </label>
                <Input
                  value={formData.matterport_tag_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, matterport_tag_id: e.target.value }))}
                  className="border-[#E5E0D8] focus:border-[#C5A059]"
                />
              </div>
            </div>

            {/* Description (multilingual) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-sans text-sm text-[#666058]">Descrizione *</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTranslate}
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
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Photos */}
            <div>
              <label className="block font-sans text-sm text-[#666058] mb-2">
                Archivio Fotografico
              </label>
              <div className="flex flex-wrap gap-3 mb-3">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative w-24 h-24">
                    <img
                      src={photo.startsWith('http') ? photo : `${process.env.REACT_APP_BACKEND_URL}${photo}`}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-sm border border-[#E5E0D8]"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="w-24 h-24 border-2 border-dashed border-[#E5E0D8] rounded-sm flex items-center justify-center cursor-pointer hover:border-[#C5A059] transition-colors">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-[#666058] animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-[#666058]" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            {/* Audio Generation */}
            <div>
              <label className="block font-sans text-sm text-[#666058] mb-2">
                File Audio Descrittivo (genera automaticamente)
              </label>
              <div className="grid grid-cols-4 gap-3">
                {["it", "en", "fr", "de"].map((lang) => (
                  <div key={lang} className="text-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateAudio(lang)}
                      disabled={generatingAudio[lang] || !formData.description[lang]}
                      className="w-full mb-2"
                    >
                      {generatingAudio[lang] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4 mr-1" />
                          {lang.toUpperCase()}
                        </>
                      )}
                    </Button>
                    {formData.audio_url[lang] && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-600">✓</span>
                        <audio 
                          controls 
                          src={`${API}${formData.audio_url[lang].startsWith('/') ? '' : '/'}${formData.audio_url[lang].replace('/api', '')}`}
                          className="h-8 w-32"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
              data-testid="save-costume-btn"
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
              Sei sicuro di voler eliminare questo costume dall'archivio?
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
