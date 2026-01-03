import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { LogOut, Users, UserPlus, Map, BarChart3, Mail } from "lucide-react";
import AnagraficaTab from "../components/AnagraficaTab";
import ListaSociTab from "../components/ListaSociTab";
import MappaTab from "../components/MappaTab";
import ComunicazioniTab from "../components/ComunicazioniTab";
import StatsCards from "../components/StatsCards";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_0ee3498b-2246-478c-8296-16fc3fbd03a6/artifacts/6bplvhii_logo%20piccolo%20dti.jpg";

export default function DashboardPage({ onLogout }) {
  const [activeTab, setActiveTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [soci, setSoci] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSocio, setSelectedSocio] = useState(null);
  const [preselectedSocioForCom, setPreselectedSocioForCom] = useState(null);

  const fetchData = async () => {
    try {
      const [statsRes, sociRes] = await Promise.all([
        axios.get(`${API}/stats`),
        axios.get(`${API}/soci`),
      ]);
      setStats(statsRes.data);
      setSoci(sociRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const seedData = async () => {
    try {
      await axios.post(`${API}/seed`);
      toast.success("Dati iniziali caricati!");
      fetchData();
    } catch (error) {
      toast.error("Errore nel caricamento dati");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleContactFromMap = (socio) => {
    setPreselectedSocioForCom(socio);
    setActiveTab("comunicazioni");
  };

  const handleSocioSaved = () => {
    fetchData();
    setSelectedSocio(null);
  };

  const handleEditSocio = (socio) => {
    setSelectedSocio(socio);
    setActiveTab("anagrafica");
  };

  return (
    <div className="min-h-screen bg-[#020617]" data-testid="dashboard">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <img
                src={LOGO_URL}
                alt="Digital Twins Italia"
                className="h-10 w-auto rounded-lg"
                data-testid="dashboard-logo"
              />
              <div>
                <h1 className="text-lg font-semibold text-slate-100 tracking-tight">
                  Digital Twins Italia
                </h1>
                <p className="text-xs text-slate-500">Gestione Soci</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={seedData}
                className="border-slate-700 text-slate-300 hover:bg-slate-800/50"
                data-testid="seed-data-btn"
              >
                Carica Dati Demo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                data-testid="logout-btn"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Esci
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass-card border-slate-800/60 p-1 gap-1">
            <TabsTrigger
              value="stats"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400"
              data-testid="tab-stats"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="anagrafica"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400"
              data-testid="tab-anagrafica"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Anagrafica
            </TabsTrigger>
            <TabsTrigger
              value="lista"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400"
              data-testid="tab-lista"
            >
              <Users className="h-4 w-4 mr-2" />
              Lista Soci
            </TabsTrigger>
            <TabsTrigger
              value="mappa"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400"
              data-testid="tab-mappa"
            >
              <Map className="h-4 w-4 mr-2" />
              Mappa Italia
            </TabsTrigger>
            <TabsTrigger
              value="comunicazioni"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400"
              data-testid="tab-comunicazioni"
            >
              <Mail className="h-4 w-4 mr-2" />
              Comunicazioni
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="animate-fadeIn">
            <StatsCards stats={stats} loading={loading} />
          </TabsContent>

          <TabsContent value="anagrafica" className="animate-fadeIn">
            <AnagraficaTab
              selectedSocio={selectedSocio}
              onSaved={handleSocioSaved}
              onCancel={() => setSelectedSocio(null)}
            />
          </TabsContent>

          <TabsContent value="lista" className="animate-fadeIn">
            <ListaSociTab
              soci={soci}
              onEdit={handleEditSocio}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="mappa" className="animate-fadeIn">
            <MappaTab />
          </TabsContent>

          <TabsContent value="comunicazioni" className="animate-fadeIn">
            <ComunicazioniTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
