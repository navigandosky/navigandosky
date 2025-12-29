import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Volume2, Pause, Loader2, Plus, Save, X, RefreshCw } from "lucide-react";
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
    importTags: "Importa Tag",
    createMode: "Clicca sullo spazio per posizionare il POI",
    cancelCreate: "Annulla",
    savePoi: "Salva POI",
    poiName: "Nome del POI",
    poiDescription: "Descrizione",
    importingTags: "Importazione tag...",
    tagsImported: "Tag importati",
    noTagsFound: "Nessun tag trovato nello spazio"
  },
  en: {
    back: "Back to exhibitions",
    pois: "Points of Interest",
    loading: "Loading...",
    notFound: "Exhibition not found",
    playAudio: "Play audio guide",
    pauseAudio: "Pause",
    addPoi: "Add POI",
    importTags: "Import Tags",
    createMode: "Click on the space to place the POI",
    cancelCreate: "Cancel",
    savePoi: "Save POI",
    poiName: "POI Name",
    poiDescription: "Description",
    importingTags: "Importing tags...",
    tagsImported: "Tags imported",
    noTagsFound: "No tags found in space"
  },
  fr: {
    back: "Retour aux expositions",
    pois: "Points d'intérêt",
    loading: "Chargement...",
    notFound: "Exposition non trouvée",
    playAudio: "Lire l'audioguide",
    pauseAudio: "Pause",
    addPoi: "Ajouter POI",
    importTags: "Importer Tags",
    createMode: "Cliquez sur l'espace pour placer le POI",
    cancelCreate: "Annuler",
    savePoi: "Enregistrer",
    poiName: "Nom du POI",
    poiDescription: "Description",
    importingTags: "Importation...",
    tagsImported: "Tags importés",
    noTagsFound: "Aucun tag trouvé"
  },
  de: {
    back: "Zurück zu Ausstellungen",
    pois: "Sehenswürdigkeiten",
    loading: "Laden...",
    notFound: "Ausstellung nicht gefunden",
    playAudio: "Audioguide abspielen",
    pauseAudio: "Pause",
    addPoi: "POI hinzufügen",
    importTags: "Tags importieren",
    createMode: "Klicken Sie auf den Raum, um den POI zu platzieren",
    cancelCreate: "Abbrechen",
    savePoi: "Speichern",
    poiName: "POI-Name",
    poiDescription: "Beschreibung",
    importingTags: "Importiere...",
    tagsImported: "Tags importiert",
    noTagsFound: "Keine Tags gefunden"
  }
};

export default function ExhibitionDetail() {
  const { id } = useParams();
  const [space, setSpace] = useState(null);
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [mpSdk, setMpSdk] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [newPoiPosition, setNewPoiPosition] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [newPoiData, setNewPoiData] = useState({ name: "", description: "" });
  
  const iframeRef = useRef(null);
  const audioRef = useRef(null);
  const { language } = useLanguage();
  const t = translations[language];

  // Check if admin is logged in
  useEffect(() => {
    setIsAdmin(localStorage.getItem("admin_authenticated") === "true");
  }, []);

  useEffect(() => {
    fetchData();
  }, [id]);

  // Initialize Matterport SDK
  useEffect(() => {
    if (!space || !iframeRef.current) return;

    const initSdk = async () => {
      try {
        // Wait for iframe to load
        const iframe = iframeRef.current;
        
        // Use the connect method for iframe-based SDK
        const connectSdk = async () => {
          if (window.MP_SDK) {
            try {
              const sdk = await window.MP_SDK.connect(iframe, MATTERPORT_SDK_KEY, '');
              setMpSdk(sdk);
              setSdkReady(true);
              console.log("Matterport SDK connected successfully");
              
              // Set up click handler for creating POIs
              sdk.Pointer.intersection.subscribe((intersection) => {
                if (createMode && intersection) {
                  setNewPoiPosition({
                    x: intersection.position.x,
                    y: intersection.position.y,
                    z: intersection.position.z
                  });
                  setDialogOpen(true);
                }
              });
            } catch (err) {
              console.log("SDK connect error, using standard embed:", err);
            }
          }
        };

        // Load SDK script if not already loaded
        if (!window.MP_SDK) {
          const script = document.createElement('script');
          script.src = 'https://static.matterport.com/showcase-sdk/latest/sdk.js';
          script.async = true;
          script.onload = () => {
            setTimeout(connectSdk, 2000); // Wait for iframe to be ready
          };
          document.head.appendChild(script);
        } else {
          setTimeout(connectSdk, 2000);
        }
      } catch (error) {
        console.error("Error initializing Matterport SDK:", error);
      }
    };

    // Delay SDK init to let iframe load first
    const timer = setTimeout(initSdk, 3000);
    return () => clearTimeout(timer);
  }, [space, createMode]);

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

  const handlePoiClick = (poi) => {
    setSelectedPoi(poi);
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingAudio(null);
    }

    // Navigate to POI in Matterport if SDK is ready
    if (mpSdk && poi.position) {
      try {
        mpSdk.Camera.lookAt({
          position: poi.position,
          transition: mpSdk.Camera.Transition.FLY
        });
      } catch (e) {
        console.log("Camera navigation not available");
      }
    }
  };

  const playAudio = (poi) => {
    const audioUrl = poi.audio_url?.[language] || poi.audio_url?.it;
    if (!audioUrl) return;

    if (playingAudio === poi.id) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl.startsWith('http') ? audioUrl : `${process.env.REACT_APP_BACKEND_URL}${audioUrl}`;
        audioRef.current.play();
        setPlayingAudio(poi.id);
      }
    }
  };

  // Import existing Mattertags from space
  const importMatterportTags = async () => {
    if (!mpSdk) {
      toast.error("SDK non connesso. Riprova tra qualche secondo.");
      return;
    }

    setImporting(true);
    try {
      // Get all Mattertags from the space
      const mattertags = await mpSdk.Mattertag.getData();
      
      if (!mattertags || mattertags.length === 0) {
        toast.info(t.noTagsFound);
        setImporting(false);
        return;
      }

      let importedCount = 0;
      for (const tag of mattertags) {
        // Check if tag already exists in our POIs
        const exists = pois.some(p => p.matterport_tag_id === tag.sid);
        if (exists) continue;

        // Create POI from Mattertag
        const poiData = {
          space_id: id,
          matterport_tag_id: tag.sid,
          name: {
            it: tag.label || `Tag ${tag.sid}`,
            en: tag.label || `Tag ${tag.sid}`,
            fr: tag.label || `Tag ${tag.sid}`,
            de: tag.label || `Tag ${tag.sid}`
          },
          description: {
            it: tag.description || "",
            en: tag.description || "",
            fr: tag.description || "",
            de: tag.description || ""
          },
          position: tag.anchorPosition ? {
            x: tag.anchorPosition.x,
            y: tag.anchorPosition.y,
            z: tag.anchorPosition.z
          } : null
        };

        await axios.post(`${API}/pois`, poiData);
        importedCount++;
      }

      toast.success(`${t.tagsImported}: ${importedCount}`);
      fetchData(); // Refresh POIs list
    } catch (error) {
      console.error("Error importing tags:", error);
      toast.error("Errore nell'importazione dei tag");
    } finally {
      setImporting(false);
    }
  };

  // Create new POI at clicked position
  const createNewPoi = async () => {
    if (!newPoiData.name || !newPoiPosition) {
      toast.error("Inserisci almeno il nome del POI");
      return;
    }

    try {
      const poiData = {
        space_id: id,
        matterport_tag_id: null,
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
      toast.success("POI creato con successo");
      
      // Reset state
      setDialogOpen(false);
      setCreateMode(false);
      setNewPoiPosition(null);
      setNewPoiData({ name: "", description: "" });
      fetchData();
    } catch (error) {
      toast.error("Errore nella creazione del POI");
    }
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
        <Link to="/exhibitions" className="text-[#C5A059] hover:underline">
          {t.back}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hidden audio element */}
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingAudio(null)}
        className="hidden"
      />

      {/* Header */}
      <div className="bg-[#1A1918] text-white py-8">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <Link 
            to="/exhibitions" 
            className="inline-flex items-center text-[#C5A059] hover:text-white transition-colors mb-6"
            data-testid="back-link"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.back}
          </Link>
          <h1 className="font-serif text-3xl md:text-4xl" data-testid="space-title">
            {getTranslation(space.name, language)}
          </h1>
          <p className="font-sans text-white/70 mt-3 max-w-2xl">
            {getTranslation(space.description, language)}
          </p>
        </div>
      </div>

      {/* Create Mode Banner */}
      {createMode && (
        <div className="bg-[#C5A059] text-white py-3">
          <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
            <span className="font-sans">{t.createMode}</span>
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
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Matterport Viewer */}
          <div className="lg:col-span-2">
            <div className="matterport-frame rounded-sm overflow-hidden" style={{ aspectRatio: "16/9" }}>
              <iframe
                ref={iframeRef}
                src={`https://my.matterport.com/show/?m=${space.model_id}&play=1`}
                title={getTranslation(space.name, language)}
                className="w-full h-full"
                allow="xr-spatial-tracking; fullscreen"
                allowFullScreen
                frameBorder="0"
                data-testid="matterport-iframe"
              />
            </div>
            
            {/* SDK Status */}
            <div className="mt-2 text-xs text-[#666058] flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${sdkReady ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              {sdkReady ? "SDK connesso" : "SDK in connessione..."}
            </div>
          </div>

          {/* POIs Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-sm border border-[#E5E0D8] p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-xl text-[#2A2A2A] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#C5A059]" />
                  {t.pois}
                </h2>
                <span className="text-xs font-mono bg-[#F2F0EB] px-2 py-1 rounded">
                  {pois.length}
                </span>
              </div>

              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex gap-2 mb-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={importMatterportTags}
                    disabled={importing || !sdkReady}
                    className="flex-1 text-xs"
                    data-testid="import-tags-btn"
                  >
                    {importing ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    {t.importTags}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setCreateMode(!createMode)}
                    className={`flex-1 text-xs ${createMode ? 'bg-red-500 hover:bg-red-600' : 'btn-gold'}`}
                    data-testid="add-poi-btn"
                  >
                    {createMode ? (
                      <>
                        <X className="w-3 h-3 mr-1" />
                        {t.cancelCreate}
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3 mr-1" />
                        {t.addPoi}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {pois.length === 0 ? (
                <p className="font-sans text-sm text-[#666058]">
                  Nessun punto di interesse disponibile
                </p>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {pois.map((poi) => (
                    <div
                      key={poi.id}
                      className={`p-4 rounded-sm border transition-all cursor-pointer ${
                        selectedPoi?.id === poi.id
                          ? "border-[#C5A059] bg-[#F9F8F6]"
                          : "border-[#E5E0D8] hover:border-[#C5A059]/50"
                      }`}
                      onClick={() => handlePoiClick(poi)}
                      data-testid={`poi-${poi.id}`}
                    >
                      <h3 className="font-serif text-lg text-[#2A2A2A] mb-2">
                        {getTranslation(poi.name, language)}
                      </h3>
                      <p className="font-sans text-sm text-[#666058] line-clamp-2 mb-3">
                        {getTranslation(poi.description, language)}
                      </p>
                      
                      {/* Audio button */}
                      {poi.audio_url && (poi.audio_url[language] || poi.audio_url.it) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            playAudio(poi);
                          }}
                          data-testid={`play-audio-${poi.id}`}
                        >
                          {playingAudio === poi.id ? (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              {t.pauseAudio}
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-4 h-4 mr-2" />
                              {t.playAudio}
                            </>
                          )}
                        </Button>
                      )}

                      {/* Tag ID */}
                      {poi.matterport_tag_id && (
                        <p className="font-mono text-xs text-[#666058]/70 mt-2">
                          Tag: {poi.matterport_tag_id}
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
              {t.addPoi}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block font-sans text-sm text-[#666058] mb-2">
                {t.poiName} *
              </label>
              <Input
                value={newPoiData.name}
                onChange={(e) => setNewPoiData(prev => ({ ...prev, name: e.target.value }))}
                className="border-[#E5E0D8] focus:border-[#C5A059]"
                placeholder="Es: Costume tradizionale"
              />
            </div>

            <div>
              <label className="block font-sans text-sm text-[#666058] mb-2">
                {t.poiDescription}
              </label>
              <Textarea
                value={newPoiData.description}
                onChange={(e) => setNewPoiData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="border-[#E5E0D8] focus:border-[#C5A059]"
                placeholder="Descrizione del punto di interesse..."
              />
            </div>

            {newPoiPosition && (
              <div className="bg-[#F2F0EB] p-3 rounded-sm">
                <p className="font-mono text-xs text-[#666058]">
                  Posizione: X={newPoiPosition.x.toFixed(2)}, Y={newPoiPosition.y.toFixed(2)}, Z={newPoiPosition.z.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E0D8]">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t.cancelCreate}
            </Button>
            <Button onClick={createNewPoi} className="btn-gold">
              <Save className="w-4 h-4 mr-2" />
              {t.savePoi}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
