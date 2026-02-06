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
    if (!matterportRef.current) {
      toast.error("SDK non connesso");
      return;
    }

    try {
      // Find POI
      const poi = matterportPois.find(p => p.id === poiId);
      if (!poi) {
        toast.error("POI non trovato");
        return;
      }

      // Use matterport_tag_id to navigate
      if (poi.matterport_tag_id) {
        await matterportRef.current.navigateToTag(poi.matterport_tag_id);
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
          <div className="bg-slate-800 border-t border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Camera Thumbnail */}
                <div className="w-24 h-16 bg-slate-700 rounded overflow-hidden">
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

              {/* Actions */}
              <div className="flex items-center gap-2">
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

                {/* View Stream (placeholder) */}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  disabled={selectedCamera.status !== "online"}
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
