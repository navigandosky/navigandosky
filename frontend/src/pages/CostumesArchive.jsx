import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2, ArrowRight } from "lucide-react";
import axios from "axios";
import { Input } from "../components/ui/input";
import { useLanguage, getTranslation } from "../hooks/useLanguage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const translations = {
  it: {
    title: "Archivio Costumi",
    subtitle: "Catalogo completo dei costumi tradizionali sardi e dei loro elementi",
    search: "Cerca per ID, descrizione o ricamatrice...",
    empty: "Nessun costume trovato",
    loading: "Caricamento...",
    viewDetails: "Visualizza dettagli",
    ricamatrice: "Ricamatrice",
    proprietà: "Proprietà"
  },
  en: {
    title: "Costumes Archive",
    subtitle: "Complete catalog of traditional Sardinian costumes and their elements",
    search: "Search by ID, description or embroiderer...",
    empty: "No costumes found",
    loading: "Loading...",
    viewDetails: "View details",
    ricamatrice: "Embroiderer",
    proprietà: "Property"
  },
  fr: {
    title: "Archives Costumes",
    subtitle: "Catalogue complet des costumes traditionnels sardes et de leurs éléments",
    search: "Rechercher par ID, description ou brodeuse...",
    empty: "Aucun costume trouvé",
    loading: "Chargement...",
    viewDetails: "Voir les détails",
    ricamatrice: "Brodeuse",
    proprietà: "Propriété"
  },
  de: {
    title: "Kostümarchiv",
    subtitle: "Vollständiger Katalog der traditionellen sardischen Trachten und ihrer Elemente",
    search: "Suche nach ID, Beschreibung oder Stickerin...",
    empty: "Keine Kostüme gefunden",
    loading: "Laden...",
    viewDetails: "Details anzeigen",
    ricamatrice: "Stickerin",
    proprietà: "Eigentum"
  }
};

export default function CostumesArchive() {
  const [costumes, setCostumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { language } = useLanguage();
  const t = translations[language];

  useEffect(() => {
    fetchCostumes();
  }, []);

  const fetchCostumes = async (search = "") => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/costumes`, {
        params: search ? { search } : {}
      });
      setCostumes(response.data);
    } catch (error) {
      console.error("Error fetching costumes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchCostumes(value);
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  return (
    <div className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <h1 className="font-serif text-4xl md:text-5xl text-[#2A2A2A] mb-6" data-testid="costumes-title">
            {t.title}
          </h1>
          <p className="font-sans text-lg text-[#666058] leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666058]" />
          <Input
            type="text"
            placeholder={t.search}
            value={searchTerm}
            onChange={handleSearch}
            className="pl-12 py-6 bg-white border-[#E5E0D8] focus:border-[#C5A059] rounded-sm"
            data-testid="costumes-search"
          />
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
            <span className="ml-3 font-sans text-[#666058]">{t.loading}</span>
          </div>
        ) : costumes.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-sans text-[#666058]">{t.empty}</p>
          </div>
        ) : (
          /* Masonry Grid */
          <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
            {costumes.map((costume) => (
              <Link
                key={costume.id}
                to={`/costumes/${costume.id}`}
                className="block break-inside-avoid group"
                data-testid={`costume-card-${costume.id}`}
              >
                <div className="bg-white rounded-sm border border-[#E5E0D8] overflow-hidden gold-border card-hover">
                  {/* Image */}
                  {costume.photos && costume.photos.length > 0 ? (
                    <div className="relative overflow-hidden">
                      <img
                        src={costume.photos[0].startsWith('http') ? costume.photos[0] : `${process.env.REACT_APP_BACKEND_URL}${costume.photos[0]}`}
                        alt={getTranslation(costume.description, language)}
                        className="w-full h-48 object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1A1918]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ) : (
                    <div className="h-32 bg-[#F2F0EB] flex items-center justify-center">
                      <span className="font-mono text-xs text-[#666058]">
                        ID: {costume.id_risorsa}
                      </span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6">
                    <p className="font-mono text-xs text-[#C5A059] mb-2">
                      {costume.id_risorsa}
                    </p>
                    <p className="font-sans text-[#2A2A2A] leading-relaxed mb-4 line-clamp-3">
                      {getTranslation(costume.description, language)}
                    </p>

                    {/* Metadata */}
                    <div className="space-y-1 mb-4">
                      {costume.ricamatrice && (
                        <p className="font-sans text-sm text-[#666058]">
                          <span className="font-medium">{t.ricamatrice}:</span> {costume.ricamatrice}
                        </p>
                      )}
                      {costume.proprieta && (
                        <p className="font-sans text-sm text-[#666058]">
                          <span className="font-medium">{t.proprietà}:</span> {costume.proprieta}
                        </p>
                      )}
                    </div>

                    <span className="inline-flex items-center text-[#C5A059] font-sans text-sm">
                      {t.viewDetails}
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
