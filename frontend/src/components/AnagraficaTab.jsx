import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Save, X, Plus, CalendarIcon, Trash2, Upload, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const REGIONI_ITALIA = [
  "ABRUZZO", "BASILICATA", "CALABRIA", "CAMPANIA", "EMILIA ROMAGNA",
  "FRIULI VENEZIA GIULIA", "LAZIO", "LIGURIA", "LOMBARDIA", "MARCHE",
  "MOLISE", "PIEMONTE", "PUGLIA", "SARDEGNA", "SICILIA", "TOSCANA",
  "TRENTINO ALTO ADIGE", "UMBRIA", "VALLE D'AOSTA", "VENETO"
];

const CARICHE_DEFAULT = ["Presidente", "Vice Presidente", "Segretario", "Tesoriere", "Consigliere", "Socio"];

export default function AnagraficaTab({ selectedSocio, onSaved, onCancel }) {
  const [formData, setFormData] = useState({
    nome: "",
    cognome: "",
    citta: "",
    regione: "",
    indirizzo: "",
    codice_fiscale: "",
    telefono: "",
    pec: "",
    email: "",
    tipo_dispositivo: "",
    carica: "",
    data_iscrizione: "",
    qualifica: "",
    gruppo: "",
    sito_web: "",
    zona_copertura: "",
    documenti: [],
  });

  const [dispositivi, setDispositivi] = useState([]);
  const [qualifiche, setQualifiche] = useState([]);
  const [gruppi, setGruppi] = useState([]);
  const [newDispositivo, setNewDispositivo] = useState("");
  const [newQualifica, setNewQualifica] = useState("");
  const [newGruppo, setNewGruppo] = useState("");
  const [loading, setSaving] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    if (selectedSocio) {
      setFormData(selectedSocio);
    } else {
      resetForm();
    }
  }, [selectedSocio]);

  const fetchDropdowns = async () => {
    try {
      const [dispRes, qualRes] = await Promise.all([
        axios.get(`${API}/dropdown/dispositivo`),
        axios.get(`${API}/dropdown/qualifica`),
      ]);
      setDispositivi(dispRes.data);
      setQualifiche(qualRes.data);
    } catch (error) {
      console.error("Error fetching dropdowns:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      cognome: "",
      citta: "",
      regione: "",
      indirizzo: "",
      codice_fiscale: "",
      telefono: "",
      pec: "",
      email: "",
      tipo_dispositivo: "",
      carica: "",
      data_iscrizione: "",
      qualifica: "",
      sito_web: "",
      zona_copertura: "",
      documenti: [],
    });
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addDropdownOption = async (category, value, setter) => {
    if (!value.trim()) return;
    try {
      await axios.post(`${API}/dropdown`, { category, value: value.trim() });
      fetchDropdowns();
      setter("");
      toast.success(`Opzione "${value}" aggiunta`);
    } catch (error) {
      toast.error("Errore nell'aggiunta dell'opzione");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.cognome) {
      toast.error("Nome e Cognome sono obbligatori");
      return;
    }

    setSaving(true);
    try {
      if (selectedSocio?.id) {
        await axios.put(`${API}/soci/${selectedSocio.id}`, formData);
        toast.success("Socio aggiornato!");
      } else {
        await axios.post(`${API}/soci`, formData);
        toast.success("Socio creato!");
      }
      onSaved();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSocio?.id) return;

    if (file.size > 6 * 1024 * 1024) {
      toast.error("File troppo grande (max 6MB)");
      return;
    }

    setUploadingDoc(true);
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    formDataUpload.append("descrizione", file.name);

    try {
      const response = await axios.post(
        `${API}/soci/${selectedSocio.id}/documenti`,
        formDataUpload,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setFormData((prev) => ({
        ...prev,
        documenti: [...prev.documenti, response.data],
      }));
      toast.success("Documento caricato!");
    } catch (error) {
      toast.error("Errore nel caricamento del documento");
    } finally {
      setUploadingDoc(false);
    }
  };

  const deleteDocument = async (docId) => {
    if (!selectedSocio?.id) return;
    try {
      await axios.delete(`${API}/soci/${selectedSocio.id}/documenti/${docId}`);
      setFormData((prev) => ({
        ...prev,
        documenti: prev.documenti.filter((d) => d.id !== docId),
      }));
      toast.success("Documento eliminato");
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  return (
    <Card className="glass-card border-slate-800/60" data-testid="anagrafica-form">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-slate-100 text-xl">
          {selectedSocio ? "Modifica Socio" : "Nuovo Socio"}
        </CardTitle>
        {selectedSocio && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onCancel();
              resetForm();
            }}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="h-4 w-4 mr-1" />
            Annulla
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dati Anagrafici */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                placeholder="Nome"
                className="bg-slate-950/50 border-slate-800 focus:border-blue-500 text-slate-200"
                data-testid="input-nome"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Cognome *</Label>
              <Input
                value={formData.cognome}
                onChange={(e) => handleChange("cognome", e.target.value)}
                placeholder="Cognome"
                className="bg-slate-950/50 border-slate-800 focus:border-blue-500 text-slate-200"
                data-testid="input-cognome"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Codice Fiscale</Label>
              <Input
                value={formData.codice_fiscale}
                onChange={(e) => handleChange("codice_fiscale", e.target.value.toUpperCase())}
                placeholder="RSSMRA80A01H501U"
                maxLength={16}
                className="bg-slate-950/50 border-slate-800 focus:border-blue-500 text-slate-200 uppercase"
                data-testid="input-cf"
              />
            </div>
          </div>

          {/* Indirizzo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Indirizzo</Label>
              <Input
                value={formData.indirizzo}
                onChange={(e) => handleChange("indirizzo", e.target.value)}
                placeholder="Via/Piazza..."
                className="bg-slate-950/50 border-slate-800 focus:border-blue-500 text-slate-200"
                data-testid="input-indirizzo"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Città</Label>
              <Input
                value={formData.citta}
                onChange={(e) => handleChange("citta", e.target.value)}
                placeholder="Città"
                className="bg-slate-950/50 border-slate-800 focus:border-blue-500 text-slate-200"
                data-testid="input-citta"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Regione</Label>
              <Select value={formData.regione} onValueChange={(v) => handleChange("regione", v)}>
                <SelectTrigger className="bg-slate-950/50 border-slate-800 text-slate-200" data-testid="select-regione">
                  <SelectValue placeholder="Seleziona regione" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {REGIONI_ITALIA.map((r) => (
                    <SelectItem key={r} value={r} className="text-slate-200 focus:bg-slate-800">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contatti */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Telefono</Label>
              <Input
                value={formData.telefono}
                onChange={(e) => handleChange("telefono", e.target.value)}
                placeholder="+39 333 1234567"
                className="bg-slate-950/50 border-slate-800 focus:border-blue-500 text-slate-200"
                data-testid="input-telefono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="email@esempio.it"
                className="bg-slate-950/50 border-slate-800 focus:border-blue-500 text-slate-200"
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">PEC</Label>
              <Input
                type="email"
                value={formData.pec}
                onChange={(e) => handleChange("pec", e.target.value)}
                placeholder="email@pec.it"
                className="bg-slate-950/50 border-slate-800 focus:border-blue-500 text-slate-200"
                data-testid="input-pec"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Sito Web</Label>
              <Input
                value={formData.sito_web}
                onChange={(e) => handleChange("sito_web", e.target.value)}
                placeholder="https://www.esempio.it"
                className="bg-slate-950/50 border-slate-800 focus:border-blue-500 text-slate-200"
                data-testid="input-sito"
              />
            </div>
          </div>

          {/* Dati Associazione */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Carica</Label>
              <Select value={formData.carica} onValueChange={(v) => handleChange("carica", v)}>
                <SelectTrigger className="bg-slate-950/50 border-slate-800 text-slate-200" data-testid="select-carica">
                  <SelectValue placeholder="Seleziona carica" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {CARICHE_DEFAULT.map((c) => (
                    <SelectItem key={c} value={c} className="text-slate-200 focus:bg-slate-800">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Qualifica</Label>
              <div className="flex gap-2">
                <Select value={formData.qualifica} onValueChange={(v) => handleChange("qualifica", v)}>
                  <SelectTrigger className="bg-slate-950/50 border-slate-800 text-slate-200 flex-1" data-testid="select-qualifica">
                    <SelectValue placeholder="Seleziona qualifica" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {qualifiche.map((q) => (
                      <SelectItem key={q.id} value={q.value} className="text-slate-200 focus:bg-slate-800">
                        {q.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="border-slate-700">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="bg-slate-900 border-slate-800 w-64">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Nuova Qualifica</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newQualifica}
                          onChange={(e) => setNewQualifica(e.target.value)}
                          placeholder="Es: Socio Onorario"
                          className="bg-slate-950/50 border-slate-800 text-slate-200"
                        />
                        <Button
                          size="sm"
                          onClick={() => addDropdownOption("qualifica", newQualifica, setNewQualifica)}
                        >
                          Aggiungi
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Tipo Dispositivo</Label>
              <div className="flex gap-2">
                <Select value={formData.tipo_dispositivo} onValueChange={(v) => handleChange("tipo_dispositivo", v)}>
                  <SelectTrigger className="bg-slate-950/50 border-slate-800 text-slate-200 flex-1" data-testid="select-dispositivo">
                    <SelectValue placeholder="Seleziona dispositivo" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {dispositivi.map((d) => (
                      <SelectItem key={d.id} value={d.value} className="text-slate-200 focus:bg-slate-800">
                        {d.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="border-slate-700">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="bg-slate-900 border-slate-800 w-64">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Nuovo Dispositivo</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newDispositivo}
                          onChange={(e) => setNewDispositivo(e.target.value)}
                          placeholder="Es: PRO4"
                          className="bg-slate-950/50 border-slate-800 text-slate-200"
                        />
                        <Button
                          size="sm"
                          onClick={() => addDropdownOption("dispositivo", newDispositivo, setNewDispositivo)}
                        >
                          Aggiungi
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Data Iscrizione</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-slate-950/50 border-slate-800 text-slate-200"
                    data-testid="input-data-iscrizione"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.data_iscrizione
                      ? format(new Date(formData.data_iscrizione), "dd/MM/yyyy", { locale: it })
                      : "Seleziona data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800">
                  <Calendar
                    mode="single"
                    selected={formData.data_iscrizione ? new Date(formData.data_iscrizione) : undefined}
                    onSelect={(date) => {
                      handleChange("data_iscrizione", date ? date.toISOString() : "");
                      setDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Zona Copertura */}
          <div className="space-y-2">
            <Label className="text-slate-300">Zona di Copertura</Label>
            <Input
              value={formData.zona_copertura}
              onChange={(e) => handleChange("zona_copertura", e.target.value)}
              placeholder="Es: LOMBARDIA, PIEMONTE, EMILIA ROMAGNA"
              className="bg-slate-950/50 border-slate-800 focus:border-blue-500 text-slate-200"
              data-testid="input-zona"
            />
          </div>

          {/* Documenti - Solo per modifica */}
          {selectedSocio?.id && (
            <div className="space-y-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 text-base">Documenti Allegati</Label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploadingDoc}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-slate-700"
                    disabled={uploadingDoc}
                  >
                    {uploadingDoc ? (
                      <span className="animate-spin mr-2">⏳</span>
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Carica File
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500">PDF, JPG fino a 6MB</p>

              {formData.documenti?.length > 0 ? (
                <div className="space-y-2">
                  {formData.documenti.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-400" />
                        <div>
                          <p className="text-sm text-slate-200">{doc.filename}</p>
                          <p className="text-xs text-slate-500">
                            {doc.descrizione} - {(doc.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`${API}/documenti/${doc.file_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDocument(doc.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                  Nessun documento allegato
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-300 hover:scale-[1.02] px-8"
              disabled={loading}
              data-testid="save-socio-btn"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                  Salvataggio...
                </span>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {selectedSocio ? "Aggiorna Socio" : "Crea Socio"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
