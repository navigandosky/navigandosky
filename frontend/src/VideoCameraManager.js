import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Video,
  Camera,
  MapPin,
  Navigation,
  RefreshCw,
  Link2,
  Circle,
  Loader2,
  ChevronRight,
  Play,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MatterportViewer from "./MatterportViewer";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const VideoCameraManager = ({ authToken, currentUser, matterportPois = [] }) => {
  // State
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkingCamera, setLinkingCamera] = useState(null);
  const [selectedPoiId, setSelectedPoiId] = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  
  // Live video state
  const [showLiveDialog, setShowLiveDialog] = useState(false);
  const [liveSnapshot, setLiveSnapshot] = useState(null);
  const [liveStreamUrl, setLiveStreamUrl] = useState(null);
  const [loadingLive, setLoadingLive] = useState(false);
  
  // Refs
  const matterportRef = useRef(null);

  // Load cameras
  const loadCameras = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/ezviz/cameras`, {
        params: { token: authToken }
      });
      setCameras(response.data.cameras || []);
    } catch (error) {
      console.error("Error loading cameras:", error);
      toast.error("Errore nel caricamento delle camere");
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    loadCameras();
  }, [loadCameras]);

  // Navigate to POI using MatterportViewer ref
  const navigateToPoi = useCallback(async (poiId) => {
    console.log("navigateToPoi called with poiId:", poiId);
    
    if (!matterportRef.current) {
      toast.error("SDK non connesso");
      return;
    }

    try {
      // Find POI
      console.log("Available POIs count:", matterportPois.length);
      const poi = matterportPois.find(p => p.id === poiId);
      
      if (!poi) {
        console.error("POI not found for id:", poiId);
        toast.error("POI non trovato nella lista");
        return;
      }

      const poiTitle = poi.translations?.[0]?.title || poi.matterport_tag_id || poiId;
      console.log("Found POI:", poiTitle, "with tag_id:", poi.matterport_tag_id);

      // Use matterport_tag_id to navigate
      if (poi.matterport_tag_id) {
        toast.info(`Navigazione verso: ${poiTitle}`);
        await matterportRef.current.navigateToTag(poi.matterport_tag_id);
        toast.success(`Arrivato a: ${poiTitle}`);
      } else {
        toast.error("POI senza tag Matterport");
      }
    } catch (error) {
      console.error("Navigation error:", error);
      toast.error("Errore nella navigazione");
    }
  }, [matterportPois]);

  // Link camera to POI
  const handleLinkCamera = async () => {
    if (!linkingCamera) return;

    try {
      const poiToLink = selectedPoiId === "none" ? null : selectedPoiId;
      await axios.post(
        `${API_URL}/api/ezviz/camera/${linkingCamera.serial}/link-poi?token=${authToken}`,
        { poi_id: poiToLink }
      );
      
      toast.success(poiToLink ? "Camera collegata al POI" : "Collegamento rimosso");
      setShowLinkDialog(false);
      setLinkingCamera(null);
      setSelectedPoiId("");
      loadCameras();
    } catch (error) {
      console.error("Error linking camera:", error);
      toast.error("Errore nel collegamento");
    }
  };

  // Capture snapshot from camera
  const captureSnapshot = async () => {
    if (!selectedCamera) return;
    
    try {
      setLoadingLive(true);
      const response = await axios.get(
        `${API_URL}/api/ezviz/camera/${selectedCamera.serial}/snapshot`,
        { params: { token: authToken } }
      );
      
      if (response.data.url) {
        setLiveSnapshot(response.data.url);
        toast.success("Immagine catturata");
      } else {
        toast.error("Impossibile catturare immagine");
      }
    } catch (error) {
      console.error("Error capturing snapshot:", error);
      toast.error("Errore nella cattura immagine");
    } finally {
      setLoadingLive(false);
    }
  };

  // Load live stream URL
  const loadLiveStream = async () => {
    if (!selectedCamera) return;
    
    try {
      setLoadingLive(true);
      const response = await axios.get(
        `${API_URL}/api/ezviz/camera/${selectedCamera.serial}/stream`,
        { params: { token: authToken, protocol: 2, quality: 1 } }
      );
      
      if (response.data.url) {
        setLiveStreamUrl(response.data.url);
        toast.success("Stream avviato");
      } else {
        toast.error("Impossibile avviare stream");
        // Fallback to snapshot
        captureSnapshot();
      }
    } catch (error) {
      console.error("Error loading stream:", error);
      toast.error("Stream non disponibile, caricamento snapshot...");
      // Fallback to snapshot
      captureSnapshot();
    } finally {
      setLoadingLive(false);
    }
  };

  // Reset live state when dialog closes or camera changes
  useEffect(() => {
    if (!showLiveDialog) {
      setLiveSnapshot(null);
      setLiveStreamUrl(null);
    }
  }, [showLiveDialog]);

  // Auto-capture snapshot when opening dialog or when camera changes while dialog is open
  useEffect(() => {
    if (showLiveDialog && selectedCamera?.status === "online") {
      // Reset previous data first
      setLiveSnapshot(null);
      setLiveStreamUrl(null);
      // Then capture new snapshot
      const captureNewSnapshot = async () => {
        try {
          setLoadingLive(true);
          const response = await axios.get(
            `${API_URL}/api/ezviz/camera/${selectedCamera.serial}/snapshot`,
            { params: { token: authToken } }
          );
          
          if (response.data.url) {
            setLiveSnapshot(response.data.url);
            toast.success("Immagine catturata");
          }
        } catch (error) {
          console.error("Error capturing snapshot:", error);
          toast.error("Errore nella cattura immagine");
        } finally {
          setLoadingLive(false);
        }
      };
      captureNewSnapshot();
    }
  }, [showLiveDialog, selectedCamera?.serial, authToken]);

  // Open link dialog
  const openLinkDialog = (camera) => {
    setLinkingCamera(camera);
    setSelectedPoiId(camera.poi_id || "");
    setShowLinkDialog(true);
  };

  // Get POI name
  const getPoiName = (poiId) => {
    const poi = matterportPois.find(p => p.id === poiId);
    return poi?.translations?.[0]?.title || poi?.matterport_tag_id || "POI";
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-slate-900">
      {/* Left Sidebar - Camera List */}
      <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-white">Video Camere</h2>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={loadCameras}
              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            {cameras.length} camere • {cameras.filter(c => c.status === "online").length} online
          </p>
        </div>

        {/* Camera List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : cameras.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nessuna camera trovata</p>
              <p className="text-xs mt-1">Verifica configurazione EZVIZ</p>
            </div>
          ) : (
            cameras.map((camera) => (
              <div
                key={camera.id}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedCamera?.id === camera.id
                    ? "bg-red-600/20 border border-red-500/50"
                    : "bg-slate-700/50 hover:bg-slate-700 border border-transparent"
                }`}
                onClick={() => setSelectedCamera(camera)}
              >
                <div className="flex items-start gap-3">
                  {/* Camera Thumbnail */}
                  <div className="w-16 h-12 bg-slate-600 rounded overflow-hidden flex-shrink-0">
                    {camera.image_url ? (
                      <img 
                        src={camera.image_url} 
                        alt={camera.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-6 w-6 text-slate-500" />
                      </div>
                    )}
                  </div>

                  {/* Camera Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Circle 
                        className={`h-2 w-2 ${
                          camera.status === "online" ? "fill-green-500 text-green-500" : "fill-red-500 text-red-500"
                        }`} 
                      />
                      <span className="text-sm font-medium text-white truncate">
                        {camera.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{camera.model}</p>
                    
                    {/* POI Link Status */}
                    {camera.poi_id ? (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-emerald-400">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{getPoiName(camera.poi_id)}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 mt-1.5">
                        Nessun POI collegato
                      </div>
                    )}
                  </div>

                  <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content - Matterport Viewer */}
      <div className="flex-1 flex flex-col">
        {/* Matterport Viewer */}
        <div className="flex-1 relative bg-black">
          {currentUser?.matterport_space_id ? (
            <MatterportViewer
              ref={matterportRef}
              spaceId={currentUser.matterport_space_id}
              onSdkReady={() => setSdkReady(true)}
              className="w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-400">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Nessuno Space Matterport configurato</p>
                <p className="text-xs mt-1">Configura lo Space nelle impostazioni</p>
              </div>
            </div>
          )}
        </div>

        {/* Selected Camera Panel */}
        {selectedCamera && (
          <div className="bg-slate-800 border-t border-slate-700 p-4 pr-32">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Camera Thumbnail - clickable for live view */}
                <div 
                  className="w-24 h-16 bg-slate-700 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-red-500 transition-all"
                  onClick={() => selectedCamera.status === "online" && setShowLiveDialog(true)}
                  title={selectedCamera.status === "online" ? "Clicca per video live" : "Camera offline"}
                >
                  {selectedCamera.image_url ? (
                    <img 
                      src={selectedCamera.image_url} 
                      alt={selectedCamera.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="h-8 w-8 text-slate-500" />
                    </div>
                  )}
                  {selectedCamera.status === "online" && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Play className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>

                {/* Camera Details */}
                <div>
                  <div className="flex items-center gap-2">
                    <Circle 
                      className={`h-2.5 w-2.5 ${
                        selectedCamera.status === "online" 
                          ? "fill-green-500 text-green-500" 
                          : "fill-red-500 text-red-500"
                      }`} 
                    />
                    <h3 className="text-lg font-semibold text-white">{selectedCamera.name}</h3>
                  </div>
                  <p className="text-sm text-slate-400">{selectedCamera.model} • {selectedCamera.serial}</p>
                  
                  {/* POI Status */}
                  {selectedCamera.poi_id ? (
                    <div className="flex items-center gap-2 mt-1 text-sm text-emerald-400">
                      <MapPin className="h-4 w-4" />
                      <span>Collegata a: {getPoiName(selectedCamera.poi_id)}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 mt-1">Nessun POI collegato</p>
                  )}
                </div>
              </div>

              {/* Actions - moved left with mr-8 to avoid logo */}
              <div className="flex items-center gap-2 mr-8">
                {/* Link to POI Button */}
                <Button
                  size="sm"
                  variant={selectedCamera.poi_id ? "outline" : "default"}
                  onClick={() => openLinkDialog(selectedCamera)}
                  className={selectedCamera.poi_id 
                    ? "border-emerald-500 text-emerald-400 hover:bg-emerald-500/10" 
                    : "bg-blue-600 hover:bg-blue-500"
                  }
                >
                  {selectedCamera.poi_id ? (
                    <>
                      <Link2 className="h-4 w-4 mr-1" />
                      Modifica POI
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 mr-1" />
                      Collega POI
                    </>
                  )}
                </Button>

                {/* Go to POI Button */}
                {selectedCamera.poi_id && (
                  <Button
                    size="sm"
                    onClick={() => navigateToPoi(selectedCamera.poi_id)}
                    className="bg-red-600 hover:bg-red-500"
                    disabled={!sdkReady}
                  >
                    <Navigation className="h-4 w-4 mr-1" />
                    Vai al POI
                  </Button>
                )}

                {/* View Stream Button */}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-600/20"
                  disabled={selectedCamera.status !== "online"}
                  onClick={() => setShowLiveDialog(true)}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Live
                </Button>

                {/* Close */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedCamera(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Video Dialog */}
      <Dialog open={showLiveDialog} onOpenChange={setShowLiveDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-red-500" />
              {selectedCamera?.name} - Live
              <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                selectedCamera?.status === "online" 
                  ? "bg-green-500/20 text-green-400" 
                  : "bg-red-500/20 text-red-400"
              }`}>
                {selectedCamera?.status === "online" ? "● LIVE" : "● OFFLINE"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Video/Image Container */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
              {liveStreamUrl ? (
                <iframe 
                  src={liveStreamUrl}
                  className="w-full h-full"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                />
              ) : liveSnapshot ? (
                <img 
                  src={liveSnapshot} 
                  alt="Live snapshot"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {loadingLive ? (
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-red-500 mx-auto mb-2" />
                      <p className="text-slate-400">Caricamento video...</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Camera className="h-16 w-16 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400">Clicca per catturare immagine</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={captureSnapshot}
                  disabled={loadingLive || selectedCamera?.status !== "online"}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  <Camera className="h-4 w-4 mr-1" />
                  Cattura Immagine
                </Button>
                <Button
                  size="sm"
                  onClick={loadLiveStream}
                  disabled={loadingLive || selectedCamera?.status !== "online"}
                  className="bg-red-600 hover:bg-red-500"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Stream Live
                </Button>
              </div>

              <div className="text-xs text-slate-500">
                {liveSnapshot && "Ultimo aggiornamento: " + new Date().toLocaleTimeString('it-IT')}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link POI Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-blue-400" />
              Collega Camera a POI
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-slate-400 mb-2">Camera:</p>
              <p className="font-medium">{linkingCamera?.name}</p>
            </div>

            <div>
              <p className="text-sm text-slate-400 mb-2">Seleziona POI:</p>
              <Select value={selectedPoiId} onValueChange={setSelectedPoiId}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue placeholder="Seleziona un POI..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="none">
                    <span className="text-slate-400">Nessun collegamento</span>
                  </SelectItem>
                  {matterportPois.map((poi) => (
                    <SelectItem key={poi.id} value={poi.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-emerald-400" />
                        {poi.translations?.[0]?.title || poi.matterport_tag_id || poi.id}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                onClick={() => setShowLinkDialog(false)}
                className="text-slate-400"
              >
                Annulla
              </Button>
              <Button
                onClick={handleLinkCamera}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {selectedPoiId && selectedPoiId !== "none" ? "Collega" : "Rimuovi collegamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoCameraManager;
