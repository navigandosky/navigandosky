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
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [newPoiPosition, setNewPoiPosition] = useState(null);
  const [newPoiData, setNewPoiData] = useState({ name: "", description: "", tagId: "" });
  
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

  // Initialize Matterport SDK (optional - for future SDK features)
  useEffect(() => {
    if (!space || !iframeRef.current) return;
    // SDK initialization code here if needed
  }, [space]);

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

  // Method 2: Import tags via Matterport API
  const importTagsViaAPI = async () => {
    if (!space) return;
    
    setImporting(true);
    try {
      const response = await axios.post(`${API}/import-matterport-tags`, {
        space_id: id,
        model_id: space.model_id
      });
      
      if (response.data.success) {
        toast.success(response.data.message || `Importati ${response.data.imported} tag`);
        if (response.data.imported > 0) {
          fetchData(); // Refresh POIs list
        }
      } else {
        toast.error(response.data.message || "Errore nell'importazione");
      }
    } catch (error) {
      console.error("Error importing tags:", error);
      toast.error("Errore nella connessione all'API Matterport");
    } finally {
      setImporting(false);
    }
  };

  const handlePoiClick = (poi) => {
    setSelectedPoi(poi);
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingAudio(null);
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

  // Method 3: Create new POI manually
  const createNewPoi = async () => {
    if (!newPoiData.name) {
      toast.error("Inserisci almeno il nome del POI");
      return;
    }

    try {
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
      toast.success("POI creato con successo! Vai su Admin > POI per tradurre e generare l'audio.");
      
      // Reset state
      setDialogOpen(false);
      setNewPoiPosition(null);
      setNewPoiData({ name: "", description: "", tagId: "" });
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

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Matterport Viewer - Much Larger */}
          <div className="xl:col-span-3">
            <div className="matterport-frame rounded-sm overflow-hidden" style={{ aspectRatio: "16/9", minHeight: "600px" }}>
              <iframe
                ref={iframeRef}
                src={`https://my.matterport.com/show/?m=${space.model_id}&play=1`}
                title={getTranslation(space.name, language)}
                className="w-full h-full"
                style={{ minHeight: "600px" }}
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
          <div className="xl:col-span-1">
            <div className="bg-white rounded-sm border border-[#E5E0D8] p-6 sticky top-24 max-h-[80vh] overflow-y-auto">
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
                <div className="space-y-3 mb-6 p-4 bg-[#F2F0EB] rounded-sm">
                  <p className="font-sans text-xs text-[#666058] font-medium uppercase tracking-wide">Strumenti Admin</p>
                  
                  {/* Method 2: Import via API */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={importTagsViaAPI}
                    disabled={importing}
                    className="w-full text-xs border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-white"
                    data-testid="import-api-btn"
                  >
                    {importing ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-2" />
                    )}
                    Importa Tag via API
                  </Button>
                  
                  {/* Method 3: Manual Add */}
                  <Button
                    size="sm"
                    onClick={() => {
                      setNewPoiData({ name: "", description: "", tagId: "" });
                      setDialogOpen(true);
                    }}
                    className="w-full text-xs btn-gold"
                    data-testid="add-poi-manual-btn"
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    Aggiungi POI Manuale
                  </Button>
                  
                  <p className="font-sans text-[10px] text-[#666058] mt-2">
                    💡 Usa "Importa Tag via API" per importare automaticamente tutti i tag Matterport esistenti, 
                    oppure "Aggiungi POI Manuale" per creare nuovi punti di interesse.
                  </p>
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
