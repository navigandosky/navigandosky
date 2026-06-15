'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Download, Mail, Printer, Trash2, Archive, ArchiveRestore, Plus, Search, Ticket, Calendar as CalIcon } from 'lucide-react';
import { toast } from 'sonner';
import { downloadTransitPassPdf, openTransitPassPdf, transitPassPdfBase64 } from '@/app/lib/transitPassPdf';

/**
 * MarinaTransitPassDialog
 * 
 * Props:
 * - open, onOpenChange
 * - marina: { id, name, slug }
 * - company: { id, name, logo_url, address, city, zip, vat_number, phone, email }
 */
export default function MarinaTransitPassDialog({ open, onOpenChange, marina, company }) {
  const [tab, setTab] = useState('new');
  const [submitting, setSubmitting] = useState(false);
  const [passes, setPasses] = useState([]);
  const [loadingPasses, setLoadingPasses] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [createdPass, setCreatedPass] = useState(null); // pass appena creato, mostra azioni

  // Form state
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    customerMode: 'manual', // 'manual' | 'existing'
    customer: { name: '', surname: '', email: '', phone: '', document: '', source: 'manual', source_id: null },
    boat: { name: '', type: '' },
    license_plate: '',
    valid_from: today,
    valid_to: today,
    notes: '',
  });

  // Lista clienti esistenti (dai marina_bookings, agencies, etc.)
  const [existingCustomers, setExistingCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');

  // Reset on open
  useEffect(() => {
    if (open) {
      setTab('new');
      setCreatedPass(null);
      setForm({
        customerMode: 'manual',
        customer: { name: '', surname: '', email: '', phone: '', document: '', source: 'manual', source_id: null },
        boat: { name: '', type: '' },
        license_plate: '',
        valid_from: today,
        valid_to: today,
        notes: '',
      });
      loadExistingCustomers();
      loadPasses();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadExistingCustomers = async () => {
    try {
      const r = await fetch(`/api/marina-bookings?marina_id=${marina.id}`);
      const list = await r.json();
      // Deduplicazione su email/nome+cognome
      const map = new Map();
      (Array.isArray(list) ? list : []).forEach(b => {
        const c = b.customer || {};
        const key = `${(c.email || '').toLowerCase()}|${(c.name || '').toLowerCase()}-${(c.surname || '').toLowerCase()}`;
        if (!c.name && !c.surname) return;
        if (!map.has(key)) {
          map.set(key, {
            name: c.name || '',
            surname: c.surname || '',
            email: c.email || '',
            phone: c.phone || '',
            document: c.document || c.cf || '',
            boat_name: b.boat?.name || '',
            boat_type: b.boat?.type || '',
            license_plate: b.boat?.license_plate || '',
            source: 'marina_booking',
            source_id: b.id,
            booking_number: b.booking_number,
          });
        }
      });
      setExistingCustomers(Array.from(map.values()));
    } catch (e) {
      console.error('loadExistingCustomers error:', e);
    }
  };

  const loadPasses = async () => {
    setLoadingPasses(true);
    try {
      const r = await fetch(`/api/marina-transit-passes?marina_id=${marina.id}`);
      const data = await r.json();
      setPasses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('loadPasses error:', e);
    } finally {
      setLoadingPasses(false);
    }
  };

  useEffect(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) {
      setFilteredCustomers(existingCustomers.slice(0, 8));
      return;
    }
    setFilteredCustomers(
      existingCustomers.filter(c =>
        `${c.name} ${c.surname} ${c.email} ${c.phone}`.toLowerCase().includes(q)
      ).slice(0, 12)
    );
  }, [customerSearch, existingCustomers]);

  const pickExistingCustomer = (c) => {
    setForm(prev => ({
      ...prev,
      customer: {
        name: c.name,
        surname: c.surname,
        email: c.email,
        phone: c.phone,
        document: c.document,
        source: 'marina_booking',
        source_id: c.source_id,
      },
      boat: { name: c.boat_name || '', type: c.boat_type || '' },
      license_plate: c.license_plate || '',
    }));
    setCustomerSearch('');
    toast.success(`Selezionato: ${c.name} ${c.surname}`);
  };

  const handleCreate = async () => {
    if (!form.customer.name) return toast.error('Inserisci il nome del cliente');
    if (!form.valid_from || !form.valid_to) return toast.error('Inserisci le date di validità');
    if (form.valid_from > form.valid_to) return toast.error('La data inizio deve precedere la data fine');
    setSubmitting(true);
    try {
      const r = await fetch('/api/marina-transit-passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marina_id: marina.id,
          company_id: company.id,
          customer: form.customer,
          boat: form.boat.name ? form.boat : null,
          license_plate: form.license_plate,
          valid_from: form.valid_from,
          valid_to: form.valid_to,
          notes: form.notes,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Errore creazione pass');
      toast.success(`Pass ${data.pass_number} creato!`);
      setCreatedPass(data);
      loadPasses();
    } catch (e) {
      toast.error(`Errore: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (pass) => {
    try {
      await downloadTransitPassPdf({ pass, company });
      toast.success('PDF scaricato');
    } catch (e) {
      toast.error('Errore PDF: ' + e.message);
    }
  };

  const handlePrint = async (pass) => {
    try {
      await openTransitPassPdf({ pass, company });
    } catch (e) {
      toast.error('Errore PDF: ' + e.message);
    }
  };

  const handleEmail = async (pass) => {
    if (!pass.customer?.email) return toast.error('Cliente senza email');
    if (!confirm(`Inviare il Pass ${pass.pass_number} a ${pass.customer.email}?`)) return;
    try {
      toast.info('Generazione PDF in corso...');
      const pdfBase64 = await transitPassPdfBase64({ pass, company });
      const r = await fetch(`/api/marina-transit-passes/${pass.id}?action=send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pass.customer.email, pdf_base64: pdfBase64 }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Errore invio');
      toast.success(`Email inviata a ${pass.customer.email}`);
      loadPasses();
    } catch (e) {
      toast.error(`Errore: ${e.message}`);
    }
  };

  const handleArchive = async (pass, archive = true) => {
    try {
      const r = await fetch(`/api/marina-transit-passes/${pass.id}?action=${archive ? 'archive' : 'unarchive'}`, {
        method: 'POST',
      });
      if (!r.ok) throw new Error('Errore');
      toast.success(archive ? 'Pass archiviato' : 'Pass riattivato');
      loadPasses();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (pass) => {
    if (!confirm(`Eliminare definitivamente il Pass ${pass.pass_number}?`)) return;
    try {
      const r = await fetch(`/api/marina-transit-passes/${pass.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Errore');
      toast.success('Pass eliminato');
      loadPasses();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const displayPasses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return passes
      .filter(p => showArchived ? p.archived : !p.archived)
      .filter(p => {
        if (!q) return true;
        return [
          p.pass_number, p.customer?.name, p.customer?.surname, p.customer?.email,
          p.boat?.name, p.license_plate
        ].some(v => String(v || '').toLowerCase().includes(q));
      });
  }, [passes, searchTerm, showArchived]);

  const isExpired = (p) => new Date(p.valid_to) < new Date(new Date().toDateString());
  const isActive = (p) => {
    const today = new Date().toISOString().split('T')[0];
    return p.valid_from <= today && p.valid_to >= today;
  };

  const fmtDateIt = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-blue-700" />
            Pass di Transito — Marina {marina?.name}
          </DialogTitle>
        </DialogHeader>

        {createdPass ? (
          // ── Vista successo: pass creato, mostra azioni ───────────────
          <div className="space-y-4 py-2">
            <Card className="border-2 border-emerald-300 bg-emerald-50">
              <CardContent className="p-5 text-center">
                <div className="text-5xl mb-2">🎫</div>
                <h3 className="text-xl font-bold text-emerald-900">Pass {createdPass.pass_number} creato!</h3>
                <p className="text-sm text-emerald-800 mt-2">
                  Cliente: <strong>{createdPass.customer.name} {createdPass.customer.surname}</strong>
                </p>
                <p className="text-sm text-emerald-800">
                  Valido dal <strong>{fmtDateIt(createdPass.valid_from)}</strong> al <strong>{fmtDateIt(createdPass.valid_to)}</strong>
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button onClick={() => handleDownload(createdPass)} className="bg-blue-600 hover:bg-blue-700 h-12">
                <Download className="w-4 h-4 mr-2" />
                Scarica PDF
              </Button>
              <Button onClick={() => handlePrint(createdPass)} variant="outline" className="h-12 border-slate-400">
                <Printer className="w-4 h-4 mr-2" />
                Stampa
              </Button>
              <Button
                onClick={() => handleEmail(createdPass)}
                disabled={!createdPass.customer?.email}
                className="bg-emerald-600 hover:bg-emerald-700 h-12"
              >
                <Mail className="w-4 h-4 mr-2" />
                Invia via Email
              </Button>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => { setCreatedPass(null); setTab('new'); }} className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                Nuovo Pass
              </Button>
              <Button variant="outline" onClick={() => { setCreatedPass(null); setTab('archive'); }} className="flex-1">
                <Archive className="w-4 h-4 mr-2" />
                Vai all&apos;Archivio
              </Button>
            </div>
          </div>
        ) : (
          // ── Tab Nuovo / Archivio ────────────────────────────────────
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-2 mb-3">
              <TabsTrigger value="new">
                <Plus className="w-4 h-4 mr-1" /> Nuovo Pass
              </TabsTrigger>
              <TabsTrigger value="archive">
                <Archive className="w-4 h-4 mr-1" /> Archivio ({passes.length})
              </TabsTrigger>
            </TabsList>

            {/* ── TAB NUOVO PASS ──────────────────────────────────── */}
            <TabsContent value="new" className="space-y-4">
              {/* Switch tipo cliente */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.customerMode === 'manual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setForm(p => ({ ...p, customerMode: 'manual' }))}
                >
                  ✍️ Inserimento Manuale
                </Button>
                <Button
                  type="button"
                  variant={form.customerMode === 'existing' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setForm(p => ({ ...p, customerMode: 'existing' }))}
                >
                  👥 Cliente Esistente ({existingCustomers.length})
                </Button>
              </div>

              {/* Cliente esistente: ricerca */}
              {form.customerMode === 'existing' && (
                <Card className="border-blue-200">
                  <CardContent className="p-3">
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Cerca per nome, email, telefono..."
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <div className="max-h-44 overflow-y-auto space-y-1">
                      {filteredCustomers.length === 0 && (
                        <div className="text-center text-sm text-slate-500 py-3">Nessun cliente trovato.</div>
                      )}
                      {filteredCustomers.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => pickExistingCustomer(c)}
                          className="w-full text-left p-2 rounded-md hover:bg-blue-50 border border-slate-200 transition"
                        >
                          <div className="font-medium text-sm">{c.name} {c.surname}</div>
                          <div className="text-xs text-slate-500">
                            {c.email || '—'} · {c.phone || '—'}
                            {c.boat_name && ` · ⛵ ${c.boat_name}`}
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Dati Cliente */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome *</Label>
                  <Input
                    value={form.customer.name}
                    onChange={e => setForm(p => ({ ...p, customer: { ...p.customer, name: e.target.value } }))}
                    placeholder="Mario"
                  />
                </div>
                <div>
                  <Label className="text-xs">Cognome</Label>
                  <Input
                    value={form.customer.surname}
                    onChange={e => setForm(p => ({ ...p, customer: { ...p.customer, surname: e.target.value } }))}
                    placeholder="Rossi"
                  />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={form.customer.email}
                    onChange={e => setForm(p => ({ ...p, customer: { ...p.customer, email: e.target.value } }))}
                    placeholder="mario@example.com"
                  />
                </div>
                <div>
                  <Label className="text-xs">Telefono</Label>
                  <Input
                    value={form.customer.phone}
                    onChange={e => setForm(p => ({ ...p, customer: { ...p.customer, phone: e.target.value } }))}
                    placeholder="+39 ..."
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Documento / Codice Fiscale</Label>
                  <Input
                    value={form.customer.document}
                    onChange={e => setForm(p => ({ ...p, customer: { ...p.customer, document: e.target.value } }))}
                    placeholder="CF o numero documento"
                  />
                </div>
              </div>

              {/* Dati Barca */}
              <div className="border-t pt-3">
                <div className="text-sm font-semibold mb-2 text-slate-700">⛵ Imbarcazione / Mezzo (opzionale)</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nome Imbarcazione</Label>
                    <Input
                      value={form.boat.name}
                      onChange={e => setForm(p => ({ ...p, boat: { ...p.boat, name: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Targa / Sigla</Label>
                    <Input
                      value={form.license_plate}
                      onChange={e => setForm(p => ({ ...p, license_plate: e.target.value }))}
                      placeholder="IT-123-AB"
                    />
                  </div>
                </div>
              </div>

              {/* Date di Validità */}
              <div className="border-t pt-3 bg-blue-50 -mx-6 px-6 py-3">
                <div className="text-sm font-semibold mb-2 text-blue-900 flex items-center gap-1">
                  <CalIcon className="w-4 h-4" /> Validità Pass *
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Valido DAL</Label>
                    <Input
                      type="date"
                      value={form.valid_from}
                      onChange={e => setForm(p => ({ ...p, valid_from: e.target.value }))}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Valido AL</Label>
                    <Input
                      type="date"
                      value={form.valid_to}
                      onChange={e => setForm(p => ({ ...p, valid_to: e.target.value }))}
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs">Note (opzionale)</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Annotazioni interne o info aggiuntive..."
                  rows={2}
                />
              </div>

              <DialogFooter className="pt-3 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
                <Button onClick={handleCreate} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  🎫 Genera Pass
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* ── TAB ARCHIVIO ─────────────────────────────────────── */}
            <TabsContent value="archive">
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Cerca pass..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button
                  variant={showArchived ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowArchived(v => !v)}
                >
                  {showArchived ? <ArchiveRestore className="w-4 h-4 mr-1" /> : <Archive className="w-4 h-4 mr-1" />}
                  {showArchived ? 'Mostra Attivi' : 'Archiviati'}
                </Button>
              </div>

              {loadingPasses ? (
                <div className="text-center py-8 text-slate-500"><Loader2 className="w-6 h-6 mx-auto animate-spin" /></div>
              ) : displayPasses.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Ticket className="w-12 h-12 mx-auto opacity-40 mb-2" />
                  Nessun pass {showArchived ? 'archiviato' : 'attivo'}.
                </div>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto">
                  {displayPasses.map(p => (
                    <Card key={p.id} className={`border ${isActive(p) ? 'border-emerald-300 bg-emerald-50/30' : isExpired(p) ? 'border-slate-200 bg-slate-50' : 'border-blue-200'}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-sm text-blue-900">{p.pass_number}</span>
                              {isActive(p) && <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] px-1.5 py-0">ATTIVO</Badge>}
                              {isExpired(p) && !p.archived && <Badge variant="outline" className="text-[10px] px-1.5 py-0">SCADUTO</Badge>}
                              {!isActive(p) && !isExpired(p) && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 text-blue-700">FUTURO</Badge>}
                              {p.archived && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">ARCHIVIATO</Badge>}
                            </div>
                            <div className="text-sm font-medium mt-1">{p.customer.name} {p.customer.surname}</div>
                            <div className="text-xs text-slate-600">
                              📅 {fmtDateIt(p.valid_from)} → {fmtDateIt(p.valid_to)}
                              {p.boat?.name && ` · ⛵ ${p.boat.name}`}
                              {p.license_plate && ` · 🏷️ ${p.license_plate}`}
                            </div>
                            {p.customer.email && (
                              <div className="text-xs text-slate-500">📧 {p.customer.email}</div>
                            )}
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(p)} title="Scarica PDF">
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePrint(p)} title="Stampa">
                              <Printer className="w-3.5 h-3.5" />
                            </Button>
                            {p.customer.email && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEmail(p)} title="Invia Email">
                                <Mail className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => handleArchive(p, !p.archived)}
                              title={p.archived ? 'Riattiva' : 'Archivia'}
                            >
                              {p.archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                            </Button>
                            <Button
                              size="icon" variant="ghost"
                              className="h-7 w-7 text-red-500 hover:bg-red-50"
                              onClick={() => handleDelete(p)}
                              title="Elimina"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
