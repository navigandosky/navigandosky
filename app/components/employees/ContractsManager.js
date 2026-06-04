'use client';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, FileText, Download, Upload, Calendar, Briefcase, Clock } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_BADGES = {
  DRAFT:  { label: '📝 Bozza', color: 'bg-slate-100 text-slate-700' },
  ACTIVE: { label: '✅ Attivo', color: 'bg-emerald-100 text-emerald-700' },
  CLOSED: { label: '🔒 Concluso', color: 'bg-amber-100 text-amber-700' },
};

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtEur = (n) => n != null ? `€ ${Number(n).toFixed(2).replace('.', ',')}` : '—';

export default function ContractsManager({ employee }) {
  const [contracts, setContracts] = useState([]);
  const [contractTypes, setContractTypes] = useState([]);
  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!employee?.id) return;
    setLoading(true);
    try {
      const cid = employee.company_id;
      const [c, ct, r, l] = await Promise.all([
        fetch(`/api/employee-contracts?employee_id=${employee.id}`).then(x => x.json()),
        fetch(`/api/contract-types?company_id=${cid}`).then(x => x.json()),
        fetch(`/api/employee-roles?company_id=${cid}`).then(x => x.json()),
        fetch(`/api/employee-locations?company_id=${cid}`).then(x => x.json()),
      ]);
      setContracts(Array.isArray(c) ? c : []);
      setContractTypes(Array.isArray(ct) ? ct : []);
      setRoles(Array.isArray(r) ? r : []);
      setLocations(Array.isArray(l) ? l : []);
    } catch (e) { toast.error('Errore caricamento: ' + e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [employee?.id]);

  const save = async () => {
    if (!editing.start_date) { toast.error('Data inizio obbligatoria'); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...editing,
        company_id: employee.company_id,
        employee_id: employee.id,
        employee_name: `${employee.last_name || ''} ${employee.first_name || ''}`.trim(),
      };
      // snapshot label
      if (editing.contract_type_id) payload.contract_type_label = contractTypes.find(t => t.id === editing.contract_type_id)?.name || editing.contract_type_label;
      if (editing.role_id) payload.role_label = roles.find(r => r.id === editing.role_id)?.name || editing.role_label;
      if (editing.location_id) payload.location_label = locations.find(l => l.id === editing.location_id)?.name || editing.location_label;

      const isNew = !editing.id;
      const url = isNew ? '/api/employee-contracts' : `/api/employee-contracts/${editing.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Errore');
      toast.success(isNew ? '📝 Contratto creato' : 'Contratto aggiornato');
      setEditing(null);
      load();
    } catch (e) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const del = async (c) => {
    if (!window.confirm(`Eliminare il contratto del ${fmtDate(c.start_date)}?`)) return;
    try {
      const r = await fetch(`/api/employee-contracts/${c.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Errore');
      toast.success('Contratto eliminato');
      load();
    } catch (e) { toast.error(e.message); }
  };

  // Upload allegato
  const uploadAttachment = async (contract, file, description) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File troppo grande (max 10MB)'); return; }
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = () => rej(r.error); r.readAsDataURL(file);
      });
      const r = await fetch(`/api/employee-contracts/${contract.id}?action=add-attachment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, description, base64, mime: file.type, size: file.size }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Errore upload');
      toast.success(`📎 "${file.name}" caricato`);
      // refresh editing
      const refreshed = await fetch(`/api/employee-contracts/${contract.id}`).then(x => x.json());
      setEditing(refreshed);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const removeAttachment = async (contract, attId) => {
    if (!window.confirm('Eliminare allegato?')) return;
    try {
      const r = await fetch(`/api/employee-contracts/${contract.id}?action=remove-attachment&att_id=${attId}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Errore');
      const refreshed = await fetch(`/api/employee-contracts/${contract.id}`).then(x => x.json());
      setEditing(refreshed);
      load();
      toast.success('Allegato eliminato');
    } catch (e) { toast.error(e.message); }
  };

  const downloadAttachment = (att) => {
    try {
      const bin = atob(att.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: att.mime || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = att.filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { toast.error('Errore download: ' + e.message); }
  };

  const totalWeekly = useMemo(() => contracts.filter(c => c.status === 'ACTIVE').reduce((s, c) => s + (Number(c.weekly_hours) || 0), 0), [contracts]);
  const activeCount = useMemo(() => contracts.filter(c => c.status === 'ACTIVE').length, [contracts]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="font-semibold text-indigo-700">{contracts.length} contratti</span>
          {activeCount > 0 && <span className="ml-2 text-xs text-emerald-700">{activeCount} attivi · {totalWeekly}h/sett</span>}
        </div>
        <Button size="sm" onClick={() => setEditing({ status: 'ACTIVE', attachments: [], start_date: new Date().toISOString().slice(0,10) })} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-3 h-3 mr-1" />Nuova Assunzione
        </Button>
      </div>

      {/* Lista */}
      {loading ? <div className="text-center py-6 text-muted-foreground text-sm">Caricamento…</div>
        : contracts.length === 0 ? (
          <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground text-sm">
            Nessuna assunzione registrata
          </div>
        ) : (
          <div className="space-y-2">
            {contracts.map(c => {
              const sb = STATUS_BADGES[c.status] || STATUS_BADGES.DRAFT;
              return (
                <div key={c.id} className="border rounded-lg p-3 bg-white hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={sb.color}>{sb.label}</Badge>
                        <span className="font-semibold text-sm">{c.contract_type_label || 'Contratto'}</span>
                        {c.role_label && <Badge variant="outline" className="text-xs"><Briefcase className="w-3 h-3 mr-1" />{c.role_label}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div><Calendar className="w-3 h-3 inline mr-1" /><strong>Dal:</strong> {fmtDate(c.start_date)} {c.end_date ? `→ ${fmtDate(c.end_date)}` : '(indeterminato)'}</div>
                        {(c.weekly_hours || c.hourly_rate || c.monthly_gross) && (
                          <div>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {c.weekly_hours ? `${c.weekly_hours}h/sett · ` : ''}
                            {c.hourly_rate ? `${fmtEur(c.hourly_rate)}/h · ` : ''}
                            {c.monthly_gross ? `Lordo ${fmtEur(c.monthly_gross)}/mese` : ''}
                            {c.net_estimated ? ` · Netto ~${fmtEur(c.net_estimated)}` : ''}
                          </div>
                        )}
                        {c.location_label && <div>📍 {c.location_label}</div>}
                        {c.job_description && <div>💼 {c.job_description}</div>}
                        {c.attachments?.length > 0 && <div>📎 {c.attachments.length} allegato/i</div>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(c)}><Edit className="w-3.5 h-3.5 text-amber-600" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(c)}><Trash2 className="w-3.5 h-3.5 text-red-600" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* Dialog edit */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && !submitting && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? '📝 Modifica Assunzione' : '➕ Nuova Assunzione'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tipo Contratto</Label>
                  <div className="flex gap-1">
                    <Select value={editing.contract_type_id || '__free__'} onValueChange={(v) => setEditing({ ...editing, contract_type_id: v === '__free__' ? null : v })}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__free__">Personalizzato ↓</SelectItem>
                        {contractTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input className="mt-1" placeholder="es. Tempo determinato" value={editing.contract_type_label || ''} onChange={(e) => setEditing({ ...editing, contract_type_label: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Stato</Label>
                  <Select value={editing.status || 'ACTIVE'} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_BADGES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Data Inizio *</Label>
                  <Input type="date" value={editing.start_date?.slice(0,10) || ''} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Data Fine (vuoto = indeterminato)</Label>
                  <Input type="date" value={editing.end_date?.slice(0,10) || ''} onChange={(e) => setEditing({ ...editing, end_date: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Ruolo</Label>
                  <Select value={editing.role_id || ''} onValueChange={(v) => setEditing({ ...editing, role_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleziona ruolo" /></SelectTrigger>
                    <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Sede</Label>
                  <Select value={editing.location_id || ''} onValueChange={(v) => setEditing({ ...editing, location_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleziona sede" /></SelectTrigger>
                    <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Ore Settimanali</Label>
                  <Input type="number" step="0.5" value={editing.weekly_hours ?? ''} onChange={(e) => setEditing({ ...editing, weekly_hours: e.target.value })} placeholder="40" />
                </div>
                <div>
                  <Label className="text-xs">Ore Giornaliere</Label>
                  <Input type="number" step="0.5" value={editing.daily_hours ?? ''} onChange={(e) => setEditing({ ...editing, daily_hours: e.target.value })} placeholder="8" />
                </div>
                <div>
                  <Label className="text-xs">Paga Oraria (€)</Label>
                  <Input type="number" step="0.01" value={editing.hourly_rate ?? ''} onChange={(e) => setEditing({ ...editing, hourly_rate: e.target.value })} placeholder="12.50" />
                </div>
                <div>
                  <Label className="text-xs">Stipendio Lordo Mensile (€)</Label>
                  <Input type="number" step="0.01" value={editing.monthly_gross ?? ''} onChange={(e) => setEditing({ ...editing, monthly_gross: e.target.value })} placeholder="1800" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Netto Stimato (€/mese)</Label>
                  <Input type="number" step="0.01" value={editing.net_estimated ?? ''} onChange={(e) => setEditing({ ...editing, net_estimated: e.target.value })} placeholder="1400" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Descrizione Mansione</Label>
                  <Textarea rows={2} value={editing.job_description || ''} onChange={(e) => setEditing({ ...editing, job_description: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Note</Label>
                  <Textarea rows={2} value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
                </div>
              </div>

              {/* Allegati (solo per contratti già salvati) */}
              {editing.id && (
                <div className="bg-slate-50 border rounded-lg p-3 space-y-2">
                  <Label className="text-xs font-semibold">📎 Allegati Contratto</Label>
                  <AttachmentUploader onUpload={(file, desc) => uploadAttachment(editing, file, desc)} />
                  {(editing.attachments || []).length > 0 ? (
                    <div className="space-y-1">
                      {(editing.attachments || []).map(a => (
                        <div key={a.id} className="flex items-center justify-between bg-white border rounded p-2 text-xs">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{a.filename}</div>
                            <div className="text-muted-foreground">{a.description || ''} · {(a.size/1024).toFixed(1)} KB · {fmtDate(a.uploaded_at)}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => downloadAttachment(a)}><Download className="w-3.5 h-3.5 text-blue-600" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeAttachment(editing, a.id)}><Trash2 className="w-3.5 h-3.5 text-red-600" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="text-xs text-muted-foreground">Nessun allegato</div>}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={submitting}>Annulla</Button>
            <Button onClick={save} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? 'Salvataggio…' : (editing?.id ? 'Salva' : 'Crea')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AttachmentUploader({ onUpload }) {
  const [file, setFile] = useState(null);
  const [desc, setDesc] = useState('');
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="flex-1" />
      <Input placeholder="Descrizione (opz.)" value={desc} onChange={(e) => setDesc(e.target.value)} className="flex-1" />
      <Button size="sm" disabled={!file} onClick={async () => { await onUpload(file, desc); setFile(null); setDesc(''); }}>
        <Upload className="w-3 h-3 mr-1" />Carica
      </Button>
    </div>
  );
}
