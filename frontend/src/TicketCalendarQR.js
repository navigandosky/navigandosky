import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import {
  Plus, Phone, Calendar, Euro, CheckCircle, Clock, X,
  ChevronLeft, ChevronRight, Loader2, Ticket, QrCode, Printer,
  Star, MessageCircle, ExternalLink, AlertTriangle, Wrench, Edit, Play, Pause, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helper per formattare le date in formato italiano gg.mm.aaaa
export const formatDateIT = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, "dd.MM.yyyy", { locale: it });
  } catch {
    return dateString;
  }
};

// Helper per formattare date con ora
export const formatDateTimeIT = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, "dd.MM.yyyy HH:mm", { locale: it });
  } catch {
    return dateString;
  }
};

// Stati UNIFICATI per Ticket e Manutenzioni
const STATI_UNIFICATI = [
  { value: "aperto", label: "Aperto", labelManutenzione: "Pianificato", color: "bg-blue-500", icon: "📋" },
  { value: "contattato", label: "Contattato", labelManutenzione: "Contattato", color: "bg-yellow-500", icon: "📞" },
  { value: "in_lavorazione", label: "In Lavorazione", labelManutenzione: "In Corso", color: "bg-orange-500", icon: "🔧" },
  { value: "completato", label: "Completato", labelManutenzione: "Completato", color: "bg-green-500", icon: "✅" },
  { value: "annullato", label: "Annullato", labelManutenzione: "Annullato", color: "bg-gray-500", icon: "❌" },
];

// Alias per retrocompatibilità
const STATI_TICKET = STATI_UNIFICATI;

const PRIORITA_TICKET = [
  { value: "bassa", label: "Bassa", color: "bg-gray-400" },
  { value: "media", label: "Media", color: "bg-blue-400" },
  { value: "alta", label: "Alta", color: "bg-orange-500" },
  { value: "urgente", label: "Urgente", color: "bg-red-500" },
];

// ============== DETTAGLIO TICKET (Solo Lettura) ==============
export const DettaglioTicketDialog = ({ open, onOpenChange, ticket, elettrodomestici, centriAssistenza }) => {
  if (!ticket) return null;
  
  const elettro = elettrodomestici?.find(e => e.id === ticket.elettrodomestico_id);
  const centro = centriAssistenza?.find(c => c.id === ticket.centro_assistenza_id);
  const statoInfo = STATI_TICKET.find(s => s.value === ticket.stato);
  const prioritaInfo = PRIORITA_TICKET.find(p => p.value === ticket.priorita);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Dettaglio Ticket #{ticket.numero_ticket}
            <Badge className={`${statoInfo?.color} text-white ml-2`}>
              {statoInfo?.icon} {statoInfo?.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Titolo */}
          <div>
            <Label className="text-gray-500">Titolo</Label>
            <p className="mt-1 p-2 bg-gray-50 rounded font-medium">{ticket.titolo}</p>
          </div>

          {/* Info Elettrodomestico */}
          {elettro && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-1">Elettrodomestico</h4>
              <p className="text-sm">{elettro.nome} - {elettro.marca} {elettro.modello}</p>
            </div>
          )}

          {/* Descrizione */}
          <div>
            <Label className="text-gray-500">Descrizione Problema</Label>
            <p className="mt-1 p-2 bg-gray-50 rounded whitespace-pre-wrap">{ticket.descrizione || "-"}</p>
          </div>

          {/* Priorità e Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-500">Priorità</Label>
              <div className="mt-1">
                <Badge className={`${prioritaInfo?.color} text-white`}>{prioritaInfo?.label}</Badge>
              </div>
            </div>
            <div>
              <Label className="text-gray-500">Costo Intervento</Label>
              <p className="mt-1 p-2 bg-gray-50 rounded">{ticket.costo_intervento ? `€${ticket.costo_intervento}` : "-"}</p>
            </div>
            <div>
              <Label className="text-gray-500">Data Apertura</Label>
              <p className="mt-1 p-2 bg-gray-50 rounded">{formatDateIT(ticket.created_at)}</p>
            </div>
            <div>
              <Label className="text-gray-500">Data Risoluzione</Label>
              <p className="mt-1 p-2 bg-gray-50 rounded">{formatDateIT(ticket.data_risoluzione) || "-"}</p>
            </div>
          </div>

          {/* Centro Assistenza */}
          {centro && (
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-1">Centro Assistenza</h4>
              <p className="text-sm">{centro.nome_azienda}</p>
              {centro.telefono && <p className="text-xs text-gray-600">📞 {centro.telefono}</p>}
              {centro.email && <p className="text-xs text-gray-600">📧 {centro.email}</p>}
            </div>
          )}

          {/* Note Risoluzione */}
          {ticket.note_risoluzione && (
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-1">✅ Note Risoluzione</h4>
              <p className="text-sm whitespace-pre-wrap">{ticket.note_risoluzione}</p>
            </div>
          )}

          {/* Valutazione */}
          {ticket.valutazione && (
            <div>
              <Label className="text-gray-500">Valutazione</Label>
              <div className="flex mt-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`h-5 w-5 ${s <= ticket.valutazione ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
                ))}
              </div>
            </div>
          )}

          {/* Note Interne */}
          {ticket.note_interne && (
            <div>
              <Label className="text-gray-500">Note Interne</Label>
              <p className="mt-1 p-2 bg-gray-50 rounded whitespace-pre-wrap text-sm">{ticket.note_interne}</p>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-xs text-gray-400 pt-2 border-t">
            Creato: {formatDateTimeIT(ticket.created_at)} | 
            Aggiornato: {formatDateTimeIT(ticket.updated_at)}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============== AGGIORNA TICKET DIALOG ==============

export const AggiornaTicketDialog = ({ open, onOpenChange, ticket, onUpdate }) => {
  const [nuovoStato, setNuovoStato] = useState("");
  const [note, setNote] = useState("");
  const [costo, setCosto] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ticket) {
      setNuovoStato(ticket.stato || "aperto");
      setNote("");
      setCosto(ticket.costo_intervento || "");
    }
  }, [ticket]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const costoNum = costo ? parseFloat(costo.toString().replace(',', '.')) : null;
      await onUpdate(ticket.id, nuovoStato, note, costoNum);
      onOpenChange(false);
    } catch (error) {
      toast.error("Errore nell'aggiornamento");
    } finally {
      setLoading(false);
    }
  };

  // Determina quali stati sono disponibili in base allo stato corrente
  const statiDisponibili = () => {
    const statoCorrente = ticket?.stato || "aperto";
    switch (statoCorrente) {
      case "aperto":
        return ["contattato", "in_lavorazione", "annullato"];
      case "contattato":
        return ["in_lavorazione", "completato", "annullato"];
      case "in_lavorazione":
        return ["contattato", "completato", "annullato"];
      case "completato":
        return []; // Non si può cambiare
      case "annullato":
        return ["aperto"]; // Si può riaprire
      default:
        return STATI_TICKET.map(s => s.value);
    }
  };

  const statoCorrente = STATI_TICKET.find(s => s.value === ticket?.stato);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Aggiorna Ticket {ticket?.numero_ticket}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stato Corrente */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Stato corrente</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statoCorrente?.color}>{statoCorrente?.label}</Badge>
              <span className="text-sm text-gray-600">→</span>
            </div>
          </div>

          {/* Nuovo Stato */}
          <div className="space-y-2">
            <Label>Nuovo Stato</Label>
            <Select value={nuovoStato} onValueChange={setNuovoStato}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona nuovo stato" />
              </SelectTrigger>
              <SelectContent>
                {statiDisponibili().map((statoValue) => {
                  const stato = STATI_TICKET.find(s => s.value === statoValue);
                  return (
                    <SelectItem key={statoValue} value={statoValue}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${stato?.color}`}></div>
                        {stato?.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Note Aggiornamento */}
          <div className="space-y-2">
            <Label>Note Aggiornamento</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Descrivi l'aggiornamento o le azioni intraprese..."
              rows={3}
            />
          </div>

          {/* Costo Intervento */}
          <div className="space-y-2">
            <Label>Costo Intervento (€)</Label>
            <Input
              type="text"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              placeholder="Es: 150.00"
            />
            <p className="text-xs text-gray-500">
              Inserisci il costo se noto. Verrà usato per aggiornare la manutenzione collegata.
            </p>
          </div>

          {statiDisponibili().length === 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                Questo ticket è in stato "{statoCorrente?.label}" e non può essere modificato.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button 
              type="submit" 
              disabled={loading || statiDisponibili().length === 0 || nuovoStato === ticket?.stato}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Aggiorna Stato
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ============== TICKET COMPONENTS ==============

export const TicketDialog = ({ open, onOpenChange, ticket, elettrodomestici, centriAssistenza, onSave }) => {
  const [formData, setFormData] = useState({
    elettrodomestico_id: "",
    titolo: "",
    descrizione: "",
    priorita: "media",
    centro_assistenza_id: "",
    contatto_preferito: "email"
  });

  useEffect(() => {
    if (ticket) {
      setFormData({
        elettrodomestico_id: ticket.elettrodomestico_id || "",
        titolo: ticket.titolo || "",
        descrizione: ticket.descrizione || "",
        priorita: ticket.priorita || "media",
        centro_assistenza_id: ticket.centro_assistenza_id || "",
        contatto_preferito: ticket.contatto_preferito || "email"
      });
    } else {
      setFormData({
        elettrodomestico_id: "",
        titolo: "",
        descrizione: "",
        priorita: "media",
        centro_assistenza_id: "",
        contatto_preferito: "email"
      });
    }
  }, [ticket]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  // Auto-select centro assistenza quando si seleziona elettrodomestico
  const handleElettroChange = (id) => {
    const elettro = elettrodomestici.find(e => e.id === id);
    setFormData({
      ...formData,
      elettrodomestico_id: id,
      centro_assistenza_id: elettro?.centro_assistenza_id || formData.centro_assistenza_id
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            {ticket ? "Modifica Ticket" : "Nuovo Ticket Assistenza"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Elettrodomestico *</Label>
            <Select value={formData.elettrodomestico_id} onValueChange={handleElettroChange}>
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
            <Label>Titolo Problema *</Label>
            <Input
              value={formData.titolo}
              onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
              placeholder="Es: Rumore anomalo durante funzionamento"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descrizione *</Label>
            <Textarea
              value={formData.descrizione}
              onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
              placeholder="Descrivi il problema nel dettaglio..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priorità</Label>
              <Select value={formData.priorita} onValueChange={(v) => setFormData({ ...formData, priorita: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITA_TICKET.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${p.color}`} />
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contatto Preferito</Label>
              <Select value={formData.contatto_preferito} onValueChange={(v) => setFormData({ ...formData, contatto_preferito: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">📧 Email</SelectItem>
                  <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                  <SelectItem value="telefono">📞 Telefono</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Centro Assistenza</Label>
            <Select 
              value={formData.centro_assistenza_id || "auto"} 
              onValueChange={(v) => setFormData({ ...formData, centro_assistenza_id: v === "auto" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Automatico dall'elettrodomestico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatico dall'elettrodomestico</SelectItem>
                {centriAssistenza.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome_azienda} - {c.telefono}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit">{ticket ? "Salva" : "Crea Ticket"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const ChiudiTicketDialog = ({ open, onOpenChange, ticket, onChiudi }) => {
  const [costo, setCosto] = useState("");
  const [valutazione, setValutazione] = useState(0);
  const [note, setNote] = useState("");
  const [creaManutenzione, setCreaManutenzione] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleChiudi = async () => {
    setIsLoading(true);
    try {
      await onChiudi(ticket.id, {
        costo: costo ? parseFloat(costo) : null,
        valutazione: valutazione || null,
        note_risoluzione: note || null,
        crea_manutenzione: creaManutenzione
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Chiudi Ticket {ticket?.numero_ticket}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Costo Intervento (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Valutazione Servizio</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setValutazione(star)}
                  className={`p-1 ${star <= valutazione ? "text-yellow-500" : "text-gray-300"}`}
                >
                  <Star className="h-6 w-6 fill-current" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Note Risoluzione</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Descrivi come è stato risolto il problema..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="creaManutenzione"
              checked={creaManutenzione}
              onChange={(e) => setCreaManutenzione(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="creaManutenzione" className="cursor-pointer">
              Registra nell'archivio manutenzioni
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleChiudi} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Chiudi Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const TicketList = ({ elettrodomestici, centriAssistenza }) => {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [chiudiDialogOpen, setChiudiDialogOpen] = useState(false);
  const [aggiornaDialogOpen, setAggiornaDialogOpen] = useState(false);
  const [dettaglioDialogOpen, setDettaglioDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filtroStato, setFiltroStato] = useState("");

  const loadTickets = async () => {
    try {
      const params = filtroStato && filtroStato !== "all" ? { stato: filtroStato } : {};
      const res = await axios.get(`${API}/tickets`, { params });
      setTickets(res.data);
    } catch (error) {
      console.error("Error loading tickets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [filtroStato]);

  const handleCreateTicket = async (data) => {
    try {
      await axios.post(`${API}/tickets`, data);
      toast.success("Ticket creato con successo");
      setTicketDialogOpen(false);
      loadTickets();
    } catch (error) {
      toast.error("Errore nella creazione del ticket");
    }
  };

  const handleContatta = async (ticketId, metodo) => {
    try {
      const res = await axios.post(`${API}/tickets/${ticketId}/contatta?metodo=${metodo}`);
      
      if (metodo === "whatsapp" && res.data.whatsapp_link) {
        window.open(res.data.whatsapp_link, "_blank");
        toast.success("Aperto WhatsApp");
      } else if (metodo === "email") {
        if (res.data.email_sent) {
          toast.success("Email inviata con successo");
        } else {
          // Mostra il messaggio da copiare
          navigator.clipboard.writeText(res.data.messaggio);
          toast.info("Messaggio copiato negli appunti. SMTP non configurato.");
        }
      }
      loadTickets();
    } catch (error) {
      toast.error("Errore nel contatto");
    }
  };

  const handleChiudiTicket = async (ticketId, data) => {
    try {
      const params = new URLSearchParams();
      if (data.costo) params.append("costo", data.costo);
      if (data.valutazione) params.append("valutazione", data.valutazione);
      if (data.note_risoluzione) params.append("note_risoluzione", data.note_risoluzione);
      params.append("crea_manutenzione", data.crea_manutenzione);
      
      await axios.post(`${API}/tickets/${ticketId}/chiudi?${params.toString()}`);
      toast.success("Ticket chiuso con successo");
      loadTickets();
    } catch (error) {
      toast.error("Errore nella chiusura del ticket");
    }
  };

  const handleAggiornaTicket = async (ticketId, nuovoStato, note, costo) => {
    try {
      const updateData = { stato: nuovoStato };
      if (note) {
        updateData.note_interne = note;
      }
      if (costo !== null && costo !== undefined) {
        updateData.costo_intervento = costo;
      }
      await axios.put(`${API}/tickets/${ticketId}`, updateData);
      toast.success("Ticket aggiornato con successo");
      loadTickets();
    } catch (error) {
      toast.error("Errore nell'aggiornamento del ticket");
      throw error;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Select value={filtroStato} onValueChange={setFiltroStato}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tutti gli stati" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            {STATI_TICKET.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => { setSelectedTicket(null); setTicketDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nuovo Ticket
        </Button>
      </div>

      <div className="space-y-3">
        {tickets.map((t) => {
          const statoInfo = STATI_TICKET.find(s => s.value === t.stato);
          const prioritaInfo = PRIORITA_TICKET.find(p => p.value === t.priorita);
          
          return (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={statoInfo?.color}>{statoInfo?.label}</Badge>
                      <Badge variant="outline" className={prioritaInfo?.color?.replace('bg-', 'border-')}>
                        {prioritaInfo?.label}
                      </Badge>
                      <span className="text-sm text-gray-500">#{t.numero_ticket}</span>
                    </div>
                    <h4 className="font-medium">{t.titolo}</h4>
                    <p className="text-sm text-gray-600 mt-1">{t.descrizione?.substring(0, 100)}...</p>
                    
                    {t.elettrodomestico && (
                      <p className="text-sm text-gray-500 mt-2">
                        📦 {t.elettrodomestico.nome} - {t.elettrodomestico.marca}
                      </p>
                    )}
                    {t.centro_assistenza && (
                      <p className="text-sm text-gray-500">
                        🔧 {t.centro_assistenza.nome_azienda} - {t.centro_assistenza.telefono}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {t.stato !== "completato" && t.stato !== "annullato" && (
                      <>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleContatta(t.id, "whatsapp")}
                            title="WhatsApp"
                          >
                            💬
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleContatta(t.id, "email")}
                            title="Email"
                          >
                            📧
                          </Button>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => { setSelectedTicket(t); setAggiornaDialogOpen(true); }}
                          title="Aggiorna stato"
                        >
                          <Edit className="h-3 w-3 mr-1" /> Aggiorna
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => { setSelectedTicket(t); setChiudiDialogOpen(true); }}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Chiudi
                        </Button>
                      </>
                    )}
                    {(t.stato === "completato" || t.stato === "annullato") && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => { setSelectedTicket(t); setDettaglioDialogOpen(true); }}
                          title="Visualizza dettaglio"
                        >
                          <Eye className="h-3 w-3 mr-1" /> Visualizza
                        </Button>
                        {t.valutazione && (
                          <div className="flex">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`h-4 w-4 ${s <= t.valutazione ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tickets.length === 0 && (
        <Card className="p-8 text-center">
          <Ticket className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Nessun ticket trovato</p>
          <Button className="mt-4" onClick={() => setTicketDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Crea il primo ticket
          </Button>
        </Card>
      )}

      <TicketDialog
        open={ticketDialogOpen}
        onOpenChange={setTicketDialogOpen}
        ticket={selectedTicket}
        elettrodomestici={elettrodomestici}
        centriAssistenza={centriAssistenza}
        onSave={handleCreateTicket}
      />

      <ChiudiTicketDialog
        open={chiudiDialogOpen}
        onOpenChange={setChiudiDialogOpen}
        ticket={selectedTicket}
        onChiudi={handleChiudiTicket}
      />

      <AggiornaTicketDialog
        open={aggiornaDialogOpen}
        onOpenChange={setAggiornaDialogOpen}
        ticket={selectedTicket}
        onUpdate={handleAggiornaTicket}
      />

      <DettaglioTicketDialog
        open={dettaglioDialogOpen}
        onOpenChange={setDettaglioDialogOpen}
        ticket={selectedTicket}
        elettrodomestici={elettrodomestici}
        centriAssistenza={centriAssistenza}
      />
    </div>
  );
};

// ============== CALENDAR COMPONENT ==============

export const CalendarioManutenzioni = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventi, setEventi] = useState([]);
  const [prossimi, setProssimi] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const loadEventi = async () => {
    try {
      const start = format(startOfMonth(currentDate), "yyyy-MM-dd");
      const end = format(endOfMonth(currentDate), "yyyy-MM-dd");
      const res = await axios.get(`${API}/calendario/eventi`, { params: { start, end } });
      setEventi(res.data);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const loadProssimi = async () => {
    try {
      const res = await axios.get(`${API}/calendario/prossimi`, { params: { giorni: 14 } });
      setProssimi(res.data);
    } catch (error) {
      console.error("Error loading upcoming:", error);
    }
  };

  useEffect(() => {
    loadEventi();
    loadProssimi();
  }, [currentDate]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const getEventsForDay = (day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return eventi.filter(e => e.start?.startsWith(dayStr));
  };

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendario */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(currentDate, "MMMM yyyy", { locale: it })}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
            
            {/* Padding per inizio mese */}
            {Array.from({ length: (days[0].getDay() + 6) % 7 }).map((_, i) => (
              <div key={`pad-${i}`} className="h-24" />
            ))}
            
            {days.map(day => {
              const dayEvents = getEventsForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`h-24 border rounded p-1 overflow-hidden ${
                    isToday(day) ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50"
                  }`}
                >
                  <div className={`text-sm font-medium ${isToday(day) ? "text-blue-600" : ""}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1 mt-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        className="text-xs p-1 rounded truncate cursor-pointer"
                        style={{ backgroundColor: event.color + "20", color: event.color }}
                        onClick={() => setSelectedEvent(event)}
                        title={event.title}
                      >
                        {event.title.substring(0, 15)}...
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500">+{dayEvents.length - 2} altri</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Prossimi Eventi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Prossimi 14 giorni
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {prossimi.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Nessun evento in programma</p>
          ) : (
            prossimi.map((e, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50">
                <div className={`p-2 rounded ${
                  e.tipo === "manutenzione" ? "bg-blue-100 text-blue-600" :
                  e.tipo === "garanzia" ? "bg-orange-100 text-orange-600" : "bg-gray-100"
                }`}>
                  {e.tipo === "manutenzione" ? <Wrench className="h-4 w-4" /> :
                   e.tipo === "garanzia" ? <AlertTriangle className="h-4 w-4" /> :
                   <Ticket className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{e.titolo}</p>
                  <p className="text-xs text-gray-500">{format(parseISO(e.data), "d MMMM", { locale: it })}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p><strong>Data:</strong> {selectedEvent.start}</p>
              <p><strong>Tipo:</strong> {selectedEvent.tipo}</p>
              {selectedEvent.extendedProps?.descrizione && (
                <p><strong>Descrizione:</strong> {selectedEvent.extendedProps.descrizione}</p>
              )}
              {selectedEvent.extendedProps?.stato && (
                <p><strong>Stato:</strong> {selectedEvent.extendedProps.stato}</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// ============== QR CODE COMPONENT ==============

export const QRCodeCard = ({ elettrodomestico, onClose }) => {
  const [qrData, setQrData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadQR = async () => {
      try {
        const res = await axios.get(`${API}/elettrodomestici/${elettrodomestico.id}/qrcode-card`);
        setQrData(res.data);
      } catch (error) {
        console.error("Error loading QR:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadQR();
  }, [elettrodomestico]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
      <head>
        <title>QR Code - ${qrData?.elettrodomestico?.nome}</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
          .card { border: 2px solid #000; border-radius: 10px; padding: 20px; max-width: 300px; margin: 0 auto; }
          img { width: 200px; height: 200px; }
          h2 { margin: 10px 0 5px; }
          p { margin: 5px 0; color: #666; }
          .assistenza { margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ccc; }
        </style>
      </head>
      <body>
        <div class="card">
          <img src="${BACKEND_URL}${qrData?.qr_url}" alt="QR Code" />
          <h2>${qrData?.elettrodomestico?.nome}</h2>
          <p>${qrData?.elettrodomestico?.marca} ${qrData?.elettrodomestico?.modello}</p>
          <p>S/N: ${qrData?.elettrodomestico?.numero_serie || "N/A"}</p>
          <p>📍 ${qrData?.elettrodomestico?.posizione || "N/A"}</p>
          ${qrData?.centro_assistenza ? `
          <div class="assistenza">
            <p><strong>Assistenza:</strong></p>
            <p>${qrData.centro_assistenza.nome}</p>
            <p>📞 ${qrData.centro_assistenza.telefono}</p>
          </div>
          ` : ""}
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="max-w-sm mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <img
          src={`${BACKEND_URL}${qrData?.qr_url}`}
          alt="QR Code"
          className="w-48 h-48 mx-auto border rounded"
        />
        <div>
          <h3 className="font-bold text-lg">{qrData?.elettrodomestico?.nome}</h3>
          <p className="text-gray-600">{qrData?.elettrodomestico?.marca} {qrData?.elettrodomestico?.modello}</p>
          {qrData?.elettrodomestico?.numero_serie && (
            <p className="text-sm text-gray-500">S/N: {qrData.elettrodomestico.numero_serie}</p>
          )}
        </div>
        
        {qrData?.centro_assistenza && (
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm font-medium">{qrData.centro_assistenza.nome}</p>
            <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
              <Phone className="h-3 w-3" /> {qrData.centro_assistenza.telefono}
            </p>
          </div>
        )}

        <div className="flex gap-2 justify-center">
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Stampa
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>Chiudi</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const QRCodeDialog = ({ open, onOpenChange, elettrodomestico }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        {elettrodomestico && (
          <QRCodeCard elettrodomestico={elettrodomestico} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
};
