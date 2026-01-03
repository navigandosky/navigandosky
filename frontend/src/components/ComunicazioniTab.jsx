import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { ScrollArea } from "./ui/scroll-area";
import {
  Mail, Send, Plus, Trash2, Upload, FileText, X, Check, AlertCircle,
  Clock, Users, Paperclip, Eye, Search, CheckSquare, Copy
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ComunicazioniTab({ preselectedSocio, onClearPreselected }) {
  const [comunicazioni, setComunicazioni] = useState([]);
  const [soci, setSoci] = useState([]);
  const [tipiComunicazione, setTipiComunicazione] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedCom, setSelectedCom] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sending, setSending] = useState(false);
  
  // Filter state for list
  const [filterSearch, setFilterSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterDataDa, setFilterDataDa] = useState("");
  const [filterDataA, setFilterDataA] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    tipo: "",
    oggetto: "",
    descrizione: "",
    destinatari_ids: [],
  });
  const [allegati, setAllegati] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Handle preselected socio from map
  useEffect(() => {
    if (preselectedSocio && soci.length > 0) {
      const socioInList = soci.find(s => s.id === preselectedSocio.id || s.email === preselectedSocio.email);
      if (socioInList) {
        setFormData(prev => ({
          ...prev,
          destinatari_ids: [socioInList.id]
        }));
        setShowForm(true);
        if (onClearPreselected) onClearPreselected();
      }
    }
  }, [preselectedSocio, soci, onClearPreselected]);

  // Filter comunicazioni
  const filteredComunicazioni = comunicazioni
    .filter((com) => {
      const searchLower = filterSearch.toLowerCase();
      const matchesSearch = !filterSearch || 
        com.oggetto?.toLowerCase().includes(searchLower) ||
        com.descrizione?.toLowerCase().includes(searchLower) ||
        com.tipo?.toLowerCase().includes(searchLower);
      
      const matchesTipo = !filterTipo || com.tipo === filterTipo;
      
      const comDate = new Date(com.data_creazione);
      const matchesDataDa = !filterDataDa || comDate >= new Date(filterDataDa);
      const matchesDataA = !filterDataA || comDate <= new Date(filterDataA + "T23:59:59");
      
      return matchesSearch && matchesTipo && matchesDataDa && matchesDataA;
    })
    .sort((a, b) => new Date(b.data_creazione) - new Date(a.data_creazione));

  const fetchData = async () => {
    try {
      const [comRes, sociRes, tipiRes] = await Promise.all([
        axios.get(`${API}/comunicazioni`),
        axios.get(`${API}/soci`),
        axios.get(`${API}/comunicazioni-tipi`),
      ]);
      setComunicazioni(comRes.data);
      setSoci(sociRes.data.filter((s) => s.email)); // Solo soci con email
      setTipiComunicazione(tipiRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      tipo: "",
      oggetto: "",
      descrizione: "",
      destinatari_ids: [],
    });
    setAllegati([]);
    setSelectedCom(null);
  };

  const handleNewComunicazione = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEditComunicazione = (com) => {
    setFormData({
      tipo: com.tipo,
      oggetto: com.oggetto,
      descrizione: com.descrizione,
      destinatari_ids: com.destinatari.map((d) => d.socio_id),
    });
    setAllegati(com.allegati || []);
    setSelectedCom(com);
    setShowForm(true);
  };

  const handleViewDetail = (com) => {
    setSelectedCom(com);
    setShowDetail(true);
  };

  const handleSaveComunicazione = async () => {
    if (!formData.tipo || !formData.oggetto || formData.destinatari_ids.length === 0) {
      toast.error("Compila tutti i campi obbligatori e seleziona almeno un destinatario");
      return;
    }

    try {
      let savedCom;
      if (selectedCom?.id) {
        const response = await axios.put(`${API}/comunicazioni/${selectedCom.id}`, formData);
        savedCom = response.data;
        toast.success("Comunicazione aggiornata");
      } else {
        const response = await axios.post(`${API}/comunicazioni`, formData);
        savedCom = response.data;
        toast.success("Comunicazione creata");
      }

      // Upload new allegati
      for (const file of allegati.filter((a) => a.file)) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", file.file);
        await axios.post(`${API}/comunicazioni/${savedCom.id}/allegati`, formDataUpload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setShowForm(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nel salvataggio");
    }
  };

  const handleDeleteComunicazione = async (comId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa comunicazione?")) return;

    try {
      await axios.delete(`${API}/comunicazioni/${comId}`);
      toast.success("Comunicazione eliminata");
      fetchData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const handleInviaComunicazione = async (comId) => {
    if (!window.confirm("Sei sicuro di voler inviare questa comunicazione a tutti i destinatari?")) return;

    setSending(true);
    try {
      const response = await axios.post(`${API}/comunicazioni/${comId}/invia`);
      toast.success(response.data.message);
      fetchData();
      setShowDetail(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'invio");
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 6 * 1024 * 1024) {
      toast.error("File troppo grande (max 6MB)");
      return;
    }

    setAllegati([...allegati, { id: Date.now().toString(), filename: file.name, file, size: file.size }]);
  };

  const removeAllegato = (allegatoId) => {
    setAllegati(allegati.filter((a) => a.id !== allegatoId));
  };

  const toggleDestinatario = (socioId) => {
    setFormData((prev) => ({
      ...prev,
      destinatari_ids: prev.destinatari_ids.includes(socioId)
        ? prev.destinatari_ids.filter((id) => id !== socioId)
        : [...prev.destinatari_ids, socioId],
    }));
  };

  const selectAllDestinatari = () => {
    const filteredSoci = soci.filter((s) =>
      `${s.nome} ${s.cognome} ${s.email}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFormData((prev) => ({
      ...prev,
      destinatari_ids: filteredSoci.map((s) => s.id),
    }));
  };

  const deselectAllDestinatari = () => {
    setFormData((prev) => ({ ...prev, destinatari_ids: [] }));
  };

  const getStatoBadge = (stato) => {
    switch (stato) {
      case "bozza":
        return <Badge variant="outline" className="bg-slate-500/20 text-slate-400 border-slate-500/50">Bozza</Badge>;
      case "in_invio":
        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">In invio...</Badge>;
      case "inviata":
        return <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">Inviata</Badge>;
      case "errore":
        return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/50">Errore</Badge>;
      default:
        return <Badge variant="outline">{stato}</Badge>;
    }
  };

  const filteredSoci = soci.filter((s) =>
    `${s.nome} ${s.cognome} ${s.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card className="glass-card border-slate-800/60">
        <CardContent className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Comunicazioni</h2>
            <p className="text-sm text-slate-400">Gestisci e invia comunicazioni ai soci</p>
          </div>
          <Button
            onClick={handleNewComunicazione}
            className="bg-blue-600 hover:bg-blue-500"
            data-testid="new-comunicazione-btn"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuova Comunicazione
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card border-slate-800/60">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Mail className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{comunicazioni.length}</p>
                <p className="text-xs text-slate-400">Totale</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-slate-800/60">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Check className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">
                  {comunicazioni.filter((c) => c.stato === "inviata").length}
                </p>
                <p className="text-xs text-slate-400">Inviate</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-slate-800/60">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-slate-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">
                  {comunicazioni.filter((c) => c.stato === "bozza").length}
                </p>
                <p className="text-xs text-slate-400">Bozze</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-slate-800/60">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Users className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{soci.length}</p>
                <p className="text-xs text-slate-400">Soci con email</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista Comunicazioni */}
        <Card className="glass-card border-slate-800/60" data-testid="comunicazioni-list">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg">Archivio Comunicazioni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtri */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Cerca per oggetto, descrizione..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="pl-10 bg-slate-950/50 border-slate-800 focus:border-blue-500 text-slate-200"
                  data-testid="filter-comunicazioni-search"
                />
              </div>
              <Select value={filterTipo || "all"} onValueChange={(v) => setFilterTipo(v === "all" ? "" : v)}>
                <SelectTrigger className="w-full md:w-44 bg-slate-950/50 border-slate-800 text-slate-200" data-testid="filter-comunicazioni-tipo">
                  <SelectValue placeholder="Tutti i tipi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  {tipiComunicazione.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2 items-center">
                <span className="text-slate-500 text-sm">Da:</span>
                <Input
                  type="date"
                  value={filterDataDa}
                  onChange={(e) => setFilterDataDa(e.target.value)}
                  className="w-36 bg-slate-950/50 border-slate-800 text-slate-200"
                  data-testid="filter-data-da"
                />
                <span className="text-slate-500 text-sm">A:</span>
                <Input
                  type="date"
                  value={filterDataA}
                  onChange={(e) => setFilterDataA(e.target.value)}
                  className="w-36 bg-slate-950/50 border-slate-800 text-slate-200"
                  data-testid="filter-data-a"
                />
              </div>
            </div>
            
            {/* Results count */}
            <div className="text-sm text-slate-400">
              {filteredComunicazioni.length} {filteredComunicazioni.length === 1 ? "comunicazione trovata" : "comunicazioni trovate"}
            </div>

            {filteredComunicazioni.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nessuna comunicazione trovata</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Data</TableHead>
                      <TableHead className="text-slate-400">Tipo</TableHead>
                      <TableHead className="text-slate-400">Oggetto</TableHead>
                      <TableHead className="text-slate-400">Destinatari</TableHead>
                      <TableHead className="text-slate-400">Stato</TableHead>
                      <TableHead className="text-slate-400 text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComunicazioni.map((com) => (
                      <TableRow
                        key={com.id}
                        className="border-slate-800 hover:bg-slate-800/30 cursor-pointer"
                        onClick={() => handleViewDetail(com)}
                      >
                        <TableCell className="text-slate-400 text-sm">
                          {format(new Date(com.data_creazione), "dd/MM/yyyy", { locale: it })}
                        </TableCell>
                        <TableCell className="text-slate-200 capitalize">{com.tipo}</TableCell>
                        <TableCell className="text-slate-200 max-w-[200px] truncate">
                          {com.oggetto}
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {com.totale_inviati > 0
                            ? `${com.totale_inviati}/${com.totale_destinatari}`
                            : com.totale_destinatari}
                        </TableCell>
                        <TableCell>{getStatoBadge(com.stato)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetail(com);
                              }}
                              className="text-slate-400 hover:text-blue-400"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {com.stato === "bozza" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditComunicazione(com);
                                  }}
                                  className="text-slate-400 hover:text-yellow-400"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInviaComunicazione(com.id);
                                  }}
                                  className="text-slate-400 hover:text-emerald-400"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteComunicazione(com.id);
                              }}
                              className="text-slate-400 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="glass-card border-slate-800 max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="comunicazione-form">
          <DialogHeader>
            <DialogTitle className="text-slate-100 text-xl flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-400" />
              {selectedCom ? "Modifica Comunicazione" : "Nuova Comunicazione"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Tipo e Oggetto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo Comunicazione *</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger className="bg-slate-950/50 border-slate-800 text-slate-200">
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipiComunicazione.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Oggetto *</Label>
                <Input
                  value={formData.oggetto}
                  onChange={(e) => setFormData({ ...formData, oggetto: e.target.value })}
                  placeholder="Oggetto della comunicazione"
                  className="bg-slate-950/50 border-slate-800 text-slate-200"
                />
              </div>
            </div>

            {/* Descrizione */}
            <div className="space-y-2">
              <Label className="text-slate-300">Testo della comunicazione</Label>
              <Textarea
                value={formData.descrizione}
                onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                placeholder="Scrivi il contenuto della comunicazione..."
                rows={6}
                className="bg-slate-950/50 border-slate-800 text-slate-200 resize-none"
              />
            </div>

            {/* Allegati */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Allegati
                </Label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Button variant="outline" size="sm" className="border-slate-700">
                    <Upload className="h-4 w-4 mr-2" />
                    Aggiungi File
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500">PDF, JPG, DOC, XLS fino a 6MB</p>

              {allegati.length > 0 && (
                <div className="space-y-2 mt-2">
                  {allegati.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-slate-200">{a.filename}</span>
                        <span className="text-xs text-slate-500">
                          ({(a.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAllegato(a.id)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Destinatari */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Destinatari *
                  <Badge variant="outline" className="ml-2">
                    {formData.destinatari_ids.length} selezionati
                  </Badge>
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllDestinatari}
                    className="border-slate-700 text-xs"
                  >
                    <CheckSquare className="h-3 w-3 mr-1" />
                    Tutti
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAllDestinatari}
                    className="border-slate-700 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Nessuno
                  </Button>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Cerca socio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-950/50 border-slate-800 text-slate-200"
                />
              </div>

              <ScrollArea className="h-[250px] rounded-lg border border-slate-800">
                <div className="p-2 space-y-1">
                  {filteredSoci.map((socio) => (
                    <div
                      key={socio.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        formData.destinatari_ids.includes(socio.id)
                          ? "bg-blue-500/20 border border-blue-500/50"
                          : "hover:bg-slate-800/50"
                      }`}
                      onClick={() => toggleDestinatario(socio.id)}
                    >
                      <Checkbox
                        checked={formData.destinatari_ids.includes(socio.id)}
                        className="border-slate-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 truncate">
                          {socio.nome} {socio.cognome}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{socio.email}</p>
                      </div>
                      {socio.carica && socio.carica !== "Socio" && (
                        <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                          {socio.carica}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="border-slate-700"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSaveComunicazione}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {selectedCom ? "Aggiorna" : "Salva Bozza"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="glass-card border-slate-800 max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="comunicazione-detail">
          <DialogHeader>
            <DialogTitle className="text-slate-100 text-xl flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-400" />
                Dettaglio Comunicazione
              </span>
              {selectedCom && getStatoBadge(selectedCom.stato)}
            </DialogTitle>
          </DialogHeader>

          {selectedCom && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Tipo</p>
                  <p className="text-slate-200 capitalize">{selectedCom.tipo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Data Creazione</p>
                  <p className="text-slate-200">
                    {format(new Date(selectedCom.data_creazione), "dd/MM/yyyy HH:mm", { locale: it })}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500">Oggetto</p>
                <p className="text-slate-200 font-medium">{selectedCom.oggetto}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">Testo</p>
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                  <p className="text-slate-300 whitespace-pre-wrap">{selectedCom.descrizione}</p>
                </div>
              </div>

              {/* Allegati */}
              {selectedCom.allegati?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Allegati</p>
                  <div className="space-y-2">
                    {selectedCom.allegati.map((a) => (
                      <a
                        key={a.id}
                        href={`${API}/documenti/${a.file_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 transition-colors"
                      >
                        <FileText className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-slate-200">{a.filename}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Destinatari */}
              <div>
                <p className="text-xs text-slate-500 mb-2">
                  Destinatari ({selectedCom.totale_inviati}/{selectedCom.totale_destinatari} inviati)
                </p>
                <ScrollArea className="h-[200px] rounded-lg border border-slate-800">
                  <div className="p-2 space-y-1">
                    {selectedCom.destinatari?.map((d) => (
                      <div
                        key={d.socio_id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30"
                      >
                        <div>
                          <p className="text-sm text-slate-200">
                            {d.nome} {d.cognome}
                          </p>
                          <p className="text-xs text-slate-500">{d.email}</p>
                        </div>
                        {d.inviato ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : d.errore ? (
                          <div className="flex items-center gap-1 text-red-400">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs">{d.errore}</span>
                          </div>
                        ) : (
                          <Clock className="h-4 w-4 text-slate-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Actions */}
              {selectedCom.stato === "bozza" && (
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleEditComunicazione(selectedCom)}
                    className="border-slate-700"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Modifica
                  </Button>
                  <Button
                    onClick={() => handleInviaComunicazione(selectedCom.id)}
                    disabled={sending}
                    className="bg-emerald-600 hover:bg-emerald-500"
                  >
                    {sending ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                        Invio in corso...
                      </span>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Invia Comunicazione
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
