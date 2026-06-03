'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Building2, LogIn, BarChart3, CreditCard, TrendingUp, DollarSign, Calendar, Users, Eye, EyeOff, Ship, Compass, Plus, FileText, Mail, CheckCircle2, ExternalLink, Search, FileSpreadsheet, Filter, X, Upload, Receipt, RefreshCw, Languages } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { LanguageProvider, useLanguage } from '@/app/i18n/LanguageContext';
import { languageFlags, languageNames } from '@/app/i18n/translations';
const AgencyCalendarLazy = dynamic(() => import('@/app/components/AgencyCalendar'), { ssr: false });
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const NewBookingDialog = dynamic(() => import('@/app/components/NewBookingDialog'), { ssr: false });
const CommissionPieChart = dynamic(() => import('@/app/components/CommissionPieChart'), { ssr: false });

const API_BASE = '/api';

export default function AgencyB2BPortal() {
  return (
    <LanguageProvider>
      <AgencyB2BPortalInner />
    </LanguageProvider>
  );
}

function AgencyB2BPortalInner() {
  const { language, changeLanguage, t } = useLanguage();
  const params = useParams();
  const slug = params?.slug;
  
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agency, setAgency] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [experiences, setExperiences] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({});
  const [showNewBookingDialog, setShowNewBookingDialog] = useState(false);
  const [prefillExperienceId, setPrefillExperienceId] = useState(null);
  const [showCommissionChart, setShowCommissionChart] = useState(false);

  // Filtri Report (clonati dalla company)
  const [filters, setFilters] = useState({
    code: '', customer_name: '', experience_id: '',
    payment_method: '', status: '', date_from: '', date_to: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  // Loading dei singoli bottoni (voucher/email/confirm)
  const [actionLoading, setActionLoading] = useState({});
  // Dialog upload ricevuta pagamento
  const [receiptDialog, setReceiptDialog] = useState({ open: false, booking: null });
  const [receiptForm, setReceiptForm] = useState({ payment_method: 'BANK_TRANSFER', notes: '', file: null, filePreview: null });
  const [receiptSubmitting, setReceiptSubmitting] = useState(false);

  // Anteprima / Modifica / Cancellazione prenotazione
  const [previewBk, setPreviewBk] = useState(null);
  const [editBk, setEditBk] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Helper: l'agenzia può cancellare/rimborsare solo se non è già stato incassato dalla company
  // (CASH/CARD/ONLINE/BANK_TRANSFER su CONFIRMED = rimborso solo company/super)
  const canCancelBooking = (b) => {
    if (!b) return false;
    const pm = b.payment_method;
    const status = b.status;
    if (pm === 'AGENCY' || pm === 'FREE' || !pm) return true;
    if (status === 'PENDING_CONFIRMATION' || status === 'PENDING_VERIFICATION' || status === 'PENDING') return true;
    if (status === 'CONFIRMED' && ['ONLINE','CARD','CASH','DIRECT','BANK_TRANSFER'].includes(pm)) return false;
    return true;
  };

  // Modifica prenotazione (PUT /api/bookings/:id)
  const saveEditBooking = async () => {
    if (!editBk?.id) return;
    setEditSubmitting(true);
    try {
      const payload = {
        customer_name: editForm.customer_name,
        customer_email: editForm.customer_email,
        customer_phone: editForm.customer_phone,
        special_requests: editForm.special_requests || '',
        seats: Number(editForm.seats || editBk.seats),
      };
      const r = await fetch(`${API_BASE}/bookings/${editBk.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Errore aggiornamento');
      toast.success('Prenotazione aggiornata');
      setEditBk(null);
      // Ricarica lista
      const bk = await fetch(`${API_BASE}/bookings?agency_id=${agency.id}`);
      const bkData = await bk.json();
      setBookings(Array.isArray(bkData) ? bkData : []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Cancella prenotazione
  const cancelBookingB2B = async (b) => {
    if (!canCancelBooking(b)) {
      toast.error('Incasso già nelle casse della company. Contattare amministrazione per il rimborso.');
      return;
    }
    if (!window.confirm(`Cancellare prenotazione ${b.booking_ref} di ${b.customer_name}?`)) return;
    try {
      const r = await fetch(`${API_BASE}/bookings/${b.id}`, { method: 'DELETE' });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error || 'Errore cancellazione');
      }
      toast.success(`Prenotazione ${b.booking_ref} cancellata`);
      const bk = await fetch(`${API_BASE}/bookings?agency_id=${agency.id}`);
      const bkData = await bk.json();
      setBookings(Array.isArray(bkData) ? bkData : []);
    } catch (e) {
      toast.error(e.message);
    }
  };

  // Carica dati società
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await fetch(`${API_BASE}/companies?slug=${slug}`);
        const data = await res.json();
        if (data && data.id) {
          // Blocca accesso se company sospesa
          if (data.is_active === false) {
            setCompany({ ...data, _suspended: true });
            toast.error('Servizio temporaneamente sospeso');
          } else {
            setCompany(data);
          }
        } else {
          toast.error('Società non trovata');
        }
      } catch (err) {
        console.error('Error fetching company:', err);
        toast.error('Errore nel caricamento');
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchCompany();
  }, [slug]);

  // Carica dati agenzia dopo login
  useEffect(() => {
    if (agency && company) {
      loadAgencyData();
    }
  }, [agency, company]);

  const loadAgencyData = async () => {
    try {
      // Carica esperienze della società
      const [exps, bks] = await Promise.all([
        fetch(`${API_BASE}/experiences?company_id=${company.id}`).then(r => r.json()),
        fetch(`${API_BASE}/bookings?agency_id=${agency.id}`).then(r => r.json())
      ]);
      
      const expsArr = Array.isArray(exps) ? exps : [];
      const bksArr = Array.isArray(bks) ? bks : [];
      setExperiences(expsArr);
      setBookings(bksArr);
      
      // Calcola statistiche (CONFIRMED) usando la stessa logica di getBookingPrices con sconto agenzia
      const discountPct = Number(agency?.discount_percentage) || 0;
      const confirmedBookings = bksArr.filter(b => b.status === 'CONFIRMED');
      let totalRevenue = 0;
      let totalCommission = 0;
      confirmedBookings.forEach(b => {
        const seats = Number(b.seats) || 0;
        let b2cUnit = Number(b.b2c_price ?? b.price_b2c ?? 0) || 0;
        if (!b2cUnit) {
          const exp = expsArr.find(e => e.id === b.experience_id);
          if (exp) {
            const slotDate = (b.slot_datetime || '').split('T')[0];
            let chosen = null;
            if (slotDate && Array.isArray(exp.price_tiers)) {
              chosen = exp.price_tiers.find(t => (!t.start_date || slotDate >= t.start_date) && (!t.end_date || slotDate <= t.end_date));
            }
            b2cUnit = Number(chosen?.price_b2c ?? exp.price_b2c) || 0;
          }
        }
        if (!b2cUnit && seats && b.total_amount) {
          b2cUnit = Number(b.total_amount) / seats;
        }
        const b2cTot = b2cUnit * seats;
        const comm = b2cTot * (discountPct / 100);
        totalCommission += comm;
        totalRevenue += (b2cTot - comm);
      });
      
      setStats({
        total_bookings: confirmedBookings.length,
        total_revenue: totalRevenue,
        total_commission: totalCommission
      });
    } catch (err) {
      console.error('Error loading agency data:', err);
    }
  };

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      toast.error('Inserisci email e password');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/agencies/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      
      const data = await res.json();
      
      if (data.error) {
        toast.error(data.error);
        return;
      }
      
      // Verifica che l'agenzia appartenga alla società corretta
      if (data.agency.company_id !== company.id) {
        toast.error('Questa agenzia non appartiene a questa società');
        return;
      }
      
      setAgency(data.agency);
      toast.success(`${t('b2b_welcome')} ${data.agency.name}!`);
    } catch (err) {
      console.error('Login error:', err);
      toast.error(t('b2b_invalid_credentials'));
    }
  };

  const handleLogout = () => {
    setAgency(null);
    setLoginForm({ email: '', password: '' });
    toast.success(t('b2b_logout'));
  };

  const fmtPrice = (val) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(val) || 0);
  const fmtDate = (d) => {
    if (!d) return 'N/A';
    try { return format(new Date(d), 'dd MMM yyyy', { locale: it }); } 
    catch { return 'N/A'; }
  };

  const getExpName = (expId) => {
    const exp = experiences.find(e => e.id === expId);
    return exp ? exp.name : 'N/A';
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PENDING_VERIFICATION: 'bg-orange-100 text-orange-800',
      HELD: 'bg-amber-100 text-amber-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-blue-100 text-blue-800'
    };
    const labels = {
      PENDING: t('b2b_status_pending'),
      PENDING_VERIFICATION: t('b2b_status_pending_verification'),
      HELD: t('b2b_status_held'),
      CONFIRMED: t('b2b_status_confirmed'),
      CANCELLED: t('b2b_status_cancelled'),
      COMPLETED: t('b2b_status_completed')
    };
    return <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>{labels[status] || status}</Badge>;
  };

  // Label metodo pagamento
  const PM_LABEL = {
    ONLINE: 'SumUp/Online', CARD: 'SumUp/Online', SUMUP: 'SumUp/Online', STRIPE: 'Stripe',
    BANK_TRANSFER: 'Bonifico', CASH: 'Contanti', DIRECT: 'Cassa Diretta',
    MANUAL: 'Manuale', AGENCY: 'Agenzia', FREE: 'Omaggio', NONE: '—',
  };
  const PM_COLOR = (m) => ({
    ONLINE: 'bg-violet-100 text-violet-800', CARD: 'bg-violet-100 text-violet-800', SUMUP: 'bg-violet-100 text-violet-800',
    STRIPE: 'bg-indigo-100 text-indigo-800',
    BANK_TRANSFER: 'bg-blue-100 text-blue-800',
    CASH: 'bg-emerald-100 text-emerald-800', DIRECT: 'bg-emerald-100 text-emerald-800',
    MANUAL: 'bg-orange-100 text-orange-800', AGENCY: 'bg-amber-100 text-amber-800', FREE: 'bg-pink-100 text-pink-800',
  }[m] || 'bg-gray-100 text-gray-700');

  // Filtri applicati
  const filteredBookings = (bookings || []).filter(b => {
    if (filters.code && !(b.booking_ref || '').toLowerCase().includes(filters.code.toLowerCase())) return false;
    if (filters.customer_name && !(b.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase())) return false;
    if (filters.experience_id && b.experience_id !== filters.experience_id) return false;
    if (filters.payment_method && (b.payment_method || 'NONE') !== filters.payment_method) return false;
    if (filters.status && b.status !== filters.status) return false;
    if (filters.date_from && (b.slot_datetime || '').split('T')[0] < filters.date_from) return false;
    if (filters.date_to && (b.slot_datetime || '').split('T')[0] > filters.date_to) return false;
    return true;
  });

  // Helper: ricava prezzi B2C/B2B per una singola prenotazione, con fallback su experience.price_tiers se assenti sul booking
  // Provvigione SEMPRE calcolata su agency.discount_percentage (la % di sconto/provvigione impostata nell'anagrafica agenzia)
  const getBookingPrices = (b) => {
    const seats = Number(b.seats) || 0;
    // Booking salva b2c_price / b2b_price come PREZZO UNITARIO
    let b2cUnit = Number(b.b2c_price ?? b.price_b2c ?? 0) || 0;
    let b2bUnit = Number(b.b2b_price ?? b.price_b2b ?? 0) || 0;
    // Fallback se mancanti: usa l'esperienza
    if (!b2cUnit || !b2bUnit) {
      const exp = (experiences || []).find(e => e.id === b.experience_id);
      if (exp) {
        // Cerca tier valida per la data slot
        const slotDate = (b.slot_datetime || '').split('T')[0];
        let chosen = null;
        if (slotDate && Array.isArray(exp.price_tiers)) {
          chosen = exp.price_tiers.find(t => (!t.start_date || slotDate >= t.start_date) && (!t.end_date || slotDate <= t.end_date));
        }
        if (!b2cUnit) b2cUnit = Number(chosen?.price_b2c ?? exp.price_b2c) || 0;
        if (!b2bUnit) b2bUnit = Number(chosen?.price_b2b ?? exp.price_b2b) || 0;
      }
    }
    // Ultimo fallback: deriva b2cUnit dal total_amount/seats
    if (!b2cUnit && seats && b.total_amount) {
      b2cUnit = Number(b.total_amount) / seats;
    }
    const b2cTotal = b2cUnit * seats;
    // PROVVIGIONE = B2C * % sconto agenzia SOLO se prenotazione CONFERMATA (pagamento confermato)
    const discountPct = Number(agency?.discount_percentage) || 0;
    const isConfirmed = b.status === 'CONFIRMED';
    const commission = isConfirmed ? (b2cTotal * (discountPct / 100)) : 0;
    // B2B effettivo per l'agenzia = B2C - provvigione (se non confermata, B2B = B2C)
    const b2bTotal = b2cTotal - commission;
    // Per coerenza ricalcolo b2bUnit dal b2bTotal
    const b2bUnitEffective = seats > 0 ? (b2bTotal / seats) : b2bUnit;
    return { b2cUnit, b2bUnit: b2bUnitEffective, b2cTotal, b2bTotal, commission };
  };

  // Totali dinamici basati sui filtri (usa getBookingPrices per coerenza con provvigione su % agenzia)
  const totals = {
    count: filteredBookings.length,
    seats: filteredBookings.reduce((s, b) => s + (Number(b.seats) || 0), 0),
    revenue: filteredBookings.reduce((s, b) => s + getBookingPrices(b).b2bTotal, 0),
    b2c_revenue: filteredBookings.reduce((s, b) => s + getBookingPrices(b).b2cTotal, 0),
    commission: filteredBookings.reduce((s, b) => s + getBookingPrices(b).commission, 0),
  };

  // ============ AZIONI BOOKING ============
  const setLoadingFor = (id, key, val) => {
    setActionLoading(prev => ({ ...prev, [`${id}_${key}`]: val }));
  };

  const downloadVoucher = async (booking) => {
    setLoadingFor(booking.id, 'voucher', true);
    try {
      const { downloadVoucherPdf } = await import('@/app/lib/voucherPdf');
      const exp = experiences.find(e => e.id === booking.experience_id) || null;
      const isPaid = booking.status === 'CONFIRMED' || booking.payment_status === 'PAID';
      await downloadVoucherPdf(booking, exp, company, {
        type: isPaid ? 'FINAL' : 'PROVISIONAL',
        agencyName: agency?.name,
        agencyEmail: agency?.email,
        agencyPhone: agency?.phone,
      });
      toast.success('Voucher scaricato');
    } catch (e) {
      console.error(e);
      toast.error('Errore generazione voucher');
    } finally {
      setLoadingFor(booking.id, 'voucher', false);
    }
  };

  const sendVoucherEmail = async (booking) => {
    setLoadingFor(booking.id, 'email', true);
    try {
      const r = await fetch(`${API_BASE}/send-booking-voucher`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id }),
      });
      if (!r.ok) {
        const t = await r.text();
        let msg = 'Errore invio'; try { msg = (JSON.parse(t)?.error || msg); } catch { /* */ }
        throw new Error(msg);
      }
      toast.success(`📧 Voucher inviato a ${booking.customer_email}`);
    } catch (e) {
      toast.error('Errore email: ' + (e?.message || ''));
    } finally {
      setLoadingFor(booking.id, 'email', false);
    }
  };

  const openReceiptDialog = (booking) => {
    setReceiptForm({
      payment_method: booking.payment_method && booking.payment_method !== 'NONE' ? booking.payment_method : 'BANK_TRANSFER',
      notes: '',
      file: null,
      filePreview: booking.bank_transfer_receipt_url || null,
    });
    setReceiptDialog({ open: true, booking });
  };

  const handleReceiptFile = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File troppo grande (max 5 MB)');
      return;
    }
    setReceiptForm(prev => ({ ...prev, file, filePreview: URL.createObjectURL(file) }));
  };

  const submitReceipt = async () => {
    const b = receiptDialog.booking;
    if (!b) return;
    if (!receiptForm.file && !receiptForm.filePreview) {
      toast.error('Carica una ricevuta o un\'immagine del pagamento');
      return;
    }
    setReceiptSubmitting(true);
    try {
      let receiptUrl = receiptForm.filePreview;
      // Se è stato selezionato un nuovo file, fai upload (comprimi se immagine)
      if (receiptForm.file) {
        const f = receiptForm.file;
        const isImg = (f.type || '').startsWith('image/');
        let base64;
        if (isImg) {
          // Compressione lato client
          base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const img = new Image();
              img.onload = () => {
                const MAX = 1600;
                let w = img.naturalWidth, h = img.naturalHeight;
                if (w > MAX || h > MAX) {
                  const r = Math.min(MAX / w, MAX / h);
                  w = Math.round(w * r); h = Math.round(h * r);
                }
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(c.toDataURL('image/jpeg', 0.82));
              };
              img.onerror = reject;
              img.src = reader.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(f);
          });
        } else {
          // PDF o altro: encoda direttamente in base64
          base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(f);
          });
        }
        const upRes = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: [base64] }),
        });
        const upText = await upRes.text();
        let upData;
        try { upData = JSON.parse(upText); } catch { upData = {}; }
        if (!upRes.ok || upData?.error) throw new Error(upData?.error || `Upload fallito (HTTP ${upRes.status})`);
        receiptUrl = upData?.urls?.[0];
        if (!receiptUrl) throw new Error('URL ricevuta non restituito dal server');
      }

      // Aggiorna il booking: setta payment_method, bank_transfer_receipt_url e status PENDING_VERIFICATION
      const updateRes = await fetch(`${API_BASE}/bookings/${b.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: receiptForm.payment_method,
          bank_transfer_receipt_url: receiptUrl,
          bank_transfer_notes: receiptForm.notes || '',
          status: 'PENDING_VERIFICATION',
          payment_status: 'PENDING',
        }),
      });
      if (!updateRes.ok) {
        const t = await updateRes.text();
        throw new Error(`Errore salvataggio (HTTP ${updateRes.status}) ${t.slice(0, 80)}`);
      }
      toast.success('✅ Ricevuta caricata. La Company verificherà e confermerà il pagamento.');
      setReceiptDialog({ open: false, booking: null });
      setReceiptForm({ payment_method: 'BANK_TRANSFER', notes: '', file: null, filePreview: null });
      loadAgencyData(agency);
    } catch (e) {
      console.error(e);
      toast.error('Errore: ' + (e?.message || 'sconosciuto'));
    } finally {
      setReceiptSubmitting(false);
    }
  };

  // Export Excel
  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const rows = filteredBookings.map(b => {
        const p = getBookingPrices(b);
        return {
          'Codice': b.booking_ref,
          'Cliente': b.customer_name,
          'Email': b.customer_email,
          'Esperienza': getExpName(b.experience_id),
          'Data': b.slot_datetime ? new Date(b.slot_datetime).toLocaleDateString('it-IT') : '-',
          'Posti': b.seats,
          'Prezzo B2C': p.b2cTotal,
          'Prezzo B2B': p.b2bTotal,
          'Provvigione': p.commission,
          'Totale': Number(b.total_amount) || p.b2bTotal,
          'Metodo Pagamento': PM_LABEL[b.payment_method] || (b.payment_method || ''),
          'Stato Pagamento': b.payment_status || '',
          'Stato': b.status,
        };
      });
      rows.push({ 'Codice': '', 'Cliente': '', 'Email': '', 'Esperienza': '', 'Data': '',
        'Posti': totals.seats, 'Prezzo B2C': totals.b2c_revenue, 'Prezzo B2B': totals.revenue, 'Provvigione': totals.commission,
        'Totale': totals.revenue, 'Metodo Pagamento': '', 'Stato Pagamento': '', 'Stato': 'TOTALE' });
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 25 }, { wch: 26 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Prenotazioni');
      XLSX.writeFile(wb, `${agency?.name || 'agenzia'}_prenotazioni_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('✅ Excel esportato');
    } catch (e) { console.error(e); toast.error('Errore export Excel'); }
  };

  // Export PDF
  const exportPDF = async () => {
    try {
      const [{ jsPDF }, atMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const autoTable = atMod.default || atMod;
      const doc = new jsPDF('l');
      doc.setFontSize(16).text(`Prenotazioni Agenzia - ${agency?.name || ''}`, 14, 16);
      doc.setFontSize(9).text(`Generato: ${new Date().toLocaleString('it-IT')} · Risultati: ${totals.count}`, 14, 22);
      autoTable(doc, {
        startY: 30,
        head: [['Codice', 'Cliente', 'Esperienza', 'Data', 'Posti', 'Pagamento', 'Stato', 'Prezzo B2C', 'Prezzo B2B', 'Provvigione']],
        body: filteredBookings.map(b => {
          const p = getBookingPrices(b);
          return [
            b.booking_ref,
            b.customer_name || '-',
            getExpName(b.experience_id),
            b.slot_datetime ? new Date(b.slot_datetime).toLocaleDateString('it-IT') : '-',
            b.seats,
            PM_LABEL[b.payment_method] || (b.payment_method || '—'),
            b.status,
            fmtPrice(p.b2cTotal),
            fmtPrice(p.b2bTotal),
            fmtPrice(p.commission),
          ];
        }),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [99, 102, 241] },
        foot: [['', '', '', '', totals.seats, '', 'TOTALE', fmtPrice(totals.b2c_revenue), fmtPrice(totals.revenue), fmtPrice(totals.commission)]],
        footStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      });
      doc.save(`${agency?.name || 'agenzia'}_prenotazioni_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('✅ PDF esportato');
    } catch (e) { console.error(e); toast.error('Errore export PDF'); }
  };

  const TypeBadge = ({ type }) => {
    const colors = {
      GITA_GOMMONE: 'bg-sky-100 text-sky-800',
      GITA_BARCA: 'bg-blue-100 text-blue-800',
      VISITA_GUIDATA: 'bg-emerald-100 text-emerald-800',
      NOLEGGIO_NATANTE: 'bg-amber-100 text-amber-800'
    };
    const labels = {
      GITA_GOMMONE: 'Gita in Gommone',
      GITA_BARCA: 'Gita in Barca',
      VISITA_GUIDATA: 'Visita Guidata',
      NOLEGGIO_NATANTE: 'Noleggio Natante'
    };
    return <Badge className={colors[type] || 'bg-gray-100'}>{labels[type] || type}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-600">Società non trovata</CardTitle>
            <CardDescription>La società richiesta non esiste</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Company sospesa - blocca completamente accesso
  if (company._suspended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-amber-300">
          <CardHeader className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <EyeOff className="w-8 h-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl text-amber-800">Servizio Sospeso</CardTitle>
            <CardDescription className="text-base">
              Il portale B2B di <strong>{company.name}</strong> e&apos; temporaneamente sospeso.<br />
              Per maggiori informazioni contatta l&apos;assistenza.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Branding della società
  const logoUrl = company.logo_url || 'https://via.placeholder.com/150x50?text=Logo';
  const primaryColor = company.primary_color || '#0f766e';
  const secondaryColor = company.secondary_color || '#14b8a6';

  // LOGIN SCREEN
  if (!agency) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md shadow-xl relative">
          {/* Selettore lingua in alto a destra */}
          <div className="absolute top-3 right-3 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="text-xl">{languageFlags[language]}</span>
                  <Languages className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                {Object.keys(languageFlags).map((lang) => (
                  <DropdownMenuItem
                    key={lang}
                    onClick={() => changeLanguage(lang)}
                    className={`gap-2 cursor-pointer ${language === lang ? 'bg-primary/10' : ''}`}
                  >
                    <span className="text-xl">{languageFlags[lang]}</span>
                    <span>{languageNames[lang]}</span>
                    {language === lang && <CheckCircle2 className="w-4 h-4 ml-auto text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardHeader className="text-center space-y-4">
            {/* Logo società */}
            <div className="flex justify-center">
              <img src={logoUrl} alt={company.name} className="h-16 object-contain" />
            </div>
            
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: primaryColor }}>
              <Building2 className="w-8 h-8 text-white" />
            </div>
            
            <CardTitle className="text-2xl">{t('b2b_portal')}</CardTitle>
            <CardDescription className="text-base">
              {t('b2b_login_subtitle')} {company.name}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">{t('b2b_email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="agenzia@example.com"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            
            <div>
              <Label htmlFor="password">{t('b2b_password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? t('b2b_password') : t('b2b_password')}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <Button 
              className="w-full text-white" 
              onClick={handleLogin}
              style={{ backgroundColor: primaryColor }}
            >
              <LogIn className="w-4 h-4 mr-2" />
              {t('b2b_login_btn')}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              🔒 {t('b2b_authorized_only')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // DASHBOARD AGENZIA
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logoUrl} alt={company.name} className="h-10 object-contain" />
              <div className="border-l pl-4">
                <h1 className="text-lg font-semibold text-gray-900">{agency.name}</h1>
                <p className="text-sm text-muted-foreground">{t('b2b_portal')} - {company.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <span className="text-xl">{languageFlags[language]}</span>
                    <Languages className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px]">
                  {Object.keys(languageFlags).map((lang) => (
                    <DropdownMenuItem
                      key={lang}
                      onClick={() => changeLanguage(lang)}
                      className={`gap-2 cursor-pointer ${language === lang ? 'bg-primary/10' : ''}`}
                    >
                      <span className="text-xl">{languageFlags[lang]}</span>
                      <span>{languageNames[lang]}</span>
                      {language === lang && <CheckCircle2 className="w-4 h-4 ml-auto text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={handleLogout}>
                {t('b2b_logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          {/* === BANDA AZIONI RAPIDE B2B === */}
          <div className="flex flex-wrap items-center gap-2 bg-gradient-to-r from-fuchsia-600 via-pink-500 to-rose-500 p-2 rounded-lg shadow-lg w-full">
            <div className="flex items-center gap-2 px-3 mr-2 text-white font-semibold text-xs uppercase tracking-wider border-r border-white/40 pr-3 drop-shadow">
              <Plus className="w-4 h-4" />{t('b2b_quick_actions')}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowNewBookingDialog(true)}
              className="bg-white text-rose-700 hover:bg-rose-50 font-semibold shadow-md border border-white/40 h-9"
              title={t('b2b_create_experience_booking')}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <CreditCard className="w-4 h-4 mr-1.5" />
              {t('b2b_create_experience_booking')}
            </Button>
          </div>

          <TabsList className="bg-slate-200/80 border border-slate-300 shadow-sm p-1 h-auto">
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md data-[state=active]:font-semibold text-slate-700 hover:text-slate-900 font-medium px-4 py-2"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {t('b2b_dashboard')}
            </TabsTrigger>
            <TabsTrigger
              value="experiences"
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md data-[state=active]:font-semibold text-slate-700 hover:text-slate-900 font-medium px-4 py-2"
            >
              <Compass className="w-4 h-4 mr-2" />
              {t('b2b_experiences')}
            </TabsTrigger>
            <TabsTrigger
              value="bookings"
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md data-[state=active]:font-semibold text-slate-700 hover:text-slate-900 font-medium px-4 py-2"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {t('b2b_bookings')}
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md data-[state=active]:font-semibold text-slate-700 hover:text-slate-900 font-medium px-4 py-2"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {t('b2b_calendar')}
            </TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('b2b_total_bookings')}</p>
                      <p className="text-3xl font-bold mt-2">{stats.total_bookings || 0}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('b2b_b2b_revenue')}</p>
                      <p className="text-3xl font-bold mt-2">{fmtPrice(stats.total_revenue)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                onClick={() => setShowCommissionChart(true)}
                className="cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowCommissionChart(true); }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('b2b_commissions')}</p>
                      <p className="text-3xl font-bold mt-2">{fmtPrice(stats.total_commission)}</p>
                      <p className="text-[10px] text-purple-600 mt-1 font-medium">{t('b2b_click_to_see_chart')}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Info Agenzia */}
            <Card>
              <CardHeader>
                <CardTitle>{t('b2b_agency_info')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('b2b_email')}</p>
                    <p className="font-medium">{agency.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('b2b_phone')}</p>
                    <p className="font-medium">{agency.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('b2b_vat')}</p>
                    <p className="font-medium">{agency.vat_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('b2b_discount')}</p>
                    <Badge className="bg-green-100 text-green-800">{agency.discount_percentage || 0}%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Esperienze */}
          <TabsContent value="experiences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('b2b_available_experiences')} ({experiences.length})</CardTitle>
                <CardDescription>{t('b2b_catalog_subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {experiences.map(exp => (
                    <Card key={exp.id} className="overflow-hidden">
                      <div className="flex">
                        {exp.images?.[0] && (
                          <img 
                            src={exp.images[0]} 
                            alt={exp.name} 
                            className="w-32 h-32 object-cover"
                          />
                        )}
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">{exp.name}</h3>
                              <TypeBadge type={exp.type} />
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {exp.description || '—'}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                                {fmtPrice(exp.price_b2c)}
                              </p>
                              <p className="text-xs text-muted-foreground">{t('b2b_per_person')}</p>
                            </div>
                          </div>
                          <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                            <span>⏱️ {Math.floor((exp.duration_minutes || 0) / 60)}h</span>
                            <span>👥 Max {exp.max_capacity} {t('b2b_col_seats').toLowerCase()}</span>
                            {exp.meeting_point && <span>📍 {exp.meeting_point}</span>}
                          </div>
                          <div className="mt-3 flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => { setPrefillExperienceId(exp.id); setShowNewBookingDialog(true); }}
                              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm"
                            >
                              <Plus className="w-4 h-4 mr-2" />{t('b2b_create_booking')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {experiences.length === 0 && (
                    <div className="text-center py-12">
                      <Compass className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">{t('b2b_no_experiences')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prenotazioni */}
          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle>{t('b2b_your_bookings')} ({totals.count} / {bookings.length})</CardTitle>
                    <CardDescription>
                      {t('b2b_bookings_history')} · {t('b2b_total')} {fmtPrice(totals.revenue)}
                      {' · '}
                      {t('b2b_comm')} <span className="text-emerald-700 font-semibold">{fmtPrice(totals.commission)}</span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                      <Filter className="w-4 h-4 mr-2" />{showFilters ? t('b2b_hide_filters') : t('b2b_filters')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => loadAgencyData()} title={t('b2b_refresh')}>
                      <RefreshCw className="w-4 h-4 mr-2" />{t('b2b_refresh')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportExcel}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportPDF}>
                      <FileText className="w-4 h-4 mr-2" />PDF
                    </Button>
                    <Button
                      onClick={() => setShowNewBookingDialog(true)}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
                    >
                      <Plus className="w-4 h-4 mr-2" />{t('b2b_create_booking')}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Pannello filtri */}
              {showFilters && (
                <CardContent className="border-y bg-muted/30 py-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Codice</Label>
                      <Input value={filters.code} onChange={(e) => setFilters({ ...filters, code: e.target.value })} placeholder="MK-2026-..." />
                    </div>
                    <div>
                      <Label className="text-xs">Cliente</Label>
                      <Input value={filters.customer_name} onChange={(e) => setFilters({ ...filters, customer_name: e.target.value })} placeholder="Nome cliente" />
                    </div>
                    <div>
                      <Label className="text-xs">Esperienza</Label>
                      <select className="w-full h-9 border rounded-md px-2 text-sm bg-white" value={filters.experience_id} onChange={(e) => setFilters({ ...filters, experience_id: e.target.value })}>
                        <option value="">Tutte</option>
                        {experiences.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Metodo Pagamento</Label>
                      <select className="w-full h-9 border rounded-md px-2 text-sm bg-white" value={filters.payment_method} onChange={(e) => setFilters({ ...filters, payment_method: e.target.value })}>
                        <option value="">Tutti</option>
                        <option value="ONLINE">SumUp/Online</option>
                        <option value="BANK_TRANSFER">Bonifico</option>
                        <option value="CASH">Contanti</option>
                        <option value="DIRECT">Cassa Diretta</option>
                        <option value="MANUAL">Manuale</option>
                        <option value="AGENCY">Agenzia</option>
                        <option value="FREE">Omaggio</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Stato</Label>
                      <select className="w-full h-9 border rounded-md px-2 text-sm bg-white" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                        <option value="">Tutti</option>
                        <option value="CONFIRMED">Confermata</option>
                        <option value="HELD">In sospeso</option>
                        <option value="PENDING_VERIFICATION">Verifica Bonifico</option>
                        <option value="CANCELLED">Annullata</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Data Da</Label>
                      <Input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Data A</Label>
                      <Input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
                    </div>
                    <div className="flex items-end">
                      <Button variant="ghost" size="sm" onClick={() => setFilters({ code: '', customer_name: '', experience_id: '', payment_method: '', status: '', date_from: '', date_to: '' })}>
                        <X className="w-4 h-4 mr-1" />Reset
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}

              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left bg-muted/50">
                        <th className="p-3 font-medium">{t('b2b_col_code')}</th>
                        <th className="p-3 font-medium">{t('b2b_col_customer')}</th>
                        <th className="p-3 font-medium">{t('b2b_col_experience')}</th>
                        <th className="p-3 font-medium">{t('b2b_col_date')}</th>
                        <th className="p-3 font-medium">{t('b2b_col_seats')}</th>
                        <th className="p-3 font-medium">{t('b2b_col_b2c_price')}</th>
                        <th className="p-3 font-medium">{t('b2b_col_b2b_price')}</th>
                        <th className="p-3 font-medium">{t('b2b_col_commission')}</th>
                        <th className="p-3 font-medium">{t('b2b_col_payment')}</th>
                        <th className="p-3 font-medium">{t('b2b_col_status')}</th>
                        <th className="p-3 font-medium text-center">{t('b2b_col_actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map(booking => {
                        const isPaid = booking.status === 'CONFIRMED' || booking.payment_status === 'PAID';
                        const isPendingBT = booking.status === 'PENDING_VERIFICATION';
                        const isOnlinePending = (booking.payment_method === 'ONLINE' || booking.payment_method === 'PAYMENT_LINK') && !isPaid && (booking.status === 'PENDING_PAYMENT' || booking.sumup_hosted_url);
                        const pm = booking.payment_method || 'NONE';
                        const lFor = (k) => actionLoading[`${booking.id}_${k}`];
                        const prices = getBookingPrices(booking);
                        return (
                          <tr key={booking.id} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-mono text-xs">{booking.booking_ref}</td>
                            <td className="p-3">{booking.customer_name}</td>
                            <td className="p-3">{getExpName(booking.experience_id)}</td>
                            <td className="p-3 text-xs">{fmtDate(booking.slot_datetime)}</td>
                            <td className="p-3">{booking.seats}</td>
                            <td className="p-3 font-semibold text-blue-700" title={`${booking.seats} x ${fmtPrice(prices.b2cUnit)}`}>{fmtPrice(prices.b2cTotal)}</td>
                            <td className="p-3 font-semibold" title={`${booking.seats} x ${fmtPrice(prices.b2bUnit)}`}>{fmtPrice(prices.b2bTotal)}</td>
                            <td className="p-3 font-semibold text-green-600">
                              {fmtPrice(prices.commission)}
                            </td>
                            <td className="p-3">
                              <Badge className={`${PM_COLOR(pm)} border-0 text-[11px]`}>{PM_LABEL[pm] || pm}</Badge>
                              {booking.payment_status && (
                                <div className="text-[10px] text-muted-foreground mt-0.5">{booking.payment_status}</div>
                              )}
                            </td>
                            <td className="p-3"><StatusBadge status={booking.status} /></td>
                            <td className="p-3">
                              <div className="flex items-center gap-1 justify-center flex-wrap">
                                {/* Anteprima */}
                                <Button
                                  size="icon" variant="ghost"
                                  title="Anteprima prenotazione"
                                  onClick={() => setPreviewBk(booking)}
                                  className="h-8 w-8 hover:bg-slate-100"
                                >
                                  <Eye className="w-4 h-4 text-slate-600" />
                                </Button>
                                {/* Voucher */}
                                <Button
                                  size="icon" variant="ghost"
                                  title={isPaid ? 'Scarica voucher PDF' : 'Scarica voucher provvisorio PDF'}
                                  onClick={() => downloadVoucher(booking)}
                                  disabled={lFor('voucher')}
                                  className="h-8 w-8 hover:bg-cyan-50"
                                >
                                  <FileText className={`w-4 h-4 ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`} />
                                </Button>
                                {/* Invia email */}
                                {booking.customer_email && (
                                  <Button
                                    size="icon" variant="ghost"
                                    title="Invia voucher via email"
                                    onClick={() => sendVoucherEmail(booking)}
                                    disabled={lFor('email')}
                                    className="h-8 w-8 hover:bg-blue-50"
                                  >
                                    <Mail className="w-4 h-4 text-blue-600" />
                                  </Button>
                                )}
                                {/* Modifica (solo prima del check-in e se non cancellata) */}
                                {!booking.checked_in_at && booking.status !== 'CANCELLED' && (
                                  <Button
                                    size="icon" variant="ghost"
                                    title="Modifica prenotazione"
                                    onClick={() => {
                                      setEditBk(booking);
                                      setEditForm({
                                        customer_name: booking.customer_name || '',
                                        customer_email: booking.customer_email || '',
                                        customer_phone: booking.customer_phone || '',
                                        special_requests: booking.special_requests || '',
                                        seats: booking.seats || 1,
                                      });
                                    }}
                                    className="h-8 w-8 hover:bg-amber-50"
                                  >
                                    <Filter className="w-4 h-4 text-amber-600" style={{ display: 'none' }} />
                                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  </Button>
                                )}
                                {/* Cancella - solo se permesso */}
                                {booking.status !== 'CANCELLED' && !booking.checked_in_at && (
                                  canCancelBooking(booking) ? (
                                    <Button
                                      size="icon" variant="ghost"
                                      title="Cancella prenotazione"
                                      onClick={() => cancelBookingB2B(booking)}
                                      className="h-8 w-8 hover:bg-red-50"
                                    >
                                      <X className="w-4 h-4 text-red-600" />
                                    </Button>
                                  ) : (
                                    <Badge
                                      className="text-[9px] bg-slate-200 text-slate-600 cursor-not-allowed"
                                      title="Incasso già nelle casse della company. Contattare amministrazione per il rimborso."
                                    >
                                      🔒
                                    </Badge>
                                  )
                                )}
                                {/* Carica/Visualizza Ricevuta Pagamento (sempre disponibile per stati non confermati) */}
                                {!isPaid && (
                                  <>
                                    {booking.bank_transfer_receipt_url && (
                                      <Button
                                        size="icon" variant="ghost"
                                        title="Visualizza ricevuta caricata"
                                        onClick={() => window.open(booking.bank_transfer_receipt_url, '_blank')}
                                        className="h-8 w-8 hover:bg-purple-50"
                                      >
                                        <Receipt className="w-4 h-4 text-purple-600" />
                                      </Button>
                                    )}
                                    <Button
                                      size="icon" variant="ghost"
                                      title={booking.bank_transfer_receipt_url ? 'Sostituisci ricevuta pagamento' : 'Carica ricevuta pagamento (Bonifico/POS/Cassa)'}
                                      onClick={() => openReceiptDialog(booking)}
                                      className={`h-8 w-8 ${isPendingBT ? 'hover:bg-orange-50' : 'hover:bg-emerald-50'}`}
                                    >
                                      <Upload className={`w-4 h-4 ${isPendingBT ? 'text-orange-600' : 'text-emerald-600'}`} />
                                    </Button>
                                  </>
                                )}
                                {/* Apri link SumUp pendente */}
                                {isOnlinePending && (
                                  <>
                                    <Button
                                      size="icon" variant="ghost"
                                      title="Apri link pagamento SumUp"
                                      onClick={() => window.open(booking.sumup_hosted_url, '_blank')}
                                      className="h-8 w-8 hover:bg-violet-50"
                                    >
                                      <ExternalLink className="w-4 h-4 text-violet-600" />
                                    </Button>
                                    {/* Rigenera Link SumUp */}
                                    <Button
                                      size="icon" variant="ghost"
                                      title="Rigenera link di pagamento SumUp (nuovo checkout)"
                                      onClick={async () => {
                                        try {
                                          const r = await fetch(`${API_BASE}/sumup/create-checkout`, {
                                            method: 'POST', headers: {'Content-Type': 'application/json'},
                                            body: JSON.stringify({ booking_id: booking.id }),
                                          });
                                          const data = await r.json();
                                          if (!r.ok || !data.hosted_url) throw new Error(data.error || 'Errore generazione link');
                                          await fetch(`${API_BASE}/bookings/${booking.id}`, {
                                            method: 'PUT',
                                            headers: {'Content-Type': 'application/json'},
                                            body: JSON.stringify({ sumup_checkout_id: data.checkout_id, sumup_hosted_url: data.hosted_url }),
                                          });
                                          if (navigator.clipboard) navigator.clipboard.writeText(data.hosted_url);
                                          window.open(data.hosted_url, '_blank');
                                          toast.success('🔄 Nuovo link generato e copiato!');
                                          const bk = await fetch(`${API_BASE}/bookings?agency_id=${agency.id}`);
                                          const bkData = await bk.json();
                                          setBookings(Array.isArray(bkData) ? bkData : []);
                                        } catch (e) { toast.error(e.message); }
                                      }}
                                      className="h-8 w-8 hover:bg-violet-100"
                                    >
                                      <span className="text-violet-700 text-sm">🔄</span>
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {filteredBookings.length > 0 && (
                      <tfoot className="bg-gradient-to-r from-emerald-50 to-teal-50 font-bold border-t-2 border-emerald-300 sticky bottom-0">
                        <tr>
                          <td colSpan={4} className="p-3 text-right uppercase text-xs tracking-wide text-muted-foreground">
                            Totale {totals.count} {totals.count === 1 ? 'prenotazione' : 'prenotazioni'}
                          </td>
                          <td className="p-3 text-emerald-700">{totals.seats}</td>
                          <td className="p-3 text-blue-700">{fmtPrice(totals.b2c_revenue)}</td>
                          <td className="p-3 text-emerald-700">{fmtPrice(totals.revenue)}</td>
                          <td className="p-3 text-green-700">{fmtPrice(totals.commission)}</td>
                          <td colSpan={3}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                  {filteredBookings.length === 0 && (
                    <div className="text-center py-12">
                      <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">Nessuna prenotazione</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* Calendario - vista settimanale */}
          <TabsContent value="calendar" className="space-y-4">
            <AgencyCalendarLazy
              companyId={company?.id}
              agencyId={agency?.id}
              experiences={experiences}
            />
          </TabsContent>

        </Tabs>
      </div>

      {/* Dialog Upload Ricevuta Pagamento */}
      <Dialog open={receiptDialog.open} onOpenChange={(o) => !o && setReceiptDialog({ open: false, booking: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              Carica Ricevuta Pagamento
            </DialogTitle>
            <DialogDescription>
              {receiptDialog.booking && (
                <>
                  Prenotazione <span className="font-mono">{receiptDialog.booking.booking_ref}</span> · {receiptDialog.booking.customer_name} · Totale <strong>{fmtPrice(receiptDialog.booking.total_amount || receiptDialog.booking.price_b2b)}</strong>
                  <br/>
                  <span className="text-xs">Allega ricevuta + indica il metodo. La Company verificherà e confermerà.</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Metodo di Pagamento *</Label>
              <select
                className="w-full h-9 border rounded-md px-2 text-sm bg-white"
                value={receiptForm.payment_method}
                onChange={(e) => setReceiptForm({ ...receiptForm, payment_method: e.target.value })}
              >
                <option value="BANK_TRANSFER">🏦 Bonifico Bancario</option>
                <option value="CASH">💶 Contanti</option>
                <option value="DIRECT">🪙 Cassa Diretta</option>
                <option value="MANUAL">📝 POS / Manuale</option>
                <option value="ONLINE">💳 Carta (POS Web SumUp)</option>
                <option value="AGENCY">📑 Agenzia (Differito)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs">Ricevuta (immagine o PDF) *</Label>
              <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-lg p-4">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  id="receipt-input"
                  onChange={(e) => handleReceiptFile(e.target.files?.[0])}
                  className="hidden"
                />
                <label htmlFor="receipt-input" className="cursor-pointer flex flex-col items-center justify-center text-sm gap-2">
                  <Upload className="w-8 h-8 text-emerald-600" />
                  <span className="font-medium text-emerald-700">
                    {receiptForm.file ? receiptForm.file.name : (receiptForm.filePreview ? 'Ricevuta già caricata · Click per sostituire' : 'Clicca o trascina qui il file')}
                  </span>
                  <span className="text-xs text-muted-foreground">PNG, JPG, PDF · max 5 MB</span>
                </label>
                {receiptForm.filePreview && (
                  <div className="mt-3 flex items-center gap-2 justify-center">
                    {receiptForm.file?.type?.startsWith('image/') || (typeof receiptForm.filePreview === 'string' && receiptForm.filePreview.match(/\.(png|jpe?g|gif|webp)$/i)) ? (
                      <img src={receiptForm.filePreview} alt="anteprima" className="max-h-40 rounded border" />
                    ) : (
                      <a href={receiptForm.filePreview} target="_blank" rel="noopener" className="text-xs text-blue-600 underline flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Apri anteprima
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs">Note / Causale (opzionale)</Label>
              <Textarea
                rows={2}
                placeholder="Es: Bonifico emesso il 15/05/2026 dal cliente. CRO: ..."
                value={receiptForm.notes}
                onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReceiptDialog({ open: false, booking: null })} disabled={receiptSubmitting}>
                Annulla
              </Button>
              <Button
                onClick={submitReceipt}
                disabled={receiptSubmitting || (!receiptForm.file && !receiptForm.filePreview)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {receiptSubmitting ? 'Caricamento...' : 'Invia per Verifica'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Nuova Prenotazione Agenzia */}
      {showNewBookingDialog && (
        <NewBookingDialog
          open={showNewBookingDialog}
          onClose={() => { setShowNewBookingDialog(false); setPrefillExperienceId(null); }}
          companyId={agency?.company_id}
          agencyId={agency?.id}
          agencyName={agency?.name}
          prefillExperienceId={prefillExperienceId}
          currentUser={{ username: agency?.name || 'agency', company_id: agency?.company_id }}
          onCreated={() => {
            // Ricarica prenotazioni
            if (agency?.id) {
              fetch(`${API_BASE}/bookings?agency_id=${agency.id}`)
                .then(r => r.json())
                .then(d => setBookings(Array.isArray(d) ? d : []));
            }
          }}
        />
      )}

      {/* Dialog Anteprima Prenotazione */}
      <Dialog open={!!previewBk} onOpenChange={(o) => !o && setPreviewBk(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Anteprima Prenotazione {previewBk?.booking_ref}</DialogTitle>
          </DialogHeader>
          {previewBk && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Cliente:</span><br/><strong>{previewBk.customer_name}</strong></div>
                <div><span className="text-muted-foreground">Email:</span><br/>{previewBk.customer_email || '—'}</div>
                <div><span className="text-muted-foreground">Telefono:</span><br/>{previewBk.customer_phone || '—'}</div>
                <div><span className="text-muted-foreground">Posti:</span><br/><strong>{previewBk.seats}</strong></div>
                <div><span className="text-muted-foreground">Esperienza:</span><br/>{getExpName(previewBk.experience_id)}</div>
                <div><span className="text-muted-foreground">Data:</span><br/>{fmtDate(previewBk.slot_datetime)}</div>
                <div><span className="text-muted-foreground">Stato:</span><br/><StatusBadge status={previewBk.status} /></div>
                <div><span className="text-muted-foreground">Metodo Pagamento:</span><br/>{previewBk.payment_method || '—'}</div>
                <div><span className="text-muted-foreground">Totale:</span><br/><strong className="text-emerald-700">{fmtPrice(previewBk.total_amount)}</strong></div>
                {previewBk.special_requests && (
                  <div className="col-span-2"><span className="text-muted-foreground">Note:</span><br/>{previewBk.special_requests}</div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Modifica Prenotazione */}
      <Dialog open={!!editBk} onOpenChange={(o) => !o && !editSubmitting && setEditBk(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifica Prenotazione {editBk?.booking_ref}</DialogTitle>
            <DialogDescription>
              Aggiorna i dati della prenotazione. La modifica sarà visibile anche alla company.
            </DialogDescription>
          </DialogHeader>
          {editBk && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome Cliente</Label>
                  <Input value={editForm.customer_name || ''} onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={editForm.customer_email || ''} onChange={(e) => setEditForm({ ...editForm, customer_email: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Telefono</Label>
                  <Input value={editForm.customer_phone || ''} onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Posti</Label>
                  <Input type="number" min="1" value={editForm.seats || 1} onChange={(e) => setEditForm({ ...editForm, seats: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Richieste Speciali</Label>
                <Textarea rows={2} value={editForm.special_requests || ''} onChange={(e) => setEditForm({ ...editForm, special_requests: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setEditBk(null)} disabled={editSubmitting}>Annulla</Button>
                <Button onClick={saveEditBooking} disabled={editSubmitting}>
                  {editSubmitting ? 'Salvataggio…' : 'Salva Modifiche'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Popup Grafico a Torta Provvigioni */}
      {showCommissionChart && (
        <CommissionPieChart
          open={showCommissionChart}
          onClose={() => setShowCommissionChart(false)}
          bookings={bookings}
          experiences={experiences}
          agencyDiscountPct={Number(agency?.discount_percentage) || 0}
          totalCommission={stats?.total_commission || 0}
        />
      )}
    </div>
  );
}
