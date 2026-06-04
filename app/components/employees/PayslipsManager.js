'use client';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, FileText, Download, Upload, Calendar, CreditCard, Mail, X } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_BADGES = {
  PENDING: { label: '🔴 Da Pagare', color: 'bg-red-100 text-red-700' },
  PARTIAL: { label: '🟡 Parziale',   color: 'bg-amber-100 text-amber-700' },
  PAID:    { label: '🟢 Pagato',     color: 'bg-emerald-100 text-emerald-700' },
};

const METHODS = [
  { value: 'BONIFICO', label: '🏦 Bonifico' },
  { value: 'CASH', label: '💵 Contanti' },
  { value: 'ASSEGNO', label: '📝 Assegno' },
  { value: 'SUMUP', label: '💳 Carta (SumUp)' },
  { value: 'ALTRO', label: '🔁 Altro' },
];

const MONTHS = ['','Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtEur = (n) => `€ ${(Number(n) || 0).toFixed(2).replace('.', ',')}`;

export default function PayslipsManager({ employee }) {
  const [payslips, setPayslips] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterYear, setFilterYear] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // For add-payment dialog
  const [paymentDialog, setPaymentDialog] = useState(null); // { payslip, payment }
  // For send email dialog
  const [emailDialog, setEmailDialog] = useState(null); // { payslip, recipients, subject, message }

  const load = async () => {
    if (!employee?.id) return;
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        fetch(`/api/employee-payslips?employee_id=${employee.id}`).then(r => r.json()),
        fetch(`/api/employee-contracts?employee_id=${employee.id}&status=ACTIVE`).then(r => r.json()),
      ]);
      setPayslips(Array.isArray(p) ? p : []);
      setContracts(Array.isArray(c) ? c : []);
    } catch (e) { toast.error('Errore: ' + e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [employee?.id]);

  const years = useMemo(() => Array.from(new Set(payslips.map(p => p.period_year))).sort((a,b) => b-a), [payslips]);

  const filtered = useMemo(() => payslips.filter(p => {
    if (filterYear !== 'ALL' && p.period_year !== Number(filterYear)) return false;
    if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
    return true;
  }), [payslips, filterYear, filterStatus]);

  const totals = useMemo(() => {
    const due = filtered.reduce((s, p) => s + (Number(p.due_amount) || 0), 0);
    const paid = filtered.reduce((s, p) => s + (Number(p.paid_amount) || 0), 0);
    return { due, paid, remaining: due - paid };
  }, [filtered]);

  const save = async () => {
    if (!editing.period_year || !editing.period_month) { toast.error('Anno e mese obbligatori'); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...editing,
        company_id: employee.company_id,
        employee_id: employee.id,
        employee_name: `${employee.last_name || ''} ${employee.first_name || ''}`.trim(),
      };
      if (editing.contract_id) {
        const c = contracts.find(x => x.id === editing.contract_id);
        if (c) payload.contract_type_label = c.contract_type_label;
      }
      const isNew = !editing.id;
      const url = isNew ? '/api/employee-payslips' : `/api/employee-payslips/${editing.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Errore');
      toast.success(isNew ? '💰 Busta paga creata' : 'Busta paga aggiornata');
      setEditing(null);
      load();
    } catch (e) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const del = async (p) => {
    if (!window.confirm(`Eliminare la busta paga di ${p.period_label}?`)) return;
    try {
      const r = await fetch(`/api/employee-payslips/${p.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Errore');
      toast.success('Eliminata');
      load();
    } catch (e) { toast.error(e.message); }
  };

  const addPayment = async () => {
    if (!paymentDialog?.payment?.amount || Number(paymentDialog.payment.amount) <= 0) {
      toast.error('Importo deve essere > 0'); return;
    }
    try {
      const r = await fetch(`/api/employee-payslips/${paymentDialog.payslip.id}?action=add-payment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentDialog.payment),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Errore');
      toast.success(`💰 Pagamento di ${fmtEur(paymentDialog.payment.amount)} registrato`);
      setPaymentDialog(null);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const removePayment = async (payslip, paymentId) => {
    if (!window.confirm('Eliminare questo pagamento?')) return;
    try {
      const r = await fetch(`/api/employee-payslips/${payslip.id}?action=remove-payment&payment_id=${paymentId}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Errore');
      toast.success('Pagamento rimosso');
      // Refresh editing if open
      if (editing?.id === payslip.id) {
        const refreshed = await fetch(`/api/employee-payslips/${payslip.id}`).then(x => x.json());
        setEditing(refreshed);
      }
      load();
    } catch (e) { toast.error(e.message); }
  };

  // === Generate PDF for single payslip ===
  const generatePayslipPDF = async (p) => {
    const [{ jsPDF }, atMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const autoTable = atMod.default || atMod;
    const doc = new jsPDF();
    doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(31, 41, 55);
    doc.text(`Busta Paga — ${p.period_label}`, 14, 18);
    doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(75, 85, 99);
    doc.text(`Dipendente: ${p.employee_name}`, 14, 26);
    if (p.contract_type_label) doc.text(`Contratto: ${p.contract_type_label}`, 14, 31);
    doc.text(`Generato: ${new Date().toLocaleString('it-IT')}`, 14, p.contract_type_label ? 36 : 31);

    autoTable(doc, {
      startY: 42,
      head: [['Voce', 'Importo']],
      body: [
        ['Ore lavorate', p.hours_worked ? String(p.hours_worked) : '—'],
        ['Paga oraria', p.hourly_rate ? fmtEur(p.hourly_rate) : '—'],
        ['Lordo', fmtEur(p.gross_amount)],
        ['Bonus / Premi', fmtEur(p.bonuses)],
        ['Trattenute', `- ${fmtEur(p.deductions)}`],
        ['NETTO', fmtEur(p.net_amount)],
        ['Dovuto', fmtEur(p.due_amount)],
        ['Pagato', fmtEur(p.paid_amount)],
        ['Residuo', fmtEur((Number(p.due_amount)||0) - (Number(p.paid_amount)||0))],
      ],
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    });

    if (p.payments?.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Data', 'Metodo', 'Importo', 'Note']],
        body: p.payments.map(x => [fmtDate(x.date), x.method, fmtEur(x.amount), x.note || '']),
        styles: { fontSize: 9, cellPadding: 1.5 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        margin: { left: 14, right: 14 },
        didDrawPage: (d) => {
          doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(31, 41, 55);
          doc.text('Storico Pagamenti', 14, doc.lastAutoTable.startY ? doc.lastAutoTable.startY - 4 : 100);
        },
      });
    }

    if (p.notes) {
      doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(75, 85, 99);
      const y = (doc.lastAutoTable?.finalY || 100) + 10;
      doc.text(`Note: ${p.notes}`, 14, y, { maxWidth: 180 });
    }

    return doc;
  };

  const exportPDF = async (p) => {
    try {
      const doc = await generatePayslipPDF(p);
      doc.save(`Busta_Paga_${p.period_year}_${String(p.period_month).padStart(2,'0')}_${(p.employee_name || '').replace(/\s+/g,'_')}.pdf`);
      toast.success('📄 PDF generato');
    } catch (e) { toast.error('Errore PDF: ' + e.message); }
  };

  const sendEmail = async () => {
    if (!emailDialog?.recipients) { toast.error('Inserisci email'); return; }
    const recList = emailDialog.recipients.split(/[,;\s]+/).map(s => s.trim()).filter(s => /@/.test(s));
    if (recList.length === 0) { toast.error('Nessuna email valida'); return; }
    try {
      const doc = await generatePayslipPDF(emailDialog.payslip);
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const p = emailDialog.payslip;
      const filename = `Busta_Paga_${p.period_year}_${String(p.period_month).padStart(2,'0')}_${(p.employee_name||'').replace(/\s+/g,'_')}.pdf`;
      let sent = 0;
      for (const to of recList) {
        const r = await fetch('/api/send-document-email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_email: to,
            subject: emailDialog.subject || `Busta Paga ${p.period_label} - ${p.employee_name}`,
            message: emailDialog.message || `In allegato la busta paga di ${p.period_label}.`,
            pdf_base64: pdfBase64,
            pdf_filename: filename,
            content_type: 'application/pdf',
            document_type: 'busta-paga',
            document_number: `${p.period_year}-${String(p.period_month).padStart(2,'0')}`,
            customer_name: p.employee_name || to.split('@')[0],
            company_id: p.company_id,
          }),
        });
        if (r.ok) sent++;
      }
      if (sent > 0) toast.success(`✉️ Email inviata a ${sent}/${recList.length}`);
      else toast.error('Nessuna email inviata');
      setEmailDialog(null);
    } catch (e) { toast.error(e.message); }
  };

  // Auto-calculate net from hours+rate-deductions+bonuses when editing
  useEffect(() => {
    if (!editing) return;
    const h = Number(editing.hours_worked) || 0;
    const r = Number(editing.hourly_rate) || 0;
    if (h > 0 && r > 0 && (editing._autoGross !== false)) {
      const gross = +(h * r).toFixed(2);
      const net = +(gross + (Number(editing.bonuses) || 0) - (Number(editing.deductions) || 0)).toFixed(2);
      if (gross !== editing.gross_amount || net !== editing.net_amount) {
        setEditing(prev => ({ ...prev, gross_amount: gross, net_amount: net, due_amount: net }));
      }
    }
    // eslint-disable-next-line
  }, [editing?.hours_worked, editing?.hourly_rate, editing?.bonuses, editing?.deductions]);

  return (
    <div className="space-y-3">
      {/* Header + filtri */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutti gli anni</SelectItem>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutti gli stati</SelectItem>
              {Object.entries(STATUS_BADGES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => {
            const now = new Date();
            const activeContract = contracts[0];
            setEditing({
              period_year: now.getFullYear(),
              period_month: now.getMonth() + 1,
              contract_id: activeContract?.id || null,
              hourly_rate: activeContract?.hourly_rate || null,
              hours_worked: activeContract?.weekly_hours ? Math.round(activeContract.weekly_hours * 4.33) : null,
              gross_amount: 0, deductions: 0, bonuses: 0, net_amount: 0, due_amount: 0,
              _autoGross: true,
            });
          }}>
          <Plus className="w-3 h-3 mr-1" />Nuova Busta Paga
        </Button>
      </div>

      {/* Totals card */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-lg p-3">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Dovuto</div>
            <div className="font-bold text-indigo-700">{fmtEur(totals.due)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Pagato</div>
            <div className="font-bold text-emerald-700">{fmtEur(totals.paid)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Residuo</div>
            <div className={`font-bold ${totals.remaining > 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmtEur(totals.remaining)}</div>
          </div>
        </div>
      )}

      {/* Lista buste paga */}
      {loading ? <div className="text-center py-6 text-muted-foreground text-sm">Caricamento…</div>
        : filtered.length === 0 ? (
          <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground text-sm">Nessuna busta paga registrata</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => {
              const sb = STATUS_BADGES[p.status] || STATUS_BADGES.PENDING;
              const remaining = (Number(p.due_amount)||0) - (Number(p.paid_amount)||0);
              return (
                <div key={p.id} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={sb.color}>{sb.label}</Badge>
                        <span className="font-semibold text-sm">📅 {p.period_label}</span>
                        {p.contract_type_label && <span className="text-xs text-muted-foreground">· {p.contract_type_label}</span>}
                      </div>
                      <div className="text-xs space-y-0.5">
                        <div>
                          <span className="text-muted-foreground">Netto: </span><strong>{fmtEur(p.net_amount)}</strong>
                          {p.hours_worked ? <span className="text-muted-foreground"> · {p.hours_worked}h × {fmtEur(p.hourly_rate)}/h</span> : null}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Dovuto: </span><strong className="text-indigo-700">{fmtEur(p.due_amount)}</strong>
                          <span className="text-muted-foreground"> · Pagato: </span><strong className="text-emerald-700">{fmtEur(p.paid_amount)}</strong>
                          {remaining > 0 && <span className="ml-2 text-red-600 font-semibold">Residuo: {fmtEur(remaining)}</span>}
                        </div>
                        {p.payments?.length > 0 && (
                          <div className="text-muted-foreground">💰 {p.payments.length} pagamento/i registrato/i</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 flex-wrap">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPaymentDialog({ payslip: p, payment: { date: new Date().toISOString().slice(0,10), amount: remaining > 0 ? remaining : 0, method: 'BONIFICO', note: '' } })}>
                        <CreditCard className="w-3 h-3 mr-1" />Pagamento
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => exportPDF(p)} title="PDF"><FileText className="w-3.5 h-3.5 text-sky-600" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEmailDialog({ payslip: p, recipients: employee.email || '', subject: '', message: '' })} title="Email"><Mail className="w-3.5 h-3.5 text-blue-600" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing({ ...p, _autoGross: false })} title="Modifica"><Edit className="w-3.5 h-3.5 text-amber-600" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(p)} title="Elimina"><Trash2 className="w-3.5 h-3.5 text-red-600" /></Button>
                    </div>
                  </div>
                  {p.payments?.length > 0 && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-indigo-600">Mostra pagamenti ({p.payments.length})</summary>
                      <div className="mt-1 space-y-1 pl-3 border-l-2 border-emerald-200">
                        {p.payments.map(pay => (
                          <div key={pay.id} className="flex items-center justify-between bg-emerald-50/50 rounded p-1.5">
                            <div>
                              <span className="font-medium">{fmtEur(pay.amount)}</span>
                              <span className="text-muted-foreground"> · {fmtDate(pay.date)} · {METHODS.find(m => m.value === pay.method)?.label || pay.method}</span>
                              {pay.note && <span className="text-muted-foreground"> · {pay.note}</span>}
                            </div>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removePayment(p, pay.id)}><X className="w-3 h-3 text-red-500" /></Button>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}

      {/* Dialog edit/create busta paga */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && !submitting && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? '💰 Modifica Busta Paga' : '➕ Nuova Busta Paga'}</DialogTitle>
            <DialogDescription>I valori vengono calcolati automaticamente da Ore × Paga Oraria. Modifica manualmente se necessario.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Anno *</Label>
                <Input type="number" value={editing.period_year || ''} onChange={(e) => setEditing({ ...editing, period_year: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs">Mese *</Label>
                <Select value={String(editing.period_month || '')} onValueChange={(v) => setEditing({ ...editing, period_month: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.slice(1).map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {contracts.length > 0 && (
                <div className="col-span-2">
                  <Label className="text-xs">Contratto di riferimento</Label>
                  <Select value={editing.contract_id || ''} onValueChange={(v) => {
                    const c = contracts.find(x => x.id === v);
                    setEditing({ ...editing, contract_id: v, hourly_rate: c?.hourly_rate || editing.hourly_rate });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Seleziona contratto attivo" /></SelectTrigger>
                    <SelectContent>{contracts.map(c => <SelectItem key={c.id} value={c.id}>{c.contract_type_label} · {fmtDate(c.start_date)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-xs">Ore Lavorate</Label>
                <Input type="number" step="0.5" value={editing.hours_worked ?? ''} onChange={(e) => setEditing({ ...editing, hours_worked: e.target.value, _autoGross: true })} placeholder="160" />
              </div>
              <div>
                <Label className="text-xs">Paga Oraria (€)</Label>
                <Input type="number" step="0.01" value={editing.hourly_rate ?? ''} onChange={(e) => setEditing({ ...editing, hourly_rate: e.target.value, _autoGross: true })} />
              </div>
              <div>
                <Label className="text-xs">Lordo (€)</Label>
                <Input type="number" step="0.01" value={editing.gross_amount ?? 0} onChange={(e) => setEditing({ ...editing, gross_amount: e.target.value, _autoGross: false })} />
              </div>
              <div>
                <Label className="text-xs">Bonus / Premi (€)</Label>
                <Input type="number" step="0.01" value={editing.bonuses ?? 0} onChange={(e) => setEditing({ ...editing, bonuses: e.target.value, _autoGross: true })} />
              </div>
              <div>
                <Label className="text-xs">Trattenute (€)</Label>
                <Input type="number" step="0.01" value={editing.deductions ?? 0} onChange={(e) => setEditing({ ...editing, deductions: e.target.value, _autoGross: true })} />
              </div>
              <div>
                <Label className="text-xs">Netto (€)</Label>
                <Input type="number" step="0.01" value={editing.net_amount ?? 0} onChange={(e) => setEditing({ ...editing, net_amount: e.target.value, _autoGross: false })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Dovuto al Dipendente (€) *</Label>
                <Input type="number" step="0.01" value={editing.due_amount ?? 0} onChange={(e) => setEditing({ ...editing, due_amount: e.target.value, _autoGross: false })} className="font-bold border-indigo-300" />
                <p className="text-[10px] text-muted-foreground mt-1">Importo effettivamente dovuto. Default = Netto.</p>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Note</Label>
                <Textarea rows={2} value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={submitting}>Annulla</Button>
            <Button onClick={save} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">{submitting ? 'Salvataggio…' : 'Salva'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog add payment */}
      <Dialog open={!!paymentDialog} onOpenChange={(o) => !o && setPaymentDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>💳 Registra Pagamento</DialogTitle>
            <DialogDescription>
              {paymentDialog && (<>Busta paga: <strong>{paymentDialog.payslip.period_label}</strong><br />Dovuto: {fmtEur(paymentDialog.payslip.due_amount)} · Pagato: {fmtEur(paymentDialog.payslip.paid_amount)} · Residuo: <strong className="text-red-600">{fmtEur((Number(paymentDialog.payslip.due_amount)||0) - (Number(paymentDialog.payslip.paid_amount)||0))}</strong></>)}
            </DialogDescription>
          </DialogHeader>
          {paymentDialog && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Importo (€) *</Label>
                <Input type="number" step="0.01" autoFocus value={paymentDialog.payment.amount}
                  onChange={(e) => setPaymentDialog({ ...paymentDialog, payment: { ...paymentDialog.payment, amount: e.target.value } })} />
              </div>
              <div>
                <Label className="text-xs">Data</Label>
                <Input type="date" value={paymentDialog.payment.date}
                  onChange={(e) => setPaymentDialog({ ...paymentDialog, payment: { ...paymentDialog.payment, date: e.target.value } })} />
              </div>
              <div>
                <Label className="text-xs">Metodo</Label>
                <Select value={paymentDialog.payment.method}
                  onValueChange={(v) => setPaymentDialog({ ...paymentDialog, payment: { ...paymentDialog.payment, method: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Note</Label>
                <Input value={paymentDialog.payment.note}
                  onChange={(e) => setPaymentDialog({ ...paymentDialog, payment: { ...paymentDialog.payment, note: e.target.value } })}
                  placeholder="es. Acconto 1/2" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(null)}>Annulla</Button>
            <Button onClick={addPayment} className="bg-emerald-600 hover:bg-emerald-700">Registra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog email */}
      <Dialog open={!!emailDialog} onOpenChange={(o) => !o && setEmailDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>📧 Invia Busta Paga via Email</DialogTitle>
            <DialogDescription>Allegato PDF della busta paga {emailDialog?.payslip?.period_label}</DialogDescription>
          </DialogHeader>
          {emailDialog && (
            <div className="space-y-3">
              <div><Label className="text-xs">Destinatari</Label>
                <Input value={emailDialog.recipients} onChange={(e) => setEmailDialog({ ...emailDialog, recipients: e.target.value })} placeholder="email@example.com" />
              </div>
              <div><Label className="text-xs">Oggetto</Label>
                <Input value={emailDialog.subject} onChange={(e) => setEmailDialog({ ...emailDialog, subject: e.target.value })} placeholder={`Busta Paga ${emailDialog.payslip.period_label}`} />
              </div>
              <div><Label className="text-xs">Messaggio</Label>
                <Textarea rows={3} value={emailDialog.message} onChange={(e) => setEmailDialog({ ...emailDialog, message: e.target.value })} placeholder="Buongiorno, in allegato la busta paga..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialog(null)}>Annulla</Button>
            <Button onClick={sendEmail} className="bg-blue-600 hover:bg-blue-700"><Mail className="w-4 h-4 mr-2" />Invia</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
