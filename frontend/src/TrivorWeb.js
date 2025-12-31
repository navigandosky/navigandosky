import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Filter, Globe, Server, Database, Calendar, User, Building2,
  Clock, AlertCircle, CheckCircle, XCircle, Plus, Edit, Trash2, Eye, X,
  RefreshCw, LogOut, Home, ChevronRight, ChevronLeft, Mail, Phone, Lock,
  HardDrive, CreditCard, ExternalLink, Copy, Shield, Wifi, FolderOpen,
  AlertTriangle, BarChart3, Tag, Settings, Link2, FileText, DollarSign
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// =============================================================================
// AUTH HOOK - Uses Suite authentication
// =============================================================================
const useTrivorWebAuth = () => {
  const getAuthHeader = useCallback(() => {
    const auth = localStorage.getItem("trivorsuite_auth");
    if (auth) {
      return { Authorization: `Basic ${auth}` };
    }
    return {};
  }, []);

  const isAuthenticated = useCallback(() => {
    return !!localStorage.getItem("trivorsuite_auth");
  }, []);

  return { getAuthHeader, isAuthenticated };
};

// =============================================================================
// SITE FORM COMPONENT
// =============================================================================
const SiteForm = ({ site, onClose, onSave, getAuthHeader }) => {
  const [form, setForm] = useState({
    nome_progetto: site?.nome_progetto || "",
    dominio: site?.dominio || "",
    stato: site?.stato || "attivo",
    cliente: site?.cliente || {
      nome: "", azienda: "", email: "", telefono: "", pec: "", 
      indirizzo: "", partita_iva: "", codice_fiscale: "", note: ""
    },
    data_inizio: site?.data_inizio || "",
    data_online: site?.data_online || "",
    hosting: site?.hosting || {
      provider: "", tipo: "", piano: "", spazio_gb: 0, costo_annuale: 0,
      data_acquisto: "", data_scadenza: "", alert_giorni: 30,
      pannello_url: "", pannello_user: "", pannello_password: "", note: ""
    },
    ftp: site?.ftp || {
      host: "", username: "", password: "", porta: 21, percorso_root: "/"
    },
    databases: site?.databases || [],
    tecnologie: site?.tecnologie || [],
    url_staging: site?.url_staging || "",
    url_produzione: site?.url_produzione || "",
    note_tecniche: site?.note_tecniche || "",
    note_generali: site?.note_generali || "",
    costo_realizzazione: site?.costo_realizzazione || 0,
    costo_manutenzione_annuale: site?.costo_manutenzione_annuale || 0,
  });
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("generale");
  const [techInput, setTechInput] = useState("");
  const [showPassword, setShowPassword] = useState({});

  const hostingTypes = ["shared", "VPS", "dedicato", "cloud", "reseller", "managed"];
  const dbTypes = ["MySQL", "PostgreSQL", "MongoDB", "MariaDB", "SQLite", "SQL Server"];
  const statusOptions = [
    { value: "attivo", label: "Attivo", color: "emerald" },
    { value: "in_sviluppo", label: "In Sviluppo", color: "blue" },
    { value: "sospeso", label: "Sospeso", color: "yellow" },
    { value: "scaduto", label: "Scaduto", color: "red" },
  ];

  const updateNested = (section, field, value) => {
    setForm({ ...form, [section]: { ...form[section], [field]: value } });
  };

  const addTech = () => {
    if (techInput.trim() && !form.tecnologie.includes(techInput.trim())) {
      setForm({ ...form, tecnologie: [...form.tecnologie, techInput.trim()] });
      setTechInput("");
    }
  };

  const removeTech = (tech) => {
    setForm({ ...form, tecnologie: form.tecnologie.filter(t => t !== tech) });
  };

  const addDatabase = () => {
    setForm({
      ...form,
      databases: [...form.databases, {
        provider: "", tipo: "MySQL", host: "", nome_db: "", username: "",
        password: "", porta: 3306, spazio_mb: 0, costo_annuale: 0, note: ""
      }]
    });
  };

  const updateDatabase = (index, field, value) => {
    const updated = [...form.databases];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, databases: updated });
  };

  const removeDatabase = (index) => {
    setForm({ ...form, databases: form.databases.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (site?.id) {
        await fetch(`${API}/trivorweb/sites/${site.id}`, {
          method: "PUT",
          headers: { ...getAuthHeader(), "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch(`${API}/trivorweb/sites`, {
          method: "POST",
          headers: { ...getAuthHeader(), "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      onSave();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const tabs = [
    { id: "generale", label: "Generale", icon: Globe },
    { id: "cliente", label: "Cliente", icon: User },
    { id: "hosting", label: "Hosting", icon: Server },
    { id: "ftp", label: "FTP", icon: FolderOpen },
    { id: "database", label: "Database", icon: Database },
    { id: "costi", label: "Costi", icon: CreditCard },
  ];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Globe className="w-6 h-6 text-purple-400 mr-3" />
            {site ? "Modifica Sito" : "Nuovo Sito Web"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-800/30 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "text-purple-400 border-b-2 border-purple-400 bg-purple-500/10"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* GENERALE TAB */}
          {activeTab === "generale" && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Nome Progetto *</label>
                  <input
                    type="text"
                    value={form.nome_progetto}
                    onChange={(e) => setForm({ ...form, nome_progetto: e.target.value })}
                    required
                    placeholder="es: Sito Web Azienda XYZ"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Dominio *</label>
                  <input
                    type="text"
                    value={form.dominio}
                    onChange={(e) => setForm({ ...form, dominio: e.target.value })}
                    required
                    placeholder="es: www.esempio.it"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Stato</label>
                  <select
                    value={form.stato}
                    onChange={(e) => setForm({ ...form, stato: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:border-purple-500 focus:outline-none"
                  >
                    {statusOptions.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Data Inizio</label>
                  <input
                    type="date"
                    value={form.data_inizio}
                    onChange={(e) => setForm({ ...form, data_inizio: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Data Online</label>
                  <input
                    type="date"
                    value={form.data_online}
                    onChange={(e) => setForm({ ...form, data_online: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">URL Produzione</label>
                  <div className="flex">
                    <input
                      type="url"
                      value={form.url_produzione}
                      onChange={(e) => setForm({ ...form, url_produzione: e.target.value })}
                      placeholder="https://www.esempio.it"
                      className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-l-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                    />
                    {form.url_produzione && (
                      <a href={form.url_produzione} target="_blank" rel="noopener noreferrer" className="px-4 py-3 bg-purple-500 text-white rounded-r-xl hover:bg-purple-600">
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">URL Staging</label>
                  <div className="flex">
                    <input
                      type="url"
                      value={form.url_staging}
                      onChange={(e) => setForm({ ...form, url_staging: e.target.value })}
                      placeholder="https://staging.esempio.it"
                      className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-l-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                    />
                    {form.url_staging && (
                      <a href={form.url_staging} target="_blank" rel="noopener noreferrer" className="px-4 py-3 bg-slate-600 text-white rounded-r-xl hover:bg-slate-500">
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Tecnologie */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Tecnologie Utilizzate</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTech())}
                    placeholder="es: WordPress, React, Laravel..."
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                  <button type="button" onClick={addTech} className="px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600">
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.tecnologie.map((tech) => (
                    <span key={tech} className="inline-flex items-center px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                      <Tag className="w-3 h-3 mr-1" />
                      {tech}
                      <button type="button" onClick={() => removeTech(tech)} className="ml-2 hover:text-red-400">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Note Tecniche</label>
                <textarea
                  value={form.note_tecniche}
                  onChange={(e) => setForm({ ...form, note_tecniche: e.target.value })}
                  rows={3}
                  placeholder="Configurazioni speciali, plugin installati, personalizzazioni..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Note Generali</label>
                <textarea
                  value={form.note_generali}
                  onChange={(e) => setForm({ ...form, note_generali: e.target.value })}
                  rows={3}
                  placeholder="Altre informazioni utili..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* CLIENTE TAB */}
          {activeTab === "cliente" && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Nome Referente</label>
                  <input
                    type="text"
                    value={form.cliente.nome}
                    onChange={(e) => updateNested("cliente", "nome", e.target.value)}
                    placeholder="Mario Rossi"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Azienda</label>
                  <input
                    type="text"
                    value={form.cliente.azienda}
                    onChange={(e) => updateNested("cliente", "azienda", e.target.value)}
                    placeholder="Azienda SRL"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={form.cliente.email}
                    onChange={(e) => updateNested("cliente", "email", e.target.value)}
                    placeholder="info@azienda.it"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Telefono</label>
                  <input
                    type="tel"
                    value={form.cliente.telefono}
                    onChange={(e) => updateNested("cliente", "telefono", e.target.value)}
                    placeholder="+39 123 456 7890"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">PEC</label>
                <input
                  type="email"
                  value={form.cliente.pec}
                  onChange={(e) => updateNested("cliente", "pec", e.target.value)}
                  placeholder="azienda@pec.it"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Indirizzo</label>
                <input
                  type="text"
                  value={form.cliente.indirizzo}
                  onChange={(e) => updateNested("cliente", "indirizzo", e.target.value)}
                  placeholder="Via Roma 1, 00100 Roma (RM)"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Partita IVA</label>
                  <input
                    type="text"
                    value={form.cliente.partita_iva}
                    onChange={(e) => updateNested("cliente", "partita_iva", e.target.value)}
                    placeholder="IT12345678901"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Codice Fiscale</label>
                  <input
                    type="text"
                    value={form.cliente.codice_fiscale}
                    onChange={(e) => updateNested("cliente", "codice_fiscale", e.target.value)}
                    placeholder="RSSMRA80A01H501U"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Note Cliente</label>
                <textarea
                  value={form.cliente.note}
                  onChange={(e) => updateNested("cliente", "note", e.target.value)}
                  rows={3}
                  placeholder="Preferenze, orari di contatto, altre info..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* HOSTING TAB */}
          {activeTab === "hosting" && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Provider</label>
                  <input
                    type="text"
                    value={form.hosting.provider}
                    onChange={(e) => updateNested("hosting", "provider", e.target.value)}
                    placeholder="es: Aruba, SiteGround, OVH..."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Tipo Hosting</label>
                  <select
                    value={form.hosting.tipo}
                    onChange={(e) => updateNested("hosting", "tipo", e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">Seleziona...</option>
                    {hostingTypes.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Piano</label>
                  <input
                    type="text"
                    value={form.hosting.piano}
                    onChange={(e) => updateNested("hosting", "piano", e.target.value)}
                    placeholder="es: Business, Premium..."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Spazio Disco (GB)</label>
                  <input
                    type="number"
                    value={form.hosting.spazio_gb || ""}
                    onChange={(e) => updateNested("hosting", "spazio_gb", parseFloat(e.target.value) || 0)}
                    placeholder="10"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Costo Annuale (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.hosting.costo_annuale || ""}
                    onChange={(e) => updateNested("hosting", "costo_annuale", parseFloat(e.target.value) || 0)}
                    placeholder="99.00"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Data Acquisto</label>
                  <input
                    type="date"
                    value={form.hosting.data_acquisto}
                    onChange={(e) => updateNested("hosting", "data_acquisto", e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Data Scadenza</label>
                  <input
                    type="date"
                    value={form.hosting.data_scadenza}
                    onChange={(e) => updateNested("hosting", "data_scadenza", e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Alert (giorni prima)</label>
                  <input
                    type="number"
                    value={form.hosting.alert_giorni || 30}
                    onChange={(e) => updateNested("hosting", "alert_giorni", parseInt(e.target.value) || 30)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h4 className="text-white font-medium mb-3 flex items-center">
                  <Shield className="w-5 h-5 text-purple-400 mr-2" />
                  Credenziali Pannello di Controllo
                </h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">URL Pannello</label>
                    <div className="flex">
                      <input
                        type="url"
                        value={form.hosting.pannello_url}
                        onChange={(e) => updateNested("hosting", "pannello_url", e.target.value)}
                        placeholder="https://pannello.provider.it"
                        className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-l-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                      />
                      {form.hosting.pannello_url && (
                        <a href={form.hosting.pannello_url} target="_blank" rel="noopener noreferrer" className="px-3 py-3 bg-slate-700 text-white rounded-r-xl hover:bg-slate-600">
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Username</label>
                    <div className="flex">
                      <input
                        type="text"
                        value={form.hosting.pannello_user}
                        onChange={(e) => updateNested("hosting", "pannello_user", e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-l-xl text-white focus:border-purple-500 focus:outline-none"
                      />
                      <button type="button" onClick={() => copyToClipboard(form.hosting.pannello_user)} className="px-3 py-3 bg-slate-700 text-slate-400 rounded-r-xl hover:text-white">
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
                    <div className="flex">
                      <input
                        type={showPassword.pannello ? "text" : "password"}
                        value={form.hosting.pannello_password}
                        onChange={(e) => updateNested("hosting", "pannello_password", e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-l-xl text-white focus:border-purple-500 focus:outline-none"
                      />
                      <button type="button" onClick={() => setShowPassword({...showPassword, pannello: !showPassword.pannello})} className="px-3 py-3 bg-slate-700 text-slate-400 hover:text-white">
                        <Eye className="w-5 h-5" />
                      </button>
                      <button type="button" onClick={() => copyToClipboard(form.hosting.pannello_password)} className="px-3 py-3 bg-slate-700 text-slate-400 rounded-r-xl hover:text-white">
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Note Hosting</label>
                <textarea
                  value={form.hosting.note}
                  onChange={(e) => updateNested("hosting", "note", e.target.value)}
                  rows={2}
                  placeholder="IP dedicato, certificati SSL, altre info..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* FTP TAB */}
          {activeTab === "ftp" && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <h4 className="text-white font-medium mb-4 flex items-center">
                  <Wifi className="w-5 h-5 text-purple-400 mr-2" />
                  Credenziali FTP/SFTP
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Host</label>
                    <div className="flex">
                      <input
                        type="text"
                        value={form.ftp.host}
                        onChange={(e) => updateNested("ftp", "host", e.target.value)}
                        placeholder="ftp.esempio.it"
                        className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-l-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                      />
                      <button type="button" onClick={() => copyToClipboard(form.ftp.host)} className="px-3 py-3 bg-slate-700 text-slate-400 rounded-r-xl hover:text-white">
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Porta</label>
                    <input
                      type="number"
                      value={form.ftp.porta || 21}
                      onChange={(e) => updateNested("ftp", "porta", parseInt(e.target.value) || 21)}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Username</label>
                    <div className="flex">
                      <input
                        type="text"
                        value={form.ftp.username}
                        onChange={(e) => updateNested("ftp", "username", e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-l-xl text-white focus:border-purple-500 focus:outline-none"
                      />
                      <button type="button" onClick={() => copyToClipboard(form.ftp.username)} className="px-3 py-3 bg-slate-700 text-slate-400 rounded-r-xl hover:text-white">
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
                    <div className="flex">
                      <input
                        type={showPassword.ftp ? "text" : "password"}
                        value={form.ftp.password}
                        onChange={(e) => updateNested("ftp", "password", e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-l-xl text-white focus:border-purple-500 focus:outline-none"
                      />
                      <button type="button" onClick={() => setShowPassword({...showPassword, ftp: !showPassword.ftp})} className="px-3 py-3 bg-slate-700 text-slate-400 hover:text-white">
                        <Eye className="w-5 h-5" />
                      </button>
                      <button type="button" onClick={() => copyToClipboard(form.ftp.password)} className="px-3 py-3 bg-slate-700 text-slate-400 rounded-r-xl hover:text-white">
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-slate-300 text-sm font-medium mb-2">Percorso Root</label>
                  <input
                    type="text"
                    value={form.ftp.percorso_root}
                    onChange={(e) => updateNested("ftp", "percorso_root", e.target.value)}
                    placeholder="/public_html"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* DATABASE TAB */}
          {activeTab === "database" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-white font-medium flex items-center">
                  <Database className="w-5 h-5 text-purple-400 mr-2" />
                  Database Collegati ({form.databases.length})
                </h4>
                <button type="button" onClick={addDatabase} className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 flex items-center">
                  <Plus className="w-4 h-4 mr-1" /> Aggiungi DB
                </button>
              </div>

              {form.databases.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nessun database configurato</p>
                </div>
              ) : (
                form.databases.map((db, index) => (
                  <div key={index} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                    <div className="flex justify-between items-center mb-4">
                      <h5 className="text-white font-medium">Database #{index + 1}</h5>
                      <button type="button" onClick={() => removeDatabase(index)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">Provider</label>
                        <input
                          type="text"
                          value={db.provider}
                          onChange={(e) => updateDatabase(index, "provider", e.target.value)}
                          placeholder="es: Aruba, OVH..."
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">Tipo</label>
                        <select
                          value={db.tipo}
                          onChange={(e) => updateDatabase(index, "tipo", e.target.value)}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        >
                          {dbTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">Porta</label>
                        <input
                          type="number"
                          value={db.porta}
                          onChange={(e) => updateDatabase(index, "porta", parseInt(e.target.value) || 3306)}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">Host</label>
                        <input
                          type="text"
                          value={db.host}
                          onChange={(e) => updateDatabase(index, "host", e.target.value)}
                          placeholder="localhost o IP"
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">Nome Database</label>
                        <input
                          type="text"
                          value={db.nome_db}
                          onChange={(e) => updateDatabase(index, "nome_db", e.target.value)}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">Username</label>
                        <div className="flex">
                          <input
                            type="text"
                            value={db.username}
                            onChange={(e) => updateDatabase(index, "username", e.target.value)}
                            className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-l-lg text-white focus:border-purple-500 focus:outline-none"
                          />
                          <button type="button" onClick={() => copyToClipboard(db.username)} className="px-3 py-2 bg-slate-600 text-slate-400 rounded-r-lg hover:text-white">
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
                        <div className="flex">
                          <input
                            type={showPassword[`db_${index}`] ? "text" : "password"}
                            value={db.password}
                            onChange={(e) => updateDatabase(index, "password", e.target.value)}
                            className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-l-lg text-white focus:border-purple-500 focus:outline-none"
                          />
                          <button type="button" onClick={() => setShowPassword({...showPassword, [`db_${index}`]: !showPassword[`db_${index}`]})} className="px-3 py-2 bg-slate-600 text-slate-400 hover:text-white">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => copyToClipboard(db.password)} className="px-3 py-2 bg-slate-600 text-slate-400 rounded-r-lg hover:text-white">
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">Spazio (MB)</label>
                        <input
                          type="number"
                          value={db.spazio_mb || ""}
                          onChange={(e) => updateDatabase(index, "spazio_mb", parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">Costo Annuale (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={db.costo_annuale || ""}
                          onChange={(e) => updateDatabase(index, "costo_annuale", parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* COSTI TAB */}
          {activeTab === "costi" && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                  <h4 className="text-white font-medium mb-4 flex items-center">
                    <CreditCard className="w-5 h-5 text-emerald-400 mr-2" />
                    Costo Realizzazione
                  </h4>
                  <input
                    type="number"
                    step="0.01"
                    value={form.costo_realizzazione || ""}
                    onChange={(e) => setForm({ ...form, costo_realizzazione: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-2xl font-bold placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="text-slate-500 text-sm mt-2">Una tantum</p>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                  <h4 className="text-white font-medium mb-4 flex items-center">
                    <RefreshCw className="w-5 h-5 text-blue-400 mr-2" />
                    Manutenzione Annuale
                  </h4>
                  <input
                    type="number"
                    step="0.01"
                    value={form.costo_manutenzione_annuale || ""}
                    onChange={(e) => setForm({ ...form, costo_manutenzione_annuale: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-2xl font-bold placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-slate-500 text-sm mt-2">Ricorrente annuale</p>
                </div>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5">
                <h4 className="text-purple-300 font-medium mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Riepilogo Costi Annuali
                </h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm">Hosting</p>
                    <p className="text-white text-xl font-bold">€ {(form.hosting.costo_annuale || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Manutenzione</p>
                    <p className="text-white text-xl font-bold">€ {(form.costo_manutenzione_annuale || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Totale Annuo</p>
                    <p className="text-purple-400 text-xl font-bold">
                      € {((form.hosting.costo_annuale || 0) + (form.costo_manutenzione_annuale || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-slate-700">
            <button type="button" onClick={onClose} className="px-6 py-3 border border-slate-600 text-slate-400 rounded-xl hover:bg-slate-800">
              Annulla
            </button>
            <button type="submit" disabled={loading} className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center">
              {loading ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
              {site ? "Aggiorna" : "Crea Sito"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN TRIVORWEB APP
// =============================================================================
const TrivorWebApp = () => {
  const { getAuthHeader, isAuthenticated } = useTrivorWebAuth();
  const navigate = useNavigate();
  
  const [sites, setSites] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard"); // dashboard, list
  const [showForm, setShowForm] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deleteModal, setDeleteModal] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sitesRes, statsRes] = await Promise.all([
        fetch(`${API}/trivorweb/sites`, { headers: getAuthHeader() }),
        fetch(`${API}/trivorweb/stats`, { headers: getAuthHeader() }),
      ]);
      setSites(await sitesRes.json());
      setStats(await statsRes.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [getAuthHeader]);

  useEffect(() => {
    // Check if user is authenticated via Suite, if not redirect to Suite
    if (!isAuthenticated()) {
      navigate("/suite");
      return;
    }
    fetchData();
  }, [fetchData, isAuthenticated, navigate]);

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API}/trivorweb/sites/${deleteModal}`, {
        method: "DELETE",
        headers: { ...getAuthHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (res.ok) {
        setDeleteModal(null);
        setDeletePassword("");
        fetchData();
      } else {
        alert("Password non corretta");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      attivo: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      in_sviluppo: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      sospeso: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      scaduto: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return colors[status] || colors.attivo;
  };

  const getStatusLabel = (status) => {
    const labels = { attivo: "Attivo", in_sviluppo: "In Sviluppo", sospeso: "Sospeso", scaduto: "Scaduto" };
    return labels[status] || status;
  };

  const filteredSites = sites.filter(site => {
    const matchesSearch = !searchQuery || 
      site.nome_progetto?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.dominio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.cliente?.azienda?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || site.stato === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate("/suite")} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <Globe className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-xs text-purple-400 font-medium tracking-wider">TRIVOR SUITE</p>
                  <h1 className="text-xl font-bold text-white">TrivorWEB</h1>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={() => { setEditingSite(null); setShowForm(true); }} className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm flex items-center hover:bg-purple-600">
                <Plus className="w-4 h-4 mr-2" /> Nuovo Sito
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="w-10 h-10 text-purple-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Siti Totali</span>
                    <Globe className="w-5 h-5 text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.total_sites}</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">In Scadenza</span>
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">{stats.expiring_soon?.length || 0}</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Costi Hosting/anno</span>
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">€ {(stats.total_hosting_cost || 0).toFixed(0)}</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Manutenzione/anno</span>
                    <DollarSign className="w-5 h-5 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-blue-400">€ {(stats.total_maintenance_cost || 0).toFixed(0)}</p>
                </div>
              </div>
            )}

            {/* Expiring Soon Alert */}
            {stats?.expiring_soon?.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                <h3 className="text-yellow-400 font-medium mb-3 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Hosting in Scadenza (prossimi 30 giorni)
                </h3>
                <div className="space-y-2">
                  {stats.expiring_soon.map((site) => (
                    <div key={site.id} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg">
                      <div>
                        <span className="text-white font-medium">{site.nome_progetto}</span>
                        <span className="text-slate-400 text-sm ml-2">({site.dominio})</span>
                      </div>
                      <span className="text-yellow-400 text-sm">{site.data_scadenza}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search and Filters */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cerca per nome, dominio o cliente..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="all">Tutti gli stati</option>
                  <option value="attivo">Attivo</option>
                  <option value="in_sviluppo">In Sviluppo</option>
                  <option value="sospeso">Sospeso</option>
                  <option value="scaduto">Scaduto</option>
                </select>
              </div>
            </div>

            {/* Sites List */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-white font-semibold">Siti Web ({filteredSites.length})</h3>
              </div>
              {filteredSites.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nessun sito trovato</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {filteredSites.map((site) => (
                    <div key={site.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                            <Globe className="w-6 h-6 text-purple-400" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-white font-medium">{site.nome_progetto}</h4>
                              <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusColor(site.stato)}`}>
                                {getStatusLabel(site.stato)}
                              </span>
                            </div>
                            <p className="text-slate-400 text-sm">{site.dominio}</p>
                            {site.cliente?.azienda && (
                              <p className="text-slate-500 text-xs flex items-center mt-1">
                                <Building2 className="w-3 h-3 mr-1" /> {site.cliente.azienda}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right hidden md:block">
                            {site.hosting?.provider && (
                              <p className="text-slate-400 text-sm">{site.hosting.provider}</p>
                            )}
                            {site.hosting?.data_scadenza && (
                              <p className="text-slate-500 text-xs">Scade: {site.hosting.data_scadenza}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {site.url_produzione && (
                              <a href={site.url_produzione} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-purple-400 hover:bg-slate-700 rounded-lg">
                                <ExternalLink className="w-5 h-5" />
                              </a>
                            )}
                            <button onClick={() => { setEditingSite(site); setShowForm(true); }} className="p-2 text-slate-400 hover:text-purple-400 hover:bg-slate-700 rounded-lg">
                              <Edit className="w-5 h-5" />
                            </button>
                            <button onClick={() => setDeleteModal(site.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Form Modal */}
      {showForm && (
        <SiteForm
          site={editingSite}
          onClose={() => { setShowForm(false); setEditingSite(null); }}
          onSave={() => { setShowForm(false); setEditingSite(null); fetchData(); }}
          getAuthHeader={getAuthHeader}
        />
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 text-red-400 mb-4">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="text-xl font-semibold">Conferma Eliminazione</h3>
            </div>
            <p className="text-slate-400 mb-4">Inserisci la password per confermare l'eliminazione del sito.</p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Password di eliminazione"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-red-500 focus:outline-none mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button onClick={() => { setDeleteModal(null); setDeletePassword(""); }} className="px-4 py-2 text-slate-400 hover:text-white">
                Annulla
              </button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrivorWebApp;
