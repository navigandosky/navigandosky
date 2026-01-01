import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Key, Search, Plus, Edit, Trash2, Mail, Download, Eye, EyeOff,
  Filter, X, RefreshCw, Shield, Smartphone, Globe, CreditCard,
  Lock, ChevronDown, Copy, Check, AlertCircle, User, ChevronLeft, Home
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Hook per autenticazione multi-utente
const useTrivorAccountAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });

  const getUserId = useCallback(() => {
    const stored = localStorage.getItem('trivor_account_user');
    if (stored) {
      const user = JSON.parse(stored);
      return user.user_id;
    }
    return null;
  }, []);

  const login = async (username, password) => {
    try {
      const res = await axios.post(`${API}/account-users/login`, { username, password });
      if (res.data.success) {
        const userData = {
          user_id: res.data.user_id,
          username: res.data.username,
          nome: res.data.nome
        };
        localStorage.setItem('trivor_account_user', JSON.stringify(userData));
        setCurrentUser(userData);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('trivor_account_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  useEffect(() => {
    const stored = localStorage.getItem('trivor_account_user');
    if (stored) {
      const user = JSON.parse(stored);
      setCurrentUser(user);
      setIsAuthenticated(true);
    }
  }, []);

  return { isAuthenticated, login, logout, getUserId, currentUser, credentials, setCredentials };
};

// Componente principale
export default function TrivorAccount() {
  const { isAuthenticated, login, logout, getUserId, currentUser, credentials, setCredentials } = useTrivorAccountAuth();
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [showPassword, setShowPassword] = useState({});
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ recipient: '', subject: 'Credenziali condivise da Trivor', message: '' });
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [stats, setStats] = useState(null);
  const [loginError, setLoginError] = useState('');

  const [form, setForm] = useState({
    categoria: '',
    servizio: '',
    link: '',
    user: '',
    password: '',
    otp_attivo: false,
    doppia_verifica: false,
    tipo_verifica: '',
    dispositivo_verifica: '',
    note: ''
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;
    
    try {
      setLoading(true);
      const [accRes, catRes, statsRes] = await Promise.all([
        axios.get(`${API}/trivoraccount/accounts`, {
          params: { search: searchTerm || undefined, categoria: filterCategory !== 'all' ? filterCategory : undefined, user_id: userId }
        }),
        axios.get(`${API}/trivoraccount/categories`),
        axios.get(`${API}/trivoraccount/stats`, { params: { user_id: userId } })
      ]);
      setAccounts(accRes.data);
      setCategories(catRes.data);
      setStats(statsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [getUserId, searchTerm, filterCategory]);

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated, fetchData]);

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const success = await login(credentials.username, credentials.password);
    if (!success) setLoginError('Credenziali non valide');
  };

  // Save account
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.servizio || !form.categoria) {
      alert('Compila almeno Servizio e Categoria');
      return;
    }
    const userId = getUserId();
    try {
      if (editingAccount) {
        await axios.put(`${API}/trivoraccount/accounts/${editingAccount.id}`, form, { params: { user_id: userId } });
      } else {
        await axios.post(`${API}/trivoraccount/accounts`, { ...form, user_id: userId });
      }
      setShowForm(false);
      setEditingAccount(null);
      resetForm();
      fetchData();
    } catch (e) {
      alert('Errore nel salvataggio');
    }
  };

  // Delete account
  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo account?')) return;
    const userId = getUserId();
    try {
      await axios.delete(`${API}/trivoraccount/accounts/${id}`, { params: { user_id: userId } });
      fetchData();
    } catch (e) {
      alert('Errore eliminazione');
    }
  };

  // Add category
  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await axios.post(`${API}/trivoraccount/categories`, { nome: newCategory });
      setNewCategory('');
      setShowNewCategory(false);
      const catRes = await axios.get(`${API}/trivoraccount/categories`);
      setCategories(catRes.data);
      setForm({ ...form, categoria: newCategory });
    } catch (e) {
      alert('Errore');
    }
  };

  // Share via email
  const handleShareEmail = async () => {
    if (!emailData.recipient || selectedAccounts.length === 0) {
      alert('Seleziona almeno un account e inserisci email destinatario');
      return;
    }
    try {
      setSending(true);
      await axios.post(`${API}/trivoraccount/share/email`, {
        account_ids: selectedAccounts,
        recipient_email: emailData.recipient,
        subject: emailData.subject,
        message: emailData.message
      });
      alert('Email inviata con successo!');
      setShowEmailModal(false);
      setSelectedAccounts([]);
      setEmailData({ recipient: '', subject: 'Credenziali condivise da Trivor', message: '' });
    } catch (e) {
      alert('Errore invio email');
    } finally {
      setSending(false);
    }
  };

  // Export Excel
  const handleExport = async () => {
    const userId = getUserId();
    try {
      setExporting(true);
      const response = await axios.get(`${API}/trivoraccount/export`, {
        params: { search: searchTerm || undefined, categoria: filterCategory !== 'all' ? filterCategory : undefined, user_id: userId },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `trivor_accounts_${new Date().toISOString().slice(0,10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert('Errore export');
    } finally {
      setExporting(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Reset form
  const resetForm = () => {
    setForm({
      categoria: '', servizio: '', link: '', user: '', password: '',
      otp_attivo: false, doppia_verifica: false, tipo_verifica: '', dispositivo_verifica: '', note: ''
    });
  };

  // Open edit form
  const openEdit = (acc) => {
    setEditingAccount(acc);
    setForm({
      categoria: acc.categoria || '',
      servizio: acc.servizio || '',
      link: acc.link || '',
      user: acc.user || '',
      password: acc.password || '',
      otp_attivo: acc.otp_attivo || false,
      doppia_verifica: acc.doppia_verifica || false,
      tipo_verifica: acc.tipo_verifica || '',
      dispositivo_verifica: acc.dispositivo_verifica || '',
      note: acc.note || ''
    });
    setShowForm(true);
  };

  // Toggle selection
  const toggleSelect = (id) => {
    setSelectedAccounts(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Category icon
  const getCategoryIcon = (cat) => {
    const icons = {
      'Mail': <Mail className="w-4 h-4" />,
      'Servizi Web': <Globe className="w-4 h-4" />,
      'Banca': <CreditCard className="w-4 h-4" />,
      'Social': <Smartphone className="w-4 h-4" />,
      'Cloud': <Shield className="w-4 h-4" />,
    };
    return icons[cat] || <Key className="w-4 h-4" />;
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
        {/* Link Torna al Sito */}
        <a 
          href="#/" 
          className="absolute top-6 left-6 flex items-center space-x-2 text-amber-400 hover:text-white transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="text-sm font-medium">Torna al Sito</span>
        </a>
        {/* Link Torna alla Suite */}
        <a 
          href="#/suite" 
          className="absolute top-6 right-6 flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Torna alla Suite</span>
        </a>
        
        <div className="bg-[#111214] border border-gray-800 rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Trivor Account</h1>
            <p className="text-gray-400 mt-2">Gestione sicura delle credenziali</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white"
              required
            />
            {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:opacity-90">
              Accedi
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Header */}
      <header className="bg-[#111214] border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <a href="#/" className="text-amber-400 hover:text-white flex items-center gap-1"><Home className="w-4 h-4" /> Sito</a>
              <span className="text-gray-600">|</span>
              <a href="#/suite" className="text-gray-400 hover:text-white">← Suite</a>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Trivor Account</h1>
                  <p className="text-xs text-gray-400">{stats?.total || 0} account salvati</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {currentUser && (
                <div className="flex items-center gap-2 text-gray-400">
                  <User className="w-4 h-4" />
                  <span className="text-sm">{currentUser.nome || currentUser.username}</span>
                </div>
              )}
              <button onClick={logout} className="text-gray-400 hover:text-white text-sm">Esci</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#111214] border border-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-sm">Totale Account</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="bg-[#111214] border border-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-sm">Con OTP</p>
              <p className="text-2xl font-bold text-green-400">{stats.with_otp}</p>
            </div>
            <div className="bg-[#111214] border border-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-sm">Con 2FA</p>
              <p className="text-2xl font-bold text-blue-400">{stats.with_2fa}</p>
            </div>
            <div className="bg-[#111214] border border-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-sm">Categorie</p>
              <p className="text-2xl font-bold text-amber-400">{stats.by_category?.length || 0}</p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-[#111214] border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca servizio, user, link..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white text-sm"
                />
              </div>
              {/* Category Filter */}
              <div className="relative">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="appearance-none pl-10 pr-8 py-2 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white text-sm cursor-pointer"
                >
                  <option value="all">Tutte le categorie</option>
                  {categories.map(c => (
                    <option key={c.nome} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div className="flex gap-2">
              {selectedAccounts.length > 0 && (
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30"
                >
                  <Mail className="w-4 h-4" />
                  Invia ({selectedAccounts.length})
                </button>
              )}
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 disabled:opacity-50"
              >
                {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export Excel
              </button>
              <button
                onClick={() => { resetForm(); setEditingAccount(null); setShowForm(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
              >
                <Plus className="w-4 h-4" />
                Nuovo Account
              </button>
            </div>
          </div>
        </div>

        {/* Account List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-[#111214] border border-gray-800 rounded-xl p-12 text-center">
            <Key className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl text-white mb-2">Nessun account trovato</h3>
            <p className="text-gray-400">Clicca "Nuovo Account" per iniziare</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {accounts.map(acc => (
              <div
                key={acc.id}
                className={`bg-[#111214] border rounded-xl p-4 transition-all ${
                  selectedAccounts.includes(acc.id) ? 'border-amber-500 bg-amber-500/5' : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedAccounts.includes(acc.id)}
                    onChange={() => toggleSelect(acc.id)}
                    className="mt-1 w-5 h-5 rounded border-gray-600 text-amber-500 focus:ring-amber-500 bg-[#0a0a0b]"
                  />
                  
                  {/* Icon */}
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center text-amber-400 flex-shrink-0">
                    {getCategoryIcon(acc.categoria)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{acc.servizio}</h3>
                        <span className="inline-block px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded mt-1">
                          {acc.categoria}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {acc.otp_attivo && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg flex items-center gap-1">
                            <Shield className="w-3 h-3" /> OTP
                          </span>
                        )}
                        {acc.doppia_verifica && (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-lg flex items-center gap-1">
                            <Lock className="w-3 h-3" /> 2FA
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid md:grid-cols-2 gap-3 mt-3">
                      {acc.link && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="w-4 h-4 text-gray-500" />
                          <a href={acc.link} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline truncate">
                            {acc.link}
                          </a>
                        </div>
                      )}
                      {acc.user && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">User:</span>
                          <span className="text-white">{acc.user}</span>
                          <button onClick={() => copyToClipboard(acc.user, `user-${acc.id}`)} className="text-gray-400 hover:text-white">
                            {copiedId === `user-${acc.id}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                      {acc.password && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">Password:</span>
                          <span className="text-white font-mono">
                            {showPassword[acc.id] ? acc.password : '••••••••'}
                          </span>
                          <button onClick={() => setShowPassword({ ...showPassword, [acc.id]: !showPassword[acc.id] })} className="text-gray-400 hover:text-white">
                            {showPassword[acc.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button onClick={() => copyToClipboard(acc.password, `pwd-${acc.id}`)} className="text-gray-400 hover:text-white">
                            {copiedId === `pwd-${acc.id}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                      {acc.doppia_verifica && acc.tipo_verifica && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">Verifica:</span>
                          <span className="text-white">{acc.tipo_verifica} - {acc.dispositivo_verifica}</span>
                        </div>
                      )}
                    </div>

                    {acc.note && (
                      <p className="text-gray-400 text-sm mt-2 italic">{acc.note}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(acc)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(acc.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111214] border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-[#111214]">
              <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                <Key className="w-6 h-6 text-amber-400" />
                {editingAccount ? 'Modifica Account' : 'Nuovo Account'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingAccount(null); }} className="text-gray-400 hover:text-white p-2">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Categoria */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Categoria *</label>
                <div className="flex gap-2">
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="flex-1 px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white"
                    required
                  >
                    <option value="">Seleziona categoria</option>
                    {categories.map(c => (
                      <option key={c.nome} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(!showNewCategory)}
                    className="px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                {showNewCategory && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Nuova categoria..."
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="flex-1 px-4 py-2 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm"
                    >
                      Aggiungi
                    </button>
                  </div>
                )}
              </div>

              {/* Servizio */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Servizio *</label>
                <input
                  type="text"
                  value={form.servizio}
                  onChange={(e) => setForm({ ...form, servizio: e.target.value })}
                  placeholder="Es: Gmail, Amazon, Netflix..."
                  className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white"
                  required
                />
              </div>

              {/* Link */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Link</label>
                <input
                  type="text"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white"
                />
              </div>

              {/* User & Password */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Username</label>
                  <input
                    type="text"
                    value={form.user}
                    onChange={(e) => setForm({ ...form, user: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Password</label>
                  <input
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* OTP & 2FA */}
              <div className="grid md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-4 bg-[#0a0a0b] border border-gray-700 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.otp_attivo}
                    onChange={(e) => setForm({ ...form, otp_attivo: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-600 text-amber-500"
                  />
                  <div>
                    <span className="text-white">OTP Attivo</span>
                    <p className="text-xs text-gray-500">Codice temporaneo</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 bg-[#0a0a0b] border border-gray-700 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.doppia_verifica}
                    onChange={(e) => setForm({ ...form, doppia_verifica: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-600 text-amber-500"
                  />
                  <div>
                    <span className="text-white">Doppia Verifica</span>
                    <p className="text-xs text-gray-500">Autenticazione 2FA</p>
                  </div>
                </label>
              </div>

              {/* Tipo Verifica (if 2FA enabled) */}
              {form.doppia_verifica && (
                <div className="grid md:grid-cols-2 gap-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <div>
                    <label className="block text-sm text-blue-400 mb-2">Tipo Verifica</label>
                    <select
                      value={form.tipo_verifica}
                      onChange={(e) => setForm({ ...form, tipo_verifica: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white"
                    >
                      <option value="">Seleziona...</option>
                      <option value="Mail">Mail</option>
                      <option value="SMS">SMS</option>
                      <option value="App Authenticator">App Authenticator</option>
                      <option value="Chiamata">Chiamata</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-blue-400 mb-2">Dispositivo/Destinazione</label>
                    <input
                      type="text"
                      value={form.dispositivo_verifica}
                      onChange={(e) => setForm({ ...form, dispositivo_verifica: e.target.value })}
                      placeholder="Es: iPhone, 333xxxxxxx, email@..."
                      className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white"
                    />
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Note</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingAccount(null); }}
                  className="flex-1 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:opacity-90"
                >
                  {editingAccount ? 'Salva Modifiche' : 'Crea Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111214] border border-gray-700 rounded-2xl max-w-lg w-full">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                <Mail className="w-6 h-6 text-blue-400" />
                Invia Credenziali via Email
              </h2>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-white p-2">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-400 text-sm">
                  Stai per inviare <strong>{selectedAccounts.length}</strong> credenziali. Assicurati che il destinatario sia autorizzato.
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Email Destinatario *</label>
                <input
                  type="email"
                  value={emailData.recipient}
                  onChange={(e) => setEmailData({ ...emailData, recipient: e.target.value })}
                  placeholder="email@esempio.com"
                  className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Oggetto</label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Messaggio (opzionale)</label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                  rows={3}
                  placeholder="Aggiungi un messaggio..."
                  className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600"
                >
                  Annulla
                </button>
                <button
                  onClick={handleShareEmail}
                  disabled={sending}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                  {sending ? 'Invio...' : 'Invia Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
