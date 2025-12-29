import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Volume2, Pause, Loader2, Plus, Save, Download, MousePointer, X, Mic, Upload, Play, Check } from "lucide-react";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "sonner";
import { useLanguage, getTranslation } from "../hooks/useLanguage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MATTERPORT_SDK_KEY = "59wwqhip77fxkqiurcae74fed";

const translations = {
  it: {
    back: "Torna alle mostre",
    pois: "Punti di Interesse",
    loading: "Caricamento...",
    notFound: "Mostra non trovata",
    playAudio: "Riproduci audioguida",
    pauseAudio: "Pausa",
    addPoi: "Aggiungi POI",
    importTags: "Importa Tag da Matterport",
    createMode: "MODALITÀ CREAZIONE: Clicca su un punto nello spazio 3D",
    cancelCreate: "Annulla",
    savePoi: "Salva POI",
    poiName: "Nome del POI",
    poiDescription: "Descrizione",
    sdkConnecting: "Connessione SDK...",
    sdkConnected: "SDK Connesso",
    sdkError: "SDK non disponibile",
    clickToCreate: "Attiva Creazione Tag",
    importing: "Importazione in corso...",
    generateAudio: "Genera Audio",
    generating: "Generazione...",
    noDescription: "Inserisci prima una descrizione"
  },
  en: {
    back: "Back to exhibitions",
    pois: "Points of Interest",
    loading: "Loading...",
    notFound: "Exhibition not found",
    playAudio: "Play audio guide",
    pauseAudio: "Pause",
    addPoi: "Add POI",
    importTags: "Import Tags from Matterport",
    createMode: "CREATION MODE: Click on a point in the 3D space",
    cancelCreate: "Cancel",
    savePoi: "Save POI",
    poiName: "POI Name",
    poiDescription: "Description",
    sdkConnecting: "Connecting SDK...",
    sdkConnected: "SDK Connected",
    sdkError: "SDK not available",
    clickToCreate: "Enable Tag Creation",
    importing: "Importing...",
    generateAudio: "Generate Audio",
    generating: "Generating...",
    noDescription: "Please enter a description first"
  },
  fr: {
    back: "Retour aux expositions",
    pois: "Points d'intérêt",
    loading: "Chargement...",
    notFound: "Exposition non trouvée",
    playAudio: "Lire l'audioguide",
    pauseAudio: "Pause",
    addPoi: "Ajouter POI",
    importTags: "Importer Tags de Matterport",
    createMode: "MODE CRÉATION: Cliquez sur un point dans l'espace 3D",
    cancelCreate: "Annuler",
    savePoi: "Enregistrer",
    poiName: "Nom du POI",
    poiDescription: "Description",
    sdkConnecting: "Connexion SDK...",
    sdkConnected: "SDK Connecté",
    sdkError: "SDK non disponible",
    clickToCreate: "Activer création",
    importing: "Importation...",
    generateAudio: "Générer Audio",
    generating: "Génération...",
    noDescription: "Veuillez d'abord entrer une description"
  },
  de: {
    back: "Zurück zu Ausstellungen",
    pois: "Sehenswürdigkeiten",
    loading: "Laden...",
    notFound: "Ausstellung nicht gefunden",
    playAudio: "Audioguide abspielen",
    pauseAudio: "Pause",
    addPoi: "POI hinzufügen",
    importTags: "Tags von Matterport importieren",
    createMode: "ERSTELLUNGSMODUS: Klicken Sie auf einen Punkt im 3D-Raum",
    cancelCreate: "Abbrechen",
    savePoi: "Speichern",
    poiName: "POI-Name",
    poiDescription: "Beschreibung",
    sdkConnecting: "SDK verbinden...",
    sdkConnected: "SDK Verbunden",
    sdkError: "SDK nicht verfügbar",
    clickToCreate: "Tag-Erstellung aktivieren",
    importing: "Importiere...",
    generateAudio: "Audio generieren",
    generating: "Generiere...",
    noDescription: "Bitte geben Sie zuerst eine Beschreibung ein"
  }
};

export default function ExhibitionDetail() {
  const { id } = useParams();
  const [space, setSpace] = useState(null);
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [newPoiPosition, setNewPoiPosition] = useState(null);
  const [newPoiData, setNewPoiData] = useState({ name: "", description: "", tagId: "" });
  
  // SDK State
  const [sdkStatus, setSdkStatus] = useState("disconnected"); // disconnected, connecting, connected, error
  const [mpSdk, setMpSdk] = useState(null);
  const [createMode, setCreateMode] = useState(false);
  const [matterportTags, setMatterportTags] = useState([]);
  const [generatingAudio, setGeneratingAudio] = useState({}); // { poiId_lang: true }
  const [audioProgress, setAudioProgress] = useState({}); // { poiId: { currentTime, duration } }
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadingPoi, setUploadingPoi] = useState(null);
  const [uploadingLang, setUploadingLang] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const iframeRef = useRef(null);
  const audioRef = useRef(null);
  const { language } = useLanguage();
  const t = translations[language];

  useEffect(() => {
    setIsAdmin(localStorage.getItem("admin_authenticated") === "true");
  }, []);

  useEffect(() => {
    fetchData();
  }, [id]);

  // Initialize Matterport SDK when space is loaded
  useEffect(() => {
    if (!space || !iframeRef.current || sdkStatus === "connected") return;

    const initSdk = async () => {
      setSdkStatus("connecting");
      
      try {
        // Wait for iframe to fully load
        await new Promise(resolve => setTimeout(resolve, 6000));

        const iframe = iframeRef.current;
        
        // Method suggested by Matterport: use connect(iframe) directly
        // Load SDK module
        if (!window.mpConnect) {
          try {
            const SDK = await import('https://static.matterport.com/showcase-sdk/latest/sdk.es.js');
            window.mpConnect = SDK.connect;
          } catch (e) {
            console.log("ES module import failed, trying script tag...");
            
            // Fallback: load via script tag
            if (!window.MP_SDK) {
              const script = document.createElement('script');
              script.src = 'https://static.matterport.com/showcase-sdk/latest/sdk.js';
              await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
              });
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }

        // Try connecting with Matterport's suggested method
        try {
          let sdk;
          
          if (window.mpConnect) {
            // New method: connect(iframe) without SDK key
            sdk = await window.mpConnect(iframe);
            console.log("✅ Connected via mpConnect(iframe)");
          } else if (window.MP_SDK) {
            // Legacy method
            sdk = await window.MP_SDK.connect(iframe);
            console.log("✅ Connected via MP_SDK.connect(iframe)");
          }

          if (sdk) {
            setMpSdk(sdk);
            setSdkStatus("connected");
            console.log("✅ Matterport SDK connected successfully!");

            // Get existing Mattertags
            try {
              const tags = await sdk.Mattertag.getData();
              console.log("📍 Found Mattertags:", tags);
              setMatterportTags(tags || []);
            } catch (e) {
              console.log("Could not get Mattertags:", e);
            }
          } else {
            setSdkStatus("error");
          }
        } catch (err) {
          console.error("SDK connect error:", err);
          setSdkStatus("error");
        }
      } catch (error) {
        console.error("Error loading SDK:", error);
        setSdkStatus("error");
      }
    };

    const timer = setTimeout(initSdk, 3000);
    return () => clearTimeout(timer);
  }, [space]);

  // Handle click events when in create mode
  useEffect(() => {
    if (!mpSdk || !createMode) return;

    const subscription = mpSdk.Pointer.intersection.subscribe((intersection) => {
      if (intersection && createMode) {
        console.log("📍 Click position:", intersection.position);
        setNewPoiPosition({
          x: intersection.position.x,
          y: intersection.position.y,
          z: intersection.position.z
        });
        setDialogOpen(true);
        setCreateMode(false);
      }
    });

    return () => {
      if (subscription) {
        subscription.cancel();
      }
    };
  }, [mpSdk, createMode]);

  const fetchData = async () => {
    try {
      const [spaceRes, poisRes] = await Promise.all([
        axios.get(`${API}/spaces/${id}`),
        axios.get(`${API}/pois?space_id=${id}`)
      ]);
      setSpace(spaceRes.data);
      setPois(poisRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // FUNZIONE 1: Importa tutti i Mattertag esistenti dallo spazio
  const importMatterportTags = async () => {
    if (!mpSdk) {
      toast.error("SDK non connesso. Attendi la connessione.");
      return;
    }

    setImporting(true);
    try {
      // Get all Mattertags from SDK
      const tags = await mpSdk.Mattertag.getData();
      console.log("Tags found:", tags);

      if (!tags || tags.length === 0) {
        toast.info("Nessun Mattertag trovato nello spazio Matterport");
        setImporting(false);
        return;
      }

      let importedCount = 0;
      let skippedCount = 0;

      for (const tag of tags) {
        // Check if already exists
        const exists = pois.some(p => p.matterport_tag_id === tag.sid);
        if (exists) {
          skippedCount++;
          continue;
        }

        // Create POI from Mattertag
        const poiData = {
          space_id: id,
          matterport_tag_id: tag.sid,
          name: {
            it: tag.label || `Tag ${tag.sid.substring(0, 8)}`,
            en: tag.label || `Tag ${tag.sid.substring(0, 8)}`,
            fr: tag.label || `Tag ${tag.sid.substring(0, 8)}`,
            de: tag.label || `Tag ${tag.sid.substring(0, 8)}`
          },
          description: {
            it: tag.description || "",
            en: tag.description || "",
            fr: tag.description || "",
            de: tag.description || ""
          },
          position: tag.anchorPosition || null
        };

        try {
          await axios.post(`${API}/pois`, poiData);
          importedCount++;
        } catch (e) {
          console.error("Error creating POI:", e);
        }
      }

      toast.success(`✅ Importati ${importedCount} tag! (${skippedCount} già esistenti)`);
      fetchData(); // Refresh list

    } catch (error) {
      console.error("Error importing tags:", error);
      toast.error("Errore nell'importazione dei tag");
    } finally {
      setImporting(false);
    }
  };

  // FUNZIONE 2: Crea nuovo POI dalla posizione cliccata
  const createNewPoi = async () => {
    if (!newPoiData.name) {
      toast.error("Inserisci almeno il nome del POI");
      return;
    }

    try {
      // Create POI in database
      const poiData = {
        space_id: id,
        matterport_tag_id: newPoiData.tagId || null,
        name: {
          it: newPoiData.name,
          en: newPoiData.name,
          fr: newPoiData.name,
          de: newPoiData.name
        },
        description: {
          it: newPoiData.description,
          en: newPoiData.description,
          fr: newPoiData.description,
          de: newPoiData.description
        },
        position: newPoiPosition
      };

      await axios.post(`${API}/pois`, poiData);

      // Optionally create Mattertag in Matterport space
      if (mpSdk && newPoiPosition) {
        try {
          await mpSdk.Mattertag.add([{
            label: newPoiData.name,
            description: newPoiData.description,
            anchorPosition: newPoiPosition,
            stemVector: { x: 0, y: 0.5, z: 0 }
          }]);
          toast.success("✅ POI creato e tag aggiunto allo spazio Matterport!");
        } catch (e) {
          toast.success("✅ POI creato! (Tag Matterport non aggiunto - permessi)");
        }
      } else {
        toast.success("✅ POI creato con successo!");
      }

      // Reset
      setDialogOpen(false);
      setNewPoiPosition(null);
      setNewPoiData({ name: "", description: "", tagId: "" });
      fetchData();

    } catch (error) {
      console.error("Error creating POI:", error);
      toast.error("Errore nella creazione del POI");
    }
  };

  // Genera audio TTS per un POI
  const generateAudioForPoi = async (poi, lang) => {
    const description = poi.description?.[lang];
    if (!description) {
      toast.error(t.noDescription);
      return;
    }

    const key = `${poi.id}_${lang}`;
    setGeneratingAudio(prev => ({ ...prev, [key]: true }));

    try {
      // Genera audio TTS
      const ttsResponse = await axios.post(`${API}/tts`, {
        text: description,
        lang
      });

      // Aggiorna il POI con il nuovo audio URL
      const updatedAudioUrl = {
        ...(poi.audio_url || {}),
        [lang]: ttsResponse.data.audio_url
      };

      await axios.put(`${API}/pois/${poi.id}`, {
        ...poi,
        audio_url: updatedAudioUrl
      });

      toast.success(`✅ Audio ${lang.toUpperCase()} generato!`);
      fetchData(); // Ricarica i POI

    } catch (error) {
      console.error("Error generating audio:", error);
      toast.error("Errore nella generazione audio");
    } finally {
      setGeneratingAudio(prev => ({ ...prev, [key]: false }));
    }
  };

  // Genera audio per tutte le lingue di un POI
  const generateAllAudioForPoi = async (poi) => {
    const langs = ["it", "en", "fr", "de"];
    let generated = 0;

    for (const lang of langs) {
      if (poi.description?.[lang]) {
        await generateAudioForPoi(poi, lang);
        generated++;
      }
    }

    if (generated === 0) {
      toast.error("Nessuna descrizione disponibile per generare audio");
    }
  };

  const handlePoiClick = (poi) => {
    setSelectedPoi(poi);
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingAudio(null);
    }

    // Navigate to POI in Matterport if SDK is ready and position exists
    if (mpSdk && poi.position) {
      try {
        mpSdk.Camera.lookAt({
          position: poi.position,
          transition: mpSdk.Camera.Transition.FLY,
          time: 1000
        });
      } catch (e) {
        console.log("Camera navigation error:", e);
      }
    }
  };

  const playAudio = (poi, lang = null) => {
    const targetLang = lang || language;
    const audioUrl = poi.audio_url?.[targetLang];
    if (!audioUrl) return;

    const playKey = `${poi.id}_${targetLang}`;
    
    if (playingAudio === playKey) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl.startsWith('http') ? audioUrl : `${process.env.REACT_APP_BACKEND_URL}${audioUrl}`;
        audioRef.current.play();
        setPlayingAudio(playKey);
      }
    }
  };

  // Gestisce il progresso dell'audio
  const handleAudioTimeUpdate = (poi, lang) => {
    if (audioRef.current) {
      setAudioProgress(prev => ({
        ...prev,
        [`${poi.id}_${lang}`]: {
          currentTime: audioRef.current.currentTime,
          duration: audioRef.current.duration || 0
        }
      }));
    }
  };

  // Formatta i secondi in mm:ss
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Upload audio file
  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingPoi || !uploadingLang) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await axios.post(`${API}/upload/audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Aggiorna il POI con il nuovo audio URL
      const updatedAudioUrl = {
        ...(uploadingPoi.audio_url || {}),
        [uploadingLang]: uploadRes.data.url
      };

      await axios.put(`${API}/pois/${uploadingPoi.id}`, {
        ...uploadingPoi,
        audio_url: updatedAudioUrl
      });

      toast.success(`✅ Audio ${uploadingLang.toUpperCase()} caricato!`);
      fetchData();
      setUploadDialogOpen(false);

    } catch (error) {
      console.error("Error uploading audio:", error);
      toast.error("Errore nel caricamento audio");
    } finally {
      setUploading(false);
    }
  };

  // Apri dialog upload per una lingua specifica
  const openUploadDialog = (poi, lang) => {
    setUploadingPoi(poi);
    setUploadingLang(lang);
    setUploadDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
        <span className="ml-3 font-sans text-[#666058]">{t.loading}</span>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <p className="font-sans text-[#666058] mb-4">{t.notFound}</p>
        <Link to="/exhibitions" className="text-[#C5A059] hover:underline">{t.back}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} className="hidden" />

      {/* Header */}
      <div className="bg-[#1A1918] text-white py-6">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8">
          <Link to="/exhibitions" className="inline-flex items-center text-[#C5A059] hover:text-white transition-colors mb-4" data-testid="back-link">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.back}
          </Link>
          <h1 className="font-serif text-2xl md:text-3xl" data-testid="space-title">
            {getTranslation(space.name, language)}
          </h1>
        </div>
      </div>

      {/* Create Mode Banner */}
      {createMode && (
        <div className="bg-[#C5A059] text-white py-3 animate-pulse">
          <div className="max-w-[1800px] mx-auto px-4 md:px-8 flex items-center justify-between">
            <span className="font-sans font-medium flex items-center">
              <MousePointer className="w-5 h-5 mr-2" />
              {t.createMode}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCreateMode(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="w-4 h-4 mr-2" />
              {t.cancelCreate}
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* Matterport Viewer */}
          <div className="xl:col-span-3">
            <div 
              className={`matterport-frame rounded-sm overflow-hidden ${createMode ? 'ring-4 ring-[#C5A059] ring-offset-2' : ''}`} 
              style={{ aspectRatio: "16/9", minHeight: "600px" }}
            >
              {/* Usa mpskin_url se disponibile, altrimenti Matterport standard */}
              <iframe
                ref={iframeRef}
                src={space.mpskin_url || `https://my.matterport.com/show/?m=${space.model_id}&play=1&qs=1`}
                title={getTranslation(space.name, language)}
                className="w-full h-full"
                style={{ minHeight: "600px" }}
                allow="xr-spatial-tracking; fullscreen"
                allowFullScreen
                frameBorder="0"
                id="showcase-iframe"
                data-testid="matterport-iframe"
              />
            </div>
            
            {/* SDK Status - mostra solo se non usa mpskin */}
            {!space.mpskin_url && (
              <div className="mt-3 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${
                    sdkStatus === 'connected' ? 'bg-green-500' : 
                    sdkStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                    sdkStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                  }`}></span>
                  <span className="text-sm text-[#666058]">
                    {sdkStatus === 'connected' ? t.sdkConnected : 
                     sdkStatus === 'connecting' ? t.sdkConnecting : 
                     sdkStatus === 'error' ? t.sdkError : 'SDK'}
                  </span>
                </div>
                {matterportTags.length > 0 && (
                  <span className="text-sm text-[#C5A059]">
                    {matterportTags.length} Mattertag nello spazio
                  </span>
                )}
                {sdkStatus === 'error' && isAdmin && (
                  <span className="text-xs text-red-500">
                    Verifica configurazione domini in Matterport Developer Tools
                  </span>
                )}
              </div>
            )}
            
            {/* Mpskin indicator */}
            {space.mpskin_url && (
              <div className="mt-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-sm text-[#666058]">Visualizzazione Mpskin attiva</span>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-sm border border-[#E5E0D8] p-5 sticky top-24">
              
              {/* Admin Tools */}
              {isAdmin && (
                <div className="mb-6 p-4 bg-[#1A1918] rounded-sm">
                  <p className="font-sans text-xs text-[#C5A059] font-bold uppercase tracking-wide mb-3">
                    🛠️ Strumenti Admin
                  </p>
                  
                  {/* Import existing tags - Solo se NON usa mpskin */}
                  {!space.mpskin_url && (
                    <>
                      <Button
                        size="sm"
                        onClick={importMatterportTags}
                        disabled={importing || sdkStatus !== 'connected'}
                        className="w-full mb-2 bg-[#C5A059] hover:bg-[#B08D45] text-white"
                        data-testid="import-tags-btn"
                      >
                        {importing ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        {importing ? t.importing : t.importTags}
                      </Button>
                      
                      {/* Create new tag by clicking */}
                      <Button
                        size="sm"
                        onClick={() => setCreateMode(!createMode)}
                        disabled={sdkStatus !== 'connected'}
                        className={`w-full ${createMode ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'} text-white`}
                        data-testid="create-tag-btn"
                      >
                        {createMode ? (
                          <>
                            <X className="w-4 h-4 mr-2" />
                            {t.cancelCreate}
                          </>
                        ) : (
                          <>
                            <MousePointer className="w-4 h-4 mr-2" />
                            {t.clickToCreate}
                          </>
                        )}
                      </Button>

                      <p className="text-[10px] text-white/60 mt-3 leading-relaxed">
                        <strong>Importa Tag:</strong> Scarica tutti i Mattertag esistenti nello spazio.<br/>
                        <strong>Attiva Creazione:</strong> Clicca su un punto nel tour 3D per creare un nuovo POI.
                      </p>
                    </>
                  )}
                  
                  {/* Messaggio per Mpskin */}
                  {space.mpskin_url && (
                    <p className="text-[10px] text-white/60 leading-relaxed">
                      <strong>Modalità Mpskin:</strong> L'importazione tag SDK non è disponibile con overlay Mpskin. Usa la gestione POI manuale nel pannello admin.
                    </p>
                  )}
                </div>
              )}

              {/* POIs Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg text-[#2A2A2A] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#C5A059]" />
                  {t.pois}
                </h2>
                <span className="text-xs font-mono bg-[#F2F0EB] px-2 py-1 rounded">
                  {pois.length}
                </span>
              </div>

              {/* POIs List */}
              {pois.length === 0 ? (
                <p className="font-sans text-sm text-[#666058] text-center py-8">
                  Nessun POI.<br/>
                  {isAdmin && sdkStatus === 'connected' && "Usa gli strumenti sopra per importare o creare."}
                </p>
              ) : (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                  {pois.map((poi) => (
                    <div
                      key={poi.id}
                      className={`p-3 rounded-sm border transition-all cursor-pointer ${
                        selectedPoi?.id === poi.id
                          ? "border-[#C5A059] bg-[#F9F8F6]"
                          : "border-[#E5E0D8] hover:border-[#C5A059]/50"
                      }`}
                      onClick={() => handlePoiClick(poi)}
                      data-testid={`poi-${poi.id}`}
                    >
                      <h3 className="font-serif text-base text-[#2A2A2A] mb-1">
                        {getTranslation(poi.name, language)}
                      </h3>
                      <p className="font-sans text-xs text-[#666058] line-clamp-2 mb-2">
                        {getTranslation(poi.description, language)}
                      </p>
                      
                      {/* Audio controls */}
                      <div className="flex flex-wrap gap-2">
                        {poi.audio_url && (poi.audio_url[language] || poi.audio_url.it) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-white"
                            onClick={(e) => { e.stopPropagation(); playAudio(poi); }}
                          >
                            {playingAudio === poi.id ? (
                              <><Pause className="w-3 h-3 mr-1" />{t.pauseAudio}</>
                            ) : (
                              <><Volume2 className="w-3 h-3 mr-1" />{t.playAudio}</>
                            )}
                          </Button>
                        )}
                        
                        {/* Pulsante Genera Audio TTS - Solo per admin */}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-green-500 text-green-600 hover:bg-green-500 hover:text-white"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              generateAudioForPoi(poi, language);
                            }}
                            disabled={generatingAudio[`${poi.id}_${language}`] || !poi.description?.[language]}
                            data-testid={`generate-audio-${poi.id}`}
                          >
                            {generatingAudio[`${poi.id}_${language}`] ? (
                              <><Loader2 className="w-3 h-3 mr-1 animate-spin" />{t.generating}</>
                            ) : (
                              <><Mic className="w-3 h-3 mr-1" />{t.generateAudio}</>
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Audio status indicators */}
                      {isAdmin && (
                        <div className="flex gap-1 mt-2">
                          {["it", "en", "fr", "de"].map((lang) => (
                            <span
                              key={lang}
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                poi.audio_url?.[lang] ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {lang.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      )}

                      {poi.matterport_tag_id && (
                        <p className="font-mono text-[10px] text-[#666058]/70 mt-2">
                          Tag: {poi.matterport_tag_id.substring(0, 12)}...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create POI Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Crea nuovo Punto di Interesse
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {newPoiPosition && (
              <div className="bg-green-50 border border-green-200 p-3 rounded-sm">
                <p className="font-sans text-sm text-green-700 font-medium">
                  📍 Posizione catturata!
                </p>
                <p className="font-mono text-xs text-green-600 mt-1">
                  X: {newPoiPosition.x.toFixed(2)}, Y: {newPoiPosition.y.toFixed(2)}, Z: {newPoiPosition.z.toFixed(2)}
                </p>
              </div>
            )}

            <div>
              <label className="block font-sans text-sm text-[#666058] mb-2">
                Nome del POI *
              </label>
              <Input
                value={newPoiData.name}
                onChange={(e) => setNewPoiData(prev => ({ ...prev, name: e.target.value }))}
                className="border-[#E5E0D8] focus:border-[#C5A059]"
                placeholder="Es: Scialle ricamato tradizionale"
                data-testid="poi-name-input"
              />
            </div>

            <div>
              <label className="block font-sans text-sm text-[#666058] mb-2">
                Descrizione
              </label>
              <Textarea
                value={newPoiData.description}
                onChange={(e) => setNewPoiData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="border-[#E5E0D8] focus:border-[#C5A059]"
                placeholder="Descrivi questo punto di interesse..."
                data-testid="poi-description-input"
              />
            </div>

            <p className="text-xs text-[#666058]">
              💡 Dopo il salvataggio, vai su <strong>Admin → Punti di Interesse</strong> per tradurre in altre lingue e generare le audioguide.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E0D8]">
            <Button variant="outline" onClick={() => { setDialogOpen(false); setNewPoiPosition(null); }}>
              Annulla
            </Button>
            <Button onClick={createNewPoi} className="btn-gold">
              <Save className="w-4 h-4 mr-2" />
              Salva POI
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
