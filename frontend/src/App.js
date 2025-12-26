import { useState, useEffect, useRef } from "react";
import "@/App.css";
import { HashRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { MessageCircle, X, Send, Globe, Menu, ChevronDown, MapPin, Mail, Calendar, Church, Palette, Trees, ExternalLink, Play, Plus, Trash2, Edit, Upload, Image, LogOut, Eye, EyeOff, ArrowLeft, Save, Bot, Link2, FileText, Settings, RefreshCw, CheckCircle, AlertCircle, Clock, Database, Volume2, Map, Landmark, Camera } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

// Categories for attractions
const attractionCategories = [
  { value: "chiesa", label: "Chiesa", labelEn: "Church" },
  { value: "monumento", label: "Monumento", labelEn: "Monument" },
  { value: "archeologia", label: "Sito Archeologico", labelEn: "Archaeological Site" },
  { value: "natura", label: "Natura", labelEn: "Nature" },
  { value: "museo", label: "Museo", labelEn: "Museum" },
  { value: "altro", label: "Altro", labelEn: "Other" }
];

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
    eventsTitle: "Eventi e Notizie",
    eventsDesc: "Scopri gli eventi e le notizie dal borgo di Tadasuni",
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
    chatWelcome: "Ciao! Sono l'assistente virtuale di VisitTadasuni. Come posso aiutarti?",
    howToReach: "Come Arrivare",
    services: "Servizi",
    gallery: "Galleria",
    footer: "© 2025 VisitTadasuni - Comune di Tadasuni",
    readMore: "Leggi di più",
    noEvents: "Nessun evento disponibile al momento.",
    backToHome: "Torna alla Home",
    admin: "Admin"
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
    eventsTitle: "Events & News",
    eventsDesc: "Discover events and news from the village of Tadasuni",
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
    chatWelcome: "Hello! I'm the virtual assistant of VisitTadasuni. How can I help you?",
    howToReach: "How to Reach",
    services: "Services",
    gallery: "Gallery",
    footer: "© 2025 VisitTadasuni - Municipality of Tadasuni",
    readMore: "Read more",
    noEvents: "No events available at the moment.",
    backToHome: "Back to Home",
    admin: "Admin"
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
    aboutDesc: "Tadasuni est un tout petit village du centre de la Sardaigne, situé dans la région historique du Barigadu.",
    attractions: "Attractions",
    churches: "Églises Historiques",
    churchesDesc: "Santa Croce, San Nicola di Bari, San Michele",
    ceramics: "Céramiques Artistiques",
    ceramicsDesc: "Itinéraire des céramiques traditionnelles sardes",
    nature: "Nature et Paysages",
    natureDesc: "Lac Omodeo, jardins et maquis méditerranéen",
    events: "Événements",
    eventsTitle: "Événements et Actualités",
    eventsDesc: "Découvrez les événements et actualités du village de Tadasuni",
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
    chatWelcome: "Bonjour! Je suis l'assistant virtuel de VisitTadasuni. Comment puis-je vous aider?",
    howToReach: "Comment Arriver",
    services: "Services",
    gallery: "Galerie",
    footer: "© 2025 VisitTadasuni - Commune de Tadasuni",
    readMore: "Lire la suite",
    noEvents: "Aucun événement disponible pour le moment.",
    backToHome: "Retour à l'accueil",
    admin: "Admin"
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
    aboutDesc: "Tadasuni es un pequeño pueblo del centro de Cerdeña, ubicado en la región histórica de Barigadu.",
    attractions: "Atracciones",
    churches: "Iglesias Históricas",
    churchesDesc: "Santa Croce, San Nicola di Bari, San Michele",
    ceramics: "Cerámicas Artísticas",
    ceramicsDesc: "Itinerario de cerámicas tradicionales sardas",
    nature: "Naturaleza y Paisajes",
    natureDesc: "Lago Omodeo, jardines y matorral mediterráneo",
    events: "Eventos",
    eventsTitle: "Eventos y Noticias",
    eventsDesc: "Descubre los eventos y noticias del pueblo de Tadasuni",
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
    chatWelcome: "¡Hola! Soy el asistente virtual de VisitTadasuni. ¿Cómo puedo ayudarte?",
    howToReach: "Cómo Llegar",
    services: "Servicios",
    gallery: "Galería",
    footer: "© 2025 VisitTadasuni - Municipio de Tadasuni",
    readMore: "Leer más",
    noEvents: "No hay eventos disponibles en este momento.",
    backToHome: "Volver al inicio",
    admin: "Admin"
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
    aboutDesc: "Tadasuni ist ein winziges Dorf in Zentralsardinien, gelegen in der historischen Region Barigadu.",
    attractions: "Attraktionen",
    churches: "Historische Kirchen",
    churchesDesc: "Santa Croce, San Nicola di Bari, San Michele",
    ceramics: "Kunstkeramik",
    ceramicsDesc: "Route der traditionellen sardischen Keramik",
    nature: "Natur & Landschaften",
    natureDesc: "Omodeo-See, Gärten und mediterrane Macchia",
    events: "Veranstaltungen",
    eventsTitle: "Veranstaltungen & Neuigkeiten",
    eventsDesc: "Entdecken Sie Veranstaltungen und Neuigkeiten aus dem Dorf Tadasuni",
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
    chatWelcome: "Hallo! Ich bin der virtuelle Assistent von VisitTadasuni. Wie kann ich Ihnen helfen?",
    howToReach: "Anfahrt",
    services: "Dienstleistungen",
    gallery: "Galerie",
    footer: "© 2025 VisitTadasuni - Gemeinde Tadasuni",
    readMore: "Mehr lesen",
    noEvents: "Derzeit keine Veranstaltungen verfügbar.",
    backToHome: "Zurück zur Startseite",
    admin: "Admin"
  }
};

const languageNames = {
  it: "Italiano",
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch"
};

// Flag images using flag-icons CDN
const languageFlags = {
  it: "https://flagcdn.com/w40/it.png",
  en: "https://flagcdn.com/w40/gb.png",
  fr: "https://flagcdn.com/w40/fr.png",
  es: "https://flagcdn.com/w40/es.png",
  de: "https://flagcdn.com/w40/de.png"
};

// Flag component
const FlagIcon = ({ code, size = 20 }) => (
  <img 
    src={languageFlags[code]} 
    alt={languageNames[code]}
    style={{ width: size, height: Math.round(size * 0.67), objectFit: 'cover', borderRadius: 2 }}
  />
);

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

// Logo URL - use process.env.PUBLIC_URL for correct path in production
const LOGO_URL = process.env.PUBLIC_URL + "/logo-tadasuni.jpg";

// Helper to get localized content
const getLocalizedContent = (item, field, lang) => {
  if (lang === "it") return item[field] || "";
  const localizedField = `${field}_${lang}`;
  return item[localizedField] || item[field] || "";
};

// ============== ATTRACTIONS PAGE (PUBLIC) ==============
const AttractionsPage = ({ lang, t }) => {
  const [attractions, setAttractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttraction, setSelectedAttraction] = useState(null);
  const [mapsApiKey, setMapsApiKey] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchAttractions();
    fetchMapsConfig();
  }, []);

  const fetchAttractions = async () => {
    try {
      const response = await axios.get(`${API}/attractions?published_only=true`);
      setAttractions(response.data);
    } catch (error) {
      console.error("Error fetching attractions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMapsConfig = async () => {
    try {
      const response = await axios.get(`${API}/config/maps`);
      setMapsApiKey(response.data.api_key);
    } catch (error) {
      console.error("Error fetching maps config:", error);
    }
  };

  const getCategoryLabel = (value) => {
    const cat = attractionCategories.find(c => c.value === value);
    return cat ? (lang === "en" ? cat.labelEn : cat.label) : value;
  };

  const filteredAttractions = filter === "all" 
    ? attractions 
    : attractions.filter(a => a.category === filter);

  const getAudioUrl = (attr) => {
    if (lang === "it") return attr.audio_url;
    return attr[`audio_url_${lang}`] || attr.audio_url;
  };

  if (selectedAttraction) {
    const audioUrl = getAudioUrl(selectedAttraction);
    return (
      <div className="min-h-screen bg-stone-50 pt-20">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <button
            onClick={() => setSelectedAttraction(null)}
            className="flex items-center gap-2 text-amber-700 hover:text-amber-800 mb-6"
          >
            <ArrowLeft size={20} />
            {t.backToHome || "Torna indietro"}
          </button>
          
          <article className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Images Gallery */}
            {selectedAttraction.images && selectedAttraction.images.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                {selectedAttraction.images.map((img, idx) => (
                  <img
                    key={img.id}
                    src={`${BACKEND_URL}${img.url}`}
                    alt={`${selectedAttraction.name} ${idx + 1}`}
                    className={`w-full object-cover ${idx === 0 && selectedAttraction.images.length === 1 ? 'h-80 col-span-3' : 'h-64'}`}
                  />
                ))}
              </div>
            )}
            
            <div className="p-8">
              {/* Category badge */}
              <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium mb-4">
                {getCategoryLabel(selectedAttraction.category)}
              </span>
              
              <h1 className="text-3xl font-serif font-bold text-stone-800 mb-4">
                {getLocalizedContent(selectedAttraction, "name", lang)}
              </h1>
              
              {/* Audio Guide */}
              {audioUrl && (
                <div className="bg-amber-50 rounded-xl p-4 mb-6">
                  <p className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                    <Volume2 size={18} /> Audio Guida
                  </p>
                  <audio src={`${BACKEND_URL}${audioUrl}`} controls className="w-full" />
                </div>
              )}
              
              {/* Description */}
              <div className="prose prose-stone max-w-none mb-6">
                <p className="whitespace-pre-wrap text-stone-600 leading-relaxed">
                  {getLocalizedContent(selectedAttraction, "description", lang)}
                </p>
              </div>
              
              {/* Info grid */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {selectedAttraction.opening_hours && (
                  <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                    <Clock size={20} className="text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-stone-800">Orari</p>
                      <p className="text-stone-600 text-sm">{selectedAttraction.opening_hours}</p>
                    </div>
                  </div>
                )}
                {selectedAttraction.price && (
                  <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                    <span className="text-amber-600 text-xl">💰</span>
                    <div>
                      <p className="font-medium text-stone-800">Ingresso</p>
                      <p className="text-stone-600 text-sm">{selectedAttraction.price}</p>
                    </div>
                  </div>
                )}
                {selectedAttraction.contact && (
                  <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                    <Mail size={20} className="text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-stone-800">Contatti</p>
                      <p className="text-stone-600 text-sm">{selectedAttraction.contact}</p>
                    </div>
                  </div>
                )}
                {selectedAttraction.external_link && (
                  <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                    <ExternalLink size={20} className="text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-stone-800">Sito Web</p>
                      <a href={selectedAttraction.external_link} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline text-sm">
                        Visita il sito
                      </a>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Map */}
              {selectedAttraction.latitude && selectedAttraction.longitude && mapsApiKey && (
                <div className="rounded-xl overflow-hidden">
                  <p className="font-medium text-stone-800 mb-2 flex items-center gap-2">
                    <MapPin size={18} className="text-amber-600" /> Posizione
                  </p>
                  <iframe
                    title="Location Map"
                    width="100%"
                    height="300"
                    frameBorder="0"
                    style={{ border: 0, borderRadius: "12px" }}
                    src={`https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${selectedAttraction.latitude},${selectedAttraction.longitude}&zoom=16`}
                    allowFullScreen
                  />
                  <a
                    href={selectedAttraction.google_maps_link || `https://maps.google.com/?q=${selectedAttraction.latitude},${selectedAttraction.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 text-amber-700 hover:text-amber-800 font-medium"
                  >
                    <Map size={18} /> Apri in Google Maps
                  </a>
                </div>
              )}
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold text-stone-800 mb-4">
            {lang === "it" ? "Attrazioni" : lang === "en" ? "Attractions" : lang === "fr" ? "Attractions" : lang === "es" ? "Atracciones" : "Attraktionen"}
          </h1>
          <p className="text-lg text-stone-600">
            {lang === "it" ? "Scopri i luoghi più belli di Tadasuni" : lang === "en" ? "Discover the most beautiful places in Tadasuni" : "Scopri i luoghi più belli di Tadasuni"}
          </p>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full font-medium transition ${filter === "all" ? "bg-amber-600 text-white" : "bg-white text-stone-700 hover:bg-amber-50"}`}
          >
            {lang === "it" ? "Tutti" : "All"}
          </button>
          {attractionCategories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`px-4 py-2 rounded-full font-medium transition ${filter === cat.value ? "bg-amber-600 text-white" : "bg-white text-stone-700 hover:bg-amber-50"}`}
            >
              {lang === "en" ? cat.labelEn : cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
          </div>
        ) : filteredAttractions.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <Landmark size={48} className="mx-auto mb-4 opacity-50" />
            <p>{lang === "it" ? "Nessuna attrazione trovata." : "No attractions found."}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAttractions.map((attr) => (
              <article
                key={attr.id}
                onClick={() => setSelectedAttraction(attr)}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer group"
              >
                <div className="h-48 overflow-hidden bg-stone-200">
                  {attr.images && attr.images.length > 0 ? (
                    <img
                      src={`${BACKEND_URL}${attr.images[0].url}`}
                      alt={attr.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200">
                      <Landmark size={48} className="text-amber-400" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                      {getCategoryLabel(attr.category)}
                    </span>
                    {getAudioUrl(attr) && (
                      <span className="flex items-center gap-1 text-amber-600 text-xs">
                        <Volume2 size={14} /> Audio
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-stone-800 mb-2 line-clamp-1">
                    {getLocalizedContent(attr, "name", lang)}
                  </h2>
                  <p className="text-stone-600 line-clamp-2 text-sm mb-3">
                    {getLocalizedContent(attr, "description", lang)}
                  </p>
                  {attr.latitude && attr.longitude && (
                    <p className="text-amber-600 text-sm flex items-center gap-1">
                      <MapPin size={14} /> {lang === "it" ? "Vedi su mappa" : "View on map"}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-full font-semibold transition"
          >
            <ArrowLeft size={20} />
            {t.backToHome || "Torna alla Home"}
          </Link>
        </div>
      </div>
    </div>
  );
};

// ============== EVENTS PAGE ==============
const EventsPage = ({ lang, t }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/events?published_only=true`);
      setEvents(response.data);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  if (selectedEvent) {
    return (
      <div className="min-h-screen bg-stone-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <button
            onClick={() => setSelectedEvent(null)}
            className="flex items-center gap-2 text-emerald-700 hover:text-emerald-800 mb-6"
          >
            <ArrowLeft size={20} />
            {t.backToHome}
          </button>
          
          <article className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {selectedEvent.images && selectedEvent.images.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-4">
                {selectedEvent.images.map((img, idx) => (
                  <img
                    key={img.id}
                    src={`${BACKEND_URL}${img.url}`}
                    alt={img.caption || `Image ${idx + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ))}
              </div>
            )}
            <div className="p-8">
              <div className="flex items-center gap-4 text-sm text-stone-500 mb-4">
                {selectedEvent.event_date && (
                  <span className="flex items-center gap-1">
                    <Calendar size={16} />
                    {selectedEvent.event_date}
                  </span>
                )}
                {selectedEvent.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={16} />
                    {selectedEvent.location}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-serif font-bold text-stone-800 mb-6">
                {getLocalizedContent(selectedEvent, "title", lang)}
              </h1>
              <div className="prose prose-stone max-w-none">
                <p className="whitespace-pre-wrap text-stone-600 leading-relaxed">
                  {getLocalizedContent(selectedEvent, "content", lang)}
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-stone-800 mb-4">{t.eventsTitle}</h1>
          <p className="text-lg text-stone-600">{t.eventsDesc}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <Calendar size={48} className="mx-auto mb-4 opacity-50" />
            <p>{t.noEvents}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <article
                key={event.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer group"
                onClick={() => setSelectedEvent(event)}
                data-testid={`event-card-${event.id}`}
              >
                <div className="h-48 overflow-hidden bg-stone-200">
                  {event.images && event.images.length > 0 ? (
                    <img
                      src={`${BACKEND_URL}${event.images[0].url}`}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200">
                      <Calendar size={48} className="text-emerald-400" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 text-sm text-stone-500 mb-3">
                    {event.event_date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {event.event_date}
                      </span>
                    )}
                    {event.category && (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                        {event.category}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-stone-800 mb-2 line-clamp-2">
                    {getLocalizedContent(event, "title", lang)}
                  </h2>
                  <p className="text-stone-600 line-clamp-3 mb-4">
                    {getLocalizedContent(event, "content", lang)}
                  </p>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                    {t.readMore} <ExternalLink size={16} />
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-semibold transition"
          >
            <ArrowLeft size={20} />
            {t.backToHome}
          </Link>
        </div>
      </div>
    </div>
  );
};

// ============== ATTRACTIONS ADMIN PANEL ==============
const AttractionsAdminPanel = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("adminToken") || "");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [attractions, setAttractions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAttraction, setEditingAttraction] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(null);
  const [uploadingAudio, setUploadingAudio] = useState(null);
  const [mapsApiKey, setMapsApiKey] = useState("");

  const emptyAttraction = {
    name: "", name_en: "", name_fr: "", name_es: "", name_de: "",
    description: "", description_en: "", description_fr: "", description_es: "", description_de: "",
    category: "monumento",
    google_maps_link: "",
    opening_hours: "",
    price: "",
    contact: "",
    external_link: "",
    published: true
  };

  const [formData, setFormData] = useState(emptyAttraction);

  useEffect(() => {
    if (token) {
      setIsLoggedIn(true);
      fetchAttractions();
      fetchMapsConfig();
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const response = await axios.post(`${API}/admin/login`, loginForm);
      if (response.data.success) {
        setToken(response.data.token);
        localStorage.setItem("adminToken", response.data.token);
        setIsLoggedIn(true);
        fetchAttractions();
        fetchMapsConfig();
      }
    } catch (error) {
      setLoginError("Credenziali non valide");
    }
  };

  const handleLogout = () => {
    setToken("");
    localStorage.removeItem("adminToken");
    setIsLoggedIn(false);
  };

  const fetchAttractions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/attractions?published_only=false`);
      setAttractions(response.data);
    } catch (error) {
      console.error("Error fetching attractions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMapsConfig = async () => {
    try {
      const response = await axios.get(`${API}/config/maps`);
      setMapsApiKey(response.data.api_key);
    } catch (error) {
      console.error("Error fetching maps config:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingAttraction) {
        await axios.put(`${API}/attractions/${editingAttraction.id}`, formData);
      } else {
        await axios.post(`${API}/attractions`, formData);
      }
      fetchAttractions();
      setShowForm(false);
      setEditingAttraction(null);
      setFormData(emptyAttraction);
    } catch (error) {
      console.error("Error saving attraction:", error);
      alert("Errore nel salvataggio");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa attrazione?")) return;
    try {
      await axios.delete(`${API}/attractions/${id}`);
      fetchAttractions();
    } catch (error) {
      alert("Errore nell'eliminazione");
    }
  };

  const handleEdit = (attraction) => {
    setEditingAttraction(attraction);
    setFormData({
      name: attraction.name || "",
      name_en: attraction.name_en || "",
      name_fr: attraction.name_fr || "",
      name_es: attraction.name_es || "",
      name_de: attraction.name_de || "",
      description: attraction.description || "",
      description_en: attraction.description_en || "",
      description_fr: attraction.description_fr || "",
      description_es: attraction.description_es || "",
      description_de: attraction.description_de || "",
      category: attraction.category || "monumento",
      google_maps_link: attraction.google_maps_link || "",
      opening_hours: attraction.opening_hours || "",
      price: attraction.price || "",
      contact: attraction.contact || "",
      external_link: attraction.external_link || "",
      published: attraction.published !== false
    });
    setShowForm(true);
  };

  const handleImageUpload = async (attractionId, file) => {
    if (!file) return;
    setUploadingImage(attractionId);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post(`${API}/attractions/${attractionId}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      fetchAttractions();
    } catch (error) {
      alert(error.response?.data?.detail || "Errore nel caricamento immagine");
    } finally {
      setUploadingImage(null);
    }
  };

  const handleImageDelete = async (attractionId, imageId) => {
    if (!window.confirm("Eliminare questa immagine?")) return;
    try {
      await axios.delete(`${API}/attractions/${attractionId}/images/${imageId}`);
      fetchAttractions();
    } catch (error) {
      alert("Errore nell'eliminazione");
    }
  };

  const handleAudioUpload = async (attractionId, file, language) => {
    if (!file) return;
    setUploadingAudio(`${attractionId}-${language}`);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);
    try {
      await axios.post(`${API}/attractions/${attractionId}/audio`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      fetchAttractions();
    } catch (error) {
      alert(error.response?.data?.detail || "Errore nel caricamento audio");
    } finally {
      setUploadingAudio(null);
    }
  };

  const handleAudioDelete = async (attractionId, language) => {
    if (!window.confirm("Eliminare questo audio?")) return;
    try {
      await axios.delete(`${API}/attractions/${attractionId}/audio/${language}`);
      fetchAttractions();
    } catch (error) {
      alert("Errore nell'eliminazione");
    }
  };

  const togglePublished = async (attraction) => {
    try {
      await axios.put(`${API}/attractions/${attraction.id}`, { published: !attraction.published });
      fetchAttractions();
    } catch (error) {
      alert("Errore nell'aggiornamento");
    }
  };

  const getCategoryLabel = (value) => {
    const cat = attractionCategories.find(c => c.value === value);
    return cat ? cat.label : value;
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-800 to-orange-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <Landmark size={48} className="mx-auto text-amber-600 mb-3" />
            <h1 className="text-2xl font-bold text-gray-800">CMS Attrazioni</h1>
            <p className="text-gray-500 text-sm">Gestione Punti di Interesse</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button type="submit" className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition">
              Accedi
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/" className="text-amber-600 hover:text-amber-700">← Torna al sito</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Landmark size={28} className="text-amber-600" />
            <h1 className="text-xl font-bold text-gray-800">CMS Attrazioni</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-amber-600 hover:text-amber-700 text-sm">Visualizza Sito</Link>
            <Link to="/#/admin" className="text-gray-600 hover:text-gray-700 text-sm">CMS Eventi</Link>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm transition">
              <LogOut size={16} /> Esci
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Actions */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Gestione Attrazioni</h2>
          <button
            onClick={() => { setEditingAttraction(null); setFormData(emptyAttraction); setShowForm(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition"
          >
            <Plus size={20} /> Nuova Attrazione
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-2xl">
                <h3 className="text-xl font-bold text-gray-800">
                  {editingAttraction ? "Modifica Attrazione" : "Nuova Attrazione"}
                </h3>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Italian (required) */}
                <div className="bg-amber-50 rounded-xl p-4">
                  <h4 className="font-semibold text-amber-800 mb-3">🇮🇹 Italiano (obbligatorio)</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione *</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Translations */}
                <details className="bg-gray-50 rounded-xl p-4">
                  <summary className="font-semibold text-gray-700 cursor-pointer">🌍 Traduzioni (opzionale)</summary>
                  <div className="mt-4 space-y-4">
                    {[
                      { code: "en", flag: "🇬🇧", label: "English" },
                      { code: "fr", flag: "🇫🇷", label: "Français" },
                      { code: "es", flag: "🇪🇸", label: "Español" },
                      { code: "de", flag: "🇩🇪", label: "Deutsch" }
                    ].map(lang => (
                      <div key={lang.code} className="border-l-4 border-gray-300 pl-4">
                        <h5 className="font-medium text-gray-700 mb-2">{lang.flag} {lang.label}</h5>
                        <input
                          type="text"
                          placeholder="Nome"
                          value={formData[`name_${lang.code}`]}
                          onChange={(e) => setFormData({ ...formData, [`name_${lang.code}`]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                        />
                        <textarea
                          placeholder="Descrizione"
                          value={formData[`description_${lang.code}`]}
                          onChange={(e) => setFormData({ ...formData, [`description_${lang.code}`]: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </details>

                {/* Category and Maps */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      {attractionCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Map size={16} className="inline mr-1" />
                      Link Google Maps
                    </label>
                    <input
                      type="url"
                      value={formData.google_maps_link}
                      onChange={(e) => setFormData({ ...formData, google_maps_link: e.target.value })}
                      placeholder="https://maps.google.com/..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">Le coordinate verranno estratte automaticamente</p>
                  </div>
                </div>

                {/* Additional info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Orari di Apertura</label>
                    <input
                      type="text"
                      value={formData.opening_hours}
                      onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
                      placeholder="es. Lun-Ven 9:00-18:00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prezzo/Ingresso</label>
                    <input
                      type="text"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="es. Gratuito, €5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contatto</label>
                    <input
                      type="text"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      placeholder="es. +39 0783 123456"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link Esterno</label>
                    <input
                      type="url"
                      value={formData.external_link}
                      onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="published"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="w-5 h-5 rounded text-amber-600"
                  />
                  <label htmlFor="published" className="text-gray-700">Pubblica immediatamente</label>
                </div>

                <div className="flex gap-4 pt-4 border-t">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition">
                    Annulla
                  </button>
                  <button type="submit" disabled={loading} className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2">
                    <Save size={20} /> {loading ? "Salvataggio..." : "Salva"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Attractions List */}
        {loading && attractions.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
          </div>
        ) : attractions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow">
            <Landmark size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Nessuna attrazione creata. Clicca "Nuova Attrazione" per iniziare.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {attractions.map((attr) => (
              <div key={attr.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Images */}
                  <div className="lg:w-1/4">
                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Camera size={16} /> Foto ({attr.images?.length || 0}/3)
                    </p>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {attr.images && attr.images.map((img) => (
                        <div key={img.id} className="relative group">
                          <img src={`${BACKEND_URL}${img.url}`} alt="" className="w-full h-16 object-cover rounded-lg" />
                          <button
                            onClick={() => handleImageDelete(attr.id, img.id)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      {(!attr.images || attr.images.length < 3) && (
                        <label className="w-full h-16 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(attr.id, e.target.files[0])}
                            disabled={uploadingImage === attr.id}
                          />
                          {uploadingImage === attr.id ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-500 border-t-transparent"></div>
                          ) : (
                            <Upload size={14} className="text-gray-400" />
                          )}
                        </label>
                      )}
                    </div>

                    {/* Audio section */}
                    <p className="text-sm font-medium text-gray-700 mb-2 mt-4 flex items-center gap-1">
                      <Volume2 size={16} /> Audio Guide
                    </p>
                    <div className="space-y-1">
                      {[
                        { code: "it", flag: "🇮🇹", field: "audio_url" },
                        { code: "en", flag: "🇬🇧", field: "audio_url_en" },
                        { code: "fr", flag: "🇫🇷", field: "audio_url_fr" },
                        { code: "es", flag: "🇪🇸", field: "audio_url_es" },
                        { code: "de", flag: "🇩🇪", field: "audio_url_de" }
                      ].map(lang => (
                        <div key={lang.code} className="flex items-center gap-2">
                          <span className="text-sm">{lang.flag}</span>
                          {attr[lang.field] ? (
                            <div className="flex items-center gap-1 flex-1">
                              <audio src={`${BACKEND_URL}${attr[lang.field]}`} controls className="h-6 flex-1" style={{maxWidth: "120px"}} />
                              <button
                                onClick={() => handleAudioDelete(attr.id, lang.code)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <label className="flex-1 text-xs text-gray-400 cursor-pointer hover:text-amber-600">
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => handleAudioUpload(attr.id, e.target.files[0], lang.code)}
                                disabled={uploadingAudio === `${attr.id}-${lang.code}`}
                              />
                              {uploadingAudio === `${attr.id}-${lang.code}` ? "Caricamento..." : "+ Carica"}
                            </label>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="lg:w-3/4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-800">{attr.name}</h3>
                          {!attr.published && <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">Bozza</span>}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">{getCategoryLabel(attr.category)}</span>
                          {attr.latitude && attr.longitude && (
                            <a
                              href={attr.google_maps_link || `https://maps.google.com/?q=${attr.latitude},${attr.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <MapPin size={14} /> Vedi su Maps
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePublished(attr)}
                          className={`p-2 rounded-lg transition ${attr.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                        >
                          {attr.published ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                        <button onClick={() => handleEdit(attr)} className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(attr.id)} className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">{attr.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      {attr.opening_hours && <span>🕐 {attr.opening_hours}</span>}
                      {attr.price && <span>💰 {attr.price}</span>}
                      {attr.contact && <span>📞 {attr.contact}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============== CHATBOT ADMIN PANEL ==============
const ChatbotAdminPanel = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("chatbotAdminToken") || "");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState("sources");
  const [sources, setSources] = useState([]);
  const [customKnowledge, setCustomKnowledge] = useState([]);
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [showAddKnowledge, setShowAddKnowledge] = useState(false);
  const [newSource, setNewSource] = useState({ url: "", name: "", description: "", auto_refresh: false, refresh_hours: 24 });
  const [newKnowledge, setNewKnowledge] = useState({ title: "", content: "" });
  const [fetchingSource, setFetchingSource] = useState(null);

  useEffect(() => {
    if (token) {
      setIsLoggedIn(true);
      fetchData();
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const response = await axios.post(`${API}/chatbot/admin/login`, loginForm);
      if (response.data.success) {
        setToken(response.data.token);
        localStorage.setItem("chatbotAdminToken", response.data.token);
        setIsLoggedIn(true);
        fetchData();
      }
    } catch (error) {
      setLoginError("Credenziali non valide");
    }
  };

  const handleLogout = () => {
    setToken("");
    localStorage.removeItem("chatbotAdminToken");
    setIsLoggedIn(false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sourcesRes, knowledgeRes, settingsRes, statsRes] = await Promise.all([
        axios.get(`${API}/chatbot/sources`),
        axios.get(`${API}/chatbot/custom-knowledge`),
        axios.get(`${API}/chatbot/settings`),
        axios.get(`${API}/chatbot/stats`)
      ]);
      setSources(sourcesRes.data);
      setCustomKnowledge(knowledgeRes.data);
      setSettings(settingsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/chatbot/sources`, newSource);
      setNewSource({ url: "", name: "", description: "", auto_refresh: false, refresh_hours: 24 });
      setShowAddSource(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || "Errore nell'aggiunta della fonte");
    }
  };

  const handleFetchSource = async (sourceId) => {
    setFetchingSource(sourceId);
    try {
      await axios.post(`${API}/chatbot/sources/${sourceId}/fetch`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || "Errore nel recupero dei contenuti");
    } finally {
      setFetchingSource(null);
    }
  };

  const handleDeleteSource = async (sourceId) => {
    if (!window.confirm("Eliminare questa fonte?")) return;
    try {
      await axios.delete(`${API}/chatbot/sources/${sourceId}`);
      fetchData();
    } catch (error) {
      alert("Errore nell'eliminazione");
    }
  };

  const handleToggleSource = async (source) => {
    try {
      await axios.put(`${API}/chatbot/sources/${source.id}`, { active: !source.active });
      fetchData();
    } catch (error) {
      alert("Errore nell'aggiornamento");
    }
  };

  const handleAddKnowledge = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/chatbot/custom-knowledge`, newKnowledge);
      setNewKnowledge({ title: "", content: "" });
      setShowAddKnowledge(false);
      fetchData();
    } catch (error) {
      alert("Errore nell'aggiunta");
    }
  };

  const handleDeleteKnowledge = async (id) => {
    if (!window.confirm("Eliminare questa conoscenza?")) return;
    try {
      await axios.delete(`${API}/chatbot/custom-knowledge/${id}`);
      fetchData();
    } catch (error) {
      alert("Errore nell'eliminazione");
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/chatbot/settings`, settings);
      alert("Impostazioni salvate!");
      fetchData();
    } catch (error) {
      alert("Errore nel salvataggio");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active": return <CheckCircle className="text-green-500" size={18} />;
      case "error": return <AlertCircle className="text-red-500" size={18} />;
      case "pending": return <Clock className="text-amber-500" size={18} />;
      default: return <Clock className="text-gray-400" size={18} />;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <Bot size={48} className="mx-auto text-indigo-600 mb-3" />
            <h1 className="text-2xl font-bold text-gray-800">Chatbot Admin</h1>
            <p className="text-gray-500 text-sm">Gestione Knowledge Base</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
                data-testid="chatbot-admin-username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
                data-testid="chatbot-admin-password"
              />
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition"
              data-testid="chatbot-admin-login-btn"
            >
              Accedi
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/" className="text-indigo-600 hover:text-indigo-700">← Torna al sito</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Bot size={28} className="text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-800">Chatbot Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-indigo-600 hover:text-indigo-700 text-sm">Visualizza Sito</Link>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm transition">
              <LogOut size={16} /> Esci
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <Database className="text-indigo-500 mb-2" size={24} />
              <p className="text-2xl font-bold text-gray-800">{stats.active_sources}</p>
              <p className="text-sm text-gray-500">Fonti Attive</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <FileText className="text-purple-500 mb-2" size={24} />
              <p className="text-2xl font-bold text-gray-800">{stats.custom_knowledge_entries}</p>
              <p className="text-sm text-gray-500">Knowledge Custom</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("sources")}
            className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === "sources" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
          >
            <Link2 size={18} className="inline mr-2" />
            Fonti Web
          </button>
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === "knowledge" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
          >
            <FileText size={18} className="inline mr-2" />
            Knowledge Custom
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === "settings" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
          >
            <Settings size={18} className="inline mr-2" />
            Impostazioni
          </button>
        </div>

        {/* Sources Tab */}
        {activeTab === "sources" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Fonti Web</h2>
              <button
                onClick={() => setShowAddSource(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
              >
                <Plus size={18} /> Aggiungi Fonte
              </button>
            </div>

            {/* Add Source Modal */}
            {showAddSource && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Aggiungi Fonte Web</h3>
                  <form onSubmit={handleAddSource} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">URL del sito *</label>
                      <input
                        type="url"
                        value={newSource.url}
                        onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                        placeholder="https://esempio.com/pagina"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome fonte *</label>
                      <input
                        type="text"
                        value={newSource.name}
                        onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                        placeholder="es. Sito Comune Tadasuni"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                      <textarea
                        value={newSource.description}
                        onChange={(e) => setNewSource({ ...newSource, description: e.target.value })}
                        placeholder="Breve descrizione della fonte..."
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex gap-4">
                      <button type="button" onClick={() => setShowAddSource(false)} className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition">
                        Annulla
                      </button>
                      <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition">
                        Aggiungi
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Sources List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
              </div>
            ) : sources.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <Link2 size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Nessuna fonte aggiunta. Clicca "Aggiungi Fonte" per iniziare.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sources.map((source) => (
                  <div key={source.id} className="bg-white rounded-xl shadow-sm p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(source.status)}
                          <h3 className="font-bold text-gray-800">{source.name}</h3>
                          {!source.active && <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">Disattivato</span>}
                        </div>
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-sm hover:underline break-all">
                          {source.url}
                        </a>
                        {source.description && <p className="text-gray-500 text-sm mt-1">{source.description}</p>}
                        {source.last_fetched && (
                          <p className="text-gray-400 text-xs mt-2">Ultimo aggiornamento: {new Date(source.last_fetched).toLocaleString()}</p>
                        )}
                        {source.error_message && (
                          <p className="text-red-500 text-xs mt-1">Errore: {source.error_message}</p>
                        )}
                        {source.content_summary && (
                          <details className="mt-2">
                            <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">Anteprima contenuto</summary>
                            <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded max-h-32 overflow-auto">{source.content_summary}</p>
                          </details>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleFetchSource(source.id)}
                          disabled={fetchingSource === source.id}
                          className="p-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg transition disabled:opacity-50"
                          title="Aggiorna contenuti"
                        >
                          <RefreshCw size={18} className={fetchingSource === source.id ? "animate-spin" : ""} />
                        </button>
                        <button
                          onClick={() => handleToggleSource(source)}
                          className={`p-2 rounded-lg transition ${source.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                          title={source.active ? "Disattiva" : "Attiva"}
                        >
                          {source.active ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                        <button
                          onClick={() => handleDeleteSource(source.id)}
                          className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition"
                          title="Elimina"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Custom Knowledge Tab */}
        {activeTab === "knowledge" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Knowledge Personalizzata</h2>
              <button
                onClick={() => setShowAddKnowledge(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
              >
                <Plus size={18} /> Aggiungi Knowledge
              </button>
            </div>

            {/* Add Knowledge Modal */}
            {showAddKnowledge && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Aggiungi Knowledge Personalizzata</h3>
                  <form onSubmit={handleAddKnowledge} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
                      <input
                        type="text"
                        value={newKnowledge.title}
                        onChange={(e) => setNewKnowledge({ ...newKnowledge, title: e.target.value })}
                        placeholder="es. Orari di apertura museo"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contenuto *</label>
                      <textarea
                        value={newKnowledge.content}
                        onChange={(e) => setNewKnowledge({ ...newKnowledge, content: e.target.value })}
                        placeholder="Inserisci qui le informazioni che il chatbot deve conoscere..."
                        rows={8}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <div className="flex gap-4">
                      <button type="button" onClick={() => setShowAddKnowledge(false)} className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition">
                        Annulla
                      </button>
                      <button type="submit" className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition">
                        Aggiungi
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Knowledge List */}
            {customKnowledge.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <FileText size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Nessuna knowledge personalizzata. Aggiungi informazioni che il chatbot deve conoscere.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {customKnowledge.map((k) => (
                  <div key={k.id} className="bg-white rounded-xl shadow-sm p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 mb-2">{k.title}</h3>
                        <p className="text-gray-600 text-sm whitespace-pre-wrap">{k.content}</p>
                        <p className="text-gray-400 text-xs mt-2">Aggiunto: {new Date(k.created_at).toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteKnowledge(k.id)}
                        className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition ml-4"
                        title="Elimina"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && settings && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6">Impostazioni Chatbot</h2>
            <form onSubmit={handleUpdateSettings} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Bot</label>
                <input
                  type="text"
                  value={settings.bot_name || ""}
                  onChange={(e) => setSettings({ ...settings, bot_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                <textarea
                  value={settings.system_prompt || ""}
                  onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Istruzioni per il comportamento del chatbot..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
                  <input
                    type="number"
                    value={settings.max_tokens || 500}
                    onChange={(e) => setSettings({ ...settings, max_tokens: parseInt(e.target.value) })}
                    min={100}
                    max={2000}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (0-1)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.temperature || 0.7}
                    onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                    min={0}
                    max={1}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <details className="bg-gray-50 rounded-lg p-4">
                <summary className="font-medium text-gray-700 cursor-pointer">Messaggi di benvenuto multilingue</summary>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">🇮🇹 Italiano</label>
                    <input
                      type="text"
                      value={settings.welcome_message || ""}
                      onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">🇬🇧 English</label>
                    <input
                      type="text"
                      value={settings.welcome_message_en || ""}
                      onChange={(e) => setSettings({ ...settings, welcome_message_en: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">🇫🇷 Français</label>
                    <input
                      type="text"
                      value={settings.welcome_message_fr || ""}
                      onChange={(e) => setSettings({ ...settings, welcome_message_fr: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">🇪🇸 Español</label>
                    <input
                      type="text"
                      value={settings.welcome_message_es || ""}
                      onChange={(e) => setSettings({ ...settings, welcome_message_es: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">🇩🇪 Deutsch</label>
                    <input
                      type="text"
                      value={settings.welcome_message_de || ""}
                      onChange={(e) => setSettings({ ...settings, welcome_message_de: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </details>

              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2">
                <Save size={20} /> Salva Impostazioni
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

// ============== ADMIN PANEL ==============
const AdminPanel = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("adminToken") || "");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const emptyEvent = {
    title: "",
    title_en: "",
    title_fr: "",
    title_es: "",
    title_de: "",
    content: "",
    content_en: "",
    content_fr: "",
    content_es: "",
    content_de: "",
    event_date: "",
    location: "",
    category: "evento",
    published: true
  };

  const [formData, setFormData] = useState(emptyEvent);

  useEffect(() => {
    if (token) {
      setIsLoggedIn(true);
      fetchEvents();
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const response = await axios.post(`${API}/admin/login`, loginForm);
      if (response.data.success) {
        setToken(response.data.token);
        localStorage.setItem("adminToken", response.data.token);
        setIsLoggedIn(true);
        fetchEvents();
      }
    } catch (error) {
      setLoginError("Credenziali non valide");
    }
  };

  const handleLogout = () => {
    setToken("");
    localStorage.removeItem("adminToken");
    setIsLoggedIn(false);
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/events?published_only=false`);
      setEvents(response.data);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingEvent) {
        await axios.put(`${API}/events/${editingEvent.id}`, formData);
      } else {
        await axios.post(`${API}/events`, formData);
      }
      fetchEvents();
      setShowForm(false);
      setEditingEvent(null);
      setFormData(emptyEvent);
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Errore nel salvataggio");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo evento?")) return;
    try {
      await axios.delete(`${API}/events/${eventId}`);
      fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Errore nell'eliminazione");
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || "",
      title_en: event.title_en || "",
      title_fr: event.title_fr || "",
      title_es: event.title_es || "",
      title_de: event.title_de || "",
      content: event.content || "",
      content_en: event.content_en || "",
      content_fr: event.content_fr || "",
      content_es: event.content_es || "",
      content_de: event.content_de || "",
      event_date: event.event_date || "",
      location: event.location || "",
      category: event.category || "evento",
      published: event.published !== false
    });
    setShowForm(true);
  };

  const handleImageUpload = async (eventId, file) => {
    if (!file) return;
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post(`${API}/events/${eventId}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      fetchEvents();
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(error.response?.data?.detail || "Errore nel caricamento immagine");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDelete = async (eventId, imageId) => {
    if (!window.confirm("Eliminare questa immagine?")) return;
    try {
      await axios.delete(`${API}/events/${eventId}/images/${imageId}`);
      fetchEvents();
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  const togglePublished = async (event) => {
    try {
      await axios.put(`${API}/events/${event.id}`, { published: !event.published });
      fetchEvents();
    } catch (error) {
      console.error("Error toggling published:", error);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-stone-800 mb-6 text-center">Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
                data-testid="admin-username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
                data-testid="admin-password"
              />
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
              data-testid="admin-login-btn"
            >
              Accedi
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/" className="text-emerald-600 hover:text-emerald-700">
              ← Torna al sito
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Admin Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-stone-800">🏛️ VisitTadasuni - Admin CMS</h1>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-emerald-600 hover:text-emerald-700 text-sm">
              Visualizza Sito
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-stone-200 hover:bg-stone-300 rounded-lg text-sm transition"
            >
              <LogOut size={16} /> Esci
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Actions */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-stone-800">Gestione Eventi</h2>
          <button
            onClick={() => {
              setEditingEvent(null);
              setFormData(emptyEvent);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
            data-testid="add-event-btn"
          >
            <Plus size={20} /> Nuovo Evento
          </button>
        </div>

        {/* Event Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-bold text-stone-800">
                  {editingEvent ? "Modifica Evento" : "Nuovo Evento"}
                </h3>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-stone-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Italian (required) */}
                <div className="bg-emerald-50 rounded-xl p-4">
                  <h4 className="font-semibold text-emerald-800 mb-3">🇮🇹 Italiano (obbligatorio)</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Titolo *</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        required
                        data-testid="event-title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Contenuto *</label>
                      <textarea
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        rows={5}
                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        required
                        data-testid="event-content"
                      />
                    </div>
                  </div>
                </div>

                {/* Other languages */}
                <details className="bg-stone-50 rounded-xl p-4">
                  <summary className="font-semibold text-stone-700 cursor-pointer">
                    🌍 Traduzioni (opzionale)
                  </summary>
                  <div className="mt-4 space-y-6">
                    {/* English */}
                    <div className="border-l-4 border-blue-400 pl-4">
                      <h5 className="font-medium text-stone-700 mb-2">🇬🇧 English</h5>
                      <input
                        type="text"
                        placeholder="Title"
                        value={formData.title_en}
                        onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg mb-2"
                      />
                      <textarea
                        placeholder="Content"
                        value={formData.content_en}
                        onChange={(e) => setFormData({ ...formData, content_en: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                      />
                    </div>
                    {/* French */}
                    <div className="border-l-4 border-blue-600 pl-4">
                      <h5 className="font-medium text-stone-700 mb-2">🇫🇷 Français</h5>
                      <input
                        type="text"
                        placeholder="Titre"
                        value={formData.title_fr}
                        onChange={(e) => setFormData({ ...formData, title_fr: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg mb-2"
                      />
                      <textarea
                        placeholder="Contenu"
                        value={formData.content_fr}
                        onChange={(e) => setFormData({ ...formData, content_fr: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                      />
                    </div>
                    {/* Spanish */}
                    <div className="border-l-4 border-yellow-500 pl-4">
                      <h5 className="font-medium text-stone-700 mb-2">🇪🇸 Español</h5>
                      <input
                        type="text"
                        placeholder="Título"
                        value={formData.title_es}
                        onChange={(e) => setFormData({ ...formData, title_es: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg mb-2"
                      />
                      <textarea
                        placeholder="Contenido"
                        value={formData.content_es}
                        onChange={(e) => setFormData({ ...formData, content_es: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                      />
                    </div>
                    {/* German */}
                    <div className="border-l-4 border-stone-800 pl-4">
                      <h5 className="font-medium text-stone-700 mb-2">🇩🇪 Deutsch</h5>
                      <input
                        type="text"
                        placeholder="Titel"
                        value={formData.title_de}
                        onChange={(e) => setFormData({ ...formData, title_de: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg mb-2"
                      />
                      <textarea
                        placeholder="Inhalt"
                        value={formData.content_de}
                        onChange={(e) => setFormData({ ...formData, content_de: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                      />
                    </div>
                  </div>
                </details>

                {/* Meta fields */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Data Evento</label>
                    <input
                      type="text"
                      placeholder="es. 8 Agosto 2025"
                      value={formData.event_date}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Luogo</label>
                    <input
                      type="text"
                      placeholder="es. Piazza Santa Croce"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Categoria</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg"
                    >
                      <option value="evento">Evento</option>
                      <option value="notizia">Notizia</option>
                      <option value="cultura">Cultura</option>
                      <option value="musica">Musica</option>
                      <option value="tradizione">Tradizione</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="published"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="w-5 h-5 rounded text-emerald-600"
                  />
                  <label htmlFor="published" className="text-stone-700">Pubblica immediatamente</label>
                </div>

                <div className="flex gap-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-3 bg-stone-200 hover:bg-stone-300 rounded-lg font-semibold transition"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                    data-testid="save-event-btn"
                  >
                    <Save size={20} />
                    {loading ? "Salvataggio..." : "Salva"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Events List */}
        {loading && events.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow">
            <Calendar size={48} className="mx-auto mb-4 text-stone-400" />
            <p className="text-stone-500">Nessun evento creato. Clicca "Nuovo Evento" per iniziare.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-6"
                data-testid={`admin-event-${event.id}`}
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Images */}
                  <div className="lg:w-1/3">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {event.images && event.images.map((img) => (
                        <div key={img.id} className="relative group">
                          <img
                            src={`${BACKEND_URL}${img.url}`}
                            alt=""
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => handleImageDelete(event.id, img.id)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {(!event.images || event.images.length < 3) && (
                        <label className="w-full h-20 border-2 border-dashed border-stone-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(event.id, e.target.files[0])}
                            disabled={uploadingImage}
                          />
                          {uploadingImage ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent"></div>
                          ) : (
                            <>
                              <Upload size={16} className="text-stone-400" />
                              <span className="text-xs text-stone-400 mt-1">Aggiungi</span>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 text-center">
                      {event.images?.length || 0}/3 immagini
                    </p>
                  </div>

                  {/* Content */}
                  <div className="lg:w-2/3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-stone-800">{event.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-stone-500 mt-1">
                          {event.event_date && (
                            <span className="flex items-center gap-1">
                              <Calendar size={14} /> {event.event_date}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={14} /> {event.location}
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-stone-100 rounded text-xs">
                            {event.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePublished(event)}
                          className={`p-2 rounded-lg transition ${
                            event.published
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                          }`}
                          title={event.published ? "Pubblicato" : "Bozza"}
                        >
                          {event.published ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                        <button
                          onClick={() => handleEdit(event)}
                          className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <p className="text-stone-600 line-clamp-2">{event.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============== HOME PAGE ==============
const HomePage = ({ lang, setLang, t }) => {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showDigitalTwin, setShowDigitalTwin] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "", consent: false });
  const [contactStatus, setContactStatus] = useState(null);
  const [latestEvents, setLatestEvents] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    setChatMessages([{ role: "assistant", content: t.chatWelcome }]);
  }, [lang, t.chatWelcome]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    fetchLatestEvents();
  }, []);

  const fetchLatestEvents = async () => {
    try {
      const response = await axios.get(`${API}/events?published_only=true`);
      setLatestEvents(response.data.slice(0, 3));
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

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
            <Link to="/" className="flex items-center gap-3">
              <img src={LOGO_URL} alt="VisitTadasuni" className="h-10 w-10 rounded-full object-cover shadow-sm" />
              <span className="text-2xl font-serif font-bold text-emerald-800">VisitTadasuni</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection("about")} className="text-stone-700 hover:text-emerald-700 transition">{t.about}</button>
              <button onClick={() => scrollToSection("digital-twin")} className="text-stone-700 hover:text-emerald-700 transition">{t.digitalTwin}</button>
              <Link to="/attrazioni" className="text-stone-700 hover:text-emerald-700 transition">{t.attractions}</Link>
              <Link to="/eventi" className="text-stone-700 hover:text-emerald-700 transition">{t.events}</Link>
              <button onClick={() => scrollToSection("contact")} className="text-stone-700 hover:text-emerald-700 transition">{t.contact}</button>
              
              <div className="relative">
                <button 
                  onClick={() => setShowLangMenu(!showLangMenu)} 
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 transition"
                >
                  <FlagIcon code={lang} size={24} />
                  <span>{languageNames[lang]}</span>
                  <ChevronDown size={16} />
                </button>
                {showLangMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 border">
                    {Object.entries(languageNames).map(([code, name]) => (
                      <button
                        key={code}
                        onClick={() => { setLang(code); setShowLangMenu(false); }}
                        className={`w-full text-left px-4 py-2 hover:bg-emerald-50 flex items-center gap-3 ${lang === code ? "bg-emerald-100 text-emerald-800" : ""}`}
                      >
                        <FlagIcon code={code} size={24} />
                        <span>{name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
              <Menu size={24} />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 py-4 space-y-3">
              <button onClick={() => scrollToSection("about")} className="block w-full text-left py-2">{t.about}</button>
              <button onClick={() => scrollToSection("digital-twin")} className="block w-full text-left py-2">{t.digitalTwin}</button>
              <Link to="/attrazioni" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left py-2">{t.attractions}</Link>
              <Link to="/eventi" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left py-2">{t.events}</Link>
              <button onClick={() => scrollToSection("contact")} className="block w-full text-left py-2">{t.contact}</button>
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {Object.entries(languageNames).map(([code, name]) => (
                  <button
                    key={code}
                    onClick={() => { setLang(code); setMobileMenuOpen(false); }}
                    className={`px-3 py-2 rounded-full text-sm flex items-center gap-2 ${lang === code ? "bg-emerald-600 text-white" : "bg-stone-200"}`}
                  >
                    <FlagIcon code={code} size={20} />
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${images.hero})` }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60"></div>
        </div>
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 drop-shadow-lg animate-fade-in">{t.heroTitle}</h1>
          <p className="text-xl md:text-2xl mb-8 drop-shadow-md opacity-90">{t.heroSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => scrollToSection("about")} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-full text-lg font-semibold transition transform hover:scale-105 shadow-lg">
              {t.discover}
            </button>
            <button onClick={() => scrollToSection("digital-twin")} className="px-8 py-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-lg font-semibold transition border-2 border-white">
              {t.digitalTwin}
            </button>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown size={40} className="text-white opacity-70" />
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 px-4">
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
              <img src={images.vista1} alt="Vista" className="rounded-2xl shadow-lg h-48 w-full object-cover" />
              <img src={images.sanMichele} alt="San Michele" className="rounded-2xl shadow-lg h-48 w-full object-cover mt-8" />
            </div>
          </div>
        </div>
      </section>

      {/* Digital Twin */}
      <section id="digital-twin" className="py-20 px-4 bg-gradient-to-br from-emerald-900 to-stone-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-serif font-bold text-white mb-4">{t.digitalTwin}</h2>
            <p className="text-xl text-emerald-200">{t.digitalTwinDesc}</p>
          </div>
          
          {!showDigitalTwin ? (
            <div className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer group" onClick={() => setShowDigitalTwin(true)}>
              <img src={images.hero} alt="Digital Twin" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 group-hover:scale-110 transition">
                  <Play size={48} className="text-white ml-1" />
                </div>
              </div>
              <button className="absolute bottom-6 left-1/2 -translate-x-1/2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-semibold flex items-center gap-2 transition">
                {t.exploreNow} <ExternalLink size={18} />
              </button>
            </div>
          ) : (
            <div className="relative aspect-video rounded-2xl overflow-hidden">
              <iframe src="https://tour.fairsgate.com/tour/tadasuni" title="Tadasuni Digital Twin" className="w-full h-full" allow="fullscreen" allowFullScreen />
              <button onClick={() => setShowDigitalTwin(false)} className="absolute top-4 right-4 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition">
                <X size={24} className="text-stone-800" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Attractions */}
      <section id="attractions" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-serif font-bold text-stone-800 text-center mb-12">{t.attractions}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden group hover:shadow-xl transition">
              <div className="h-48 overflow-hidden">
                <img src={images.santaCroce} alt="Churches" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
              </div>
              <div className="p-6">
                <Church className="text-emerald-600 mb-3" size={32} />
                <h3 className="text-xl font-bold text-stone-800 mb-2">{t.churches}</h3>
                <p className="text-stone-600">{t.churchesDesc}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden group hover:shadow-xl transition">
              <div className="h-48 overflow-hidden">
                <img src={images.pietra} alt="Ceramics" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
              </div>
              <div className="p-6">
                <Palette className="text-amber-600 mb-3" size={32} />
                <h3 className="text-xl font-bold text-stone-800 mb-2">{t.ceramics}</h3>
                <p className="text-stone-600">{t.ceramicsDesc}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden group hover:shadow-xl transition">
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

      {/* Events Preview */}
      {latestEvents.length > 0 && (
        <section className="py-20 px-4 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-4xl font-serif font-bold text-stone-800">{t.eventsTitle}</h2>
              <Link to="/eventi" className="flex items-center gap-2 text-emerald-700 hover:text-emerald-800 font-semibold">
                {t.readMore} <ExternalLink size={18} />
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {latestEvents.map((event) => (
                <Link key={event.id} to="/eventi" className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition group">
                  <div className="h-40 overflow-hidden bg-stone-200">
                    {event.images && event.images.length > 0 ? (
                      <img src={`${BACKEND_URL}${event.images[0].url}`} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200">
                        <Calendar size={40} className="text-amber-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-stone-800 mb-2 line-clamp-1">{getLocalizedContent(event, "title", lang)}</h3>
                    <p className="text-stone-600 text-sm line-clamp-2">{getLocalizedContent(event, "content", lang)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section id="contact" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-serif font-bold text-stone-800 text-center mb-12">{t.contactTitle}</h2>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleContact} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-stone-700 font-medium mb-2">{t.name}</label>
                  <input type="text" required value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-2">{t.email}</label>
                  <input type="email" required value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-2">{t.phone}</label>
                <input type="tel" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-2">{t.message}</label>
                <textarea required rows={5} value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
              <div className="flex items-start gap-3">
                <input type="checkbox" id="consent" checked={contactForm.consent} onChange={(e) => setContactForm({ ...contactForm, consent: e.target.checked })} className="mt-1 w-5 h-5 rounded text-emerald-600" />
                <label htmlFor="consent" className="text-stone-600 text-sm">{t.consent}</label>
              </div>
              {contactStatus === "success" && <div className="bg-emerald-50 text-emerald-800 px-4 py-3 rounded-lg">Messaggio inviato con successo!</div>}
              {contactStatus === "error" && <div className="bg-red-50 text-red-800 px-4 py-3 rounded-lg">Errore nell'invio. Riprova.</div>}
              <button type="submit" disabled={!contactForm.consent} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white rounded-lg font-semibold transition">
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
              <div className="flex items-center gap-3 mb-4">
                <img src={LOGO_URL} alt="VisitTadasuni" className="h-12 w-12 rounded-full object-cover" />
                <h3 className="text-xl font-serif font-bold">VisitTadasuni</h3>
              </div>
              <p className="text-stone-400">Tra lago, colline e tradizioni</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Link Utili</h4>
              <div className="space-y-2">
                <a href="https://comune.tadasuni.or.it/" target="_blank" rel="noopener noreferrer" className="block text-stone-400 hover:text-white transition">Comune di Tadasuni</a>
                <a href="https://dromosfestival.it/" target="_blank" rel="noopener noreferrer" className="block text-stone-400 hover:text-white transition">Dromos Festival</a>
                <Link to="/attrazioni" className="block text-stone-400 hover:text-white transition">{t.attractions}</Link>
                <Link to="/eventi" className="block text-stone-400 hover:text-white transition">{t.events}</Link>
                <Link to="/admin" className="block text-stone-400 hover:text-white transition">{t.admin}</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t.contact}</h4>
              <div className="space-y-2 text-stone-400">
                <p className="flex items-center gap-2"><MapPin size={18} /> Tadasuni (OR), Sardegna</p>
                <p className="flex items-center gap-2"><Mail size={18} /> info@comune.tadasuni.or.it</p>
              </div>
            </div>
          </div>
          <div className="border-t border-stone-800 pt-8 flex flex-col md:flex-row justify-between items-center text-stone-500 text-sm gap-4">
            <p className="text-stone-400">Trivor srl - Fairsgate srl ©</p>
            <p>{t.footer}</p>
          </div>
        </div>
      </footer>

      {/* Chat Button */}
      <button onClick={() => setChatOpen(!chatOpen)} className="fixed bottom-6 right-6 w-16 h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl flex items-center justify-center transition transform hover:scale-110 z-50">
        {chatOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </button>

      {/* Chat Window */}
      {chatOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="bg-emerald-600 text-white px-6 py-4">
            <h3 className="font-semibold">{t.chatTitle}</h3>
            <p className="text-sm text-emerald-100">Online - {languageNames[lang]}</p>
          </div>
          <div className="h-80 overflow-y-auto p-4 space-y-4 bg-stone-50">
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
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === "Enter" && sendMessage()} placeholder={t.chatPlaceholder} className="flex-1 px-4 py-2 rounded-full border border-stone-300 focus:ring-2 focus:ring-emerald-500" />
              <button onClick={sendMessage} disabled={chatLoading || !chatInput.trim()} className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white rounded-full flex items-center justify-center transition">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============== MAIN APP ==============
function App() {
  const [lang, setLang] = useState("it");
  const t = translations[lang];

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage lang={lang} setLang={setLang} t={t} />} />
        <Route path="/eventi" element={<EventsPage lang={lang} t={t} />} />
        <Route path="/attrazioni" element={<AttractionsPage lang={lang} t={t} />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/attrazioni-admin" element={<AttractionsAdminPanel />} />
        <Route path="/chatbot-admin" element={<ChatbotAdminPanel />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
