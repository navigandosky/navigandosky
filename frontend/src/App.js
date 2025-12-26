import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import {
  Building2,
  Zap,
  Wrench,
  Users,
  Home,
  Plus,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Euro,
  Plug,
  Power,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Settings,
  BarChart3,
  Search,
  Filter,
  Eye,
  MessageCircle,
  Send,
  Bot,
  FileText,
  Upload,
  Download,
  ExternalLink,
  HelpCircle,
  Loader2,
  Ticket,
  QrCode,
  Printer,
  Star,
  Bell,
  Lightbulb,
  Map,
  Thermometer
} from "lucide-react";
import { TicketList, CalendarioManutenzioni, QRCodeDialog } from "./TicketCalendarQR";
import { PlanimetriaEditor, SuggerimentiProattivi, NotificationBadge } from "./PlanimetriaSuggerimenti";
import SmartBuildingDashboard from "./SmartBuildingDashboard";
import ElettrodomesticoDialog from "./ElettrodomesticoForm";
import RicercaCentriAssistenza from "./RicercaCentriAssistenza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Categories and Enums
const CATEGORIE_ELETTRODOMESTICI = [
  { value: "cucina", label: "Cucina", icon: "🍳" },
  { value: "lavanderia", label: "Lavanderia", icon: "🧺" },
  { value: "climatizzazione", label: "Climatizzazione", icon: "❄️" },
  { value: "intrattenimento", label: "Intrattenimento", icon: "📺" },
  { value: "illuminazione", label: "Illuminazione", icon: "💡" },
  { value: "pulizia", label: "Pulizia", icon: "🧹" },
  { value: "sicurezza", label: "Sicurezza", icon: "🔒" },
  { value: "altro", label: "Altro", icon: "📦" },
];

const SMART_PLUG_PROVIDERS = [
  { value: "nessuno", label: "Nessuno" },
  { value: "smartthings", label: "SmartThings" },
  { value: "tuya", label: "Tuya" },
  { value: "shelly", label: "Shelly" },
  { value: "tapo", label: "TP-Link Tapo" },
  { value: "meross", label: "Meross" },
  { value: "altro", label: "Altro" },
];

const STATI_MANUTENZIONE = [
  { value: "pianificata", label: "Pianificata", color: "bg-blue-500" },
  { value: "in_corso", label: "In Corso", color: "bg-yellow-500" },
  { value: "completata", label: "Completata", color: "bg-green-500" },
  { value: "annullata", label: "Annullata", color: "bg-gray-500" },
];

const TIPI_MANUTENZIONE = [
  { value: "ordinaria", label: "Ordinaria" },
  { value: "straordinaria", label: "Straordinaria" },
  { value: "riparazione", label: "Riparazione" },
  { value: "controllo", label: "Controllo" },
  { value: "pulizia", label: "Pulizia" },
  { value: "sostituzione", label: "Sostituzione" },
];

const STATI_TICKET = [
  { value: "aperto", label: "Aperto", color: "bg-blue-500" },
  { value: "contattato", label: "Contattato", color: "bg-yellow-500" },
  { value: "in_lavorazione", label: "In Lavorazione", color: "bg-orange-500" },
  { value: "risolto", label: "Risolto", color: "bg-green-500" },
  { value: "annullato", label: "Annullato", color: "bg-gray-500" },
];

const PRIORITA_TICKET = [
  { value: "bassa", label: "Bassa", color: "bg-gray-400" },
  { value: "media", label: "Media", color: "bg-blue-400" },
  { value: "alta", label: "Alta", color: "bg-orange-500" },
  { value: "urgente", label: "Urgente", color: "bg-red-500" },
];

// Matterport Viewer Component
const MatterportViewer = ({ spaceId }) => {
  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border border-gray-200 shadow-lg">
      <iframe
        title="Matterport Viewer"
        src={`https://my.matterport.com/show/?m=${spaceId}&play=1`}
        width="100%"
        height="100%"
        frameBorder="0"
        allow="xr-spatial-tracking"
        allowFullScreen
      />
    </div>
  );
};

// AI Assistant Component
const AssistenteAI = ({ elettrodomestici, onNavigateToElettrodomestico }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedElettrodomestico, setSelectedElettrodomestico] = useState("");
  const [showProblemSolver, setShowProblemSolver] = useState(false);
  const [problema, setProblema] = useState("");
  const [soluzione, setSoluzione] = useState(null);
  const messagesEndRef = { current: null };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = { role: "user", content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await axios.post(`${API}/assistente/chat`, {
        message: inputMessage,
        conversation_history: messages.slice(-10),
        elettrodomestico_id: selectedElettrodomestico || null
      });

      const assistantMessage = {
        role: "assistant",
        content: response.data.response,
        sources: response.data.sources,
        suggested_actions: response.data.suggested_actions
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Errore chat:", error);
      toast.error("Errore nella comunicazione con l'assistente");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Mi dispiace, c'è stato un errore. Riprova tra poco."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const risolviProblema = async () => {
    if (!selectedElettrodomestico || !problema.trim()) {
      toast.error("Seleziona un elettrodomestico e descrivi il problema");
      return;
    }

    setIsLoading(true);
    setSoluzione(null);

    try {
      const response = await axios.post(
        `${API}/assistente/risolvi-problema?elettrodomestico_id=${selectedElettrodomestico}&problema=${encodeURIComponent(problema)}`
      );
      setSoluzione(response.data);
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Errore nella risoluzione del problema");
    } finally {
      setIsLoading(false);
    }
  };

  const cercaManuale = async (marca, modello) => {
    try {
      const response = await axios.get(`${API}/ricerca-manuale`, {
        params: { marca, modello }
      });
      return response.data;
    } catch (error) {
      console.error("Errore ricerca manuale:", error);
      return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle tra Chat e Problem Solver */}
      <div className="flex gap-2">
        <Button
          variant={!showProblemSolver ? "default" : "outline"}
          onClick={() => setShowProblemSolver(false)}
          className="flex-1"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Chat Assistente
        </Button>
        <Button
          variant={showProblemSolver ? "default" : "outline"}
          onClick={() => setShowProblemSolver(true)}
          className="flex-1"
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          Risolvi Problema
        </Button>
      </div>

      {!showProblemSolver ? (
        /* Chat Interface */
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              Assistente SmartBuilding
            </CardTitle>
            <CardDescription>
              Chiedimi informazioni sui tuoi elettrodomestici, consumi, manutenzioni...
            </CardDescription>
            {/* Selettore elettrodomestico opzionale */}
            <div className="mt-2">
              <Select
                value={selectedElettrodomestico}
                onValueChange={setSelectedElettrodomestico}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filtra per elettrodomestico (opzionale)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli elettrodomestici</SelectItem>
                  {elettrodomestici.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome} - {e.marca} {e.modello}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Ciao! Come posso aiutarti?</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="text-gray-500">Prova a chiedermi:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[
                        "Quanti elettrodomestici ho?",
                        "Quanto consumo al mese?",
                        "Quali manutenzioni ho in programma?"
                      ].map((suggestion, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => setInputMessage(suggestion)}
                          className="text-xs"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          msg.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2 flex gap-1">
                            {msg.sources.map((source, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {source}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {msg.suggested_actions.map((action, i) => (
                              <Button
                                key={i}
                                variant="outline"
                                size="sm"
                                className="text-xs bg-white"
                                onClick={() => {
                                  if (action.type === "navigate_matterport") {
                                    onNavigateToElettrodomestico?.(action.elettrodomestico_id);
                                  }
                                }}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Scrivi un messaggio..."
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                disabled={isLoading}
                data-testid="chat-input"
              />
              <Button onClick={sendMessage} disabled={isLoading || !inputMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* Problem Solver Interface */
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-orange-600" />
              Risolvi un Problema
            </CardTitle>
            <CardDescription>
              Descrivi il problema con un elettrodomestico e ti aiuterò a risolverlo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Elettrodomestico *</Label>
              <Select
                value={selectedElettrodomestico}
                onValueChange={setSelectedElettrodomestico}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona elettrodomestico" />
                </SelectTrigger>
                <SelectContent>
                  {elettrodomestici.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome} - {e.marca} {e.modello}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrivi il problema *</Label>
              <Textarea
                value={problema}
                onChange={(e) => setProblema(e.target.value)}
                placeholder="Es: La lavatrice fa rumore durante la centrifuga..."
                rows={4}
              />
            </div>

            <Button
              onClick={risolviProblema}
              disabled={isLoading || !selectedElettrodomestico || !problema.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisi in corso...
                </>
              ) : (
                <>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Trova Soluzione
                </>
              )}
            </Button>

            {soluzione && (
              <div className="mt-4 space-y-4">
                <Separator />
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Soluzione per {soluzione.elettrodomestico?.nome}
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    {soluzione.elettrodomestico?.marca} {soluzione.elettrodomestico?.modello}
                  </p>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm bg-white p-3 rounded border">
                      {soluzione.soluzione}
                    </pre>
                  </div>
                  {soluzione.centro_assistenza && (
                    <div className="mt-4 p-3 bg-blue-50 rounded flex items-center gap-2">
                      <Phone className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">{soluzione.centro_assistenza}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ stats, consumiPerCategoria }) => {
  if (!stats) return null;

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Consumo Mensile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.consumi?.consumo_mensile_kw || 0} kWh</div>
            <p className="text-xs opacity-75">~€{stats.consumi?.costo_stimato_mensile_euro || 0}/mese</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Elettrodomestici</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.consumi?.numero_elettrodomestici || 0}</div>
            <p className="text-xs opacity-75">{stats.elettrodomestici_in_garanzia || 0} in garanzia</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Manutenzioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.manutenzioni_pianificate || 0}</div>
            <p className="text-xs opacity-75">{stats.manutenzioni_in_scadenza || 0} in scadenza</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Costo Annuale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.consumi?.costo_stimato_annuale_euro || 0}</div>
            <p className="text-xs opacity-75">{stats.consumi?.consumo_annuale_kw || 0} kWh/anno</p>
          </CardContent>
        </Card>
      </div>

      {/* Consumi per Categoria */}
      {consumiPerCategoria && consumiPerCategoria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Consumi per Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {consumiPerCategoria.map((cat) => {
                const catInfo = CATEGORIE_ELETTRODOMESTICI.find(c => c.value === cat.categoria);
                const maxConsumo = Math.max(...consumiPerCategoria.map(c => c.consumo_mensile_kw));
                const percentage = maxConsumo > 0 ? (cat.consumo_mensile_kw / maxConsumo) * 100 : 0;
                
                return (
                  <div key={cat.categoria} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{catInfo?.icon} {catInfo?.label || cat.categoria}</span>
                      <span className="font-medium">{cat.consumo_mensile_kw} kWh/mese</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">{cat.numero_elettrodomestici} elettrodomestici</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Centro Assistenza Form Dialog
const CentroAssistenzaDialog = ({ open, onOpenChange, centro, onSave }) => {
  const [formData, setFormData] = useState({
    nome_azienda: "",
    referente: "",
    telefono: "",
    email: "",
    indirizzo: "",
    specializzazioni: [],
    note: "",
  });
  const [specializzazioneInput, setSpecializzazioneInput] = useState("");

  useEffect(() => {
    if (centro) {
      setFormData(centro);
    } else {
      setFormData({
        nome_azienda: "",
        referente: "",
        telefono: "",
        email: "",
        indirizzo: "",
        specializzazioni: [],
        note: "",
      });
    }
  }, [centro]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const addSpecializzazione = () => {
    if (specializzazioneInput.trim()) {
      setFormData({
        ...formData,
        specializzazioni: [...formData.specializzazioni, specializzazioneInput.trim()],
      });
      setSpecializzazioneInput("");
    }
  };

  const removeSpecializzazione = (index) => {
    setFormData({
      ...formData,
      specializzazioni: formData.specializzazioni.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {centro ? "Modifica Centro Assistenza" : "Nuovo Centro Assistenza"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_azienda">Nome Azienda *</Label>
            <Input
              id="nome_azienda"
              value={formData.nome_azienda}
              onChange={(e) => setFormData({ ...formData, nome_azienda: e.target.value })}
              required
              data-testid="centro-nome-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="referente">Referente</Label>
              <Input
                id="referente"
                value={formData.referente || ""}
                onChange={(e) => setFormData({ ...formData, referente: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Telefono *</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                required
                data-testid="centro-telefono-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="indirizzo">Indirizzo</Label>
            <Input
              id="indirizzo"
              value={formData.indirizzo || ""}
              onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Specializzazioni</Label>
            <div className="flex gap-2">
              <Input
                value={specializzazioneInput}
                onChange={(e) => setSpecializzazioneInput(e.target.value)}
                placeholder="Aggiungi specializzazione"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSpecializzazione())}
              />
              <Button type="button" variant="outline" onClick={addSpecializzazione}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.specializzazioni.map((spec, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {spec}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeSpecializzazione(index)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={formData.note || ""}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" data-testid="centro-save-btn">
              {centro ? "Salva Modifiche" : "Crea Centro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Manutenzione Form Dialog
const ManutenzioneDialog = ({ open, onOpenChange, manutenzione, elettrodomestici, centriAssistenza, onSave }) => {
  const [formData, setFormData] = useState({
    elettrodomestico_id: "",
    tipo: "ordinaria",
    descrizione: "",
    data_programmata: "",
    data_completamento: "",
    stato: "pianificata",
    costo: null,
    usa_centro_assistenza_elettrodomestico: true,
    centro_assistenza_id: "",
    ricorrente: false,
    frequenza_giorni: null,
    note: "",
  });

  useEffect(() => {
    if (manutenzione) {
      setFormData({
        ...manutenzione,
        elettrodomestico_id: manutenzione.elettrodomestico_id || "",
        centro_assistenza_id: manutenzione.centro_assistenza_id || "",
        costo: manutenzione.costo || null,
        frequenza_giorni: manutenzione.frequenza_giorni || null,
      });
    } else {
      setFormData({
        elettrodomestico_id: "",
        tipo: "ordinaria",
        descrizione: "",
        data_programmata: "",
        data_completamento: "",
        stato: "pianificata",
        costo: null,
        usa_centro_assistenza_elettrodomestico: true,
        centro_assistenza_id: "",
        ricorrente: false,
        frequenza_giorni: null,
        note: "",
      });
    }
  }, [manutenzione]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      elettrodomestico_id: formData.elettrodomestico_id || null,
      centro_assistenza_id: formData.centro_assistenza_id || null,
    };
    onSave(dataToSave);
  };

  const selectedElettrodomestico = elettrodomestici.find(e => e.id === formData.elettrodomestico_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {manutenzione ? "Modifica Manutenzione" : "Nuova Manutenzione"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="elettrodomestico_id">Elettrodomestico</Label>
            <Select
              value={formData.elettrodomestico_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, elettrodomestico_id: value === "none" ? "" : value })}
            >
              <SelectTrigger data-testid="manut-elettro-select">
                <SelectValue placeholder="Seleziona elettrodomestico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessuno (manutenzione generale)</SelectItem>
                {elettrodomestici.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome} - {e.posizione || "N/D"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPI_MANUTENZIONE.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stato">Stato</Label>
              <Select
                value={formData.stato}
                onValueChange={(value) => setFormData({ ...formData, stato: value })}
              >
                <SelectTrigger data-testid="manut-stato-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATI_MANUTENZIONE.map((stato) => (
                    <SelectItem key={stato.value} value={stato.value}>
                      {stato.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descrizione">Descrizione *</Label>
            <Textarea
              id="descrizione"
              value={formData.descrizione}
              onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
              required
              rows={3}
              data-testid="manut-descrizione-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_programmata">Data Programmata</Label>
              <Input
                id="data_programmata"
                type="date"
                value={formData.data_programmata || ""}
                onChange={(e) => setFormData({ ...formData, data_programmata: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_completamento">Data Completamento</Label>
              <Input
                id="data_completamento"
                type="date"
                value={formData.data_completamento || ""}
                onChange={(e) => setFormData({ ...formData, data_completamento: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="costo">Costo (€)</Label>
            <Input
              id="costo"
              type="number"
              step="0.01"
              min="0"
              value={formData.costo || ""}
              onChange={(e) => setFormData({ ...formData, costo: e.target.value ? parseFloat(e.target.value) : null })}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Centro Assistenza</h4>
            
            {selectedElettrodomestico?.centro_assistenza_id && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="usa_centro_assistenza_elettrodomestico"
                  checked={formData.usa_centro_assistenza_elettrodomestico}
                  onCheckedChange={(checked) => setFormData({ ...formData, usa_centro_assistenza_elettrodomestico: checked })}
                />
                <Label htmlFor="usa_centro_assistenza_elettrodomestico">
                  Usa centro assistenza dell'elettrodomestico
                </Label>
              </div>
            )}

            {(!formData.usa_centro_assistenza_elettrodomestico || !selectedElettrodomestico?.centro_assistenza_id) && (
              <div className="space-y-2">
                <Label htmlFor="centro_assistenza_id">Seleziona Centro Assistenza</Label>
                <Select
                  value={formData.centro_assistenza_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, centro_assistenza_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona centro assistenza" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuno</SelectItem>
                    {centriAssistenza.map((centro) => (
                      <SelectItem key={centro.id} value={centro.id}>
                        {centro.nome_azienda} - {centro.telefono}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="ricorrente"
                checked={formData.ricorrente}
                onCheckedChange={(checked) => setFormData({ ...formData, ricorrente: checked })}
              />
              <Label htmlFor="ricorrente">Manutenzione ricorrente</Label>
            </div>

            {formData.ricorrente && (
              <div className="space-y-2">
                <Label htmlFor="frequenza_giorni">Frequenza (giorni)</Label>
                <Input
                  id="frequenza_giorni"
                  type="number"
                  min="1"
                  value={formData.frequenza_giorni || ""}
                  onChange={(e) => setFormData({ ...formData, frequenza_giorni: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="es. 30, 90, 365..."
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={formData.note || ""}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" data-testid="manut-save-btn">
              {manutenzione ? "Salva Modifiche" : "Crea Manutenzione"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState("smartdomo");
  const [config, setConfig] = useState(null);
  const [stats, setStats] = useState(null);
  const [consumiPerCategoria, setConsumiPerCategoria] = useState([]);
  
  // Data states
  const [elettrodomestici, setElettrodomestici] = useState([]);
  const [manutenzioni, setManutenzioni] = useState([]);
  const [centriAssistenza, setCentriAssistenza] = useState([]);
  
  // Dialog states
  const [centroDialogOpen, setCentroDialogOpen] = useState(false);
  const [editingCentro, setEditingCentro] = useState(null);
  const [elettroDialogOpen, setElettroDialogOpen] = useState(false);
  const [editingElettro, setEditingElettro] = useState(null);
  const [manutDialogOpen, setManutDialogOpen] = useState(false);
  const [editingManut, setEditingManut] = useState(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrElettro, setQrElettro] = useState(null);
  const [ricercaCentriOpen, setRicercaCentriOpen] = useState(false);
  
  // SmartThings devices for form
  const [smartThingsDevices, setSmartThingsDevices] = useState([]);
  
  // Filter states
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroStatoManut, setFiltroStatoManut] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Load data functions
  const loadConfig = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/config`);
      setConfig(response.data);
    } catch (error) {
      console.error("Error loading config:", error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const [statsRes, consumiRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/dashboard/consumi-per-categoria`),
      ]);
      setStats(statsRes.data);
      setConsumiPerCategoria(consumiRes.data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }, []);

  const loadCentriAssistenza = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/centri-assistenza`);
      setCentriAssistenza(response.data);
    } catch (error) {
      console.error("Error loading centri assistenza:", error);
    }
  }, []);

  const loadElettrodomestici = useCallback(async () => {
    try {
      const params = filtroCategoria ? { categoria: filtroCategoria } : {};
      const response = await axios.get(`${API}/elettrodomestici`, { params });
      setElettrodomestici(response.data);
    } catch (error) {
      console.error("Error loading elettrodomestici:", error);
    }
  }, [filtroCategoria]);

  const loadSmartThingsDevices = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/smartthings/devices`);
      setSmartThingsDevices(response.data.devices || []);
    } catch (error) {
      console.log("SmartThings not available:", error.message);
    }
  }, []);

  const loadManutenzioni = useCallback(async () => {
    try {
      const params = filtroStatoManut ? { stato: filtroStatoManut } : {};
      const response = await axios.get(`${API}/manutenzioni`, { params });
      setManutenzioni(response.data);
    } catch (error) {
      console.error("Error loading manutenzioni:", error);
    }
  }, [filtroStatoManut]);

  // Initial load
  useEffect(() => {
    loadConfig();
    loadCentriAssistenza();
    loadSmartThingsDevices();
  }, [loadConfig, loadCentriAssistenza, loadSmartThingsDevices]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "dashboard") {
      loadStats();
    } else if (activeTab === "elettrodomestici") {
      loadElettrodomestici();
    } else if (activeTab === "manutenzioni") {
      loadManutenzioni();
      loadElettrodomestici();
    } else if (activeTab === "assistente") {
      loadElettrodomestici();
    } else if (activeTab === "tickets") {
      loadElettrodomestici();
      loadCentriAssistenza();
    } else if (activeTab === "planimetria") {
      loadElettrodomestici();
    }
  }, [activeTab, loadStats, loadElettrodomestici, loadManutenzioni, loadCentriAssistenza]);

  // CRUD handlers for Centri Assistenza
  const handleSaveCentro = async (data) => {
    try {
      if (editingCentro) {
        await axios.put(`${API}/centri-assistenza/${editingCentro.id}`, data);
        toast.success("Centro assistenza aggiornato");
      } else {
        await axios.post(`${API}/centri-assistenza`, data);
        toast.success("Centro assistenza creato");
      }
      setCentroDialogOpen(false);
      setEditingCentro(null);
      loadCentriAssistenza();
    } catch (error) {
      toast.error("Errore nel salvataggio");
      console.error(error);
    }
  };

  const handleDeleteCentro = async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questo centro assistenza?")) {
      try {
        await axios.delete(`${API}/centri-assistenza/${id}`);
        toast.success("Centro assistenza eliminato");
        loadCentriAssistenza();
      } catch (error) {
        toast.error("Errore nell'eliminazione");
        console.error(error);
      }
    }
  };

  // Handler per aggiungere centro dalla ricerca web
  const handleAddCentroFromSearch = (centroData) => {
    setEditingCentro(centroData);
    setCentroDialogOpen(true);
    setRicercaCentriOpen(false);
  };

  // CRUD handlers for Elettrodomestici
  const handleSaveElettro = async (data) => {
    try {
      if (editingElettro) {
        await axios.put(`${API}/elettrodomestici/${editingElettro.id}`, data);
        toast.success("Elettrodomestico aggiornato");
      } else {
        await axios.post(`${API}/elettrodomestici`, data);
        toast.success("Elettrodomestico creato");
      }
      setElettroDialogOpen(false);
      setEditingElettro(null);
      loadElettrodomestici();
      loadStats();
    } catch (error) {
      toast.error("Errore nel salvataggio");
      console.error(error);
    }
  };

  const handleDeleteElettro = async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questo elettrodomestico?")) {
      try {
        await axios.delete(`${API}/elettrodomestici/${id}`);
        toast.success("Elettrodomestico eliminato");
        loadElettrodomestici();
        loadStats();
      } catch (error) {
        toast.error("Errore nell'eliminazione");
        console.error(error);
      }
    }
  };

  // CRUD handlers for Manutenzioni
  const handleSaveManut = async (data) => {
    try {
      if (editingManut) {
        await axios.put(`${API}/manutenzioni/${editingManut.id}`, data);
        toast.success("Manutenzione aggiornata");
      } else {
        await axios.post(`${API}/manutenzioni`, data);
        toast.success("Manutenzione creata");
      }
      setManutDialogOpen(false);
      setEditingManut(null);
      loadManutenzioni();
      loadStats();
    } catch (error) {
      toast.error("Errore nel salvataggio");
      console.error(error);
    }
  };

  const handleDeleteManut = async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questa manutenzione?")) {
      try {
        await axios.delete(`${API}/manutenzioni/${id}`);
        toast.success("Manutenzione eliminata");
        loadManutenzioni();
        loadStats();
      } catch (error) {
        toast.error("Errore nell'eliminazione");
        console.error(error);
      }
    }
  };

  // Filter elettrodomestici by search
  const filteredElettrodomestici = elettrodomestici.filter(e => 
    !searchTerm || 
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.posizione?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">SmartBuilding</h1>
                <p className="text-xs text-gray-500">Gestione Immobili Intelligente</p>
              </div>
            </div>
            <NotificationBadge onClick={() => setActiveTab("suggerimenti")} />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: "smartdomo", label: "SmartDomo", icon: Thermometer },
              { id: "dashboard", label: "Dashboard", icon: Home },
              { id: "suggerimenti", label: "Suggerimenti", icon: Lightbulb },
              { id: "assistente", label: "Assistente AI", icon: Bot },
              { id: "calendario", label: "Calendario", icon: Calendar },
              { id: "tickets", label: "Ticket", icon: Ticket },
              { id: "planimetria", label: "Planimetria", icon: Map },
              { id: "matterport", label: "Vista 3D", icon: Eye },
              { id: "elettrodomestici", label: "Elettrodomestici", icon: Zap },
              { id: "manutenzioni", label: "Manutenzioni", icon: Wrench },
              { id: "centri", label: "Centri Assistenza", icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                data-testid={`nav-${tab.id}`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      {/* SmartDomo Tab - New Full Interface */}
      {activeTab === "smartdomo" && (
        <SmartBuildingDashboard 
          onNavigate={setActiveTab}
          manutenzioni={manutenzioni}
          elettrodomestici={elettrodomestici}
        />
      )}

      <main className={`max-w-7xl mx-auto px-4 py-6 ${activeTab === 'smartdomo' ? 'hidden' : ''}`}>
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <Dashboard stats={stats} consumiPerCategoria={consumiPerCategoria} />
        )}

        {/* Suggerimenti Tab */}
        {activeTab === "suggerimenti" && (
          <SuggerimentiProattivi 
            onNavigateToElettrodomestico={(id) => {
              // Trova l'elettrodomestico e vai alla sua scheda
              setActiveTab("elettrodomestici");
            }}
          />
        )}

        {/* Assistente AI Tab */}
        {activeTab === "assistente" && (
          <AssistenteAI 
            elettrodomestici={elettrodomestici}
            onNavigateToElettrodomestico={(id) => {
              setActiveTab("matterport");
              // Qui potremmo navigare al tag specifico quando avremo SDK Matterport
            }}
          />
        )}

        {/* Calendario Tab */}
        {activeTab === "calendario" && (
          <CalendarioManutenzioni />
        )}

        {/* Tickets Tab */}
        {activeTab === "tickets" && (
          <TicketList 
            elettrodomestici={elettrodomestici} 
            centriAssistenza={centriAssistenza}
          />
        )}

        {/* Planimetria Tab */}
        {activeTab === "planimetria" && (
          <PlanimetriaEditor 
            elettrodomestici={elettrodomestici}
            onElettrodomesticoClick={(elettro) => {
              setEditingElettro(elettro);
              setElettroDialogOpen(true);
            }}
          />
        )}

        {/* Matterport Tab */}
        {activeTab === "matterport" && config && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Vista 3D Matterport
                </CardTitle>
                <CardDescription>
                  Esplora lo spazio in 3D - Space ID: {config.matterport_space_id}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MatterportViewer spaceId={config.matterport_space_id} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Elettrodomestici Tab */}
        {activeTab === "elettrodomestici" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-1 gap-4 items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cerca elettrodomestici..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="elettro-search"
                  />
                </div>
                <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte</SelectItem>
                    {CATEGORIE_ELETTRODOMESTICI.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => {
                  setEditingElettro(null);
                  setElettroDialogOpen(true);
                }}
                data-testid="add-elettro-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Elettrodomestico
              </Button>
            </div>

            {/* Elettrodomestici Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredElettrodomestici.map((e) => {
                const catInfo = CATEGORIE_ELETTRODOMESTICI.find(c => c.value === e.categoria);
                const hasSmartPlug = e.smart_plug_id && e.smart_plug_provider !== "nessuno";
                
                return (
                  <Card key={e.id} className="hover:shadow-md transition-shadow" data-testid={`elettro-card-${e.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{catInfo?.icon || "📦"}</span>
                          <div>
                            <CardTitle className="text-base">{e.nome}</CardTitle>
                            <CardDescription>{e.marca} {e.modello}</CardDescription>
                          </div>
                        </div>
                        {hasSmartPlug && (
                          <Badge variant="outline" className="gap-1">
                            <Plug className="h-3 w-3" />
                            Smart
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {e.posizione && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {e.posizione}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-blue-50 p-2 rounded">
                          <p className="text-gray-500 text-xs">Consumo/mese</p>
                          <p className="font-bold text-blue-600">{e.consumo_mensile_kw} kWh</p>
                        </div>
                        <div className="bg-green-50 p-2 rounded">
                          <p className="text-gray-500 text-xs">Costo/mese</p>
                          <p className="font-bold text-green-600">€{(e.consumo_mensile_kw * 0.25).toFixed(2)}</p>
                        </div>
                      </div>

                      {e.centro_assistenza && (
                        <div className="text-sm bg-gray-50 p-2 rounded">
                          <p className="text-gray-500 text-xs flex items-center gap-1">
                            <Users className="h-3 w-3" /> Centro Assistenza
                          </p>
                          <p className="font-medium">{e.centro_assistenza.nome_azienda}</p>
                          <p className="text-gray-600 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {e.centro_assistenza.telefono}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setEditingElettro(e);
                            setElettroDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3 w-3 mr-1" /> Modifica
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setQrElettro(e);
                            setQrDialogOpen(true);
                          }}
                          title="Genera QR Code"
                        >
                          <QrCode className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteElettro(e.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredElettrodomestici.length === 0 && (
              <Card className="p-8 text-center">
                <Zap className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Nessun elettrodomestico trovato</p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setEditingElettro(null);
                    setElettroDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Aggiungi il primo
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* Manutenzioni Tab */}
        {activeTab === "manutenzioni" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <Select value={filtroStatoManut} onValueChange={setFiltroStatoManut}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  {STATI_MANUTENZIONE.map((stato) => (
                    <SelectItem key={stato.value} value={stato.value}>
                      {stato.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => {
                  setEditingManut(null);
                  setManutDialogOpen(true);
                }}
                data-testid="add-manut-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuova Manutenzione
              </Button>
            </div>

            {/* Manutenzioni List */}
            <div className="space-y-3">
              {manutenzioni.map((m) => {
                const statoInfo = STATI_MANUTENZIONE.find(s => s.value === m.stato);
                const tipoInfo = TIPI_MANUTENZIONE.find(t => t.value === m.tipo);
                
                return (
                  <Card key={m.id} className="hover:shadow-md transition-shadow" data-testid={`manut-card-${m.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={statoInfo?.color}>
                              {statoInfo?.label}
                            </Badge>
                            <Badge variant="outline">{tipoInfo?.label}</Badge>
                            {m.ricorrente && (
                              <Badge variant="secondary">Ricorrente ({m.frequenza_giorni}gg)</Badge>
                            )}
                          </div>
                          
                          <p className="font-medium">{m.descrizione}</p>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            {m.elettrodomestico && (
                              <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" /> {m.elettrodomestico.nome}
                              </span>
                            )}
                            {m.data_programmata && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {m.data_programmata}
                              </span>
                            )}
                            {m.costo && (
                              <span className="flex items-center gap-1">
                                <Euro className="h-3 w-3" /> {m.costo}€
                              </span>
                            )}
                          </div>

                          {m.centro_assistenza && (
                            <div className="text-sm bg-gray-50 p-2 rounded inline-flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-400" />
                              <span>{m.centro_assistenza.nome_azienda}</span>
                              <span className="text-gray-400">|</span>
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span>{m.centro_assistenza.telefono}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingManut(m);
                              setManutDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteManut(m.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {manutenzioni.length === 0 && (
              <Card className="p-8 text-center">
                <Wrench className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Nessuna manutenzione trovata</p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setEditingManut(null);
                    setManutDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Aggiungi la prima
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* Centri Assistenza Tab */}
        {activeTab === "centri" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setRicercaCentriOpen(true)}
              >
                <Search className="h-4 w-4 mr-2" />
                Cerca sul Web
              </Button>
              <Button
                onClick={() => {
                  setEditingCentro(null);
                  setCentroDialogOpen(true);
                }}
                data-testid="add-centro-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Centro
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {centriAssistenza.map((centro) => (
                <Card key={centro.id} className="hover:shadow-md transition-shadow" data-testid={`centro-card-${centro.id}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      {centro.nome_azienda}
                    </CardTitle>
                    {centro.referente && (
                      <CardDescription>{centro.referente}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <a href={`tel:${centro.telefono}`} className="text-blue-600 hover:underline">
                        {centro.telefono}
                      </a>
                    </p>
                    {centro.email && (
                      <p className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <a href={`mailto:${centro.email}`} className="text-blue-600 hover:underline">
                          {centro.email}
                        </a>
                      </p>
                    )}
                    {centro.indirizzo && (
                      <p className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {centro.indirizzo}
                      </p>
                    )}
                    {centro.specializzazioni.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {centro.specializzazioni.map((spec, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setEditingCentro(centro);
                          setCentroDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Modifica
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteCentro(centro.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {centriAssistenza.length === 0 && (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Nessun centro assistenza trovato</p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setEditingCentro(null);
                    setCentroDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Aggiungi il primo
                </Button>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <CentroAssistenzaDialog
        open={centroDialogOpen}
        onOpenChange={setCentroDialogOpen}
        centro={editingCentro}
        onSave={handleSaveCentro}
      />

      <ElettrodomesticoDialog
        open={elettroDialogOpen}
        onOpenChange={setElettroDialogOpen}
        elettrodomestico={editingElettro}
        centriAssistenza={centriAssistenza}
        smartThingsDevices={smartThingsDevices}
        onSave={handleSaveElettro}
      />

      <ManutenzioneDialog
        open={manutDialogOpen}
        onOpenChange={setManutDialogOpen}
        manutenzione={editingManut}
        elettrodomestici={elettrodomestici}
        centriAssistenza={centriAssistenza}
        onSave={handleSaveManut}
      />

      <QRCodeDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        elettrodomestico={qrElettro}
      />

      <RicercaCentriAssistenza
        open={ricercaCentriOpen}
        onOpenChange={setRicercaCentriOpen}
        onAddCentro={handleAddCentroFromSearch}
      />
    </div>
  );
}

export default App;
