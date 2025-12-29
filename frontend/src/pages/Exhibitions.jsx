import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import axios from "axios";
import { useLanguage, getTranslation } from "../hooks/useLanguage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const translations = {
  it: {
    title: "Le Mostre Digital Twin",
    subtitle: "Esplora i tour virtuali delle mostre attraverso la tecnologia Matterport",
    empty: "Nessuna mostra disponibile al momento",
    explore: "Esplora la mostra",
    loading: "Caricamento..."
  },
  en: {
    title: "Digital Twin Exhibitions",
    subtitle: "Explore virtual tours of exhibitions through Matterport technology",
    empty: "No exhibitions available at the moment",
    explore: "Explore exhibition",
    loading: "Loading..."
  },
  fr: {
    title: "Expositions Digital Twin",
    subtitle: "Explorez les visites virtuelles des expositions grâce à la technologie Matterport",
    empty: "Aucune exposition disponible pour le moment",
    explore: "Explorer l'exposition",
    loading: "Chargement..."
  },
  de: {
    title: "Digital Twin Ausstellungen",
    subtitle: "Erkunden Sie virtuelle Rundgänge durch Ausstellungen mit Matterport-Technologie",
    empty: "Derzeit keine Ausstellungen verfügbar",
    explore: "Ausstellung erkunden",
    loading: "Laden..."
  }
};

export default function Exhibitions() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const t = translations[language];

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    try {
      const response = await axios.get(`${API}/spaces`);
      setSpaces(response.data.filter(s => s.is_active));
    } catch (error) {
      console.error("Error fetching spaces:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
        <span className="ml-3 font-sans text-[#666058]">{t.loading}</span>
      </div>
    );
  }

  return (
    <div className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <h1 className="font-serif text-4xl md:text-5xl text-[#2A2A2A] mb-6" data-testid="exhibitions-title">
            {t.title}
          </h1>
          <p className="font-sans text-lg text-[#666058] leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        {/* Spaces Grid */}
        {spaces.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-sans text-[#666058]">{t.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {spaces.map((space, index) => (
              <Link
                key={space.id}
                to={`/exhibitions/${space.id}`}
                className="group"
                data-testid={`space-card-${space.id}`}
              >
                <div className="relative overflow-hidden rounded-sm gold-border card-hover bg-white">
                  {/* Cover Image */}
                  <div className="relative h-64 overflow-hidden">
                    {space.cover_image ? (
                      <img
                        src={space.cover_image}
                        alt={getTranslation(space.name, language)}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#F2F0EB] flex items-center justify-center">
                        <span className="font-mono text-[#666058] text-sm">Matterport ID: {space.model_id}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A1918]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>

                  {/* Content */}
                  <div className="p-8">
                    <h2 className="font-serif text-2xl text-[#2A2A2A] mb-3 group-hover:text-[#C5A059] transition-colors">
                      {getTranslation(space.name, language)}
                    </h2>
                    <p className="font-sans text-[#666058] text-sm leading-relaxed mb-6 line-clamp-3">
                      {getTranslation(space.description, language)}
                    </p>
                    <span className="inline-flex items-center text-[#C5A059] font-sans text-sm">
                      {t.explore}
                      <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
