import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Users, MapPin, Award, Briefcase, Smartphone } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#1E90FF", "#FFD700", "#3b82f6", "#fbbf24", "#60a5fa", "#f59e0b", "#10b981", "#8b5cf6"];

export default function StatsCards({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="glass-card border-slate-800/60 animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-slate-800/50 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const regioniData = stats?.per_regione?.slice(0, 8) || [];
  const qualificheData = stats?.per_qualifica?.filter(q => q.qualifica !== "Non specificata") || [];
  const caricheData = stats?.per_carica?.filter(c => c.carica !== "Non specificata" && c.carica !== "Socio") || [];
  const dispositiviData = stats?.per_dispositivo || [];

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card border-slate-800/60 neon-blue" data-testid="stat-totale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Totale Soci</p>
                <p className="text-3xl font-bold text-slate-100 mt-1">
                  {stats?.totale_soci || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-slate-800/60" data-testid="stat-regioni">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Regioni Coperte</p>
                <p className="text-3xl font-bold text-slate-100 mt-1">
                  {stats?.per_regione?.filter(r => r.regione !== "Non specificata").length || 0}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <MapPin className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-slate-800/60" data-testid="stat-fondatori">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Soci Fondatori</p>
                <p className="text-3xl font-bold text-slate-100 mt-1">
                  {stats?.per_qualifica?.find(q => q.qualifica === "Socio Fondatore")?.count || 0}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <Award className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-slate-800/60" data-testid="stat-cariche">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Con Cariche</p>
                <p className="text-3xl font-bold text-slate-100 mt-1">
                  {caricheData.reduce((acc, c) => acc + c.count, 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Briefcase className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - Soci per Regione */}
        <Card className="glass-card border-slate-800/60" data-testid="chart-regioni">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg">Soci per Regione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regioniData} layout="vertical">
                  <XAxis type="number" stroke="#64748b" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="regione"
                    stroke="#64748b"
                    fontSize={11}
                    width={100}
                    tickFormatter={(value) => value.length > 12 ? value.slice(0, 12) + "..." : value}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: "8px",
                      color: "#f8fafc",
                    }}
                  />
                  <Bar dataKey="count" fill="#1E90FF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Qualifiche */}
        <Card className="glass-card border-slate-800/60" data-testid="chart-qualifiche">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg">Distribuzione Qualifiche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={qualificheData}
                    dataKey="count"
                    nameKey="qualifica"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ qualifica, percent }) =>
                      `${qualifica.substring(0, 10)}${qualifica.length > 10 ? '...' : ''}`
                    }
                    labelLine={false}
                  >
                    {qualificheData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: "8px",
                      color: "#f8fafc",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Dispositivi */}
        <Card className="glass-card border-slate-800/60" data-testid="chart-dispositivi">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-emerald-400" />
              Dispositivi Utilizzati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {dispositiviData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dispositiviData}
                      dataKey="count"
                      nameKey="dispositivo"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ dispositivo, count }) => `${dispositivo}: ${count}`}
                      labelLine={true}
                    >
                      {dispositiviData.map((entry, index) => (
                        <Cell key={`cell-disp-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #1e293b",
                        borderRadius: "8px",
                        color: "#f8fafc",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  Nessun dispositivo registrato
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cariche List */}
      <Card className="glass-card border-slate-800/60" data-testid="list-cariche">
        <CardHeader>
          <CardTitle className="text-slate-100 text-lg">Cariche Associazione</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {caricheData.map((carica, index) => (
              <div
                key={carica.carica}
                className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center"
              >
                <p className="text-2xl font-bold text-yellow-400">{carica.count}</p>
                <p className="text-sm text-slate-400 mt-1">{carica.carica}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
