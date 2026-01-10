import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  MapPin,
  Navigation,
  Eye,
  Loader2,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

const SDK_VERSION = "3.0.0-0-g0517b8d76c";
const SDK_KEY = process.env.REACT_APP_MATTERPORT_SDK_KEY || "";
const DEFAULT_SPACE_ID = process.env.REACT_APP_MATTERPORT_SPACE_ID || "j1r4zUjanif";

// Matterport SDK URL
const getSDKUrl = (key) => 
  `https://api.matterport.com/sdk/bootstrap/${SDK_VERSION}/sdk.es6.js?applicationKey=${key}`;

// Showcase embed URL with SDK key
const getShowcaseUrl = (spaceId, key) =>
  `https://my.matterport.com/show?m=${spaceId}&play=1&applicationKey=${key}`;

/**
 * MatterportViewer Component
 * 
 * A React component that integrates with the Matterport SDK to provide
 * interactive 3D model viewing with programmatic navigation capabilities.
 * 
 * Props:
 * - spaceId: Matterport space ID to display
 * - onSdkReady: Callback when SDK is connected and ready
 * - onTagsLoaded: Callback when Mattertags are loaded with tag data
 * - className: Additional CSS classes
 * 
 * Ref Methods:
 * - navigateToTag(tagId): Move camera to a specific Mattertag
 * - getTags(): Get all available Mattertags
 * - getCurrentPosition(): Get current camera position
 * - getSdk(): Get the raw SDK instance for advanced usage
 */
const MatterportViewer = forwardRef(({ 
  spaceId = DEFAULT_SPACE_ID, 
  onSdkReady, 
  onTagsLoaded,
  className = ""
}, ref) => {
  const iframeRef = useRef(null);
  const sdkRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  const [mattertags, setMattertags] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [modelData, setModelData] = useState(null);
  const containerRef = useRef(null);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    /**
     * Navigate the camera to a specific Mattertag/Tag
     */
    navigateToTag: async (tagId) => {
      if (!sdkRef.current) {
        toast.error("SDK non connesso");
        return false;
      }
      try {
        // Use Mattertag.navigateToTag directly (most reliable method)
        await sdkRef.current.Mattertag.navigateToTag(
          tagId,
          sdkRef.current.Mattertag.Transition.FLY
        );
        toast.success("Navigazione completata");
        return true;
      } catch (error) {
        console.error("Navigation error:", error);
        toast.error(`Errore navigazione: ${error?.message || "impossibile raggiungere il POI"}`);
        return false;
      }
    },

    /**
     * Get all available Mattertags
     */
    getTags: () => mattertags,

    /**
     * Get current camera position
     */
    getCurrentPosition: async () => {
      if (!sdkRef.current) return null;
      try {
        const pose = await sdkRef.current.Camera.getPose();
        return pose;
      } catch (error) {
        console.error("Error getting position:", error);
        return null;
      }
    },

    /**
     * Add a new Mattertag at a specific position
     * @param {Object} tagData - Tag data including position, label, description
     * @returns {string|null} - The ID of the created tag, or null on failure
     */
    addTag: async (tagData) => {
      if (!sdkRef.current) {
        toast.error("SDK non connesso");
        return null;
      }
      try {
        const mattertagDesc = {
          label: tagData.label || tagData.title || "POI",
          description: tagData.description || "",
          anchorPosition: {
            x: tagData.position?.x || 0,
            y: tagData.position?.y || 0,
            z: tagData.position?.z || 0
          },
          stemVector: { x: 0, y: 0.15, z: 0 }, // Small stem above the anchor
          color: tagData.color || { r: 0, g: 0.75, b: 1 } // Cyan color
        };

        // Add the mattertag
        const [mattertagId] = await sdkRef.current.Mattertag.add(mattertagDesc);
        console.log("Created Mattertag with ID:", mattertagId);
        
        // Refresh tags list
        const tags = await sdkRef.current.Mattertag.getData();
        setMattertags(tags);
        
        toast.success("POI aggiunto alla vista 3D");
        return mattertagId;
      } catch (error) {
        console.error("Add tag error:", error);
        toast.error(`Errore creazione tag: ${error.message}`);
        return null;
      }
    },

    /**
     * Remove a Mattertag by ID
     */
    removeTag: async (tagId) => {
      if (!sdkRef.current) return false;
      try {
        await sdkRef.current.Mattertag.remove(tagId);
        // Refresh tags list
        const tags = await sdkRef.current.Mattertag.getData();
        setMattertags(tags);
        toast.success("POI rimosso dalla vista 3D");
        return true;
      } catch (error) {
        console.error("Remove tag error:", error);
        return false;
      }
    },

    /**
     * Get the raw SDK instance for advanced usage
     */
    getSdk: () => sdkRef.current,

    /**
     * Move to a specific position in the model
     */
    moveTo: async (position, rotation) => {
      if (!sdkRef.current) return false;
      try {
        await sdkRef.current.Camera.setRotation(rotation || { x: 0, y: 0 });
        await sdkRef.current.Camera.zoomTo(position);
        return true;
      } catch (error) {
        console.error("Move error:", error);
        return false;
      }
    },

    /**
     * Reload the model
     */
    reload: () => {
      if (iframeRef.current) {
        setConnectionStatus('connecting');
        iframeRef.current.src = getShowcaseUrl(spaceId, SDK_KEY);
      }
    }
  }));

  // Load the SDK and connect to the iframe
  const connectSdk = useCallback(async () => {
    if (!iframeRef.current || !SDK_KEY) {
      console.error("Missing iframe or SDK key");
      setConnectionStatus('error');
      return;
    }

    setConnectionStatus('connecting');

    try {
      // Dynamically import the SDK module
      const sdkModule = await import(/* webpackIgnore: true */ getSDKUrl(SDK_KEY));
      
      // Connect to the iframe
      const mpSdk = await sdkModule.connect(iframeRef.current);
      sdkRef.current = mpSdk;

      console.log("Matterport SDK connected successfully!");

      // Get model data
      try {
        const data = await mpSdk.Model.getData();
        setModelData(data);
        console.log("Model SID:", data.sid);
      } catch (e) {
        console.log("Could not get model data:", e);
      }

      // Load Mattertags/Tags - try new API first, fallback to deprecated
      try {
        let tags = [];
        // Try the new Tag.data API first
        if (mpSdk.Tag && mpSdk.Tag.data) {
          tags = await mpSdk.Tag.data.collect();
          console.log(`Loaded ${tags.length} Tags (new API)`);
        } else {
          // Fallback to deprecated Mattertag API
          tags = await mpSdk.Mattertag.getData();
          console.log(`Loaded ${tags.length} Mattertags (legacy API)`);
        }
        setMattertags(tags);
        
        if (onTagsLoaded) {
          onTagsLoaded(tags);
        }
      } catch (e) {
        console.log("Could not load Tags:", e);
        // Try legacy API as fallback
        try {
          const tags = await mpSdk.Mattertag.getData();
          setMattertags(tags);
          console.log(`Loaded ${tags.length} Mattertags (fallback)`);
          if (onTagsLoaded) {
            onTagsLoaded(tags);
          }
        } catch (e2) {
          console.log("Could not load Mattertags either:", e2);
        }
      }

      setConnectionStatus('connected');
      
      if (onSdkReady) {
        onSdkReady(mpSdk);
      }

      toast.success("SDK Matterport connesso!");

    } catch (error) {
      console.error("SDK connection error:", error);
      setConnectionStatus('error');
      toast.error(`Errore connessione SDK: ${error.message}`);
    }
  }, [onSdkReady, onTagsLoaded]);

  // Handle iframe load event
  const handleIframeLoad = useCallback(() => {
    // Wait a bit for the showcase to fully initialize
    setTimeout(() => {
      connectSdk();
    }, 2000);
  }, [connectSdk]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Render status badge based on connection status
  const renderStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle size={12} className="mr-1" />
            SDK Connesso
          </Badge>
        );
      case 'connecting':
        return (
          <Badge className="bg-yellow-500 text-white animate-pulse">
            <Loader2 size={12} className="mr-1 animate-spin" />
            Connessione...
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500 text-white">
            <AlertTriangle size={12} className="mr-1" />
            Errore SDK
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500 text-white">
            <Eye size={12} className="mr-1" />
            Solo Visualizzazione
          </Badge>
        );
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative bg-slate-900 rounded-xl overflow-hidden ${className}`}
    >
      {/* Top Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>
          {renderStatusBadge()}
        </div>
        
        <div className="flex items-center gap-2">
          {mattertags.length > 0 && (
            <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 bg-slate-900/80">
              <MapPin size={12} className="mr-1" />
              {mattertags.length} POI
            </Badge>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            className="bg-slate-900/80 text-white hover:bg-slate-800"
            onClick={() => {
              if (iframeRef.current) {
                setConnectionStatus('connecting');
                iframeRef.current.src = getShowcaseUrl(spaceId, SDK_KEY);
              }
            }}
            title="Ricarica"
          >
            <RefreshCw size={16} />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="bg-slate-900/80 text-white hover:bg-slate-800"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Esci Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </Button>
        </div>
      </div>

      {/* Matterport iframe */}
      <div className="aspect-video bg-slate-900 relative">
        <iframe
          ref={iframeRef}
          id="matterport-showcase"
          title="Matterport 3D Digital Twin"
          src={getShowcaseUrl(spaceId, SDK_KEY)}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="fullscreen; vr; xr"
          allowFullScreen
          onLoad={handleIframeLoad}
          className="w-full h-full"
        />
      </div>

      {/* Bottom Info Bar - only show when connected */}
      {connectionStatus === 'connected' && modelData && (
        <div className="absolute bottom-3 left-3 right-3 z-10">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Navigation size={12} />
                Space: {modelData.sid}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              SDK v{SDK_VERSION}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MatterportViewer.displayName = 'MatterportViewer';

export default MatterportViewer;
