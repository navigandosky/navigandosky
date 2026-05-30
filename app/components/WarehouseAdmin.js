'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Package, Plus, Edit, Trash2, Camera, Eye, FileText, FileSpreadsheet, Filter, X, RefreshCw, AlertCircle, ShoppingCart, BarChart3, Search, ArrowDown, ArrowUp, CheckCircle2, Sparkles, ExternalLink, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

const API = '/api';
const fmtPrice = (v) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0);
const fmtDate = (s) => { try { return new Date(s).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return '-'; } };

const UNITS = ['PZ', 'KG', 'LT', 'MT', 'M2', 'M3', 'CF', 'PCT', 'PK', 'BOX', 'CONF', 'PAIO'];

// Ridimensiona immagine prima dell'upload (max 1024px lato lungo, JPEG 75%)
function resizeImageFile(file, maxSize = 1024, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxSize) { h = Math.round((h * maxSize) / w); w = maxSize; }
        else if (h > maxSize) { w = Math.round((w * maxSize) / h); h = maxSize; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function WarehouseAdmin({ companyId, companyName = '', resources = [], currentUser = null }) {
  const [activeTab, setActiveTab] = useState('articles');
  const [articles, setArticles] = useState([]);
  const [sales, setSales] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  // Dialogs
  const [showArticleDialog, setShowArticleDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [viewingArticle, setViewingArticle] = useState(null);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [viewingSale, setViewingSale] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState('all'); // all | in_stock | out
  const [filterUnit, setFilterUnit] = useState('all');
  const [salesFilterCausale, setSalesFilterCausale] = useState('all');
  const [salesFilterFrom, setSalesFilterFrom] = useState('');
  const [salesFilterTo, setSalesFilterTo] = useState('');

  const loadAll = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [a, s, r] = await Promise.all([
        fetch(`${API}/warehouse/articles?company_id=${companyId}`).then(r => r.json()),
        fetch(`${API}/warehouse/sales?company_id=${companyId}`).then(r => r.json()),
        fetch(`${API}/warehouse/report?company_id=${companyId}`).then(r => r.json()),
      ]);
      setArticles(Array.isArray(a) ? a : []);
      setSales(Array.isArray(s) ? s : []);
      setReport(r && !r.error ? r : null);
    } catch (e) {
      console.error('warehouse load error:', e);
      toast.error('Errore caricamento magazzino');
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [companyId]);

  // ====== ARTICOLI ======
  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      if (search) {
        const q = search.toLowerCase();
        if (!`${a.ref} ${a.description} ${a.category||''} ${a.notes||''}`.toLowerCase().includes(q)) return false;
      }
      if (filterCategory && a.category !== filterCategory) return false;
      if (filterUnit !== 'all' && a.unit_of_measure !== filterUnit) return false;
      if (filterStockStatus === 'in_stock' && Number(a.quantity) <= 0) return false;
      if (filterStockStatus === 'out' && Number(a.quantity) > 0) return false;
      return true;
    });
  }, [articles, search, filterCategory, filterUnit, filterStockStatus]);

  const categories = useMemo(() => Array.from(new Set(articles.map(a => a.category).filter(Boolean))), [articles]);

  const handleArticleSave = async (formData) => {
    try {
      const isEdit = !!formData.id;
      const url = isEdit ? `${API}/warehouse/articles/${formData.id}` : `${API}/warehouse/articles`;
      const method = isEdit ? 'PUT' : 'POST';
      const body = { ...formData, company_id: companyId };
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error || 'Errore salvataggio'); return; }
      toast.success(isEdit ? `Articolo ${d.ref} aggiornato` : `Articolo ${d.ref} creato`);
      setShowArticleDialog(false);
      setEditingArticle(null);
      await loadAll();
    } catch (e) {
      toast.error('Errore: ' + e.message);
    }
  };

  const handleArticleDelete = async (article) => {
    if (!confirm(`Confermi cancellazione articolo ${article.ref} - ${article.description}?`)) return;
    try {
      const r = await fetch(`${API}/warehouse/articles/${article.id}`, { method: 'DELETE' });
      if (!r.ok) { const d = await r.json(); toast.error(d.error || 'Errore'); return; }
      toast.success('Articolo eliminato');
      await loadAll();
    } catch (e) { toast.error('Errore: ' + e.message); }
  };

  // ====== BOLLE ======
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (salesFilterCausale !== 'all' && s.causale !== salesFilterCausale) return false;
      if (salesFilterFrom && s.created_at && s.created_at < salesFilterFrom) return false;
      if (salesFilterTo && s.created_at && s.created_at > salesFilterTo + 'T23:59:59.999Z') return false;
      return true;
    });
  }, [sales, salesFilterCausale, salesFilterFrom, salesFilterTo]);

  const handleSaleDelete = async (sale) => {
    if (!confirm(`Confermi cancellazione bolla ${sale.ref}? Le scorte degli articoli verranno ripristinate.`)) return;
    try {
      const r = await fetch(`${API}/warehouse/sales/${sale.id}`, { method: 'DELETE' });
      if (!r.ok) { const d = await r.json(); toast.error(d.error || 'Errore'); return; }
      toast.success(`Bolla ${sale.ref} eliminata e scorte ripristinate`);
      await loadAll();
    } catch (e) { toast.error('Errore: ' + e.message); }
  };

  // ====== EXPORT CSV (Excel) ======
  const exportArticlesCsv = () => {
    const rows = [['ID', 'Descrizione', 'UM', 'Categoria', 'Quantità', 'Valore a Nuovo', 'Valore Attuale', 'Note', 'Creato']];
    filteredArticles.forEach(a => rows.push([a.ref, a.description, a.unit_of_measure, a.category||'', a.quantity, a.valore_a_nuovo, a.valore_attuale, (a.notes||'').replace(/[\r\n]+/g,' '), fmtDate(a.created_at)]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Magazzino_articoli_${companyName||'company'}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportSalesCsv = () => {
    const rows = [['Bolla', 'Data', 'Causale', 'Cliente/Risorsa', 'Articolo', 'UM', 'Qta', 'P.Unit', 'Totale Riga', 'Totale Bolla']];
    filteredSales.forEach(s => {
      const subj = s.causale === 'USO_INTERNO' ? (s.internal_resource_name || 'Uso Interno') : (s.customer_name || '-');
      (s.items||[]).forEach((it, i) => rows.push([s.ref, fmtDate(s.created_at), s.causale, subj, `${it.article_ref} - ${it.description}`, it.unit_of_measure, it.quantity, it.unit_price, it.total, i === 0 ? s.total : '']));
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Magazzino_bolle_${companyName||'company'}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Package className="w-6 h-6 text-rose-600" />
              Magazzino · {companyName}
            </CardTitle>
            <CardDescription>Gestione articoli, bolle di vendita e inventario</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Aggiorna
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-200/80 border border-slate-300 shadow-sm">
            <TabsTrigger value="articles" className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:font-semibold">
              <Package className="w-4 h-4 mr-2" />Articoli ({articles.length})
            </TabsTrigger>
            <TabsTrigger value="sales" className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:font-semibold">
              <ShoppingCart className="w-4 h-4 mr-2" />Bolle di Vendita ({sales.length})
            </TabsTrigger>
            <TabsTrigger value="report" className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:font-semibold">
              <BarChart3 className="w-4 h-4 mr-2" />Inventario
            </TabsTrigger>
          </TabsList>

          {/* ========== TAB ARTICOLI ========== */}
          <TabsContent value="articles" className="space-y-4 mt-4">
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <Label className="text-xs">Cerca</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input placeholder="Codice, descrizione, categoria..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
                </div>
              </div>
              <div>
                <Label className="text-xs">UM</Label>
                <Select value={filterUnit} onValueChange={setFilterUnit}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte</SelectItem>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={filterCategory || 'all'} onValueChange={v => setFilterCategory(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Tutte"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Disponibilità</Label>
                <Select value={filterStockStatus} onValueChange={setFilterStockStatus}>
                  <SelectTrigger className="w-32"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="in_stock">In giacenza</SelectItem>
                    <SelectItem value="out">Esauriti</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={exportArticlesCsv}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
              </Button>
              <Button onClick={() => { setEditingArticle({}); setShowArticleDialog(true); }} className="bg-gradient-to-r from-rose-600 to-pink-600 text-white">
                <Plus className="w-4 h-4 mr-2" />Nuovo Articolo
              </Button>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr className="border-b">
                    <th className="p-3 font-medium">Foto</th>
                    <th className="p-3 font-medium">Codice</th>
                    <th className="p-3 font-medium">Descrizione</th>
                    <th className="p-3 font-medium">UM</th>
                    <th className="p-3 font-medium text-right">Quantità</th>
                    <th className="p-3 font-medium text-right">V. a Nuovo</th>
                    <th className="p-3 font-medium text-right">V. Attuale</th>
                    <th className="p-3 font-medium">Categoria</th>
                    <th className="p-3 font-medium text-center">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArticles.length === 0 && (
                    <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">
                      {articles.length === 0 ? 'Nessun articolo in magazzino. Crea il primo!' : 'Nessun articolo corrisponde ai filtri.'}
                    </td></tr>
                  )}
                  {filteredArticles.map(a => (
                    <tr key={a.id} className="border-b hover:bg-slate-50">
                      <td className="p-2">
                        {a.photos?.[0]
                          ? <img src={a.photos[0]} alt={a.description} className="w-12 h-12 object-cover rounded cursor-pointer" onClick={() => setViewingArticle(a)} />
                          : <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center"><Package className="w-5 h-5 text-slate-400"/></div>}
                      </td>
                      <td className="p-3 font-mono text-xs font-semibold">{a.ref}</td>
                      <td className="p-3">{a.description}</td>
                      <td className="p-3"><Badge variant="outline">{a.unit_of_measure}</Badge></td>
                      <td className={`p-3 text-right font-semibold ${Number(a.quantity)<=0 ? 'text-red-600' : Number(a.quantity)<5 ? 'text-amber-600' : 'text-emerald-700'}`}>
                        {a.quantity}
                      </td>
                      <td className="p-3 text-right">{fmtPrice(a.valore_a_nuovo)}</td>
                      <td className="p-3 text-right font-medium">{fmtPrice(a.valore_attuale)}</td>
                      <td className="p-3 text-xs">{a.category || '-'}</td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewingArticle(a)} title="Visualizza"><Eye className="w-3.5 h-3.5"/></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingArticle(a); setShowArticleDialog(true); }} title="Modifica"><Edit className="w-3.5 h-3.5 text-blue-600"/></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleArticleDelete(a)} title="Elimina"><Trash2 className="w-3.5 h-3.5 text-red-500"/></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ========== TAB BOLLE ========== */}
          <TabsContent value="sales" className="space-y-4 mt-4">
            <div className="flex gap-2 items-end flex-wrap">
              <div>
                <Label className="text-xs">Causale</Label>
                <Select value={salesFilterCausale} onValueChange={setSalesFilterCausale}>
                  <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte</SelectItem>
                    <SelectItem value="USO_ESTERNO">Uso Esterno</SelectItem>
                    <SelectItem value="USO_INTERNO">Uso Interno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Dal</Label>
                <Input type="date" value={salesFilterFrom} onChange={e => setSalesFilterFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Al</Label>
                <Input type="date" value={salesFilterTo} onChange={e => setSalesFilterTo(e.target.value)} />
              </div>
              {(salesFilterFrom || salesFilterTo || salesFilterCausale !== 'all') && (
                <Button variant="ghost" size="sm" onClick={() => { setSalesFilterCausale('all'); setSalesFilterFrom(''); setSalesFilterTo(''); }}>
                  <X className="w-4 h-4 mr-1"/>Reset
                </Button>
              )}
              <div className="flex-1"></div>
              <Button variant="outline" onClick={exportSalesCsv}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
              </Button>
              <Button onClick={() => setShowSaleDialog(true)} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                <Plus className="w-4 h-4 mr-2" />Nuova Bolla
              </Button>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr className="border-b">
                    <th className="p-3 font-medium">Codice Bolla</th>
                    <th className="p-3 font-medium">Data</th>
                    <th className="p-3 font-medium">Causale</th>
                    <th className="p-3 font-medium">Destinatario</th>
                    <th className="p-3 font-medium text-right">Righe</th>
                    <th className="p-3 font-medium text-right">Q.ta Tot</th>
                    <th className="p-3 font-medium text-right">Totale</th>
                    <th className="p-3 font-medium text-center">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length === 0 && (
                    <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">{sales.length === 0 ? 'Nessuna bolla emessa.' : 'Nessuna bolla corrisponde ai filtri.'}</td></tr>
                  )}
                  {filteredSales.map(s => {
                    const totQty = (s.items||[]).reduce((sum, it) => sum + (Number(it.quantity)||0), 0);
                    const dest = s.causale === 'USO_INTERNO' ? (s.internal_resource_name || 'Uso Interno') : (s.customer_name || '-');
                    return (
                      <tr key={s.id} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-mono text-xs font-semibold">{s.ref}</td>
                        <td className="p-3 text-xs">{fmtDate(s.created_at)}</td>
                        <td className="p-3">
                          {s.causale === 'USO_INTERNO'
                            ? <Badge className="bg-blue-100 text-blue-800">Uso Interno</Badge>
                            : <Badge className="bg-emerald-100 text-emerald-800">Uso Esterno</Badge>}
                        </td>
                        <td className="p-3">{dest}</td>
                        <td className="p-3 text-right">{(s.items||[]).length}</td>
                        <td className="p-3 text-right">{totQty}</td>
                        <td className="p-3 text-right font-bold">{fmtPrice(s.total)}</td>
                        <td className="p-3">
                          <div className="flex gap-1 justify-center">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewingSale(s)} title="Visualizza"><Eye className="w-3.5 h-3.5"/></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleSaleDelete(s)} title="Elimina e ripristina scorte"><Trash2 className="w-3.5 h-3.5 text-red-500"/></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ========== TAB INVENTARIO ========== */}
          <TabsContent value="report" className="space-y-4 mt-4">
            {report ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Articoli Totali</p><p className="text-2xl font-bold">{report.articles.total}</p><p className="text-xs text-emerald-700">{report.articles.active} attivi</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Q.tà Totale in Giacenza</p><p className="text-2xl font-bold">{report.articles.total_quantity}</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Valore a Nuovo</p><p className="text-xl font-bold text-blue-700">{fmtPrice(report.articles.value_new)}</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Valore Attuale</p><p className="text-xl font-bold text-emerald-700">{fmtPrice(report.articles.value_current)}</p></CardContent></Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowDown className="w-4 h-4 text-emerald-600"/>Vendite (Uso Esterno)</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Numero bolle:</span><span className="font-semibold">{report.sales.uso_esterno_count}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Valore vendite:</span><span className="font-bold text-emerald-700">{fmtPrice(report.sales.uso_esterno_value)}</span></div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowUp className="w-4 h-4 text-blue-600"/>Prelievi (Uso Interno)</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Numero bolle:</span><span className="font-semibold">{report.sales.uso_interno_count}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Valore prelievi:</span><span className="font-bold text-blue-700">{fmtPrice(report.sales.uso_interno_value)}</span></div>
                    </CardContent>
                  </Card>
                </div>

                {(report.articles.low_stock || []).length > 0 && (
                  <Card className="border-red-200 bg-red-50/30">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2 text-red-700"><AlertCircle className="w-4 h-4"/>Articoli Esauriti ({report.articles.low_stock.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {report.articles.low_stock.map((a, i) => (
                          <div key={i} className="flex justify-between text-sm border-b pb-1 last:border-0">
                            <span><strong className="font-mono">{a.ref}</strong> {a.description}</span>
                            <Badge variant="destructive">{a.quantity}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <p className="text-center py-8 text-muted-foreground">Caricamento report...</p>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog Articolo (Create/Edit) */}
        {showArticleDialog && (
          <ArticleDialog
            open={showArticleDialog}
            onClose={() => { setShowArticleDialog(false); setEditingArticle(null); }}
            article={editingArticle}
            onSave={handleArticleSave}
          />
        )}

        {/* Dialog Visualizza Articolo */}
        {viewingArticle && (
          <ArticleViewDialog article={viewingArticle} onClose={() => setViewingArticle(null)} />
        )}

        {/* Dialog Nuova Bolla */}
        {showSaleDialog && (
          <NewSaleDialog
            open={showSaleDialog}
            onClose={() => setShowSaleDialog(false)}
            articles={articles.filter(a => a.is_active !== false && Number(a.quantity) > 0)}
            resources={resources}
            companyId={companyId}
            onCreated={() => { setShowSaleDialog(false); loadAll(); }}
          />
        )}

        {/* Dialog Visualizza Bolla */}
        {viewingSale && (
          <SaleViewDialog sale={viewingSale} onClose={() => setViewingSale(null)} />
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// ARTICLE DIALOG (Create/Edit)
// ============================================================
function ArticleDialog({ open, onClose, article, onSave }) {
  const [form, setForm] = useState({
    id: article?.id || null,
    description: article?.description || '',
    unit_of_measure: article?.unit_of_measure || 'PZ',
    valore_a_nuovo: article?.valore_a_nuovo || 0,
    valore_attuale: article?.valore_attuale || 0,
    prezzo_vendita: article?.prezzo_vendita || 0,
    quantity: article?.quantity || 0,
    category: article?.category || '',
    notes: article?.notes || '',
    photos: article?.photos || [],
    is_active: article?.is_active !== false,
  });
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [showAiDialog, setShowAiDialog] = useState(false);
  // Fornitori abilitati per la ricerca AI (persistito in localStorage)
  const ALL_SUPPLIERS = ['Osculati', 'Amazon', 'SVB', 'Magellano', 'AliExpress', 'Temu'];
  const [enabledSuppliers, setEnabledSuppliers] = useState(() => {
    if (typeof window === 'undefined') return ALL_SUPPLIERS;
    try {
      const stored = localStorage.getItem('warehouse_ai_suppliers');
      if (stored) return JSON.parse(stored);
    } catch (_e) { /* ignore */ }
    return ALL_SUPPLIERS;
  });
  const toggleSupplier = (s) => {
    setEnabledSuppliers((cur) => {
      const next = cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s];
      try { localStorage.setItem('warehouse_ai_suppliers', JSON.stringify(next)); } catch (_e) {}
      return next;
    });
  };

  const runAiSearch = async () => {
    if (form.photos.length === 0 && !form.description.trim()) {
      toast.error('Aggiungi almeno una foto o una descrizione prima di avviare la ricerca AI.');
      return;
    }
    if (enabledSuppliers.length === 0) {
      toast.error('Seleziona almeno un fornitore da consultare.');
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      const resp = await fetch(`${API}/ai-product-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: form.photos, // data URLs
          description: form.description,
          category: form.category,
          enabled_suppliers: enabledSuppliers,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || 'Errore durante la ricerca AI.');
        setAiLoading(false);
        return;
      }
      setAiResult(data);
      setShowAiDialog(true);
      toast.success('Report AI pronto. Controlla i risultati.');
    } catch (e) {
      toast.error('Errore di rete: ' + e.message);
    }
    setAiLoading(false);
  };

  const applyAiSuggestions = () => {
    if (!aiResult) return;
    setForm(prev => ({
      ...prev,
      description: aiResult.product_name || aiResult.description || prev.description,
      category: aiResult.suggested_category || prev.category,
      valore_a_nuovo: aiResult.suggested_value_new_eur || prev.valore_a_nuovo,
      valore_attuale: prev.valore_attuale || aiResult.suggested_value_new_eur || 0,
      notes: prev.notes
        ? prev.notes
        : [
            aiResult.description ? `🔎 ${aiResult.description}` : '',
            aiResult.characteristics?.length ? `Caratteristiche: ${aiResult.characteristics.join(', ')}` : '',
            aiResult.notes_general ? `Note AI: ${aiResult.notes_general}` : '',
          ].filter(Boolean).join('\n'),
    }));
    setShowAiDialog(false);
    toast.success('Campi compilati automaticamente. Puoi modificarli prima di salvare.');
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (form.photos.length + files.length > 5) {
      toast.error('Massimo 5 foto per articolo');
      return;
    }
    setUploading(true);
    try {
      const resized = await Promise.all(files.map(f => resizeImageFile(f, 1024, 0.75)));
      setForm(prev => ({ ...prev, photos: [...prev.photos, ...resized].slice(0, 5) }));
    } catch (err) {
      toast.error('Errore caricamento foto: ' + err.message);
    }
    setUploading(false);
    e.target.value = '';
  };

  const removePhoto = (idx) => setForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));

  // Handler per incollare screenshot/immagine da clipboard (Ctrl+V o evento paste)
  const handlePasteImage = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItems = Array.from(items).filter(it => it.type && it.type.startsWith('image/'));
    if (imageItems.length === 0) return;
    e.preventDefault();
    if (form.photos.length >= 5) {
      toast.error('Massimo 5 foto per articolo');
      return;
    }
    setUploading(true);
    try {
      for (const item of imageItems) {
        if (form.photos.length >= 5) break;
        const file = item.getAsFile();
        if (!file) continue;
        const resized = await resizeImageFile(file, 1024, 0.75);
        setForm(prev => ({ ...prev, photos: [...prev.photos, resized].slice(0, 5) }));
      }
      toast.success('📋 Immagine incollata dagli appunti');
    } catch (err) {
      toast.error('Errore incolla immagine: ' + err.message);
    }
    setUploading(false);
  };

  // Aggancia un listener globale di paste quando il dialog è aperto
  useEffect(() => {
    const onPaste = (ev) => handlePasteImage(ev);
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.photos.length]);

  const submit = () => {
    if (!form.description.trim()) { toast.error('Descrizione obbligatoria'); return; }
    if (form.quantity < 0) { toast.error('Quantità non valida'); return; }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-rose-600"/>{form.id ? `Modifica Articolo ${article?.ref || ''}` : 'Nuovo Articolo Magazzino'}</DialogTitle>
          <DialogDescription>{form.id ? 'Modifica i dati dell\'articolo. Il codice non è modificabile.' : 'Il codice articolo verrà generato automaticamente alla creazione.'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Descrizione *</Label>
            <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Es: Salvagente di sicurezza adulto" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unità di Misura</Label>
              <Select value={form.unit_of_measure} onValueChange={v => setForm({...form, unit_of_measure: v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria (opz.)</Label>
              <Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Es: Sicurezza, Ricambi..." />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Quantità *</Label>
              <Input type="number" min="0" step="1" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)||0})} />
            </div>
            <div>
              <Label>Valore a Nuovo (€)</Label>
              <Input type="number" min="0" step="0.01" value={form.valore_a_nuovo} onChange={e => setForm({...form, valore_a_nuovo: Number(e.target.value)||0})} />
            </div>
            <div>
              <Label>Valore Attuale (€)</Label>
              <Input type="number" min="0" step="0.01" value={form.valore_attuale} onChange={e => setForm({...form, valore_attuale: Number(e.target.value)||0})} />
            </div>
            <div>
              <Label className="text-emerald-700">💰 Prezzo di Vendita (€)</Label>
              <Input type="number" min="0" step="0.01" value={form.prezzo_vendita} onChange={e => setForm({...form, prezzo_vendita: Number(e.target.value)||0})} placeholder="Prezzo di vendita attuale" />
            </div>
          </div>

          {/* Photos */}
          <div>
            <Label className="flex items-center gap-2"><Camera className="w-4 h-4"/>Foto (max 5) — Da cellulare per scattare direttamente</Label>
            <div className="flex gap-2 flex-wrap mt-2">
              {form.photos.map((p, i) => (
                <div key={i} className="relative group">
                  <img src={p} alt={`foto ${i+1}`} className="w-20 h-20 object-cover rounded border"/>
                  <button type="button" onClick={() => removePhoto(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition" title="Rimuovi"><X className="w-3 h-3"/></button>
                </div>
              ))}
              {form.photos.length < 5 && (
                <label className="w-20 h-20 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 text-slate-400 hover:text-slate-600">
                  {uploading ? <RefreshCw className="w-5 h-5 animate-spin"/> : <><Camera className="w-5 h-5"/><span className="text-[10px] mt-1">Aggiungi</span></>}
                  <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploading}/>
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">📸 Foto ridimensionate automaticamente (max 1024px) · 📋 <strong>Puoi anche incollare uno screenshot</strong> dagli appunti con <kbd className="px-1 py-0.5 bg-slate-100 border rounded text-[10px]">Ctrl+V</kbd>.</p>
          </div>

          {/* AI Product Search Button */}
          <div className="bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 border border-violet-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600"/>
                <div>
                  <p className="text-sm font-semibold text-violet-900">Ricerca Articoli Simili (AI)</p>
                  <p className="text-xs text-violet-700">Seleziona i fornitori da consultare. Le scelte vengono ricordate per le ricerche successive.</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={runAiSearch}
                disabled={aiLoading || enabledSuppliers.length === 0 || (form.photos.length === 0 && !form.description.trim())}
                className="bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {aiLoading ? (<><RefreshCw className="w-4 h-4 mr-2 animate-spin"/>Ricerca in corso...</>) : (<><Search className="w-4 h-4 mr-2"/>Cerca Simili</>)}
              </Button>
            </div>
            {/* Toggle Fornitori */}
            <div className="bg-white/60 rounded-md p-2 border border-violet-200">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold text-violet-800 uppercase tracking-wide">Fornitori da consultare ({enabledSuppliers.length}/{ALL_SUPPLIERS.length})</p>
                <div className="flex gap-1">
                  <button type="button" className="text-[10px] text-violet-600 hover:underline" onClick={() => { setEnabledSuppliers([...ALL_SUPPLIERS]); try { localStorage.setItem('warehouse_ai_suppliers', JSON.stringify(ALL_SUPPLIERS)); } catch (_e) {} }}>Tutti</button>
                  <span className="text-violet-300">|</span>
                  <button type="button" className="text-[10px] text-violet-600 hover:underline" onClick={() => { setEnabledSuppliers([]); try { localStorage.setItem('warehouse_ai_suppliers', JSON.stringify([])); } catch (_e) {} }}>Nessuno</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {ALL_SUPPLIERS.map(s => (
                  <label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-violet-100 px-1.5 py-0.5 rounded">
                    <input
                      type="checkbox"
                      checked={enabledSuppliers.includes(s)}
                      onChange={() => toggleSupplier(s)}
                      className="w-3.5 h-3.5 accent-violet-600"
                    />
                    <span className={enabledSuppliers.includes(s) ? 'font-medium text-violet-900' : 'text-slate-400 line-through'}>{s}</span>
                  </label>
                ))}
              </div>
              {enabledSuppliers.length === 0 && (
                <p className="text-[10px] text-red-600 mt-1">⚠️ Nessun fornitore selezionato. La ricerca è disabilitata.</p>
              )}
            </div>
            {form.photos.length === 0 && !form.description.trim() && (
              <p className="text-[11px] text-violet-600 mt-2">💡 Carica almeno una foto o inserisci una descrizione per abilitare la ricerca.</p>
            )}
          </div>

          <div>
            <Label>Note</Label>
            <Textarea rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Note, ubicazione, fornitore..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Annulla</Button>
            <Button onClick={submit} className="bg-rose-600 text-white hover:bg-rose-700">{form.id ? 'Salva Modifiche' : 'Crea Articolo'}</Button>
          </div>
        </div>

        {/* AI Results Dialog */}
        {showAiDialog && aiResult && (
          <AiSearchResultDialog
            result={aiResult}
            onClose={() => setShowAiDialog(false)}
            onApply={applyAiSuggestions}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// ARTICLE VIEW DIALOG
// ============================================================
function ArticleViewDialog({ article, onClose }) {
  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-rose-600"/>{article.ref}</DialogTitle>
          <DialogDescription>Dettaglio articolo magazzino</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {article.photos?.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {article.photos.map((p, i) => (
                <img key={i} src={p} alt={article.description} className="w-full h-32 object-cover rounded border"/>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Descrizione</p><p className="font-medium">{article.description}</p></div>
            <div><p className="text-xs text-muted-foreground">UM</p><Badge variant="outline">{article.unit_of_measure}</Badge></div>
            <div><p className="text-xs text-muted-foreground">Quantità</p><p className="font-bold text-lg">{article.quantity}</p></div>
            <div><p className="text-xs text-muted-foreground">Categoria</p><p className="font-medium">{article.category || '-'}</p></div>
            <div><p className="text-xs text-muted-foreground">Valore a Nuovo</p><p className="font-medium">{fmtPrice(article.valore_a_nuovo)}</p></div>
            <div><p className="text-xs text-muted-foreground">Valore Attuale</p><p className="font-medium text-emerald-700">{fmtPrice(article.valore_attuale)}</p></div>
            <div><p className="text-xs text-muted-foreground">Valore Tot. (Q×V.Att.)</p><p className="font-bold text-blue-700">{fmtPrice(Number(article.quantity||0)*Number(article.valore_attuale||0))}</p></div>
            <div><p className="text-xs text-muted-foreground">Creato</p><p className="text-xs">{fmtDate(article.created_at)}</p></div>
          </div>
          {article.notes && (
            <div className="bg-slate-50 rounded p-3">
              <p className="text-xs text-muted-foreground mb-1">Note</p>
              <p className="text-sm whitespace-pre-wrap">{article.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// NEW SALE DIALOG (Bolla di Vendita)
// ============================================================
function NewSaleDialog({ open, onClose, articles, resources = [], companyId, onCreated }) {
  const [causale, setCausale] = useState('USO_ESTERNO');
  const [customer, setCustomer] = useState({ name: '', vat: '', address: '' });
  const [internalResource, setInternalResource] = useState({ id: '', name: '' });
  const [items, setItems] = useState([{ article_id: '', quantity: 1, unit_price: 0 }]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const addRow = () => setItems(prev => [...prev, { article_id: '', quantity: 1, unit_price: 0 }]);
  const removeRow = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateRow = (i, patch) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const onArticleSelect = (i, articleId) => {
    const art = articles.find(a => a.id === articleId);
    updateRow(i, { article_id: articleId, unit_price: art?.valore_attuale || 0 });
  };

  const subtotal = useMemo(() => items.reduce((s, it) => s + (Number(it.quantity)||0) * (Number(it.unit_price)||0), 0), [items]);

  const submit = async () => {
    if (items.length === 0 || items.some(it => !it.article_id || !it.quantity)) {
      toast.error('Aggiungi almeno una riga valida (articolo + quantità).');
      return;
    }
    if (causale === 'USO_ESTERNO' && !customer.name.trim()) {
      toast.error('Inserisci il nome cliente per uso esterno.');
      return;
    }
    if (causale === 'USO_INTERNO' && !internalResource.name.trim() && !internalResource.id) {
      toast.error('Indica la risorsa interna a cui è destinato il materiale.');
      return;
    }
    // Validate stock client-side
    for (const it of items) {
      const a = articles.find(x => x.id === it.article_id);
      if (!a) { toast.error('Articolo non valido in una riga.'); return; }
      if (Number(it.quantity) > Number(a.quantity)) {
        toast.error(`Scorta insufficiente per ${a.ref}: disponibili ${a.quantity}, richiesti ${it.quantity}`);
        return;
      }
    }
    setSaving(true);
    try {
      const body = {
        company_id: companyId,
        causale,
        customer_name: causale === 'USO_ESTERNO' ? customer.name : '',
        customer_vat: causale === 'USO_ESTERNO' ? customer.vat : '',
        customer_address: causale === 'USO_ESTERNO' ? customer.address : '',
        internal_resource_id: causale === 'USO_INTERNO' ? (internalResource.id || null) : null,
        internal_resource_name: causale === 'USO_INTERNO' ? internalResource.name : '',
        items: items.map(it => ({ article_id: it.article_id, quantity: Number(it.quantity)||0, unit_price: Number(it.unit_price)||0 })),
        notes,
      };
      const r = await fetch(`${API}/warehouse/sales`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error || 'Errore'); setSaving(false); return; }
      toast.success(`Bolla ${d.ref} creata · scorte aggiornate`);
      onCreated();
    } catch (e) {
      toast.error('Errore: ' + e.message);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-emerald-600"/>Nuova Bolla di Vendita</DialogTitle>
          <DialogDescription>Le scorte verranno scalate automaticamente. Il codice bolla verrà generato alla conferma.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Causale</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button type="button" onClick={() => setCausale('USO_ESTERNO')} className={`p-3 border-2 rounded-lg text-left transition ${causale === 'USO_ESTERNO' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="font-semibold flex items-center gap-2">{causale === 'USO_ESTERNO' && <CheckCircle2 className="w-4 h-4 text-emerald-600"/>}Uso Esterno</div>
                <div className="text-xs text-muted-foreground">Vendita a cliente terzo</div>
              </button>
              <button type="button" onClick={() => setCausale('USO_INTERNO')} className={`p-3 border-2 rounded-lg text-left transition ${causale === 'USO_INTERNO' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="font-semibold flex items-center gap-2">{causale === 'USO_INTERNO' && <CheckCircle2 className="w-4 h-4 text-blue-600"/>}Uso Interno</div>
                <div className="text-xs text-muted-foreground">Prelievo per risorsa/barca aziendale</div>
              </button>
            </div>
          </div>

          {causale === 'USO_ESTERNO' ? (
            <div className="grid grid-cols-2 gap-3 p-3 border rounded bg-emerald-50/30">
              <div className="col-span-2"><Label>Cliente *</Label><Input value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Ragione sociale o nome"/></div>
              <div><Label>P.IVA / CF</Label><Input value={customer.vat} onChange={e => setCustomer({...customer, vat: e.target.value})}/></div>
              <div><Label>Indirizzo</Label><Input value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})}/></div>
            </div>
          ) : (
            <div className="p-3 border rounded bg-blue-50/30 space-y-3">
              <div>
                <Label>Risorsa Aziendale (opz.)</Label>
                <Select value={internalResource.id || 'none'} onValueChange={v => {
                  if (v === 'none') { setInternalResource({ id: '', name: '' }); return; }
                  const r = resources.find(x => x.id === v);
                  setInternalResource({ id: v, name: r?.name || '' });
                }}>
                  <SelectTrigger><SelectValue placeholder="Seleziona barca/risorsa..."/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nessuna —</SelectItem>
                    {resources.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Oppure descrivi destinazione *</Label>
                <Input value={internalResource.name} onChange={e => setInternalResource({...internalResource, name: e.target.value, id: ''})} placeholder="Es: Magazzino centrale, GOM01, etc."/>
              </div>
            </div>
          )}

          {/* Righe articoli */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-base">Articoli</Label>
              <Button variant="outline" size="sm" onClick={addRow}><Plus className="w-3.5 h-3.5 mr-1"/>Aggiungi Riga</Button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => {
                const a = articles.find(x => x.id === it.article_id);
                const rowTotal = (Number(it.quantity)||0) * (Number(it.unit_price)||0);
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 border rounded">
                    <div className="col-span-5">
                      <Label className="text-xs">Articolo</Label>
                      <Select value={it.article_id || 'none'} onValueChange={v => v !== 'none' && onArticleSelect(i, v)}>
                        <SelectTrigger><SelectValue placeholder="Seleziona..."/></SelectTrigger>
                        <SelectContent>
                          {articles.map(art => <SelectItem key={art.id} value={art.id}>{art.ref} - {art.description} <span className="text-xs text-muted-foreground ml-2">[{art.quantity} {art.unit_of_measure}]</span></SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Q.tà {a?.unit_of_measure ? `(${a.unit_of_measure})` : ''}</Label>
                      <Input type="number" min="1" step="1" value={it.quantity} onChange={e => updateRow(i, { quantity: Number(e.target.value)||0 })}/>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">P.Unit. (€)</Label>
                      <Input type="number" min="0" step="0.01" value={it.unit_price} onChange={e => updateRow(i, { unit_price: Number(e.target.value)||0 })}/>
                    </div>
                    <div className="col-span-2 text-right">
                      <Label className="text-xs">Totale</Label>
                      <p className="font-semibold pt-2">{fmtPrice(rowTotal)}</p>
                    </div>
                    <div className="col-span-1">
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => removeRow(i)} disabled={items.length === 1}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-right">
              <span className="text-sm text-muted-foreground mr-2">Totale Bolla:</span>
              <span className="text-xl font-bold text-emerald-700">{fmtPrice(subtotal)}</span>
            </div>
          </div>

          <div>
            <Label>Note</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note aggiuntive (opzionale)"/>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Annulla</Button>
            <Button onClick={submit} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {saving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin"/>Salvataggio...</> : <><CheckCircle2 className="w-4 h-4 mr-2"/>Crea Bolla & Scarica Scorte</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// SALE VIEW DIALOG
// ============================================================
function SaleViewDialog({ sale, onClose }) {
  const dest = sale.causale === 'USO_INTERNO' ? (sale.internal_resource_name || 'Uso Interno') : (sale.customer_name || '-');
  const totalQty = (sale.items||[]).reduce((s, it) => s + (Number(it.quantity)||0), 0);
  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl"><ShoppingCart className="w-5 h-5 text-emerald-600"/>Bolla {sale.ref}</DialogTitle>
          <DialogDescription>{fmtDate(sale.created_at)} · {sale.causale === 'USO_INTERNO' ? <Badge className="bg-blue-100 text-blue-800">Uso Interno</Badge> : <Badge className="bg-emerald-100 text-emerald-800">Uso Esterno</Badge>}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Destinatario</p><p className="font-medium">{dest}</p></div>
            {sale.customer_vat && <div><p className="text-xs text-muted-foreground">P.IVA</p><p className="font-medium">{sale.customer_vat}</p></div>}
            {sale.customer_address && <div className="col-span-2"><p className="text-xs text-muted-foreground">Indirizzo</p><p className="text-sm">{sale.customer_address}</p></div>}
          </div>
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b">
                  <th className="p-2 text-left">Cod.</th>
                  <th className="p-2 text-left">Descrizione</th>
                  <th className="p-2 text-right">Q.tà</th>
                  <th className="p-2 text-right">P.Unit.</th>
                  <th className="p-2 text-right">Totale</th>
                </tr>
              </thead>
              <tbody>
                {(sale.items||[]).map((it, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-2 font-mono text-xs">{it.article_ref}</td>
                    <td className="p-2">{it.description}</td>
                    <td className="p-2 text-right">{it.quantity} {it.unit_of_measure}</td>
                    <td className="p-2 text-right">{fmtPrice(it.unit_price)}</td>
                    <td className="p-2 text-right font-semibold">{fmtPrice(it.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr><td colSpan={2} className="p-2 text-right text-muted-foreground">Totale ({totalQty} pz):</td><td colSpan={3} className="p-2 text-right font-bold text-lg text-emerald-700">{fmtPrice(sale.total)}</td></tr>
              </tfoot>
            </table>
          </div>
          {sale.notes && (
            <div className="bg-slate-50 rounded p-3">
              <p className="text-xs text-muted-foreground mb-1">Note</p>
              <p className="text-sm whitespace-pre-wrap">{sale.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


// ============================================================
// AI SEARCH RESULT DIALOG
// ============================================================
function AiSearchResultDialog({ result, onClose, onApply }) {
  const confidenceColor = {
    high: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    medium: 'bg-amber-100 text-amber-800 border-amber-300',
    low: 'bg-rose-100 text-rose-800 border-rose-300',
  }[result?.confidence || 'medium'] || 'bg-slate-100 text-slate-800';

  const fmtRange = (min, max, currency = 'EUR') => {
    if (!min && !max) return '—';
    const cur = currency === 'EUR' ? '€' : currency;
    if (min && max && min !== max) return `${cur} ${min.toFixed(2)} – ${cur} ${max.toFixed(2)}`;
    return `${cur} ${(min || max).toFixed(2)}`;
  };

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-violet-600"/>
            Report Ricerca AI
          </DialogTitle>
          <DialogDescription>
            Risultati comparativi della ricerca prodotti simili sui principali fornitori nautici.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Identification */}
          <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-violet-700 font-semibold uppercase tracking-wide">Prodotto Identificato</p>
                <p className="text-base font-bold text-violet-900 break-words">{result.product_name || '—'}</p>
              </div>
              <Badge className={`border ${confidenceColor}`}>
                Confidenza: {result.confidence === 'high' ? 'Alta' : result.confidence === 'low' ? 'Bassa' : 'Media'}
              </Badge>
            </div>
            {result.description && (
              <p className="text-sm text-slate-700 mt-2 leading-relaxed">{result.description}</p>
            )}
          </div>

          {/* Characteristics */}
          {result.characteristics?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Caratteristiche</p>
              <div className="flex flex-wrap gap-1.5">
                {result.characteristics.map((c, i) => (
                  <Badge key={i} variant="outline" className="bg-slate-50 text-slate-700">{c}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions Summary */}
          <div className="grid grid-cols-2 gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <div>
              <p className="text-xs text-emerald-700 font-semibold uppercase">Categoria Suggerita</p>
              <p className="text-base font-bold text-emerald-900">{result.suggested_category || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-700 font-semibold uppercase">Valore a Nuovo Stimato</p>
              <p className="text-base font-bold text-emerald-900">
                {result.suggested_value_new_eur ? `€ ${result.suggested_value_new_eur.toFixed(2)}` : '—'}
              </p>
            </div>
          </div>

          {/* Suppliers */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide flex items-center gap-1">
              <ShoppingCart className="w-3.5 h-3.5"/>Confronto Fornitori
            </p>
            <div className="space-y-2">
              {(result.suppliers || []).map((s, i) => (
                <div key={i} className="border rounded-lg p-3 bg-white hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <p className="font-bold text-slate-800">{s.name}</p>
                    {s.search_url && (
                      <a
                        href={s.search_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3"/>Apri ricerca su {s.name}
                      </a>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {(s.products || []).slice(0, 2).map((p, j) => (
                      <div key={j} className="text-sm border-l-2 border-slate-200 pl-2">
                        <div className="flex justify-between gap-2 flex-wrap">
                          <p className="font-medium text-slate-700 flex-1">{p.title}</p>
                          <p className="font-bold text-emerald-700 whitespace-nowrap">{fmtRange(p.price_min, p.price_max, p.currency)}</p>
                        </div>
                        {p.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{p.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General Notes */}
          {result.notes_general && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <p className="text-xs text-amber-700 font-semibold uppercase mb-1">Note Generali</p>
              <p className="text-sm text-amber-900">{result.notes_general}</p>
            </div>
          )}

          {/* Auto-Fill Prompt */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1">
              <Wand2 className="w-4 h-4 text-violet-600"/>
              Vuoi compilare automaticamente i campi dell'articolo?
            </p>
            <p className="text-xs text-slate-600 mb-3">
              Verranno popolati: <b>Descrizione</b>, <b>Categoria</b>, <b>Valore a Nuovo</b> e le <b>Note</b> (con descrizione e caratteristiche AI). Potrai modificarli prima di salvare.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={onApply}
                className="bg-violet-600 text-white hover:bg-violet-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-1"/>Sì, compila automaticamente
              </Button>
              <Button variant="outline" onClick={onClose}>
                No, chiudi
              </Button>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center italic">
            ⚠️ I prezzi sono stime indicative generate dall'AI. Verifica sempre sui siti dei fornitori prima di registrare il valore.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
