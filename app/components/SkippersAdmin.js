'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Anchor, Plus, Edit, Trash2, Users, Phone, Mail, Key } from 'lucide-react';

const ROLE = 'SKIPPER';

export default function SkippersAdmin({ companyId }) {
  const [skippers, setSkippers] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [usersRes, resRes] = await Promise.all([
        fetch(`/api/users?company_id=${companyId}&role=${ROLE}`),
        fetch(`/api/resources?company_id=${companyId}`),
      ]);
      const users = await usersRes.json();
      const allResources = await resRes.json();
      setSkippers(Array.isArray(users) ? users : []);
      // Solo barche/auto (risorse trasportabili)
      setResources(Array.isArray(allResources) ? allResources.filter(r => ['BOAT', 'CAR'].includes(r.type)) : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [companyId]);

  const handleSave = async (formData) => {
    setLoading(true);
    try {
      const url = editing ? `/api/users/${editing.id}` : '/api/users';
      const method = editing ? 'PUT' : 'POST';
      const payload = { ...formData, role: ROLE, company_id: companyId };
      if (editing && !formData.password) delete payload.password;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Errore salvataggio');
      }
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo skipper?')) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Anchor className="w-5 h-5 text-blue-600" />
            Gestione Skipper
          </h3>
          <p className="text-sm text-muted-foreground">Crea account skipper, assegna risorse e gestisci credenziali</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Nuovo Skipper
        </Button>
      </div>

      {skippers.length === 0 && !loading && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Anchor className="w-10 h-10 mx-auto opacity-40 mb-2" />
            Nessuno skipper creato. Crea il primo account per iniziare.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {skippers.map((s) => {
          const assigned = resources.filter(r => (s.assigned_resource_ids || []).includes(r.id));
          return (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    {s.full_name || s.username || s.email}
                  </span>
                  {!s.is_active && <Badge variant="destructive">Disattivo</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3 h-3" /> {s.email || '-'}
                </div>
                {s.username && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Key className="w-3 h-3" /> {s.username}
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3 h-3" /> {s.phone}
                  </div>
                )}
                <div className="pt-2 border-t">
                  <div className="text-xs font-semibold mb-1">Risorse assegnate ({assigned.length})</div>
                  <div className="flex flex-wrap gap-1">
                    {assigned.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">Nessuna</span>
                    ) : assigned.map(r => (
                      <Badge key={r.id} variant="secondary" className="text-xs">{r.name}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(s); setShowForm(true); }}>
                    <Edit className="w-3 h-3 mr-1" /> Modifica
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showForm && (
        <SkipperForm
          skipper={editing}
          resources={resources}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={handleSave}
          loading={loading}
        />
      )}
    </div>
  );
}

function SkipperForm({ skipper, resources, onClose, onSave, loading }) {
  const [full_name, setFullName] = useState(skipper?.full_name || '');
  const [email, setEmail] = useState(skipper?.email || '');
  const [username, setUsername] = useState(skipper?.username || '');
  const [phone, setPhone] = useState(skipper?.phone || '');
  const [password, setPassword] = useState('');
  const [assignedIds, setAssignedIds] = useState(skipper?.assigned_resource_ids || []);
  const [isActive, setIsActive] = useState(skipper?.is_active !== false);

  const toggle = (id) => {
    setAssignedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{skipper ? 'Modifica Skipper' : 'Nuovo Skipper'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome completo *</Label>
            <Input value={full_name} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="opzionale" />
            </div>
          </div>
          <div>
            <Label>Telefono</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+39 ..." />
          </div>
          <div>
            <Label>Password {skipper && <span className="text-xs text-muted-foreground">(lascia vuoto per non modificare)</span>}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={skipper ? 'Non modificare' : 'Password iniziale'} />
          </div>
          <div>
            <Label>Risorse assegnate (barche/mezzi)</Label>
            <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto border rounded p-2 mt-1">
              {resources.length === 0 ? (
                <span className="text-xs text-muted-foreground col-span-2 p-2">Nessuna risorsa disponibile</span>
              ) : resources.map(r => (
                <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-slate-50 rounded">
                  <input
                    type="checkbox"
                    checked={assignedIds.includes(r.id)}
                    onChange={() => toggle(r.id)}
                  />
                  <span className="truncate">{r.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <Label htmlFor="is_active">Account attivo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button
            disabled={loading || !full_name || !email || (!skipper && !password)}
            onClick={() => onSave({ full_name, email, username, phone, password, assigned_resource_ids: assignedIds, is_active: isActive })}
          >
            {loading ? 'Salvataggio...' : 'Salva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
