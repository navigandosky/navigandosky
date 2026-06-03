import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Users, UserPlus, FileText, Wallet, Plus, Trash2, Pencil, Search,
  Mail, Download, Eye, Paperclip, X, Filter, ChevronDown, ChevronUp,
  Calendar as CalIcon, MapPin, Briefcase, GraduationCap, Phone, Building2,
  Receipt, BadgeCheck, AlertCircle, Save, Send
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATI = [
  { value: "libero", label: "Libero", color: "bg-blue-100 text-blue-800" },
  { value: "disoccupato", label: "Disoccupato", color: "bg-orange-100 text-orange-800" },
  { value: "inoccupato", label: "Inoccupato", color: "bg-amber-100 text-amber-800" },
  { value: "assunto", label: "Assunto", color: "bg-emerald-100 text-emerald-800" },
  { value: "altro", label: "Altro", color: "bg-slate-100 text-slate-800" },
];

const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

// Helper: read file to base64 data URL
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

// Helper: download PDF from authenticated endpoint
const downloadPdf = async (url, filename) => {
  try {
    const res = await axios.get(url, { responseType: "blob" });
    const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "documento.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch (e) {
    toast.error("Errore download PDF");
  }
};

const StatoBadge = ({ stato }) => {
  const s = STATI.find(x => x.value === stato) || STATI[0];
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>;
};


// ====================== DIALOG: Aggiungi/Modifica Dipendente ======================
const DipendenteDialog = ({ open, onOpenChange, dipendente, sedi, onSave, onAddSede, authToken }) => {
  const [form, setForm] = useState({});
  const [newSede, setNewSede] = useState("");
  const [docFile, setDocFile] = useState(null);
  const [docDescr, setDocDescr] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm(dipendente || {
        nome: "", cognome: "", codice_fiscale: "", data_nascita: "",
        luogo_nascita: "", indirizzo: "", citta: "", cap: "",
        email: "", telefono: "", titolo_studio: "", ruolo: "",
        mansione: "", sede: "", stato: "libero", note: "", documenti: []
      });
      setDocFile(null); setDocDescr(""); setNewSede("");
    }
  }, [open, dipendente]);

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleAddSedeInline = async () => {
    const nome = newSede.trim();
    if (!nome) return;
    try {
      await onAddSede(nome);
      setField("sede", nome);
      setNewSede("");
      toast.success("Sede aggiunta");
    } catch { toast.error("Errore aggiunta sede"); }
  };

  const handleUploadDoc = async () => {
    if (!docFile || !form.id) return;
    try {
      const base64 = await fileToBase64(docFile);
      const res = await axios.post(
        `${API}/dipendenti/${form.id}/documenti?token=${authToken}`,
        { nome_file: docFile.name, descrizione: docDescr, content_base64: base64 }
      );
      setForm(prev => ({ ...prev, documenti: [...(prev.documenti || []), res.data] }));
      setDocFile(null); setDocDescr("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Documento caricato");
    } catch { toast.error("Errore upload documento"); }
  };

  const handleDeleteDoc = async (docId) => {
    if (!form.id) return;
    try {
      await axios.delete(`${API}/dipendenti/${form.id}/documenti/${docId}?token=${authToken}`);
      setForm(prev => ({ ...prev, documenti: (prev.documenti || []).filter(d => d.id !== docId) }));
    } catch { toast.error("Errore"); }
  };

  const handleSave = async () => {
    if (!form.nome?.trim() || !form.cognome?.trim()) {
      toast.error("Nome e cognome sono obbligatori");
      return;
    }
    await onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dipendente-dialog">
        <DialogHeader>
          <DialogTitle>{form.id ? "Modifica Dipendente" : "Nuovo Dipendente"}</DialogTitle>
          <DialogDescription>Compila l'anagrafica e i dati professionali del dipendente</DialogDescription>
        </DialogHeader>

        {/* Anagrafica */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Users className="h-4 w-4" /> Anagrafica</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Nome *</Label><Input value={form.nome || ""} onChange={e => setField("nome", e.target.value)} data-testid="input-nome" /></div>
          <div><Label>Cognome *</Label><Input value={form.cognome || ""} onChange={e => setField("cognome", e.target.value)} data-testid="input-cognome" /></div>
          <div><Label>Codice Fiscale</Label><Input value={form.codice_fiscale || ""} onChange={e => setField("codice_fiscale", e.target.value.toUpperCase())} /></div>
          <div><Label>Data di nascita</Label><Input type="date" value={form.data_nascita || ""} onChange={e => setField("data_nascita", e.target.value)} /></div>
          <div><Label>Luogo di nascita</Label><Input value={form.luogo_nascita || ""} onChange={e => setField("luogo_nascita", e.target.value)} /></div>
          <div><Label>Indirizzo</Label><Input value={form.indirizzo || ""} onChange={e => setField("indirizzo", e.target.value)} /></div>
          <div><Label>Città</Label><Input value={form.citta || ""} onChange={e => setField("citta", e.target.value)} /></div>
          <div><Label>CAP</Label><Input value={form.cap || ""} onChange={e => setField("cap", e.target.value)} /></div>
        </div>

        <Separator />

        {/* Contatti */}
        <div><h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Phone className="h-4 w-4" /> Contatti</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Email</Label><Input type="email" value={form.email || ""} onChange={e => setField("email", e.target.value)} /></div>
          <div><Label>Telefono</Label><Input value={form.telefono || ""} onChange={e => setField("telefono", e.target.value)} /></div>
        </div>

        <Separator />

        {/* Professionale */}
        <div><h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Briefcase className="h-4 w-4" /> Profilo Professionale</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Titolo di studio</Label><Input value={form.titolo_studio || ""} onChange={e => setField("titolo_studio", e.target.value)} /></div>
          <div><Label>Ruolo</Label><Input value={form.ruolo || ""} onChange={e => setField("ruolo", e.target.value)} /></div>
          <div><Label>Mansione</Label><Input value={form.mansione || ""} onChange={e => setField("mansione", e.target.value)} data-testid="input-mansione" /></div>
          <div>
            <Label>Sede di assegnazione</Label>
            <div className="flex gap-2">
              <Select value={form.sede || ""} onValueChange={(v) => setField("sede", v)}>
                <SelectTrigger className="flex-1" data-testid="select-sede"><SelectValue placeholder="Seleziona sede..." /></SelectTrigger>
                <SelectContent>
                  {(sedi || []).map(s => <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 mt-2">
              <Input placeholder="+ Aggiungi nuova sede" value={newSede} onChange={e => setNewSede(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddSedeInline()} />
              <Button type="button" size="sm" variant="outline" onClick={handleAddSedeInline}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
          <div>
            <Label>Stato</Label>
            <Select value={form.stato || "libero"} onValueChange={(v) => setField("stato", v)}>
              <SelectTrigger data-testid="select-stato"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATI.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Note */}
        <div>
          <Label>Note</Label>
          <Textarea rows={3} value={form.note || ""} onChange={e => setField("note", e.target.value)} placeholder="Annotazioni interne..." />
        </div>

        <Separator />

        {/* Documenti */}
        <div><h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Paperclip className="h-4 w-4" /> Documenti allegati</h3></div>
        {!form.id ? (
          <p className="text-xs text-gray-500">Salva prima il dipendente per allegare documenti.</p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-1">
                <Label>Seleziona file</Label>
                <Input ref={fileInputRef} type="file" onChange={e => setDocFile(e.target.files?.[0] || null)} />
              </div>
              <div className="flex-1">
                <Label>Descrizione</Label>
                <Input value={docDescr} onChange={e => setDocDescr(e.target.value)} placeholder="Es. Carta identità, CV..." />
              </div>
              <Button type="button" onClick={handleUploadDoc} disabled={!docFile} data-testid="btn-upload-doc"><Plus className="h-4 w-4 mr-1" /> Carica</Button>
            </div>
            {(form.documenti || []).length > 0 && (
              <div className="border rounded-lg overflow-hidden mt-3">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2">File</th>
                      <th className="text-left px-3 py-2">Descrizione</th>
                      <th className="text-right px-3 py-2">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.documenti.map(d => (
                      <tr key={d.id} className="border-t">
                        <td className="px-3 py-2">{d.nome_file}</td>
                        <td className="px-3 py-2 text-gray-600">{d.descrizione}</td>
                        <td className="px-3 py-2 text-right">
                          <a href={d.content_base64} download={d.nome_file} className="inline-flex items-center gap-1 text-blue-600 hover:underline mr-3">
                            <Download className="h-3.5 w-3.5" /> Scarica
                          </a>
                          <button onClick={() => handleDeleteDoc(d.id)} className="text-red-600 hover:underline inline-flex items-center gap-1">
                            <Trash2 className="h-3.5 w-3.5" /> Elimina
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSave} data-testid="btn-save-dipendente"><Save className="h-4 w-4 mr-1" /> Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// ====================== DIALOG: Invio Email PDF ======================
const SendEmailDialog = ({ open, onOpenChange, pdfKind, pdfId, filters, defaultSubject, authToken }) => {
  const [recipients, setRecipients] = useState([""]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setRecipients([""]);
      setSubject(defaultSubject || "Documento dipendenti");
      setBody("<p>In allegato il documento richiesto.</p>");
    }
  }, [open, defaultSubject]);

  const setRecipient = (i, v) => setRecipients(prev => prev.map((r, idx) => idx === i ? v : r));
  const addRecipient = () => setRecipients(prev => [...prev, ""]);
  const removeRecipient = (i) => setRecipients(prev => prev.filter((_, idx) => idx !== i));

  const handleSend = async () => {
    const cleanRecipients = recipients.map(r => r.trim()).filter(r => r && /\S+@\S+\.\S+/.test(r));
    if (cleanRecipients.length === 0) {
      toast.error("Inserisci almeno una email valida");
      return;
    }
    setSending(true);
    try {
      await axios.post(`${API}/dipendenti/email/send?token=${authToken}`, {
        recipients: cleanRecipients,
        subject,
        body_html: body,
        pdf_kind: pdfKind,
        pdf_id: pdfId,
        filters: filters || null,
      });
      toast.success(`Email inviata a ${cleanRecipients.length} destinatario/i`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Errore invio email");
    } finally { setSending(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="email-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Invia PDF via Email</DialogTitle>
          <DialogDescription>Invia il documento PDF a uno o più destinatari</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Destinatari</Label>
            {recipients.map((r, i) => (
              <div key={i} className="flex gap-2 mt-1">
                <Input type="email" placeholder="email@example.com" value={r} onChange={e => setRecipient(i, e.target.value)} data-testid={`input-email-${i}`} />
                {recipients.length > 1 && (
                  <Button size="sm" variant="ghost" onClick={() => removeRecipient(i)}><X className="h-4 w-4" /></Button>
                )}
              </div>
            ))}
            <Button size="sm" variant="outline" className="mt-2" onClick={addRecipient}><Plus className="h-4 w-4 mr-1" /> Aggiungi destinatario</Button>
          </div>
          <div>
            <Label>Oggetto</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Messaggio (HTML)</Label>
            <Textarea rows={4} value={body} onChange={e => setBody(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Annulla</Button>
          <Button onClick={handleSend} disabled={sending} data-testid="btn-send-email">
            {sending ? "Invio..." : <><Send className="h-4 w-4 mr-1" /> Invia</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// ====================== DIALOG: Assunzione ======================
const AssunzioneDialog = ({ open, onOpenChange, assunzione, dipendenti, sedi, tipiContratto, onSave, onAddTipoContratto, authToken }) => {
  const [form, setForm] = useState({});
  const [newTipo, setNewTipo] = useState("");
  const [contrattoFile, setContrattoFile] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(assunzione || {
        dipendente_id: "", tipo_contratto: "", data_inizio: "", data_termine: "",
        ore_settimanali: 0, tariffa_oraria: 0, netto_mensile: 0,
        bonus: [], sede_lavoro: "", orario: "", giorni_lavorativi: "",
        note: "", stato: "attivo", contratto_allegato: null
      });
      setContrattoFile(null); setNewTipo("");
    }
  }, [open, assunzione]);

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const addBonus = () => setForm(prev => ({ ...prev, bonus: [...(prev.bonus || []), { tipo: "", importo: 0 }] }));
  const removeBonus = (i) => setForm(prev => ({ ...prev, bonus: (prev.bonus || []).filter((_, idx) => idx !== i) }));
  const setBonusField = (i, k, v) => setForm(prev => ({
    ...prev,
    bonus: (prev.bonus || []).map((b, idx) => idx === i ? { ...b, [k]: v } : b)
  }));

  const handleAddTipo = async () => {
    const nome = newTipo.trim();
    if (!nome) return;
    try {
      await onAddTipoContratto(nome);
      setField("tipo_contratto", nome);
      setNewTipo("");
    } catch { toast.error("Errore"); }
  };

  const handleFileChange = async (file) => {
    setContrattoFile(file);
    if (file) {
      const base64 = await fileToBase64(file);
      setField("contratto_allegato", { id: `c-${Date.now()}`, nome_file: file.name, descrizione: "Contratto", content_base64: base64 });
    }
  };

  const handleSave = async () => {
    if (!form.dipendente_id) {
      toast.error("Seleziona un dipendente");
      return;
    }
    await onSave({
      ...form,
      ore_settimanali: parseFloat(form.ore_settimanali) || 0,
      tariffa_oraria: parseFloat(form.tariffa_oraria) || 0,
      netto_mensile: parseFloat(form.netto_mensile) || 0,
      bonus: (form.bonus || []).map(b => ({ tipo: b.tipo || "", importo: parseFloat(b.importo) || 0 })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="assunzione-dialog">
        <DialogHeader>
          <DialogTitle>{form.id ? "Modifica Assunzione" : "Nuova Assunzione"}</DialogTitle>
          <DialogDescription>Inserisci i dati contrattuali del rapporto di lavoro</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Dipendente *</Label>
            <Select value={form.dipendente_id || ""} onValueChange={(v) => setField("dipendente_id", v)} disabled={!!form.id}>
              <SelectTrigger data-testid="select-dipendente"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>
                {(dipendenti || []).map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.cognome} {d.nome} {d.mansione ? `(${d.mansione})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo contratto</Label>
            <Select value={form.tipo_contratto || ""} onValueChange={(v) => setField("tipo_contratto", v)}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>
                {(tipiContratto || []).map(t => <SelectItem key={t.id} value={t.nome}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2 mt-2">
              <Input placeholder="+ Aggiungi tipo contratto" value={newTipo} onChange={e => setNewTipo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddTipo()} />
              <Button type="button" size="sm" variant="outline" onClick={handleAddTipo}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>

          <div><Label>Data inizio</Label><Input type="date" value={form.data_inizio || ""} onChange={e => setField("data_inizio", e.target.value)} /></div>
          <div><Label>Data termine</Label><Input type="date" value={form.data_termine || ""} onChange={e => setField("data_termine", e.target.value)} placeholder="Lascia vuoto se indeterminato" /></div>
          <div><Label>Ore settimanali</Label><Input type="number" step="0.5" value={form.ore_settimanali || 0} onChange={e => setField("ore_settimanali", e.target.value)} /></div>
          <div><Label>Tariffa oraria (€)</Label><Input type="number" step="0.01" value={form.tariffa_oraria || 0} onChange={e => setField("tariffa_oraria", e.target.value)} /></div>
          <div><Label>Netto mensile (€)</Label><Input type="number" step="0.01" value={form.netto_mensile || 0} onChange={e => setField("netto_mensile", e.target.value)} /></div>
          <div>
            <Label>Sede di lavoro</Label>
            <Select value={form.sede_lavoro || ""} onValueChange={(v) => setField("sede_lavoro", v)}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>
                {(sedi || []).map(s => <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Orario</Label><Input value={form.orario || ""} onChange={e => setField("orario", e.target.value)} placeholder="9:00-18:00" /></div>
          <div><Label>Giorni lavorativi</Label><Input value={form.giorni_lavorativi || ""} onChange={e => setField("giorni_lavorativi", e.target.value)} placeholder="Lun-Ven" /></div>
        </div>

        <Separator />

        {/* Bonus extra */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Bonus extra</h3>
            <Button type="button" size="sm" variant="outline" onClick={addBonus}><Plus className="h-4 w-4 mr-1" /> Aggiungi bonus</Button>
          </div>
          {(form.bonus || []).map((b, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1"><Label className="text-xs">Tipo</Label><Input value={b.tipo} onChange={e => setBonusField(i, "tipo", e.target.value)} placeholder="Es. Produttività" /></div>
              <div className="w-40"><Label className="text-xs">Importo (€)</Label><Input type="number" step="0.01" value={b.importo} onChange={e => setBonusField(i, "importo", e.target.value)} /></div>
              <Button size="sm" variant="ghost" onClick={() => removeBonus(i)}><X className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>

        <Separator />

        {/* Contratto allegato */}
        <div>
          <Label>Allegato contratto</Label>
          <Input type="file" onChange={e => handleFileChange(e.target.files?.[0])} />
          {form.contratto_allegato && (
            <div className="mt-2 flex items-center gap-2 p-2 bg-gray-50 rounded">
              <Paperclip className="h-4 w-4 text-gray-600" />
              <span className="text-sm flex-1">{form.contratto_allegato.nome_file}</span>
              <a href={form.contratto_allegato.content_base64} download={form.contratto_allegato.nome_file} className="text-blue-600 text-sm">Scarica</a>
              <Button size="sm" variant="ghost" onClick={() => setField("contratto_allegato", null)}><X className="h-4 w-4" /></Button>
            </div>
          )}
        </div>

        <div>
          <Label>Note</Label>
          <Textarea rows={2} value={form.note || ""} onChange={e => setField("note", e.target.value)} />
        </div>

        <div>
          <Label>Stato</Label>
          <Select value={form.stato || "attivo"} onValueChange={(v) => setField("stato", v)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="attivo">Attivo</SelectItem>
              <SelectItem value="cessato">Cessato</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSave} data-testid="btn-save-assunzione"><Save className="h-4 w-4 mr-1" /> Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// ====================== DIALOG: Busta Paga ======================
const BustaPagaDialog = ({ open, onOpenChange, busta, dipendenti, assunzioni, onSave }) => {
  const [form, setForm] = useState({});
  const now = new Date();

  useEffect(() => {
    if (open) {
      setForm(busta || {
        dipendente_id: "", assunzione_id: "",
        anno: now.getFullYear(), mese: now.getMonth() + 1,
        data_emissione: now.toISOString().split("T")[0],
        importo_netto: 0, pagamenti: [], note: "", busta_pdf: null
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busta]);

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleFileChange = async (file) => {
    if (file) {
      const base64 = await fileToBase64(file);
      setField("busta_pdf", { id: `b-${Date.now()}`, nome_file: file.name, descrizione: "Busta paga", content_base64: base64 });
    }
  };

  const handleSave = async () => {
    if (!form.dipendente_id) {
      toast.error("Seleziona un dipendente");
      return;
    }
    await onSave({
      ...form,
      anno: parseInt(form.anno) || now.getFullYear(),
      mese: parseInt(form.mese) || now.getMonth() + 1,
      importo_netto: parseFloat(form.importo_netto) || 0,
    });
  };

  const assunzioniDipendente = (assunzioni || []).filter(a => a.dipendente_id === form.dipendente_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="busta-dialog">
        <DialogHeader>
          <DialogTitle>{form.id ? "Modifica Busta Paga" : "Nuova Busta Paga"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Dipendente *</Label>
            <Select value={form.dipendente_id || ""} onValueChange={(v) => setField("dipendente_id", v)} disabled={!!form.id}>
              <SelectTrigger data-testid="select-dipendente-busta"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>
                {(dipendenti || []).map(d => <SelectItem key={d.id} value={d.id}>{d.cognome} {d.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assunzione di riferimento</Label>
            <Select value={form.assunzione_id || ""} onValueChange={(v) => setField("assunzione_id", v)} disabled={!form.dipendente_id}>
              <SelectTrigger><SelectValue placeholder="Opzionale..." /></SelectTrigger>
              <SelectContent>
                {assunzioniDipendente.map(a => <SelectItem key={a.id} value={a.id}>{a.tipo_contratto} (dal {a.data_inizio || "n/a"})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Anno</Label>
            <Input type="number" value={form.anno || ""} onChange={e => setField("anno", e.target.value)} />
          </div>
          <div>
            <Label>Mese</Label>
            <Select value={String(form.mese || "")} onValueChange={(v) => setField("mese", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MESI.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data emissione</Label>
            <Input type="date" value={form.data_emissione || ""} onChange={e => setField("data_emissione", e.target.value)} />
          </div>
          <div>
            <Label>Importo netto (€)</Label>
            <Input type="number" step="0.01" value={form.importo_netto || 0} onChange={e => setField("importo_netto", e.target.value)} data-testid="input-importo-busta" />
          </div>
        </div>

        <div>
          <Label>Allegato PDF busta paga</Label>
          <Input type="file" accept=".pdf,image/*" onChange={e => handleFileChange(e.target.files?.[0])} />
          {form.busta_pdf && (
            <div className="mt-2 flex items-center gap-2 p-2 bg-gray-50 rounded">
              <Paperclip className="h-4 w-4 text-gray-600" />
              <span className="text-sm flex-1">{form.busta_pdf.nome_file}</span>
              <a href={form.busta_pdf.content_base64} download={form.busta_pdf.nome_file} className="text-blue-600 text-sm">Scarica</a>
              <Button size="sm" variant="ghost" onClick={() => setField("busta_pdf", null)}><X className="h-4 w-4" /></Button>
            </div>
          )}
        </div>

        <div>
          <Label>Note</Label>
          <Textarea rows={2} value={form.note || ""} onChange={e => setField("note", e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSave} data-testid="btn-save-busta"><Save className="h-4 w-4 mr-1" /> Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// ====================== DIALOG: Acconto Pagamento ======================
const AccontoDialog = ({ open, onOpenChange, busta, onAdded, authToken }) => {
  const [form, setForm] = useState({ data: "", importo: 0, note: "" });

  useEffect(() => {
    if (open) setForm({ data: new Date().toISOString().split("T")[0], importo: 0, note: "" });
  }, [open]);

  const handleAdd = async () => {
    if (!busta) return;
    try {
      await axios.post(`${API}/dipendenti/buste-paga/${busta.id}/pagamenti?token=${authToken}`, {
        data: form.data, importo: parseFloat(form.importo) || 0, note: form.note
      });
      toast.success("Pagamento registrato");
      onAdded?.();
      onOpenChange(false);
    } catch { toast.error("Errore"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="acconto-dialog">
        <DialogHeader><DialogTitle>Registra Pagamento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} /></div>
          <div><Label>Importo (€)</Label><Input type="number" step="0.01" value={form.importo} onChange={e => setForm(p => ({ ...p, importo: e.target.value }))} data-testid="input-importo-acconto" /></div>
          <div><Label>Note</Label><Input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="Es. Bonifico bancario" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleAdd} data-testid="btn-add-acconto"><Save className="h-4 w-4 mr-1" /> Registra</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// ====================== MAIN COMPONENT ======================
export default function Dipendenti({ authToken }) {
  const [subTab, setSubTab] = useState("archivio");
  const [dipendenti, setDipendenti] = useState([]);
  const [sedi, setSedi] = useState([]);
  const [tipiContratto, setTipiContratto] = useState([]);
  const [assunzioni, setAssunzioni] = useState([]);
  const [buste, setBuste] = useState([]);

  // Filters
  const [filtroSede, setFiltroSede] = useState("");
  const [filtroMansione, setFiltroMansione] = useState("");
  const [filtroStato, setFiltroStato] = useState("");
  const [searchQ, setSearchQ] = useState("");

  // Dialogs
  const [dipDialogOpen, setDipDialogOpen] = useState(false);
  const [editingDip, setEditingDip] = useState(null);
  const [assDialogOpen, setAssDialogOpen] = useState(false);
  const [editingAss, setEditingAss] = useState(null);
  const [bustaDialogOpen, setBustaDialogOpen] = useState(false);
  const [editingBusta, setEditingBusta] = useState(null);
  const [accontoDialogOpen, setAccontoDialogOpen] = useState(false);
  const [accontoBusta, setAccontoBusta] = useState(null);
  const [emailDialog, setEmailDialog] = useState({ open: false, kind: null, id: null, subject: "" });

  // Loaders
  const loadDipendenti = async () => {
    const params = new URLSearchParams({ token: authToken });
    if (filtroSede) params.append("sede", filtroSede);
    if (filtroMansione) params.append("mansione", filtroMansione);
    if (filtroStato) params.append("stato", filtroStato);
    if (searchQ) params.append("q", searchQ);
    const res = await axios.get(`${API}/dipendenti?${params.toString()}`);
    setDipendenti(res.data || []);
  };
  const loadSedi = async () => {
    const res = await axios.get(`${API}/dipendenti/sedi?token=${authToken}`);
    setSedi(res.data || []);
  };
  const loadTipiContratto = async () => {
    const res = await axios.get(`${API}/dipendenti/tipi-contratto?token=${authToken}`);
    setTipiContratto(res.data || []);
  };
  const loadAssunzioni = async () => {
    const res = await axios.get(`${API}/dipendenti/assunzioni/list?token=${authToken}`);
    setAssunzioni(res.data || []);
  };
  const loadBuste = async () => {
    const res = await axios.get(`${API}/dipendenti/buste-paga/list?token=${authToken}`);
    setBuste(res.data || []);
  };

  useEffect(() => {
    if (!authToken) return;
    loadDipendenti(); loadSedi(); loadTipiContratto(); loadAssunzioni(); loadBuste();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;
    const t = setTimeout(() => loadDipendenti(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroSede, filtroMansione, filtroStato, searchQ]);

  // Distinct mansioni
  const mansioniDistinct = useMemo(() => {
    const set = new Set();
    dipendenti.forEach(d => { if (d.mansione) set.add(d.mansione); });
    return Array.from(set).sort();
  }, [dipendenti]);

  // CRUD handlers
  const handleSaveDipendente = async (form) => {
    try {
      if (form.id) {
        await axios.put(`${API}/dipendenti/${form.id}?token=${authToken}`, form);
        toast.success("Dipendente aggiornato");
      } else {
        await axios.post(`${API}/dipendenti?token=${authToken}`, form);
        toast.success("Dipendente creato");
      }
      setDipDialogOpen(false);
      loadDipendenti();
    } catch { toast.error("Errore salvataggio"); }
  };
  const handleDeleteDipendente = async (id) => {
    if (!window.confirm("Eliminare questo dipendente?")) return;
    try {
      await axios.delete(`${API}/dipendenti/${id}?token=${authToken}`);
      toast.success("Eliminato");
      loadDipendenti(); loadAssunzioni(); loadBuste();
    } catch { toast.error("Errore"); }
  };
  const handleAddSede = async (nome) => {
    await axios.post(`${API}/dipendenti/sedi?token=${authToken}`, { nome });
    await loadSedi();
  };
  const handleAddTipoContratto = async (nome) => {
    await axios.post(`${API}/dipendenti/tipi-contratto?token=${authToken}`, { nome });
    await loadTipiContratto();
  };

  const handleSaveAssunzione = async (form) => {
    try {
      if (form.id) {
        await axios.put(`${API}/dipendenti/assunzioni/${form.id}?token=${authToken}`, form);
      } else {
        await axios.post(`${API}/dipendenti/assunzioni?token=${authToken}`, form);
      }
      toast.success("Assunzione salvata");
      setAssDialogOpen(false);
      loadAssunzioni(); loadDipendenti();
    } catch { toast.error("Errore"); }
  };
  const handleDeleteAssunzione = async (id) => {
    if (!window.confirm("Eliminare questa assunzione?")) return;
    try {
      await axios.delete(`${API}/dipendenti/assunzioni/${id}?token=${authToken}`);
      toast.success("Eliminata"); loadAssunzioni();
    } catch { toast.error("Errore"); }
  };

  const handleSaveBusta = async (form) => {
    try {
      if (form.id) {
        await axios.put(`${API}/dipendenti/buste-paga/${form.id}?token=${authToken}`, form);
      } else {
        await axios.post(`${API}/dipendenti/buste-paga?token=${authToken}`, form);
      }
      toast.success("Busta paga salvata");
      setBustaDialogOpen(false);
      loadBuste();
    } catch { toast.error("Errore"); }
  };
  const handleDeleteBusta = async (id) => {
    if (!window.confirm("Eliminare questa busta paga?")) return;
    try {
      await axios.delete(`${API}/dipendenti/buste-paga/${id}?token=${authToken}`);
      toast.success("Eliminata"); loadBuste();
    } catch { toast.error("Errore"); }
  };
  const handleDeletePagamento = async (bustaId, pagId) => {
    try {
      await axios.delete(`${API}/dipendenti/buste-paga/${bustaId}/pagamenti/${pagId}?token=${authToken}`);
      loadBuste();
    } catch { toast.error("Errore"); }
  };

  // PDF helpers
  const exportListaPdf = () => {
    const params = new URLSearchParams({ token: authToken });
    if (filtroSede) params.append("sede", filtroSede);
    if (filtroMansione) params.append("mansione", filtroMansione);
    if (filtroStato) params.append("stato", filtroStato);
    if (searchQ) params.append("q", searchQ);
    downloadPdf(`${API}/dipendenti/pdf/lista?${params.toString()}`, "elenco_dipendenti.pdf");
  };
  const exportSchedaPdf = (d) => downloadPdf(`${API}/dipendenti/pdf/scheda/${d.id}?token=${authToken}`, `scheda_${d.cognome}_${d.nome}.pdf`);
  const exportBustaPdf = (b) => downloadPdf(`${API}/dipendenti/pdf/busta/${b.id}?token=${authToken}`, `busta_${b.anno}_${b.mese}.pdf`);

  const getDipName = (id) => {
    const d = dipendenti.find(x => x.id === id);
    return d ? `${d.cognome} ${d.nome}` : "—";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-rose-700"><Users className="h-6 w-6" /> Dipendenti</h2>
          <p className="text-sm text-gray-500">Gestione anagrafica, assunzioni, stipendi e pagamenti</p>
        </div>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="bg-rose-50">
          <TabsTrigger value="archivio" data-testid="subtab-archivio" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white">
            <Users className="h-4 w-4 mr-1" /> Archivio
          </TabsTrigger>
          <TabsTrigger value="assunzioni" data-testid="subtab-assunzioni" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white">
            <FileText className="h-4 w-4 mr-1" /> Assunzioni
          </TabsTrigger>
          <TabsTrigger value="stipendi" data-testid="subtab-stipendi" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white">
            <Wallet className="h-4 w-4 mr-1" /> Stipendi & Pagamenti
          </TabsTrigger>
        </TabsList>

        {/* ============ ARCHIVIO ============ */}
        <TabsContent value="archivio" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filtri</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={exportListaPdf} variant="outline" data-testid="btn-export-pdf"><Download className="h-4 w-4 mr-1" /> PDF</Button>
                  <Button onClick={() => setEmailDialog({ open: true, kind: "lista", id: null, subject: "Elenco Dipendenti" })} variant="outline" data-testid="btn-email-lista">
                    <Mail className="h-4 w-4 mr-1" /> Email PDF
                  </Button>
                  <Button onClick={() => { setEditingDip(null); setDipDialogOpen(true); }} className="bg-rose-600 hover:bg-rose-700" data-testid="btn-new-dipendente">
                    <UserPlus className="h-4 w-4 mr-1" /> Nuovo Dipendente
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Cerca (nome, cognome, CF, ruolo)</Label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input className="pl-8" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Cerca..." data-testid="input-search" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Sede</Label>
                  <Select value={filtroSede || "all"} onValueChange={(v) => setFiltroSede(v === "all" ? "" : v)}>
                    <SelectTrigger data-testid="filter-sede"><SelectValue placeholder="Tutte" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le sedi</SelectItem>
                      {sedi.map(s => <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Mansione</Label>
                  <Select value={filtroMansione || "all"} onValueChange={(v) => setFiltroMansione(v === "all" ? "" : v)}>
                    <SelectTrigger data-testid="filter-mansione"><SelectValue placeholder="Tutte" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le mansioni</SelectItem>
                      {mansioniDistinct.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Stato</Label>
                  <Select value={filtroStato || "all"} onValueChange={(v) => setFiltroStato(v === "all" ? "" : v)}>
                    <SelectTrigger data-testid="filter-stato"><SelectValue placeholder="Tutti" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti</SelectItem>
                      {STATI.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Elenco Dipendenti ({dipendenti.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {dipendenti.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Nessun dipendente. Clicca "Nuovo Dipendente" per iniziare.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-3 py-2">Cognome Nome</th>
                        <th className="px-3 py-2">Mansione</th>
                        <th className="px-3 py-2">Sede</th>
                        <th className="px-3 py-2">Email / Telefono</th>
                        <th className="px-3 py-2">Doc.</th>
                        <th className="px-3 py-2">Stato</th>
                        <th className="px-3 py-2 text-right">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dipendenti.map(d => (
                        <tr key={d.id} className="border-t hover:bg-gray-50" data-testid={`row-dip-${d.id}`}>
                          <td className="px-3 py-2 font-medium">{d.cognome} {d.nome}</td>
                          <td className="px-3 py-2">{d.mansione || "—"}</td>
                          <td className="px-3 py-2">{d.sede || "—"}</td>
                          <td className="px-3 py-2 text-xs">
                            {d.email && <div className="text-gray-700">{d.email}</div>}
                            {d.telefono && <div className="text-gray-500">{d.telefono}</div>}
                          </td>
                          <td className="px-3 py-2">{(d.documenti || []).length > 0 && <Badge variant="secondary">{(d.documenti || []).length}</Badge>}</td>
                          <td className="px-3 py-2"><StatoBadge stato={d.stato} /></td>
                          <td className="px-3 py-2 text-right space-x-1">
                            <Button size="sm" variant="ghost" onClick={() => exportSchedaPdf(d)} title="PDF scheda"><Download className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setEmailDialog({ open: true, kind: "scheda", id: d.id, subject: `Scheda ${d.cognome} ${d.nome}` })} title="Email"><Mail className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingDip(d); setDipDialogOpen(true); }} title="Modifica" data-testid={`btn-edit-${d.id}`}><Pencil className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteDipendente(d.id)} title="Elimina"><Trash2 className="h-4 w-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ ASSUNZIONI ============ */}
        <TabsContent value="assunzioni" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Assunzioni ({assunzioni.length})</CardTitle>
                <Button onClick={() => { setEditingAss(null); setAssDialogOpen(true); }} className="bg-rose-600 hover:bg-rose-700" data-testid="btn-new-assunzione">
                  <Plus className="h-4 w-4 mr-1" /> Nuova Assunzione
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {assunzioni.length === 0 ? (
                <div className="text-center py-10 text-gray-500"><FileText className="h-12 w-12 mx-auto mb-2 opacity-30" /><p>Nessuna assunzione registrata.</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-3 py-2">Dipendente</th>
                        <th className="px-3 py-2">Tipo Contratto</th>
                        <th className="px-3 py-2">Periodo</th>
                        <th className="px-3 py-2">Ore/sett</th>
                        <th className="px-3 py-2">Tariffa €/h</th>
                        <th className="px-3 py-2">Netto mens.</th>
                        <th className="px-3 py-2">Sede</th>
                        <th className="px-3 py-2">Stato</th>
                        <th className="px-3 py-2 text-right">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assunzioni.map(a => (
                        <tr key={a.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{getDipName(a.dipendente_id)}</td>
                          <td className="px-3 py-2">{a.tipo_contratto || "—"}</td>
                          <td className="px-3 py-2 text-xs">{a.data_inizio || "?"} → {a.data_termine || "indeterminato"}</td>
                          <td className="px-3 py-2">{a.ore_settimanali || 0}</td>
                          <td className="px-3 py-2">€ {(a.tariffa_oraria || 0).toFixed(2)}</td>
                          <td className="px-3 py-2">€ {(a.netto_mensile || 0).toFixed(2)}</td>
                          <td className="px-3 py-2">{a.sede_lavoro || "—"}</td>
                          <td className="px-3 py-2">
                            <Badge className={a.stato === "attivo" ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"}>{a.stato}</Badge>
                          </td>
                          <td className="px-3 py-2 text-right space-x-1">
                            {a.contratto_allegato && (
                              <a href={a.contratto_allegato.content_base64} download={a.contratto_allegato.nome_file} className="inline-flex items-center text-blue-600 text-xs">
                                <Paperclip className="h-4 w-4" />
                              </a>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => { setEditingAss(a); setAssDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteAssunzione(a.id)}><Trash2 className="h-4 w-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ STIPENDI ============ */}
        <TabsContent value="stipendi" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Buste paga & Pagamenti ({buste.length})</CardTitle>
                <Button onClick={() => { setEditingBusta(null); setBustaDialogOpen(true); }} className="bg-rose-600 hover:bg-rose-700" data-testid="btn-new-busta">
                  <Plus className="h-4 w-4 mr-1" /> Nuova Busta Paga
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {buste.length === 0 ? (
                <div className="text-center py-10 text-gray-500"><Wallet className="h-12 w-12 mx-auto mb-2 opacity-30" /><p>Nessuna busta paga registrata.</p></div>
              ) : (
                <div className="space-y-3">
                  {buste.map(b => {
                    const totPag = (b.pagamenti || []).reduce((s, p) => s + (parseFloat(p.importo) || 0), 0);
                    const residuo = (parseFloat(b.importo_netto) || 0) - totPag;
                    const isPaid = residuo < 0.01;
                    return (
                      <Card key={b.id} className={`border-l-4 ${isPaid ? "border-l-emerald-500" : "border-l-amber-500"}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between flex-wrap gap-3">
                            <div>
                              <div className="font-semibold text-lg">{getDipName(b.dipendente_id)}</div>
                              <div className="text-sm text-gray-600">{MESI[(b.mese || 1) - 1]} {b.anno} • emessa il {b.data_emissione || "?"}</div>
                              {b.note && <div className="text-xs text-gray-500 mt-1">{b.note}</div>}
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">Importo busta</div>
                              <div className="text-2xl font-bold">€ {(b.importo_netto || 0).toFixed(2)}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                            <div className="bg-blue-50 rounded p-2"><div className="text-xs text-blue-700">Dovuto</div><div className="font-semibold">€ {(b.importo_netto || 0).toFixed(2)}</div></div>
                            <div className="bg-emerald-50 rounded p-2"><div className="text-xs text-emerald-700">Pagato</div><div className="font-semibold">€ {totPag.toFixed(2)}</div></div>
                            <div className={`rounded p-2 ${isPaid ? "bg-emerald-50" : "bg-amber-50"}`}>
                              <div className={`text-xs ${isPaid ? "text-emerald-700" : "text-amber-700"}`}>Residuo</div>
                              <div className="font-semibold flex items-center gap-1">
                                € {residuo.toFixed(2)}
                                {isPaid && <BadgeCheck className="h-4 w-4 text-emerald-600" />}
                              </div>
                            </div>
                          </div>

                          {(b.pagamenti || []).length > 0 && (
                            <div className="mt-3 border-t pt-2">
                              <div className="text-xs font-medium text-gray-600 mb-1">Pagamenti</div>
                              <div className="space-y-1">
                                {b.pagamenti.map(p => (
                                  <div key={p.id} className="flex items-center text-sm bg-gray-50 rounded px-2 py-1">
                                    <span className="text-gray-600 w-24">{p.data}</span>
                                    <span className="font-medium flex-1">€ {(parseFloat(p.importo) || 0).toFixed(2)}</span>
                                    <span className="text-xs text-gray-500 flex-1">{p.note}</span>
                                    <Button size="sm" variant="ghost" className="text-red-600 h-6 w-6 p-0" onClick={() => handleDeletePagamento(b.id, p.id)}><X className="h-3 w-3" /></Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 mt-3 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => { setAccontoBusta(b); setAccontoDialogOpen(true); }} data-testid={`btn-acconto-${b.id}`}>
                              <Plus className="h-4 w-4 mr-1" /> Registra pagamento
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => exportBustaPdf(b)}><Download className="h-4 w-4 mr-1" /> PDF</Button>
                            <Button size="sm" variant="outline" onClick={() => setEmailDialog({ open: true, kind: "busta", id: b.id, subject: `Busta paga ${MESI[(b.mese || 1) - 1]} ${b.anno} - ${getDipName(b.dipendente_id)}` })}>
                              <Mail className="h-4 w-4 mr-1" /> Email
                            </Button>
                            {b.busta_pdf && (
                              <a href={b.busta_pdf.content_base64} download={b.busta_pdf.nome_file} className="inline-flex items-center gap-1 text-xs text-blue-600 px-2 py-1">
                                <Paperclip className="h-4 w-4" /> Originale
                              </a>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => { setEditingBusta(b); setBustaDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteBusta(b.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DipendenteDialog
        open={dipDialogOpen} onOpenChange={setDipDialogOpen}
        dipendente={editingDip} sedi={sedi}
        onSave={handleSaveDipendente} onAddSede={handleAddSede}
        authToken={authToken}
      />
      <AssunzioneDialog
        open={assDialogOpen} onOpenChange={setAssDialogOpen}
        assunzione={editingAss} dipendenti={dipendenti}
        sedi={sedi} tipiContratto={tipiContratto}
        onSave={handleSaveAssunzione} onAddTipoContratto={handleAddTipoContratto}
        authToken={authToken}
      />
      <BustaPagaDialog
        open={bustaDialogOpen} onOpenChange={setBustaDialogOpen}
        busta={editingBusta} dipendenti={dipendenti} assunzioni={assunzioni}
        onSave={handleSaveBusta}
      />
      <AccontoDialog
        open={accontoDialogOpen} onOpenChange={setAccontoDialogOpen}
        busta={accontoBusta} onAdded={loadBuste} authToken={authToken}
      />
      <SendEmailDialog
        open={emailDialog.open} onOpenChange={(o) => setEmailDialog(prev => ({ ...prev, open: o }))}
        pdfKind={emailDialog.kind} pdfId={emailDialog.id} defaultSubject={emailDialog.subject}
        filters={emailDialog.kind === "lista" ? { sede: filtroSede, mansione: filtroMansione, stato: filtroStato, q: searchQ } : null}
        authToken={authToken}
      />
    </div>
  );
}
