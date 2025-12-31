import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Edit, Trash2, X, Star, Users, User, Mail, Phone, Building2,
  MessageCircle, RefreshCw, ChevronLeft, CheckCircle, AlertCircle, Tag,
  MoreVertical, UserPlus, Filter, Heart, Globe, MapPin, FileText, Send,
  Copy, ExternalLink
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// =============================================================================
// AUTH HOOK - Uses Suite authentication
// =============================================================================
const useContactsAuth = () => {
  const getAuthHeader = () => {
    const auth = localStorage.getItem("trivorsuite_auth");
    if (auth) {
      return { Authorization: `Basic ${auth}` };
    }
    return {};
  };

  const isAuthenticated = () => {
    return !!localStorage.getItem("trivorsuite_auth");
  };

  return { getAuthHeader, isAuthenticated };
};

// =============================================================================
// CONTACT AVATAR
// =============================================================================
const ContactAvatar = ({ contact, size = "md" }) => {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
    xl: "w-20 h-20 text-2xl"
  };
  
  const initials = `${contact.nome?.[0] || ''}${contact.cognome?.[0] || ''}`.toUpperCase() || '?';
  
  return (
    <div 
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: contact.avatar_color || '#3B82F6' }}
    >
      {initials}
    </div>
  );
};

// =============================================================================
// CONTACT FORM MODAL
// =============================================================================
const ContactFormModal = ({ contact, groups, onClose, onSave, getAuthHeader }) => {
  const [form, setForm] = useState({
    nome: contact?.nome || "",
    cognome: contact?.cognome || "",
    email: contact?.email || "",
    telefono: contact?.telefono || "",
    whatsapp: contact?.whatsapp || "",
    azienda: contact?.azienda || "",
    ruolo: contact?.ruolo || "",
    indirizzo: contact?.indirizzo || "",
    note: contact?.note || "",
    gruppi: contact?.gruppi || [],
    preferito: contact?.preferito || false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      setError("Il nome è obbligatorio");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const url = contact?.id 
        ? `${API}/contacts/${contact.id}` 
        : `${API}/contacts`;
      
      const response = await fetch(url, {
        method: contact?.id ? "PUT" : "POST",
        headers: { ...getAuthHeader(), "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      
      if (response.ok) {
        onSave();
      } else {
        const data = await response.json();
        setError(data.detail || "Errore nel salvataggio");
      }
    } catch (e) {
      setError("Errore di connessione");
    }
    setLoading(false);
  };

  const toggleGroup = (groupId) => {
    setForm(prev => ({
      ...prev,
      gruppi: prev.gruppi.includes(groupId)
        ? prev.gruppi.filter(g => g !== groupId)
        : [...prev.gruppi, groupId]
    }));
  };

  const colorOptions = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899"];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <User className="w-6 h-6 text-cyan-400 mr-3" />
            {contact ? "Modifica Contatto" : "Nuovo Contatto"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
          {/* Nome e Cognome */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Nome *</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Mario"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Cognome</label>
              <input
                type="text"
                value={form.cognome}
                onChange={(e) => setForm({ ...form, cognome: e.target.value })}
                placeholder="Rossi"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              <Mail className="w-4 h-4 inline mr-1" /> Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="mario.rossi@email.com"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Telefono e WhatsApp */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                <Phone className="w-4 h-4 inline mr-1" /> Telefono
              </label>
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="+39 333 1234567"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                <MessageCircle className="w-4 h-4 inline mr-1" /> WhatsApp
              </label>
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="+39 333 1234567"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Azienda e Ruolo */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                <Building2 className="w-4 h-4 inline mr-1" /> Azienda
              </label>
              <input
                type="text"
                value={form.azienda}
                onChange={(e) => setForm({ ...form, azienda: e.target.value })}
                placeholder="Azienda SRL"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Ruolo</label>
              <input
                type="text"
                value={form.ruolo}
                onChange={(e) => setForm({ ...form, ruolo: e.target.value })}
                placeholder="Responsabile IT"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Indirizzo */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              <MapPin className="w-4 h-4 inline mr-1" /> Indirizzo
            </label>
            <input
              type="text"
              value={form.indirizzo}
              onChange={(e) => setForm({ ...form, indirizzo: e.target.value })}
              placeholder="Via Roma 1, 00100 Roma"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Gruppi */}
          {groups.length > 0 && (
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                <Users className="w-4 h-4 inline mr-1" /> Gruppi
              </label>
              <div className="flex flex-wrap gap-2">
                {groups.map(group => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`px-3 py-1.5 rounded-full text-sm flex items-center transition-all ${
                      form.gruppi.includes(group.id)
                        ? 'text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                    style={form.gruppi.includes(group.id) ? { backgroundColor: group.colore } : {}}
                  >
                    <Users className="w-3 h-3 mr-1" />
                    {group.nome}
                    {form.gruppi.includes(group.id) && <CheckCircle className="w-3 h-3 ml-1" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preferito */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, preferito: !form.preferito })}
              className={`p-2 rounded-lg transition-colors ${
                form.preferito ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400'
              }`}
            >
              <Star className={`w-5 h-5 ${form.preferito ? 'fill-current' : ''}`} />
            </button>
            <span className="text-slate-300 text-sm">Contatto preferito</span>
          </div>

          {/* Note */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Note</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Note sul contatto..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-400 hover:text-white">
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-xl disabled:opacity-50 flex items-center"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
              {contact ? "Salva" : "Crea Contatto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// GROUP FORM MODAL
// =============================================================================
const GroupFormModal = ({ group, onClose, onSave, getAuthHeader }) => {
  const [form, setForm] = useState({
    nome: group?.nome || "",
    descrizione: group?.descrizione || "",
    colore: group?.colore || "#3B82F6",
  });
  const [loading, setLoading] = useState(false);

  const colorOptions = [
    "#EF4444", "#F97316", "#EAB308", "#22C55E", 
    "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const url = group?.id 
        ? `${API}/contacts/groups/${group.id}` 
        : `${API}/contacts/groups`;
      
      await fetch(url, {
        method: group?.id ? "PUT" : "POST",
        headers: { ...getAuthHeader(), "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      onSave();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
          <Users className="w-6 h-6 text-cyan-400 mr-3" />
          {group ? "Modifica Gruppo" : "Nuovo Gruppo"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Nome Gruppo *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="es: Clienti, Team, Fornitori..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Descrizione</label>
            <input
              type="text"
              value={form.descrizione}
              onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
              placeholder="Descrizione opzionale..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Colore</label>
            <div className="flex space-x-2">
              {colorOptions.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, colore: color })}
                  className={`w-8 h-8 rounded-full transition-transform ${form.colore === color ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-400 hover:text-white">
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading || !form.nome.trim()}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-xl disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : (group ? "Salva" : "Crea")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// CONTACT PICKER (Reusable component for selecting contacts)
// =============================================================================
export const ContactPicker = ({ onSelect, onClose, multiple = false, selectedIds = [], getAuthHeader }) => {
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [selected, setSelected] = useState(selectedIds);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contactsRes, groupsRes] = await Promise.all([
          fetch(`${API}/contacts`, { headers: getAuthHeader() }),
          fetch(`${API}/contacts/groups/list`, { headers: getAuthHeader() }),
        ]);
        setContacts(await contactsRes.json());
        setGroups(await groupsRes.json());
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, [getAuthHeader]);

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = !search || 
      `${c.nome} ${c.cognome}`.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.telefono?.includes(search) ||
      c.whatsapp?.includes(search);
    const matchesGroup = filterGroup === "all" || c.gruppi?.includes(filterGroup);
    return matchesSearch && matchesGroup;
  });

  const toggleSelect = (contact) => {
    if (multiple) {
      setSelected(prev => 
        prev.includes(contact.id) 
          ? prev.filter(id => id !== contact.id)
          : [...prev, contact.id]
      );
    } else {
      onSelect(contact);
    }
  };

  const handleConfirm = () => {
    const selectedContacts = contacts.filter(c => selected.includes(c.id));
    onSelect(selectedContacts);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Users className="w-5 h-5 text-cyan-400 mr-2" />
              Seleziona Contatto
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca per nome, email, telefono..."
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
              />
            </div>
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="all">Tutti i gruppi</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nessun contatto trovato</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map(contact => {
                const isSelected = selected.includes(contact.id);
                return (
                  <div
                    key={contact.id}
                    onClick={() => toggleSelect(contact)}
                    className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                      isSelected 
                        ? 'bg-cyan-500/20 border border-cyan-500/50' 
                        : 'bg-slate-800/50 border border-transparent hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <ContactAvatar contact={contact} size="md" />
                      <div>
                        <p className="text-white font-medium">
                          {contact.nome} {contact.cognome}
                          {contact.preferito && <Star className="w-4 h-4 inline ml-1 text-yellow-400 fill-current" />}
                        </p>
                        <div className="flex items-center space-x-3 text-slate-400 text-sm">
                          {contact.email && <span className="flex items-center"><Mail className="w-3 h-3 mr-1" />{contact.email}</span>}
                          {contact.whatsapp && <span className="flex items-center"><MessageCircle className="w-3 h-3 mr-1" />{contact.whatsapp}</span>}
                        </div>
                      </div>
                    </div>
                    {multiple && (
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-500'
                      }`}>
                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {multiple && selected.length > 0 && (
          <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-between items-center">
            <span className="text-slate-400">{selected.length} selezionati</span>
            <button
              onClick={handleConfirm}
              className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium"
            >
              Conferma
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN CONTACTS APP
// =============================================================================
const TrivorContacts = () => {
  const { getAuthHeader, isAuthenticated } = useContactsAuth();
  const navigate = useNavigate();
  
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterPreferiti, setFilterPreferiti] = useState(false);
  
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [contactsRes, groupsRes, statsRes] = await Promise.all([
        fetch(`${API}/contacts`, { headers: getAuthHeader() }),
        fetch(`${API}/contacts/groups/list`, { headers: getAuthHeader() }),
        fetch(`${API}/contacts/stats/summary`, { headers: getAuthHeader() }),
      ]);
      setContacts(await contactsRes.json());
      setGroups(await groupsRes.json());
      setStats(await statsRes.json());
    } catch (e) {
      console.error(e);
    }
    if (showLoading) setLoading(false);
  }, [getAuthHeader]);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/suite");
      return;
    }
    fetchData();
  }, [fetchData, isAuthenticated, navigate]);

  const handleDelete = async (contactId) => {
    if (!window.confirm("Eliminare questo contatto?")) return;
    try {
      await fetch(`${API}/contacts/${contactId}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("Eliminare questo gruppo?")) return;
    try {
      await fetch(`${API}/contacts/groups/${groupId}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const togglePreferito = async (contact) => {
    try {
      await fetch(`${API}/contacts/${contact.id}/toggle-preferito`, {
        method: "POST",
        headers: getAuthHeader(),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = !search || 
      `${c.nome} ${c.cognome}`.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.azienda?.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = filterGroup === "all" || c.gruppi?.includes(filterGroup);
    const matchesPreferiti = !filterPreferiti || c.preferito;
    return matchesSearch && matchesGroup && matchesPreferiti;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900/10 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate("/suite")} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-xs text-cyan-400 font-medium tracking-wider">TRIVOR SUITE</p>
                  <h1 className="text-xl font-bold text-white">Contatti</h1>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowGroupForm(true)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm flex items-center"
              >
                <Tag className="w-4 h-4 mr-2" /> Nuovo Gruppo
              </button>
              <button
                onClick={() => { setEditingContact(null); setShowContactForm(true); }}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm flex items-center"
              >
                <UserPlus className="w-4 h-4 mr-2" /> Nuovo Contatto
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-sm">Totale</span>
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.totale_contatti}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-sm">Preferiti</span>
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold text-yellow-400">{stats.preferiti}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-sm">Gruppi</span>
                <Tag className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-purple-400">{stats.gruppi}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-sm">Con Email</span>
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-blue-400">{stats.con_email}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-sm">Con WhatsApp</span>
                <MessageCircle className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-green-400">{stats.con_whatsapp}</p>
            </div>
          </div>
        )}

        {/* Groups */}
        {groups.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white font-medium mb-3 flex items-center">
              <Tag className="w-5 h-5 text-purple-400 mr-2" /> Gruppi
            </h3>
            <div className="flex flex-wrap gap-2">
              {groups.map(group => (
                <div
                  key={group.id}
                  className="px-4 py-2 rounded-xl flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: `${group.colore}20`, borderColor: `${group.colore}50`, borderWidth: 1 }}
                  onClick={() => setFilterGroup(filterGroup === group.id ? "all" : group.id)}
                >
                  <span style={{ color: group.colore }}>{group.nome}</span>
                  <span className="text-slate-400 text-sm">({group.membri_count})</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingGroup(group); setShowGroupForm(true); }}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <Edit className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca contatti..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
              />
            </div>
            <button
              onClick={() => setFilterPreferiti(!filterPreferiti)}
              className={`px-4 py-2.5 rounded-lg flex items-center ${
                filterPreferiti ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-slate-700 text-slate-400'
              }`}
            >
              <Star className={`w-5 h-5 mr-2 ${filterPreferiti ? 'fill-current' : ''}`} />
              Preferiti
            </button>
          </div>
        </div>

        {/* Contacts Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Nessun contatto trovato</p>
            <button
              onClick={() => setShowContactForm(true)}
              className="mt-4 px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"
            >
              Aggiungi il primo contatto
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map(contact => (
              <div
                key={contact.id}
                className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <ContactAvatar contact={contact} size="lg" />
                    <div>
                      <p className="text-white font-semibold flex items-center">
                        {contact.nome} {contact.cognome}
                        {contact.preferito && <Star className="w-4 h-4 ml-1 text-yellow-400 fill-current" />}
                      </p>
                      {contact.ruolo && <p className="text-slate-400 text-sm">{contact.ruolo}</p>}
                      {contact.azienda && (
                        <p className="text-slate-500 text-xs flex items-center mt-1">
                          <Building2 className="w-3 h-3 mr-1" /> {contact.azienda}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => togglePreferito(contact)}
                    className={`p-1.5 rounded-lg ${contact.preferito ? 'text-yellow-400' : 'text-slate-500 hover:text-yellow-400'}`}
                  >
                    <Star className={`w-5 h-5 ${contact.preferito ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  {contact.email && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 flex items-center">
                        <Mail className="w-4 h-4 mr-2" /> {contact.email}
                      </span>
                      <button onClick={() => copyToClipboard(contact.email)} className="text-slate-500 hover:text-white">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {contact.telefono && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 flex items-center">
                        <Phone className="w-4 h-4 mr-2" /> {contact.telefono}
                      </span>
                      <button onClick={() => copyToClipboard(contact.telefono)} className="text-slate-500 hover:text-white">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {contact.whatsapp && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-400 flex items-center">
                        <MessageCircle className="w-4 h-4 mr-2" /> {contact.whatsapp}
                      </span>
                      <a
                        href={`https://wa.me/${contact.whatsapp.replace(/\s|-|\+/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 hover:text-green-300"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Groups tags */}
                {contact.gruppi?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {contact.gruppi.map(gId => {
                      const group = groups.find(g => g.id === gId);
                      return group ? (
                        <span
                          key={gId}
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{ backgroundColor: `${group.colore}30`, color: group.colore }}
                        >
                          {group.nome}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                  <div className="flex space-x-1">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg">
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                    {contact.whatsapp && (
                      <a
                        href={`https://wa.me/${contact.whatsapp.replace(/\s|-|\+/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                    {contact.telefono && (
                      <a href={`tel:${contact.telefono}`} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg">
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => { setEditingContact(contact); setShowContactForm(true); }}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {showContactForm && (
        <ContactFormModal
          contact={editingContact}
          groups={groups}
          onClose={() => { setShowContactForm(false); setEditingContact(null); }}
          onSave={() => { setShowContactForm(false); setEditingContact(null); fetchData(false); }}
          getAuthHeader={getAuthHeader}
        />
      )}

      {showGroupForm && (
        <GroupFormModal
          group={editingGroup}
          onClose={() => { setShowGroupForm(false); setEditingGroup(null); }}
          onSave={() => { setShowGroupForm(false); setEditingGroup(null); fetchData(); }}
          getAuthHeader={getAuthHeader}
        />
      )}
    </div>
  );
};

export default TrivorContacts;
