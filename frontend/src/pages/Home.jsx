import { Link } from "react-router-dom";
import { ArrowRight, Eye, Archive, BookOpen } from "lucide-react";
import { Button } from "../components/ui/button";
import { useLanguage } from "../hooks/useLanguage";

const HERO_IMAGE = "https://customer-assets.emergentagent.com/job_matterport-tours/artifacts/rt6113ik_loc_sito-web.jpg";
const TEXTURE_IMAGE = "https://images.pexels.com/photos/8758357/pexels-photo-8758357.jpeg";

const translations = {
  it: {
    hero: {
      title: "Manus de Oro",
      subtitle: "Il Filo d'Oro della Sardegna",
      description: "Esplora i tour virtuali delle mostre dedicate all'arte del ricamo sardo e scopri l'archivio dei costumi tradizionali attraverso esperienze immersive Digital Twin.",
      cta: "Inizia l'esplorazione"
    },
    sections: {
      exhibitions: {
        title: "Le Mostre Digital Twin",
        description: "Visita virtualmente le mostre dedicate all'arte del ricamo attraverso la tecnologia Matterport",
        cta: "Esplora le mostre"
      },
      costumes: {
        title: "Archivio Costumi",
        description: "Scopri la catalogazione completa dei costumi tradizionali sardi e dei loro elementi",
        cta: "Sfoglia l'archivio"
      },
      project: {
        title: "Il Progetto Spoke",
        description: "Scopri la missione e la visione dietro questo progetto di valorizzazione culturale",
        cta: "Leggi di più"
      }
    }
  },
  en: {
    hero: {
      title: "Manus de Oro",
      subtitle: "The Golden Thread of Sardinia",
      description: "Explore virtual tours of exhibitions dedicated to Sardinian embroidery art and discover the archive of traditional costumes through immersive Digital Twin experiences.",
      cta: "Start exploring"
    },
    sections: {
      exhibitions: {
        title: "Digital Twin Exhibitions",
        description: "Virtually visit exhibitions dedicated to embroidery art through Matterport technology",
        cta: "Explore exhibitions"
      },
      costumes: {
        title: "Costumes Archive",
        description: "Discover the complete cataloging of traditional Sardinian costumes and their elements",
        cta: "Browse the archive"
      },
      project: {
        title: "The Spoke Project",
        description: "Discover the mission and vision behind this cultural enhancement project",
        cta: "Read more"
      }
    }
  },
  fr: {
    hero: {
      title: "Manus de Oro",
      subtitle: "Le Fil d'Or de la Sardaigne",
      description: "Explorez les visites virtuelles des expositions dédiées à l'art de la broderie sarde et découvrez les archives des costumes traditionnels.",
      cta: "Commencer l'exploration"
    },
    sections: {
      exhibitions: {
        title: "Expositions Digital Twin",
        description: "Visitez virtuellement les expositions dédiées à l'art de la broderie grâce à la technologie Matterport",
        cta: "Explorer les expositions"
      },
      costumes: {
        title: "Archives Costumes",
        description: "Découvrez le catalogage complet des costumes traditionnels sardes",
        cta: "Parcourir les archives"
      },
      project: {
        title: "Le Projet Spoke",
        description: "Découvrez la mission et la vision de ce projet de valorisation culturelle",
        cta: "En savoir plus"
      }
    }
  },
  de: {
    hero: {
      title: "Manus de Oro",
      subtitle: "Der Goldene Faden Sardiniens",
      description: "Erkunden Sie virtuelle Rundgänge durch Ausstellungen zur sardischen Stickkunst und entdecken Sie das Archiv traditioneller Trachten.",
      cta: "Erkundung starten"
    },
    sections: {
      exhibitions: {
        title: "Digital Twin Ausstellungen",
        description: "Besuchen Sie virtuell Ausstellungen zur Stickkunst mit Matterport-Technologie",
        cta: "Ausstellungen erkunden"
      },
      costumes: {
        title: "Kostümarchiv",
        description: "Entdecken Sie die vollständige Katalogisierung sardischer Trachten",
        cta: "Archiv durchsuchen"
      },
      project: {
        title: "Das Spoke Projekt",
        description: "Entdecken Sie die Mission und Vision dieses kulturellen Projekts",
        cta: "Mehr erfahren"
      }
    }
  }
};

export default function Home() {
  const { language } = useLanguage();
  const t = translations[language];

  const sections = [
    {
      icon: Eye,
      ...t.sections.exhibitions,
      link: "/exhibitions",
      image: HERO_IMAGE
    },
    {
      icon: Archive,
      ...t.sections.costumes,
      link: "/costumes",
      image: TEXTURE_IMAGE
    },
    {
      icon: BookOpen,
      ...t.sections.project,
      link: "/project",
      image: "https://images.pexels.com/photos/8711176/pexels-photo-8711176.jpeg"
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        {/* Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A1918]/90 via-[#1A1918]/70 to-transparent" />
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-24 md:py-32">
          <div className="max-w-2xl">
            <p className="font-mono text-[#C5A059] text-sm tracking-widest mb-4 animate-fade-in">
              SPOKE GALAVERAS
            </p>
            <h1 className="font-serif text-5xl md:text-7xl text-white mb-4 animate-fade-in animation-delay-100">
              {t.hero.title}
            </h1>
            <p className="font-serif text-2xl md:text-3xl text-[#C5A059] italic mb-8 animate-fade-in animation-delay-200">
              {t.hero.subtitle}
            </p>
            <p className="font-sans text-lg text-white/80 leading-relaxed mb-10 animate-fade-in animation-delay-300">
              {t.hero.description}
            </p>
            <Link to="/exhibitions" data-testid="hero-cta">
              <Button className="btn-gold rounded-sm px-8 py-6 text-lg font-serif tracking-wide animate-fade-in animation-delay-400">
                {t.hero.cta}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Decorative Element */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#F9F8F6] to-transparent" />
      </section>

      {/* Sections Grid */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Tetris-style asymmetric grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {sections.map((section, index) => {
              const Icon = section.icon;
              // Create asymmetric layout
              const gridClasses = [
                "md:col-span-7",
                "md:col-span-5",
                "md:col-span-12"
              ];
              
              return (
                <Link
                  key={section.link}
                  to={section.link}
                  className={`group ${gridClasses[index]}`}
                  data-testid={`section-${section.link.replace("/", "")}`}
                >
                  <div className="relative h-80 md:h-96 overflow-hidden rounded-sm gold-border card-hover">
                    {/* Background Image */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{ backgroundImage: `url(${section.image})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A1918]/90 via-[#1A1918]/40 to-transparent" />
                    
                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[#C5A059]/20 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-[#C5A059]" />
                        </div>
                        <h2 className="font-serif text-2xl md:text-3xl text-white">
                          {section.title}
                        </h2>
                      </div>
                      <p className="font-sans text-white/70 mb-4 max-w-lg">
                        {section.description}
                      </p>
                      <span className="inline-flex items-center text-[#C5A059] font-sans text-sm group-hover:gap-3 transition-all">
                        {section.cta}
                        <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-24 bg-[#F2F0EB]">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-8 text-[#C5A059]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
          </svg>
          <blockquote className="font-serif text-3xl md:text-4xl text-[#2A2A2A] italic leading-relaxed mb-8">
            L'arte del ricamo è il filo d'oro che unisce passato e futuro, tradizione e innovazione.
          </blockquote>
          <p className="font-sans text-[#666058] uppercase tracking-widest text-sm">
            — Manus de Oro
          </p>
        </div>
      </section>
    </div>
  );
}
