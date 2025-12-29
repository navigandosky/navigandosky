import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Volume2, Pause, Loader2, Tag, Calendar, User, Home } from "lucide-react";
import axios from "axios";
import { Button } from "../components/ui/button";
import { useLanguage, getTranslation } from "../hooks/useLanguage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const translations = {
  it: {
    back: "Torna all'archivio",
    loading: "Caricamento...",
    notFound: "Costume non trovato",
    playAudio: "Riproduci audioguida",
    pauseAudio: "Pausa",
    ricamatrice: "Ricamatrice",
    proprieta: "Proprietà",
    valore: "Valore",
    dataRealizzazione: "Data realizzazione",
    spazioCollegato: "Spazio collegato",
    tagMatterport: "Tag Matterport",
    gallery: "Galleria fotografica"
  },
  en: {
    back: "Back to archive",
    loading: "Loading...",
    notFound: "Costume not found",
    playAudio: "Play audio guide",
    pauseAudio: "Pause",
    ricamatrice: "Embroiderer",
    proprieta: "Property",
    valore: "Value",
    dataRealizzazione: "Creation date",
    spazioCollegato: "Linked space",
    tagMatterport: "Matterport tag",
    gallery: "Photo gallery"
  },
  fr: {
    back: "Retour aux archives",
    loading: "Chargement...",
    notFound: "Costume non trouvé",
    playAudio: "Lire l'audioguide",
    pauseAudio: "Pause",
    ricamatrice: "Brodeuse",
    proprieta: "Propriété",
    valore: "Valeur",
    dataRealizzazione: "Date de création",
    spazioCollegato: "Espace lié",
    tagMatterport: "Tag Matterport",
    gallery: "Galerie photos"
  },
  de: {
    back: "Zurück zum Archiv",
    loading: "Laden...",
    notFound: "Kostüm nicht gefunden",
    playAudio: "Audioguide abspielen",
    pauseAudio: "Pause",
    ricamatrice: "Stickerin",
    proprieta: "Eigentum",
    valore: "Wert",
    dataRealizzazione: "Erstellungsdatum",
    spazioCollegato: "Verknüpfter Raum",
    tagMatterport: "Matterport-Tag",
    gallery: "Fotogalerie"
  }
};

export default function CostumeDetail() {
  const { id } = useParams();
  const [costume, setCostume] = useState(null);
  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const audioRef = useRef(null);
  const { language } = useLanguage();
  const t = translations[language];

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const costumeRes = await axios.get(`${API}/costumes/${id}`);
      setCostume(costumeRes.data);
      
      if (costumeRes.data.space_id) {
        try {
          const spaceRes = await axios.get(`${API}/spaces/${costumeRes.data.space_id}`);
          setSpace(spaceRes.data);
        } catch (e) {
          console.log("Space not found");
        }
      }
    } catch (error) {
      console.error("Error fetching costume:", error);
    } finally {
      setLoading(false);
    }
  };

  const playAudio = () => {
    const audioUrl = costume.audio_url?.[language] || costume.audio_url?.it;
    if (!audioUrl) return;

    if (playingAudio) {
      audioRef.current?.pause();
      setPlayingAudio(false);
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl.startsWith('http') ? audioUrl : `${process.env.REACT_APP_BACKEND_URL}${audioUrl}`;
        audioRef.current.play();
        setPlayingAudio(true);
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

  if (!costume) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <p className="font-sans text-[#666058] mb-4">{t.notFound}</p>
        <Link to="/costumes" className="text-[#C5A059] hover:underline">
          {t.back}
        </Link>
      </div>
    );
  }

  const getImageUrl = (url) => {
    if (!url) return "";
    return url.startsWith('http') ? url : `${process.env.REACT_APP_BACKEND_URL}${url}`;
  };

  return (
    <div className="py-16 md:py-24">
      {/* Hidden audio element */}
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingAudio(false)}
        className="hidden"
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Back link */}
        <Link 
          to="/costumes" 
          className="inline-flex items-center text-[#C5A059] hover:text-[#B08D45] transition-colors mb-8"
          data-testid="back-link"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.back}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Gallery */}
          <div>
            {costume.photos && costume.photos.length > 0 ? (
              <div>
                {/* Main Image */}
                <div className="relative overflow-hidden rounded-sm border-4 border-[#C5A059]/20 mb-4">
                  <img
                    src={getImageUrl(costume.photos[selectedImage])}
                    alt={getTranslation(costume.description, language)}
                    className="w-full h-[400px] object-cover"
                    data-testid="main-image"
                  />
                </div>

                {/* Thumbnails */}
                {costume.photos.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {costume.photos.map((photo, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-sm overflow-hidden border-2 transition-all ${
                          selectedImage === index
                            ? "border-[#C5A059]"
                            : "border-transparent hover:border-[#C5A059]/50"
                        }`}
                        data-testid={`thumbnail-${index}`}
                      >
                        <img
                          src={getImageUrl(photo)}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 bg-[#F2F0EB] rounded-sm flex items-center justify-center">
                <span className="font-mono text-[#666058]">ID: {costume.id_risorsa}</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <p className="font-mono text-sm text-[#C5A059] mb-3">{costume.id_risorsa}</p>
            <h1 className="font-serif text-3xl md:text-4xl text-[#2A2A2A] mb-6" data-testid="costume-title">
              {getTranslation(costume.description, language)}
            </h1>

            {/* Audio Guide */}
            {costume.audio_url && (costume.audio_url[language] || costume.audio_url.it) && (
              <Button
                onClick={playAudio}
                className="btn-gold rounded-sm px-6 py-3 mb-8"
                data-testid="play-audio"
              >
                {playingAudio ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    {t.pauseAudio}
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5 mr-2" />
                    {t.playAudio}
                  </>
                )}
              </Button>
            )}

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {costume.ricamatrice && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-[#C5A059] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-sans text-sm text-[#666058]">{t.ricamatrice}</p>
                    <p className="font-serif text-lg text-[#2A2A2A]">{costume.ricamatrice}</p>
                  </div>
                </div>
              )}

              {costume.proprieta && (
                <div className="flex items-start gap-3">
                  <Home className="w-5 h-5 text-[#C5A059] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-sans text-sm text-[#666058]">{t.proprieta}</p>
                    <p className="font-serif text-lg text-[#2A2A2A]">{costume.proprieta}</p>
                  </div>
                </div>
              )}

              {costume.valore && (
                <div className="flex items-start gap-3">
                  <Tag className="w-5 h-5 text-[#C5A059] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-sans text-sm text-[#666058]">{t.valore}</p>
                    <p className="font-serif text-lg text-[#2A2A2A]">{costume.valore}</p>
                  </div>
                </div>
              )}

              {costume.data_realizzazione && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[#C5A059] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-sans text-sm text-[#666058]">{t.dataRealizzazione}</p>
                    <p className="font-serif text-lg text-[#2A2A2A]">{costume.data_realizzazione}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Matterport Link */}
            {(space || costume.matterport_tag_id) && (
              <div className="bg-[#F2F0EB] rounded-sm p-6">
                <h3 className="font-serif text-lg text-[#2A2A2A] mb-4">Collegamento Matterport</h3>
                
                {space && (
                  <div className="mb-3">
                    <p className="font-sans text-sm text-[#666058]">{t.spazioCollegato}</p>
                    <Link
                      to={`/exhibitions/${space.id}`}
                      className="font-serif text-[#C5A059] hover:text-[#B08D45] transition-colors"
                    >
                      {getTranslation(space.name, language)}
                    </Link>
                  </div>
                )}

                {costume.matterport_tag_id && (
                  <div>
                    <p className="font-sans text-sm text-[#666058]">{t.tagMatterport}</p>
                    <p className="font-mono text-sm text-[#2A2A2A]">{costume.matterport_tag_id}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
