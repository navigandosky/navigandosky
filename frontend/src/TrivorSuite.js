import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive, Database, Home, LogOut, RefreshCw, Server, HardDrive, 
  Table, FileText, Activity, CheckCircle, XCircle, AlertTriangle,
  BarChart3, PieChart, TrendingUp, Layers, Box, Lock, X, ChevronRight,
  Briefcase, Settings, Zap
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// =============================================================================
// AUTH HOOK (shared)
// =============================================================================
const useSuiteAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem("trivorsuite_auth");
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
        localStorage.setItem("trivorsuite_auth", btoa(`${username}:${password}`));
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("trivorsuite_auth");
    setIsAuthenticated(false);
  };

  const getAuthHeader = () => {
    const auth = localStorage.getItem("trivorsuite_auth");
    return { Authorization: `Basic ${auth}` };
  };

  return { isAuthenticated, isLoading, login, logout, getAuthHeader };
};

// =============================================================================
// LOGIN SCREEN
// =============================================================================
const SuiteLogin = ({ onLogin }) => {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
      {/* Link to main site */}
      <a 
        href="#/" 
        className="absolute top-6 left-6 flex items-center space-x-2 text-indigo-300 hover:text-white transition-colors"
      >
        <Home className="w-5 h-5" />
        <span className="text-sm font-medium">Torna al sito Trivor</span>
      </a>

      <div className="w-full max-w-md">
        {/* Logo Suite */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-2xl mb-4">
            <Briefcase className="w-10 h-10 text-indigo-400" />
            <div className="text-left">
              <p className="text-xs text-indigo-300 font-medium tracking-wider">OFFICE</p>
              <h1 className="text-2xl font-bold text-white">TRIVOR SUITE</h1>
            </div>
          </div>
          <p className="text-indigo-200/70 text-sm">Accedi alle applicazioni aziendali</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center w-16 h-16 bg-indigo-500/20 rounded-full mx-auto mb-6">
            <Lock className="w-8 h-8 text-indigo-400" />
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-indigo-200 text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Inserisci username"
                required
              />
            </div>
            <div>
              <label className="block text-indigo-200 text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:border-indigo-500 transition-colors"
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
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  Accesso in corso...
                </span>
              ) : (
                "Accedi alla Suite"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-indigo-300/50 text-xs mt-6">
          © 2025 Trivor SRL - Office Suite
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// SUITE DASHBOARD - App Selection
// =============================================================================
const SuiteDashboard = ({ onLogout, onSelectApp }) => {
  const apps = [
    {
      id: "trivordoc",
      name: "TRIVORDOC",
      description: "Gestione Documentale Avanzata",
      icon: Archive,
      color: "blue",
      features: ["Archivio documenti", "Ricerca avanzata", "Allegati multipli", "Condivisione"],
      status: "active"
    },
    {
      id: "trivorweb",
      name: "TrivorWEB",
      description: "Gestione Siti Web & Hosting",
      icon: Server,
      color: "purple",
      features: ["Credenziali siti", "Scadenze hosting", "Dati FTP/DB", "Costi annuali"],
      status: "active"
    },
    {
      id: "checkdb",
      name: "CheckDB",
      description: "Monitoraggio Database",
      icon: Database,
      color: "emerald",
      features: ["Multi-database", "Spazio occupato", "Statistiche", "Health check"],
      status: "active"
    },
    {
      id: "coming1",
      name: "TrivorCRM",
      description: "Gestione Clienti e Contatti",
      icon: Briefcase,
      color: "orange",
      features: ["Anagrafica clienti", "Storico contatti", "Pipeline vendite"],
      status: "coming"
    },
  ];

  const colorClasses = {
    blue: "from-blue-500/20 to-blue-600/20 border-blue-500/30 hover:border-blue-400",
    emerald: "from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 hover:border-emerald-400",
    purple: "from-purple-500/20 to-purple-600/20 border-purple-500/30 hover:border-purple-400",
    orange: "from-orange-500/20 to-orange-600/20 border-orange-500/30 hover:border-orange-400",
  };

  const iconColorClasses = {
    blue: "text-blue-400",
    emerald: "text-emerald-400",
    purple: "text-purple-400",
    orange: "text-orange-400",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900/50 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Briefcase className="w-8 h-8 text-indigo-400" />
                <div>
                  <p className="text-xs text-indigo-400 font-medium tracking-wider">OFFICE</p>
                  <h1 className="text-xl font-bold text-white">TRIVOR SUITE</h1>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <a href="#/" className="px-4 py-2 text-slate-400 hover:text-white rounded-lg text-sm flex items-center hover:bg-slate-700/50 transition-colors">
                <Home className="w-4 h-4 mr-2" />Sito Trivor
              </a>
              <button onClick={onLogout} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Scegli un'applicazione</h2>
          <p className="text-slate-400">Accedi agli strumenti della suite Trivor</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {apps.map((app) => {
            const Icon = app.icon;
            const isActive = app.status === "active";
            
            return (
              <div
                key={app.id}
                onClick={() => isActive && onSelectApp(app.id)}
                className={`relative bg-gradient-to-br ${colorClasses[app.color]} border rounded-2xl p-6 transition-all ${
                  isActive ? "cursor-pointer hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/10" : "opacity-50 cursor-not-allowed"
                }`}
              >
                {!isActive && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-xs font-medium">
                    Coming Soon
                  </div>
                )}
                
                <div className="flex items-start space-x-4">
                  <div className={`w-14 h-14 rounded-xl bg-slate-800/50 flex items-center justify-center ${iconColorClasses[app.color]}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{app.name}</h3>
                    <p className="text-slate-400 text-sm mb-4">{app.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {app.features.map((feature, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-800/50 text-slate-300 rounded text-xs">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  {isActive && (
                    <ChevronRight className="w-6 h-6 text-slate-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="text-center py-8 text-slate-500 text-sm">
        © 2025 Trivor SRL - Office Suite v1.0
      </footer>
    </div>
  );
};

// =============================================================================
// CHECKDB - Database Monitor (Multi-Database)
// =============================================================================
const CheckDBApp = ({ onBack, getAuthHeader }) => {
  const [databases, setDatabases] = useState([]);
  const [selectedDb, setSelectedDb] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDb, setLoadingDb] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionDetails, setCollectionDetails] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Fetch list of all databases
  const fetchDatabases = useCallback(async () => {
    setLoading(true);
    try {
      const [dbListRes, healthRes] = await Promise.all([
        fetch(`${API}/checkdb/databases`, { headers: getAuthHeader() }),
        fetch(`${API}/checkdb/health`, { headers: getAuthHeader() }),
      ]);
      const dbList = await dbListRes.json();
      setDatabases(dbList.databases || []);
      setHealth(await healthRes.json());
      
      // Auto-select first database if none selected
      if (!selectedDb && dbList.databases?.length > 0) {
        setSelectedDb(dbList.databases[0].name);
      }
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [getAuthHeader, selectedDb]);

  // Fetch specific database status
  const fetchDbStatus = useCallback(async (dbName) => {
    if (!dbName) return;
    setLoadingDb(true);
    try {
      const res = await fetch(`${API}/checkdb/database/${dbName}/status`, { headers: getAuthHeader() });
      setDbStatus(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoadingDb(false);
  }, [getAuthHeader]);

  const fetchCollectionDetails = async (collName) => {
    try {
      const res = await fetch(`${API}/checkdb/collections/${collName}`, { headers: getAuthHeader() });
      setCollectionDetails(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, [fetchDatabases]);

  useEffect(() => {
    if (selectedDb) {
      fetchDbStatus(selectedDb);
    }
  }, [selectedDb, fetchDbStatus]);

  useEffect(() => {
    if (selectedCollection) {
      fetchCollectionDetails(selectedCollection);
    }
  }, [selectedCollection]);

  const getStatusColor = (status) => {
    return status === "healthy" ? "text-emerald-400" : "text-red-400";
  };

  const getStatusIcon = (status) => {
    return status === "healthy" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900/30 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={onBack} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <div className="flex items-center space-x-3">
                <Database className="w-8 h-8 text-emerald-400" />
                <div>
                  <p className="text-xs text-emerald-400 font-medium tracking-wider">TRIVOR SUITE</p>
                  <h1 className="text-xl font-bold text-white">CheckDB</h1>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchDatabases}
                disabled={loading}
                className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm flex items-center hover:bg-emerald-500/30 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Aggiorna
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading && !dbStatus ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Database Tabs */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center">
                  <Server className="w-5 h-5 text-emerald-400 mr-2" />
                  Database Disponibili ({databases.length})
                </h3>
                {lastUpdate && (
                  <span className="text-slate-500 text-xs">
                    Aggiornato: {lastUpdate.toLocaleTimeString("it-IT")}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {databases.map((db) => (
                  <button
                    key={db.name}
                    onClick={() => setSelectedDb(db.name)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                      selectedDb === db.name
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    <Database className="w-4 h-4" />
                    <span>{db.name}</span>
                    <span className="text-xs opacity-70">({formatBytes(db.sizeOnDisk)})</span>
                  </button>
                ))}
              </div>
            </div>

            {loadingDb ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              </div>
            ) : dbStatus && (
              <>
                {/* Health Status */}
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-sm">Stato</span>
                      <span className={getStatusColor(health?.status)}>
                        {getStatusIcon(health?.status)}
                      </span>
                    </div>
                    <p className={`text-2xl font-bold ${getStatusColor(health?.status)}`}>
                      {health?.status === "healthy" ? "Online" : "Offline"}
                    </p>
                  </div>
                  
                  <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-sm">Database Selezionato</span>
                      <Server className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-xl font-bold text-emerald-400">{dbStatus?.database?.name}</p>
                  </div>
                  
                  <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-sm">Collections</span>
                      <Layers className="w-5 h-5 text-purple-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{dbStatus?.database?.collections || 0}</p>
                  </div>
                  
                  <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-sm">Documenti Totali</span>
                      <FileText className="w-5 h-5 text-orange-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{dbStatus?.database?.objects || 0}</p>
                  </div>
                </div>

                {/* Storage Stats */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-5">
                    <div className="flex items-center space-x-3 mb-4">
                      <HardDrive className="w-6 h-6 text-emerald-400" />
                      <h3 className="text-white font-semibold">Spazio Dati</h3>
                    </div>
                <p className="text-3xl font-bold text-emerald-400">
                  {formatBytes(dbStatus?.database?.dataSize || 0)}
                </p>
                <p className="text-slate-500 text-sm mt-1">dimensione dati</p>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-5">
                <div className="flex items-center space-x-3 mb-4">
                  <Box className="w-6 h-6 text-blue-400" />
                  <h3 className="text-white font-semibold">Storage Totale</h3>
                </div>
                <p className="text-3xl font-bold text-blue-400">
                  {formatBytes(dbStatus?.database?.storageSize || 0)}
                </p>
                <p className="text-slate-500 text-sm mt-1">su disco</p>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-5">
                <div className="flex items-center space-x-3 mb-4">
                  <Zap className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-white font-semibold">Indici</h3>
                </div>
                <p className="text-3xl font-bold text-yellow-400">
                  {formatBytes(dbStatus?.database?.indexSize || 0)}
                </p>
                <p className="text-slate-500 text-sm mt-1">dimensione indici</p>
              </div>
            </div>

            {/* Collections Table */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <h3 className="text-white font-semibold flex items-center">
                  <Table className="w-5 h-5 text-emerald-400 mr-2" />
                  Collections ({dbStatus?.collections?.length || 0})
                </h3>
                {lastUpdate && (
                  <span className="text-slate-500 text-xs">
                    Aggiornato: {lastUpdate.toLocaleTimeString("it-IT")}
                  </span>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr className="text-left text-slate-400 text-sm">
                      <th className="px-4 py-3">Nome Collection</th>
                      <th className="px-4 py-3 text-right">Documenti</th>
                      <th className="px-4 py-3 text-right">Dimensione</th>
                      <th className="px-4 py-3 text-right">Storage</th>
                      <th className="px-4 py-3 text-right">Indici</th>
                      <th className="px-4 py-3 text-right">Media Doc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbStatus?.collections?.map((coll) => (
                      <tr
                        key={coll.name}
                        onClick={() => setSelectedCollection(coll.name)}
                        className="border-t border-slate-700 hover:bg-slate-700/30 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <Database className="w-4 h-4 text-emerald-400" />
                            <span className="text-white font-medium">{coll.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">{coll.count?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-emerald-400">{formatBytes(coll.size || 0)}</td>
                        <td className="px-4 py-3 text-right text-blue-400">{formatBytes(coll.storageSize || 0)}</td>
                        <td className="px-4 py-3 text-right text-slate-400">{coll.nindexes || 0}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{formatBytes(coll.avgObjSize || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Server Info */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-5">
              <h3 className="text-white font-semibold flex items-center mb-4">
                <Activity className="w-5 h-5 text-emerald-400 mr-2" />
                Informazioni Server
              </h3>
              <div className="grid md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Versione MongoDB:</span>
                  <p className="text-white font-medium">{health?.server_version || "N/A"}</p>
                </div>
                <div>
                  <span className="text-slate-400">Connesso:</span>
                  <p className={health?.connected ? "text-emerald-400" : "text-red-400"}>
                    {health?.connected ? "Sì" : "No"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Ultimo Check:</span>
                  <p className="text-white">{health?.timestamp ? new Date(health.timestamp).toLocaleString("it-IT") : "N/A"}</p>
                </div>
                <div>
                  <span className="text-slate-400">Dimensione Media Doc:</span>
                  <p className="text-white">{formatBytes(dbStatus?.database?.avgObjSize || 0)}</p>
                </div>
              </div>
            </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Collection Details Modal */}
      {selectedCollection && collectionDetails && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <h2 className="text-lg font-semibold text-white flex items-center">
                <Database className="w-5 h-5 text-emerald-400 mr-2" />
                {selectedCollection}
              </h2>
              <button onClick={() => { setSelectedCollection(null); setCollectionDetails(null); }} className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-xl">
                  <p className="text-slate-400 text-sm">Documenti</p>
                  <p className="text-2xl font-bold text-white">{collectionDetails.count?.toLocaleString()}</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl">
                  <p className="text-slate-400 text-sm">Indici</p>
                  <p className="text-2xl font-bold text-white">{collectionDetails.indexes?.length || 0}</p>
                </div>
              </div>

              {/* Fields */}
              {collectionDetails.fields?.length > 0 && (
                <div>
                  <p className="text-slate-400 text-sm mb-2">Campi</p>
                  <div className="flex flex-wrap gap-2">
                    {collectionDetails.fields.map((field) => (
                      <span key={field} className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Indexes */}
              {collectionDetails.indexes?.length > 0 && (
                <div>
                  <p className="text-slate-400 text-sm mb-2">Indici</p>
                  <div className="space-y-2">
                    {collectionDetails.indexes.map((idx, i) => (
                      <div key={i} className="p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-white font-medium">{idx.name}</span>
                        {idx.unique && <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded text-xs">Unique</span>}
                        <p className="text-slate-500 text-xs mt-1">Keys: {JSON.stringify(idx.key)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Documents */}
              {collectionDetails.sample_documents?.length > 0 && (
                <div>
                  <p className="text-slate-400 text-sm mb-2">Documenti di esempio</p>
                  <div className="bg-slate-800 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-xs text-slate-300">
                      {JSON.stringify(collectionDetails.sample_documents, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN SUITE PAGE
// =============================================================================
const TrivorSuitePage = () => {
  const { isAuthenticated, isLoading, login, logout, getAuthHeader } = useSuiteAuth();
  const [currentApp, setCurrentApp] = useState(null); // null = suite dashboard, "trivordoc", "checkdb"
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SuiteLogin onLogin={login} />;
  }

  const handleSelectApp = (appId) => {
    if (appId === "trivordoc") {
      navigate("/trivordoc");
    } else if (appId === "trivorweb") {
      navigate("/trivorweb");
    } else if (appId === "checkdb") {
      setCurrentApp("checkdb");
    }
  };

  const handleBack = () => {
    setCurrentApp(null);
  };

  if (currentApp === "checkdb") {
    return <CheckDBApp onBack={handleBack} getAuthHeader={getAuthHeader} />;
  }

  return <SuiteDashboard onLogout={logout} onSelectApp={handleSelectApp} />;
};

export default TrivorSuitePage;
