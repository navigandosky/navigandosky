import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { useLanguage, getTranslation } from "../hooks/useLanguage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const translations = {
  it: {
    title: "Il Progetto Spoke",
    loading: "Caricamento...",
    empty: "Contenuto in fase di aggiornamento"
  },
  en: {
    title: "The Spoke Project",
    loading: "Loading...",
    empty: "Content being updated"
  },
  fr: {
    title: "Le Projet Spoke",
    loading: "Chargement...",
    empty: "Contenu en cours de mise à jour"
  },
  de: {
    title: "Das Spoke Projekt",
    loading: "Laden...",
    empty: "Inhalt wird aktualisiert"
  }
};

export default function Project() {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const t = translations[language];

  useEffect(() => {
    fetchProject();
  }, []);

  const fetchProject = async () => {
    try {
      const response = await axios.get(`${API}/project`);
      setProject(response.data);
    } catch (error) {
      console.error("Error fetching project:", error);
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

  const content = project?.content ? getTranslation(project.content, language) : "";

  return (
    <div className="py-24 md:py-32">
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        <h1 className="font-serif text-4xl md:text-5xl text-[#2A2A2A] mb-12" data-testid="project-title">
          {t.title}
        </h1>

        {content ? (
          <div 
            className="prose prose-lg max-w-none font-sans text-[#2A2A2A] leading-relaxed"
            data-testid="project-content"
          >
            {/* Render content with line breaks */}
            {content.split('\n').map((paragraph, index) => (
              paragraph.trim() && (
                <p key={index} className="mb-6">
                  {paragraph}
                </p>
              )
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="font-sans text-[#666058]">{t.empty}</p>
          </div>
        )}

        {/* Decorative element */}
        <div className="mt-16 pt-16 border-t border-[#E5E0D8]">
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-[#C5A059]" />
            <svg className="w-8 h-8 text-[#C5A059]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <div className="h-px w-16 bg-[#C5A059]" />
          </div>
        </div>
      </div>
    </div>
  );
}
