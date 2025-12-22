import { useState, useEffect, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { MessageCircle, X, Send, Globe, Menu, ChevronDown, MapPin, Mail, Calendar, Church, Palette, Trees, ExternalLink, Play, Plus, Trash2, Edit, Upload, Image, LogOut, Eye, EyeOff, ArrowLeft, Save } from "lucide-react";

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
    chatWelcome: "Ciao! Sono l'assistente virtuale di Visit Tadasuni. Come posso aiutarti?",
    howToReach: "Come Arrivare",
    services: "Servizi",
    gallery: "Galleria",
    footer: "© 2025 Visit Tadasuni - Comune di Tadasuni",
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
    chatWelcome: "Hello! I'm the virtual assistant of Visit Tadasuni. How can I help you?",
    howToReach: "How to Reach",
    services: "Services",
    gallery: "Gallery",
    footer: "© 2025 Visit Tadasuni - Municipality of Tadasuni",
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
    chatWelcome: "Bonjour! Je suis l'assistant virtuel de Visit Tadasuni. Comment puis-je vous aider?",
    howToReach: "Comment Arriver",
    services: "Services",
    gallery: "Galerie",
    footer: "© 2025 Visit Tadasuni - Commune de Tadasuni",
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
    chatWelcome: "¡Hola! Soy el asistente virtual de Visit Tadasuni. ¿Cómo puedo ayudarte?",
    howToReach: "Cómo Llegar",
    services: "Servicios",
    gallery: "Galería",
    footer: "© 2025 Visit Tadasuni - Municipio de Tadasuni",
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
    chatWelcome: "Hallo! Ich bin der virtuelle Assistent von Visit Tadasuni. Wie kann ich Ihnen helfen?",
    howToReach: "Anfahrt",
    services: "Dienstleistungen",
    gallery: "Galerie",
    footer: "© 2025 Visit Tadasuni - Gemeinde Tadasuni",
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

const languageFlags = {
  it: "🇮🇹",
  en: "🇬🇧",
  fr: "🇫🇷",
  es: "🇪🇸",
  de: "🇩🇪"
};

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

// Helper to get localized content
const getLocalizedContent = (item, field, lang) => {
  if (lang === "it") return item[field] || "";
  const localizedField = `${field}_${lang}`;
  return item[localizedField] || item[field] || "";
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
          <h1 className="text-xl font-bold text-stone-800">🏛️ Visit Tadasuni - Admin CMS</h1>
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
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-serif font-bold text-emerald-800">Visit Tadasuni</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection("about")} className="text-stone-700 hover:text-emerald-700 transition">{t.about}</button>
              <button onClick={() => scrollToSection("digital-twin")} className="text-stone-700 hover:text-emerald-700 transition">{t.digitalTwin}</button>
              <button onClick={() => scrollToSection("attractions")} className="text-stone-700 hover:text-emerald-700 transition">{t.attractions}</button>
              <Link to="/eventi" className="text-stone-700 hover:text-emerald-700 transition">{t.events}</Link>
              <button onClick={() => scrollToSection("contact")} className="text-stone-700 hover:text-emerald-700 transition">{t.contact}</button>
              
              <div className="relative">
                <button 
                  onClick={() => setShowLangMenu(!showLangMenu)} 
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 transition"
                >
                  <span className="text-xl">{languageFlags[lang]}</span>
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
                        <span className="text-xl">{languageFlags[code]}</span>
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
              <button onClick={() => scrollToSection("attractions")} className="block w-full text-left py-2">{t.attractions}</button>
              <Link to="/eventi" className="block w-full text-left py-2">{t.events}</Link>
              <button onClick={() => scrollToSection("contact")} className="block w-full text-left py-2">{t.contact}</button>
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
              <h3 className="text-xl font-serif font-bold mb-4">Visit Tadasuni</h3>
              <p className="text-stone-400">Tra lago, colline e tradizioni</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Link Utili</h4>
              <div className="space-y-2">
                <a href="https://comune.tadasuni.or.it/" target="_blank" rel="noopener noreferrer" className="block text-stone-400 hover:text-white transition">Comune di Tadasuni</a>
                <a href="https://dromosfestival.it/" target="_blank" rel="noopener noreferrer" className="block text-stone-400 hover:text-white transition">Dromos Festival</a>
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
          <div className="border-t border-stone-800 pt-8 text-center text-stone-500 text-sm">
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage lang={lang} setLang={setLang} t={t} />} />
        <Route path="/eventi" element={<EventsPage lang={lang} t={t} />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
