import { useEffect, useState, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
  CircleDot,
  Handshake,
  Mail,
  Phone,
  MessageCircle,
  MapPinIcon,
  ChevronUp,
  Check,
  Menu,
  X,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

// Stats Counter Component
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

// Navbar Component
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      
      // Update active section based on scroll position
      const sections = ["home", "servizi", "chi-siamo", "progetti", "contatti"];
      for (const section of sections.reverse()) {
        const element = document.getElementById(section);
        if (element && window.scrollY >= element.offsetTop - 100) {
          setActiveSection(section);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { name: "Home", href: "#home", id: "home" },
    { name: "Servizi", href: "#servizi", id: "servizi" },
    { name: "Chi Siamo", href: "#chi-siamo", id: "chi-siamo" },
    { name: "Progetti", href: "#progetti", id: "progetti" },
    { name: "Contatti", href: "#contatti", id: "contatti" },
  ];

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "bg-[#0a0a0b]/95 backdrop-blur-md shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          <a href="#home" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-2xl font-bold text-white">TRIVOR</span>
          </a>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  activeSection === item.id
                    ? "text-white border-b-2 border-cyan-400 pb-1"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                {item.name}
              </a>
            ))}
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
          </div>
        )}
      </div>
    </nav>
  );
};

// Hero Section
const HeroSection = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden"
    >
      {/* Background with gradient */}
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
          <StatsCounter value={9} suffix="+" label="Anni di Esperienza" />
          <StatsCounter value={48} suffix="+" label="Progetti Completati" />
          <StatsCounter value={96} suffix="%" label="Clienti Soddisfatti" />
        </div>
      </div>
    </section>
  );
};

// Services Section
const ServicesSection = () => {
  const services = [
    {
      icon: Lightbulb,
      title: "Consulenza IT",
      description: "Analisi strategica e consulenza per ottimizzare i tuoi processi aziendali attraverso la tecnologia.",
      features: ["Analisi dei requisiti", "Strategia digitale", "Ottimizzazione processi"],
      color: "cyan",
    },
    {
      icon: Box,
      title: "Gemelli Digitali",
      description: "Replica virtuale dei tuoi spazi fisici con tecnologia Matterport per visite immersive e gestione smart.",
      features: ["Scansione 3D professionale", "Tour virtuali interattivi", "Integrazione IoT"],
      color: "cyan",
      badge: "Più Richiesto",
    },
    {
      icon: Monitor,
      title: "Digitalizzazione",
      description: "Trasformazione digitale completa: dalla dematerializzazione alla gestione documentale avanzata.",
      features: ["Automazione workflow", "Cloud solutions", "Data management"],
      color: "cyan",
    },
    {
      icon: Smartphone,
      title: "Sviluppo App",
      description: "Creazione di applicazioni mobile e web personalizzate con tecnologie all'avanguardia.",
      features: ["App native e ibride", "Web application", "API integration"],
      color: "cyan",
    },
    {
      icon: Globe,
      title: "Web App & Integrazioni",
      description: "Sviluppo di piattaforme web con integrazioni AI e gemelli digitali per soluzioni innovative.",
      features: ["Dashboard interattive", "Integrazione AI", "Smart Building"],
      color: "cyan",
    },
    {
      icon: GraduationCap,
      title: "Formazione",
      description: "Corsi e workshop per il tuo team sulla digitalizzazione e le nuove tecnologie.",
      features: ["Training personalizzato", "Workshop tecnologici", "Supporto continuo"],
      color: "cyan",
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

// Clients Section
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

// About Section
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

// Portfolio Section
const PortfolioSection = () => {
  const projects = [
    {
      icon: Building2,
      gradient: "from-cyan-500/20 to-teal-500/20",
      category: "Smart Building",
      title: "Smart Building Dashboard",
      client: "Navigandosky",
      description: "Piattaforma di gestione edifici smart con gemelli digitali Matterport, monitoraggio manutenzioni e domotica integrata.",
    },
    {
      icon: Gem,
      gradient: "from-teal-500/20 to-emerald-500/20",
      category: "Beni Culturali",
      title: "Tour Virtuali Sardegna",
      client: "Regione Sardegna",
      description: "Digitalizzazione di siti archeologici e grotte con tour virtuali 360° per la valorizzazione del patrimonio culturale sardo.",
    },
    {
      icon: Monitor,
      gradient: "from-emerald-500/20 to-cyan-500/20",
      category: "Gestionale",
      title: "CMS Tracciamento Progetti",
      client: "Trivor SRL",
      description: "Sistema di gestione progetti con tracking ore, crediti, sessioni di lavoro ed export dati per monitoraggio attività.",
    },
  ];

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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <div
              key={index}
              className="bg-[#111214] border border-gray-800 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all group"
            >
              <div 
                className={`relative h-48 overflow-hidden bg-gradient-to-br ${project.gradient} flex items-center justify-center`}
              >
                <project.icon className="w-20 h-20 text-cyan-400/50 group-hover:text-cyan-400/70 transition-colors" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111214] via-transparent to-transparent" />
                <span className="absolute bottom-4 left-4 px-3 py-1 bg-cyan-500/90 text-white text-xs font-semibold rounded-full">
                  {project.category}
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
                <p className="text-cyan-400 text-sm font-medium mb-3">{project.client}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{project.description}</p>
              </div>
            </div>
          ))}
        </div>

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

// Contact Section
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Here you would normally send the form data to your backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubmitted(true);
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (error) {
      console.error("Error submitting form:", error);
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
          {/* Contact Info */}
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

          {/* Contact Form */}
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

// Footer Component
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
    { name: "🔐 Accedi all'Area Riservata", href: "#" },
    { name: "Portfolio / Catalogo", href: "#progetti" },
    { name: "Smart Building Dashboard", href: "#" },
  ];

  return (
    <footer className="bg-[#0d0e10] border-t border-gray-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <a href="#home" className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="text-2xl font-bold text-white">TRIVOR</span>
            </a>
            <p className="text-gray-400 text-sm leading-relaxed">
              Consulenza, Digitalizzazione, Gemelli Digitali e Sviluppo Applicazioni per la tua trasformazione digitale.
            </p>
          </div>

          {/* Quick Links */}
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

          {/* Services */}
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

          {/* Reserved Area */}
          <div>
            <h4 className="text-white font-semibold mb-4">Area Riservata</h4>
            <ul className="space-y-3">
              {reserved.map((item, index) => (
                <li key={index}>
                  <a href={item.href} className="text-gray-400 hover:text-cyan-400 transition-colors text-sm">
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

// Scroll to Top Button
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

// WhatsApp Button
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

// Main Home Component
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

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/trivor" element={<Home />} />
          <Route path="/trivor/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
