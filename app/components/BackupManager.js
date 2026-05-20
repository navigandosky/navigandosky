"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Database, Download, Trash2, RotateCw, Play, AlertTriangle, CheckCircle2,
  Clock, HardDrive, RefreshCw, Save, ShieldAlert, History, Plus, Upload, FileArchive
} from 'lucide-react';

/**
 * BackupManager - UI Super Admin per gestione backup MongoDB
 *
 * Funzioni:
 * 1. Visualizza lista backup con metadata
 * 2. Esegue backup manuale on-demand
 * 3. Scarica file backup .archive.gz
 * 4. Ripristina DB da backup (con doppia conferma)
 * 5. Elimina backup
 * 6. Mostra status scheduler automatico (cron 23:30)
 */
export default function BackupManager({ currentUser }) {
  const [data, setData] = useState({ backups: [], totals: {}, scheduler: {} });
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(null); // backup object
  const [deleting, setDeleting] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [newBackupNote, setNewBackupNote] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  // Upload backup esterno
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadNote, setUploadNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    'X-User-Role': 'SUPER_ADMIN',
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/backups', { headers });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Errore caricamento');
      setData(d);
    } catch (e) {
      toast.error('Errore: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh ogni 60 secondi per vedere il backup notturno se schermo aperto
  useEffect(() => {
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const createBackup = async () => {
    setCreating(true);
    try {
      const r = await fetch('/api/admin/backups/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          note: newBackupNote.trim() || null,
          triggered_by: currentUser?.username || 'super_admin',
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Errore backup');
      toast.success(`✅ Backup creato: ${d.backup?.size_human || ''}`);
      setNewBackupNote('');
      setShowNewDialog(false);
      await load();
    } catch (e) {
      toast.error('Errore: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  const doRestore = async () => {
    if (!restoring) return;
    if (restoreConfirm !== 'RIPRISTINA-DEFINITIVO') {
      toast.error('Scrivi esattamente: RIPRISTINA-DEFINITIVO');
      return;
    }
    try {
      const r = await fetch(`/api/admin/backups/${restoring.id}/restore`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ confirm: restoreConfirm }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Errore restore');
      toast.success(`✅ Restore completato da ${restoring.id}`);
      setRestoring(null);
      setRestoreConfirm('');
      await load();
    } catch (e) {
      toast.error('Errore: ' + e.message);
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    if (deleteConfirm !== 'ELIMINA') {
      toast.error('Scrivi esattamente: ELIMINA');
      return;
    }
    try {
      const r = await fetch(`/api/admin/backups/${deleting.id}`, { method: 'DELETE', headers });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Errore eliminazione');
      toast.success('🗑️ Backup eliminato');
      setDeleting(null);
      setDeleteConfirm('');
      await load();
    } catch (e) {
      toast.error('Errore: ' + e.message);
    }
  };

  const handleDownload = (b) => {
    const url = `/api/admin/backups/${b.id}/download`;
    // Browser download via fetch+blob per passare l'header X-User-Role
    fetch(url, { headers: { 'X-User-Role': 'SUPER_ADMIN' } })
      .then(r => {
        if (!r.ok) throw new Error('Download fallito');
        return r.blob();
      })
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = b.filename;
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success('📥 Download avviato');
      })
      .catch(e => toast.error('Errore: ' + e.message));
  };

  // === Upload backup esterno ===
  const handleFileSelect = (file) => {
    if (!file) return;
    if (!/\.(gz|archive)$/i.test(file.name)) {
      toast.error('File deve avere estensione .gz o .archive');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error('File troppo grande (max 500 MB)');
      return;
    }
    setUploadFile(file);
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('Seleziona prima un file');
      return;
    }
    setUploading(true);
    setUploadProgress(0);

    try {
      // Usa XHR per avere progresso upload
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', uploadFile);
        if (uploadNote) formData.append('note', uploadNote);
        formData.append('triggered_by', currentUser?.username || 'super_admin_import');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const d = JSON.parse(xhr.responseText);
              resolve(d);
            } catch { resolve(null); }
          } else {
            let errMsg = `HTTP ${xhr.status}`;
            try {
              const d = JSON.parse(xhr.responseText);
              errMsg = d.error || errMsg;
            } catch {}
            reject(new Error(errMsg));
          }
        };
        xhr.onerror = () => reject(new Error('Errore di rete'));
        xhr.open('POST', '/api/admin/backups/upload');
        xhr.setRequestHeader('X-User-Role', 'SUPER_ADMIN');
        xhr.send(formData);
      });

      toast.success(`✅ Backup importato: ${uploadFile.name}`);
      setShowUploadDialog(false);
      setUploadFile(null);
      setUploadNote('');
      setUploadProgress(0);
      await load();
    } catch (e) {
      toast.error('Errore upload: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  };

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' });
    } catch { return iso; }
  };

  const sched = data.scheduler || {};
  const totals = data.totals || {};

  return (
    <div className="space-y-5">
      {/* Header con stato scheduler */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Database className="w-5 h-5 text-emerald-600" />
            Gestione Backup MongoDB
          </CardTitle>
          <CardDescription>
            Backup automatici giornalieri + manuali on-demand. Solo Super Admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3 border">
              <div className="text-xs text-slate-500 mb-1">Scheduler</div>
              <div className="font-semibold flex items-center gap-1">
                {sched.initialized ? (
                  <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> ATTIVO</>
                ) : (
                  <><AlertTriangle className="w-4 h-4 text-amber-600" /> NON ATTIVO</>
                )}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border">
              <div className="text-xs text-slate-500 mb-1">Prossimo backup</div>
              <div className="font-semibold flex items-center gap-1">
                <Clock className="w-4 h-4 text-blue-600" />
                {sched.next_run ? formatDate(sched.next_run) : '—'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">cron: {sched.cron_expression}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border">
              <div className="text-xs text-slate-500 mb-1">Spazio totale usato</div>
              <div className="font-semibold flex items-center gap-1">
                <HardDrive className="w-4 h-4 text-purple-600" />
                {formatBytes(totals.size_bytes || 0)}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">su {data.backup_dir || '/app/backups'}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border">
              <div className="text-xs text-slate-500 mb-1">Backup disponibili</div>
              <div className="font-semibold">
                <Badge variant="outline" className="mr-1 bg-emerald-50">AUTO {totals.auto || 0}</Badge>
                <Badge variant="outline" className="bg-blue-50">MANUAL {totals.manual || 0}</Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            <Button onClick={() => setShowNewDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-1" />Nuovo Backup Manuale
            </Button>
            <Button onClick={() => setShowUploadDialog(true)} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
              <Upload className="w-4 h-4 mr-1" />Importa Backup Esterno
            </Button>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />Aggiorna
            </Button>
          </div>

          {sched.last_run && (
            <div className="mt-3 p-2 bg-slate-50 rounded text-xs border">
              <strong>Ultima esecuzione:</strong>{' '}
              {formatDate(sched.last_run.endedAt || sched.last_run.startedAt)} ·
              status: <Badge variant="outline" className={
                sched.last_run.status === 'SUCCESS' ? 'bg-emerald-100' :
                sched.last_run.status === 'FAILED' ? 'bg-red-100' : 'bg-amber-100'
              }>{sched.last_run.status}</Badge> ·
              triggered by: {sched.last_run.triggeredBy}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabella backup */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" /> Indice Backup ({data.backups?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.backups?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Nessun backup disponibile. Clicca "Nuovo Backup Manuale" per iniziare.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-slate-500 border-b">
                  <tr>
                    <th className="text-left py-2 px-2">ID / Data</th>
                    <th className="text-left py-2 px-2">Tipo</th>
                    <th className="text-left py-2 px-2">Dimensione</th>
                    <th className="text-left py-2 px-2">Documenti</th>
                    <th className="text-left py-2 px-2">Trigger</th>
                    <th className="text-left py-2 px-2">Note</th>
                    <th className="text-right py-2 px-2">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {data.backups.map(b => (
                    <tr key={b.id} className="border-b hover:bg-slate-50">
                      <td className="py-2 px-2">
                        <div className="font-mono text-xs text-slate-700">{b.id}</div>
                        <div className="text-xs text-slate-500">{formatDate(b.created_at)}</div>
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className={
                          b.type === 'AUTO' ? 'bg-emerald-50' :
                          b.type === 'MANUAL' ? 'bg-blue-50' :
                          b.type === 'UPLOAD' ? 'bg-purple-50' : 'bg-slate-50'
                        }>
                          {b.type}
                        </Badge>
                      </td>
                      <td className="py-2 px-2">{b.size_human}</td>
                      <td className="py-2 px-2">
                        <span className="font-semibold">{b.total_documents}</span>
                        <div className="text-xs text-slate-500">
                          {Object.keys(b.collections || {}).length} collezioni
                        </div>
                      </td>
                      <td className="py-2 px-2 text-xs text-slate-600">{b.triggered_by || '—'}</td>
                      <td className="py-2 px-2 text-xs text-slate-600 max-w-xs truncate">{b.note || '—'}</td>
                      <td className="py-2 px-2">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleDownload(b)} title="Scarica .archive.gz">
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setRestoring(b); setRestoreConfirm(''); }} className="border-amber-200 text-amber-700 hover:bg-amber-50" title="Ripristina DB da questo backup">
                            <RotateCw className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setDeleting(b); setDeleteConfirm(''); }} className="border-red-200 text-red-600 hover:bg-red-50" title="Elimina backup">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Nuovo Backup Manuale */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-emerald-600" />Nuovo Backup Manuale
            </DialogTitle>
            <DialogDescription>
              Crea uno snapshot completo del database MongoDB. Tutti i backup manuali sono permanenti
              (non vengono eliminati automaticamente dalla retention policy).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="bk-note">Nota (opzionale, max 200 caratteri)</Label>
              <Input
                id="bk-note"
                value={newBackupNote}
                onChange={e => setNewBackupNote(e.target.value)}
                placeholder="Es: Pre-aggiornamento esperienze estate 2026"
                maxLength={200}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)} disabled={creating}>Annulla</Button>
            <Button onClick={createBackup} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700">
              {creating ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" />Backup in corso...</> : <><Play className="w-4 h-4 mr-1" />Esegui Backup</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ripristina */}
      <Dialog open={!!restoring} onOpenChange={(o) => !o && setRestoring(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <ShieldAlert className="w-5 h-5" />Ripristina Database
            </DialogTitle>
            <DialogDescription>
              <strong className="text-red-600">Operazione distruttiva!</strong> Il database attuale verrà
              completamente sostituito dai dati di questo backup. Verrà comunque creato uno snapshot
              di sicurezza dello stato attuale prima del restore.
            </DialogDescription>
          </DialogHeader>
          {restoring && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
                <div><strong>Backup:</strong> <span className="font-mono">{restoring.id}</span></div>
                <div><strong>Data:</strong> {formatDate(restoring.created_at)}</div>
                <div><strong>Documenti:</strong> {restoring.total_documents}</div>
                <div><strong>Dimensione:</strong> {restoring.size_human}</div>
                {restoring.note && <div><strong>Nota:</strong> {restoring.note}</div>}
              </div>
              <div>
                <Label htmlFor="restore-confirm" className="text-red-700">
                  Per confermare, scrivi: <code className="bg-red-100 px-1 rounded">RIPRISTINA-DEFINITIVO</code>
                </Label>
                <Input
                  id="restore-confirm"
                  value={restoreConfirm}
                  onChange={e => setRestoreConfirm(e.target.value)}
                  placeholder="RIPRISTINA-DEFINITIVO"
                  className="font-mono"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoring(null)}>Annulla</Button>
            <Button
              onClick={doRestore}
              disabled={restoreConfirm !== 'RIPRISTINA-DEFINITIVO'}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <RotateCw className="w-4 h-4 mr-1" />Ripristina Database
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Elimina */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-5 h-5" />Elimina Backup
            </DialogTitle>
            <DialogDescription>
              Il file archive.gz e il manifest verranno eliminati definitivamente. Operazione non reversibile.
            </DialogDescription>
          </DialogHeader>
          {deleting && (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                <div><strong>Backup:</strong> <span className="font-mono">{deleting.id}</span></div>
                <div><strong>Data:</strong> {formatDate(deleting.created_at)}</div>
                <div><strong>Dimensione:</strong> {deleting.size_human}</div>
              </div>
              <div>
                <Label htmlFor="del-confirm">
                  Per confermare scrivi: <code className="bg-red-100 px-1 rounded">ELIMINA</code>
                </Label>
                <Input
                  id="del-confirm"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="ELIMINA"
                  className="font-mono"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Annulla</Button>
            <Button
              onClick={doDelete}
              disabled={deleteConfirm !== 'ELIMINA'}
              variant="destructive"
            >
              <Trash2 className="w-4 h-4 mr-1" />Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog: Importa Backup Esterno */}
      <Dialog open={showUploadDialog} onOpenChange={(o) => { if (!uploading) { setShowUploadDialog(o); if (!o) { setUploadFile(null); setUploadNote(''); setUploadProgress(0); } } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />Importa Backup Esterno
            </DialogTitle>
            <DialogDescription>
              Carica un file di backup MongoDB (<code>.archive.gz</code>) precedentemente
              scaricato da questo sistema o da un altro ambiente. Il file verrà validato
              automaticamente con <code>mongorestore --dryRun</code> prima di essere salvato.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Drag & drop zone */}
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('bk-file-input')?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
                dragActive ? 'border-blue-500 bg-blue-50' :
                uploadFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
              }`}
            >
              <input
                id="bk-file-input"
                type="file"
                accept=".gz,.archive"
                className="hidden"
                onChange={e => handleFileSelect(e.target.files?.[0])}
                disabled={uploading}
              />
              {!uploadFile ? (
                <>
                  <FileArchive className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <div className="font-semibold text-sm">Trascina qui il file di backup</div>
                  <div className="text-xs text-slate-500 mt-1">oppure clicca per selezionare dal dispositivo</div>
                  <div className="text-xs text-slate-400 mt-2">Formati supportati: .archive.gz · Max 500 MB</div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <div className="font-semibold text-sm text-emerald-800">{uploadFile.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{formatBytes(uploadFile.size)}</div>
                  {!uploading && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                      className="text-xs text-red-600 hover:underline mt-2"
                    >
                      Rimuovi e scegli un altro file
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Note campo */}
            <div>
              <Label htmlFor="up-note">Nota (opzionale)</Label>
              <Input
                id="up-note"
                value={uploadNote}
                onChange={e => setUploadNote(e.target.value)}
                placeholder="Es: Backup da disco esterno datato 15/04"
                disabled={uploading}
                maxLength={200}
              />
            </div>

            {/* Progress bar */}
            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Caricamento in corso...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
              <strong>⚠️ Nota:</strong> dopo l'importazione, il backup sarà disponibile nell'indice
              con tipo <Badge variant="outline" className="bg-purple-50">UPLOAD</Badge>.
              Per ripristinare i dati nel database attuale, usa il pulsante <code>Ripristina</code>
              (rotella) sulla riga corrispondente.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={uploading}>
              Annulla
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? (
                <><RefreshCw className="w-4 h-4 mr-1 animate-spin" />Caricamento {uploadProgress}%</>
              ) : (
                <><Upload className="w-4 h-4 mr-1" />Importa Backup</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(2)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
