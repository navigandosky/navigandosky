import { useEffect, useState, useRef } from "react";
import "@/App.css";
import { HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
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
  BarChart3,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Image,
  RefreshCw,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// =============================================================================
// HOOKS
// =============================================================================

// Counter animation hook
const useCountUp = (end, duration = 2000, start = 0) => {
  const [count, setCount] = useState(start);
  const [hasStarted, setHasStarted] = useState(false);

  const startCounting = () => {
    if (hasStarted) return;
    setHasStarted(true);
    
    let startTime = null;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * (end - start) + start));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  };

  return [count, startCounting];
};

// Auth hook
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const creds = localStorage.getItem('trivor_admin_creds');
    if (creds) {
      verifyAuth(creds);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyAuth = async (creds) => {
    try {
      await axios.get(`${API}/admin/verify`, {
        headers: { Authorization: `Basic ${creds}` }
      });
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
      await axios.get(`${API}/admin/verify`, {
        headers: { Authorization: `Basic ${creds}` }
      });
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
// STATS COUNTER COMPONENT
// =============================================================================

const StatsCounter = ({ value, suffix, label }) => {
  const [count, startCounting] = useCountUp(value, 2000);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          startCounting();
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [startCounting]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-cyan-400">
        {count}{suffix}
      </div>
      <div className="text-gray-400 mt-2 text-sm">{label}</div>
    </div>
  );
};

// =============================================================================
// NAVBAR COMPONENT
// =============================================================================

const Navbar = ({ showAdminLink = true }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const location = useLocation();
  const isHomePage = location.pathname === "/" || location.pathname === "/trivor" || location.pathname === "/trivor/";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      
      if (isHomePage) {
        const sections = ["home", "servizi", "chi-siamo", "progetti", "contatti"];
        for (const section of sections.reverse()) {
          const element = document.getElementById(section);
          if (element && window.scrollY >= element.offsetTop - 100) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]);

  const navItems = [
    { name: "Home", href: isHomePage ? "#home" : "/trivor#home", id: "home" },
    { name: "Servizi", href: isHomePage ? "#servizi" : "/trivor#servizi", id: "servizi" },
    { name: "Chi Siamo", href: isHomePage ? "#chi-siamo" : "/trivor#chi-siamo", id: "chi-siamo" },
    { name: "Progetti", href: isHomePage ? "#progetti" : "/trivor#progetti", id: "progetti" },
    { name: "Contatti", href: isHomePage ? "#contatti" : "/trivor#contatti", id: "contatti" },
  ];

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "bg-[#0a0a0b]/95 backdrop-blur-md shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          <a href="/trivor" className="flex items-center">
            <img 
              src="https://customer-assets.emergentagent.com/job_trivor-agent/artifacts/5wu3c3nj_logo%20trivor%20heritage%20digitale.png" 
              alt="Trivor - Heritage Digitale" 
              className="h-14 md:h-16 w-auto"
              style={{ transform: 'scale(1.4)', transformOrigin: 'left center' }}
            />
          </a>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  isHomePage && activeSection === item.id
                    ? "text-white border-b-2 border-cyan-400 pb-1"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                {item.name}
              </a>
            ))}
            {showAdminLink && (
              <a
                href="/trivor/admin"
                className="flex items-center space-x-1 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Lock size={14} />
                <span>Area Riservata</span>
              </a>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0a0b]/95 backdrop-blur-md pb-4">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="block py-3 px-4 text-gray-300 hover:text-white hover:bg-gray-800/50"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}
            {showAdminLink && (
              <a
                href="/trivor/admin"
                className="flex items-center space-x-2 py-3 px-4 text-cyan-400 hover:text-cyan-300 hover:bg-gray-800/50"
                onClick={() => setMobileMenuOpen(false)}
              >
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
// HERO SECTION
// =============================================================================

const HeroSection = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1a1a] via-[#0a0f12] to-[#0a0a0b]">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-cyan-900/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-teal-900/10 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-6">
          <span className="inline-block px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-medium">
            Innovazione Digitale
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4">
          Trasformiamo le tue idee in
        </h1>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-cyan-400 mb-8">
          soluzioni digitali
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-10">
          Consulenza, Digitalizzazione, Gemelli Digitali e Sviluppo di Applicazioni.
          <br />
          Partner tecnologico per la tua trasformazione digitale.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <a
            href="#servizi"
            className="px-8 py-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-all transform hover:scale-105"
          >
            Scopri i Servizi
          </a>
          <a
            href="#contatti"
            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition-all"
          >
            Contattaci
          </a>
        </div>

        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
          <StatsCounter value={9} suffix="+" label="Anni di Esperienza" />
          <StatsCounter value={48} suffix="+" label="Progetti Completati" />
          <StatsCounter value={96} suffix="%" label="Clienti Soddisfatti" />
        </div>
      </div>
    </section>
  );
};

// =============================================================================
// SERVICES SECTION
// =============================================================================

const ServicesSection = () => {
  const services = [
    {
      icon: Lightbulb,
      title: "Consulenza IT",
      description: "Analisi strategica e consulenza per ottimizzare i tuoi processi aziendali attraverso la tecnologia.",
      features: ["Analisi dei requisiti", "Strategia digitale", "Ottimizzazione processi"],
    },
    {
      icon: Box,
      title: "Gemelli Digitali",
      description: "Replica virtuale dei tuoi spazi fisici con tecnologia Matterport per visite immersive e gestione smart.",
      features: ["Scansione 3D professionale", "Tour virtuali interattivi", "Integrazione IoT"],
      badge: "Più Richiesto",
    },
    {
      icon: Monitor,
      title: "Digitalizzazione",
      description: "Trasformazione digitale completa: dalla dematerializzazione alla gestione documentale avanzata.",
      features: ["Automazione workflow", "Cloud solutions", "Data management"],
    },
    {
      icon: Smartphone,
      title: "Sviluppo App",
      description: "Creazione di applicazioni mobile e web personalizzate con tecnologie all'avanguardia.",
      features: ["App native e ibride", "Web application", "API integration"],
    },
    {
      icon: Globe,
      title: "Web App & Integrazioni",
      description: "Sviluppo di piattaforme web con integrazioni AI e gemelli digitali per soluzioni innovative.",
      features: ["Dashboard interattive", "Integrazione AI", "Smart Building"],
    },
    {
      icon: GraduationCap,
      title: "Formazione",
      description: "Corsi e workshop per il tuo team sulla digitalizzazione e le nuove tecnologie.",
      features: ["Training personalizzato", "Workshop tecnologici", "Supporto continuo"],
    },
  ];

  return (
    <section id="servizi" className="py-24 bg-[#0a0a0b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-medium mb-6">
            I Nostri Servizi
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Soluzioni per ogni esigenza digitale
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Offriamo un'ampia gamma di servizi per accompagnarti nella trasformazione digitale
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <div
              key={index}
              className={`relative bg-[#111214] border border-gray-800 rounded-xl p-6 hover:border-cyan-500/50 transition-all group ${
                service.badge ? "border-cyan-500/30" : ""
              }`}
            >
              {service.badge && (
                <span className="absolute -top-3 right-4 px-3 py-1 bg-cyan-500 text-white text-xs font-semibold rounded-full">
                  {service.badge}
                </span>
              )}
              <div className="w-14 h-14 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                <service.icon className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{service.title}</h3>
              <p className="text-gray-400 mb-4 text-sm leading-relaxed">
                {service.description}
              </p>
              <ul className="space-y-2">
                {service.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-gray-400 text-sm">
                    <Check className="w-4 h-4 text-cyan-400 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// =============================================================================
// CLIENTS SECTION
// =============================================================================

const ClientsSection = () => {
  const clients = [
    { icon: Landmark, name: "Enti Culturali" },
    { icon: Building2, name: "Amministrazioni Pubbliche" },
    { icon: Gem, name: "Siti Archeologici" },
    { icon: Building2, name: "Musei" },
    { icon: HomeIcon, name: "Borghi Storici" },
    { icon: Users, name: "Consorzi" },
    { icon: MapPin, name: "Distretti Turistici" },
    { icon: Palmtree, name: "Operatori Turistici" },
  ];

  return (
    <section className="py-24 bg-[#0d0e10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Per Chi Lavoriamo
          </h2>
          <p className="text-gray-400 text-lg">
            Trivor è punto di riferimento per diverse tipologie di organizzazioni
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {clients.map((client, index) => (
            <div
              key={index}
              className="bg-[#111214] border border-gray-800 rounded-xl p-6 text-center hover:border-amber-500/50 transition-all group"
            >
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-amber-500/20 transition-colors">
                <client.icon className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-white font-medium">{client.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// =============================================================================
// ABOUT SECTION
// =============================================================================

const AboutSection = () => {
  const features = [
    "Esperienza pluriennale",
    "Tecnologie all'avanguardia",
    "Supporto dedicato",
    "Soluzioni personalizzate",
  ];

  const locations = [
    { label: "Sede Legale", value: "Cagliari, Viale Trieste 93" },
    { label: "Milano", value: "" },
    { label: "Tortolì", value: "" },
    { label: "Urzulei", value: "" },
    { label: "Alghero", value: "" },
  ];

  return (
    <section id="chi-siamo" className="py-24 bg-[#0a0a0b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <span className="inline-block px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-medium mb-6">
              Chi Siamo
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
              Partner per la tua innovazione digitale
            </h2>
            <div className="space-y-4 text-gray-400 leading-relaxed">
              <p>
                <span className="text-cyan-400 font-semibold">Trivor</span> nasce per fornire servizi di elevata qualità nell'ambito della consulenza IT,
                della digitalizzazione e dello sviluppo di soluzioni tecnologiche innovative.
              </p>
              <p>
                Grazie alla nostra esperienza nei <span className="text-cyan-400 font-semibold">Gemelli Digitali</span> e nelle tecnologie immersive,
                offriamo soluzioni che trasformano spazi fisici in ambienti digitali interattivi,
                accessibili e misurabili.
              </p>
              <p>
                Oggi, con l'integrazione dell' <span className="text-cyan-400 font-semibold">Intelligenza Artificiale</span> nei nostri processi di sviluppo,
                siamo in grado di creare applicazioni e web app all'avanguardia, perfettamente integrate
                con i gemelli digitali.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center text-gray-300">
                  <div className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center mr-3">
                    <Check className="w-4 h-4 text-cyan-400" />
                  </div>
                  {feature}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111214] border border-gray-800 rounded-xl p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center">
                <MapPinIcon className="w-8 h-8 text-cyan-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white text-center mb-6">Le Nostre Sedi</h3>
            <ul className="space-y-4">
              {locations.map((loc, index) => (
                <li key={index} className="text-gray-300">
                  <span className="font-semibold text-white">{loc.label}:</span>{" "}
                  {loc.value}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

// =============================================================================
// PORTFOLIO SECTION (Dynamic from CMS)
// =============================================================================

const PortfolioSection = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects/featured`);
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      // Fallback to default projects if API fails
      setProjects([
        {
          id: '1',
          title: 'Smart Building Dashboard',
          client: 'Navigandosky',
          category: 'Smart Building',
          description: 'Piattaforma di gestione edifici smart con gemelli digitali Matterport, monitoraggio manutenzioni e domotica integrata.',
          image_url: null,
        },
        {
          id: '2',
          title: 'Tour Virtuali Sardegna',
          client: 'Regione Sardegna',
          category: 'Beni Culturali',
          description: 'Digitalizzazione di siti archeologici e grotte con tour virtuali 360° per la valorizzazione del patrimonio culturale sardo.',
          image_url: null,
        },
        {
          id: '3',
          title: 'CMS Tracciamento Progetti',
          client: 'Trivor SRL',
          category: 'Gestionale',
          description: 'Sistema di gestione progetti con tracking ore, crediti, sessioni di lavoro ed export dati per monitoraggio attività.',
          image_url: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Smart Building': Building2,
      'Beni Culturali': Gem,
      'Gestionale': Monitor,
    };
    return icons[category] || Globe;
  };

  const getCategoryGradient = (category) => {
    const gradients = {
      'Smart Building': 'from-cyan-500/20 to-teal-500/20',
      'Beni Culturali': 'from-teal-500/20 to-emerald-500/20',
      'Gestionale': 'from-emerald-500/20 to-cyan-500/20',
    };
    return gradients[category] || 'from-gray-500/20 to-gray-600/20';
  };

  return (
    <section id="progetti" className="py-24 bg-[#0d0e10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-medium mb-6">
            Portfolio
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            I Nostri Progetti
          </h2>
          <p className="text-gray-400 text-lg">
            Scopri alcune delle soluzioni che abbiamo realizzato per i nostri clienti
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => {
              const IconComponent = getCategoryIcon(project.category);
              return (
                <div
                  key={project.id}
                  className="bg-[#111214] border border-gray-800 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all group"
                >
                  <div 
                    className={`relative h-48 overflow-hidden bg-gradient-to-br ${getCategoryGradient(project.category)} flex items-center justify-center`}
                  >
                    {project.image_url ? (
                      <img 
                        src={project.image_url} 
                        alt={project.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`${project.image_url ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                      <IconComponent className="w-20 h-20 text-cyan-400 opacity-30 group-hover:opacity-50 transition-opacity" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111214] via-transparent to-transparent z-10" />
                    <span className="absolute bottom-4 left-4 px-3 py-1 bg-cyan-500/90 text-white text-xs font-semibold rounded-full z-20">
                      {project.category}
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
                    <p className="text-cyan-400 text-sm font-medium mb-3">{project.client}</p>
                    <p className="text-gray-400 text-sm leading-relaxed">{project.description}</p>
                    {project.link && (
                      <a 
                        href={project.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-4 text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Visita il progetto
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-center mt-12">
          <p className="text-gray-400 mb-4">Vuoi vedere tutti i nostri progetti o discutere della tua idea?</p>
          <a
            href="#contatti"
            className="inline-block px-8 py-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-all"
          >
            Parliamone Insieme
          </a>
        </div>
      </div>
    </section>
  );
};

// =============================================================================
// CONTACT SECTION
// =============================================================================

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      await axios.post(`${API}/contact`, formData);
      setSubmitted(true);
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      setError("Errore nell'invio del messaggio. Riprova più tardi.");
      console.error("Error submitting form:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      value: "trivorsrl@gmail.com",
      href: "mailto:trivorsrl@gmail.com",
    },
    {
      icon: Phone,
      title: "Telefono",
      value: "+39 393 92 55 552\n+39 320 808 38 39",
      href: "tel:+393939255552",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      value: "Scrivici su WhatsApp",
      href: "https://wa.me/393939255552",
    },
    {
      icon: MapPinIcon,
      title: "Sede Legale",
      value: "Viale Trieste 93, Cagliari",
      href: null,
    },
  ];

  return (
    <section id="contatti" className="py-24 bg-[#0a0a0b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-medium mb-6">
            Contatti
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Parliamo del tuo progetto
          </h2>
          <p className="text-gray-400 text-lg">
            Siamo pronti ad ascoltare le tue esigenze e sviluppare la soluzione perfetta per te.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            {contactInfo.map((info, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <info.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">{info.title}</h4>
                  {info.href ? (
                    <a
                      href={info.href}
                      className="text-gray-400 hover:text-cyan-400 transition-colors whitespace-pre-line"
                      target={info.href.startsWith("http") ? "_blank" : undefined}
                      rel={info.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      {info.value}
                    </a>
                  ) : (
                    <p className="text-gray-400">{info.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#111214] border border-gray-800 rounded-xl p-8">
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Messaggio Inviato!</h3>
                <p className="text-gray-400">Ti risponderemo il prima possibile.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Nome e Cognome *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Telefono
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Oggetto *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Messaggio *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-colors resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Invio in corso..." : "Invia Messaggio"}
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
  const quickLinks = [
    { name: "Home", href: "#home" },
    { name: "Servizi", href: "#servizi" },
    { name: "Chi Siamo", href: "#chi-siamo" },
    { name: "Progetti", href: "#progetti" },
    { name: "Contatti", href: "#contatti" },
  ];

  const services = [
    "Consulenza IT",
    "Gemelli Digitali",
    "Digitalizzazione",
    "Sviluppo App",
  ];

  const reserved = [
    { name: "🔐 Accedi all'Area Riservata", href: "/trivor/admin" },
    { name: "Portfolio / Catalogo", href: "#progetti" },
    { name: "Smart Building Dashboard", href: "https://building-brain.preview.emergentagent.com/" },
  ];

  return (
    <footer className="bg-[#0d0e10] border-t border-gray-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div>
            <a href="#home" className="flex items-center mb-6">
              <img 
                src="https://customer-assets.emergentagent.com/job_trivor-agent/artifacts/5wu3c3nj_logo%20trivor%20heritage%20digitale.png" 
                alt="Trivor - Heritage Digitale" 
                className="h-12 w-auto"
                style={{ transform: 'scale(1.4)', transformOrigin: 'left center' }}
              />
            </a>
            <p className="text-gray-400 text-sm leading-relaxed">
              Consulenza, Digitalizzazione, Gemelli Digitali e Sviluppo Applicazioni per la tua trasformazione digitale.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Link Rapidi</h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Servizi</h4>
            <ul className="space-y-3">
              {services.map((service, index) => (
                <li key={index} className="text-gray-400 text-sm">
                  {service}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Area Riservata</h4>
            <ul className="space-y-3">
              {reserved.map((item, index) => (
                <li key={index}>
                  <a 
                    href={item.href} 
                    className="text-gray-400 hover:text-cyan-400 transition-colors text-sm"
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Trivor SRL. Tutti i diritti riservati.
          </p>
        </div>
      </div>
    </footer>
  );
};

// =============================================================================
// SCROLL TO TOP & WHATSAPP BUTTONS
// =============================================================================

const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-24 right-6 w-12 h-12 bg-cyan-500/80 hover:bg-cyan-500 text-white rounded-full flex items-center justify-center shadow-lg transition-all z-40 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <ChevronUp className="w-6 h-6" />
    </button>
  );
};

const WhatsAppButton = () => {
  return (
    <a
      href="https://wa.me/393939255552?text=Ciao!%20Vorrei%20maggiori%20informazioni%20sui%20vostri%20servizi"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all z-50 hover:scale-110"
    >
      <MessageCircle className="w-7 h-7" fill="currentColor" />
    </a>
  );
};

// =============================================================================
// ADMIN - LOGIN PAGE
// =============================================================================

const AdminLogin = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const success = await onLogin(username, password);
    if (!success) {
      setError('Credenziali non valide');
    }
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
          <p className="text-gray-400">Accedi per gestire i contenuti del sito</p>
        </div>

        <div className="bg-[#111214] border border-gray-800 rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-colors"
                placeholder="admin"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-colors pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Lock size={18} />
                  <span>Accedi</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <a href="/trivor" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">
            ← Torna al sito
          </a>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// ADMIN - DASHBOARD
// =============================================================================

const AdminDashboard = ({ onLogout, getAuthHeader }) => {
  const [activeTab, setActiveTab] = useState('projects');
  const [stats, setStats] = useState({ projects: 0, messages: 0, unread_messages: 0 });
  const [projects, setProjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, projectsRes, messagesRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers: getAuthHeader() }),
        axios.get(`${API}/projects`),
        axios.get(`${API}/admin/messages`, { headers: getAuthHeader() })
      ]);
      setStats(statsRes.data);
      setProjects(projectsRes.data);
      setMessages(messagesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    try {
      await axios.post(`${API}/admin/seed`, {}, { headers: getAuthHeader() });
      fetchData();
    } catch (error) {
      console.error('Error seeding data:', error);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo progetto?')) return;
    try {
      await axios.delete(`${API}/admin/projects/${id}`, { headers: getAuthHeader() });
      fetchData();
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo messaggio?')) return;
    try {
      await axios.delete(`${API}/admin/messages/${id}`, { headers: getAuthHeader() });
      fetchData();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await axios.put(`${API}/admin/messages/${id}/read`, {}, { headers: getAuthHeader() });
      fetchData();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Admin Header */}
      <header className="bg-[#111214] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <a href="/trivor" className="flex items-center">
                <img 
                  src="https://customer-assets.emergentagent.com/job_trivor-agent/artifacts/5wu3c3nj_logo%20trivor%20heritage%20digitale.png" 
                  alt="Trivor" 
                  className="h-10 w-auto"
                />
              </a>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400">Area Riservata</span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut size={18} />
              <span>Esci</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#111214] border border-gray-800 rounded-xl p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Progetti</p>
                <p className="text-2xl font-bold text-white">{stats.projects}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#111214] border border-gray-800 rounded-xl p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Inbox className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Messaggi</p>
                <p className="text-2xl font-bold text-white">{stats.messages}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#111214] border border-gray-800 rounded-xl p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Non letti</p>
                <p className="text-2xl font-bold text-white">{stats.unread_messages}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'projects'
                ? 'bg-cyan-500 text-white'
                : 'bg-[#111214] text-gray-400 hover:text-white'
            }`}
          >
            <FolderOpen className="w-4 h-4 inline mr-2" />
            Progetti
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'messages'
                ? 'bg-cyan-500 text-white'
                : 'bg-[#111214] text-gray-400 hover:text-white'
            }`}
          >
            <Inbox className="w-4 h-4 inline mr-2" />
            Messaggi
            {stats.unread_messages > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                {stats.unread_messages}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'projects' && (
              <div className="bg-[#111214] border border-gray-800 rounded-xl">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-white">Gestione Progetti</h2>
                  <div className="flex space-x-2">
                    {projects.length === 0 && (
                      <button
                        onClick={handleSeedData}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                      >
                        <RefreshCw size={16} />
                        <span>Popola DB</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingProject(null);
                        setShowProjectForm(true);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                    >
                      <Plus size={16} />
                      <span>Nuovo Progetto</span>
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-gray-800">
                  {projects.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      Nessun progetto presente. Clicca "Popola DB" per aggiungere i progetti iniziali.
                    </div>
                  ) : (
                    projects.map((project) => (
                      <div key={project.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                            {project.image_url ? (
                              <img src={project.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                            ) : (
                              <Image className="w-6 h-6 text-cyan-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-white font-medium">{project.title}</h3>
                            <p className="text-gray-400 text-sm">{project.client} • {project.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            project.featured ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                          }`}>
                            {project.featured ? 'In evidenza' : 'Normale'}
                          </span>
                          <button
                            onClick={() => {
                              setEditingProject(project);
                              setShowProjectForm(true);
                            }}
                            className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'messages' && (
              <div className="bg-[#111214] border border-gray-800 rounded-xl">
                <div className="p-4 border-b border-gray-800">
                  <h2 className="text-lg font-semibold text-white">Messaggi Ricevuti</h2>
                </div>
                <div className="divide-y divide-gray-800">
                  {messages.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      Nessun messaggio ricevuto.
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`p-4 ${!msg.read ? 'bg-cyan-500/5' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-white font-medium flex items-center">
                              {msg.name}
                              {!msg.read && (
                                <span className="ml-2 w-2 h-2 bg-cyan-400 rounded-full"></span>
                              )}
                            </h3>
                            <p className="text-gray-400 text-sm">{msg.email}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500 text-xs">
                              {new Date(msg.created_at).toLocaleDateString('it-IT')}
                            </span>
                            {!msg.read && (
                              <button
                                onClick={() => handleMarkRead(msg.id)}
                                className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                                title="Segna come letto"
                              >
                                <Check size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <p className="text-cyan-400 text-sm font-medium mb-1">{msg.subject}</p>
                        <p className="text-gray-300 text-sm">{msg.message}</p>
                        {msg.phone && (
                          <p className="text-gray-500 text-xs mt-2">Tel: {msg.phone}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Project Form Modal */}
        {showProjectForm && (
          <ProjectFormModal
            project={editingProject}
            onClose={() => {
              setShowProjectForm(false);
              setEditingProject(null);
            }}
            onSave={() => {
              setShowProjectForm(false);
              setEditingProject(null);
              fetchData();
            }}
            getAuthHeader={getAuthHeader}
          />
        )}
      </div>
    </div>
  );
};

// =============================================================================
// PROJECT FORM MODAL
// =============================================================================

const ProjectFormModal = ({ project, onClose, onSave, getAuthHeader }) => {
  const [formData, setFormData] = useState({
    title: project?.title || '',
    client: project?.client || '',
    category: project?.category || '',
    description: project?.description || '',
    image_url: project?.image_url || '',
    link: project?.link || '',
    featured: project?.featured || false,
    order: project?.order || 0,
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (project) {
        await axios.put(`${API}/admin/projects/${project.id}`, formData, { headers: getAuthHeader() });
      } else {
        await axios.post(`${API}/admin/projects`, formData, { headers: getAuthHeader() });
      }
      onSave();
    } catch (error) {
      console.error('Error saving project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File troppo grande. Massimo 5MB.');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Tipo file non supportato. Usa: JPG, PNG, GIF, WEBP');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await axios.post(`${API}/admin/upload`, formDataUpload, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'multipart/form-data',
        },
      });

      // Construct full URL for the uploaded image
      const imageUrl = `${BACKEND_URL}${response.data.url}`;
      setFormData({ ...formData, image_url: imageUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError('Errore durante il caricamento. Riprova.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111214] border border-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">
            {project ? 'Modifica Progetto' : 'Nuovo Progetto'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">Titolo *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">Cliente *</label>
              <input
                type="text"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                required
                className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">Categoria *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="">Seleziona...</option>
                <option value="Smart Building">Smart Building</option>
                <option value="Beni Culturali">Beni Culturali</option>
                <option value="Gestionale">Gestionale</option>
                <option value="Web App">Web App</option>
                <option value="Mobile App">Mobile App</option>
              </select>
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">Ordine</label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-white text-sm font-medium mb-2">Descrizione *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
              className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>
          
          {/* Image Upload Section */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">Immagine Progetto</label>
            <div className="space-y-3">
              {/* Preview */}
              {formData.image_url && (
                <div className="relative w-full h-40 bg-gray-800 rounded-lg overflow-hidden">
                  <img 
                    src={formData.image_url} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              
              {/* Upload Button */}
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center space-x-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Caricamento...</span>
                    </>
                  ) : (
                    <>
                      <Image size={18} />
                      <span>📤 Carica Immagine</span>
                    </>
                  )}
                </button>
                <span className="text-gray-500 text-xs">JPG, PNG, GIF, WEBP (max 5MB)</span>
              </div>
              
              {/* Error Message */}
              {uploadError && (
                <p className="text-red-400 text-sm">{uploadError}</p>
              )}
              
              {/* Or URL Input */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-2 bg-[#111214] text-gray-500 text-xs">oppure inserisci URL</span>
                </div>
              </div>
              
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-white text-sm font-medium mb-2">Link Progetto</label>
            <input
              type="url"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-3 bg-[#0a0a0b] border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="featured"
              checked={formData.featured}
              onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              className="w-5 h-5 rounded border-gray-700 bg-[#0a0a0b] text-cyan-500 focus:ring-cyan-500"
            />
            <label htmlFor="featured" className="text-white">Mostra in evidenza nella homepage</label>
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// ADMIN PAGE WRAPPER
// =============================================================================

const AdminPage = () => {
  const { isAuthenticated, isLoading, login, logout, getAuthHeader } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={login} />;
  }

  return <AdminDashboard onLogout={logout} getAuthHeader={getAuthHeader} />;
};

// =============================================================================
// HOME PAGE
// =============================================================================

const Home = () => {
  return (
    <div className="bg-[#0a0a0b] min-h-screen">
      <Navbar />
      <HeroSection />
      <ServicesSection />
      <ClientsSection />
      <AboutSection />
      <PortfolioSection />
      <ContactSection />
      <Footer />
      <ScrollToTop />
      <WhatsAppButton />
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
