'use client';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Users, Plus, Search, Edit, Trash2, FileText, Mail, Download, Upload, MapPin, Briefcase, RefreshCw, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import ContractsManager from './employees/ContractsManager';
import PayslipsManager from './employees/PayslipsManager';

const STATUS_OPTIONS = [
  { value: 'LIBERO', label: '🟢 Libero / Disponibile', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'ASSUNTO', label: '👔 Assunto / In Servizio', color: 'bg-blue-100 text-blue-700' },
  { value: 'DISOCCUPATO', label: '🔴 Disoccupato', color: 'bg-red-100 text-red-700' },
  { value: 'INOCCUPATO', label: '🟡 Inoccupato', color: 'bg-amber-100 text-amber-700' },
  { value: 'ALTRO', label: '⚪ Altro', color: 'bg-slate-100 text-slate-700' },
];

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const statusBadge = (s) => {
  const opt = STATUS_OPTIONS.find(o => o.value === s) || { label: s, color: 'bg-slate-100' };
  return <Badge className={opt.color}>{opt.label}</Badge>;
};

export default function EmployeesAdmin({ currentUser, isSuperAdmin, companies }) {
  const companyId = isSuperAdmin ? null : currentUser?.company_id;
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || '');

  // Lista filtrabile
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('ALL');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Dialog edit/create
  const [editing, setEditing] = useState(null);   // employee object o {} per nuovo
  const [submitting, setSubmitting] = useState(false);

  // Dialog Sedi/Ruoli (manage lists)
  const [showLocationsManager, setShowLocationsManager] = useState(false);
  const [showRolesManager, setShowRolesManager] = useState(false);

  // Email send dialog
  const [emailDialog, setEmailDialog] = useState(null); // { recipients: '', subject, message, attachPdf }

  const effectiveCompanyId = selectedCompanyId || companyId;

  const load = async () => {
    if (!effectiveCompanyId) return;
    setLoading(true);
    try {
      const [empR, locR, roleR] = await Promise.all([
        fetch(`/api/employees?company_id=${effectiveCompanyId}`).then(r => r.json()),
        fetch(`/api/employee-locations?company_id=${effectiveCompanyId}`).then(r => r.json()),
        fetch(`/api/employee-roles?company_id=${effectiveCompanyId}`).then(r => r.json()),
      ]);
      setEmployees(Array.isArray(empR) ? empR : []);
      setLocations(Array.isArray(locR) ? locR : []);
      setRoles(Array.isArray(roleR) ? roleR : []);
    } catch (e) { toast.error('Errore caricamento: ' + e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (effectiveCompanyId) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [effectiveCompanyId]);

  const filtered = useMemo(() => {
    return employees.filter(e => {
      if (filterLocation !== 'ALL' && e.location_id !== filterLocation) return false;
      if (filterRole !== 'ALL' && e.role_id !== filterRole) return false;
      if (filterStatus !== 'ALL' && e.status !== filterStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          e.first_name?.toLowerCase().includes(s) ||
          e.last_name?.toLowerCase().includes(s) ||
          e.fiscal_code?.toLowerCase().includes(s) ||
          e.email?.toLowerCase().includes(s) ||
          e.phone?.includes(s) ||
          e.job_description?.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [employees, filterLocation, filterRole, filterStatus, search]);

  const saveEmployee = async () => {
    if (!editing?.first_name || !editing?.last_name) {
      toast.error('Nome e Cognome obbligatori');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...editing, company_id: effectiveCompanyId, created_by: currentUser?.id };
      // arricchisci location_label / role_label (snapshot)
      if (editing.location_id) payload.location_label = locations.find(l => l.id === editing.location_id)?.name || '';
      if (editing.role_id) payload.role_label = roles.find(r => r.id === editing.role_id)?.name || '';

      const isNew = !editing.id;
      const url = isNew ? '/api/employees' : `/api/employees/${editing.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Errore salvataggio');
      toast.success(isNew ? `Dipendente ${data.first_name} creato` : `Dipendente aggiornato`);
      setEditing(null);
      load();
    } catch (e) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const deleteEmployee = async (emp) => {
    if (!window.confirm(`Eliminare ${emp.first_name} ${emp.last_name}? Tutti i documenti allegati saranno persi.`)) return;
    try {
      const r = await fetch(`/api/employees/${emp.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Errore eliminazione');
      toast.success('Dipendente eliminato');
      load();
    } catch (e) { toast.error(e.message); }
  };

  // Upload documento
  const uploadDocument = async (employee, file, description) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File troppo grande (max 10MB)'); return; }
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]); // togli "data:...;base64,"
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const r = await fetch(`/api/employees/${employee.id}?action=add-document`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, description, base64, mime: file.type, size: file.size, uploaded_by: currentUser?.id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Errore upload');
      toast.success(`📎 Documento "${file.name}" caricato`);
      load();
      // Refresh editing se aperto
      if (editing?.id === employee.id) {
        const refreshed = await fetch(`/api/employees/${employee.id}`).then(x => x.json());
        setEditing(refreshed);
      }
    } catch (e) { toast.error(e.message); }
  };

  const removeDocument = async (employee, docId) => {
    if (!window.confirm('Eliminare questo documento?')) return;
    try {
      const r = await fetch(`/api/employees/${employee.id}?action=remove-document&doc_id=${docId}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Errore');
      toast.success('Documento eliminato');
      const refreshed = await fetch(`/api/employees/${employee.id}`).then(x => x.json());
      setEditing(refreshed);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const downloadDocument = (doc) => {
    try {
      const b64 = doc.base64;
      const byteChars = atob(b64);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
      const blob = new Blob([bytes], { type: doc.mime || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { toast.error('Errore download: ' + e.message); }
  };

  // === Export PDF lista dipendenti ===
  const exportPDF = async () => {
    if (filtered.length === 0) { toast.error('Nessun dipendente da esportare'); return; }
    try {
      const [{ jsPDF }, atMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const autoTable = atMod.default || atMod;
      const doc = new jsPDF('l');
      doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(31, 41, 55);
      const company = companies?.find(c => c.id === effectiveCompanyId);
      doc.text(`Elenco Dipendenti — ${company?.name || ''}`, 14, 16);
      doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(75, 85, 99);
      const af = [];
      if (filterStatus !== 'ALL') af.push(`Stato: ${STATUS_OPTIONS.find(s => s.value === filterStatus)?.label}`);
      if (filterLocation !== 'ALL') af.push(`Sede: ${locations.find(l => l.id === filterLocation)?.name}`);
      if (filterRole !== 'ALL') af.push(`Ruolo: ${roles.find(r => r.id === filterRole)?.name}`);
      if (search) af.push(`Ricerca: "${search}"`);
      af.push(`Totale: ${filtered.length}`);
      doc.text(`Generato: ${new Date().toLocaleString('it-IT')}`, 14, 22);
      if (af.length > 0) doc.text(`Filtri: ${af.join(' · ')}`, 14, 27);

      autoTable(doc, {
        startY: 33,
        head: [['Cognome Nome', 'Cod. Fiscale', 'Email', 'Telefono', 'Ruolo', 'Mansione', 'Sede', 'Stato']],
        body: filtered.map(e => [
          `${e.last_name} ${e.first_name}`,
          e.fiscal_code || '—',
          e.email || '—',
          e.phone || '—',
          e.role_label || '—',
          (e.job_description || '').slice(0, 40),
          e.location_label || '—',
          STATUS_OPTIONS.find(o => o.value === e.status)?.label?.replace(/[^a-zA-Z\s/]/g, '').trim() || e.status,
        ]),
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      });

      const today = new Date().toISOString().slice(0, 10);
      doc.save(`Elenco_Dipendenti_${today}.pdf`);
      toast.success(`PDF esportato (${filtered.length} dipendenti)`);
      return doc;
    } catch (e) { toast.error('Errore PDF: ' + e.message); }
  };

  // === Invia lista via Email ===
  const sendEmail = async () => {
    if (!emailDialog?.recipients) { toast.error('Inserisci almeno una email destinatario'); return; }
    const recipientsList = emailDialog.recipients.split(/[,;\s]+/).map(s => s.trim()).filter(s => /@/.test(s));
    if (recipientsList.length === 0) { toast.error('Nessuna email valida'); return; }
    try {
      // Genera PDF e ottieni base64
      const [{ jsPDF }, atMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const autoTable = atMod.default || atMod;
      const doc = new jsPDF('l');
      doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(31, 41, 55);
      const company = companies?.find(c => c.id === effectiveCompanyId);
      doc.text(`Elenco Dipendenti — ${company?.name || ''}`, 14, 16);
      doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(75, 85, 99);
      doc.text(`Generato: ${new Date().toLocaleString('it-IT')} · Totale: ${filtered.length}`, 14, 22);
      autoTable(doc, {
        startY: 28,
        head: [['Cognome Nome', 'Cod. Fiscale', 'Email', 'Telefono', 'Ruolo', 'Sede', 'Stato']],
        body: filtered.map(e => [
          `${e.last_name} ${e.first_name}`, e.fiscal_code || '—', e.email || '—', e.phone || '—',
          e.role_label || '—', e.location_label || '—',
          STATUS_OPTIONS.find(o => o.value === e.status)?.label?.replace(/[^a-zA-Z\s/]/g, '').trim() || e.status,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] },
      });
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const filename = `Elenco_Dipendenti_${new Date().toISOString().slice(0, 10)}.pdf`;

      // Invio sequenziale a ciascun destinatario (l'endpoint accetta una mail alla volta)
      let sent = 0;
      for (const to of recipientsList) {
        const r = await fetch('/api/send-document-email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_email: to,
            subject: emailDialog.subject || `Elenco Dipendenti - ${new Date().toLocaleDateString('it-IT')}`,
            message: emailDialog.message || '',
            pdf_base64: pdfBase64,
            pdf_filename: filename,
            content_type: 'application/pdf',
            document_type: 'documento',
            document_number: '',
            customer_name: to.split('@')[0],
            company_id: effectiveCompanyId,
            company_name: company?.name,
          }),
        });
        if (r.ok) sent++;
        else { const d = await r.json().catch(()=>({})); console.warn('Email fail:', to, d); }
      }
      if (sent > 0) toast.success(`✉️ Email inviata a ${sent}/${recipientsList.length} destinatari`);
      else toast.error('Nessuna email inviata');
      setEmailDialog(null);
    } catch (e) { toast.error(e.message); }
  };

  if (!effectiveCompanyId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
          {isSuperAdmin
            ? <>Seleziona una company per gestire i dipendenti:
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="mt-3 max-w-md mx-auto"><SelectValue placeholder="Seleziona company..." /></SelectTrigger>
                <SelectContent>{companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </>
            : 'Nessuna company associata al tuo utente'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header + azioni */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600" /> Anagrafica Dipendenti</span>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setShowLocationsManager(true)}><MapPin className="w-3 h-3 mr-1" />Sedi ({locations.length})</Button>
              <Button size="sm" variant="outline" onClick={() => setShowRolesManager(true)}><Briefcase className="w-3 h-3 mr-1" />Ruoli ({roles.length})</Button>
              <Button size="sm" variant="outline" onClick={load} disabled={loading}><RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />Aggiorna</Button>
              <Button size="sm" variant="default" className="bg-sky-600 hover:bg-sky-700" onClick={exportPDF} disabled={filtered.length === 0}><FileText className="w-3 h-3 mr-1" />PDF</Button>
              <Button size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={() => setEmailDialog({ recipients: '', subject: '', message: '' })} disabled={filtered.length === 0}><Mail className="w-3 h-3 mr-1" />Email</Button>
              <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setEditing({ status: 'LIBERO', documents: [] })}><Plus className="w-3 h-3 mr-1" />Nuovo Dipendente</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-3">
          {/* Filtri */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cerca nome/cognome/CF/email..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger><SelectValue placeholder="Sede" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tutte le sedi</SelectItem>
                {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger><SelectValue placeholder="Ruolo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tutti i ruoli</SelectItem>
                {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="Stato" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tutti gli stati</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="text-center py-6 text-muted-foreground">Caricamento…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun dipendente trovato. <Button variant="link" onClick={() => setEditing({ status: 'LIBERO', documents: [] })}>Aggiungi il primo</Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase">
                  <tr>
                    <th className="p-2 text-left">Cognome Nome</th>
                    <th className="p-2 text-left">CF</th>
                    <th className="p-2 text-left">Contatti</th>
                    <th className="p-2 text-left">Ruolo / Mansione</th>
                    <th className="p-2 text-left">Sede</th>
                    <th className="p-2 text-left">Stato</th>
                    <th className="p-2 text-center">Docs</th>
                    <th className="p-2 text-center">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} className="border-t hover:bg-slate-50/50">
                      <td className="p-2 font-medium">{e.last_name} {e.first_name}{e.gender ? <span className="text-[10px] text-muted-foreground ml-1">({e.gender})</span> : null}</td>
                      <td className="p-2 font-mono text-xs">{e.fiscal_code || '—'}</td>
                      <td className="p-2 text-xs">
                        {e.email && <div>📧 {e.email}</div>}
                        {e.phone && <div>📞 {e.phone}</div>}
                      </td>
                      <td className="p-2">
                        <div className="text-xs font-medium">{e.role_label || '—'}</div>
                        <div className="text-[10px] text-muted-foreground">{(e.job_description || '').slice(0, 50)}</div>
                      </td>
                      <td className="p-2 text-xs">{e.location_label || '—'}</td>
                      <td className="p-2">{statusBadge(e.status)}</td>
                      <td className="p-2 text-center">
                        {(e.documents?.length > 0) ? <Badge className="bg-blue-100 text-blue-700">{e.documents.length}</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1 justify-center">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(e)} title="Modifica"><Edit className="w-3.5 h-3.5 text-amber-600" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteEmployee(e)} title="Elimina"><Trash2 className="w-3.5 h-3.5 text-red-600" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-indigo-50 border-t-2 border-indigo-300">
                  <tr>
                    <td colSpan={5} className="p-2 font-bold text-indigo-800">TOTALE · {filtered.length} dipendenti</td>
                    <td className="p-2 text-xs" colSpan={3}>
                      {STATUS_OPTIONS.map(s => {
                        const cnt = filtered.filter(e => e.status === s.value).length;
                        return cnt > 0 ? <span key={s.value} className="mr-2"><Badge className={s.color}>{s.label.split(' ').slice(1).join(' ')}: {cnt}</Badge></span> : null;
                      })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Edit/Create Dipendente */}
      <EmployeeDialog
        open={!!editing}
        employee={editing}
        setEmployee={setEditing}
        locations={locations}
        roles={roles}
        onClose={() => !submitting && setEditing(null)}
        onSave={saveEmployee}
        submitting={submitting}
        uploadDocument={uploadDocument}
        removeDocument={removeDocument}
        downloadDocument={downloadDocument}
      />

      {/* Dialog Sedi Manager */}
      <ListManagerDialog
        open={showLocationsManager}
        onClose={() => setShowLocationsManager(false)}
        title="Gestione Sedi"
        icon={<MapPin className="w-5 h-5 text-emerald-600" />}
        items={locations}
        endpoint="/api/employee-locations"
        companyId={effectiveCompanyId}
        onChange={load}
        extraFields={['address', 'city']}
      />

      {/* Dialog Ruoli Manager */}
      <ListManagerDialog
        open={showRolesManager}
        onClose={() => setShowRolesManager(false)}
        title="Gestione Ruoli / Mansioni"
        icon={<Briefcase className="w-5 h-5 text-amber-600" />}
        items={roles}
        endpoint="/api/employee-roles"
        companyId={effectiveCompanyId}
        onChange={load}
      />

      {/* Email Dialog */}
      <Dialog open={!!emailDialog} onOpenChange={(o) => !o && setEmailDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>📧 Invia Elenco Dipendenti via Email</DialogTitle>
            <DialogDescription>L&apos;elenco filtrato ({filtered.length} dipendenti) sarà allegato come PDF.</DialogDescription>
          </DialogHeader>
          {emailDialog && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Destinatari (separa con virgola/spazio)</Label>
                <Input value={emailDialog.recipients} onChange={(e) => setEmailDialog({ ...emailDialog, recipients: e.target.value })}
                  placeholder="email1@example.com, email2@example.com" />
              </div>
              <div>
                <Label className="text-xs">Oggetto</Label>
                <Input value={emailDialog.subject} onChange={(e) => setEmailDialog({ ...emailDialog, subject: e.target.value })}
                  placeholder="Elenco Dipendenti..." />
              </div>
              <div>
                <Label className="text-xs">Messaggio</Label>
                <Textarea rows={3} value={emailDialog.message} onChange={(e) => setEmailDialog({ ...emailDialog, message: e.target.value })}
                  placeholder="Buongiorno, in allegato l'elenco dei dipendenti..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialog(null)}>Annulla</Button>
            <Button onClick={sendEmail} className="bg-blue-600 hover:bg-blue-700">
              <Mail className="w-4 h-4 mr-2" />Invia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ Sub-component: EmployeeDialog (Create/Edit) ============
function EmployeeDialog({ open, employee, setEmployee, locations, roles, onClose, onSave, submitting, uploadDocument, removeDocument, downloadDocument }) {
  const [docDescr, setDocDescr] = useState('');
  const [docFile, setDocFile] = useState(null);
  useEffect(() => { if (!open) { setDocDescr(''); setDocFile(null); } }, [open]);

  if (!open || !employee) return null;
  const isNew = !employee.id;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle>{isNew ? '➕ Nuovo Dipendente' : `Modifica ${employee.last_name} ${employee.first_name}`}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <Tabs defaultValue="anagrafica">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="anagrafica">👤 Anagrafica</TabsTrigger>
              <TabsTrigger value="contatti">📞 Contatti</TabsTrigger>
              <TabsTrigger value="istruzione">🎓 Istruzione & Ruolo</TabsTrigger>
              <TabsTrigger value="documenti">📎 Documenti {employee.documents?.length > 0 ? `(${employee.documents.length})` : ''}</TabsTrigger>
              <TabsTrigger value="assunzioni" disabled={isNew}>📝 Assunzioni</TabsTrigger>
              <TabsTrigger value="stipendi" disabled={isNew}>💰 Stipendi</TabsTrigger>
              <TabsTrigger value="note">🗒️ Note</TabsTrigger>
            </TabsList>

            <TabsContent value="anagrafica" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Nome *</Label><Input value={employee.first_name || ''} onChange={(e) => setEmployee({ ...employee, first_name: e.target.value })} /></div>
                <div><Label className="text-xs">Cognome *</Label><Input value={employee.last_name || ''} onChange={(e) => setEmployee({ ...employee, last_name: e.target.value })} /></div>
                <div>
                  <Label className="text-xs">Sesso</Label>
                  <Select value={employee.gender || ''} onValueChange={(v) => setEmployee({ ...employee, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Maschio</SelectItem>
                      <SelectItem value="F">Femmina</SelectItem>
                      <SelectItem value="OTHER">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Codice Fiscale</Label><Input value={employee.fiscal_code || ''} onChange={(e) => setEmployee({ ...employee, fiscal_code: e.target.value.toUpperCase() })} className="font-mono uppercase" /></div>
                <div><Label className="text-xs">Data di Nascita</Label><Input type="date" value={employee.birth_date?.slice(0, 10) || ''} onChange={(e) => setEmployee({ ...employee, birth_date: e.target.value })} /></div>
                <div><Label className="text-xs">Luogo di Nascita</Label><Input value={employee.birth_place || ''} onChange={(e) => setEmployee({ ...employee, birth_place: e.target.value })} /></div>
                <div><Label className="text-xs">Nazionalità</Label><Input value={employee.nationality || ''} onChange={(e) => setEmployee({ ...employee, nationality: e.target.value })} /></div>
                <div>
                  <Label className="text-xs">Stato</Label>
                  <Select value={employee.status || 'LIBERO'} onValueChange={(v) => setEmployee({ ...employee, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><Label className="text-xs">Indirizzo</Label><Input value={employee.address || ''} onChange={(e) => setEmployee({ ...employee, address: e.target.value })} /></div>
                <div><Label className="text-xs">CAP</Label><Input value={employee.postal_code || ''} onChange={(e) => setEmployee({ ...employee, postal_code: e.target.value })} /></div>
                <div className="col-span-2"><Label className="text-xs">Città</Label><Input value={employee.city || ''} onChange={(e) => setEmployee({ ...employee, city: e.target.value })} /></div>
                <div><Label className="text-xs">Paese</Label><Input value={employee.country || ''} onChange={(e) => setEmployee({ ...employee, country: e.target.value })} /></div>
              </div>
            </TabsContent>

            <TabsContent value="contatti" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Email</Label><Input type="email" value={employee.email || ''} onChange={(e) => setEmployee({ ...employee, email: e.target.value })} /></div>
                <div><Label className="text-xs">Telefono Primario</Label><Input value={employee.phone || ''} onChange={(e) => setEmployee({ ...employee, phone: e.target.value })} /></div>
                <div><Label className="text-xs">Telefono Secondario</Label><Input value={employee.phone_secondary || ''} onChange={(e) => setEmployee({ ...employee, phone_secondary: e.target.value })} /></div>
              </div>
            </TabsContent>

            <TabsContent value="istruzione" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Titolo di Studio</Label><Input value={employee.education_title || ''} onChange={(e) => setEmployee({ ...employee, education_title: e.target.value })} placeholder="es. Diploma, Laurea..." /></div>
                <div><Label className="text-xs">Istituto / Università</Label><Input value={employee.education_institute || ''} onChange={(e) => setEmployee({ ...employee, education_institute: e.target.value })} /></div>
                <div><Label className="text-xs">Anno Conseguimento</Label><Input type="number" value={employee.education_year || ''} onChange={(e) => setEmployee({ ...employee, education_year: e.target.value ? Number(e.target.value) : null })} /></div>
                <div>
                  <Label className="text-xs">Ruolo</Label>
                  <Select value={employee.role_id || ''} onValueChange={(v) => setEmployee({ ...employee, role_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleziona ruolo" /></SelectTrigger>
                    <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Mansione Assegnata</Label>
                  <Textarea rows={2} value={employee.job_description || ''} onChange={(e) => setEmployee({ ...employee, job_description: e.target.value })} placeholder="Descrivi le mansioni svolte..." />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Sede di Assegnazione</Label>
                  <Select value={employee.location_id || ''} onValueChange={(v) => setEmployee({ ...employee, location_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleziona sede" /></SelectTrigger>
                    <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}{l.city ? ' — ' + l.city : ''}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="documenti" className="space-y-3 mt-3">
              {/* Upload nuovo documento */}
              {!isNew && (
                <div className="bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-lg p-3 space-y-2">
                  <Label className="text-xs font-semibold">📎 Carica nuovo documento</Label>
                  <Input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
                  <Input placeholder="Descrizione (es. CV, Documento d'identità, Contratto firmato...)" value={docDescr} onChange={(e) => setDocDescr(e.target.value)} />
                  <Button size="sm" disabled={!docFile} className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={async () => { await uploadDocument(employee, docFile, docDescr); setDocFile(null); setDocDescr(''); }}>
                    <Upload className="w-3 h-3 mr-1" />Carica
                  </Button>
                </div>
              )}
              {isNew && <div className="text-xs text-muted-foreground">Per caricare documenti, salva prima il dipendente.</div>}

              {/* Lista documenti */}
              {(employee.documents || []).length > 0 ? (
                <div className="space-y-2">
                  {(employee.documents || []).map(d => (
                    <div key={d.id} className="flex items-center justify-between p-2 bg-white border rounded">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{d.filename}</div>
                        <div className="text-xs text-muted-foreground">{d.description || '—'} · {(d.size / 1024).toFixed(1)} KB · {fmtDate(d.uploaded_at)}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => downloadDocument(d)} title="Scarica"><Download className="w-3.5 h-3.5 text-blue-600" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeDocument(employee, d.id)} title="Elimina"><Trash2 className="w-3.5 h-3.5 text-red-600" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-4">Nessun documento caricato</div>
              )}
            </TabsContent>

            <TabsContent value="assunzioni" className="space-y-3 mt-3">
              {!isNew && <ContractsManager employee={employee} />}
            </TabsContent>

            <TabsContent value="stipendi" className="space-y-3 mt-3">
              {!isNew && <PayslipsManager employee={employee} />}
            </TabsContent>

            <TabsContent value="note" className="space-y-3 mt-3">
              <Textarea rows={6} placeholder="Note libere sul dipendente..." value={employee.notes || ''} onChange={(e) => setEmployee({ ...employee, notes: e.target.value })} />
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter className="px-6 py-3 border-t bg-white shrink-0">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Annulla</Button>
          <Button onClick={onSave} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? 'Salvataggio…' : (isNew ? 'Crea Dipendente' : 'Salva Modifiche')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Sub-component: ListManagerDialog (gestione Sedi/Ruoli) ============
function ListManagerDialog({ open, onClose, title, icon, items, endpoint, companyId, onChange, extraFields = [] }) {
  const [newName, setNewName] = useState('');
  const [extraData, setExtraData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const addItem = async () => {
    if (!newName.trim()) { toast.error('Nome obbligatorio'); return; }
    setSubmitting(true);
    try {
      const body = { company_id: companyId, name: newName.trim(), ...extraData };
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Errore'); }
      toast.success(`"${newName}" aggiunto`);
      setNewName(''); setExtraData({});
      onChange?.();
    } catch (e) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Eliminare "${item.name}"?`)) return;
    try {
      const r = await fetch(`${endpoint}/${item.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Errore eliminazione');
      toast.success('Eliminato');
      onChange?.();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{icon}{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Form aggiungi */}
          <div className="p-3 bg-slate-50 border-2 border-dashed rounded-lg space-y-2">
            <Label className="text-xs font-semibold">+ Aggiungi nuovo</Label>
            <Input placeholder="Nome..." value={newName} onChange={(e) => setNewName(e.target.value)} />
            {extraFields.includes('address') && <Input placeholder="Indirizzo (opz.)" value={extraData.address || ''} onChange={(e) => setExtraData({ ...extraData, address: e.target.value })} />}
            {extraFields.includes('city') && <Input placeholder="Città (opz.)" value={extraData.city || ''} onChange={(e) => setExtraData({ ...extraData, city: e.target.value })} />}
            <Button size="sm" onClick={addItem} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-3 h-3 mr-1" />Aggiungi
            </Button>
          </div>

          {/* Lista */}
          <div className="max-h-72 overflow-y-auto space-y-1">
            {items.length === 0 && <div className="text-center py-4 text-muted-foreground text-sm">Nessuna voce</div>}
            {items.map(it => (
              <div key={it.id} className="flex items-center justify-between p-2 bg-white border rounded">
                <div>
                  <div className="font-medium text-sm">{it.name}</div>
                  {it.address || it.city ? <div className="text-xs text-muted-foreground">{it.address}{it.address && it.city ? ', ' : ''}{it.city}</div> : null}
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteItem(it)}><X className="w-3.5 h-3.5 text-red-600" /></Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
