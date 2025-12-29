import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, Languages, Volume2 } from "lucide-react";
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

export default function AdminPOIs() {
  const [pois, setPois] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState({});
  const [saving, setSaving] = useState(false);
  const [filterSpace, setFilterSpace] = useState("all");
  
  const [formData, setFormData] = useState({
    space_id: "",
    matterport_tag_id: "",
    name: { ...EMPTY_TRANSLATION },
    description: { ...EMPTY_TRANSLATION },
    audio_url: { it: "", en: "", fr: "", de: "" },
    position: null
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [poisRes, spacesRes] = await Promise.all([
        axios.get(`${API}/pois`),
        axios.get(`${API}/spaces`)
      ]);
      setPois(poisRes.data);
      setSpaces(spacesRes.data);
    } catch (error) {
      toast.error("Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setSelectedPoi(null);
    setFormData({
      space_id: filterSpace !== "all" ? filterSpace : "",
      matterport_tag_id: "",
      name: { ...EMPTY_TRANSLATION },
      description: { ...EMPTY_TRANSLATION },
      audio_url: { it: "", en: "", fr: "", de: "" },
      position: null
    });
    setDialogOpen(true);
  };

  const openEditDialog = (poi) => {
    setSelectedPoi(poi);
    setFormData({
      space_id: poi.space_id,
      matterport_tag_id: poi.matterport_tag_id || "",
      name: poi.name || { ...EMPTY_TRANSLATION },
      description: poi.description || { ...EMPTY_TRANSLATION },
      audio_url: poi.audio_url || { it: "", en: "", fr: "", de: "" },
      position: poi.position
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

  const handleSave = async () => {
    if (!formData.space_id || !formData.name.it) {
      toast.error("Compila i campi obbligatori");
      return;
    }

    setSaving(true);
    try {
      if (selectedPoi) {
        await axios.put(`${API}/pois/${selectedPoi.id}`, formData);
        toast.success("POI aggiornato");
      } else {
        await axios.post(`${API}/pois`, formData);
        toast.success("POI creato");
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
    if (!selectedPoi) return;

    try {
      await axios.delete(`${API}/pois/${selectedPoi.id}`);
      toast.success("POI eliminato");
      setDeleteDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const filteredPois = filterSpace === "all" 
    ? pois 
    : pois.filter(p => p.space_id === filterSpace);

  const getSpaceName = (spaceId) => {
    const space = spaces.find(s => s.id === spaceId);
    return space?.name?.it || spaceId;
  };

  return (
    <AdminLayout title="Punti di Interesse">
      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <Button
          onClick={openCreateDialog}
          className="btn-gold rounded-sm"
          data-testid="add-poi-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi POI
        </Button>

        <Select value={filterSpace} onValueChange={setFilterSpace}>
          <SelectTrigger className="w-64" data-testid="filter-space">
            <SelectValue placeholder="Filtra per spazio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli spazi</SelectItem>
            {spaces.map((space) => (
              <SelectItem key={space.id} value={space.id}>
                {space.name?.it || space.model_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
        </div>
      ) : filteredPois.length === 0 ? (
        <div className="bg-white rounded-sm border border-[#E5E0D8] p-12 text-center">
          <p className="font-sans text-[#666058]">Nessun POI presente</p>
        </div>
      ) : (
        <div className="bg-white rounded-sm border border-[#E5E0D8] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F2F0EB]">
              <tr>
                <th className="px-6 py-4 text-left font-sans text-sm text-[#666058]">Nome</th>
                <th className="px-6 py-4 text-left font-sans text-sm text-[#666058]">Spazio</th>
                <th className="px-6 py-4 text-left font-sans text-sm text-[#666058]">Tag ID</th>
                <th className="px-6 py-4 text-left font-sans text-sm text-[#666058]">Audio</th>
                <th className="px-6 py-4 text-right font-sans text-sm text-[#666058]">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredPois.map((poi) => (
                <tr key={poi.id} className="border-t border-[#E5E0D8]">
                  <td className="px-6 py-4">
                    <p className="font-serif text-[#2A2A2A]">{poi.name?.it || "—"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-sans text-sm text-[#666058]">{getSpaceName(poi.space_id)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <code className="font-mono text-sm text-[#666058]">{poi.matterport_tag_id || "—"}</code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {["it", "en", "fr", "de"].map((lang) => (
                        <span
                          key={lang}
                          className={`text-xs px-2 py-1 rounded ${
                            poi.audio_url?.[lang] ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {lang.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(poi)}
                      data-testid={`edit-poi-${poi.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPoi(poi);
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {selectedPoi ? "Modifica POI" : "Nuovo POI"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Space Selection */}
            <div>
              <label className="block font-sans text-sm text-[#666058] mb-2">
                Spazio *
              </label>
              <Select
                value={formData.space_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, space_id: value }))}
              >
                <SelectTrigger data-testid="poi-space-select">
                  <SelectValue placeholder="Seleziona uno spazio" />
                </SelectTrigger>
                <SelectContent>
                  {spaces.map((space) => (
                    <SelectItem key={space.id} value={space.id}>
                      {space.name?.it || space.model_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Matterport Tag ID */}
            <div>
              <label className="block font-sans text-sm text-[#666058] mb-2">
                Tag ID Matterport
              </label>
              <Input
                value={formData.matterport_tag_id}
                onChange={(e) => setFormData(prev => ({ ...prev, matterport_tag_id: e.target.value }))}
                placeholder="ID del tag nello spazio Matterport"
                className="border-[#E5E0D8] focus:border-[#C5A059]"
                data-testid="poi-tag-id"
              />
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
                  Traduci
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
                  Traduci
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

            {/* Audio Generation */}
            <div>
              <label className="block font-sans text-sm text-[#666058] mb-2">
                Audioguide (genera automaticamente da descrizione)
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
                      data-testid={`generate-audio-${lang}`}
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
                      <span className="text-xs text-green-600">Generato</span>
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
              data-testid="save-poi-btn"
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
              Sei sicuro di voler eliminare questo punto di interesse?
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
