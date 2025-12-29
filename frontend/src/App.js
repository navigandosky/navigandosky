import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, Play, Pause, Volume2, VolumeX, ChevronRight, 
  Menu, X, MapPin, Home, Settings, Layers, AudioLines,
  Plus, Edit, Trash2, Upload, Languages, RefreshCw
} from "lucide-react";
import axios from "axios";
import { Toaster, toast } from "sonner";
import "@/App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Language Context
const LanguageContext = createContext();

const useLanguage = () => useContext(LanguageContext);

const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'it');
  
  const changeLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Logos
const LOGO_SPOKE = "https://customer-assets.emergentagent.com/job_ghivine-spoke/artifacts/cbw6ifjt_Logo%20firma%20Spoke2%20completo.png";
const LOGO_UNISS = "https://customer-assets.emergentagent.com/job_ghivine-spoke/artifacts/mfjfnz1n_Logo%20firma%20Spoke%202%20Uniss.png";

// Language Selector Component
const LanguageSelector = () => {
  const { lang, changeLang } = useLanguage();
  const languages = [
    { code: 'it', name: 'IT' },
    { code: 'en', name: 'EN' },
    { code: 'fr', name: 'FR' },
    { code: 'de', name: 'DE' }
  ];

  return (
    <div className="flex items-center gap-1 bg-black/30 backdrop-blur-md rounded-full p-1 border border-white/10">
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => changeLang(l.code)}
          data-testid={`lang-${l.code}`}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
            lang === l.code 
              ? 'text-white bg-cyan-600/30 border border-cyan-500/50' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {l.name}
        </button>
      ))}
    </div>
  );
};

// Navbar Component
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { lang } = useLanguage();

  const navItems = {
    it: { home: 'Home', spaces: 'Spazi', project: 'Progetto', admin: 'Admin' },
    en: { home: 'Home', spaces: 'Spaces', project: 'Project', admin: 'Admin' },
    fr: { home: 'Accueil', spaces: 'Espaces', project: 'Projet', admin: 'Admin' },
    de: { home: 'Home', spaces: 'Räume', project: 'Projekt', admin: 'Admin' }
  };

  const t = navItems[lang] || navItems.it;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3" data-testid="nav-logo">
            <div className="h-14 w-auto">
              <img src={LOGO_SPOKE} alt="Spoke Ghivine" className="h-full w-auto object-contain" />
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-gray-300 hover:text-cyan-400 transition-colors font-medium" data-testid="nav-home">{t.home}</Link>
            <Link to="/spaces" className="text-gray-300 hover:text-cyan-400 transition-colors font-medium" data-testid="nav-spaces">{t.spaces}</Link>
            <Link to="/project" className="text-gray-300 hover:text-cyan-400 transition-colors font-medium" data-testid="nav-project">{t.project}</Link>
            <Link to="/admin" className="text-gray-300 hover:text-cyan-400 transition-colors font-medium" data-testid="nav-admin">{t.admin}</Link>
            <LanguageSelector />
          </div>

          {/* Mobile menu button */}
          <button 
            className="md:hidden text-white"
            onClick={() => setIsOpen(!isOpen)}
            data-testid="nav-mobile-toggle"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-panel border-t border-white/10"
          >
            <div className="px-4 py-4 space-y-3">
              <Link to="/" className="block text-gray-300 hover:text-cyan-400 py-2" onClick={() => setIsOpen(false)}>{t.home}</Link>
              <Link to="/spaces" className="block text-gray-300 hover:text-cyan-400 py-2" onClick={() => setIsOpen(false)}>{t.spaces}</Link>
              <Link to="/project" className="block text-gray-300 hover:text-cyan-400 py-2" onClick={() => setIsOpen(false)}>{t.project}</Link>
              <Link to="/admin" className="block text-gray-300 hover:text-cyan-400 py-2" onClick={() => setIsOpen(false)}>{t.admin}</Link>
              <div className="pt-2">
                <LanguageSelector />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// Footer Component
const Footer = () => {
  return (
    <footer className="bg-black/50 border-t border-white/10 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start">
          <img src={LOGO_SPOKE} alt="Spoke Ghivine" className="h-20 w-auto object-contain" />
          <p className="text-gray-500 text-xs mt-4">Realizzato da TRIVOR SRL © per Coop. Ghivine - Tutti i diritti riservati</p>
        </div>
      </div>
    </footer>
  );
};

// Home Page
const HomePage = () => {
  const { lang } = useLanguage();
  const [spaces, setSpaces] = useState([]);

  const content = {
    it: {
      hero: "Il Gemello Digitale al Servizio del Turismo e della Cultura",
      subtitle: "Esplora il patrimonio culturale attraverso tour virtuali immersivi e tecnologia Matterport",
      cta: "Esplora i Tour Virtuali",
      discover: "Scopri il Progetto"
    },
    en: {
      hero: "Digital Twin for Tourism and Culture",
      subtitle: "Explore cultural heritage through immersive virtual tours and Matterport technology",
      cta: "Explore Virtual Tours",
      discover: "Discover the Project"
    },
    fr: {
      hero: "Le Jumeau Numérique au Service du Tourisme et de la Culture",
      subtitle: "Explorez le patrimoine culturel à travers des visites virtuelles immersives",
      cta: "Explorer les Visites Virtuelles",
      discover: "Découvrir le Projet"
    },
    de: {
      hero: "Der Digitale Zwilling im Dienste des Tourismus und der Kultur",
      subtitle: "Erkunden Sie das kulturelle Erbe durch immersive virtuelle Touren",
      cta: "Virtuelle Touren Erkunden",
      discover: "Projekt Entdecken"
    }
  };

  const t = content[lang] || content.it;

  useEffect(() => {
    axios.get(`${API}/spaces`)
      .then(res => setSpaces(res.data.filter(s => s.is_active)))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(https://customer-assets.emergentagent.com/job_ghivine-spoke/artifacts/f50qoo8w_grotta%20bue%20marino_ingresso.jpg)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[#020204]" />
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight" data-testid="hero-title">
              <span className="text-gradient">{t.hero}</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
              {t.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/spaces"
                data-testid="cta-explore"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full font-semibold transition-all duration-300 glow-cyan hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
              >
                {t.cta}
                <ChevronRight size={20} />
              </Link>
              <Link 
                to="/project"
                data-testid="cta-discover"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-full font-semibold transition-all duration-300 border border-white/20"
              >
                {t.discover}
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <div className="w-1 h-3 bg-cyan-400 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Spaces Preview */}
      {spaces.length > 0 && (
        <section className="py-24 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl font-bold text-center mb-16"
            >
              {lang === 'it' ? 'Spazi Virtuali' : lang === 'en' ? 'Virtual Spaces' : lang === 'fr' ? 'Espaces Virtuels' : 'Virtuelle Räume'}
            </motion.h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {spaces.map((space, index) => (
                <motion.div
                  key={space.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link 
                    to={`/space/${space.id}`}
                    data-testid={`space-card-${space.id}`}
                    className="group block rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-all duration-500 card-hover"
                  >
                    <div className="aspect-video relative overflow-hidden">
                      {space.images[0] ? (
                        <img 
                          src={space.images[0]} 
                          alt={space.name[lang]} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-cyan-900/30 to-blue-900/30 flex items-center justify-center">
                          <Layers size={48} className="text-cyan-500/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                        {space.name[lang] || space.name.it}
                      </h3>
                      <p className="text-gray-400 text-sm line-clamp-2">
                        {space.description[lang] || space.description.it}
                      </p>
                      {space.matterport_model_id && (
                        <div className="mt-4 flex items-center gap-2 text-cyan-400 text-sm">
                          <Play size={16} />
                          <span>{lang === 'it' ? 'Tour Virtuale Disponibile' : 'Virtual Tour Available'}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
};

// Spaces List Page
const SpacesPage = () => {
  const { lang } = useLanguage();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/spaces`)
      .then(res => {
        setSpaces(res.data.filter(s => s.is_active));
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const title = {
    it: 'Spazi Virtuali',
    en: 'Virtual Spaces',
    fr: 'Espaces Virtuels',
    de: 'Virtuelle Räume'
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12" data-testid="spaces-title">
          {title[lang] || title.it}
        </h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="animate-spin text-cyan-500" size={32} />
          </div>
        ) : spaces.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            {lang === 'it' ? 'Nessuno spazio disponibile' : 'No spaces available'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {spaces.map((space) => (
              <Link 
                key={space.id}
                to={`/space/${space.id}`}
                data-testid={`space-item-${space.id}`}
                className="group rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-all duration-500"
              >
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/2 aspect-video md:aspect-auto relative overflow-hidden">
                    {space.images[0] ? (
                      <img 
                        src={space.images[0]} 
                        alt={space.name[lang]} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full min-h-48 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 flex items-center justify-center">
                        <Layers size={64} className="text-cyan-500/50" />
                      </div>
                    )}
                  </div>
                  <div className="md:w-1/2 p-6 flex flex-col justify-center">
                    <h2 className="text-2xl font-semibold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                      {space.name[lang] || space.name.it}
                    </h2>
                    <p className="text-gray-400 mb-4">
                      {space.description[lang] || space.description.it}
                    </p>
                    {space.matterport_model_id && (
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Play size={20} />
                        <span>{lang === 'it' ? 'Avvia Tour Virtuale' : 'Start Virtual Tour'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Single Space Page with Matterport
const SpacePage = () => {
  const { id } = useParams();
  const { lang } = useLanguage();
  const [space, setSpace] = useState(null);
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [spaceRes, poisRes] = await Promise.all([
          axios.get(`${API}/spaces/${id}`),
          axios.get(`${API}/pois?space_id=${id}`)
        ]);
        setSpace(spaceRes.data);
        setPois(poisRes.data.filter(p => p.is_active));
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const playAudio = (poi) => {
    const audioUrl = poi.audio_files[lang] || poi.audio_files.it;
    if (audioUrl) {
      if (currentAudio) {
        currentAudio.pause();
      }
      const audio = new Audio(`${BACKEND_URL}${audioUrl}`);
      audio.play();
      setCurrentAudio(audio);
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
    }
  };

  const toggleAudio = () => {
    if (currentAudio) {
      if (isPlaying) {
        currentAudio.pause();
      } else {
        currentAudio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="animate-spin text-cyan-500" size={48} />
      </div>
    );
  }

  if (!space) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Space not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      {/* Matterport Viewer or Placeholder */}
      <div className="relative h-[45vh] bg-black">
        {space.external_tour_url ? (
          <iframe
            src={space.external_tour_url}
            className="w-full h-full"
            allowFullScreen
            data-testid="external-tour-viewer"
          />
        ) : space.matterport_model_id ? (
          <iframe
            src={`https://my.matterport.com/show/?m=${space.matterport_model_id}&play=1&qs=1`}
            className="w-full h-full"
            allowFullScreen
            data-testid="matterport-viewer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-900/20 to-blue-900/20">
            <div className="text-center">
              <Layers size={80} className="text-cyan-500/50 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">
                {lang === 'it' ? 'Tour virtuale in arrivo' : 'Virtual tour coming soon'}
              </p>
            </div>
          </div>
        )}

        {/* Sidebar Toggle */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="absolute top-4 right-4 z-20 p-3 glass-overlay rounded-full"
          data-testid="sidebar-toggle"
        >
          <MapPin size={20} className="text-white" />
        </button>

        {/* POI Sidebar */}
        <AnimatePresence>
          {showSidebar && pois.length > 0 && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute top-4 right-16 bottom-4 w-80 glass-overlay rounded-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <AudioLines size={20} className="text-cyan-400" />
                  {lang === 'it' ? 'Punti di Interesse' : 'Points of Interest'}
                </h3>
              </div>
              <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100%-60px)]">
                {pois.map((poi) => (
                  <div 
                    key={poi.id}
                    className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-cyan-500/50 transition-all"
                    data-testid={`poi-${poi.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-block px-2 py-0.5 bg-cyan-600/30 text-cyan-400 text-xs rounded-full mb-2">
                          POI #{poi.poi_number}
                        </span>
                        <h4 className="text-white font-medium">
                          {poi.name[lang] || poi.name.it}
                        </h4>
                        <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                          {poi.description[lang] || poi.description.it}
                        </p>
                      </div>
                      {(poi.audio_files[lang] || poi.audio_files.it) && (
                        <button
                          onClick={() => playAudio(poi)}
                          className="p-2 bg-cyan-600/30 hover:bg-cyan-600/50 rounded-full transition-colors"
                          data-testid={`play-poi-${poi.id}`}
                        >
                          <Volume2 size={18} className="text-cyan-400" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Audio Controls */}
        {currentAudio && (
          <div className="absolute bottom-4 left-4 glass-overlay rounded-full px-4 py-2 flex items-center gap-3">
            <button onClick={toggleAudio} data-testid="audio-toggle">
              {isPlaying ? <Pause size={20} className="text-cyan-400" /> : <Play size={20} className="text-cyan-400" />}
            </button>
            <span className="text-white text-sm">
              {isPlaying ? (lang === 'it' ? 'In riproduzione...' : 'Playing...') : (lang === 'it' ? 'In pausa' : 'Paused')}
            </span>
          </div>
        )}
      </div>

      {/* Space Info */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="space-title">
            {space.name[lang] || space.name.it}
          </h1>
          <p className="text-gray-300 text-lg mb-8">
            {space.description[lang] || space.description.it}
          </p>

          {/* Image Gallery */}
          {space.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {space.images.map((img, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden">
                  <img src={img} alt="" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

// Project Page
const ProjectPage = () => {
  const { lang } = useLanguage();

  const content = {
    it: {
      title: 'Il Progetto e.INS',
      subtitle: 'Ecosystem Of Innovation For Next Generation Sardinia',
      description: 'Il progetto e.INS rappresenta un\'iniziativa innovativa per valorizzare il patrimonio culturale e turistico della Sardegna attraverso tecnologie digitali avanzate. Nell\'ambito dello SPOKE 2, questo intervento si concentra sulla creazione di gemelli digitali (digital twins) di siti di interesse culturale e naturalistico.',
      objectives: 'Obiettivi del Progetto',
      objectivesList: [
        'Digitalizzare il patrimonio culturale e naturalistico',
        'Promuovere il turismo culturale attraverso l\'innovazione',
        'Rendere accessibili i siti a persone con mobilità ridotta',
        'Conservare digitalmente il patrimonio per le future generazioni',
        'Favorire la ricerca e lo studio attraverso modelli 3D accurati'
      ]
    },
    en: {
      title: 'The e.INS Project',
      subtitle: 'Ecosystem Of Innovation For Next Generation Sardinia',
      description: 'The e.INS project represents an innovative initiative to enhance the cultural and tourist heritage of Sardinia through advanced digital technologies. Within SPOKE 2, this intervention focuses on creating digital twins of sites of cultural and naturalistic interest.',
      objectives: 'Project Objectives',
      objectivesList: [
        'Digitize cultural and natural heritage',
        'Promote cultural tourism through innovation',
        'Make sites accessible to people with reduced mobility',
        'Digitally preserve heritage for future generations',
        'Facilitate research through accurate 3D models'
      ]
    },
    fr: {
      title: 'Le Projet e.INS',
      subtitle: 'Ecosystem Of Innovation For Next Generation Sardinia',
      description: 'Le projet e.INS représente une initiative innovante pour valoriser le patrimoine culturel et touristique de la Sardaigne grâce aux technologies numériques avancées.',
      objectives: 'Objectifs du Projet',
      objectivesList: [
        'Numériser le patrimoine culturel et naturel',
        'Promouvoir le tourisme culturel par l\'innovation',
        'Rendre les sites accessibles aux personnes à mobilité réduite',
        'Préserver numériquement le patrimoine pour les générations futures',
        'Faciliter la recherche grâce à des modèles 3D précis'
      ]
    },
    de: {
      title: 'Das e.INS Projekt',
      subtitle: 'Ecosystem Of Innovation For Next Generation Sardinia',
      description: 'Das e.INS-Projekt stellt eine innovative Initiative zur Aufwertung des kulturellen und touristischen Erbes Sardiniens durch fortschrittliche digitale Technologien dar.',
      objectives: 'Projektziele',
      objectivesList: [
        'Digitalisierung des kulturellen und natürlichen Erbes',
        'Förderung des Kulturtourismus durch Innovation',
        'Zugänglichkeit der Stätten für Menschen mit eingeschränkter Mobilität',
        'Digitale Bewahrung des Erbes für zukünftige Generationen',
        'Förderung der Forschung durch genaue 3D-Modelle'
      ]
    }
  };

  const t = content[lang] || content.it;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold mb-4" data-testid="project-title">{t.title}</h1>
          <p className="text-cyan-400 text-xl mb-8">{t.subtitle}</p>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 text-lg leading-relaxed mb-12">
              {t.description}
            </p>

            <h2 className="text-2xl font-semibold text-white mb-6">{t.objectives}</h2>
            <ul className="space-y-4">
              {t.objectivesList.map((obj, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1.5 w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0" />
                  <span className="text-gray-300">{obj}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Partner Logos */}
          <div className="mt-16 pt-8 border-t border-white/10">
            <div className="flex flex-wrap justify-center items-center gap-8">
              <img src={LOGO_SPOKE} alt="Spoke 2" className="h-20 w-auto object-contain" />
              <img src={LOGO_UNISS} alt="Partners" className="h-14 w-auto object-contain" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Admin Page
const AdminPage = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('spaces');
  const [spaces, setSpaces] = useState([]);
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSpace, setEditingSpace] = useState(null);
  const [editingPoi, setEditingPoi] = useState(null);

  const fetchData = async () => {
    try {
      const [spacesRes, poisRes] = await Promise.all([
        axios.get(`${API}/spaces`),
        axios.get(`${API}/pois`)
      ]);
      setSpaces(spacesRes.data);
      setPois(poisRes.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Seed initial data if empty
    axios.post(`${API}/seed`).catch(() => {});
  }, []);

  const deleteSpace = async (id) => {
    if (window.confirm(lang === 'it' ? 'Sei sicuro di voler eliminare questo spazio?' : 'Are you sure you want to delete this space?')) {
      try {
        await axios.delete(`${API}/spaces/${id}`);
        toast.success(lang === 'it' ? 'Spazio eliminato' : 'Space deleted');
        fetchData();
      } catch (err) {
        toast.error('Delete failed');
      }
    }
  };

  const deletePoi = async (id) => {
    if (window.confirm(lang === 'it' ? 'Sei sicuro di voler eliminare questo POI?' : 'Are you sure you want to delete this POI?')) {
      try {
        await axios.delete(`${API}/pois/${id}`);
        toast.success(lang === 'it' ? 'POI eliminato' : 'POI deleted');
        fetchData();
      } catch (err) {
        toast.error('Delete failed');
      }
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold" data-testid="admin-title">
            {lang === 'it' ? 'Pannello di Amministrazione' : 'Admin Panel'}
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab('spaces')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'spaces' ? 'bg-cyan-600/30 text-cyan-400' : 'text-gray-400 hover:text-white'
            }`}
            data-testid="tab-spaces"
          >
            <Layers size={20} />
            <span>{lang === 'it' ? 'Spazi' : 'Spaces'}</span>
          </button>
          <button
            onClick={() => setActiveTab('pois')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'pois' ? 'bg-cyan-600/30 text-cyan-400' : 'text-gray-400 hover:text-white'
            }`}
            data-testid="tab-pois"
          >
            <MapPin size={20} />
            <span>POI</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="animate-spin text-cyan-500" size={32} />
          </div>
        ) : (
          <>
            {/* Spaces Tab */}
            {activeTab === 'spaces' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">{lang === 'it' ? 'Gestione Spazi' : 'Manage Spaces'}</h2>
                  <button
                    onClick={() => setEditingSpace({})}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
                    data-testid="add-space"
                  >
                    <Plus size={20} />
                    <span>{lang === 'it' ? 'Nuovo Spazio' : 'New Space'}</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {spaces.map((space) => (
                    <div 
                      key={space.id}
                      className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between"
                      data-testid={`admin-space-${space.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/30">
                          {space.images[0] ? (
                            <img src={space.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Layers size={24} className="text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{space.name[lang] || space.name.it}</h3>
                          <p className="text-gray-500 text-sm">
                            {space.external_tour_url ? 'Link esterno' : `Model ID: ${space.matterport_model_id || '-'}`}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${space.is_active ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'}`}>
                            {space.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingSpace(space)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          data-testid={`edit-space-${space.id}`}
                        >
                          <Edit size={18} className="text-gray-400" />
                        </button>
                        <button
                          onClick={() => deleteSpace(space.id)}
                          className="p-2 hover:bg-red-600/20 rounded-lg transition-colors"
                          data-testid={`delete-space-${space.id}`}
                        >
                          <Trash2 size={18} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* POIs Tab */}
            {activeTab === 'pois' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">{lang === 'it' ? 'Gestione POI' : 'Manage POI'}</h2>
                  <button
                    onClick={() => setEditingPoi({})}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
                    data-testid="add-poi"
                  >
                    <Plus size={20} />
                    <span>{lang === 'it' ? 'Nuovo POI' : 'New POI'}</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {pois.map((poi) => {
                    const space = spaces.find(s => s.id === poi.space_id);
                    return (
                      <div 
                        key={poi.id}
                        className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between"
                        data-testid={`admin-poi-${poi.id}`}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-cyan-600/30 text-cyan-400 text-xs rounded-full">
                              POI #{poi.poi_number}
                            </span>
                            <span className="text-gray-500 text-sm">
                              {space?.name[lang] || space?.name.it || 'Unknown Space'}
                            </span>
                          </div>
                          <h3 className="font-medium text-white">{poi.name[lang] || poi.name.it}</h3>
                          <div className="flex items-center gap-4 mt-2">
                            {['it', 'en', 'fr', 'de'].map(l => (
                              <span key={l} className={`text-xs ${poi.audio_files[l] ? 'text-green-400' : 'text-gray-600'}`}>
                                {l.toUpperCase()} {poi.audio_files[l] ? '🔊' : '—'}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingPoi(poi)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            data-testid={`edit-poi-${poi.id}`}
                          >
                            <Edit size={18} className="text-gray-400" />
                          </button>
                          <button
                            onClick={() => deletePoi(poi.id)}
                            className="p-2 hover:bg-red-600/20 rounded-lg transition-colors"
                            data-testid={`delete-poi-${poi.id}`}
                          >
                            <Trash2 size={18} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Space Edit Modal */}
        {editingSpace && (
          <SpaceEditModal 
            space={editingSpace} 
            onClose={() => setEditingSpace(null)} 
            onSave={() => { setEditingSpace(null); fetchData(); }}
          />
        )}

        {/* POI Edit Modal */}
        {editingPoi && (
          <POIEditModal 
            poi={editingPoi} 
            spaces={spaces}
            onClose={() => setEditingPoi(null)} 
            onSave={() => { setEditingPoi(null); fetchData(); }}
          />
        )}
      </div>
    </div>
  );
};

// Space Edit Modal
const SpaceEditModal = ({ space, onClose, onSave }) => {
  const { lang } = useLanguage();
  const isNew = !space.id;
  const [form, setForm] = useState({
    name: space.name || { it: '', en: '', fr: '', de: '' },
    description: space.description || { it: '', en: '', fr: '', de: '' },
    matterport_model_id: space.matterport_model_id || '',
    external_tour_url: space.external_tour_url || '',
    images: space.images || [],
    is_active: space.is_active !== false,
    order: space.order || 0
  });
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        await axios.post(`${API}/spaces`, form);
        toast.success(lang === 'it' ? 'Spazio creato' : 'Space created');
      } else {
        await axios.put(`${API}/spaces/${space.id}`, form);
        toast.success(lang === 'it' ? 'Spazio aggiornato' : 'Space updated');
      }
      onSave();
    } catch (err) {
      toast.error('Save failed');
    }
    setSaving(false);
  };

  const translateField = async (field, sourceLang = 'it') => {
    const sourceText = form[field][sourceLang];
    if (!sourceText) {
      toast.error(lang === 'it' ? 'Inserisci prima il testo italiano' : 'Enter Italian text first');
      return;
    }

    setTranslating(true);
    const targetLangs = ['en', 'fr', 'de'].filter(l => l !== sourceLang);
    
    try {
      const translations = await Promise.all(
        targetLangs.map(targetLang => 
          axios.post(`${API}/translate`, { text: sourceText, source_lang: sourceLang, target_lang: targetLang })
        )
      );
      
      const newFieldData = { ...form[field] };
      targetLangs.forEach((targetLang, i) => {
        newFieldData[targetLang] = translations[i].data.translation;
      });
      
      setForm({ ...form, [field]: newFieldData });
      toast.success(lang === 'it' ? 'Traduzione completata' : 'Translation complete');
    } catch (err) {
      toast.error('Translation failed');
    }
    setTranslating(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API}/upload/image`, formData);
      setForm({ ...form, images: [...form.images, `${BACKEND_URL}${res.data.url}`] });
      toast.success(lang === 'it' ? 'Immagine caricata' : 'Image uploaded');
    } catch (err) {
      toast.error('Upload failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0A0A0A] rounded-2xl border border-white/10">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isNew ? (lang === 'it' ? 'Nuovo Spazio' : 'New Space') : (lang === 'it' ? 'Modifica Spazio' : 'Edit Space')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">{lang === 'it' ? 'Nome' : 'Name'}</label>
              <button
                type="button"
                onClick={() => translateField('name')}
                disabled={translating}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
              >
                <Languages size={14} />
                {translating ? '...' : (lang === 'it' ? 'Traduci' : 'Translate')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['it', 'en', 'fr', 'de'].map(l => (
                <div key={l}>
                  <span className="text-xs text-gray-500 uppercase">{l}</span>
                  <input
                    type="text"
                    value={form.name[l] || ''}
                    onChange={(e) => setForm({ ...form, name: { ...form.name, [l]: e.target.value } })}
                    className="w-full mt-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg focus:border-cyan-500 focus:outline-none"
                    data-testid={`space-name-${l}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">{lang === 'it' ? 'Descrizione' : 'Description'}</label>
              <button
                type="button"
                onClick={() => translateField('description')}
                disabled={translating}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
              >
                <Languages size={14} />
                {translating ? '...' : (lang === 'it' ? 'Traduci' : 'Translate')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['it', 'en', 'fr', 'de'].map(l => (
                <div key={l}>
                  <span className="text-xs text-gray-500 uppercase">{l}</span>
                  <textarea
                    value={form.description[l] || ''}
                    onChange={(e) => setForm({ ...form, description: { ...form.description, [l]: e.target.value } })}
                    rows={3}
                    className="w-full mt-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg focus:border-cyan-500 focus:outline-none resize-none"
                    data-testid={`space-desc-${l}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Matterport Model ID */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Matterport Model ID</label>
            <input
              type="text"
              value={form.matterport_model_id}
              onChange={(e) => setForm({ ...form, matterport_model_id: e.target.value })}
              className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg focus:border-cyan-500 focus:outline-none"
              placeholder="e.g., UqskS4cg92b"
              data-testid="space-model-id"
            />
          </div>

          {/* External Tour URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {lang === 'it' ? 'Link Tour Esterno (mpskin, overlay, ecc.)' : 'External Tour Link (mpskin, overlay, etc.)'}
            </label>
            <input
              type="url"
              value={form.external_tour_url}
              onChange={(e) => setForm({ ...form, external_tour_url: e.target.value })}
              className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg focus:border-cyan-500 focus:outline-none"
              placeholder="https://mpskin.com/tour/..."
              data-testid="space-external-url"
            />
            <p className="text-xs text-gray-500 mt-1">
              {lang === 'it' ? 'Se specificato, verrà usato al posto dell\'embed Matterport standard' : 'If specified, will be used instead of standard Matterport embed'}
            </p>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{lang === 'it' ? 'Immagini' : 'Images'}</label>
            <div className="flex flex-wrap gap-3 mb-3">
              {form.images.map((img, i) => (
                <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) })}
                    className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-colors">
              <Upload size={18} />
              <span>{lang === 'it' ? 'Carica Immagine' : 'Upload Image'}</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          {/* Active & Order */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-white/30 bg-black/30 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-gray-300">{lang === 'it' ? 'Attivo' : 'Active'}</span>
            </label>
            <div className="flex items-center gap-2">
              <label className="text-gray-300">{lang === 'it' ? 'Ordine' : 'Order'}:</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                className="w-20 px-2 py-1 bg-black/30 border border-white/10 rounded-lg focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              {lang === 'it' ? 'Annulla' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors disabled:opacity-50"
              data-testid="save-space"
            >
              {saving ? '...' : (lang === 'it' ? 'Salva' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// POI Edit Modal
const POIEditModal = ({ poi, spaces, onClose, onSave }) => {
  const { lang } = useLanguage();
  const isNew = !poi.id;
  const [form, setForm] = useState({
    space_id: poi.space_id || (spaces[0]?.id || ''),
    poi_number: poi.poi_number || 1,
    name: poi.name || { it: '', en: '', fr: '', de: '' },
    description: poi.description || { it: '', en: '', fr: '', de: '' },
    mattertag_id: poi.mattertag_id || '',
    is_active: poi.is_active !== false,
    audio_files: poi.audio_files || {}
  });
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        await axios.post(`${API}/pois`, form);
        toast.success(lang === 'it' ? 'POI creato' : 'POI created');
      } else {
        await axios.put(`${API}/pois/${poi.id}`, form);
        toast.success(lang === 'it' ? 'POI aggiornato' : 'POI updated');
      }
      onSave();
    } catch (err) {
      toast.error('Save failed');
    }
    setSaving(false);
  };

  const translateField = async (field) => {
    const sourceText = form[field].it;
    if (!sourceText) {
      toast.error(lang === 'it' ? 'Inserisci prima il testo italiano' : 'Enter Italian text first');
      return;
    }

    setTranslating(true);
    const targetLangs = ['en', 'fr', 'de'];
    
    try {
      const translations = await Promise.all(
        targetLangs.map(targetLang => 
          axios.post(`${API}/translate`, { text: sourceText, source_lang: 'it', target_lang: targetLang })
        )
      );
      
      const newFieldData = { ...form[field] };
      targetLangs.forEach((targetLang, i) => {
        newFieldData[targetLang] = translations[i].data.translation;
      });
      
      setForm({ ...form, [field]: newFieldData });
      toast.success(lang === 'it' ? 'Traduzione completata' : 'Translation complete');
    } catch (err) {
      toast.error('Translation failed');
    }
    setTranslating(false);
  };

  const generateAudio = async (language) => {
    const text = form.description[language];
    if (!text) {
      toast.error(lang === 'it' ? 'Inserisci prima la descrizione' : 'Enter description first');
      return;
    }
    if (!poi.id) {
      toast.error(lang === 'it' ? 'Salva prima il POI' : 'Save POI first');
      return;
    }

    setGeneratingAudio({ ...generatingAudio, [language]: true });
    try {
      const res = await axios.post(`${API}/tts`, {
        text,
        language,
        poi_id: poi.id
      });
      setForm({ 
        ...form, 
        audio_files: { ...form.audio_files, [language]: res.data.audio_url } 
      });
      toast.success(lang === 'it' ? 'Audio generato' : 'Audio generated');
    } catch (err) {
      toast.error('Audio generation failed');
    }
    setGeneratingAudio({ ...generatingAudio, [language]: false });
  };

  const handleAudioUpload = async (e, language) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!poi.id) {
      toast.error(lang === 'it' ? 'Salva prima il POI' : 'Save POI first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('poi_id', poi.id);
    formData.append('language', language);

    try {
      const res = await axios.post(`${API}/upload/audio`, formData);
      setForm({ 
        ...form, 
        audio_files: { ...form.audio_files, [language]: res.data.url } 
      });
      toast.success(lang === 'it' ? 'Audio caricato' : 'Audio uploaded');
    } catch (err) {
      toast.error('Upload failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0A0A0A] rounded-2xl border border-white/10">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isNew ? (lang === 'it' ? 'Nuovo POI' : 'New POI') : (lang === 'it' ? 'Modifica POI' : 'Edit POI')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Space & POI Number */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{lang === 'it' ? 'Spazio' : 'Space'}</label>
              <select
                value={form.space_id}
                onChange={(e) => setForm({ ...form, space_id: e.target.value })}
                className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg focus:border-cyan-500 focus:outline-none"
                data-testid="poi-space"
              >
                {spaces.map(s => (
                  <option key={s.id} value={s.id}>{s.name[lang] || s.name.it}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">POI #</label>
              <input
                type="number"
                value={form.poi_number}
                onChange={(e) => setForm({ ...form, poi_number: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg focus:border-cyan-500 focus:outline-none"
                min={1}
                data-testid="poi-number"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">{lang === 'it' ? 'Nome' : 'Name'}</label>
              <button
                type="button"
                onClick={() => translateField('name')}
                disabled={translating}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
              >
                <Languages size={14} />
                {translating ? '...' : (lang === 'it' ? 'Traduci' : 'Translate')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['it', 'en', 'fr', 'de'].map(l => (
                <div key={l}>
                  <span className="text-xs text-gray-500 uppercase">{l}</span>
                  <input
                    type="text"
                    value={form.name[l] || ''}
                    onChange={(e) => setForm({ ...form, name: { ...form.name, [l]: e.target.value } })}
                    className="w-full mt-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg focus:border-cyan-500 focus:outline-none"
                    data-testid={`poi-name-${l}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">{lang === 'it' ? 'Descrizione' : 'Description'}</label>
              <button
                type="button"
                onClick={() => translateField('description')}
                disabled={translating}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
              >
                <Languages size={14} />
                {translating ? '...' : (lang === 'it' ? 'Traduci' : 'Translate')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['it', 'en', 'fr', 'de'].map(l => (
                <div key={l}>
                  <span className="text-xs text-gray-500 uppercase">{l}</span>
                  <textarea
                    value={form.description[l] || ''}
                    onChange={(e) => setForm({ ...form, description: { ...form.description, [l]: e.target.value } })}
                    rows={3}
                    className="w-full mt-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg focus:border-cyan-500 focus:outline-none resize-none"
                    data-testid={`poi-desc-${l}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Audio Files */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">{lang === 'it' ? 'Audioguide' : 'Audio Guides'}</label>
            <div className="grid grid-cols-2 gap-4">
              {['it', 'en', 'fr', 'de'].map(l => (
                <div key={l} className="p-3 bg-black/30 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 uppercase">{l}</span>
                    {form.audio_files[l] && (
                      <span className="text-xs text-green-400">✓</span>
                    )}
                  </div>
                  {form.audio_files[l] && (
                    <audio 
                      controls 
                      className="w-full h-8 mb-2"
                      src={`${BACKEND_URL}${form.audio_files[l]}`}
                    />
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => generateAudio(l)}
                      disabled={generatingAudio[l] || !poi.id}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 rounded text-xs transition-colors disabled:opacity-50"
                      data-testid={`generate-audio-${l}`}
                    >
                      {generatingAudio[l] ? <RefreshCw size={12} className="animate-spin" /> : <AudioLines size={12} />}
                      <span>TTS</span>
                    </button>
                    <label className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs cursor-pointer transition-colors">
                      <Upload size={12} />
                      <span>Upload</span>
                      <input 
                        type="file" 
                        accept="audio/*" 
                        onChange={(e) => handleAudioUpload(e, l)} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mattertag ID */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Mattertag ID</label>
            <input
              type="text"
              value={form.mattertag_id}
              onChange={(e) => setForm({ ...form, mattertag_id: e.target.value })}
              className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg focus:border-cyan-500 focus:outline-none"
              placeholder={lang === 'it' ? 'Opzionale - ID del tag Matterport' : 'Optional - Matterport tag ID'}
              data-testid="poi-mattertag"
            />
          </div>

          {/* Active */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-white/30 bg-black/30 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-gray-300">{lang === 'it' ? 'Attivo' : 'Active'}</span>
          </label>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              {lang === 'it' ? 'Annulla' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors disabled:opacity-50"
              data-testid="save-poi"
            >
              {saving ? '...' : (lang === 'it' ? 'Salva' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <div className="App min-h-screen bg-[#020204]">
          <Toaster position="top-right" theme="dark" />
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/spaces" element={<SpacesPage />} />
              <Route path="/space/:id" element={<SpacePage />} />
              <Route path="/project" element={<ProjectPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
