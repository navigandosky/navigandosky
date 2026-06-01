import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useLanguage } from "./i18n/LanguageContext";
import {
  Plus, Trash2, Edit3, Camera, Sparkles, Package, Search,
  ChevronDown, ChevronRight, Image as ImageIcon, X, Loader2,
  Link2, Hash, Save, FileText
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Badge } from "./components/ui/badge";
import { Textarea } from "./components/ui/textarea";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function Inventario({ authToken, matterportPois }) {
  const { t } = useLanguage();
  const [ambienti, setAmbienti] = useState([]);
  const [oggetti, setOggetti] = useState([]);
  const [selectedAmbiente, setSelectedAmbiente] = useState(null);
  const [ambienteDialogOpen, setAmbienteDialogOpen] = useState(false);
  const [editingAmbiente, setEditingAmbiente] = useState(null);
  const [oggettoDialogOpen, setOggettoDialogOpen] = useState(false);
  const [editingOggetto, setEditingOggetto] = useState(null);
  const [elaborating, setElaborating] = useState(false);
  const [expandedAmbiente, setExpandedAmbiente] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  // AI Review state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewProposals, setReviewProposals] = useState([]);
  const [reviewAmbienteId, setReviewAmbienteId] = useState(null);
  const [selectedProposals, setSelectedProposals] = useState({});
  const [savingBatch, setSavingBatch] = useState(false);
  const fileInputRef = useRef(null);

  // Form state for ambiente
  const [ambienteForm, setAmbienteForm] = useState({ nome: "", descrizione: "" });
  // Form state for oggetto
  const [oggettoForm, setOggettoForm] = useState({
    codice: "", descrizione: "", quantita: 1, valore_nuovo: 0,
    valore_attuale: 0, seriale: "", tag_id: "", poi_id: "", categoria: ""
  });

  const params = authToken ? { token: authToken } : {};

  const loadAmbienti = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/inventario/ambienti`, { params });
      setAmbienti(res.data);
    } catch (e) { console.error("Error loading ambienti:", e); }
  }, [authToken]);

  const loadOggetti = useCallback(async (ambienteId) => {
    try {
      const p = { ...params };
      if (ambienteId) p.ambiente_id = ambienteId;
      const res = await axios.get(`${API}/inventario/oggetti`, { params: p });
      setOggetti(res.data);
    } catch (e) { console.error("Error loading oggetti:", e); }
  }, [authToken]);

  useEffect(() => {
    loadAmbienti();
    loadOggetti();
  }, [loadAmbienti, loadOggetti]);

  // Paste handler for images
  useEffect(() => {
    const handlePaste = (e) => {
      if (!expandedAmbiente) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          convertAndUploadImage(file, expandedAmbiente);
          break;
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [expandedAmbiente]);

  const convertAndUploadImage = async (file, ambienteId) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      try {
        await axios.post(`${API}/inventario/ambienti/${ambienteId}/immagini`, 
          { immagine: base64 }, { params });
        toast.success("Immagine aggiunta");
        loadAmbienti();
      } catch (e) {
        toast.error("Errore caricamento immagine");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (!files || !expandedAmbiente) return;
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        convertAndUploadImage(file, expandedAmbiente);
      }
    }
    e.target.value = "";
  };

  const deleteImmagine = async (ambienteId, imgId) => {
    try {
      await axios.delete(`${API}/inventario/ambienti/${ambienteId}/immagini/${imgId}`, { params });
      toast.success("Immagine rimossa");
      loadAmbienti();
    } catch (e) { toast.error("Errore rimozione immagine"); }
  };

  const handleElabora = async (ambienteId) => {
    setElaborating(true);
    try {
      const res = await axios.post(`${API}/inventario/ambienti/${ambienteId}/elabora`, null, { params, timeout: 120000 });
      const proposals = res.data.proposals || [];
      if (proposals.length === 0) {
        toast.info("Nessun oggetto identificato nelle immagini.");
        return;
      }
      // Pre-select all non-duplicate items
      const sel = {};
      proposals.forEach(p => { sel[p.temp_id] = !p.duplicate_in_room; });
      setSelectedProposals(sel);
      setReviewProposals(proposals);
      setReviewAmbienteId(ambienteId);
      setReviewDialogOpen(true);
      toast.success(`AI ha identificato ${proposals.length} oggetti. Rivedi la lista.`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Errore analisi AI");
    } finally {
      setElaborating(false);
    }
  };

  const toggleProposal = (tempId) => {
    setSelectedProposals(prev => ({ ...prev, [tempId]: !prev[tempId] }));
  };

  const selectAllProposals = (val) => {
    const sel = {};
    reviewProposals.forEach(p => { sel[p.temp_id] = val; });
    setSelectedProposals(sel);
  };

  const confirmProposals = async () => {
    const confirmed = reviewProposals.filter(p => selectedProposals[p.temp_id]);
    if (confirmed.length === 0) {
      toast.warning("Nessun oggetto selezionato.");
      return;
    }
    setSavingBatch(true);
    try {
      await axios.post(`${API}/inventario/oggetti/batch`, {
        ambiente_id: reviewAmbienteId,
        oggetti: confirmed.map(p => ({
          codice: p.codice, descrizione: p.descrizione, quantita: p.quantita,
          valore_nuovo: p.valore_nuovo, valore_attuale: p.valore_attuale, categoria: p.categoria
        }))
      }, { params });
      toast.success(`${confirmed.length} oggetti aggiunti all'inventario!`);
      setReviewDialogOpen(false);
      setReviewProposals([]);
      loadOggetti();
    } catch (e) {
      toast.error("Errore salvataggio oggetti");
    } finally {
      setSavingBatch(false);
    }
  };

  // Save ambiente
  const saveAmbiente = async () => {
    try {
      if (editingAmbiente) {
        await axios.put(`${API}/inventario/ambienti/${editingAmbiente.id}`, ambienteForm, { params });
        toast.success("Ambiente aggiornato");
      } else {
        await axios.post(`${API}/inventario/ambienti`, ambienteForm, { params });
        toast.success("Ambiente creato");
      }
      setAmbienteDialogOpen(false);
      loadAmbienti();
    } catch (e) { toast.error("Errore salvataggio ambiente"); }
  };

  const deleteAmbiente = async (id) => {
    if (!window.confirm("Eliminare questo ambiente e tutti i suoi oggetti?")) return;
    try {
      await axios.delete(`${API}/inventario/ambienti/${id}`, { params });
      toast.success("Ambiente eliminato");
      if (expandedAmbiente === id) setExpandedAmbiente(null);
      loadAmbienti();
      loadOggetti();
    } catch (e) { toast.error("Errore eliminazione"); }
  };

  // Save oggetto
  const saveOggetto = async () => {
    try {
      const payload = { ...oggettoForm, ambiente_id: selectedAmbiente || expandedAmbiente || "" };
      if (editingOggetto) {
        await axios.put(`${API}/inventario/oggetti/${editingOggetto.id}`, payload, { params });
        toast.success("Oggetto aggiornato");
      } else {
        await axios.post(`${API}/inventario/oggetti`, payload, { params });
        toast.success("Oggetto aggiunto");
      }
      setOggettoDialogOpen(false);
      loadOggetti();
    } catch (e) { toast.error("Errore salvataggio oggetto"); }
  };

  const deleteOggetto = async (id) => {
    try {
      await axios.delete(`${API}/inventario/oggetti/${id}`, { params });
      toast.success("Oggetto eliminato");
      loadOggetti();
    } catch (e) { toast.error("Errore eliminazione"); }
  };

  const openOggettoDialog = (oggetto, ambienteId) => {
    setSelectedAmbiente(ambienteId);
    if (oggetto) {
      setEditingOggetto(oggetto);
      setOggettoForm({
        codice: oggetto.codice || "", descrizione: oggetto.descrizione || "",
        quantita: oggetto.quantita || 1, valore_nuovo: oggetto.valore_nuovo || 0,
        valore_attuale: oggetto.valore_attuale || 0, seriale: oggetto.seriale || "",
        tag_id: oggetto.tag_id || "", poi_id: oggetto.poi_id || "", categoria: oggetto.categoria || ""
      });
    } else {
      setEditingOggetto(null);
      setOggettoForm({
        codice: "", descrizione: "", quantita: 1, valore_nuovo: 0,
        valore_attuale: 0, seriale: "", tag_id: "", poi_id: "", categoria: ""
      });
    }
    setOggettoDialogOpen(true);
  };

  const filteredOggetti = oggetti.filter(o =>
    !searchTerm || o.descrizione?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.codice?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAmbienteOggetti = (ambienteId) => filteredOggetti.filter(o => o.ambiente_id === ambienteId);

  const totalValue = oggetti.reduce((sum, o) => sum + (o.valore_attuale || 0) * (o.quantita || 1), 0);
  const totalNewValue = oggetti.reduce((sum, o) => sum + (o.valore_nuovo || 0) * (o.quantita || 1), 0);

  return (
    <div className="space-y-6" data-testid="inventario-page">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium">Ambienti</p>
                <p className="text-2xl font-bold text-blue-900">{ambienti.length}</p>
              </div>
              <Camera className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-medium">Oggetti Totali</p>
                <p className="text-2xl font-bold text-emerald-900">{oggetti.length}</p>
              </div>
              <Package className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-medium">Valore a Nuovo</p>
                <p className="text-2xl font-bold text-amber-900">{totalNewValue.toLocaleString("it-IT")} &euro;</p>
              </div>
              <FileText className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-violet-600 font-medium">Valore Attuale</p>
                <p className="text-2xl font-bold text-violet-900">{totalValue.toLocaleString("it-IT")} &euro;</p>
              </div>
              <FileText className="h-8 w-8 text-violet-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Cerca oggetti..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" data-testid="inventario-search" />
        </div>
        <Button onClick={() => {
          setEditingAmbiente(null);
          setAmbienteForm({ nome: "", descrizione: "" });
          setAmbienteDialogOpen(true);
        }} className="bg-teal-600 hover:bg-teal-700" data-testid="add-ambiente-btn">
          <Plus className="h-4 w-4 mr-2" /> Nuovo Ambiente
        </Button>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={handleFileSelect} />

      {/* Ambienti List */}
      {ambienti.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="py-12 text-center">
            <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">Nessun Ambiente</h3>
            <p className="text-sm text-gray-400 mb-4">Crea il primo ambiente per iniziare l'inventario</p>
            <Button onClick={() => {
              setEditingAmbiente(null);
              setAmbienteForm({ nome: "", descrizione: "" });
              setAmbienteDialogOpen(true);
            }} variant="outline"><Plus className="h-4 w-4 mr-2" /> Crea Ambiente</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ambienti.map((amb) => {
            const ambOggetti = getAmbienteOggetti(amb.id);
            const isExpanded = expandedAmbiente === amb.id;
            const ambValue = ambOggetti.reduce((s, o) => s + (o.valore_attuale || 0) * (o.quantita || 1), 0);

            return (
              <Card key={amb.id} className={`transition-all ${isExpanded ? "ring-2 ring-teal-400" : ""}`}
                data-testid={`ambiente-${amb.id}`}>
                <CardHeader className="py-3 px-4 cursor-pointer"
                  onClick={() => setExpandedAmbiente(isExpanded ? null : amb.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="h-5 w-5 text-teal-500" /> :
                        <ChevronRight className="h-5 w-5 text-gray-400" />}
                      <div>
                        <CardTitle className="text-base">{amb.nome || "Senza nome"}</CardTitle>
                        {amb.descrizione && <p className="text-xs text-gray-500 mt-0.5">{amb.descrizione}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">
                        <ImageIcon className="h-3 w-3 mr-1" />{(amb.immagini || []).length} foto
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Package className="h-3 w-3 mr-1" />{ambOggetti.length} oggetti
                      </Badge>
                      <Badge className="bg-violet-100 text-violet-700 text-xs">
                        {ambValue.toLocaleString("it-IT")} &euro;
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={(e) => {
                        e.stopPropagation();
                        setEditingAmbiente(amb);
                        setAmbienteForm({ nome: amb.nome, descrizione: amb.descrizione || "" });
                        setAmbienteDialogOpen(true);
                      }}><Edit3 className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={(e) => {
                        e.stopPropagation();
                        deleteAmbiente(amb.id);
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    {/* Image Upload Area */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-dashed border-gray-300">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700">Immagini Ambiente</h4>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                            <Plus className="h-3 w-3 mr-1" /> Aggiungi Foto
                          </Button>
                          <Button size="sm" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                            onClick={() => handleElabora(amb.id)} disabled={elaborating || (amb.immagini || []).length === 0}
                            data-testid="elabora-btn">
                            {elaborating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> :
                              <Sparkles className="h-3 w-3 mr-1" />}
                            {elaborating ? "Analisi AI..." : "Elabora con AI"}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">
                        Puoi anche incollare immagini con Ctrl+V
                      </p>
                      {(amb.immagini || []).length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {amb.immagini.map((img) => (
                            <div key={img.id} className="relative group aspect-video rounded overflow-hidden bg-gray-200">
                              <img src={img.data} alt="" className="w-full h-full object-cover" />
                              <button
                                onClick={() => deleteImmagine(amb.id, img.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              ><X className="h-3 w-3" /></button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-400 text-sm">
                          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          Nessuna foto. Aggiungi foto o incolla da clipboard.
                        </div>
                      )}
                    </div>

                    {/* Objects Table */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700">Oggetti ({ambOggetti.length})</h4>
                        <Button size="sm" variant="outline" onClick={() => openOggettoDialog(null, amb.id)}>
                          <Plus className="h-3 w-3 mr-1" /> Aggiungi Elemento
                        </Button>
                      </div>
                      {ambOggetti.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border rounded-lg overflow-hidden">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="text-left px-3 py-2 font-medium">Codice</th>
                                <th className="text-left px-3 py-2 font-medium">Descrizione</th>
                                <th className="text-center px-3 py-2 font-medium">Qt.</th>
                                <th className="text-right px-3 py-2 font-medium">Val. Nuovo</th>
                                <th className="text-right px-3 py-2 font-medium">Val. Attuale</th>
                                <th className="text-left px-3 py-2 font-medium">Seriale</th>
                                <th className="text-center px-3 py-2 font-medium">POI</th>
                                <th className="text-center px-3 py-2 font-medium">Azioni</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ambOggetti.map((obj) => (
                                <tr key={obj.id} className="border-t hover:bg-gray-50">
                                  <td className="px-3 py-2 font-mono text-xs text-blue-600">{obj.codice}</td>
                                  <td className="px-3 py-2 max-w-[200px] truncate">{obj.descrizione}</td>
                                  <td className="px-3 py-2 text-center">{obj.quantita}</td>
                                  <td className="px-3 py-2 text-right">{(obj.valore_nuovo || 0).toLocaleString("it-IT")} &euro;</td>
                                  <td className="px-3 py-2 text-right font-medium">{(obj.valore_attuale || 0).toLocaleString("it-IT")} &euro;</td>
                                  <td className="px-3 py-2 text-xs text-gray-500">{obj.seriale || "-"}</td>
                                  <td className="px-3 py-2 text-center">
                                    {obj.poi_id ? (() => {
                                      const linkedPoi = (matterportPois || []).find(p => p.id === obj.poi_id);
                                      const linkedName = linkedPoi ? ((linkedPoi.translations && linkedPoi.translations[0]?.title) || linkedPoi.id.slice(0,8)) : obj.poi_id.slice(0,8);
                                      return <span className="text-xs text-teal-600 font-medium" title={obj.poi_id}>{linkedName}</span>;
                                    })() :
                                      <span className="text-gray-300">-</span>}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button onClick={() => openOggettoDialog(obj, amb.id)}
                                        className="p-1 hover:bg-gray-200 rounded"><Edit3 className="h-3.5 w-3.5" /></button>
                                      <button onClick={() => deleteOggetto(obj.id)}
                                        className="p-1 hover:bg-red-100 rounded text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-center text-gray-400 text-sm py-4">
                          Nessun oggetto. Carica foto e clicca "Elabora con AI" o aggiungi manualmente.
                        </p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Ambiente Dialog */}
      <Dialog open={ambienteDialogOpen} onOpenChange={setAmbienteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAmbiente ? "Modifica Ambiente" : "Nuovo Ambiente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome Ambiente</Label>
              <Input value={ambienteForm.nome} onChange={(e) => setAmbienteForm(p => ({ ...p, nome: e.target.value }))}
                placeholder="es. Soggiorno, Camera da letto..." data-testid="ambiente-nome" />
            </div>
            <div>
              <Label>Descrizione</Label>
              <Textarea value={ambienteForm.descrizione}
                onChange={(e) => setAmbienteForm(p => ({ ...p, descrizione: e.target.value }))}
                placeholder="Descrizione opzionale..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAmbienteDialogOpen(false)}>Annulla</Button>
            <Button onClick={saveAmbiente} disabled={!ambienteForm.nome.trim()}>
              <Save className="h-4 w-4 mr-2" />{editingAmbiente ? "Aggiorna" : "Crea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Oggetto Dialog */}
      <Dialog open={oggettoDialogOpen} onOpenChange={setOggettoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOggetto ? "Modifica Oggetto" : "Nuovo Oggetto"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Codice</Label>
              <Input value={oggettoForm.codice} onChange={(e) => setOggettoForm(p => ({ ...p, codice: e.target.value }))}
                placeholder="INV-0001" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={oggettoForm.categoria} onChange={(e) => setOggettoForm(p => ({ ...p, categoria: e.target.value }))}
                placeholder="Arredamento, Elettronica..." />
            </div>
            <div className="col-span-2">
              <Label>Descrizione (max 100 caratteri)</Label>
              <Textarea value={oggettoForm.descrizione} maxLength={100}
                onChange={(e) => setOggettoForm(p => ({ ...p, descrizione: e.target.value }))}
                placeholder="Descrizione dell'oggetto..." rows={2} />
              <p className="text-xs text-gray-400 mt-1">{(oggettoForm.descrizione || "").length}/100</p>
            </div>
            <div>
              <Label>Quantita</Label>
              <Input type="number" min="1" value={oggettoForm.quantita}
                onChange={(e) => setOggettoForm(p => ({ ...p, quantita: parseInt(e.target.value) || 1 }))} />
            </div>
            <div>
              <Label>Seriale / ID</Label>
              <Input value={oggettoForm.seriale} onChange={(e) => setOggettoForm(p => ({ ...p, seriale: e.target.value }))}
                placeholder="N. seriale" />
            </div>
            <div>
              <Label>Valore a Nuovo (&euro;)</Label>
              <Input type="number" min="0" step="0.01" value={oggettoForm.valore_nuovo}
                onChange={(e) => setOggettoForm(p => ({ ...p, valore_nuovo: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Valore Attuale (&euro;)</Label>
              <Input type="number" min="0" step="0.01" value={oggettoForm.valore_attuale}
                onChange={(e) => setOggettoForm(p => ({ ...p, valore_attuale: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Tag ID</Label>
              <Input value={oggettoForm.tag_id} onChange={(e) => setOggettoForm(p => ({ ...p, tag_id: e.target.value }))}
                placeholder="ID tag fisico" />
            </div>
            <div>
              <Label>Associa POI Matterport</Label>
              <Select value={oggettoForm.poi_id || "none"} onValueChange={(v) => setOggettoForm(p => ({ ...p, poi_id: v === "none" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Nessun POI" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessun POI</SelectItem>
                  {(matterportPois || []).map((poi) => {
                    const poiName = (poi.translations && poi.translations[0]?.title) || poi.nome || poi.label || poi.id;
                    return (
                      <SelectItem key={poi.id} value={poi.id}>{poiName}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOggettoDialogOpen(false)}>Annulla</Button>
            <Button onClick={saveOggetto} disabled={!oggettoForm.descrizione?.trim()}>
              <Save className="h-4 w-4 mr-2" />{editingOggetto ? "Aggiorna" : "Aggiungi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Revisione Oggetti Identificati ({reviewProposals.length})
            </DialogTitle>
            <p className="text-sm text-gray-500">
              Seleziona gli oggetti da aggiungere all'inventario. Gli elementi duplicati sono segnalati.
            </p>
          </DialogHeader>

          {/* Select All / Deselect All */}
          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => selectAllProposals(true)}>
                Seleziona Tutti
              </Button>
              <Button size="sm" variant="outline" onClick={() => selectAllProposals(false)}>
                Deseleziona Tutti
              </Button>
            </div>
            <Badge variant="secondary">
              {Object.values(selectedProposals).filter(Boolean).length} / {reviewProposals.length} selezionati
            </Badge>
          </div>

          {/* Proposals List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 py-2 min-h-0">
            {reviewProposals.map((p) => (
              <div key={p.temp_id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
                  selectedProposals[p.temp_id]
                    ? "bg-green-50 border-green-300"
                    : "bg-gray-50 border-gray-200 opacity-60"
                } ${p.duplicate_in_room ? "ring-2 ring-red-300" : ""} ${p.duplicate_in_other ? "ring-2 ring-amber-300" : ""}`}
                onClick={() => toggleProposal(p.temp_id)}>

                {/* Checkbox */}
                <input type="checkbox" checked={!!selectedProposals[p.temp_id]}
                  onChange={() => toggleProposal(p.temp_id)}
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 shrink-0" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-blue-500">{p.codice}</span>
                    <span className="text-sm font-medium truncate">{p.descrizione}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span>Qt: {p.quantita}</span>
                    <span>Nuovo: {(p.valore_nuovo || 0).toLocaleString("it-IT")} &euro;</span>
                    <span>Attuale: {(p.valore_attuale || 0).toLocaleString("it-IT")} &euro;</span>
                    {p.categoria && <Badge variant="secondary" className="text-[10px] py-0">{p.categoria}</Badge>}
                  </div>
                </div>

                {/* Duplicate warnings */}
                {p.duplicate_in_room && (
                  <Badge className="bg-red-100 text-red-700 text-[10px] shrink-0">
                    Duplicato in questo ambiente
                  </Badge>
                )}
                {p.duplicate_in_other && !p.duplicate_in_room && (
                  <Badge className="bg-amber-100 text-amber-700 text-[10px] shrink-0">
                    Presente in altro ambiente
                  </Badge>
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Annulla</Button>
            <Button onClick={confirmProposals} disabled={savingBatch || Object.values(selectedProposals).filter(Boolean).length === 0}
              className="bg-green-600 hover:bg-green-700">
              {savingBatch ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Conferma {Object.values(selectedProposals).filter(Boolean).length} Oggetti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
