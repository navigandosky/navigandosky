import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Map, MapPin, Shirt, FileText, ArrowRight } from "lucide-react";
import axios from "axios";
import AdminLayout from "../../components/AdminLayout";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    spaces: 0,
    pois: 0,
    costumes: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [spacesRes, poisRes, costumesRes] = await Promise.all([
        axios.get(`${API}/spaces`),
        axios.get(`${API}/pois`),
        axios.get(`${API}/costumes`)
      ]);
      setStats({
        spaces: spacesRes.data.length,
        pois: poisRes.data.length,
        costumes: costumesRes.data.length
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const cards = [
    {
      title: "Spazi Matterport",
      count: stats.spaces,
      icon: Map,
      link: "/admin/spaces",
      color: "bg-[#C5A059]"
    },
    {
      title: "Punti di Interesse",
      count: stats.pois,
      icon: MapPin,
      link: "/admin/pois",
      color: "bg-[#A0522D]"
    },
    {
      title: "Archivio Costumi",
      count: stats.costumes,
      icon: Shirt,
      link: "/admin/costumes",
      color: "bg-[#556B2F]"
    },
    {
      title: "Progetto Spoke",
      count: null,
      icon: FileText,
      link: "/admin/project",
      color: "bg-[#666058]"
    }
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.link}
              to={card.link}
              className="group bg-white rounded-sm border border-[#E5E0D8] p-6 hover:border-[#C5A059] transition-all"
              data-testid={`dashboard-card-${card.link.split('/').pop()}`}
            >
              <div className={`w-12 h-12 rounded-full ${card.color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-serif text-lg text-[#2A2A2A] mb-2">{card.title}</h3>
              {card.count !== null && (
                <p className="font-mono text-3xl text-[#C5A059] mb-4">{card.count}</p>
              )}
              <span className="inline-flex items-center text-[#666058] text-sm group-hover:text-[#C5A059] transition-colors">
                Gestisci
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          );
        })}
      </div>

      {/* Quick Info */}
      <div className="mt-12 bg-white rounded-sm border border-[#E5E0D8] p-8">
        <h2 className="font-serif text-xl text-[#2A2A2A] mb-4">Guida rapida</h2>
        <div className="prose prose-sm max-w-none font-sans text-[#666058]">
          <ul className="space-y-2">
            <li><strong>Spazi Matterport:</strong> Aggiungi e gestisci gli spazi virtuali con il loro Model ID</li>
            <li><strong>Punti di Interesse:</strong> Crea POI collegati agli spazi con audioguide automatiche</li>
            <li><strong>Archivio Costumi:</strong> Cataloga i costumi tradizionali con foto e descrizioni multilingua</li>
            <li><strong>Progetto Spoke:</strong> Modifica il contenuto della pagina informativa</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
