'use client';
/**
 * SendDocumentEmailDialog — Dialog generico per inviare un documento PDF via email.
 *
 * Props:
 *  - open: bool
 *  - onClose: fn
 *  - documentType: 'preventivo' | 'contratto' | 'preventivo_cantiere' | 'ricevuta_transito' | 'ricevuta' | 'documento'
 *  - documentNumber: string (es. 'PR-2026-0010')
 *  - customerName: string
 *  - defaultRecipient: string (email cliente registrata - precompilata)
 *  - defaultMessage: string (opzionale)
 *  - companyName: string (per from address)
 *  - marinaId, companyId: opzionali per log/Resend/SMTP override
 *  - relatedCollection, relatedId: opzionali per log invio nel documento
 *  - generatePdf: async fn() => Promise<{ base64: string, filename: string }>  Genera il PDF da allegare
 */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const DOC_TYPE_LABELS = {
  preventivo: 'Preventivo Posto Barca',
  contratto: 'Contratto Ormeggio',
  preventivo_cantiere: 'Preventivo Rimessaggio',
  ricevuta_transito: 'Ricevuta Transito',
  ricevuta: 'Ricevuta',
  documento: 'Documento',
};

export default function SendDocumentEmailDialog({
  open,
  onClose,
  documentType = 'documento',
  documentNumber = '',
  customerName = '',
  defaultRecipient = '',
  defaultMessage = '',
  companyName = '',
  marinaId,
  companyId,
  relatedCollection,
  relatedId,
  generatePdf,
}) {
  const docLabel = DOC_TYPE_LABELS[documentType] || 'Documento';
  const [toEmail, setToEmail] = useState(defaultRecipient || '');
  const [ccEmail, setCcEmail] = useState('');
  const [subject, setSubject] = useState(`${docLabel} ${documentNumber}${companyName ? ` - ${companyName}` : ''}`.trim());
  const [message, setMessage] = useState(
    defaultMessage ||
    `Gentile ${customerName || 'Cliente'},\n\nin allegato il documento "${docLabel} ${documentNumber}".\n\nResto a disposizione per qualsiasi chiarimento.\n\nCordiali saluti.`
  );
  const [sending, setSending] = useState(false);

  // Reset form quando il dialog si riapre con dati diversi
  useEffect(() => {
    if (open) {
      setToEmail(defaultRecipient || '');
      setCcEmail('');
      setSubject(`${docLabel} ${documentNumber}${companyName ? ` - ${companyName}` : ''}`.trim());
      setMessage(
        defaultMessage ||
        `Gentile ${customerName || 'Cliente'},\n\nin allegato il documento "${docLabel} ${documentNumber}".\n\nResto a disposizione per qualsiasi chiarimento.\n\nCordiali saluti.`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultRecipient, documentNumber]);

  const handleSend = async () => {
    const cleanTo = (toEmail || '').trim();
    const cleanCc = (ccEmail || '').trim();
    if (!cleanTo || !/^\S+@\S+\.\S+$/.test(cleanTo)) {
      toast.error('Inserisci un indirizzo email destinatario valido');
      return;
    }
    if (cleanCc && !/^\S+@\S+\.\S+$/.test(cleanCc)) {
      toast.error('Email in CC non valida');
      return;
    }
    if (typeof generatePdf !== 'function') {
      toast.error('Funzione di generazione PDF non disponibile');
      return;
    }
    setSending(true);
    try {
      const pdf = await generatePdf();
      if (!pdf || !pdf.base64) {
        throw new Error('PDF non generato');
      }
      const res = await fetch('/api/send-document-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email: cleanTo,
          cc_email: cleanCc || null,
          subject,
          message,
          pdf_base64: pdf.base64,
          pdf_filename: pdf.filename || `${docLabel.replace(/\s+/g, '_')}_${documentNumber || 'doc'}.pdf`,
          content_type: pdf.contentType || 'application/pdf',
          document_type: documentType,
          document_number: documentNumber,
          customer_name: customerName,
          company_name: companyName,
          marina_id: marinaId,
          company_id: companyId,
          related_collection: relatedCollection,
          related_id: relatedId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      toast.success(`✉️ Email inviata a ${cleanTo}${cleanCc ? ` (cc: ${cleanCc})` : ''}`);
      onClose?.();
    } catch (e) {
      toast.error(`Errore invio: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !sending) onClose?.(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Invia {docLabel} via Email
          </DialogTitle>
          <DialogDescription>
            {documentNumber && <span className="font-mono mr-2">N° {documentNumber}</span>}
            {customerName && <span>Cliente: <strong>{customerName}</strong></span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Destinatario *</Label>
            <Input
              type="email"
              placeholder="cliente@example.com"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              disabled={sending}
            />
            {defaultRecipient && toEmail !== defaultRecipient && (
              <button
                type="button"
                className="text-[11px] text-blue-600 hover:underline mt-1"
                onClick={() => setToEmail(defaultRecipient)}
              >
                ↩ Ripristina email cliente registrata ({defaultRecipient})
              </button>
            )}
          </div>
          <div>
            <Label className="text-xs">Email in copia (CC) — opzionale</Label>
            <Input
              type="email"
              placeholder="es. ufficio@example.com"
              value={ccEmail}
              onChange={(e) => setCcEmail(e.target.value)}
              disabled={sending}
            />
          </div>
          <div>
            <Label className="text-xs">Oggetto</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
            />
          </div>
          <div>
            <Label className="text-xs">Messaggio</Label>
            <Textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
            />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>Il PDF aggiornato verrà generato al momento dell'invio e allegato automaticamente.</div>
          </div>
          {!defaultRecipient && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>Nessuna email cliente registrata. Inserisci manualmente l'indirizzo del destinatario.</div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose?.()} disabled={sending}>Annulla</Button>
          <Button onClick={handleSend} disabled={sending} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Send className="w-4 h-4 mr-1.5" />
            {sending ? 'Invio in corso…' : 'Invia Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
