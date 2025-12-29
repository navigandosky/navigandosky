import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Volume2, Pause, Loader2 } from "lucide-react";
import axios from "axios";
import { Button } from "../components/ui/button";
import { useLanguage, getTranslation } from "../hooks/useLanguage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const translations = {
  it: {
    back: "Torna alle mostre",
    pois: "Punti di Interesse",
    loading: "Caricamento...",
    notFound: "Mostra non trovata",
    playAudio: "Riproduci audioguida",
    pauseAudio: "Pausa"
  },
  en: {
    back: "Back to exhibitions",
    pois: "Points of Interest",
    loading: "Loading...",
    notFound: "Exhibition not found",
    playAudio: "Play audio guide",
    pauseAudio: "Pause"
  },
  fr: {
    back: "Retour aux expositions",
    pois: "Points d'intérêt",
    loading: "Chargement...",
    notFound: "Exposition non trouvée",
    playAudio: "Lire l'audioguide",
    pauseAudio: "Pause"
  },
  de: {
    back: "Zurück zu Ausstellungen",
    pois: "Sehenswürdigkeiten",
    loading: "Laden...",
    notFound: "Ausstellung nicht gefunden",
    playAudio: "Audioguide abspielen",
    pauseAudio: "Pause"
  }
};

export default function ExhibitionDetail() {
  const { id } = useParams();
  const [space, setSpace] = useState(null);
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const iframeRef = useRef(null);
  const audioRef = useRef(null);
  const { language } = useLanguage();
  const t = translations[language];

  useEffect(() => {
    fetchData();
  }, [id]);

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
    // Stop any playing audio
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
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Matterport Viewer */}
          <div className="lg:col-span-2">
            <div className="matterport-frame rounded-sm overflow-hidden" style={{ aspectRatio: "16/9" }}>
              <iframe
                ref={iframeRef}
                src={`https://my.matterport.com/show/?m=${space.model_id}`}
                title={getTranslation(space.name, language)}
                className="w-full h-full"
                allow="xr-spatial-tracking; fullscreen"
                allowFullScreen
                frameBorder="0"
                data-testid="matterport-iframe"
              />
            </div>
          </div>

          {/* POIs Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-sm border border-[#E5E0D8] p-6 sticky top-24">
              <h2 className="font-serif text-xl text-[#2A2A2A] mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#C5A059]" />
                {t.pois}
              </h2>

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
    </div>
  );
}
