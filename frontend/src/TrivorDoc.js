import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Filter, Download, Share2, FileText, File, FileSpreadsheet, FileImage,
  Calendar, Tag, User, Briefcase, BarChart3, Clock, AlertCircle, CheckCircle,
  XCircle, Upload, Paperclip, Grid, List, SlidersHorizontal, Archive, Send,
  Plus, Edit, Trash2, Eye, X, RefreshCw, LogOut, FolderOpen, Home, ChevronRight,
  Mail, MessageCircle, ExternalLink, Lock
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// =============================================================================
// TRIVORDOC AUTH HOOK
// =============================================================================
const useTrivordocAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem("trivordoc_auth");
    if (auth) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await fetch(`${API}/trivordoc/login`, {
        headers: { Authorization: `Basic ${btoa(`${username}:${password}`)}` },
        method: "POST",
      });
      if (response.ok) {
        localStorage.setItem("trivordoc_auth", btoa(`${username}:${password}`));
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("trivordoc_auth");
    setIsAuthenticated(false);
  };

  const getAuthHeader = () => {
    const auth = localStorage.getItem("trivordoc_auth");
    return { Authorization: `Basic ${auth}` };
  };

  return { isAuthenticated, isLoading, login, logout, getAuthHeader };
};

// =============================================================================
// LOGIN SCREEN
// =============================================================================
const TrivordocLogin = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const success = await onLogin(username, password);
    if (!success) {
      setError("Credenziali non valide");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Link to Suite */}
      <a 
        href="#/suite" 
        className="absolute top-6 left-6 flex items-center space-x-2 text-blue-300 hover:text-white transition-colors"
      >
        <ChevronRight className="w-5 h-5 rotate-180" />
        <span className="text-sm font-medium">Torna alla Suite</span>
      </a>

      <div className="w-full max-w-md">
        {/* Logo Suite */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-2xl mb-4">
            <Archive className="w-10 h-10 text-blue-400" />
            <div className="text-left">
              <p className="text-xs text-blue-300 font-medium tracking-wider">OFFICE TRIVOR</p>
              <h1 className="text-2xl font-bold text-white">TRIVORDOC</h1>
            </div>
          </div>
          <p className="text-blue-200/70 text-sm">Gestione Documentale Avanzata</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mx-auto mb-6">
            <Lock className="w-8 h-8 text-blue-400" />
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-blue-200 text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Inserisci username"
                required
              />
            </div>
            <div>
              <label className="block text-blue-200 text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Inserisci password"
                required
              />
            </div>
            
            {error && (
              <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                <XCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  Accesso in corso...
                </span>
              ) : (
                "Accedi"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-300/50 text-xs mt-6">
          © 2025 Trivor SRL - Office Suite
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// DOCUMENT TYPE ICONS
// =============================================================================
const getDocTypeIcon = (tipo) => {
  const icons = {
    pdf: <FileText className="w-5 h-5 text-red-400" />,
    word: <FileText className="w-5 h-5 text-blue-400" />,
    excel: <FileSpreadsheet className="w-5 h-5 text-green-400" />,
    immagine: <FileImage className="w-5 h-5 text-purple-400" />,
    scansione: <FileImage className="w-5 h-5 text-orange-400" />,
    testo: <File className="w-5 h-5 text-gray-400" />,
    altro: <File className="w-5 h-5 text-gray-400" />,
  };
  return icons[tipo] || icons.altro;
};

// =============================================================================
// DOCUMENT FORM MODAL
// =============================================================================
const DocumentForm = ({ document, onClose, onSave, getAuthHeader, categories }) => {
  const [form, setForm] = useState({
    gruppo: document?.gruppo || "",
    tipo_documento: document?.tipo_documento || "pdf",
    data_creazione: document?.data_creazione || new Date().toISOString().split("T")[0],
    autore: document?.autore || "",
    keywords: document?.keywords || [],
    categoria: document?.categoria || "Altro",
    descrizione: document?.descrizione || "",
    progetto: document?.progetto || {
      descrizione: "",
      azione: "",
      cliente: "",
      valore: 0,
      data_inizio: "",
      data_fine: "",
    },
  });
  const [keywordInput, setKeywordInput] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [allegati, setAllegati] = useState(document?.allegati || []);
  const fileRef = useRef(null);

  const tipiDocumento = ["pdf", "word", "excel", "immagine", "scansione", "testo", "altro"];

  const addKeyword = () => {
    if (keywordInput.trim() && !form.keywords.includes(keywordInput.trim())) {
      setForm({ ...form, keywords: [...form.keywords, keywordInput.trim()] });
      setKeywordInput("");
    }
  };

  const removeKeyword = (kw) => {
    setForm({ ...form, keywords: form.keywords.filter((k) => k !== kw) });
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !document?.id) return;
    
    if (allegati.length >= 20) {
      alert("Massimo 20 allegati per documento");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API}/trivordoc/documents/${document.id}/upload`, {
        method: "POST",
        headers: getAuthHeader(),
        body: formData,
      });
      const data = await res.json();
      if (data.allegato) {
        setAllegati([...allegati, data.allegato]);
      }
    } catch (e) {
      console.error(e);
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalForm = {
        ...form,
        categoria: showNewCategory ? newCategory : form.categoria,
      };

      if (document?.id) {
        await fetch(`${API}/trivordoc/documents/${document.id}`, {
          method: "PUT",
          headers: { ...getAuthHeader(), "Content-Type": "application/json" },
          body: JSON.stringify(finalForm),
        });
      } else {
        await fetch(`${API}/trivordoc/documents`, {
          method: "POST",
          headers: { ...getAuthHeader(), "Content-Type": "application/json" },
          body: JSON.stringify(finalForm),
        });
      }
      onSave();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Archive className="w-6 h-6 text-blue-400 mr-3" />
            {document ? "Modifica Documento" : "Nuovo Documento"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Gruppo/Codice *</label>
              <input
                type="text"
                value={form.gruppo}
                onChange={(e) => setForm({ ...form, gruppo: e.target.value })}
                required
                placeholder="es: Progetto Alpha"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Tipo Documento *</label>
              <select
                value={form.tipo_documento}
                onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:border-blue-500 focus:outline-none"
              >
                {tipiDocumento.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Data Creazione *</label>
              <input
                type="date"
                value={form.data_creazione}
                onChange={(e) => setForm({ ...form, data_creazione: e.target.value })}
                required
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Autore *</label>
              <input
                type="text"
                value={form.autore}
                onChange={(e) => setForm({ ...form, autore: e.target.value })}
                required
                placeholder="Nome autore"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Categoria *</label>
              {showNewCategory ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Nuova categoria"
                    className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                  <button type="button" onClick={() => setShowNewCategory(false)} className="px-3 py-2 text-slate-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setShowNewCategory(true)} className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30">
                    <Plus size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Descrizione</label>
            <textarea
              value={form.descrizione}
              onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
              rows={2}
              placeholder="Descrizione sintetica del documento"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Keywords (per ricerca rapida)</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                placeholder="Aggiungi keyword e premi Invio"
                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <button type="button" onClick={addKeyword} className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600">
                <Plus size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.keywords.map((kw) => (
                <span key={kw} className="inline-flex items-center px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                  <Tag className="w-3 h-3 mr-1" />
                  {kw}
                  <button type="button" onClick={() => removeKeyword(kw)} className="ml-2 hover:text-red-400">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Project Section */}
          <div className="border border-slate-700 rounded-xl p-4 bg-slate-800/30">
            <h3 className="text-white font-medium mb-4 flex items-center">
              <Briefcase className="w-5 h-5 text-blue-400 mr-2" />
              Dati Progetto (opzionale)
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                value={form.progetto.cliente}
                onChange={(e) => setForm({ ...form, progetto: { ...form.progetto, cliente: e.target.value } })}
                placeholder="Cliente"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                value={form.progetto.azione}
                onChange={(e) => setForm({ ...form, progetto: { ...form.progetto, azione: e.target.value } })}
                placeholder="Azione"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <textarea
              value={form.progetto.descrizione}
              onChange={(e) => setForm({ ...form, progetto: { ...form.progetto, descrizione: e.target.value } })}
              rows={2}
              placeholder="Descrizione progetto"
              className="w-full mt-3 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none"
            />
            <div className="grid md:grid-cols-3 gap-4 mt-3">
              <input
                type="number"
                value={form.progetto.valore || ""}
                onChange={(e) => setForm({ ...form, progetto: { ...form.progetto, valore: parseFloat(e.target.value) || 0 } })}
                placeholder="Valore €"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="date"
                value={form.progetto.data_inizio || ""}
                onChange={(e) => setForm({ ...form, progetto: { ...form.progetto, data_inizio: e.target.value } })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
              <input
                type="date"
                value={form.progetto.data_fine || ""}
                onChange={(e) => setForm({ ...form, progetto: { ...form.progetto, data_fine: e.target.value } })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Attachments (only for editing) */}
          {document?.id && (
            <div className="border border-slate-700 rounded-xl p-4 bg-slate-800/30">
              <h3 className="text-white font-medium mb-4 flex items-center justify-between">
                <span className="flex items-center">
                  <Paperclip className="w-5 h-5 text-blue-400 mr-2" />
                  Allegati ({allegati.length}/20)
                </span>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || allegati.length >= 5}
                  className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center"
                >
                  {uploading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                  Carica
                </button>
                <input type="file" ref={fileRef} onChange={handleUploadFile} className="hidden" />
              </h3>
              <div className="space-y-2">
                {allegati.length === 0 ? (
                  <p className="text-slate-500 text-sm">Nessun allegato</p>
                ) : (
                  allegati.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getDocTypeIcon(a.tipo)}
                        <span className="text-white text-sm">{a.nome}</span>
                        <span className="text-slate-500 text-xs">({(a.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <a href={`${BACKEND_URL}${a.url}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                        <Download size={18} />
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-slate-700">
            <button type="button" onClick={onClose} className="px-6 py-3 border border-slate-600 text-slate-400 rounded-xl hover:bg-slate-800">
              Annulla
            </button>
            <button type="submit" disabled={loading} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center">
              {loading ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
              {document ? "Aggiorna" : "Crea Documento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// DELETE CONFIRMATION MODAL
// =============================================================================
const DeleteModal = ({ document, onClose, onConfirm }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    const success = await onConfirm(password);
    if (!success) {
      setError("Password non corretta");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center space-x-3 text-red-400 mb-4">
          <AlertCircle className="w-8 h-8" />
          <h2 className="text-xl font-semibold">Conferma Eliminazione</h2>
        </div>
        <p className="text-slate-300 mb-4">
          Stai per eliminare il documento <strong className="text-white">{document.id}</strong> ({document.gruppo}).
          Questa azione è irreversibile.
        </p>
        <div className="mb-4">
          <label className="block text-slate-400 text-sm mb-2">Password di eliminazione</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Inserisci password"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
          />
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>
        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-600 text-slate-400 rounded-xl hover:bg-slate-800">
            Annulla
          </button>
          <button onClick={handleDelete} disabled={loading} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50 flex items-center">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Elimina
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// DOCUMENT PREVIEW MODAL
// =============================================================================
const PreviewModal = ({ document, onClose, onEdit, onDelete, getAuthHeader }) => {
  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Documento: ${document.gruppo}`);
    const body = encodeURIComponent(`Ti condivido il documento ${document.id}\n\nGruppo: ${document.gruppo}\nCategoria: ${document.categoria}\nAutore: ${document.autore}\nDescrizione: ${document.descrizione}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`📄 Documento: ${document.gruppo}\n📁 Categoria: ${document.categoria}\n👤 Autore: ${document.autore}`);
    window.open(`https://wa.me/?text=${text}`);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div className="flex items-center space-x-3">
            {getDocTypeIcon(document.tipo_documento)}
            <div>
              <h2 className="text-lg font-semibold text-white">{document.id}</h2>
              <p className="text-slate-400 text-sm">{document.gruppo}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Info Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-xl">
              <p className="text-slate-400 text-sm mb-1">Categoria</p>
              <p className="text-white font-medium">{document.categoria}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl">
              <p className="text-slate-400 text-sm mb-1">Tipo</p>
              <p className="text-white font-medium capitalize">{document.tipo_documento}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl">
              <p className="text-slate-400 text-sm mb-1">Autore</p>
              <p className="text-white font-medium">{document.autore}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl">
              <p className="text-slate-400 text-sm mb-1">Data Creazione</p>
              <p className="text-white font-medium">{new Date(document.data_creazione).toLocaleDateString("it-IT")}</p>
            </div>
          </div>

          {/* Description */}
          {document.descrizione && (
            <div className="bg-slate-800/50 p-4 rounded-xl">
              <p className="text-slate-400 text-sm mb-2">Descrizione</p>
              <p className="text-white">{document.descrizione}</p>
            </div>
          )}

          {/* Keywords */}
          {document.keywords?.length > 0 && (
            <div>
              <p className="text-slate-400 text-sm mb-2">Keywords</p>
              <div className="flex flex-wrap gap-2">
                {document.keywords.map((kw) => (
                  <span key={kw} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Project */}
          {document.progetto?.cliente && (
            <div className="border border-slate-700 rounded-xl p-4 bg-slate-800/30">
              <h3 className="text-white font-medium mb-3 flex items-center">
                <Briefcase className="w-5 h-5 text-blue-400 mr-2" />
                Progetto
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">Cliente:</span> <span className="text-white">{document.progetto.cliente}</span></div>
                <div><span className="text-slate-400">Azione:</span> <span className="text-white">{document.progetto.azione}</span></div>
                {document.progetto.valore > 0 && <div><span className="text-slate-400">Valore:</span> <span className="text-white">€{document.progetto.valore.toLocaleString()}</span></div>}
                {document.progetto.descrizione && <div className="md:col-span-2"><span className="text-slate-400">Descrizione:</span> <span className="text-white">{document.progetto.descrizione}</span></div>}
              </div>
            </div>
          )}

          {/* Attachments */}
          {document.allegati?.length > 0 && (
            <div>
              <p className="text-slate-400 text-sm mb-2">Allegati ({document.allegati.length})</p>
              <div className="space-y-2">
                {document.allegati.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getDocTypeIcon(a.tipo)}
                      <span className="text-white text-sm">{a.nome}</span>
                    </div>
                    <a href={`${BACKEND_URL}${a.url}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-400 hover:text-blue-300">
                      <Download size={18} className="mr-1" /> Scarica
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-700 flex justify-between items-center bg-slate-800/30">
          <div className="flex space-x-2">
            <button onClick={shareViaEmail} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg" title="Condividi via Email">
              <Mail size={20} />
            </button>
            <button onClick={shareViaWhatsApp} className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded-lg" title="Condividi via WhatsApp">
              <MessageCircle size={20} />
            </button>
          </div>
          <div className="flex space-x-2">
            <button onClick={() => onDelete(document)} className="px-4 py-2 text-red-400 hover:bg-red-500/20 rounded-lg flex items-center">
              <Trash2 size={18} className="mr-2" /> Elimina
            </button>
            <button onClick={() => onEdit(document)} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center">
              <Edit size={18} className="mr-2" /> Modifica
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN TRIVORDOC DASHBOARD
// =============================================================================
const TrivordocDashboard = ({ onLogout, getAuthHeader }) => {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard"); // dashboard, documents
  const [viewMode, setViewMode] = useState("grid"); // grid, list
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);
  
  // Filters
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterAutore, setFilterAutore] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const tipiDocumento = ["pdf", "word", "excel", "immagine", "scansione", "testo", "altro"];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterCategoria !== "all") params.append("categoria", filterCategoria);
      if (filterTipo !== "all") params.append("tipo", filterTipo);
      if (filterAutore) params.append("autore", filterAutore);

      const [docsRes, catsRes, statsRes] = await Promise.all([
        fetch(`${API}/trivordoc/documents?${params}`, { headers: getAuthHeader() }),
        fetch(`${API}/trivordoc/categories`, { headers: getAuthHeader() }),
        fetch(`${API}/trivordoc/stats`, { headers: getAuthHeader() }),
      ]);

      setDocuments(await docsRes.json());
      setCategories(await catsRes.json());
      setStats(await statsRes.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [search, filterCategoria, filterTipo, filterAutore, getAuthHeader]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (password) => {
    try {
      const res = await fetch(`${API}/trivordoc/documents/${deleteDoc.id}`, {
        method: "DELETE",
        headers: { ...getAuthHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setDeleteDoc(null);
        setPreviewDoc(null);
        fetchData();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Archive className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-xs text-blue-400 font-medium tracking-wider">OFFICE TRIVOR</p>
                  <h1 className="text-xl font-bold text-white">TRIVORDOC</h1>
                </div>
              </div>
              <nav className="hidden md:flex items-center space-x-1 ml-8">
                <button
                  onClick={() => setView("dashboard")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === "dashboard" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}
                >
                  <BarChart3 className="w-4 h-4 inline mr-2" />Dashboard
                </button>
                <button
                  onClick={() => setView("documents")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === "documents" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}
                >
                  <FolderOpen className="w-4 h-4 inline mr-2" />Documenti
                </button>
              </nav>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => { setEditingDoc(null); setShowForm(true); }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />Nuovo Documento
              </button>
              <button onClick={onLogout} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {view === "dashboard" ? (
          /* Dashboard View */
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Totale Documenti</p>
                    <p className="text-3xl font-bold text-white">{stats?.total_documents || 0}</p>
                  </div>
                  <Archive className="w-10 h-10 text-blue-400 opacity-50" />
                </div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Categorie</p>
                    <p className="text-3xl font-bold text-white">{stats?.by_category?.length || 0}</p>
                  </div>
                  <FolderOpen className="w-10 h-10 text-green-400 opacity-50" />
                </div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Keywords</p>
                    <p className="text-3xl font-bold text-white">{stats?.top_keywords?.length || 0}</p>
                  </div>
                  <Tag className="w-10 h-10 text-purple-400 opacity-50" />
                </div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Clienti</p>
                    <p className="text-3xl font-bold text-white">{stats?.top_clients?.length || 0}</p>
                  </div>
                  <Briefcase className="w-10 h-10 text-orange-400 opacity-50" />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* By Category */}
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <FolderOpen className="w-5 h-5 text-blue-400 mr-2" />Documenti per Categoria
                </h3>
                <div className="space-y-3">
                  {stats?.by_category?.slice(0, 6).map((cat) => (
                    <div key={cat._id} className="flex items-center justify-between">
                      <span className="text-slate-300">{cat._id || "Senza categoria"}</span>
                      <div className="flex items-center">
                        <div className="w-32 h-2 bg-slate-700 rounded-full mr-3">
                          <div
                            className="h-2 bg-blue-500 rounded-full"
                            style={{ width: `${(cat.count / (stats?.total_documents || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-white font-medium w-8 text-right">{cat.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Keywords */}
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <Tag className="w-5 h-5 text-purple-400 mr-2" />Tag Cloud
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats?.top_keywords?.map((kw) => (
                    <button
                      key={kw._id}
                      onClick={() => { setSearch(kw._id); setView("documents"); }}
                      className="px-3 py-1 bg-slate-700 hover:bg-blue-500/30 text-slate-300 hover:text-blue-300 rounded-full text-sm transition-colors"
                      style={{ fontSize: `${Math.min(0.9 + kw.count * 0.1, 1.3)}rem` }}
                    >
                      {kw._id}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Documents */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center justify-between">
                <span className="flex items-center"><Clock className="w-5 h-5 text-green-400 mr-2" />Documenti Recenti</span>
                <button onClick={() => setView("documents")} className="text-blue-400 text-sm hover:underline">Vedi tutti →</button>
              </h3>
              <div className="space-y-2">
                {stats?.recent_documents?.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setPreviewDoc(doc)}
                    className="flex items-center justify-between p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {getDocTypeIcon(doc.tipo_documento)}
                      <div>
                        <p className="text-white font-medium">{doc.gruppo}</p>
                        <p className="text-slate-400 text-sm">{doc.categoria} • {doc.autore}</p>
                      </div>
                    </div>
                    <span className="text-slate-500 text-sm">{new Date(doc.data_caricamento).toLocaleDateString("it-IT")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Documents View */
          <div className="space-y-4">
            {/* Search & Filters */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cerca documenti, keywords, clienti..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 rounded-lg flex items-center ${showFilters ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />Filtri
                </button>
                <div className="flex border border-slate-600 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 ${viewMode === "grid" ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 ${viewMode === "list" ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="grid md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-700">
                  <select
                    value={filterCategoria}
                    onChange={(e) => setFilterCategoria(e.target.value)}
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">Tutte le categorie</option>
                    {categories.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <select
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value)}
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">Tutti i tipi</option>
                    {tipiDocumento.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={filterAutore}
                    onChange={(e) => setFilterAutore(e.target.value)}
                    placeholder="Filtra per autore"
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Results */}
            {loading ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700">
                <Archive className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Nessun documento trovato</p>
                <button
                  onClick={() => { setEditingDoc(null); setShowForm(true); }}
                  className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
                >
                  Crea il primo documento
                </button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setPreviewDoc(doc)}
                    className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 hover:border-blue-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                          {getDocTypeIcon(doc.tipo_documento)}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{doc.id}</p>
                          <p className="text-slate-400 text-xs">{doc.tipo_documento}</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">{doc.categoria}</span>
                    </div>
                    <h3 className="text-white font-medium mb-2 truncate">{doc.gruppo}</h3>
                    {doc.descrizione && <p className="text-slate-400 text-sm mb-3 line-clamp-2">{doc.descrizione}</p>}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center"><User className="w-3 h-3 mr-1" />{doc.autore}</span>
                      <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" />{new Date(doc.data_creazione).toLocaleDateString("it-IT")}</span>
                    </div>
                    {doc.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {doc.keywords.slice(0, 3).map((kw) => (
                          <span key={kw} className="px-2 py-0.5 bg-slate-700 text-slate-400 rounded text-xs">{kw}</span>
                        ))}
                        {doc.keywords.length > 3 && <span className="text-slate-500 text-xs">+{doc.keywords.length - 3}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr className="text-left text-slate-400 text-sm">
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Gruppo</th>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Autore</th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr
                        key={doc.id}
                        onClick={() => setPreviewDoc(doc)}
                        className="border-t border-slate-700 hover:bg-slate-700/30 cursor-pointer"
                      >
                        <td className="px-4 py-3 text-blue-400 text-sm">{doc.id}</td>
                        <td className="px-4 py-3 text-white">{doc.gruppo}</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">{doc.categoria}</span></td>
                        <td className="px-4 py-3">{getDocTypeIcon(doc.tipo_documento)}</td>
                        <td className="px-4 py-3 text-slate-400 text-sm">{doc.autore}</td>
                        <td className="px-4 py-3 text-slate-500 text-sm">{new Date(doc.data_creazione).toLocaleDateString("it-IT")}</td>
                        <td className="px-4 py-3">
                          <button className="p-1 text-slate-400 hover:text-white"><Eye className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {showForm && (
        <DocumentForm
          document={editingDoc}
          onClose={() => { setShowForm(false); setEditingDoc(null); }}
          onSave={() => { setShowForm(false); setEditingDoc(null); fetchData(); }}
          getAuthHeader={getAuthHeader}
          categories={categories}
        />
      )}

      {previewDoc && (
        <PreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onEdit={(doc) => { setPreviewDoc(null); setEditingDoc(doc); setShowForm(true); }}
          onDelete={(doc) => { setDeleteDoc(doc); }}
          getAuthHeader={getAuthHeader}
        />
      )}

      {deleteDoc && (
        <DeleteModal
          document={deleteDoc}
          onClose={() => setDeleteDoc(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

// =============================================================================
// MAIN TRIVORDOC PAGE
// =============================================================================
const TrivorDocPage = () => {
  const { isAuthenticated, isLoading, login, logout, getAuthHeader } = useTrivordocAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <TrivordocLogin onLogin={login} />;
  }

  return <TrivordocDashboard onLogout={logout} getAuthHeader={getAuthHeader} />;
};

export default TrivorDocPage;
