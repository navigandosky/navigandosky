import { useState, useEffect, useRef } from "react";
import "@/App.css";
import { HashRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { MessageCircle, X, Send, Globe, Menu, ChevronDown, ChevronUp, MapPin, Mail, Calendar, Church, Palette, Trees, ExternalLink, Play, Plus, Trash2, Edit, Upload, Image, LogOut, Eye, EyeOff, ArrowLeft, Save, Bot, Link2, FileText, Settings, RefreshCw, CheckCircle, AlertCircle, Clock, Database, Volume2, Map, Landmark, Camera, Utensils, Bed, Navigation } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

// Categories for attractions
const attractionCategories = [
  // Attrazioni
  { value: "chiesa", label: "Chiesa", labelEn: "Church", group: "attrazioni" },
  { value: "monumento", label: "Monumento", labelEn: "Monument", group: "attrazioni" },
  { value: "archeologia", label: "Sito Archeologico", labelEn: "Archaeological Site", group: "attrazioni" },
  { value: "natura", label: "Natura", labelEn: "Nature", group: "attrazioni" },
  { value: "museo", label: "Museo", labelEn: "Museum", group: "attrazioni" },
  // Dove Mangiare
  { value: "ristorante", label: "Ristorante", labelEn: "Restaurant", group: "mangiare", icon: "🍽️" },
  { value: "pizzeria", label: "Pizzeria", labelEn: "Pizzeria", group: "mangiare", icon: "🍕" },
  { value: "bar", label: "Bar / Caffè", labelEn: "Bar / Café", group: "mangiare", icon: "☕" },
  { value: "agriturismo_rist", label: "Agriturismo", labelEn: "Farm Restaurant", group: "mangiare", icon: "🌾" },
  // Dove Dormire
  { value: "hotel", label: "Hotel", labelEn: "Hotel", group: "dormire", icon: "🏨" },
  { value: "b&b", label: "B&B", labelEn: "B&B", group: "dormire", icon: "🛏️" },
  { value: "agriturismo", label: "Agriturismo", labelEn: "Farm Stay", group: "dormire", icon: "🏡" },
  { value: "casa_vacanze", label: "Casa Vacanze", labelEn: "Holiday Home", group: "dormire", icon: "🏠" },
  // Itinerari
  { value: "itinerario", label: "Itinerario", labelEn: "Itinerary", group: "itinerari", icon: "🚶" },
  // Altro
  { value: "altro", label: "Altro", labelEn: "Other", group: "altro" }
];

const cuisineTypes = [
  { value: "sarda", label: "Cucina Sarda" },
  { value: "italiana", label: "Cucina Italiana" },
  { value: "pizza", label: "Pizza" },
  { value: "pesce", label: "Pesce" },
  { value: "carne", label: "Carne" },
  { value: "vegetariano", label: "Vegetariano" },
  { value: "misto", label: "Misto" }
];

const priceRanges = [
  { value: "€", label: "€ - Economico" },
  { value: "€€", label: "€€ - Medio" },
  { value: "€€€", label: "€€€ - Alto" }
];

const difficultyLevels = [
  { value: "facile", label: "Facile", labelEn: "Easy" },
  { value: "medio", label: "Medio", labelEn: "Medium" },
  { value: "difficile", label: "Difficile", labelEn: "Hard" }
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
    return cat ? (cat.icon ? `${cat.icon} ` : "") + (lang === "en" ? cat.labelEn : cat.label) : value;
  };

  const filteredAttractions = filter === "all" 
    ? attractions 
    : filter === "attrazioni" 
      ? attractions.filter(a => ["chiesa", "monumento", "archeologia", "natura", "museo"].includes(a.category))
      : filter === "mangiare"
        ? attractions.filter(a => ["ristorante", "pizzeria", "bar", "agriturismo_rist"].includes(a.category))
        : filter === "dormire"
          ? attractions.filter(a => ["hotel", "b&b", "agriturismo", "casa_vacanze"].includes(a.category))
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
                      <p className="font-medium text-stone-800">{lang === "it" ? "Contatti" : "Contacts"}</p>
                      <p className="text-stone-600 text-sm">{selectedAttraction.contact}</p>
                    </div>
                  </div>
                )}
                {selectedAttraction.external_link && (
                  <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                    <ExternalLink size={20} className="text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-stone-800">{lang === "it" ? "Sito Web" : "Website"}</p>
                      <a href={selectedAttraction.external_link} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline text-sm">
                        {lang === "it" ? "Visita il sito" : "Visit website"}
                      </a>
                    </div>
                  </div>
                )}
                {/* Restaurant specific */}
                {selectedAttraction.cuisine_type && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <span className="text-xl">🍴</span>
                    <div>
                      <p className="font-medium text-stone-800">{lang === "it" ? "Tipo Cucina" : "Cuisine Type"}</p>
                      <p className="text-stone-600 text-sm">{cuisineTypes.find(c => c.value === selectedAttraction.cuisine_type)?.label || selectedAttraction.cuisine_type}</p>
                    </div>
                  </div>
                )}
                {selectedAttraction.price_range && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <span className="text-xl">💰</span>
                    <div>
                      <p className="font-medium text-stone-800">{lang === "it" ? "Fascia Prezzo" : "Price Range"}</p>
                      <p className="text-stone-600 text-sm font-semibold">{selectedAttraction.price_range}</p>
                    </div>
                  </div>
                )}
                {selectedAttraction.reservation_link && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg col-span-2">
                    <ExternalLink size={20} className="text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-stone-800">{lang === "it" ? "Prenota" : "Book"}</p>
                      <a href={selectedAttraction.reservation_link} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline text-sm">
                        {lang === "it" ? "Prenota un tavolo" : "Book a table"}
                      </a>
                    </div>
                  </div>
                )}
                {/* Accommodation specific */}
                {selectedAttraction.stars && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-xl">⭐</span>
                    <div>
                      <p className="font-medium text-stone-800">{lang === "it" ? "Classificazione" : "Rating"}</p>
                      <p className="text-yellow-500">{"⭐".repeat(selectedAttraction.stars)}</p>
                    </div>
                  </div>
                )}
                {selectedAttraction.amenities && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-xl">🛎️</span>
                    <div>
                      <p className="font-medium text-stone-800">{lang === "it" ? "Servizi" : "Amenities"}</p>
                      <p className="text-stone-600 text-sm">{selectedAttraction.amenities}</p>
                    </div>
                  </div>
                )}
                {selectedAttraction.booking_link && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg col-span-2">
                    <ExternalLink size={20} className="text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-stone-800">{lang === "it" ? "Prenota" : "Book"}</p>
                      <a href={selectedAttraction.booking_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                        {lang === "it" ? "Prenota ora" : "Book now"}
                      </a>
                    </div>
                  </div>
                )}
                {/* Itinerary specific */}
                {selectedAttraction.duration && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <span className="text-xl">⏱️</span>
                    <div>
                      <p className="font-medium text-stone-800">{lang === "it" ? "Durata" : "Duration"}</p>
                      <p className="text-stone-600 text-sm">{selectedAttraction.duration}</p>
                    </div>
                  </div>
                )}
                {selectedAttraction.difficulty && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <span className="text-xl">📊</span>
                    <div>
                      <p className="font-medium text-stone-800">{lang === "it" ? "Difficoltà" : "Difficulty"}</p>
                      <p className="text-stone-600 text-sm">{difficultyLevels.find(d => d.value === selectedAttraction.difficulty)?.[lang === "en" ? "labelEn" : "label"] || selectedAttraction.difficulty}</p>
                    </div>
                  </div>
                )}
                {selectedAttraction.distance && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <span className="text-xl">📏</span>
                    <div>
                      <p className="font-medium text-stone-800">{lang === "it" ? "Distanza" : "Distance"}</p>
                      <p className="text-stone-600 text-sm">{selectedAttraction.distance}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Itinerary Waypoints */}
              {selectedAttraction.waypoints && selectedAttraction.waypoints.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
                    <Navigation size={20} className="text-green-600" />
                    {lang === "it" ? "Tappe dell'itinerario" : "Itinerary Stops"}
                  </h3>
                  <div className="space-y-3">
                    {selectedAttraction.waypoints.map((wp, index) => (
                      <div key={wp.id || index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-stone-800">{wp.name}</p>
                          {wp.description && <p className="text-stone-600 text-sm">{wp.description}</p>}
                          {wp.google_maps_link && (
                            <a href={wp.google_maps_link} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm flex items-center gap-1 mt-1">
                              <MapPin size={14} /> {lang === "it" ? "Vedi su Maps" : "View on Maps"}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
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
            {lang === "it" ? "Scopri Tadasuni" : lang === "en" ? "Discover Tadasuni" : lang === "fr" ? "Découvrez Tadasuni" : lang === "es" ? "Descubre Tadasuni" : "Entdecken Sie Tadasuni"}
          </h1>
          <p className="text-lg text-stone-600">
            {lang === "it" ? "Attrazioni, ristoranti, alloggi e itinerari" : lang === "en" ? "Attractions, restaurants, accommodations and itineraries" : "Attrazioni, ristoranti, alloggi e itinerari"}
          </p>
        </div>

        {/* Filter by group */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full font-medium transition ${filter === "all" ? "bg-amber-600 text-white" : "bg-white text-stone-700 hover:bg-amber-50"}`}
          >
            📋 {lang === "it" ? "Tutti" : "All"}
          </button>
          <button
            onClick={() => setFilter("attrazioni")}
            className={`px-4 py-2 rounded-full font-medium transition ${filter === "attrazioni" ? "bg-amber-600 text-white" : "bg-white text-stone-700 hover:bg-amber-50"}`}
          >
            🏛️ {lang === "it" ? "Attrazioni" : "Attractions"}
          </button>
          <button
            onClick={() => setFilter("mangiare")}
            className={`px-4 py-2 rounded-full font-medium transition ${filter === "mangiare" ? "bg-amber-600 text-white" : "bg-white text-stone-700 hover:bg-amber-50"}`}
          >
            🍽️ {lang === "it" ? "Dove Mangiare" : "Where to Eat"}
          </button>
          <button
            onClick={() => setFilter("dormire")}
            className={`px-4 py-2 rounded-full font-medium transition ${filter === "dormire" ? "bg-amber-600 text-white" : "bg-white text-stone-700 hover:bg-amber-50"}`}
          >
            🏨 {lang === "it" ? "Dove Dormire" : "Where to Stay"}
          </button>
          <button
            onClick={() => setFilter("itinerario")}
            className={`px-4 py-2 rounded-full font-medium transition ${filter === "itinerario" ? "bg-amber-600 text-white" : "bg-white text-stone-700 hover:bg-amber-50"}`}
          >
            🚶 {lang === "it" ? "Itinerari" : "Itineraries"}
          </button>
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
  const [categoryFilter, setCategoryFilter] = useState("all");

  const emptyAttraction = {
    name: "", name_en: "", name_fr: "", name_es: "", name_de: "",
    description: "", description_en: "", description_fr: "", description_es: "", description_de: "",
    category: "monumento",
    google_maps_link: "",
    opening_hours: "",
    price: "",
    contact: "",
    external_link: "",
    published: true,
    // Restaurant fields
    cuisine_type: "",
    price_range: "",
    reservation_link: "",
    // Accommodation fields
    accommodation_type: "",
    stars: null,
    booking_link: "",
    amenities: "",
    // Itinerary fields
    duration: "",
    difficulty: "",
    distance: "",
    waypoints: []
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
      published: attraction.published !== false,
      // Restaurant fields
      cuisine_type: attraction.cuisine_type || "",
      price_range: attraction.price_range || "",
      reservation_link: attraction.reservation_link || "",
      // Accommodation fields
      accommodation_type: attraction.accommodation_type || "",
      stars: attraction.stars || null,
      booking_link: attraction.booking_link || "",
      amenities: attraction.amenities || "",
      // Itinerary fields
      duration: attraction.duration || "",
      difficulty: attraction.difficulty || "",
      distance: attraction.distance || "",
      waypoints: attraction.waypoints || []
    });
    setShowForm(true);
  };

  // Helper to check category group
  const getCategoryGroup = (category) => {
    const cat = attractionCategories.find(c => c.value === category);
    return cat?.group || "altro";
  };

  const isRestaurant = (category) => getCategoryGroup(category) === "mangiare";
  const isAccommodation = (category) => getCategoryGroup(category) === "dormire";
  const isItinerary = (category) => category === "itinerario";

  // Waypoint management
  const addWaypoint = () => {
    setFormData({
      ...formData,
      waypoints: [...(formData.waypoints || []), { id: Date.now().toString(), name: "", description: "", google_maps_link: "", order: (formData.waypoints?.length || 0) }]
    });
  };

  const updateWaypoint = (index, field, value) => {
    const newWaypoints = [...(formData.waypoints || [])];
    newWaypoints[index] = { ...newWaypoints[index], [field]: value };
    setFormData({ ...formData, waypoints: newWaypoints });
  };

  const removeWaypoint = (index) => {
    const newWaypoints = (formData.waypoints || []).filter((_, i) => i !== index);
    setFormData({ ...formData, waypoints: newWaypoints });
  };

  const moveWaypoint = (index, direction) => {
    const newWaypoints = [...(formData.waypoints || [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newWaypoints.length) return;
    [newWaypoints[index], newWaypoints[newIndex]] = [newWaypoints[newIndex], newWaypoints[index]];
    newWaypoints.forEach((wp, i) => wp.order = i);
    setFormData({ ...formData, waypoints: newWaypoints });
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
    return cat ? (cat.icon ? `${cat.icon} ${cat.label}` : cat.label) : value;
  };

  const getCategoryIcon = (value) => {
    const cat = attractionCategories.find(c => c.value === value);
    return cat?.icon || "📍";
  };

  // Filter attractions by category group
  const filteredAttractions = categoryFilter === "all" 
    ? attractions 
    : attractions.filter(a => {
        if (categoryFilter === "attrazioni") return ["chiesa", "monumento", "archeologia", "natura", "museo"].includes(a.category);
        if (categoryFilter === "mangiare") return ["ristorante", "pizzeria", "bar", "agriturismo_rist"].includes(a.category);
        if (categoryFilter === "dormire") return ["hotel", "b&b", "agriturismo", "casa_vacanze"].includes(a.category);
        if (categoryFilter === "itinerari") return a.category === "itinerario";
        return a.category === categoryFilter;
      });

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
            <Plus size={20} /> Nuovo Elemento
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: "all", label: "Tutti", icon: "📋" },
            { value: "attrazioni", label: "Attrazioni", icon: "🏛️" },
            { value: "mangiare", label: "Dove Mangiare", icon: "🍽️" },
            { value: "dormire", label: "Dove Dormire", icon: "🏨" },
            { value: "itinerari", label: "Itinerari", icon: "🚶" }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setCategoryFilter(tab.value)}
              className={`px-4 py-2 rounded-full font-medium transition ${
                categoryFilter === tab.value 
                  ? "bg-amber-600 text-white" 
                  : "bg-white text-gray-700 hover:bg-amber-50 border"
              }`}
            >
              {tab.icon} {tab.label} 
              <span className="ml-1 text-xs opacity-70">
                ({tab.value === "all" ? attractions.length : attractions.filter(a => {
                  if (tab.value === "attrazioni") return ["chiesa", "monumento", "archeologia", "natura", "museo"].includes(a.category);
                  if (tab.value === "mangiare") return ["ristorante", "pizzeria", "bar", "agriturismo_rist"].includes(a.category);
                  if (tab.value === "dormire") return ["hotel", "b&b", "agriturismo", "casa_vacanze"].includes(a.category);
                  if (tab.value === "itinerari") return a.category === "itinerario";
                  return false;
                }).length})
              </span>
            </button>
          ))}
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
                      <optgroup label="🏛️ Attrazioni">
                        {attractionCategories.filter(c => c.group === "attrazioni").map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="🍽️ Dove Mangiare">
                        {attractionCategories.filter(c => c.group === "mangiare").map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="🏨 Dove Dormire">
                        {attractionCategories.filter(c => c.group === "dormire").map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="🚶 Itinerari">
                        {attractionCategories.filter(c => c.group === "itinerari").map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="📍 Altro">
                        {attractionCategories.filter(c => c.group === "altro").map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </optgroup>
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

                {/* Restaurant specific fields */}
                {isRestaurant(formData.category) && (
                  <div className="bg-orange-50 rounded-xl p-4">
                    <h4 className="font-semibold text-orange-800 mb-3">🍽️ Info Ristorante</h4>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Cucina</label>
                        <select
                          value={formData.cuisine_type}
                          onChange={(e) => setFormData({ ...formData, cuisine_type: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="">Seleziona...</option>
                          {cuisineTypes.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fascia Prezzo</label>
                        <select
                          value={formData.price_range}
                          onChange={(e) => setFormData({ ...formData, price_range: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="">Seleziona...</option>
                          {priceRanges.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Link Prenotazione</label>
                        <input
                          type="url"
                          value={formData.reservation_link}
                          onChange={(e) => setFormData({ ...formData, reservation_link: e.target.value })}
                          placeholder="https://..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Accommodation specific fields */}
                {isAccommodation(formData.category) && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h4 className="font-semibold text-blue-800 mb-3">🏨 Info Alloggio</h4>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stelle</label>
                        <select
                          value={formData.stars || ""}
                          onChange={(e) => setFormData({ ...formData, stars: e.target.value ? parseInt(e.target.value) : null })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="">N/A</option>
                          <option value="1">⭐</option>
                          <option value="2">⭐⭐</option>
                          <option value="3">⭐⭐⭐</option>
                          <option value="4">⭐⭐⭐⭐</option>
                          <option value="5">⭐⭐⭐⭐⭐</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Link Prenotazione</label>
                        <input
                          type="url"
                          value={formData.booking_link}
                          onChange={(e) => setFormData({ ...formData, booking_link: e.target.value })}
                          placeholder="https://booking.com/..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Servizi</label>
                        <input
                          type="text"
                          value={formData.amenities}
                          onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                          placeholder="WiFi, Parcheggio, Piscina..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Itinerary specific fields */}
                {isItinerary(formData.category) && (
                  <div className="bg-green-50 rounded-xl p-4">
                    <h4 className="font-semibold text-green-800 mb-3">🚶 Info Itinerario</h4>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Durata</label>
                        <input
                          type="text"
                          value={formData.duration}
                          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                          placeholder="es. 2 ore, mezza giornata"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Difficoltà</label>
                        <select
                          value={formData.difficulty}
                          onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="">Seleziona...</option>
                          {difficultyLevels.map(d => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Distanza</label>
                        <input
                          type="text"
                          value={formData.distance}
                          onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                          placeholder="es. 5 km"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    
                    {/* Waypoints */}
                    <div className="border-t border-green-200 pt-4 mt-4">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="font-medium text-green-800">📍 Tappe dell'itinerario</h5>
                        <button
                          type="button"
                          onClick={addWaypoint}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-1"
                        >
                          <Plus size={16} /> Aggiungi Tappa
                        </button>
                      </div>
                      
                      {(formData.waypoints || []).length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">Nessuna tappa aggiunta. Clicca "Aggiungi Tappa" per iniziare.</p>
                      ) : (
                        <div className="space-y-3">
                          {(formData.waypoints || []).map((wp, index) => (
                            <div key={wp.id || index} className="bg-white rounded-lg p-3 border border-green-200">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">{index + 1}</span>
                                <input
                                  type="text"
                                  value={wp.name}
                                  onChange={(e) => updateWaypoint(index, "name", e.target.value)}
                                  placeholder="Nome tappa"
                                  className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm"
                                />
                                <div className="flex gap-1">
                                  <button type="button" onClick={() => moveWaypoint(index, -1)} disabled={index === 0} className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30">
                                    <ChevronUp size={16} />
                                  </button>
                                  <button type="button" onClick={() => moveWaypoint(index, 1)} disabled={index === (formData.waypoints?.length || 0) - 1} className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30">
                                    <ChevronDown size={16} />
                                  </button>
                                  <button type="button" onClick={() => removeWaypoint(index)} className="p-1 text-red-500 hover:text-red-700">
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                              <div className="grid md:grid-cols-2 gap-2 ml-8">
                                <input
                                  type="text"
                                  value={wp.description || ""}
                                  onChange={(e) => updateWaypoint(index, "description", e.target.value)}
                                  placeholder="Descrizione breve"
                                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                                />
                                <input
                                  type="url"
                                  value={wp.google_maps_link || ""}
                                  onChange={(e) => updateWaypoint(index, "google_maps_link", e.target.value)}
                                  placeholder="Link Google Maps"
                                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional info - only for non-itineraries */}
                {!isItinerary(formData.category) && (
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isRestaurant(formData.category) || isAccommodation(formData.category) ? "Prezzo medio" : "Prezzo/Ingresso"}
                      </label>
                      <input
                        type="text"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder={isRestaurant(formData.category) ? "es. €15-25" : "es. Gratuito, €5"}
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
                )}

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
        ) : filteredAttractions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow">
            <Landmark size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">
              {attractions.length === 0 
                ? 'Nessun elemento creato. Clicca "Nuovo Elemento" per iniziare.'
                : 'Nessun elemento in questa categoria.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredAttractions.map((attr) => (
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
                      {/* Restaurant specific */}
                      {attr.cuisine_type && <span>🍴 {cuisineTypes.find(c => c.value === attr.cuisine_type)?.label || attr.cuisine_type}</span>}
                      {attr.price_range && <span className="font-medium text-green-700">{attr.price_range}</span>}
                      {/* Accommodation specific */}
                      {attr.stars && <span>{"⭐".repeat(attr.stars)}</span>}
                      {attr.amenities && <span>🛎️ {attr.amenities}</span>}
                      {/* Itinerary specific */}
                      {attr.duration && <span>⏱️ {attr.duration}</span>}
                      {attr.difficulty && <span>📊 {difficultyLevels.find(d => d.value === attr.difficulty)?.label || attr.difficulty}</span>}
                      {attr.distance && <span>📏 {attr.distance}</span>}
                      {attr.waypoints && attr.waypoints.length > 0 && <span>📍 {attr.waypoints.length} tappe</span>}
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
              <div className="grid grid-cols-2 gap-4 mb-6">
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
              {/* Home Tadasuni - Borgo Experience */}
              <Link to="/immobili" className="block bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-5 hover:from-blue-700 hover:to-indigo-800 transition-all shadow-lg hover:shadow-xl group mb-3">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                    <Landmark className="text-white" size={32} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-lg">Borgo Experience</p>
                    <p className="text-blue-100 text-sm">Trova la tua casa nel borgo</p>
                  </div>
                  <ExternalLink className="text-white/70 group-hover:text-white transition" size={24} />
                </div>
              </Link>
              {/* CMS Immobili - Accesso Riservato */}
              <Link to="/immobili-admin" className="block bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl p-4 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="bg-stone-200 group-hover:bg-stone-300 rounded-lg p-2 transition">
                    <Settings className="text-stone-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-stone-700 font-semibold text-sm">CMS Immobili</p>
                    <p className="text-stone-500 text-xs">Accesso riservato</p>
                  </div>
                  <LogOut className="text-stone-400 group-hover:text-stone-600 transition" size={18} />
                </div>
              </Link>
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
                <Link to="/immobili" className="block text-stone-400 hover:text-white transition">🏠 Home Tadasuni</Link>
                <Link to="/eventi" className="block text-stone-400 hover:text-white transition">{t.events}</Link>
                <Link to="/admin" className="block text-stone-400 hover:text-white transition">{t.admin}</Link>
                <Link to="/attrazioni-admin" className="block text-stone-400 hover:text-white transition">🏛️ CMS Attrazioni</Link>
                <Link to="/immobili-admin" className="block text-stone-400 hover:text-white transition">🏠 CMS Immobili</Link>
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

// ============== DIGITAL TWIN EDITOR ==============
const DigitalTwinEditor = ({ immobileId }) => {
  const [twin, setTwin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [editingHotspot, setEditingHotspot] = useState(null);
  const floorPlanRef = useRef(null);

  useEffect(() => {
    fetchTwin();
  }, [immobileId]);

  const fetchTwin = async () => {
    try {
      const response = await axios.get(`${API}/immobili/${immobileId}/digital-twin`);
      setTwin(response.data);
      if (response.data?.rooms?.length > 0 && !selectedRoom) {
        setSelectedRoom(response.data.rooms[0]);
      }
    } catch (error) {
      console.error("Error loading digital twin:", error);
    }
    setLoading(false);
  };

  const handleFloorPlanUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      await axios.post(`${API}/immobili/${immobileId}/digital-twin/floor-plan`, fd);
      fetchTwin();
    } catch (error) {
      alert("Errore upload planimetria");
    }
    setUploading(false);
  };

  const handleRoomUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !newRoomName.trim()) {
      alert("Inserisci un nome per la stanza");
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", newRoomName.trim());
    try {
      const response = await axios.post(`${API}/immobili/${immobileId}/digital-twin/rooms`, fd);
      setNewRoomName("");
      fetchTwin();
      if (response.data.room) {
        setSelectedRoom(response.data.room);
      }
    } catch (error) {
      alert("Errore upload stanza 360°");
    }
    setUploading(false);
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm("Eliminare questa stanza?")) return;
    try {
      await axios.delete(`${API}/immobili/${immobileId}/digital-twin/rooms/${roomId}`);
      if (selectedRoom?.id === roomId) setSelectedRoom(null);
      fetchTwin();
    } catch (error) {
      alert("Errore eliminazione stanza");
    }
  };

  const handleFloorPlanClick = async (e) => {
    if (!selectedRoom || !floorPlanRef.current) return;
    const rect = floorPlanRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    try {
      await axios.put(`${API}/immobili/${immobileId}/digital-twin/rooms/${selectedRoom.id}`, {
        floor_plan_x: x,
        floor_plan_y: y
      });
      fetchTwin();
    } catch (error) {
      alert("Errore posizionamento stanza");
    }
  };

  const handleAddHotspot = async (targetRoomId) => {
    if (!selectedRoom) return;
    try {
      const targetRoom = twin.rooms.find(r => r.id === targetRoomId);
      await axios.post(`${API}/immobili/${immobileId}/digital-twin/rooms/${selectedRoom.id}/hotspots`, {
        target_room_id: targetRoomId,
        label: `Vai a ${targetRoom?.name || 'stanza'}`,
        position_yaw: 0,
        position_pitch: 0
      });
      fetchTwin();
    } catch (error) {
      alert("Errore aggiunta collegamento");
    }
  };

  const handleDeleteHotspot = async (hotspotId) => {
    if (!selectedRoom) return;
    try {
      await axios.delete(`${API}/immobili/${immobileId}/digital-twin/rooms/${selectedRoom.id}/hotspots/${hotspotId}`);
      fetchTwin();
    } catch (error) {
      alert("Errore eliminazione collegamento");
    }
  };

  const handlePublishToggle = async () => {
    try {
      await axios.post(`${API}/immobili/${immobileId}/digital-twin`, {
        ...twin,
        is_published: !twin?.is_published
      });
      fetchTwin();
    } catch (error) {
      alert("Errore aggiornamento stato pubblicazione");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-purple-900 border-b pb-2 flex items-center gap-2">
          🌐 Digital Twin Home
        </h3>
        {twin?.rooms?.length > 0 && (
          <button 
            onClick={handlePublishToggle}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
              twin?.is_published 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {twin?.is_published ? <CheckCircle size={18} /> : <EyeOff size={18} />}
            {twin?.is_published ? 'Pubblicato' : 'Non pubblicato'}
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Floor Plan */}
        <div className="bg-purple-50 rounded-xl p-4">
          <h4 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
            🗺️ Planimetria
          </h4>
          
          {twin?.floor_plan_url ? (
            <div className="relative">
              <img 
                ref={floorPlanRef}
                src={`${BACKEND_URL}${twin.floor_plan_url}`} 
                alt="Planimetria" 
                className="w-full rounded-lg border-2 border-purple-200 cursor-crosshair"
                onClick={handleFloorPlanClick}
              />
              {/* Room markers */}
              {twin.rooms?.filter(r => r.floor_plan_x != null).map(room => (
                <div
                  key={room.id}
                  className={`absolute w-6 h-6 rounded-full transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-xs font-bold cursor-pointer transition ${
                    selectedRoom?.id === room.id 
                      ? 'bg-purple-600 text-white ring-4 ring-purple-300 scale-125' 
                      : 'bg-blue-500 text-white hover:scale-110'
                  }`}
                  style={{ left: `${room.floor_plan_x}%`, top: `${room.floor_plan_y}%` }}
                  onClick={(e) => { e.stopPropagation(); setSelectedRoom(room); }}
                  title={room.name}
                >
                  {twin.rooms.indexOf(room) + 1}
                </div>
              ))}
              <p className="text-xs text-purple-600 mt-2">
                💡 Seleziona una stanza e clicca sulla planimetria per posizionarla
              </p>
              <label className="mt-2 inline-block px-3 py-1 bg-purple-200 hover:bg-purple-300 text-purple-800 rounded cursor-pointer text-sm">
                <input type="file" accept="image/*" className="hidden" onChange={handleFloorPlanUpload} />
                Cambia planimetria
              </label>
            </div>
          ) : (
            <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center">
              <Map size={48} className="mx-auto mb-3 text-purple-400" />
              <p className="text-purple-600 mb-3">Carica la planimetria dell'immobile</p>
              <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg cursor-pointer inline-flex items-center gap-2">
                <input type="file" accept="image/*" className="hidden" onChange={handleFloorPlanUpload} disabled={uploading} />
                <Upload size={18} /> {uploading ? 'Caricamento...' : 'Carica Planimetria'}
              </label>
            </div>
          )}
        </div>

        {/* Right: Rooms Management */}
        <div className="bg-blue-50 rounded-xl p-4">
          <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
            📸 Stanze 360° ({twin?.rooms?.length || 0})
          </h4>

          {/* Add new room */}
          <div className="bg-white rounded-lg p-3 mb-4 space-y-2">
            <input 
              type="text" 
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Nome stanza (es. Ingresso, Soggiorno...)"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <label className={`w-full px-4 py-2 rounded-lg cursor-pointer flex items-center justify-center gap-2 ${
              newRoomName.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleRoomUpload} 
                disabled={!newRoomName.trim() || uploading}
              />
              <Upload size={18} /> {uploading ? 'Caricamento...' : 'Carica Foto 360°'}
            </label>
          </div>

          {/* Rooms list */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {twin?.rooms?.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">
                Nessuna stanza. Aggiungi la prima foto 360°.
              </p>
            )}
            {twin?.rooms?.map((room, idx) => (
              <div 
                key={room.id}
                className={`bg-white rounded-lg p-3 cursor-pointer transition ${
                  selectedRoom?.id === room.id ? 'ring-2 ring-purple-500' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedRoom(room)}
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={`${BACKEND_URL}${room.image_360_url}`} 
                    alt={room.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">{idx + 1}. {room.name}</p>
                    <p className="text-xs text-gray-500">
                      {room.floor_plan_x != null ? '✅ Posizionata' : '⚠️ Non posizionata'}
                      {' · '}
                      {room.hotspots?.length || 0} collegamenti
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id); }}
                    className="p-2 text-red-500 hover:bg-red-100 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Room Details & Hotspots */}
      {selectedRoom && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            🔗 Collegamenti da "{selectedRoom.name}"
          </h4>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* Current hotspots */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Collegamenti attivi:</p>
              {selectedRoom.hotspots?.length === 0 ? (
                <p className="text-gray-400 text-sm">Nessun collegamento</p>
              ) : (
                <div className="space-y-2">
                  {selectedRoom.hotspots?.map(hotspot => {
                    const targetRoom = twin.rooms.find(r => r.id === hotspot.target_room_id);
                    return (
                      <div key={hotspot.id} className="flex items-center justify-between bg-white p-2 rounded-lg">
                        <span className="text-sm">→ {targetRoom?.name || 'Stanza eliminata'}</span>
                        <button onClick={() => handleDeleteHotspot(hotspot.id)} className="text-red-500 hover:bg-red-100 p-1 rounded">
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add new hotspot */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Aggiungi collegamento a:</p>
              <div className="space-y-1">
                {twin.rooms?.filter(r => r.id !== selectedRoom.id && !selectedRoom.hotspots?.some(h => h.target_room_id === r.id)).map(room => (
                  <button
                    key={room.id}
                    onClick={() => handleAddHotspot(room.id)}
                    className="w-full text-left px-3 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg text-sm flex items-center gap-2"
                  >
                    <Plus size={14} /> {room.name}
                  </button>
                ))}
                {twin.rooms?.filter(r => r.id !== selectedRoom.id && !selectedRoom.hotspots?.some(h => h.target_room_id === r.id)).length === 0 && (
                  <p className="text-gray-400 text-sm">Tutte le stanze sono già collegate</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview link */}
      {twin?.rooms?.length > 0 && (
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-purple-800">🎉 Tour Virtuale Configurato!</p>
            <p className="text-sm text-purple-600">{twin.rooms.length} stanze · {twin.rooms.reduce((acc, r) => acc + (r.hotspots?.length || 0), 0)} collegamenti</p>
          </div>
          <p className="text-xs text-purple-500">
            Visibile nella vetrina pubblica quando pubblicato
          </p>
        </div>
      )}
    </div>
  );
};

// ============== HOME TADASUNI - IMMOBILI ADMIN PANEL ==============
const ImmobiliAdminPanel = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("adminToken") || "");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [immobili, setImmobili] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingImmobile, setEditingImmobile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [activeSection, setActiveSection] = useState("anagrafica");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipologia, setFilterTipologia] = useState("all");
  const [filterStato, setFilterStato] = useState("all");
  const [showGallery, setShowGallery] = useState(null);
  const [destinazioniUrbanistiche, setDestinazioniUrbanistiche] = useState([]);
  const [newDestinazione, setNewDestinazione] = useState("");

  const emptyImmobile = {
    ente_proprietario: "", denominazione: "", indirizzo_via: "", indirizzo_comune: "Tadasuni", indirizzo_provincia: "OR", indirizzo_regione: "Sardegna",
    proprietario_nome: "", proprietario_cognome: "", proprietario_data_nascita: "", proprietario_cf: "", proprietario_residenza: "", proprietario_telefono: "", proprietario_email: "", proprietario_riferimenti: "", proprietario_note: "",
    tipo_bene: "edificato", destinazione_uso: "", tipologia: "",
    catasto_sezione_urbana: "", catasto_foglio: "", catasto_particella: "", catasto_subalterno: "", catasto_categoria: "", terreno_foglio: "", terreno_particella: "",
    superficie_lorda_mq: "", superficie_fondiaria_mq: "", n_edifici: "", n_piani_fuori_terra: "", n_piani_entro_terra: "", collegamenti_impianti: "", superficie_coperta_mq: "", superficie_scoperta_mq: "", volume_entro_terra_mc: "", volume_fuori_terra_mc: "", n_vani: "", planimetrie_presenti: false,
    localizzazione_omi: "", coordinate_gps: "", link_gemello_digitale: "", vista_lago: false,
    certificato_energetico: false, classe_energetica: "", cdu: false,
    anno_costruzione: "", stato_conservazione: "", data_ultima_manutenzione: "", stato_occupazione: "", soggetto_occupante: "", natura_giuridica_occupazione: "", tipo_occupazione_durata: "",
    presenza_vincoli: false, tipo_vincoli: "", conformita_urbanistica: false, destinazione_urbanistica_attuale: "", destinazioni_urbanistiche_lista: [], destinazione_urbanistica_prevista: "", iter_cambio_destinazione: "", titolo_legittimita: "", conformita_catastale: false,
    impianto_idrico: false, impianto_elettrico: false, impianto_fognario: false, riscaldamento: false, tipo_riscaldamento: "", connessione_internet: false, tipo_connessione: "", impianti_lista: [],
    prezzo_richiesto: "", prezzo_mq: "", prezzo_pubblico: false, descrizione_narrativa: "", punti_forza: "", target_ideale: "", potenzialita_uso: "",
    referenti: [], published: true
  };

  const [formData, setFormData] = useState(emptyImmobile);

  const tipologieOptions = [
    { value: "casa_singola", label: "Casa Singola" },
    { value: "villetta", label: "Villetta" },
    { value: "appartamento", label: "Appartamento" },
    { value: "magazzino", label: "Magazzino" },
    { value: "ex_stalla", label: "Ex Stalla" },
    { value: "rudere", label: "Rudere" },
    { value: "terreno", label: "Terreno" },
    { value: "altro", label: "Altro" }
  ];

  const statoConservazioneOptions = [
    { value: "ottimo", label: "Ottimo" },
    { value: "buono", label: "Buono" },
    { value: "mediocre", label: "Mediocre" },
    { value: "pessimo", label: "Pessimo" },
    { value: "da_ristrutturare", label: "Da Ristrutturare" }
  ];

  const targetOptions = [
    { value: "nomadi_digitali", label: "Nomadi Digitali" },
    { value: "over_55", label: "Over 55" },
    { value: "famiglie", label: "Famiglie" },
    { value: "investitori", label: "Investitori" },
    { value: "artigiani", label: "Artigiani/Artisti" }
  ];

  useEffect(() => {
    if (token) {
      setIsLoggedIn(true);
      fetchImmobili();
    }
  }, [token]);

  const fetchImmobili = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/immobili`);
      setImmobili(response.data);
    } catch (error) {
      console.error("Error fetching immobili:", error);
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loginForm.username === "visittadasuni" && loginForm.password === "Tadasuni2025$") {
      localStorage.setItem("adminToken", "authenticated");
      setToken("authenticated");
      setIsLoggedIn(true);
      setLoginError("");
      fetchImmobili();
    } else {
      setLoginError("Credenziali non valide");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setToken("");
    setIsLoggedIn(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = { ...formData };
      // Convert numeric fields - set to null if empty
      ["superficie_lorda_mq", "superficie_fondiaria_mq", "superficie_coperta_mq", "superficie_scoperta_mq", "volume_entro_terra_mc", "volume_fuori_terra_mc", "prezzo_richiesto", "prezzo_mq"].forEach(f => {
        if (dataToSend[f] !== "" && dataToSend[f] !== null && dataToSend[f] !== undefined) {
          dataToSend[f] = parseFloat(dataToSend[f]);
        } else {
          dataToSend[f] = null;
        }
      });
      ["n_edifici", "n_piani_fuori_terra", "n_piani_entro_terra", "n_vani", "anno_costruzione"].forEach(f => {
        if (dataToSend[f] !== "" && dataToSend[f] !== null && dataToSend[f] !== undefined) {
          dataToSend[f] = parseInt(dataToSend[f]);
        } else {
          dataToSend[f] = null;
        }
      });
      // Clean empty strings to null for optional text fields
      Object.keys(dataToSend).forEach(k => {
        if (dataToSend[k] === "") dataToSend[k] = null;
      });

      if (editingImmobile) {
        await axios.put(`${API}/immobili/${editingImmobile.id}`, dataToSend);
      } else {
        await axios.post(`${API}/immobili`, dataToSend);
      }
      fetchImmobili();
      setShowForm(false);
      setEditingImmobile(null);
      setFormData(emptyImmobile);
    } catch (error) {
      console.error("Errore salvataggio:", error);
      alert("Errore nel salvataggio: " + (error.response?.data?.detail || error.message));
    }
  };

  const handleEdit = (immobile) => {
    setEditingImmobile(immobile);
    setFormData({
      ...emptyImmobile,
      ...Object.fromEntries(Object.entries(immobile).map(([k, v]) => [k, v ?? (Array.isArray(emptyImmobile[k]) ? [] : "")]))
    });
    // Load destinazioni urbanistiche if present
    if (immobile.destinazioni_urbanistiche_lista?.length) {
      setDestinazioniUrbanistiche(immobile.destinazioni_urbanistiche_lista);
    }
    setShowForm(true);
    setActiveSection("anagrafica");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Eliminare questo immobile?")) return;
    try {
      await axios.delete(`${API}/immobili/${id}`);
      fetchImmobili();
    } catch (error) {
      alert("Errore nell'eliminazione");
    }
  };

  // Helper function to refresh current editing immobile
  const refreshEditingImmobile = async (immobileId) => {
    try {
      const response = await axios.get(`${API}/immobili/${immobileId}`);
      setEditingImmobile(response.data);
    } catch (error) {
      console.error("Errore refresh immobile:", error);
    }
  };

  const handleImageUpload = async (immobileId, file, caption = "", is360 = false) => {
    if (!file) return;
    setUploadingFile(immobileId);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("caption", caption);
    fd.append("is_360", is360);
    try {
      await axios.post(`${API}/immobili/${immobileId}/images`, fd);
      await fetchImmobili();
      // Refresh editingImmobile if we're editing this one
      if (editingImmobile && editingImmobile.id === immobileId) {
        await refreshEditingImmobile(immobileId);
      }
    } catch (error) {
      alert("Errore upload immagine");
    }
    setUploadingFile(null);
  };

  const handleImageDelete = async (immobileId, imageId) => {
    if (!window.confirm("Eliminare questa foto?")) return;
    try {
      await axios.delete(`${API}/immobili/${immobileId}/images/${imageId}`);
      await fetchImmobili();
      // Refresh editingImmobile if we're editing this one
      if (editingImmobile && editingImmobile.id === immobileId) {
        await refreshEditingImmobile(immobileId);
      }
    } catch (error) {
      alert("Errore eliminazione immagine");
    }
  };

  const handleAttachmentUpload = async (immobileId, file, description, section) => {
    if (!file) return;
    setUploadingFile(immobileId);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("description", description || file.name);
    fd.append("section", section);
    try {
      await axios.post(`${API}/immobili/${immobileId}/attachments`, fd);
      await fetchImmobili();
      // Refresh editingImmobile to show new attachment in tab
      if (editingImmobile && editingImmobile.id === immobileId) {
        await refreshEditingImmobile(immobileId);
      }
    } catch (error) {
      alert("Errore upload allegato");
    }
    setUploadingFile(null);
  };

  // Export handlers
  const handleExportExcel = async () => {
    try {
      const response = await axios.get(`${API}/immobili/export/excel`);
      const data = response.data.data;
      // Create CSV content
      const headers = ["Denominazione", "Indirizzo", "Comune", "Tipologia", "Superficie (mq)", "Vani", "Anno", "Stato", "Prezzo (€)", "Pubblicato"];
      const rows = data.map(imm => [
        imm.denominazione || "",
        imm.indirizzo_via || "",
        imm.indirizzo_comune || "",
        imm.tipologia || "",
        imm.superficie_lorda_mq || "",
        imm.n_vani || "",
        imm.anno_costruzione || "",
        imm.stato_conservazione || "",
        imm.prezzo_richiesto || "",
        imm.published ? "Si" : "No"
      ]);
      const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
      // Download
      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `immobili_tadasuni_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Errore durante l'esportazione Excel");
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await axios.get(`${API}/immobili/export/pdf`);
      const data = response.data.data;
      // Create printable HTML
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Home Tadasuni - Report Immobili</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
            .immobile { border: 1px solid #ddd; margin-bottom: 20px; padding: 15px; border-radius: 8px; page-break-inside: avoid; }
            .immobile h2 { margin: 0 0 10px 0; color: #1e3a8a; }
            .info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .info p { margin: 5px 0; }
            .label { color: #666; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>🏠 Home Tadasuni - Catalogo Immobili</h1>
          <p>Generato il ${new Date().toLocaleDateString("it-IT")} - Totale: ${data.length} immobili</p>
          ${data.map(imm => `
            <div class="immobile">
              <h2>${imm.denominazione}</h2>
              <div class="info">
                <p><span class="label">Indirizzo:</span> ${imm.indirizzo_via || "-"}, ${imm.indirizzo_comune}</p>
                <p><span class="label">Tipologia:</span> ${imm.tipologia || "-"}</p>
                <p><span class="label">Superficie:</span> ${imm.superficie_lorda_mq ? imm.superficie_lorda_mq + " mq" : "-"}</p>
                <p><span class="label">Vani:</span> ${imm.n_vani || "-"}</p>
                <p><span class="label">Anno:</span> ${imm.anno_costruzione || "-"}</p>
                <p><span class="label">Stato:</span> ${imm.stato_conservazione || "-"}</p>
                <p><span class="label">Prezzo:</span> ${imm.prezzo_richiesto ? "€ " + imm.prezzo_richiesto.toLocaleString() : "Su richiesta"}</p>
                <p><span class="label">Pubblicato:</span> ${imm.published ? "Si" : "No"}</p>
              </div>
              ${imm.descrizione_narrativa ? `<p style="margin-top:10px;"><em>${imm.descrizione_narrativa}</em></p>` : ""}
            </div>
          `).join("")}
          <div class="footer">
            <p>Home Tadasuni - Tadasuni Borgo Experience</p>
            <p>Trivor srl - Fairsgate srl</p>
          </div>
        </body>
        </html>
      `;
      // Open print window
      const printWindow = window.open("", "_blank");
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      alert("Errore durante l'esportazione PDF");
    }
  };

  // Referenti helpers
  const addReferente = () => {
    setFormData({...formData, referenti: [...(formData.referenti || []), { id: Date.now().toString(), nominativo: "", contatti: "" }]});
  };
  const updateReferente = (index, field, value) => {
    const updated = [...(formData.referenti || [])];
    updated[index] = {...updated[index], [field]: value};
    setFormData({...formData, referenti: updated});
  };
  const removeReferente = (index) => {
    setFormData({...formData, referenti: (formData.referenti || []).filter((_, i) => i !== index)});
  };

  // Impianti helpers
  const addImpianto = () => {
    setFormData({...formData, impianti_lista: [...(formData.impianti_lista || []), { id: Date.now().toString(), descrizione: "", data_certificazione: "" }]});
  };
  const updateImpianto = (index, field, value) => {
    const updated = [...(formData.impianti_lista || [])];
    updated[index] = {...updated[index], [field]: value};
    setFormData({...formData, impianti_lista: updated});
  };
  const removeImpianto = (index) => {
    setFormData({...formData, impianti_lista: (formData.impianti_lista || []).filter((_, i) => i !== index)});
  };

  // Destinazioni urbanistiche helpers
  const addDestinazione = () => {
    if (!newDestinazione.trim()) return;
    const updated = [...destinazioniUrbanistiche, newDestinazione.trim()];
    setDestinazioniUrbanistiche(updated);
    setFormData({...formData, destinazioni_urbanistiche_lista: updated});
    setNewDestinazione("");
  };

  // Attachment component for each section
  const AttachmentSection = ({ immobileId, section, attachments = [] }) => {
    const sectionAttachments = attachments.filter(a => a.section === section);
    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-dashed">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">📎 Allegati ({sectionAttachments.length})</span>
          <label className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded cursor-pointer flex items-center gap-1">
            <input type="file" className="hidden" onChange={(e) => {
              const desc = prompt("Descrizione allegato:");
              if (desc !== null && e.target.files[0]) handleAttachmentUpload(immobileId, e.target.files[0], desc, section);
            }} />
            <Plus size={14} /> Allega file
          </label>
        </div>
        {sectionAttachments.length > 0 && (
          <div className="space-y-1 mt-2">
            {sectionAttachments.map(att => (
              <div key={att.id} className="flex items-center justify-between bg-white p-2 rounded text-sm">
                <span className="truncate flex-1">{att.description || att.filename}</span>
                <div className="flex gap-1 ml-2">
                  <a href={`${BACKEND_URL}${att.url}`} target="_blank" rel="noopener noreferrer" className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Anteprima"><Eye size={16} /></a>
                  <button onClick={() => handleAttachmentDelete(immobileId, att.id)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Elimina"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleAttachmentDelete = async (immobileId, attachmentId) => {
    if (!window.confirm("Eliminare questo allegato?")) return;
    try {
      await axios.delete(`${API}/immobili/${immobileId}/attachments/${attachmentId}`);
      await fetchImmobili();
      // Refresh editingImmobile to update attachment list in tab
      if (editingImmobile && editingImmobile.id === immobileId) {
        await refreshEditingImmobile(immobileId);
      }
    } catch (error) {
      alert("Errore eliminazione allegato");
    }
  };

  const filteredImmobili = immobili.filter(imm => {
    const matchSearch = imm.denominazione?.toLowerCase().includes(searchTerm.toLowerCase()) || imm.indirizzo_via?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipologia = filterTipologia === "all" || imm.tipologia === filterTipologia;
    const matchStato = filterStato === "all" || imm.stato_conservazione === filterStato;
    return matchSearch && matchTipologia && matchStato;
  });

  const getTipologiaLabel = (value) => tipologieOptions.find(t => t.value === value)?.label || value;
  const getStatoLabel = (value) => statoConservazioneOptions.find(s => s.value === value)?.label || value;

  const sections = [
    { id: "anagrafica", label: "Anagrafica", icon: "📋" },
    { id: "classificazione", label: "Classificazione", icon: "🏠" },
    { id: "catastale", label: "Dati Catastali", icon: "📑" },
    { id: "dimensioni", label: "Dimensioni", icon: "📐" },
    { id: "ubicazione", label: "Ubicazione", icon: "📍" },
    { id: "certificazioni", label: "Certificazioni", icon: "📜" },
    { id: "stato", label: "Stato e Conservazione", icon: "🔧" },
    { id: "vincoli", label: "Vincoli e Conformità", icon: "⚖️" },
    { id: "impianti", label: "Impianti", icon: "⚡" },
    { id: "marketing", label: "Marketing", icon: "💰" },
    { id: "responsabili", label: "Referenti", icon: "👥" },
    { id: "digitaltwin", label: "Digital Twin", icon: "🌐" }
  ];

  // Login screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">🏠 Home Tadasuni</h1>
            <p className="text-gray-500 text-sm">Gestione Immobili</p>
          </div>
          {loginError && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{loginError}</div>}
          <div className="space-y-4">
            <input type="text" placeholder="Username" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} className="w-full px-4 py-3 border rounded-lg" required />
            <input type="password" placeholder="Password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} className="w-full px-4 py-3 border rounded-lg" required />
            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">Accedi</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">🏠 Home Tadasuni</h1>
            <span className="text-blue-300 text-sm">Gestione Immobili</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/immobili" className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg text-sm flex items-center gap-2"><Eye size={16} /> Vetrina Pubblica</Link>
            <Link to="/" className="px-4 py-2 bg-blue-800 hover:bg-blue-700 rounded-lg text-sm">Sito Principale</Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm flex items-center gap-2"><LogOut size={16} /> Esci</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
          <div className="flex gap-3 items-center flex-wrap">
            <input type="text" placeholder="🔍 Cerca immobile..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-4 py-2 border rounded-lg w-64" />
            <select value={filterTipologia} onChange={(e) => setFilterTipologia(e.target.value)} className="px-4 py-2 border rounded-lg">
              <option value="all">Tutte le tipologie</option>
              {tipologieOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={filterStato} onChange={(e) => setFilterStato(e.target.value)} className="px-4 py-2 border rounded-lg">
              <option value="all">Tutti gli stati</option>
              {statoConservazioneOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={handleExportExcel} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-2" title="Esporta Excel">
              <FileText size={16} /> Excel
            </button>
            <button onClick={handleExportPDF} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-2" title="Esporta PDF">
              <FileText size={16} /> PDF
            </button>
            <button onClick={() => { setEditingImmobile(null); setFormData(emptyImmobile); setShowForm(true); setActiveSection("anagrafica"); }} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2">
              <Plus size={20} /> Nuovo Immobile
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow"><p className="text-gray-500 text-sm">Totale Immobili</p><p className="text-2xl font-bold text-blue-900">{immobili.length}</p></div>
          <div className="bg-white rounded-xl p-4 shadow"><p className="text-gray-500 text-sm">Pubblicati</p><p className="text-2xl font-bold text-green-600">{immobili.filter(i => i.published).length}</p></div>
          <div className="bg-white rounded-xl p-4 shadow"><p className="text-gray-500 text-sm">Da Ristrutturare</p><p className="text-2xl font-bold text-orange-600">{immobili.filter(i => i.stato_conservazione === "da_ristrutturare" || i.stato_conservazione === "pessimo").length}</p></div>
          <div className="bg-white rounded-xl p-4 shadow"><p className="text-gray-500 text-sm">Liberi</p><p className="text-2xl font-bold text-emerald-600">{immobili.filter(i => i.stato_occupazione === "libero").length}</p></div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
              <div className="bg-blue-900 text-white p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">{editingImmobile ? "Modifica Immobile" : "Nuovo Immobile"}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-blue-800 rounded-lg"><X size={24} /></button>
              </div>
              
              {/* Section Tabs */}
              <div className="bg-gray-100 p-2 flex flex-wrap gap-1 border-b">
                {sections.map(sec => (
                  <button key={sec.id} onClick={() => setActiveSection(sec.id)} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeSection === sec.id ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-200"}`}>
                    {sec.icon} {sec.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[60vh]">
                {/* ANAGRAFICA */}
                {activeSection === "anagrafica" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-blue-900 border-b pb-2">📋 Anagrafica Generale</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Denominazione *</label><input type="text" value={formData.denominazione} onChange={(e) => setFormData({...formData, denominazione: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required /></div>
                      <div><label className="block text-sm font-medium mb-1">Ente Proprietario</label><input type="text" value={formData.ente_proprietario} onChange={(e) => setFormData({...formData, ente_proprietario: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    </div>
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Via/Piazza</label><input type="text" value={formData.indirizzo_via} onChange={(e) => setFormData({...formData, indirizzo_via: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Comune</label><input type="text" value={formData.indirizzo_comune} onChange={(e) => setFormData({...formData, indirizzo_comune: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Provincia</label><input type="text" value={formData.indirizzo_provincia} onChange={(e) => setFormData({...formData, indirizzo_provincia: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    </div>
                    
                    {/* Dati Proprietario */}
                    <div className="bg-blue-50 rounded-xl p-4 mt-4">
                      <h4 className="font-medium text-blue-800 mb-3">👤 Dati Proprietario</h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div><label className="block text-sm font-medium mb-1">Nome</label><input type="text" value={formData.proprietario_nome} onChange={(e) => setFormData({...formData, proprietario_nome: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                        <div><label className="block text-sm font-medium mb-1">Cognome</label><input type="text" value={formData.proprietario_cognome} onChange={(e) => setFormData({...formData, proprietario_cognome: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                        <div><label className="block text-sm font-medium mb-1">Data di Nascita</label><input type="date" value={formData.proprietario_data_nascita} onChange={(e) => setFormData({...formData, proprietario_data_nascita: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 mt-3">
                        <div><label className="block text-sm font-medium mb-1">Codice Fiscale</label><input type="text" value={formData.proprietario_cf} onChange={(e) => setFormData({...formData, proprietario_cf: e.target.value.toUpperCase()})} className="w-full px-4 py-2 border rounded-lg uppercase" maxLength={16} /></div>
                        <div><label className="block text-sm font-medium mb-1">Residenza</label><input type="text" value={formData.proprietario_residenza} onChange={(e) => setFormData({...formData, proprietario_residenza: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 mt-3">
                        <div><label className="block text-sm font-medium mb-1">📞 Telefono</label><input type="tel" value={formData.proprietario_telefono} onChange={(e) => setFormData({...formData, proprietario_telefono: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                        <div><label className="block text-sm font-medium mb-1">📧 Email</label><input type="email" value={formData.proprietario_email} onChange={(e) => setFormData({...formData, proprietario_email: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 mt-3">
                        <div><label className="block text-sm font-medium mb-1">Riferimenti</label><input type="text" value={formData.proprietario_riferimenti} onChange={(e) => setFormData({...formData, proprietario_riferimenti: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                        <div><label className="block text-sm font-medium mb-1">Note</label><textarea value={formData.proprietario_note} onChange={(e) => setFormData({...formData, proprietario_note: e.target.value})} className="w-full px-4 py-2 border rounded-lg" rows={2}></textarea></div>
                      </div>
                    </div>
                    
                    {/* Allegati Anagrafica */}
                    {editingImmobile && <AttachmentSection immobileId={editingImmobile.id} section="anagrafica" attachments={editingImmobile.attachments} />}
                  </div>
                )}

                {/* CLASSIFICAZIONE */}
                {activeSection === "classificazione" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-blue-900 border-b pb-2">🏠 Classificazione del Bene</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Tipo Bene</label>
                        <select value={formData.tipo_bene} onChange={(e) => setFormData({...formData, tipo_bene: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                          <option value="edificato">Edificato</option><option value="non_edificato">Non Edificato</option>
                        </select>
                      </div>
                      <div><label className="block text-sm font-medium mb-1">Tipologia</label>
                        <select value={formData.tipologia} onChange={(e) => setFormData({...formData, tipologia: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                          <option value="">Seleziona...</option>
                          {tipologieOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div><label className="block text-sm font-medium mb-1">Destinazione d'uso</label>
                        <select value={formData.destinazione_uso} onChange={(e) => setFormData({...formData, destinazione_uso: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                          <option value="">Seleziona...</option>
                          <option value="residenziale">Residenziale</option><option value="commerciale">Commerciale</option><option value="agricolo">Agricolo</option><option value="magazzino">Magazzino</option><option value="misto">Misto</option>
                        </select>
                      </div>
                    </div>
                    {/* Allegati Classificazione */}
                    {editingImmobile && <AttachmentSection immobileId={editingImmobile.id} section="classificazione" attachments={editingImmobile.attachments} />}
                  </div>
                )}

                {/* DATI CATASTALI */}
                {activeSection === "catastale" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-blue-900 border-b pb-2">📑 Dati Catastali</h3>
                    <h4 className="font-medium text-gray-700">Catasto Fabbricati</h4>
                    <div className="grid md:grid-cols-5 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Sezione Urbana</label><input type="text" value={formData.catasto_sezione_urbana} onChange={(e) => setFormData({...formData, catasto_sezione_urbana: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Foglio</label><input type="text" value={formData.catasto_foglio} onChange={(e) => setFormData({...formData, catasto_foglio: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Particella</label><input type="text" value={formData.catasto_particella} onChange={(e) => setFormData({...formData, catasto_particella: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Subalterno</label><input type="text" value={formData.catasto_subalterno} onChange={(e) => setFormData({...formData, catasto_subalterno: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Categoria</label><input type="text" value={formData.catasto_categoria} onChange={(e) => setFormData({...formData, catasto_categoria: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    </div>
                    <h4 className="font-medium text-gray-700 mt-4">Catasto Terreni</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Foglio</label><input type="text" value={formData.terreno_foglio} onChange={(e) => setFormData({...formData, terreno_foglio: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Particella</label><input type="text" value={formData.terreno_particella} onChange={(e) => setFormData({...formData, terreno_particella: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    </div>
                    {/* Allegati Catastale */}
                    {editingImmobile && <AttachmentSection immobileId={editingImmobile.id} section="catastale" attachments={editingImmobile.attachments} />}
                  </div>
                )}

                {/* DIMENSIONI */}
                {activeSection === "dimensioni" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-blue-900 border-b pb-2">📐 Dimensioni e Struttura</h3>
                    <div className="grid md:grid-cols-4 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Superficie Lorda (mq)</label><input type="number" step="0.01" value={formData.superficie_lorda_mq} onChange={(e) => setFormData({...formData, superficie_lorda_mq: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Superficie Fondiaria (mq)</label><input type="number" step="0.01" value={formData.superficie_fondiaria_mq} onChange={(e) => setFormData({...formData, superficie_fondiaria_mq: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Superficie Coperta (mq)</label><input type="number" step="0.01" value={formData.superficie_coperta_mq} onChange={(e) => setFormData({...formData, superficie_coperta_mq: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Superficie Scoperta (mq)</label><input type="number" step="0.01" value={formData.superficie_scoperta_mq} onChange={(e) => setFormData({...formData, superficie_scoperta_mq: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    </div>
                    <div className="grid md:grid-cols-5 gap-4">
                      <div><label className="block text-sm font-medium mb-1">N. Edifici</label><input type="number" value={formData.n_edifici} onChange={(e) => setFormData({...formData, n_edifici: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Piani F.T.</label><input type="number" value={formData.n_piani_fuori_terra} onChange={(e) => setFormData({...formData, n_piani_fuori_terra: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Piani E.T.</label><input type="number" value={formData.n_piani_entro_terra} onChange={(e) => setFormData({...formData, n_piani_entro_terra: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">N. Vani</label><input type="number" value={formData.n_vani} onChange={(e) => setFormData({...formData, n_vani: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Collegamenti</label><input type="text" value={formData.collegamenti_impianti} onChange={(e) => setFormData({...formData, collegamenti_impianti: e.target.value})} placeholder="Scale, ascensori..." className="w-full px-4 py-2 border rounded-lg" /></div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Volume E.T. (mc)</label><input type="number" step="0.01" value={formData.volume_entro_terra_mc} onChange={(e) => setFormData({...formData, volume_entro_terra_mc: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Volume F.T. (mc)</label><input type="number" step="0.01" value={formData.volume_fuori_terra_mc} onChange={(e) => setFormData({...formData, volume_fuori_terra_mc: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"><input type="checkbox" checked={formData.planimetrie_presenti} onChange={(e) => setFormData({...formData, planimetrie_presenti: e.target.checked})} className="w-5 h-5" /><label>📋 Planimetrie Presenti</label></div>
                    </div>
                    {/* Allegati Dimensioni */}
                    {editingImmobile && <AttachmentSection immobileId={editingImmobile.id} section="dimensioni" attachments={editingImmobile.attachments} />}
                  </div>
                )}

                {/* UBICAZIONE */}
                {activeSection === "ubicazione" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-blue-900 border-b pb-2">📍 Ubicazione</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Localizzazione OMI</label><input type="text" value={formData.localizzazione_omi} onChange={(e) => setFormData({...formData, localizzazione_omi: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Coordinate GPS</label><input type="text" value={formData.coordinate_gps} onChange={(e) => setFormData({...formData, coordinate_gps: e.target.value})} placeholder="40.0833, 8.9167" className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Link Gemello Digitale</label><input type="url" value={formData.link_gemello_digitale} onChange={(e) => setFormData({...formData, link_gemello_digitale: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <input type="checkbox" checked={formData.vista_lago} onChange={(e) => setFormData({...formData, vista_lago: e.target.checked})} className="w-5 h-5 text-blue-600" />
                      <label className="font-medium text-blue-800">🌊 Vista Lago</label>
                      <span className="text-sm text-blue-600">(Visibile nella vetrina pubblica)</span>
                    </div>
                    {/* Allegati Ubicazione */}
                    {editingImmobile && <AttachmentSection immobileId={editingImmobile.id} section="ubicazione" attachments={editingImmobile.attachments} />}
                  </div>
                )}

                {/* CERTIFICAZIONI */}
                {activeSection === "certificazioni" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-blue-900 border-b pb-2">📜 Certificazioni</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"><input type="checkbox" checked={formData.certificato_energetico} onChange={(e) => setFormData({...formData, certificato_energetico: e.target.checked})} className="w-5 h-5" /><label>Certificato Energetico</label></div>
                      <div><label className="block text-sm font-medium mb-1">Classe Energetica</label><select value={formData.classe_energetica} onChange={(e) => setFormData({...formData, classe_energetica: e.target.value})} className="w-full px-4 py-2 border rounded-lg"><option value="">N/A</option><option value="A4">A4</option><option value="A3">A3</option><option value="A2">A2</option><option value="A1">A1</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option><option value="F">F</option><option value="G">G</option></select></div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"><input type="checkbox" checked={formData.cdu} onChange={(e) => setFormData({...formData, cdu: e.target.checked})} className="w-5 h-5" /><label>CDU (Certificato Destinazione Urbanistica)</label></div>
                    </div>
                    {/* Allegati Certificazioni */}
                    {editingImmobile && <AttachmentSection immobileId={editingImmobile.id} section="certificazioni" attachments={editingImmobile.attachments} />}
                  </div>
                )}

                {/* STATO E CONSERVAZIONE */}
                {activeSection === "stato" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-blue-900 border-b pb-2">🔧 Stato e Conservazione</h3>
                    <div className="grid md:grid-cols-4 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Anno Costruzione</label><input type="number" value={formData.anno_costruzione} onChange={(e) => setFormData({...formData, anno_costruzione: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Stato Conservazione</label><select value={formData.stato_conservazione} onChange={(e) => setFormData({...formData, stato_conservazione: e.target.value})} className="w-full px-4 py-2 border rounded-lg"><option value="">Seleziona...</option>{statoConservazioneOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
                      <div><label className="block text-sm font-medium mb-1">Data Ultima Manutenzione</label><input type="date" value={formData.data_ultima_manutenzione} onChange={(e) => setFormData({...formData, data_ultima_manutenzione: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Stato Occupazione</label><select value={formData.stato_occupazione} onChange={(e) => setFormData({...formData, stato_occupazione: e.target.value})} className="w-full px-4 py-2 border rounded-lg"><option value="">Seleziona...</option><option value="libero">Libero</option><option value="occupato">Occupato</option></select></div>
                    </div>
                    {formData.stato_occupazione === "occupato" && (
                      <div className="grid md:grid-cols-3 gap-4">
                        <div><label className="block text-sm font-medium mb-1">Soggetto Occupante</label><input type="text" value={formData.soggetto_occupante} onChange={(e) => setFormData({...formData, soggetto_occupante: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                        <div><label className="block text-sm font-medium mb-1">Natura Giuridica</label><input type="text" value={formData.natura_giuridica_occupazione} onChange={(e) => setFormData({...formData, natura_giuridica_occupazione: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                        <div><label className="block text-sm font-medium mb-1">Tipo e Durata</label><input type="text" value={formData.tipo_occupazione_durata} onChange={(e) => setFormData({...formData, tipo_occupazione_durata: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      </div>
                    )}
                    {/* Allegati Stato */}
                    {editingImmobile && <AttachmentSection immobileId={editingImmobile.id} section="stato" attachments={editingImmobile.attachments} />}
                  </div>
                )}

                {/* VINCOLI */}
                {activeSection === "vincoli" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-blue-900 border-b pb-2">⚖️ Vincoli e Conformità</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"><input type="checkbox" checked={formData.presenza_vincoli} onChange={(e) => setFormData({...formData, presenza_vincoli: e.target.checked})} className="w-5 h-5" /><label>Presenza Vincoli</label></div>
                      {formData.presenza_vincoli && <div><label className="block text-sm font-medium mb-1">Tipo Vincoli</label><input type="text" value={formData.tipo_vincoli} onChange={(e) => setFormData({...formData, tipo_vincoli: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"><input type="checkbox" checked={formData.conformita_urbanistica} onChange={(e) => setFormData({...formData, conformita_urbanistica: e.target.checked})} className="w-5 h-5" /><label>Conformità Urbanistica</label></div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"><input type="checkbox" checked={formData.conformita_catastale} onChange={(e) => setFormData({...formData, conformita_catastale: e.target.checked})} className="w-5 h-5" /><label>Conformità Catastale</label></div>
                    </div>
                    {/* Destinazione Urbanistica con lista dinamica */}
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h4 className="font-medium text-blue-800 mb-3">🏙️ Destinazione Urbanistica</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Destinazione Attuale</label>
                          <select value={formData.destinazione_urbanistica_attuale} onChange={(e) => setFormData({...formData, destinazione_urbanistica_attuale: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                            <option value="">Seleziona o aggiungi nuova...</option>
                            {destinazioniUrbanistiche.map((d, i) => <option key={i} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Aggiungi alla lista</label>
                          <div className="flex gap-2">
                            <input type="text" value={newDestinazione} onChange={(e) => setNewDestinazione(e.target.value)} placeholder="Nuova destinazione..." className="flex-1 px-4 py-2 border rounded-lg" />
                            <button type="button" onClick={addDestinazione} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Plus size={18} /></button>
                          </div>
                        </div>
                      </div>
                      {destinazioniUrbanistiche.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {destinazioniUrbanistiche.map((d, i) => <span key={i} className="px-2 py-1 bg-white text-blue-700 text-xs rounded border">{d}</span>)}
                        </div>
                      )}
                      <div className="grid md:grid-cols-2 gap-4 mt-3">
                        <div><label className="block text-sm font-medium mb-1">Destinazione Prevista</label><input type="text" value={formData.destinazione_urbanistica_prevista} onChange={(e) => setFormData({...formData, destinazione_urbanistica_prevista: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                        <div><label className="block text-sm font-medium mb-1">Iter Cambio Destinazione</label><input type="text" value={formData.iter_cambio_destinazione} onChange={(e) => setFormData({...formData, iter_cambio_destinazione: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* IMPIANTI */}
                {activeSection === "impianti" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-blue-900 border-b pb-2">⚡ Impianti e Dotazioni</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"><input type="checkbox" checked={formData.impianto_idrico} onChange={(e) => setFormData({...formData, impianto_idrico: e.target.checked})} className="w-5 h-5" /><label>💧 Impianto Idrico</label></div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"><input type="checkbox" checked={formData.impianto_elettrico} onChange={(e) => setFormData({...formData, impianto_elettrico: e.target.checked})} className="w-5 h-5" /><label>⚡ Impianto Elettrico</label></div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"><input type="checkbox" checked={formData.impianto_fognario} onChange={(e) => setFormData({...formData, impianto_fognario: e.target.checked})} className="w-5 h-5" /><label>🚿 Impianto Fognario</label></div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"><input type="checkbox" checked={formData.riscaldamento} onChange={(e) => setFormData({...formData, riscaldamento: e.target.checked})} className="w-5 h-5" /><label>🔥 Riscaldamento</label></div>
                      {formData.riscaldamento && <div><label className="block text-sm font-medium mb-1">Tipo Riscaldamento</label><input type="text" value={formData.tipo_riscaldamento} onChange={(e) => setFormData({...formData, tipo_riscaldamento: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"><input type="checkbox" checked={formData.connessione_internet} onChange={(e) => setFormData({...formData, connessione_internet: e.target.checked})} className="w-5 h-5" /><label>📶 Connessione Internet</label></div>
                      {formData.connessione_internet && <div><label className="block text-sm font-medium mb-1">Tipo Connessione</label><input type="text" value={formData.tipo_connessione} onChange={(e) => setFormData({...formData, tipo_connessione: e.target.value})} placeholder="ADSL, Fibra, 4G..." className="w-full px-4 py-2 border rounded-lg" /></div>}
                    </div>
                    {/* Lista Impianti Dinamica */}
                    <div className="bg-yellow-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-yellow-800">📋 Lista Impianti Certificati</h4>
                        <button type="button" onClick={addImpianto} className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm flex items-center gap-1"><Plus size={14} /> Aggiungi</button>
                      </div>
                      {(formData.impianti_lista || []).length === 0 ? (
                        <p className="text-gray-500 text-sm">Nessun impianto aggiunto. Clicca "Aggiungi" per iniziare.</p>
                      ) : (
                        <div className="space-y-2">
                          {(formData.impianti_lista || []).map((imp, i) => (
                            <div key={imp.id || i} className="flex items-center gap-2 bg-white p-2 rounded-lg">
                              <input type="text" value={imp.descrizione} onChange={(e) => updateImpianto(i, "descrizione", e.target.value)} placeholder="Descrizione impianto" className="flex-1 px-3 py-1 border rounded" />
                              <input type="date" value={imp.data_certificazione || ""} onChange={(e) => updateImpianto(i, "data_certificazione", e.target.value)} className="px-3 py-1 border rounded" />
                              <button type="button" onClick={() => removeImpianto(i)} className="p-1 text-red-600 hover:bg-red-100 rounded"><Trash2 size={16} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Allegati Impianti */}
                    {editingImmobile && <AttachmentSection immobileId={editingImmobile.id} section="impianti" attachments={editingImmobile.attachments} />}
                  </div>
                )}

                {/* MARKETING */}
                {activeSection === "marketing" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-blue-900 border-b pb-2">💰 Marketing e Valorizzazione</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Prezzo Richiesto (€)</label><input type="number" step="0.01" value={formData.prezzo_richiesto} onChange={(e) => setFormData({...formData, prezzo_richiesto: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Prezzo al mq (€)</label><input type="number" step="0.01" value={formData.prezzo_mq} onChange={(e) => setFormData({...formData, prezzo_mq: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg"><input type="checkbox" checked={formData.prezzo_pubblico} onChange={(e) => setFormData({...formData, prezzo_pubblico: e.target.checked})} className="w-5 h-5" /><label>💶 Mostra Prezzo Pubblicamente</label></div>
                    </div>
                    <div><label className="block text-sm font-medium mb-1">Descrizione Narrativa</label><textarea value={formData.descrizione_narrativa} onChange={(e) => setFormData({...formData, descrizione_narrativa: e.target.value})} rows={3} placeholder="Racconta la storia di questa casa..." className="w-full px-4 py-2 border rounded-lg"></textarea></div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Punti di Forza</label><input type="text" value={formData.punti_forza} onChange={(e) => setFormData({...formData, punti_forza: e.target.value})} placeholder="Vista lago, silenzioso, vicino servizi..." className="w-full px-4 py-2 border rounded-lg" /></div>
                      <div><label className="block text-sm font-medium mb-1">Target Ideale</label><select value={formData.target_ideale} onChange={(e) => setFormData({...formData, target_ideale: e.target.value})} className="w-full px-4 py-2 border rounded-lg"><option value="">Seleziona...</option>{targetOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                    </div>
                    <div><label className="block text-sm font-medium mb-1">Potenzialità d'Uso</label><input type="text" value={formData.potenzialita_uso} onChange={(e) => setFormData({...formData, potenzialita_uso: e.target.value})} placeholder="B&B, Atelier, Smart Working, Casa vacanze..." className="w-full px-4 py-2 border rounded-lg" /></div>
                    {/* Allegati Marketing */}
                    {editingImmobile && <AttachmentSection immobileId={editingImmobile.id} section="marketing" attachments={editingImmobile.attachments} />}
                  </div>
                )}

                {/* REFERENTI */}
                {activeSection === "responsabili" && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-blue-900 border-b pb-2">👥 Referenti</h3>
                    <div className="bg-green-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-green-800">📋 Lista Referenti</h4>
                        <button type="button" onClick={addReferente} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-1"><Plus size={14} /> Aggiungi Referente</button>
                      </div>
                      {(formData.referenti || []).length === 0 ? (
                        <p className="text-gray-500 text-sm">Nessun referente aggiunto. Clicca "Aggiungi Referente" per iniziare.</p>
                      ) : (
                        <div className="space-y-2">
                          {(formData.referenti || []).map((ref, i) => (
                            <div key={ref.id || i} className="flex items-center gap-2 bg-white p-2 rounded-lg">
                              <input type="text" value={ref.nominativo} onChange={(e) => updateReferente(i, "nominativo", e.target.value)} placeholder="Nominativo" className="flex-1 px-3 py-2 border rounded" />
                              <input type="text" value={ref.contatti || ""} onChange={(e) => updateReferente(i, "contatti", e.target.value)} placeholder="Contatti (tel, email)" className="flex-1 px-3 py-2 border rounded" />
                              <button type="button" onClick={() => removeReferente(i)} className="p-2 text-red-600 hover:bg-red-100 rounded"><Trash2 size={18} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg"><input type="checkbox" checked={formData.published} onChange={(e) => setFormData({...formData, published: e.target.checked})} className="w-5 h-5" /><label>✅ Pubblica nella Vetrina</label></div>
                  </div>
                )}

                {activeSection === "digitaltwin" && editingImmobile && (
                  <DigitalTwinEditor immobileId={editingImmobile.id} />
                )}

                {activeSection === "digitaltwin" && !editingImmobile && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🌐</div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Digital Twin Home</h3>
                    <p className="text-gray-500">Salva prima l'immobile, poi potrai configurare il tour virtuale.</p>
                  </div>
                )}

                {/* Form buttons */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">Annulla</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"><Save size={18} /> Salva Immobile</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Immobili List */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div></div>
        ) : filteredImmobili.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow"><Landmark size={48} className="mx-auto mb-4 text-gray-400" /><p className="text-gray-500">Nessun immobile trovato. Clicca "Nuovo Immobile" per iniziare.</p></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredImmobili.map((imm) => (
              <div key={imm.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
                {/* Image */}
                <div className="relative h-48 bg-gray-200">
                  {imm.images && imm.images.length > 0 ? (
                    <img src={`${BACKEND_URL}${imm.images[0].url}`} alt={imm.denominazione} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400"><Camera size={48} /></div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {imm.published ? <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">Pubblicato</span> : <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded">Bozza</span>}
                  </div>
                  {imm.tipologia && <span className="absolute bottom-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">{getTipologiaLabel(imm.tipologia)}</span>}
                </div>
                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-800 mb-1">{imm.denominazione}</h3>
                  <p className="text-gray-500 text-sm mb-3">{imm.indirizzo_via}, {imm.indirizzo_comune}</p>
                  <div className="flex flex-wrap gap-2 mb-3 text-xs text-gray-600">
                    {imm.superficie_lorda_mq && <span className="bg-gray-100 px-2 py-1 rounded">📐 {imm.superficie_lorda_mq} mq</span>}
                    {imm.n_vani && <span className="bg-gray-100 px-2 py-1 rounded">🚪 {imm.n_vani} vani</span>}
                    {imm.stato_conservazione && <span className={`px-2 py-1 rounded ${imm.stato_conservazione === "ottimo" || imm.stato_conservazione === "buono" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{getStatoLabel(imm.stato_conservazione)}</span>}
                  </div>
                  {imm.prezzo_richiesto && <p className="text-xl font-bold text-blue-600 mb-3">€ {imm.prezzo_richiesto.toLocaleString()}</p>}
                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(imm)} className="flex-1 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm flex items-center justify-center gap-1"><Edit size={16} /> Modifica</button>
                    <button onClick={() => handleDelete(imm.id)} className="py-2 px-3 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                  {/* Images & Attachments */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">📸 Foto ({imm.images?.length || 0}) {imm.images?.some(i => i.is_360) && <span className="text-purple-600 ml-1">🌐</span>}</span>
                      <div className="flex gap-2">
                        <label className="text-xs text-blue-600 hover:underline cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(imm.id, e.target.files[0], "", false)} />
                          + Foto
                        </label>
                        <label className="text-xs text-purple-600 hover:underline cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(imm.id, e.target.files[0], "Foto 360°", true)} />
                          + 360°
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {imm.images?.slice(0, 4).map(img => (
                        <div key={img.id} className="relative group">
                          <img src={`${BACKEND_URL}${img.url}`} className="w-12 h-12 object-cover rounded" alt="" />
                          {img.is_360 && <span className="absolute top-0 left-0 bg-purple-600 text-white text-[8px] px-1 rounded-br">360°</span>}
                          <button onClick={() => handleImageDelete(imm.id, img.id)} className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 text-xs"><X size={10} /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">📎 Allegati ({imm.attachments?.length || 0})</span>
                      <label className="text-xs text-blue-600 hover:underline cursor-pointer">
                        <input type="file" className="hidden" onChange={(e) => { const desc = prompt("Descrizione allegato:"); if (desc !== null) handleAttachmentUpload(imm.id, e.target.files[0], desc, "generale"); }} />
                        + Allega file
                      </label>
                    </div>
                    {imm.attachments?.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {imm.attachments.map(att => (
                          <div key={att.id} className="flex items-center justify-between text-xs bg-gray-50 p-1 rounded">
                            <span className="truncate flex-1">{att.description || att.filename}</span>
                            <div className="flex gap-1">
                              <a href={`${BACKEND_URL}${att.url}`} target="_blank" rel="noopener noreferrer" className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Eye size={12} /></a>
                              <button onClick={() => handleAttachmentDelete(imm.id, att.id)} className="p-1 text-red-600 hover:bg-red-100 rounded"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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

// ============== DIGITAL TWIN HOME VIEWER ==============
const DigitalTwinViewer = ({ immobileId, immobileName, onClose }) => {
  const [twin, setTwin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [showFloorPlan, setShowFloorPlan] = useState(true);
  const [viewerError, setViewerError] = useState(null);
  const [viewerReady, setViewerReady] = useState(false);
  const panoramaRef = useRef(null);
  const viewerInstance = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    fetchTwin();
    return () => {
      isMounted.current = false;
      if (viewerInstance.current) {
        try {
          viewerInstance.current.destroy();
        } catch (e) {
          console.warn("Error destroying viewer:", e);
        }
        viewerInstance.current = null;
      }
    };
  }, [immobileId]);

  useEffect(() => {
    if (currentRoom && panoramaRef.current && isMounted.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (isMounted.current) initViewer();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentRoom]);

  const fetchTwin = async () => {
    try {
      const response = await axios.get(`${API}/immobili/${immobileId}/digital-twin`);
      if (response.data && isMounted.current) {
        setTwin(response.data);
        // Set initial room
        const startRoom = response.data.rooms?.find(r => r.id === response.data.start_room_id) || response.data.rooms?.[0];
        if (startRoom) setCurrentRoom(startRoom);
      }
    } catch (error) {
      console.error("Error loading digital twin:", error);
    }
    if (isMounted.current) setLoading(false);
  };

  const initViewer = async () => {
    if (!currentRoom || !panoramaRef.current || !isMounted.current) return;
    
    setViewerReady(false);
    setViewerError(null);
    
    try {
      // Destroy existing viewer first
      if (viewerInstance.current) {
        try {
          viewerInstance.current.destroy();
        } catch (e) {
          console.warn("Error destroying old viewer:", e);
        }
        viewerInstance.current = null;
      }

      const { Viewer } = await import('@photo-sphere-viewer/core');
      
      if (!isMounted.current || !panoramaRef.current) return;

      const viewer = new Viewer({
        container: panoramaRef.current,
        panorama: `${BACKEND_URL}${currentRoom.image_360_url}`,
        navbar: ['zoom', 'fullscreen'],
        defaultYaw: (currentRoom.default_yaw || 0) * Math.PI / 180,
        defaultPitch: (currentRoom.default_pitch || 0) * Math.PI / 180,
        defaultZoomLvl: 50,
        loadingTxt: 'Caricamento...',
        mousewheel: true,
        touchmoveTwoFingers: true,
      });

      viewer.addEventListener('ready', () => {
        if (isMounted.current) setViewerReady(true);
      });

      viewerInstance.current = viewer;
    } catch (error) {
      console.error("Error initializing viewer:", error);
      if (isMounted.current) {
        setViewerError("Errore nel caricamento della vista 360°");
      }
    }
  };

  const navigateToRoom = (roomId) => {
    const room = twin?.rooms?.find(r => r.id === roomId);
    if (room && room.id !== currentRoom?.id) {
      setCurrentRoom(room);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p>Caricamento Digital Twin...</p>
        </div>
      </div>
    );
  }

  if (!twin || !twin.rooms?.length) {
    return (
      <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🏠</div>
          <h2 className="text-2xl font-bold mb-2">Digital Twin non disponibile</h2>
          <p className="text-gray-400 mb-6">Il tour virtuale per questo immobile non è ancora stato creato.</p>
          <button onClick={onClose} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold">
            Chiudi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[200] flex">
      {/* Close button */}
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
      >
        <X size={28} />
      </button>

      {/* Floor Plan Sidebar */}
      {showFloorPlan && twin.floor_plan_url && (
        <div className="w-80 bg-gray-900 p-4 flex flex-col">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Map size={20} /> Planimetria
          </h3>
          
          {/* Floor Plan Image with Room Points */}
          <div className="relative bg-white rounded-lg overflow-hidden mb-4 flex-shrink-0">
            <img 
              src={`${BACKEND_URL}${twin.floor_plan_url}`} 
              alt="Planimetria" 
              className="w-full h-auto"
            />
            {/* Room markers on floor plan */}
            {twin.rooms.filter(r => r.floor_plan_x != null && r.floor_plan_y != null).map(room => (
              <button
                key={room.id}
                onClick={() => navigateToRoom(room.id)}
                className={`absolute w-6 h-6 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all ${
                  currentRoom?.id === room.id 
                    ? 'bg-purple-600 ring-4 ring-purple-300 scale-125' 
                    : 'bg-blue-500 hover:bg-blue-400 hover:scale-110'
                }`}
                style={{ left: `${room.floor_plan_x}%`, top: `${room.floor_plan_y}%` }}
                title={room.name}
              >
                <span className="sr-only">{room.name}</span>
              </button>
            ))}
          </div>

          {/* Room List */}
          <div className="flex-1 overflow-y-auto">
            <h4 className="text-gray-400 text-sm font-semibold mb-2">STANZE ({twin.rooms.length})</h4>
            <div className="space-y-2">
              {twin.rooms.map((room, idx) => (
                <button
                  key={room.id}
                  onClick={() => navigateToRoom(room.id)}
                  className={`w-full text-left p-3 rounded-lg transition flex items-center gap-3 ${
                    currentRoom?.id === room.id 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{room.name}</p>
                    {room.description && (
                      <p className="text-xs opacity-70 truncate">{room.description}</p>
                    )}
                  </div>
                  {currentRoom?.id === room.id && (
                    <span className="text-purple-200">●</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Property Info */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm">{immobileName}</p>
            <p className="text-purple-400 text-xs mt-1">🌐 Digital Twin Home</p>
          </div>
        </div>
      )}

      {/* Toggle Floor Plan Button */}
      <button
        onClick={() => setShowFloorPlan(!showFloorPlan)}
        className="absolute left-4 bottom-4 z-50 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition"
      >
        <Map size={18} />
        {showFloorPlan ? 'Nascondi Mappa' : 'Mostra Mappa'}
      </button>

      {/* Main Panorama Viewer */}
      <div className="flex-1 relative">
        {/* Room Title */}
        <div className="absolute top-4 left-4 z-40 bg-black/70 backdrop-blur px-4 py-2 rounded-lg">
          <h2 className="text-white font-bold text-lg">{currentRoom?.name}</h2>
          {currentRoom?.description && (
            <p className="text-gray-300 text-sm">{currentRoom.description}</p>
          )}
        </div>

        {/* 360 Viewer */}
        <div ref={panoramaRef} className="w-full h-full" />

        {/* Hotspot Navigation Buttons */}
        {currentRoom?.hotspots?.length > 0 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40 flex gap-2">
            {currentRoom.hotspots.map(hotspot => {
              const targetRoom = twin.rooms.find(r => r.id === hotspot.target_room_id);
              if (!targetRoom) return null;
              return (
                <button
                  key={hotspot.id}
                  onClick={() => navigateToRoom(hotspot.target_room_id)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full font-medium flex items-center gap-2 transition shadow-lg"
                >
                  <Navigation size={16} />
                  {hotspot.label || `Vai a ${targetRoom.name}`}
                </button>
              );
            })}
          </div>
        )}

        {/* Quick Room Navigation */}
        <div className="absolute top-4 right-16 z-40 flex gap-2">
          {twin.rooms.map((room, idx) => (
            <button
              key={room.id}
              onClick={() => navigateToRoom(room.id)}
              className={`w-10 h-10 rounded-full font-bold transition ${
                currentRoom?.id === room.id 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title={room.name}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============== HOME TADASUNI - PUBLIC PAGE ==============
const ImmobiliPage = ({ lang = "it" }) => {
  const [immobili, setImmobili] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImmobile, setSelectedImmobile] = useState(null);
  const [filters, setFilters] = useState({ tipologia: "all", stato: "all", prezzoMax: "", superficieMin: "", vistaLago: false });
  const [searchTerm, setSearchTerm] = useState("");
  // Gallery state
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [show360Viewer, setShow360Viewer] = useState(false);
  // Digital Twin state
  const [showDigitalTwin, setShowDigitalTwin] = useState(false);
  const [digitalTwinImmobile, setDigitalTwinImmobile] = useState(null);
  const panoramaRef = useRef(null);
  const viewerInstance = useRef(null);

  const tipologieOptions = [
    { value: "casa_singola", label: "Casa Singola" },
    { value: "villetta", label: "Villetta" },
    { value: "appartamento", label: "Appartamento" },
    { value: "magazzino", label: "Magazzino" },
    { value: "rudere", label: "Rudere" },
    { value: "terreno", label: "Terreno" }
  ];

  useEffect(() => {
    fetchImmobili();
  }, []);

  // Initialize 360 viewer when showing
  useEffect(() => {
    if (show360Viewer && lightboxImage?.is_360 && panoramaRef.current) {
      // Dynamically import Photo Sphere Viewer
      import('@photo-sphere-viewer/core').then(({ Viewer }) => {
        import('@photo-sphere-viewer/core/index.css');
        if (viewerInstance.current) {
          viewerInstance.current.destroy();
        }
        viewerInstance.current = new Viewer({
          container: panoramaRef.current,
          panorama: `${BACKEND_URL}${lightboxImage.url}`,
          navbar: ['zoom', 'move', 'fullscreen'],
          defaultZoomLvl: 50,
        });
      });
    }
    return () => {
      if (viewerInstance.current) {
        viewerInstance.current.destroy();
        viewerInstance.current = null;
      }
    };
  }, [show360Viewer, lightboxImage]);

  const fetchImmobili = async () => {
    try {
      const response = await axios.get(`${API}/immobili?published_only=true`);
      setImmobili(response.data);
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const filteredImmobili = immobili.filter(imm => {
    const matchSearch = imm.denominazione?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipologia = filters.tipologia === "all" || imm.tipologia === filters.tipologia;
    const matchStato = filters.stato === "all" || imm.stato_conservazione === filters.stato;
    const matchPrezzo = !filters.prezzoMax || (imm.prezzo_richiesto && imm.prezzo_richiesto <= parseFloat(filters.prezzoMax));
    const matchSuperficie = !filters.superficieMin || (imm.superficie_lorda_mq && imm.superficie_lorda_mq >= parseFloat(filters.superficieMin));
    return matchSearch && matchTipologia && matchStato && matchPrezzo && matchSuperficie;
  });

  const getTipologiaLabel = (value) => tipologieOptions.find(t => t.value === value)?.label || value;

  // Gallery navigation
  const openLightbox = (image, index, images) => {
    setLightboxImage(image);
    setLightboxIndex(index);
    setShow360Viewer(image.is_360);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
    setShow360Viewer(false);
  };

  const navigateLightbox = (direction, images) => {
    const newIndex = (lightboxIndex + direction + images.length) % images.length;
    setLightboxIndex(newIndex);
    setLightboxImage(images[newIndex]);
    setShow360Viewer(images[newIndex].is_360);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-blue-900 text-white py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">🏠 Home Tadasuni</h1>
              <p className="text-blue-200">Trova la tua casa nel borgo</p>
            </div>
            <Link to="/" className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg">← Torna al sito</Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="bg-gradient-to-r from-blue-800 to-indigo-900 rounded-2xl p-8 mb-8 text-white">
          <h2 className="text-2xl font-bold mb-2">Vivi l'esperienza di Tadasuni</h2>
          <p className="text-blue-200 mb-4">Scopri le case disponibili nel borgo e inizia una nuova vita in Sardegna</p>
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2"><span className="text-2xl font-bold">{immobili.length}</span><span className="text-blue-200 ml-2">Immobili</span></div>
            <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2"><span className="text-2xl font-bold">{immobili.filter(i => i.stato_occupazione === "libero").length}</span><span className="text-blue-200 ml-2">Disponibili</span></div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]"><label className="block text-sm font-medium text-gray-700 mb-1">🔍 Cerca</label><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Nome o indirizzo..." className="w-full px-4 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipologia</label><select value={filters.tipologia} onChange={(e) => setFilters({...filters, tipologia: e.target.value})} className="px-4 py-2 border rounded-lg"><option value="all">Tutte</option>{tipologieOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Stato</label><select value={filters.stato} onChange={(e) => setFilters({...filters, stato: e.target.value})} className="px-4 py-2 border rounded-lg"><option value="all">Tutti</option><option value="ottimo">Ottimo</option><option value="buono">Buono</option><option value="da_ristrutturare">Da Ristrutturare</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Prezzo Max (€)</label><input type="number" value={filters.prezzoMax} onChange={(e) => setFilters({...filters, prezzoMax: e.target.value})} placeholder="es. 50000" className="w-32 px-4 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Superficie Min (mq)</label><input type="number" value={filters.superficieMin} onChange={(e) => setFilters({...filters, superficieMin: e.target.value})} placeholder="es. 50" className="w-32 px-4 py-2 border rounded-lg" /></div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div></div>
        ) : filteredImmobili.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow"><p className="text-gray-500">Nessun immobile corrisponde ai criteri di ricerca.</p></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredImmobili.map((imm) => (
              <div key={imm.id} onClick={() => setSelectedImmobile(imm)} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer group">
                <div className="relative h-56 bg-gray-200">
                  {imm.images && imm.images.length > 0 ? (
                    <img src={`${BACKEND_URL}${imm.images[0].url}`} alt={imm.denominazione} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400"><Camera size={64} /></div>
                  )}
                  {imm.tipologia && <span className="absolute top-3 left-3 px-3 py-1 bg-blue-600 text-white text-sm rounded-full">{getTipologiaLabel(imm.tipologia)}</span>}
                  {imm.stato_occupazione === "libero" && <span className="absolute top-3 right-3 px-3 py-1 bg-green-500 text-white text-sm rounded-full">Disponibile</span>}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-xl text-gray-800 mb-1">{imm.denominazione}</h3>
                  <p className="text-gray-500 text-sm mb-3 flex items-center gap-1"><MapPin size={14} /> {imm.indirizzo_via}, {imm.indirizzo_comune}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {imm.superficie_lorda_mq && <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">📐 {imm.superficie_lorda_mq} mq</span>}
                    {imm.n_vani && <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">🚪 {imm.n_vani} vani</span>}
                    {imm.anno_costruzione && <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">📅 {imm.anno_costruzione}</span>}
                  </div>
                  {imm.prezzo_pubblico && imm.prezzo_richiesto ? (
                    <p className="text-2xl font-bold text-blue-600">€ {imm.prezzo_richiesto.toLocaleString()}</p>
                  ) : (
                    <p className="text-lg text-gray-500">Prezzo su richiesta</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedImmobile && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="relative">
                {selectedImmobile.images && selectedImmobile.images.length > 0 ? (
                  <img src={`${BACKEND_URL}${selectedImmobile.images[0].url}`} alt="" className="w-full h-64 object-cover" />
                ) : (
                  <div className="w-full h-64 bg-gray-200 flex items-center justify-center"><Camera size={64} className="text-gray-400" /></div>
                )}
                <button onClick={() => setSelectedImmobile(null)} className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"><X size={24} /></button>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedImmobile.denominazione}</h2>
                    <p className="text-gray-500 flex items-center gap-1"><MapPin size={16} /> {selectedImmobile.indirizzo_via}, {selectedImmobile.indirizzo_comune}</p>
                  </div>
                  {selectedImmobile.prezzo_pubblico && selectedImmobile.prezzo_richiesto && (
                    <div className="text-right"><p className="text-3xl font-bold text-blue-600">€ {selectedImmobile.prezzo_richiesto.toLocaleString()}</p>{selectedImmobile.prezzo_mq && <p className="text-sm text-gray-500">€ {selectedImmobile.prezzo_mq}/mq</p>}</div>
                  )}
                </div>
                
                {/* Gallery Section - Enhanced */}
                {selectedImmobile.images && selectedImmobile.images.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      📸 Galleria Fotografica 
                      {selectedImmobile.images.some(img => img.is_360) && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Include foto 360°</span>
                      )}
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {selectedImmobile.images.map((img, idx) => (
                        <div 
                          key={img.id} 
                          onClick={() => openLightbox(img, idx, selectedImmobile.images)}
                          className="relative aspect-square cursor-pointer group overflow-hidden rounded-lg bg-gray-100"
                        >
                          <img 
                            src={`${BACKEND_URL}${img.url}`} 
                            alt={img.caption || `Foto ${idx + 1}`} 
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-300" 
                          />
                          {img.is_360 && (
                            <div className="absolute top-1 right-1 bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <span className="animate-spin-slow">🌐</span> 360°
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                            <Eye size={24} className="text-white opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedImmobile.descrizione_narrativa && (
                  <div className="mb-6"><h3 className="font-semibold text-gray-800 mb-2">📖 La Storia</h3><p className="text-gray-600 leading-relaxed">{selectedImmobile.descrizione_narrativa}</p></div>
                )}

                {/* Features */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">📐 Caratteristiche</h3>
                    <div className="space-y-2 text-sm">
                      {selectedImmobile.tipologia && <p><span className="text-gray-500">Tipologia:</span> <span className="font-medium">{getTipologiaLabel(selectedImmobile.tipologia)}</span></p>}
                      {selectedImmobile.superficie_lorda_mq && <p><span className="text-gray-500">Superficie:</span> <span className="font-medium">{selectedImmobile.superficie_lorda_mq} mq</span></p>}
                      {selectedImmobile.n_vani && <p><span className="text-gray-500">Vani:</span> <span className="font-medium">{selectedImmobile.n_vani}</span></p>}
                      {selectedImmobile.n_piani_fuori_terra && <p><span className="text-gray-500">Piani:</span> <span className="font-medium">{selectedImmobile.n_piani_fuori_terra}</span></p>}
                      {selectedImmobile.anno_costruzione && <p><span className="text-gray-500">Anno:</span> <span className="font-medium">{selectedImmobile.anno_costruzione}</span></p>}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">⚡ Dotazioni</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedImmobile.impianto_idrico && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">💧 Acqua</span>}
                      {selectedImmobile.impianto_elettrico && <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">⚡ Elettricità</span>}
                      {selectedImmobile.impianto_fognario && <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">🚿 Fognatura</span>}
                      {selectedImmobile.riscaldamento && <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm">🔥 Riscaldamento</span>}
                      {selectedImmobile.connessione_internet && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">📶 Internet</span>}
                    </div>
                  </div>
                </div>

                {/* Ubicazione */}
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 mb-6 border border-cyan-200">
                  <h3 className="font-semibold text-cyan-800 mb-3 flex items-center gap-2">📍 Ubicazione</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2 text-sm">
                      {selectedImmobile.indirizzo_via && (
                        <p><span className="text-gray-500">Indirizzo:</span> <span className="font-medium">{selectedImmobile.indirizzo_via}, {selectedImmobile.indirizzo_comune}</span></p>
                      )}
                      {selectedImmobile.localizzazione_omi && (
                        <p><span className="text-gray-500">Zona OMI:</span> <span className="font-medium">{selectedImmobile.localizzazione_omi}</span></p>
                      )}
                      {selectedImmobile.coordinate_gps && (
                        <p><span className="text-gray-500">GPS:</span> <span className="font-medium">{selectedImmobile.coordinate_gps}</span></p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 items-start">
                      {selectedImmobile.vista_lago && (
                        <span className="bg-cyan-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-md">
                          🌊 Vista Lago
                        </span>
                      )}
                      {selectedImmobile.coordinate_gps && (
                        <a 
                          href={`https://maps.google.com/?q=${selectedImmobile.coordinate_gps}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition"
                        >
                          <MapPin size={16} /> Vedi su Mappa
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Potential */}
                {(selectedImmobile.punti_forza || selectedImmobile.potenzialita_uso) && (
                  <div className="bg-blue-50 rounded-xl p-4 mb-6">
                    <h3 className="font-semibold text-blue-800 mb-2">✨ Potenzialità</h3>
                    {selectedImmobile.punti_forza && <p className="text-blue-700 mb-1"><strong>Punti di forza:</strong> {selectedImmobile.punti_forza}</p>}
                    {selectedImmobile.potenzialita_uso && <p className="text-blue-700"><strong>Ideale per:</strong> {selectedImmobile.potenzialita_uso}</p>}
                  </div>
                )}

                {/* CTA */}
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => { setDigitalTwinImmobile(selectedImmobile); setShowDigitalTwin(true); }}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-2"
                  >
                    🌐 Digital Twin Home
                  </button>
                  {selectedImmobile.link_gemello_digitale && <a href={selectedImmobile.link_gemello_digitale} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-2">🏠 Gemello Digitale Esterno</a>}
                  <a href={`mailto:info@comune.tadasuni.or.it?subject=Richiesta informazioni: ${selectedImmobile.denominazione}`} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2"><Mail size={18} /> Richiedi Informazioni</a>
                  {selectedImmobile.coordinate_gps && <a href={`https://maps.google.com/?q=${selectedImmobile.coordinate_gps}`} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2"><MapPin size={18} /> Vedi su Mappa</a>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox for Gallery - Large View (1000x1000+) */}
        {lightboxImage && (
          <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center" onClick={closeLightbox}>
            <button 
              onClick={closeLightbox} 
              className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition z-10"
            >
              <X size={28} />
            </button>
            
            {/* Navigation arrows */}
            {selectedImmobile?.images?.length > 1 && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); navigateLightbox(-1, selectedImmobile.images); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition z-10"
                >
                  <ChevronUp size={32} className="rotate-[-90deg]" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); navigateLightbox(1, selectedImmobile.images); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition z-10"
                >
                  <ChevronUp size={32} className="rotate-90" />
                </button>
              </>
            )}

            {/* Image container */}
            <div onClick={(e) => e.stopPropagation()} className="relative max-w-[90vw] max-h-[90vh]">
              {lightboxImage.is_360 && show360Viewer ? (
                /* 360° Panorama Viewer */
                <div className="relative">
                  <div 
                    ref={panoramaRef} 
                    className="w-[1000px] h-[700px] max-w-[90vw] max-h-[80vh] rounded-lg overflow-hidden"
                  />
                  <div className="absolute top-4 left-4 bg-purple-600 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-2">
                    <span className="animate-pulse">🌐</span> Vista 360° - Trascina per esplorare
                  </div>
                </div>
              ) : (
                /* Standard image */
                <img 
                  src={`${BACKEND_URL}${lightboxImage.url}`} 
                  alt={lightboxImage.caption || "Foto immobile"} 
                  className="max-w-[1200px] max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                  style={{ minWidth: '600px', minHeight: '400px' }}
                />
              )}
              
              {/* Caption and counter */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
                <div className="flex justify-between items-center text-white">
                  <div>
                    {lightboxImage.caption && <p className="text-lg">{lightboxImage.caption}</p>}
                    {lightboxImage.is_360 && (
                      <span className="inline-flex items-center gap-1 text-purple-300 text-sm mt-1">
                        <span>🌐</span> Foto 360° - Insta360 X5
                      </span>
                    )}
                  </div>
                  <span className="text-white/70 text-sm">
                    {lightboxIndex + 1} / {selectedImmobile?.images?.length || 1}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Digital Twin Viewer */}
      {showDigitalTwin && digitalTwinImmobile && (
        <DigitalTwinViewer 
          immobileId={digitalTwinImmobile.id}
          immobileName={digitalTwinImmobile.denominazione}
          onClose={() => { setShowDigitalTwin(false); setDigitalTwinImmobile(null); }}
        />
      )}

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-blue-200">🏠 Home Tadasuni - Un progetto di <strong>Tadasuni Borgo Experience</strong></p>
          <p className="text-sm text-blue-300 mt-2">Trivor srl - Fairsgate srl ©</p>
        </div>
      </footer>
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
        <Route path="/immobili" element={<ImmobiliPage lang={lang} />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/attrazioni-admin" element={<AttractionsAdminPanel />} />
        <Route path="/immobili-admin" element={<ImmobiliAdminPanel />} />
        <Route path="/chatbot-admin" element={<ChatbotAdminPanel />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
