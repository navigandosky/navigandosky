import { useState, useEffect, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { MessageCircle, X, Send, Globe, Menu, ChevronDown, MapPin, Phone, Mail, Calendar, Church, Palette, Trees, ExternalLink, Play } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Translations
const translations = {
  it: {
    heroTitle: "Tadasuni Borgo Experience",
    heroSubtitle: "Tra lago, colline e tradizioni: la tua nuova vita comincia a Tadasuni",
    discover: "Scopri di più",
    digitalTwin: "Gemello Digitale",
    digitalTwinDesc: "Esplora Tadasuni in 3D con il nostro tour virtuale interattivo",
    exploreNow: "Esplora Ora",
    about: "Il Borgo",
    aboutTitle: "Un piccolo gioiello della Sardegna",
    aboutDesc: "Tadasuni è un piccolissimo borgo della Sardegna centrale, situato nella regione storica del Barigadu. Sorge su un rilievo collinare a circa 180 metri di altitudine, affacciato sul magnifico Lago Omodeo.",
    attractions: "Attrazioni",
    churches: "Chiese Storiche",
    churchesDesc: "Santa Croce, San Nicola di Bari, San Michele",
    ceramics: "Ceramiche Artistiche",
    ceramicsDesc: "Itinerario delle ceramiche tradizionali sarde",
    nature: "Natura e Paesaggi",
    natureDesc: "Lago Omodeo, giardini e macchia mediterranea",
    events: "Eventi",
    eventsTitle: "Dromos Festival 2025",
    eventsDesc: "Tre giorni di musica, incontri e contaminazioni sulle rive del Lago Omodeo",
    contact: "Contatti",
    contactTitle: "Contattaci",
    name: "Nome",
    email: "Email",
    phone: "Telefono",
    message: "Messaggio",
    consent: "Accetto il trattamento dei dati personali",
    send: "Invia",
    chatTitle: "Assistente Tadasuni",
    chatPlaceholder: "Scrivi un messaggio...",
    chatWelcome: "Ciao! Sono l'assistente virtuale di Visit Tadasuni. Come posso aiutarti?",
    howToReach: "Come Arrivare",
    services: "Servizi",
    gallery: "Galleria",
    footer: "© 2025 Visit Tadasuni - Comune di Tadasuni"
  },
  en: {
    heroTitle: "Tadasuni Borgo Experience",
    heroSubtitle: "Between lake, hills and traditions: your new life begins in Tadasuni",
    discover: "Discover More",
    digitalTwin: "Digital Twin",
    digitalTwinDesc: "Explore Tadasuni in 3D with our interactive virtual tour",
    exploreNow: "Explore Now",
    about: "The Village",
    aboutTitle: "A small gem of Sardinia",
    aboutDesc: "Tadasuni is a tiny village in central Sardinia, located in the historic region of Barigadu. It rises on a hill at about 180 meters altitude, overlooking the magnificent Lake Omodeo.",
    attractions: "Attractions",
    churches: "Historic Churches",
    churchesDesc: "Santa Croce, San Nicola di Bari, San Michele",
    ceramics: "Artistic Ceramics",
    ceramicsDesc: "Traditional Sardinian ceramics itinerary",
    nature: "Nature & Landscapes",
    natureDesc: "Lake Omodeo, gardens and Mediterranean scrub",
    events: "Events",
    eventsTitle: "Dromos Festival 2025",
    eventsDesc: "Three days of music, meetings and cross-fertilization on the shores of Lake Omodeo",
    contact: "Contact",
    contactTitle: "Contact Us",
    name: "Name",
    email: "Email",
    phone: "Phone",
    message: "Message",
    consent: "I accept the processing of personal data",
    send: "Send",
    chatTitle: "Tadasuni Assistant",
    chatPlaceholder: "Write a message...",
    chatWelcome: "Hello! I'm the virtual assistant of Visit Tadasuni. How can I help you?",
    howToReach: "How to Reach",
    services: "Services",
    gallery: "Gallery",
    footer: "© 2025 Visit Tadasuni - Municipality of Tadasuni"
  },
  fr: {
    heroTitle: "Tadasuni Borgo Experience",
    heroSubtitle: "Entre lac, collines et traditions: votre nouvelle vie commence à Tadasuni",
    discover: "Découvrir Plus",
    digitalTwin: "Jumeau Numérique",
    digitalTwinDesc: "Explorez Tadasuni en 3D avec notre visite virtuelle interactive",
    exploreNow: "Explorer Maintenant",
    about: "Le Village",
    aboutTitle: "Un petit joyau de la Sardaigne",
    aboutDesc: "Tadasuni est un tout petit village du centre de la Sardaigne, situé dans la région historique du Barigadu. Il s'élève sur une colline à environ 180 mètres d'altitude, surplombant le magnifique lac Omodeo.",
    attractions: "Attractions",
    churches: "Églises Historiques",
    churchesDesc: "Santa Croce, San Nicola di Bari, San Michele",
    ceramics: "Céramiques Artistiques",
    ceramicsDesc: "Itinéraire des céramiques traditionnelles sardes",
    nature: "Nature et Paysages",
    natureDesc: "Lac Omodeo, jardins et maquis méditerranéen",
    events: "Événements",
    eventsTitle: "Dromos Festival 2025",
    eventsDesc: "Trois jours de musique, rencontres et métissages sur les rives du lac Omodeo",
    contact: "Contact",
    contactTitle: "Contactez-nous",
    name: "Nom",
    email: "Email",
    phone: "Téléphone",
    message: "Message",
    consent: "J'accepte le traitement des données personnelles",
    send: "Envoyer",
    chatTitle: "Assistant Tadasuni",
    chatPlaceholder: "Écrivez un message...",
    chatWelcome: "Bonjour! Je suis l'assistant virtuel de Visit Tadasuni. Comment puis-je vous aider?",
    howToReach: "Comment Arriver",
    services: "Services",
    gallery: "Galerie",
    footer: "© 2025 Visit Tadasuni - Commune de Tadasuni"
  },
  es: {
    heroTitle: "Tadasuni Borgo Experience",
    heroSubtitle: "Entre lago, colinas y tradiciones: tu nueva vida comienza en Tadasuni",
    discover: "Descubre Más",
    digitalTwin: "Gemelo Digital",
    digitalTwinDesc: "Explora Tadasuni en 3D con nuestro tour virtual interactivo",
    exploreNow: "Explorar Ahora",
    about: "El Pueblo",
    aboutTitle: "Una pequeña joya de Cerdeña",
    aboutDesc: "Tadasuni es un pequeño pueblo del centro de Cerdeña, ubicado en la región histórica de Barigadu. Se eleva sobre una colina a unos 180 metros de altitud, con vistas al magnífico lago Omodeo.",
    attractions: "Atracciones",
    churches: "Iglesias Históricas",
    churchesDesc: "Santa Croce, San Nicola di Bari, San Michele",
    ceramics: "Cerámicas Artísticas",
    ceramicsDesc: "Itinerario de cerámicas tradicionales sardas",
    nature: "Naturaleza y Paisajes",
    natureDesc: "Lago Omodeo, jardines y matorral mediterráneo",
    events: "Eventos",
    eventsTitle: "Dromos Festival 2025",
    eventsDesc: "Tres días de música, encuentros y mestizaje a orillas del lago Omodeo",
    contact: "Contacto",
    contactTitle: "Contáctanos",
    name: "Nombre",
    email: "Email",
    phone: "Teléfono",
    message: "Mensaje",
    consent: "Acepto el tratamiento de datos personales",
    send: "Enviar",
    chatTitle: "Asistente Tadasuni",
    chatPlaceholder: "Escribe un mensaje...",
    chatWelcome: "¡Hola! Soy el asistente virtual de Visit Tadasuni. ¿Cómo puedo ayudarte?",
    howToReach: "Cómo Llegar",
    services: "Servicios",
    gallery: "Galería",
    footer: "© 2025 Visit Tadasuni - Municipio de Tadasuni"
  },
  de: {
    heroTitle: "Tadasuni Borgo Experience",
    heroSubtitle: "Zwischen See, Hügeln und Traditionen: Ihr neues Leben beginnt in Tadasuni",
    discover: "Mehr Entdecken",
    digitalTwin: "Digitaler Zwilling",
    digitalTwinDesc: "Erkunden Sie Tadasuni in 3D mit unserer interaktiven virtuellen Tour",
    exploreNow: "Jetzt Erkunden",
    about: "Das Dorf",
    aboutTitle: "Ein kleines Juwel Sardiniens",
    aboutDesc: "Tadasuni ist ein winziges Dorf in Zentralsardinien, gelegen in der historischen Region Barigadu. Es erhebt sich auf einem Hügel etwa 180 Meter über dem Meeresspiegel mit Blick auf den herrlichen Omodeo-See.",
    attractions: "Attraktionen",
    churches: "Historische Kirchen",
    churchesDesc: "Santa Croce, San Nicola di Bari, San Michele",
    ceramics: "Kunstkeramik",
    ceramicsDesc: "Route der traditionellen sardischen Keramik",
    nature: "Natur & Landschaften",
    natureDesc: "Omodeo-See, Gärten und mediterrane Macchia",
    events: "Veranstaltungen",
    eventsTitle: "Dromos Festival 2025",
    eventsDesc: "Drei Tage Musik, Begegnungen und kultureller Austausch am Ufer des Omodeo-Sees",
    contact: "Kontakt",
    contactTitle: "Kontaktieren Sie Uns",
    name: "Name",
    email: "E-Mail",
    phone: "Telefon",
    message: "Nachricht",
    consent: "Ich akzeptiere die Verarbeitung personenbezogener Daten",
    send: "Senden",
    chatTitle: "Tadasuni Assistent",
    chatPlaceholder: "Nachricht schreiben...",
    chatWelcome: "Hallo! Ich bin der virtuelle Assistent von Visit Tadasuni. Wie kann ich Ihnen helfen?",
    howToReach: "Anfahrt",
    services: "Dienstleistungen",
    gallery: "Galerie",
    footer: "© 2025 Visit Tadasuni - Gemeinde Tadasuni"
  }
};

const languageNames = {
  it: "Italiano",
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch"
};

// Images from the original site
const images = {
  hero: "https://www.visittadasuni.it/wp-content/uploads/2025/11/vista-paese_lago_DJI_0228.jpg",
  casaPinna: "https://www.visittadasuni.it/wp-content/uploads/2025/11/Tadasuni-Casa-Pinna-retro.jpg",
  sanMichele: "https://www.visittadasuni.it/wp-content/uploads/2025/11/chiesetta-san-michele.jpg",
  lagoOmodeo: "https://www.visittadasuni.it/wp-content/uploads/2025/11/lagop-omodeo.jpg",
  santaCroce: "https://www.visittadasuni.it/wp-content/uploads/2025/11/Tadasuni-Chiesa-Santa-Croce.jpg",
  parco: "https://www.visittadasuni.it/wp-content/uploads/2025/11/Tadasuni-Parco-pubblico-1.jpg",
  vista1: "https://www.visittadasuni.it/wp-content/uploads/2025/11/vista-paese_2_DJI_0228_modificata.jpg",
  pietra: "https://www.visittadasuni.it/wp-content/uploads/2025/11/pietra-logo-tadasuni.jpg",
  monumentoCaduti: "https://www.visittadasuni.it/wp-content/uploads/2025/11/Tadasuni-Monumento-ai-caduti.jpg"
};

function App() {
  const [lang, setLang] = useState("it");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showDigitalTwin, setShowDigitalTwin] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "", consent: false });
  const [contactStatus, setContactStatus] = useState(null);
  const chatEndRef = useRef(null);
  
  const t = translations[lang];

  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([{ role: "assistant", content: t.chatWelcome }]);
    }
  }, [lang]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setChatLoading(true);

    try {
      const response = await axios.post(`${API}/chat`, {
        message: userMessage,
        language: lang,
        history: chatMessages.slice(-10)
      });
      setChatMessages(prev => [...prev, { role: "assistant", content: response.data.response }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, { role: "assistant", content: "Mi dispiace, c'è stato un errore. Riprova più tardi." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleContact = async (e) => {
    e.preventDefault();
    if (!contactForm.consent) return;
    
    try {
      await axios.post(`${API}/contact`, contactForm);
      setContactStatus("success");
      setContactForm({ name: "", email: "", phone: "", message: "", consent: false });
    } catch (error) {
      setContactStatus("error");
    }
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-serif font-bold text-emerald-800">Visit Tadasuni</span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection("about")} className="text-stone-700 hover:text-emerald-700 transition" data-testid="nav-about">{t.about}</button>
              <button onClick={() => scrollToSection("digital-twin")} className="text-stone-700 hover:text-emerald-700 transition" data-testid="nav-twin">{t.digitalTwin}</button>
              <button onClick={() => scrollToSection("attractions")} className="text-stone-700 hover:text-emerald-700 transition" data-testid="nav-attractions">{t.attractions}</button>
              <button onClick={() => scrollToSection("events")} className="text-stone-700 hover:text-emerald-700 transition" data-testid="nav-events">{t.events}</button>
              <button onClick={() => scrollToSection("contact")} className="text-stone-700 hover:text-emerald-700 transition" data-testid="nav-contact">{t.contact}</button>
              
              {/* Language Selector */}
              <div className="relative">
                <button 
                  onClick={() => setShowLangMenu(!showLangMenu)} 
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 transition"
                  data-testid="lang-selector"
                >
                  <Globe size={18} />
                  <span>{languageNames[lang]}</span>
                  <ChevronDown size={16} />
                </button>
                {showLangMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg py-2 border">
                    {Object.entries(languageNames).map(([code, name]) => (
                      <button
                        key={code}
                        onClick={() => { setLang(code); setShowLangMenu(false); setChatMessages([{ role: "assistant", content: translations[code].chatWelcome }]); }}
                        className={`w-full text-left px-4 py-2 hover:bg-emerald-50 ${lang === code ? "bg-emerald-100 text-emerald-800" : ""}`}
                        data-testid={`lang-${code}`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2" data-testid="mobile-menu-btn">
              <Menu size={24} />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 py-4 space-y-3">
              <button onClick={() => scrollToSection("about")} className="block w-full text-left py-2 text-stone-700">{t.about}</button>
              <button onClick={() => scrollToSection("digital-twin")} className="block w-full text-left py-2 text-stone-700">{t.digitalTwin}</button>
              <button onClick={() => scrollToSection("attractions")} className="block w-full text-left py-2 text-stone-700">{t.attractions}</button>
              <button onClick={() => scrollToSection("events")} className="block w-full text-left py-2 text-stone-700">{t.events}</button>
              <button onClick={() => scrollToSection("contact")} className="block w-full text-left py-2 text-stone-700">{t.contact}</button>
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {Object.entries(languageNames).map(([code, name]) => (
                  <button
                    key={code}
                    onClick={() => { setLang(code); setMobileMenuOpen(false); }}
                    className={`px-3 py-1 rounded-full text-sm ${lang === code ? "bg-emerald-600 text-white" : "bg-stone-200"}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center" data-testid="hero-section">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${images.hero})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60"></div>
        </div>
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 drop-shadow-lg animate-fade-in" data-testid="hero-title">
            {t.heroTitle}
          </h1>
          <p className="text-xl md:text-2xl mb-8 drop-shadow-md opacity-90" data-testid="hero-subtitle">
            {t.heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => scrollToSection("about")}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-full text-lg font-semibold transition transform hover:scale-105 shadow-lg"
              data-testid="hero-discover-btn"
            >
              {t.discover}
            </button>
            <button 
              onClick={() => scrollToSection("digital-twin")}
              className="px-8 py-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-lg font-semibold transition border-2 border-white"
              data-testid="hero-twin-btn"
            >
              {t.digitalTwin}
            </button>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown size={40} className="text-white opacity-70" />
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4" data-testid="about-section">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-serif font-bold text-stone-800 mb-6">{t.aboutTitle}</h2>
              <p className="text-lg text-stone-600 mb-8 leading-relaxed">{t.aboutDesc}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4">
                  <MapPin className="text-emerald-600 mb-2" size={28} />
                  <p className="font-semibold text-stone-800">180m</p>
                  <p className="text-sm text-stone-600">Altitudine</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <Calendar className="text-amber-600 mb-2" size={28} />
                  <p className="font-semibold text-stone-800">~150</p>
                  <p className="text-sm text-stone-600">Abitanti</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <img src={images.casaPinna} alt="Casa Pinna" className="rounded-2xl shadow-lg h-48 w-full object-cover" />
              <img src={images.lagoOmodeo} alt="Lago Omodeo" className="rounded-2xl shadow-lg h-48 w-full object-cover mt-8" />
              <img src={images.vista1} alt="Vista panoramica" className="rounded-2xl shadow-lg h-48 w-full object-cover" />
              <img src={images.sanMichele} alt="San Michele" className="rounded-2xl shadow-lg h-48 w-full object-cover mt-8" />
            </div>
          </div>
        </div>
      </section>

      {/* Digital Twin Section */}
      <section id="digital-twin" className="py-20 px-4 bg-gradient-to-br from-emerald-900 to-stone-900" data-testid="digital-twin-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-serif font-bold text-white mb-4">{t.digitalTwin}</h2>
            <p className="text-xl text-emerald-200">{t.digitalTwinDesc}</p>
          </div>
          
          {!showDigitalTwin ? (
            <div 
              className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer group"
              onClick={() => setShowDigitalTwin(true)}
              data-testid="digital-twin-preview"
            >
              <img 
                src={images.hero} 
                alt="Digital Twin Preview" 
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 group-hover:scale-110 transition">
                  <Play size={48} className="text-white ml-1" />
                </div>
              </div>
              <button className="absolute bottom-6 left-1/2 -translate-x-1/2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-semibold flex items-center gap-2 transition">
                {t.exploreNow}
                <ExternalLink size={18} />
              </button>
            </div>
          ) : (
            <div className="relative aspect-video rounded-2xl overflow-hidden" data-testid="digital-twin-iframe">
              <iframe
                src="https://tour.fairsgate.com/tour/tadasuni"
                title="Tadasuni Digital Twin"
                className="w-full h-full"
                allow="fullscreen; accelerometer; gyroscope"
                allowFullScreen
              />
              <button 
                onClick={() => setShowDigitalTwin(false)}
                className="absolute top-4 right-4 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition"
                data-testid="close-twin-btn"
              >
                <X size={24} className="text-stone-800" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Attractions Section */}
      <section id="attractions" className="py-20 px-4" data-testid="attractions-section">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-serif font-bold text-stone-800 text-center mb-12">{t.attractions}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden group hover:shadow-xl transition" data-testid="attraction-churches">
              <div className="h-48 overflow-hidden">
                <img src={images.santaCroce} alt="Churches" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
              </div>
              <div className="p-6">
                <Church className="text-emerald-600 mb-3" size={32} />
                <h3 className="text-xl font-bold text-stone-800 mb-2">{t.churches}</h3>
                <p className="text-stone-600">{t.churchesDesc}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden group hover:shadow-xl transition" data-testid="attraction-ceramics">
              <div className="h-48 overflow-hidden">
                <img src={images.pietra} alt="Ceramics" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
              </div>
              <div className="p-6">
                <Palette className="text-amber-600 mb-3" size={32} />
                <h3 className="text-xl font-bold text-stone-800 mb-2">{t.ceramics}</h3>
                <p className="text-stone-600">{t.ceramicsDesc}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden group hover:shadow-xl transition" data-testid="attraction-nature">
              <div className="h-48 overflow-hidden">
                <img src={images.parco} alt="Nature" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
              </div>
              <div className="p-6">
                <Trees className="text-green-600 mb-3" size={32} />
                <h3 className="text-xl font-bold text-stone-800 mb-2">{t.nature}</h3>
                <p className="text-stone-600">{t.natureDesc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section id="events" className="py-20 px-4 bg-gradient-to-r from-amber-50 to-orange-50" data-testid="events-section">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-amber-600 font-semibold text-sm uppercase tracking-wide">{t.events}</span>
              <h2 className="text-4xl font-serif font-bold text-stone-800 mt-2 mb-6">{t.eventsTitle}</h2>
              <p className="text-lg text-stone-600 mb-8">{t.eventsDesc}</p>
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="font-bold text-stone-800">ADI OASIS</p>
                  <p className="text-stone-600">8 Agosto 2025, 22:00 - Parco Comunale</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="font-bold text-stone-800">SULIDU</p>
                  <p className="text-stone-600">8 Agosto 2025, 19:00 - Piazza Santa Croce</p>
                </div>
              </div>
              <a 
                href="https://dromosfestival.it/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-6 text-amber-700 hover:text-amber-800 font-semibold"
              >
                Dromos Festival Website <ExternalLink size={18} />
              </a>
            </div>
            <div className="relative">
              <img src={images.parco} alt="Events" className="rounded-2xl shadow-xl" />
              <div className="absolute -bottom-6 -left-6 bg-amber-500 text-white rounded-xl p-4 shadow-lg">
                <p className="text-3xl font-bold">8-10</p>
                <p className="text-sm uppercase">Agosto 2025</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="py-20 px-4 bg-stone-100" data-testid="gallery-section">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-serif font-bold text-stone-800 text-center mb-12">{t.gallery}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.values(images).map((img, idx) => (
              <img 
                key={idx} 
                src={img} 
                alt={`Gallery ${idx + 1}`} 
                className="rounded-lg shadow-md h-40 w-full object-cover hover:scale-105 transition cursor-pointer"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4" data-testid="contact-section">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-serif font-bold text-stone-800 text-center mb-12">{t.contactTitle}</h2>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleContact} className="space-y-6" data-testid="contact-form">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-stone-700 font-medium mb-2">{t.name}</label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    data-testid="contact-name"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-2">{t.email}</label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    data-testid="contact-email"
                  />
                </div>
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-2">{t.phone}</label>
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  data-testid="contact-phone"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-2">{t.message}</label>
                <textarea
                  required
                  rows={5}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition resize-none"
                  data-testid="contact-message"
                />
              </div>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={contactForm.consent}
                  onChange={(e) => setContactForm({ ...contactForm, consent: e.target.checked })}
                  className="mt-1 w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                  data-testid="contact-consent"
                />
                <label htmlFor="consent" className="text-stone-600 text-sm">{t.consent}</label>
              </div>
              {contactStatus === "success" && (
                <div className="bg-emerald-50 text-emerald-800 px-4 py-3 rounded-lg" data-testid="contact-success">
                  Messaggio inviato con successo!
                </div>
              )}
              {contactStatus === "error" && (
                <div className="bg-red-50 text-red-800 px-4 py-3 rounded-lg" data-testid="contact-error">
                  Errore nell'invio. Riprova.
                </div>
              )}
              <button
                type="submit"
                disabled={!contactForm.consent}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white rounded-lg font-semibold transition"
                data-testid="contact-submit"
              >
                {t.send}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-serif font-bold mb-4">Visit Tadasuni</h3>
              <p className="text-stone-400">Tra lago, colline e tradizioni</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Link Utili</h4>
              <div className="space-y-2">
                <a href="https://comune.tadasuni.or.it/" target="_blank" rel="noopener noreferrer" className="block text-stone-400 hover:text-white transition">Comune di Tadasuni</a>
                <a href="https://dromosfestival.it/" target="_blank" rel="noopener noreferrer" className="block text-stone-400 hover:text-white transition">Dromos Festival</a>
                <a href="https://tour.fairsgate.com/tour/tadasuni" target="_blank" rel="noopener noreferrer" className="block text-stone-400 hover:text-white transition">Digital Twin</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contatti</h4>
              <div className="space-y-2 text-stone-400">
                <p className="flex items-center gap-2"><MapPin size={18} /> Tadasuni (OR), Sardegna</p>
                <p className="flex items-center gap-2"><Mail size={18} /> info@comune.tadasuni.or.it</p>
              </div>
            </div>
          </div>
          <div className="border-t border-stone-800 pt-8 text-center text-stone-500 text-sm">
            <p>{t.footer}</p>
            <p className="mt-2">Presented by <a href="http://www.fairsgate.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">Fairsgate</a></p>
          </div>
        </div>
      </footer>

      {/* Chat Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl flex items-center justify-center transition transform hover:scale-110 z-50"
        data-testid="chat-toggle"
      >
        {chatOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </button>

      {/* Chat Window */}
      {chatOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl overflow-hidden z-50" data-testid="chat-window">
          <div className="bg-emerald-600 text-white px-6 py-4">
            <h3 className="font-semibold">{t.chatTitle}</h3>
            <p className="text-sm text-emerald-100">Online - {languageNames[lang]}</p>
          </div>
          <div className="h-80 overflow-y-auto p-4 space-y-4 bg-stone-50" data-testid="chat-messages">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${msg.role === "user" ? "bg-emerald-600 text-white rounded-br-sm" : "bg-white text-stone-800 shadow-sm rounded-bl-sm"}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-stone-500 px-4 py-2 rounded-2xl shadow-sm rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder={t.chatPlaceholder}
                className="flex-1 px-4 py-2 rounded-full border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                data-testid="chat-input"
              />
              <button
                onClick={sendMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white rounded-full flex items-center justify-center transition"
                data-testid="chat-send"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
