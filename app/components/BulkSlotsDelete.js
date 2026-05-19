'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle, Calendar, Search, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

/**
 * BulkSlotsDelete - Super Admin tool per eliminare massivamente slot di una company
 * con filtri opzionali per esperienza e range date.
 *
 * SOLO SUPER ADMIN.
 */
export default function BulkSlotsDelete({ companies = [], isSuperAdmin }) {
  const [open, setOpen] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [experienceId, setExperienceId] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deleteBookings, setDeleteBookings] = useState(false);
  const [experiences, setExperiences] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Carica esperienze della company selezionata
  useEffect(() => {
    if (!companyId) {
      setExperiences([]);
      setExperienceId('all');
      return;
    }
    fetch(`/api/experiences?all=true&company_id=${companyId}`)
      .then((r) => r.json())
      .then((d) => setExperiences(Array.isArray(d) ? d : []))
      .catch(() => setExperiences([]));
  }, [companyId]);

  // Resetta preview quando cambiano i filtri
  useEffect(() => { setPreview(null); }, [companyId, experienceId, dateFrom, dateTo]);

  if (!isSuperAdmin) return null;

  const handlePreview = async () => {
    if (!companyId) {
      toast.error('Seleziona una company');
      return;
    }
    setLoading(true);
    try {
      const body = { company_id: companyId };
      if (experienceId && experienceId !== 'all') body.experience_id = experienceId;
      if (dateFrom) body.date_from = dateFrom + 'T00:00:00.000Z';
      if (dateTo) body.date_to = dateTo + 'T23:59:59.999Z';
      const res = await fetch('/api/slots/bulk-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore preview');
      setPreview(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== 'ELIMINA') {
      toast.error('Digita "ELIMINA" per confermare');
      return;
    }
    setDeleting(true);
    try {
      const body = { company_id: companyId, delete_bookings: deleteBookings };
      if (experienceId && experienceId !== 'all') body.experience_id = experienceId;
      if (dateFrom) body.date_from = dateFrom + 'T00:00:00.000Z';
      if (dateTo) body.date_to = dateTo + 'T23:59:59.999Z';
      const res = await fetch('/api/slots/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore eliminazione');
      toast.success(`Eliminati ${data.deleted_slots} slot${data.deleted_bookings > 0 ? ` e ${data.deleted_bookings} prenotazioni` : ''}`);
      setPreview(null);
      setConfirmText('');
      setOpen(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const getExperienceName = (eid) => {
    if (eid === '_no_exp') return 'Slot senza esperienza';
    const e = experiences.find((x) => x.id === eid);
    return e ? e.name : `#${String(eid).slice(0, 8)}`;
  };

  const companyName = companies.find((c) => c.id === companyId)?.name;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="border-red-300 text-red-700 hover:bg-red-50"
        onClick={() => setOpen(true)}
        title="Strumento Super Admin: elimina massivamente gli slot di una company"
      >
        <Trash2 className="w-4 h-4 mr-1" />
        Eliminazione Massiva Slot
      </Button>

      <Dialog open={open} onOpenChange={(o) => {
        setOpen(o);
        if (!o) { setPreview(null); setConfirmText(''); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <ShieldAlert className="w-5 h-5" />
              Eliminazione Massiva Slot
            </DialogTitle>
            <DialogDescription>
              Strumento di pulizia rapida. Permette di eliminare tutti gli slot di una company
              filtrandoli per esperienza e/o range date. <strong>Operazione irreversibile.</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Avviso */}
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Attenzione:</strong> questa operazione elimina gli slot anche se collegati a esperienze e prenotazioni.
                Le prenotazioni associate possono essere lasciate (orfane) o eliminate.
              </div>
            </div>

            {/* Filtri */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Company *</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Esperienza (opzionale)</Label>
                <Select value={experienceId} onValueChange={setExperienceId} disabled={!companyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tutte le esperienze" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le esperienze</SelectItem>
                    {experiences.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dal (opzionale)</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label>Al (opzionale)</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>

            <Button
              onClick={handlePreview}
              disabled={loading || !companyId}
              className="w-full"
              variant="secondary"
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Calcolo...</> : <><Search className="w-4 h-4 mr-2" />Anteprima</>}
            </Button>

            {/* Risultato preview */}
            {preview && (
              <Card className="border-2 border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Risultato Anteprima — {companyName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    <div className="bg-red-50 rounded p-2 text-center">
                      <div className="text-2xl font-bold text-red-700">{preview.total_slots}</div>
                      <div className="text-xs text-muted-foreground">Slot da eliminare</div>
                    </div>
                    <div className="bg-amber-50 rounded p-2 text-center">
                      <div className="text-2xl font-bold text-amber-700">{preview.total_bookings}</div>
                      <div className="text-xs text-muted-foreground">Prenotazioni</div>
                    </div>
                    <div className="bg-blue-50 rounded p-2 text-center">
                      <div className="text-2xl font-bold text-blue-700">{preview.confirmed_bookings}</div>
                      <div className="text-xs text-muted-foreground">Confermate</div>
                    </div>
                    <div className="bg-slate-50 rounded p-2 text-center">
                      <div className="text-2xl font-bold text-slate-700">{preview.total_seat_blocks}</div>
                      <div className="text-xs text-muted-foreground">Blocchi posti</div>
                    </div>
                  </div>

                  {preview.date_range && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Range trovato: <strong>{new Date(preview.date_range.from).toLocaleDateString('it-IT')}</strong> → <strong>{new Date(preview.date_range.to).toLocaleDateString('it-IT')}</strong>
                    </p>
                  )}

                  {/* Distribuzione per esperienza */}
                  {preview.by_experience && Object.keys(preview.by_experience).length > 0 && (
                    <div className="space-y-1 mt-3">
                      <div className="text-xs font-semibold text-muted-foreground">Distribuzione per esperienza:</div>
                      {Object.entries(preview.by_experience).map(([eid, count]) => (
                        <div key={eid} className="flex items-center justify-between text-xs">
                          <span className="truncate">{getExperienceName(eid)}</span>
                          <Badge variant="outline">{count} slot</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {preview.total_slots === 0 && (
                    <div className="text-center text-muted-foreground py-3 text-sm">
                      Nessuno slot trovato con i filtri selezionati.
                    </div>
                  )}

                  {preview.total_slots > 0 && (
                    <div className="mt-4 space-y-3 border-t pt-3">
                      <div className="flex items-start gap-2 bg-red-50 p-2 rounded">
                        <input
                          type="checkbox"
                          id="delete_bookings"
                          checked={deleteBookings}
                          onChange={(e) => setDeleteBookings(e.target.checked)}
                          className="mt-1"
                        />
                        <Label htmlFor="delete_bookings" className="cursor-pointer text-sm">
                          Elimina anche le <strong>{preview.total_bookings}</strong> prenotazioni associate
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            Se non selezionato, le prenotazioni rimangono ma diventano orfane (slot_id non valido).
                          </span>
                        </Label>
                      </div>

                      <div>
                        <Label className="text-sm">Per confermare, digita <code className="bg-red-100 text-red-800 px-1 rounded">ELIMINA</code>:</Label>
                        <Input
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                          placeholder="ELIMINA"
                          className={confirmText === 'ELIMINA' ? 'border-red-500' : ''}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>Annulla</Button>
            {preview && preview.total_slots > 0 && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || confirmText !== 'ELIMINA'}
              >
                {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Eliminazione...</> : <><Trash2 className="w-4 h-4 mr-2" />Elimina {preview.total_slots} slot</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
