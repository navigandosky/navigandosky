import { useEffect, useState, useRef, useCallback } from "react";
import "@/App.css";
import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";
import {
  Lightbulb,
  Box,
  Monitor,
  Smartphone,
  Globe,
  GraduationCap,
  Building2,
  Landmark,
  Gem,
  HomeIcon,
  Palmtree,
  Users,
  MapPin,
  Mail,
  Phone,
  MessageCircle,
  MapPinIcon,
  ChevronUp,
  Check,
  Menu,
  X,
  Lock,
  LogOut,
  FolderOpen,
  Inbox,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Image,
  RefreshCw,
  Play,
  ArrowRight,
  Quote,
  Cpu,
  Cloud,
  Wifi,
  Camera,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// =============================================================================
// IMMAGINI SARDEGNA FREE (Unsplash) - Corrected URLs
// =============================================================================
const SARDEGNA_IMAGES = {
  hero: "https://images.unsplash.com/photo-1539768942893-daf53e448371?w=1920&q=80", // Sardinia Coast
  grotte: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80", // Sea cave
  nuraghe: "https://images.unsplash.com/photo-1515861209316-57a968e45ee5?w=1200&q=80", // Ancient ruins
  mare: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80", // Beach
  montagna: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80", // Mountain
  borgo: "https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=1200&q=80", // Historic village
  tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80", // Tech
  vr: "https://images.unsplash.com/photo-1617802690992-15d93263d3a9?w=1200&q=80", // VR
  drone: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=1200&q=80", // Drone
};

// =============================================================================
// LOGHI PARTNER - REMOVED
// =============================================================================

// =============================================================================
// HOOKS
// =============================================================================

// Scroll reveal hook - observes all elements with .scroll-reveal class
const useScrollReveal = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    );

    // Function to observe all scroll-reveal elements
    const observeElements = () => {
      document.querySelectorAll('.scroll-reveal:not(.revealed)').forEach((el) => {
        observer.observe(el);
      });
    };

    // Initial observation
    observeElements();

    // Re-observe when DOM changes (for dynamically loaded content)
    const mutationObserver = new MutationObserver(() => {
      observeElements();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);
};

// Counter animation hook
const useCountUp = (end, duration = 2000, start = 0) => {
  const [count, setCount] = useState(start);
  const [hasStarted, setHasStarted] = useState(false);

  const startCounting = useCallback(() => {
    if (hasStarted) return;
    setHasStarted(true);
    let startTime = null;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * (end - start) + start));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [hasStarted, end, start, duration]);

  return [count, startCounting];
};

// Auth hook
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const creds = localStorage.getItem('trivor_admin_creds');
    if (creds) verifyAuth(creds);
    else setIsLoading(false);
  }, []);

  const verifyAuth = async (creds) => {
    try {
      await axios.get(`${API}/admin/verify`, { headers: { Authorization: `Basic ${creds}` } });
      setIsAuthenticated(true);
    } catch (e) {
      localStorage.removeItem('trivor_admin_creds');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    const creds = btoa(`${username}:${password}`);
    try {
      await axios.get(`${API}/admin/verify`, { headers: { Authorization: `Basic ${creds}` } });
      localStorage.setItem('trivor_admin_creds', creds);
      setIsAuthenticated(true);
      return true;
    } catch (e) {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('trivor_admin_creds');
    setIsAuthenticated(false);
  };

  const getAuthHeader = () => {
    const creds = localStorage.getItem('trivor_admin_creds');
    return creds ? { Authorization: `Basic ${creds}` } : {};
  };

  return { isAuthenticated, isLoading, login, logout, getAuthHeader };
};

// =============================================================================
// STATS COUNTER
// =============================================================================
const StatsCounter = ({ value, suffix, label }) => {
  const [count, startCounting] = useCountUp(value, 2000);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) startCounting(); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [startCounting]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
        {count}{suffix}
      </div>
      <div className="text-gray-400 mt-2 text-sm uppercase tracking-wider">{label}</div>
    </div>
  );
};

// =============================================================================
// NAVBAR
// =============================================================================
const Navbar = ({ showAdminLink = true }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const location = useLocation();
  const isHomePage = location.pathname === "/" || location.pathname === "";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      if (isHomePage) {
        const sections = ["home", "servizi", "tour-virtuali", "portfolio", "chi-siamo", "contatti"];
        for (const section of [...sections].reverse()) {
          const el = document.getElementById(section);
          if (el && window.scrollY >= el.offsetTop - 100) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const navItems = [
    { name: "Home", id: "home" },
    { name: "Servizi", id: "servizi" },
    { name: "Tour Virtuali", id: "tour-virtuali" },
    { name: "Portfolio", id: "portfolio" },
    { name: "Chi Siamo", id: "chi-siamo" },
    { name: "Contatti", id: "contatti" },
  ];

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? "bg-[#0a0a0b]/95 backdrop-blur-lg shadow-2xl" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <button onClick={() => scrollToSection('home')} className="flex items-center group">
            <img 
              src="https://customer-assets.emergentagent.com/job_trivor-agent/artifacts/5wu3c3nj_logo%20trivor%20heritage%20digitale.png" 
              alt="Trivor" 
              className="h-12 md:h-14 w-auto transition-transform group-hover:scale-105"
            />
          </button>

          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => scrollToSection(item.id)}
                className={`text-sm font-medium transition-all duration-300 relative ${
                  activeSection === item.id
                    ? "text-cyan-400"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                {item.name}
                {activeSection === item.id && (
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full" />
                )}
              </button>
            ))}
            {showAdminLink && (
              <a href="#/admin" className="flex items-center space-x-1 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 hover:bg-cyan-500/20 transition-all text-sm">
                <Lock size={14} />
                <span>Admin</span>
              </a>
            )}
          </div>

          <button className="md:hidden text-white p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0a0b]/98 backdrop-blur-lg pb-4 rounded-b-2xl border-t border-gray-800">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => scrollToSection(item.id)}
                className="block w-full text-left py-3 px-4 text-gray-300 hover:text-cyan-400 hover:bg-gray-800/50 transition-all"
              >
                {item.name}
              </button>
            ))}
            {showAdminLink && (
              <a href="#/admin" className="flex items-center space-x-2 py-3 px-4 text-cyan-400">
                <Lock size={16} />
                <span>Area Riservata</span>
              </a>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

// =============================================================================
// HERO SECTION - Con immagine Sardegna e animazioni (carica da CMS)
// =============================================================================
const HeroSection = () => {
  const [currentImage, setCurrentImage] = useState(0);
  const [images, setImages] = useState([
    { url: "https://images.unsplash.com/photo-1539768942893-daf53e448371?w=1920&q=80", title: "Sardegna Coast" },
    { url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80", title: "Mare Cristallino" },
    { url: "https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=1200&q=80", title: "Borghi Storici" },
  ]);

  // Load hero images from CMS
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await axios.get(`${API}/settings`);
        if (response.data.hero_images && response.data.hero_images.length > 0) {
          setImages(response.data.hero_images);
        }
      } catch (error) {
        console.log('Using default hero images');
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Images with Crossfade */}
      {images.map((img, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${index === currentImage ? 'opacity-100' : 'opacity-0'}`}
        >
          <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0b]/70 via-[#0a0a0b]/50 to-[#0a0a0b]" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
        <div className="scroll-reveal opacity-0 translate-y-8">
          <span className="inline-block px-6 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/90 text-sm font-medium mb-8">
            ✨ Heritage Digitale & Innovazione
          </span>
        </div>

        <h1 className="scroll-reveal opacity-0 translate-y-8 text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight">
          Trasformiamo il
          <span className="block bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
            Patrimonio Culturale
          </span>
        </h1>

        <p className="scroll-reveal opacity-0 translate-y-8 text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed">
          Gemelli Digitali, Tour Virtuali e Soluzioni AI per la valorizzazione 
          del territorio e dei beni culturali della Sardegna.
        </p>

        <div className="scroll-reveal opacity-0 translate-y-8 flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <button
            onClick={() => document.getElementById('tour-virtuali')?.scrollIntoView({ behavior: 'smooth' })}
            className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold rounded-full transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25 flex items-center justify-center space-x-2"
          >
            <Play size={20} />
            <span>Esplora i Tour Virtuali</span>
          </button>
          <button
            onClick={() => document.getElementById('contatti')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-full border border-white/20 hover:bg-white/20 transition-all flex items-center justify-center space-x-2"
          >
            <span>Contattaci</span>
            <ArrowRight size={20} />
          </button>
        </div>

        {/* Stats */}
        <div className="scroll-reveal opacity-0 translate-y-8 grid grid-cols-3 gap-8 max-w-3xl mx-auto">
          <StatsCounter value={9} suffix="+" label="Anni Esperienza" />
          <StatsCounter value={48} suffix="+" label="Progetti" />
          <StatsCounter value={96} suffix="%" label="Soddisfazione" />
        </div>
      </div>

      {/* Image Indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImage(index)}
            className={`w-2 h-2 rounded-full transition-all ${index === currentImage ? 'w-8 bg-cyan-400' : 'bg-white/30 hover:bg-white/50'}`}
          />
        ))}
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 animate-bounce z-20">
        <ChevronUp size={24} className="text-white/50 rotate-180" />
      </div>
    </section>
  );
};

// =============================================================================
// PARTNER LOGOS BAR
// =============================================================================
const PartnerLogosBar = () => (
  <section className="py-12 bg-white">
    <div className="max-w-7xl mx-auto px-4">
      <p className="text-center text-gray-500 text-sm mb-8 uppercase tracking-wider">Partner e Collaborazioni</p>
      <div className="flex flex-wrap justify-center items-center gap-12">
        {PARTNER_LOGOS.map((partner, index) => (
          <div key={index} className="grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
            <img src={partner.url} alt={partner.name} className="h-12 md:h-16 w-auto object-contain" />
          </div>
        ))}
      </div>
    </div>
  </section>
);

// =============================================================================
// SERVICES SECTION - Con animazioni
// =============================================================================
const ServicesSection = () => {
  const services = [
    {
      icon: Box,
      title: "Gemelli Digitali",
      description: "Replica virtuale 3D dei tuoi spazi con tecnologia Matterport per visite immersive a 360°.",
      features: ["Scansione 3D", "Tour Interattivi", "Misurazioni"],
      color: "cyan",
      image: SARDEGNA_IMAGES.vr,
    },
    {
      icon: Camera,
      title: "Tour Virtuali",
      description: "Esperienze immersive per musei, siti archeologici, grotte e beni culturali della Sardegna.",
      features: ["360° Interattivo", "Hotspot Info", "Audio Guide"],
      color: "teal",
      image: SARDEGNA_IMAGES.grotte,
    },
    {
      icon: Cpu,
      title: "Soluzioni AI",
      description: "Intelligenza artificiale per catalogazione, riconoscimento e valorizzazione del patrimonio.",
      features: ["Machine Learning", "Computer Vision", "NLP"],
      color: "emerald",
      image: SARDEGNA_IMAGES.tech,
    },
    {
      icon: Monitor,
      title: "Web App",
      description: "Piattaforme web moderne per la gestione e promozione di beni culturali e turistici.",
      features: ["CMS Custom", "Booking", "Analytics"],
      color: "blue",
      image: SARDEGNA_IMAGES.borgo,
    },
    {
      icon: Cloud,
      title: "Smart Building",
      description: "Dashboard IoT per monitoraggio, manutenzione e gestione intelligente degli edifici.",
      features: ["IoT Sensors", "Real-time Data", "Automazioni"],
      color: "purple",
      image: SARDEGNA_IMAGES.drone,
    },
    {
      icon: GraduationCap,
      title: "Formazione",
      description: "Corsi e workshop su digitalizzazione, gemelli digitali e nuove tecnologie.",
      features: ["Workshop", "Certificazioni", "Supporto"],
      color: "amber",
      image: SARDEGNA_IMAGES.nuraghe,
    },
  ];

  return (
    <section id="servizi" className="py-24 bg-[#0a0a0b]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16 scroll-reveal opacity-0 translate-y-8">
          <span className="inline-block px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-medium mb-6">
            I Nostri Servizi
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Soluzioni Digitali Innovative</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Tecnologie all'avanguardia per la trasformazione digitale del patrimonio culturale
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <div
              key={index}
              className="scroll-reveal opacity-0 translate-y-8 group relative bg-[#111214] border border-gray-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition-all duration-500"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Background Image */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500">
                <img src={service.image} alt="" className="w-full h-full object-cover" />
              </div>
              
              <div className="relative p-6">
                <div className={`w-14 h-14 bg-${service.color}-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <service.icon className={`w-7 h-7 text-${service.color}-400`} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">{service.title}</h3>
                <p className="text-gray-400 mb-4 text-sm leading-relaxed">{service.description}</p>
                <div className="flex flex-wrap gap-2">
                  {service.features.map((f, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-800 rounded-full text-gray-400 text-xs">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// =============================================================================
// TOUR VIRTUALI SECTION - Con embed Matterport
// =============================================================================
const TourVirtualiSection = () => {
  const tours = [
    {
      title: "Spoke Ghivine",
      subtitle: "Grotte e Siti Archeologici",
      description: "Esplora le meraviglie sotterranee della Sardegna con tour virtuali immersivi delle grotte più spettacolari.",
      link: "https://www.trivor.it/spokeghivine",
      image: SARDEGNA_IMAGES.grotte,
    },
    {
      title: "Spoke Galaveras",
      subtitle: "Manus de Oro - Arte del Ricamo",
      description: "Scopri l'arte del ricamo sardo attraverso mostre virtuali e archivio digitale dei costumi tradizionali.",
      link: "https://www.trivor.it/spokegalaveras",
      image: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800&q=80",
    },
  ];

  return (
    <section id="tour-virtuali" className="py-24 bg-gradient-to-b from-[#0a0a0b] to-[#0d1117]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16 scroll-reveal opacity-0 translate-y-8">
          <span className="inline-block px-4 py-2 bg-teal-500/10 border border-teal-500/30 rounded-full text-teal-400 text-sm font-medium mb-6">
            🎬 Esperienze Immersive
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Tour Virtuali Sardegna</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Esplora i nostri progetti di digitalizzazione del patrimonio culturale sardo
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {tours.map((tour, index) => (
            <a
              key={index}
              href={tour.link}
              target="_blank"
              rel="noopener noreferrer"
              className="scroll-reveal opacity-0 translate-y-8 group relative rounded-2xl overflow-hidden aspect-video"
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <img src={tour.image} alt={tour.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              
              <div className="absolute inset-0 flex flex-col justify-end p-8">
                <span className="text-teal-400 text-sm font-medium mb-2">{tour.subtitle}</span>
                <h3 className="text-3xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">{tour.title}</h3>
                <p className="text-gray-300 mb-4 line-clamp-2">{tour.description}</p>
                <div className="flex items-center text-cyan-400 font-medium group-hover:translate-x-2 transition-transform">
                  <Play size={20} className="mr-2" />
                  <span>Inizia l'esplorazione</span>
                  <ArrowRight size={20} className="ml-2" />
                </div>
              </div>

              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-20 h-20 bg-cyan-500/80 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Play size={32} className="text-white ml-1" />
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

// =============================================================================
// PORTFOLIO SECTION - Progetti Showcase
// =============================================================================
const PortfolioSection = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      // Fallback projects
      setProjects([
        { id: '1', title: 'Smart Building Dashboard', client: 'Navigandosky', category: 'smart_building', description: 'Piattaforma IoT per gestione edifici intelligenti con gemelli digitali.', image_url: SARDEGNA_IMAGES.tech, link: 'https://trivor-dashboard.preview.emergentagent.com/' },
        { id: '2', title: 'Spoke Ghivine', client: 'Regione Sardegna', category: 'beni_culturali', description: 'Digitalizzazione grotte e siti archeologici con tour virtuali 360°.', image_url: SARDEGNA_IMAGES.grotte, link: 'https://www.trivor.it/spokeghivine' },
        { id: '3', title: 'Spoke Galaveras', client: 'Manus de Oro', category: 'beni_culturali', description: 'Archivio digitale costumi tradizionali sardi e arte del ricamo.', image_url: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800&q=80', link: 'https://www.trivor.it/spokegalaveras' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', label: 'Tutti' },
    { id: 'beni_culturali', label: 'Beni Culturali' },
    { id: 'smart_building', label: 'Smart Building' },
    { id: 'turismo', label: 'Turismo' },
    { id: 'gestionale', label: 'Gestionale' },
  ];

  // Normalize category comparison (case-insensitive, handle spaces)
  const normalizeCategory = (cat) => cat?.toLowerCase().replace(/\s+/g, '_') || '';
  const filteredProjects = filter === 'all' 
    ? projects 
    : projects.filter(p => normalizeCategory(p.category) === filter);

  return (
    <section id="portfolio" className="py-24 bg-[#0a0a0b]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12 scroll-reveal opacity-0 translate-y-8">
          <span className="inline-block px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-6">
            Portfolio
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">I Nostri Progetti</h2>
          <p className="text-gray-400 text-lg">Soluzioni realizzate per i nostri clienti</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-12 scroll-reveal opacity-0 translate-y-8">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                filter === cat.id
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project, index) => (
              <a
                key={project.id}
                href={project.link || '#'}
                target={project.link ? '_blank' : undefined}
                rel={project.link ? 'noopener noreferrer' : undefined}
                className="scroll-reveal opacity-0 translate-y-8 group bg-[#111214] border border-gray-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition-all"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={project.image_url || SARDEGNA_IMAGES.tech}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111214] to-transparent" />
                  {project.link && (
                    <div className="absolute top-4 right-4 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink size={18} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">{project.title}</h3>
                  <p className="text-cyan-400 text-sm font-medium mb-3">{project.client}</p>
                  <p className="text-gray-400 text-sm line-clamp-2">{project.description}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// =============================================================================
// QUOTE SECTION
// =============================================================================
const QuoteSection = () => (
  <section className="py-24 bg-gradient-to-r from-[#0d1117] to-[#0a0a0b]">
    <div className="max-w-4xl mx-auto px-4 text-center scroll-reveal opacity-0 translate-y-8">
      <Quote size={48} className="text-cyan-400/30 mx-auto mb-6" />
      <blockquote className="text-2xl md:text-3xl text-white font-light italic leading-relaxed mb-6">
        "La tecnologia al servizio della cultura: trasformiamo il patrimonio della Sardegna in esperienze digitali uniche e accessibili a tutti."
      </blockquote>
      <cite className="text-cyan-400 font-medium">— TRIVOR Heritage Digitale</cite>
    </div>
  </section>
);

// =============================================================================
// ABOUT SECTION
// =============================================================================
const AboutSection = () => {
  const features = [
    "Esperienza pluriennale",
    "Tecnologie all'avanguardia",
    "Supporto dedicato",
    "Soluzioni su misura",
  ];

  return (
    <section id="chi-siamo" className="py-24 bg-[#0a0a0b]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="scroll-reveal opacity-0 translate-x-[-50px]">
            <span className="inline-block px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-sm font-medium mb-6">
              Chi Siamo
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">Partner per l'Innovazione Digitale</h2>
            <div className="space-y-4 text-gray-400 leading-relaxed">
              <p>
                <span className="text-cyan-400 font-semibold">Trivor</span> nasce in Sardegna con la missione di valorizzare 
                il patrimonio culturale attraverso le più avanzate tecnologie digitali.
              </p>
              <p>
                Specializzati in <span className="text-cyan-400 font-semibold">Gemelli Digitali</span> e tour virtuali immersivi, 
                trasformiamo spazi fisici in esperienze digitali interattive e accessibili.
              </p>
              <p>
                Con l'integrazione dell'<span className="text-cyan-400 font-semibold">Intelligenza Artificiale</span>, 
                creiamo soluzioni innovative per musei, siti archeologici e beni culturali.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-8">
              {features.map((f, i) => (
                <div key={i} className="flex items-center text-gray-300">
                  <div className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center mr-3">
                    <Check className="w-4 h-4 text-cyan-400" />
                  </div>
                  {f}
                </div>
              ))}
            </div>
          </div>

          <div className="scroll-reveal opacity-0 translate-x-[50px] relative">
            <div className="relative rounded-2xl overflow-hidden">
              <img src={SARDEGNA_IMAGES.nuraghe} alt="Sardegna" className="w-full h-[500px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-[#111214] border border-gray-800 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
                  <MapPinIcon className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Sede Principale</p>
                  <p className="text-gray-400 text-sm">Cagliari, Sardegna</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// =============================================================================
// CONTACT SECTION
// =============================================================================
const ContactSection = () => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState({ loading: false, success: false, error: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, success: false, error: null });
    try {
      await axios.post(`${API}/contact`, formData);
      setStatus({ loading: false, success: true, error: null });
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      setStatus({ loading: false, success: false, error: 'Errore invio. Riprova.' });
    }
  };

  const contactInfo = [
    { icon: Mail, title: 'Email', value: 'trivorsrl@gmail.com', href: 'mailto:trivorsrl@gmail.com' },
    { icon: Phone, title: 'Telefono', value: '+39 393 92 55 552', href: 'tel:+393939255552' },
    { icon: MessageCircle, title: 'WhatsApp', value: 'Scrivici', href: 'https://wa.me/393939255552' },
    { icon: MapPinIcon, title: 'Sede', value: 'Cagliari, Sardegna', href: null },
  ];

  return (
    <section id="contatti" className="py-24 bg-gradient-to-b from-[#0a0a0b] to-[#0d1117]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16 scroll-reveal opacity-0 translate-y-8">
          <span className="inline-block px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 text-sm font-medium mb-6">
            Contatti
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Parliamo del Tuo Progetto</h2>
          <p className="text-gray-400 text-lg">Siamo pronti a trasformare la tua idea in realtà</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-6 scroll-reveal opacity-0 translate-x-[-50px]">
            {contactInfo.map((info, i) => (
              <div key={i} className="flex items-start space-x-4 p-4 bg-[#111214] rounded-xl border border-gray-800 hover:border-cyan-500/30 transition-all">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <info.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">{info.title}</h4>
                  {info.href ? (
                    <a href={info.href} className="text-gray-400 hover:text-cyan-400 transition-colors" target={info.href.startsWith('http') ? '_blank' : undefined}>{info.value}</a>
                  ) : (
                    <p className="text-gray-400">{info.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="scroll-reveal opacity-0 translate-x-[50px] bg-[#111214] border border-gray-800 rounded-2xl p-8">
            {status.success ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Messaggio Inviato!</h3>
                <p className="text-gray-400">Ti risponderemo presto.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {status.error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{status.error}</div>}
                <div className="grid md:grid-cols-2 gap-5">
                  <input type="text" name="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="Nome *" className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none transition-colors" />
                  <input type="email" name="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required placeholder="Email *" className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none transition-colors" />
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <input type="tel" name="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Telefono" className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none transition-colors" />
                  <input type="text" name="subject" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} required placeholder="Oggetto *" className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none transition-colors" />
                </div>
                <textarea name="message" value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} required rows={4} placeholder="Messaggio *" className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none transition-colors resize-none" />
                <button type="submit" disabled={status.loading} className="w-full py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50">
                  {status.loading ? 'Invio...' : 'Invia Messaggio'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

// =============================================================================
// FOOTER
// =============================================================================
const Footer = () => {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <footer className="bg-[#050507] border-t border-gray-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <button onClick={() => scrollTo('home')} className="mb-6 block">
              <img src="https://customer-assets.emergentagent.com/job_trivor-agent/artifacts/5wu3c3nj_logo%20trivor%20heritage%20digitale.png" alt="Trivor" className="h-12 w-auto" />
            </button>
            <p className="text-gray-400 text-sm">Heritage Digitale e Innovazione per la Sardegna.</p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Navigazione</h4>
            <ul className="space-y-2">
              {['Home', 'Servizi', 'Portfolio', 'Chi Siamo', 'Contatti'].map((item) => (
                <li key={item}><button onClick={() => scrollTo(item.toLowerCase().replace(' ', '-'))} className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">{item}</button></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Progetti</h4>
            <ul className="space-y-2">
              <li><a href="https://www.trivor.it/spokeghivine" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">Spoke Ghivine</a></li>
              <li><a href="https://www.trivor.it/spokegalaveras" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">Spoke Galaveras</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Strumenti</h4>
            <ul className="space-y-2">
              <li><a href="https://trivor-dashboard.preview.emergentagent.com/gestione-commesse" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">📊 Gestione Commesse</a></li>
              <li><a href="#/admin" className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">🔐 Area Riservata</a></li>
            </ul>
          </div>
        </div>

        {/* Partner Logos */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <div className="flex flex-wrap justify-center items-center gap-8">
            {PARTNER_LOGOS.map((p, i) => (
              <img key={i} src={p.url} alt={p.name} className="h-8 w-auto grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all" />
            ))}
          </div>
        </div>

        <div className="text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} Trivor SRL. Tutti i diritti riservati.
        </div>
      </div>
    </footer>
  );
};

// =============================================================================
// FLOATING BUTTONS
// =============================================================================
const FloatingButtons = () => {
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScroll(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-24 right-6 w-12 h-12 bg-cyan-500/80 hover:bg-cyan-500 text-white rounded-full flex items-center justify-center shadow-lg transition-all z-40 ${showScroll ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      >
        <ChevronUp size={24} />
      </button>
      <a
        href="https://wa.me/393939255552"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all z-50 hover:scale-110"
      >
        <MessageCircle size={28} fill="currentColor" />
      </a>
    </>
  );
};

// =============================================================================
// ADMIN COMPONENTS (Simplified)
// =============================================================================
const AdminLogin = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await onLogin(username, password);
    if (!success) setError('Credenziali non valide');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Area Riservata</h1>
        </div>
        <form onSubmit={handleSubmit} className="bg-[#111214] border border-gray-800 rounded-xl p-8 space-y-6">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">{error}</div>}
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="Username" className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password" className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none" />
          <button type="submit" disabled={loading} className="w-full py-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50">
            {loading ? 'Accesso...' : 'Accedi'}
          </button>
        </form>
        <div className="text-center mt-6">
          <a href="#/" className="text-gray-400 hover:text-cyan-400 text-sm">← Torna al sito</a>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = ({ onLogout, getAuthHeader }) => {
  const [projects, setProjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [heroImages, setHeroImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects');
  const [editingProject, setEditingProject] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showHeroForm, setShowHeroForm] = useState(false);
  const [savingHero, setSavingHero] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projectsRes, messagesRes, settingsRes] = await Promise.all([
        axios.get(`${API}/projects`),
        axios.get(`${API}/admin/messages`, { headers: getAuthHeader() }),
        axios.get(`${API}/settings`)
      ]);
      setProjects(projectsRes.data);
      setMessages(messagesRes.data);
      setHeroImages(settingsRes.data.hero_images || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Eliminare questo progetto?')) return;
    try {
      await axios.delete(`${API}/admin/projects/${id}`, { headers: getAuthHeader() });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Eliminare questo messaggio?')) return;
    try {
      await axios.delete(`${API}/admin/messages/${id}`, { headers: getAuthHeader() });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleSaveHeroImages = async () => {
    setSavingHero(true);
    try {
      await axios.put(`${API}/admin/settings`, { hero_images: heroImages }, { headers: getAuthHeader() });
      alert('Immagini Hero salvate!');
    } catch (e) { 
      console.error(e); 
      alert('Errore nel salvataggio');
    }
    finally { setSavingHero(false); }
  };

  const addHeroImage = () => {
    setHeroImages([...heroImages, { url: '', title: '' }]);
  };

  const updateHeroImage = (index, field, value) => {
    const updated = [...heroImages];
    updated[index] = { ...updated[index], [field]: value };
    setHeroImages(updated);
  };

  const removeHeroImage = (index) => {
    setHeroImages(heroImages.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      <header className="bg-[#111214] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <a href="#/"><img src="https://customer-assets.emergentagent.com/job_trivor-agent/artifacts/5wu3c3nj_logo%20trivor%20heritage%20digitale.png" alt="Trivor" className="h-8" /></a>
            <span className="text-gray-400">| Admin</span>
          </div>
          <button onClick={onLogout} className="flex items-center space-x-2 text-gray-400 hover:text-white"><LogOut size={18} /><span>Esci</span></button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex space-x-4 mb-6">
          <button onClick={() => setActiveTab('projects')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'projects' ? 'bg-cyan-500 text-white' : 'bg-[#111214] text-gray-400'}`}>
            <FolderOpen className="w-4 h-4 inline mr-2" />Progetti ({projects.length})
          </button>
          <button onClick={() => setActiveTab('messages')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'messages' ? 'bg-cyan-500 text-white' : 'bg-[#111214] text-gray-400'}`}>
            <Inbox className="w-4 h-4 inline mr-2" />Messaggi ({messages.length})
          </button>
          <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'settings' ? 'bg-cyan-500 text-white' : 'bg-[#111214] text-gray-400'}`}>
            <Image className="w-4 h-4 inline mr-2" />Immagini Hero
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" /></div>
        ) : activeTab === 'projects' ? (
          <div className="bg-[#111214] border border-gray-800 rounded-xl">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Gestione Progetti</h2>
              <button onClick={() => { setEditingProject(null); setShowForm(true); }} className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"><Plus size={16} /><span>Nuovo</span></button>
            </div>
            <div className="divide-y divide-gray-800">
              {projects.length === 0 ? (
                <div className="p-8 text-center text-gray-400">Nessun progetto</div>
              ) : projects.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-800 rounded-lg overflow-hidden">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <Image className="w-6 h-6 text-gray-600 m-3" />}
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{p.title}</h3>
                      <p className="text-gray-400 text-sm">{p.client}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => { setEditingProject(p); setShowForm(true); }} className="p-2 text-gray-400 hover:text-cyan-400"><Edit size={18} /></button>
                    <button onClick={() => handleDeleteProject(p.id)} className="p-2 text-gray-400 hover:text-red-400"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'messages' ? (
          <div className="bg-[#111214] border border-gray-800 rounded-xl">
            <div className="p-4 border-b border-gray-800"><h2 className="text-lg font-semibold text-white">Messaggi</h2></div>
            <div className="divide-y divide-gray-800">
              {messages.length === 0 ? (
                <div className="p-8 text-center text-gray-400">Nessun messaggio</div>
              ) : messages.map((m) => (
                <div key={m.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-white font-medium">{m.name}</h3>
                      <p className="text-gray-400 text-sm">{m.email}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 text-xs">{new Date(m.created_at).toLocaleDateString('it-IT')}</span>
                      <button onClick={() => handleDeleteMessage(m.id)} className="p-1 text-gray-400 hover:text-red-400"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <p className="text-cyan-400 text-sm font-medium">{m.subject}</p>
                  <p className="text-gray-300 text-sm mt-1">{m.message}</p>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          <div className="bg-[#111214] border border-gray-800 rounded-xl">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">Immagini Hero Homepage</h2>
                <p className="text-gray-400 text-sm mt-1">Dimensione consigliata: 1920x1080px (16:9)</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={addHeroImage} className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                  <Plus size={16} /><span>Aggiungi</span>
                </button>
                <button onClick={handleSaveHeroImages} disabled={savingHero} className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg disabled:opacity-50">
                  {savingHero ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>{savingHero ? 'Salvataggio...' : 'Salva'}</span>
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {heroImages.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna immagine Hero configurata</p>
                  <p className="text-sm mt-2">Clicca "Aggiungi" per inserire le immagini della Sardegna</p>
                </div>
              ) : heroImages.map((img, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 bg-[#0a0a0b] rounded-lg border border-gray-700">
                  <div className="w-40 h-24 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                    {img.url ? (
                      <img src={img.url} alt={img.title} className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-8 h-8 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      value={img.title}
                      onChange={(e) => updateHeroImage(index, 'title', e.target.value)}
                      placeholder="Titolo (es: Costa Smeralda)"
                      className="w-full px-3 py-2 bg-[#111214] border border-gray-700 rounded-lg text-white text-sm"
                    />
                    <input
                      type="url"
                      value={img.url}
                      onChange={(e) => updateHeroImage(index, 'url', e.target.value)}
                      placeholder="URL immagine (https://...)"
                      className="w-full px-3 py-2 bg-[#111214] border border-gray-700 rounded-lg text-white text-sm"
                    />
                  </div>
                  <button onClick={() => removeHeroImage(index)} className="p-2 text-gray-400 hover:text-red-400">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <p className="text-cyan-400 text-sm">
                  💡 <strong>Suggerimento:</strong> Carica le tue foto della Sardegna su un servizio di hosting immagini 
                  (come Imgur, Google Drive pubblico, o il tuo server) e incolla qui l'URL diretto dell'immagine.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {showForm && (
          <ProjectForm
            project={editingProject}
            onClose={() => setShowForm(false)}
            onSave={() => { setShowForm(false); fetchData(); }}
            getAuthHeader={getAuthHeader}
          />
        )}
      </div>
    </div>
  );
};

const ProjectForm = ({ project, onClose, onSave, getAuthHeader }) => {
  const [form, setForm] = useState({
    title: project?.title || '',
    client: project?.client || '',
    category: project?.category || 'beni_culturali',
    description: project?.description || '',
    image_url: project?.image_url || '',
    link: project?.link || '',
    featured: project?.featured || false,
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${API}/admin/upload`, fd, { headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } });
      setForm({ ...form, image_url: `${BACKEND_URL}${res.data.url}` });
    } catch (e) { console.error(e); }
    finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (project) {
        await axios.put(`${API}/admin/projects/${project.id}`, form, { headers: getAuthHeader() });
      } else {
        await axios.post(`${API}/admin/projects`, form, { headers: getAuthHeader() });
      }
      onSave();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111214] border border-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">{project ? 'Modifica' : 'Nuovo'} Progetto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <input type="text" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required placeholder="Titolo *" className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white" />
            <input type="text" value={form.client} onChange={(e) => setForm({...form, client: e.target.value})} required placeholder="Cliente *" className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white" />
          </div>
          <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white">
            <option value="beni_culturali">Beni Culturali</option>
            <option value="smart_building">Smart Building</option>
            <option value="turismo">Turismo</option>
            <option value="web_app">Web App</option>
          </select>
          <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} required rows={3} placeholder="Descrizione *" className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white resize-none" />
          <div>
            <label className="block text-white text-sm mb-2">Immagine</label>
            {form.image_url && <img src={form.image_url} alt="" className="h-32 w-full object-cover rounded-lg mb-3" />}
            <div className="flex gap-3">
              <input type="file" ref={fileRef} onChange={handleUpload} accept="image/*" className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm">
                {uploading ? 'Caricamento...' : '📤 Upload'}
              </button>
              <input type="url" value={form.image_url} onChange={(e) => setForm({...form, image_url: e.target.value})} placeholder="oppure URL immagine" className="flex-1 px-4 py-2 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white text-sm" />
            </div>
          </div>
          <input type="url" value={form.link} onChange={(e) => setForm({...form, link: e.target.value})} placeholder="Link progetto (opzionale)" className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white" />
          <label className="flex items-center space-x-3 text-white">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm({...form, featured: e.target.checked})} className="w-5 h-5" />
            <span>In evidenza</span>
          </label>
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-700 text-gray-400 rounded-lg">Annulla</button>
            <button type="submit" disabled={loading} className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg disabled:opacity-50">
              {loading ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminPage = () => {
  const { isAuthenticated, isLoading, login, logout, getAuthHeader } = useAuth();
  if (isLoading) return <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center"><RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" /></div>;
  if (!isAuthenticated) return <AdminLogin onLogin={login} />;
  return <AdminDashboard onLogout={logout} getAuthHeader={getAuthHeader} />;
};

// =============================================================================
// HOME PAGE
// =============================================================================
const Home = () => {
  useScrollReveal();

  return (
    <div className="bg-[#0a0a0b] min-h-screen">
      <Navbar />
      <HeroSection />
      <PartnerLogosBar />
      <ServicesSection />
      <TourVirtualiSection />
      <PortfolioSection />
      <QuoteSection />
      <AboutSection />
      <ContactSection />
      <Footer />
      <FloatingButtons />
    </div>
  );
};

// =============================================================================
// APP
// =============================================================================
function App() {
  return (
    <div className="App">
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </HashRouter>
    </div>
  );
}

export default App;
