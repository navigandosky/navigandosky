import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import MatterportViewer from "./MatterportViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Box,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  MapPin,
  Languages,
  Volume2,
  FileText,
  Image,
  Video,
  Loader2,
  Check,
  X,
  RefreshCw,
  Navigation,
  Crosshair,
  Globe,
  Mic,
  Power,
  Link,
  Unlink,
  Cloud,
  CloudUpload,
  CheckCircle,
  // Icons for POI types
  Thermometer,
  Flame,
  Lightbulb,
  Tv,
  Camera,
  DoorOpen,
  Lock,
  Wifi,
  Fan,
  Droplets,
  Zap,
  Home,
  Car,
  Trees,
  Sofa,
  Bed,
  Bath,
  UtensilsCrossed,
  Warehouse,
  Building2,
  Info,
  AlertTriangle,
  Star,
  Heart,
  Bell,
  Settings,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Pencil
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// POI Icon Library
const POI_ICONS = [
  { id: "info", name: "Info", icon: Info, color: "#3B82F6" },
  { id: "thermometer", name: "Temperatura", icon: Thermometer, color: "#EF4444" },
  { id: "flame", name: "Caldaia/Riscaldamento", icon: Flame, color: "#F97316" },
  { id: "lightbulb", name: "Illuminazione", icon: Lightbulb, color: "#EAB308" },
  { id: "tv", name: "TV/Display", icon: Tv, color: "#8B5CF6" },
  { id: "camera", name: "Telecamera", icon: Camera, color: "#EC4899" },
  { id: "door", name: "Porta/Ingresso", icon: DoorOpen, color: "#14B8A6" },
  { id: "lock", name: "Sicurezza", icon: Lock, color: "#6366F1" },
  { id: "wifi", name: "Rete/WiFi", icon: Wifi, color: "#06B6D4" },
  { id: "fan", name: "Ventilazione/Clima", icon: Fan, color: "#22C55E" },
  { id: "droplets", name: "Acqua/Idraulica", icon: Droplets, color: "#0EA5E9" },
  { id: "zap", name: "Elettrico", icon: Zap, color: "#FBBF24" },
  { id: "home", name: "Casa/Generale", icon: Home, color: "#84CC16" },
  { id: "car", name: "Garage/Auto", icon: Car, color: "#64748B" },
  { id: "trees", name: "Esterno/Giardino", icon: Trees, color: "#22C55E" },
  { id: "sofa", name: "Soggiorno", icon: Sofa, color: "#A855F7" },
  { id: "bed", name: "Camera da letto", icon: Bed, color: "#F472B6" },
  { id: "bath", name: "Bagno", icon: Bath, color: "#38BDF8" },
  { id: "kitchen", name: "Cucina", icon: UtensilsCrossed, color: "#FB923C" },
  { id: "warehouse", name: "Magazzino", icon: Warehouse, color: "#78716C" },
  { id: "building", name: "Edificio", icon: Building2, color: "#94A3B8" },
  { id: "alert", name: "Attenzione", icon: AlertTriangle, color: "#F59E0B" },
  { id: "star", name: "Speciale", icon: Star, color: "#FBBF24" },
  { id: "heart", name: "Preferito", icon: Heart, color: "#EF4444" },
  { id: "bell", name: "Notifica/Citofono", icon: Bell, color: "#8B5CF6" },
  { id: "settings", name: "Impostazioni", icon: Settings, color: "#6B7280" },
  { id: "phone", name: "Telefono", icon: Phone, color: "#10B981" },
  { id: "mappin", name: "Posizione", icon: MapPin, color: "#EF4444" }
];

// POI Categories
const POI_CATEGORIES = [
  { id: "general", name: "Generale", color: "#6B7280" },
  { id: "climate", name: "Clima/Riscaldamento", color: "#EF4444" },
  { id: "lighting", name: "Illuminazione", color: "#EAB308" },
  { id: "security", name: "Sicurezza", color: "#8B5CF6" },
  { id: "multimedia", name: "Multimedia/TV", color: "#EC4899" },
  { id: "appliances", name: "Elettrodomestici", color: "#F97316" },
  { id: "water", name: "Idraulica/Acqua", color: "#0EA5E9" },
  { id: "electrical", name: "Impianto Elettrico", color: "#FBBF24" },
  { id: "outdoor", name: "Esterno/Giardino", color: "#22C55E" },
  { id: "rooms", name: "Stanze/Ambienti", color: "#A855F7" },
  { id: "access", name: "Accessi/Porte", color: "#14B8A6" },
  { id: "network", name: "Rete/Connettività", color: "#06B6D4" }
];

// Supported languages
const LANGUAGES = [
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "es", name: "Español", flag: "🇪🇸" }
];

// TTS Voices
const TTS_VOICES = [
  { id: "alloy", name: "Alloy (Neutrale)" },
  { id: "nova", name: "Nova (Energica)" },
  { id: "shimmer", name: "Shimmer (Luminosa)" },
  { id: "echo", name: "Echo (Calma)" },
  { id: "fable", name: "Fable (Narrativa)" },
  { id: "onyx", name: "Onyx (Profonda)" }
];

export default function MatterportManager({ authToken, currentUser, navigateToPoiId, onNavigationComplete }) {
  // State
  const [spaces, setSpaces] = useState([]);
  const [activeSpace, setActiveSpace] = useState(null);
  const [pois, setPois] = useState([]);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [matterportTags, setMatterportTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pois");
  const [syncingToCloud, setSyncingToCloud] = useState(null);
  const [navigationPath, setNavigationPath] = useState([]); // Path points for navigation
  const [pathMarkerIds, setPathMarkerIds] = useState([]); // IDs of floor markers in 3D view
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // SmartThings state
  const [smartThingsDevices, setSmartThingsDevices] = useState([]);
  const [deviceStates, setDeviceStates] = useState({});
  const [sensorValues, setSensorValues] = useState({});
  const [statusOverlayIds, setStatusOverlayIds] = useState([]);
  const [showStatusOverlays, setShowStatusOverlays] = useState(true);
  
  // Dialogs
  const [showSpaceDialog, setShowSpaceDialog] = useState(false);
  const [showPoiDialog, setShowPoiDialog] = useState(false);
  const [showEditPoiDialog, setShowEditPoiDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showTranslateDialog, setShowTranslateDialog] = useState(false);
  const [showAudioDialog, setShowAudioDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showLinkDeviceDialog, setShowLinkDeviceDialog] = useState(false);
  const [showApparatoDialog, setShowApparatoDialog] = useState(false);
  
  // Linked appliance data
  const [linkedApparato, setLinkedApparato] = useState(null);
  const [loadingApparato, setLoadingApparato] = useState(false);
  
  // Live sensor data for linked appliance
  const [liveSensorData, setLiveSensorData] = useState(null);
  const [loadingLiveSensor, setLoadingLiveSensor] = useState(false);
  
  // POI sensor overlays data
  const [poiSensorData, setPoiSensorData] = useState({});
  const [poiOverlayIds, setPoiOverlayIds] = useState([]);
  
  // Forms
  const [spaceForm, setSpaceForm] = useState({ name: "", space_id: "", description: "", sdk_key: "" });
  const [poiForm, setPoiForm] = useState({ title: "", description: "", position: null, icon: "mappin", color: "#00BFFF", category: "general" });
  const [editPoiForm, setEditPoiForm] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all"); // Filter
  const [selectedTagsForImport, setSelectedTagsForImport] = useState([]);
  const [translateLanguages, setTranslateLanguages] = useState(["en", "de", "fr", "es"]);
  const [selectedVoice, setSelectedVoice] = useState("alloy");
  const [audioLanguages, setAudioLanguages] = useState(["it", "en", "de", "fr", "es"]);
  
  // Processing states
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Matterport ref
  const matterportRef = useRef(null);

  // Load spaces
  const loadSpaces = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/matterport/spaces`);
      let availableSpaces = res.data;
      
      // If user has assigned space and is not admin, filter to only their space
      if (currentUser?.matterport_space_id && currentUser?.role !== "admin") {
        // User has assigned space - create a virtual space entry for them
        const userSpace = {
          id: `user_${currentUser.id}`,
          name: currentUser.matterport_space_name || "Il mio spazio",
          space_id: currentUser.matterport_space_id,
          description: `Spazio assegnato a ${currentUser.username}`,
          is_active: true,
          sdk_key: "" // Will use global SDK key
        };
        availableSpaces = [userSpace];
        setSpaces(availableSpaces);
        setActiveSpace(userSpace);
        loadPois(userSpace.id);
        return;
      }
      
      setSpaces(availableSpaces);
      
      // Set active space
      const active = availableSpaces.find(s => s.is_active);
      if (active) {
        setActiveSpace(active);
        loadPois(active.id);
      }
    } catch (error) {
      console.error("Error loading spaces:", error);
    }
  }, [currentUser]);

  // Load POIs for a space
  const loadPois = useCallback(async (spaceId) => {
    try {
      // For virtual spaces (user_xxx), use the Matterport space_id from currentUser
      let actualSpaceId = spaceId;
      if (spaceId?.startsWith("user_") && currentUser?.matterport_space_id) {
        actualSpaceId = currentUser.matterport_space_id;
      }
      
      const params = { space_id: actualSpaceId };
      if (authToken) params.token = authToken;
      const res = await axios.get(`${API_URL}/api/matterport/pois`, { params });
      setPois(res.data);
    } catch (error) {
      console.error("Error loading POIs:", error);
    }
  }, [authToken, currentUser]);

  // Handler for when Matterport SDK loads tags
  const handleMatterportTagsLoaded = useCallback((tags) => {
    console.log("Matterport tags loaded:", tags?.length || 0);
    setMatterportTags(tags || []);
  }, []);

  // Load SmartThings devices with sensor values
  const loadSmartThingsDevices = useCallback(async () => {
    try {
      // Use the new endpoint that returns states and sensor values
      const res = await axios.get(`${API_URL}/api/smartthings/devices-with-sensors`);
      const { devices, states, sensors } = res.data;
      
      setSmartThingsDevices(devices || []);
      setDeviceStates(states || {});
      setSensorValues(sensors || {});
      
      console.log(`SmartThings: ${devices?.length || 0} devices, ${Object.keys(states || {}).length} with state, ${Object.keys(sensors || {}).length} with sensors`);
    } catch (error) {
      console.error("Error loading SmartThings devices:", error);
      // Fallback to basic endpoint
      try {
        const res = await axios.get(`${API_URL}/api/smartthings/devices`);
        setSmartThingsDevices(res.data.devices || []);
      } catch (e) {
        console.error("Fallback also failed:", e);
      }
    }
  }, []);

  // Load POI sensor data for all linked appliances
  const loadPoiSensorData = useCallback(async () => {
    try {
      const params = authToken ? { token: authToken } : {};
      const res = await axios.get(`${API_URL}/api/elettrodomestici/poi-sensors`, { params });
      const { poi_sensors } = res.data;
      setPoiSensorData(poi_sensors || {});
      console.log(`POI Sensors: ${Object.keys(poi_sensors || {}).length} POIs with sensors`);
    } catch (error) {
      console.error("Error loading POI sensor data:", error);
    }
  }, [authToken]);

  // Update POI sensor overlays in 3D view
  const updatePoiSensorOverlays = useCallback(async () => {
    if (!matterportRef.current || !showStatusOverlays) return;
    
    // Remove old POI overlays
    if (poiOverlayIds.length > 0) {
      for (const id of poiOverlayIds) {
        try {
          await matterportRef.current.removeTag?.(id);
        } catch (e) {
          // Ignore removal errors
        }
      }
    }
    
    // Get POIs with sensor data
    const poisWithSensors = pois.filter(p => poiSensorData[p.id]);
    if (poisWithSensors.length === 0) return;
    
    const newOverlayIds = [];
    
    for (const poi of poisWithSensors) {
      const sensorInfo = poiSensorData[poi.id];
      if (!sensorInfo || !poi.position) continue;
      
      // Build status label
      let statusLabel = "";
      let statusColor = { r: 0.3, g: 0.3, b: 0.3 };
      
      // Temperature
      if (sensorInfo.temperature !== undefined && sensorInfo.temperature !== null) {
        const temp = Number(sensorInfo.temperature);
        statusLabel = `🌡️${temp.toFixed(1)}°C`;
        if (temp > 26) {
          statusColor = { r: 1, g: 0.4, b: 0 };
        } else if (temp < 18) {
          statusColor = { r: 0.2, g: 0.6, b: 1 };
        } else {
          statusColor = { r: 0.2, g: 0.8, b: 0.2 };
        }
      }
      
      // Humidity
      if (sensorInfo.humidity !== undefined && sensorInfo.humidity !== null) {
        statusLabel += ` 💧${Number(sensorInfo.humidity).toFixed(0)}%`;
      }
      
      // Power
      if (sensorInfo.power !== undefined && sensorInfo.power !== null) {
        const power = Number(sensorInfo.power);
        if (power > 0) {
          statusLabel = `⚡${power.toFixed(0)}W`;
          statusColor = { r: 1, g: 0.8, b: 0 }; // Yellow for active power
        } else {
          statusLabel = "⚫ OFF";
          statusColor = { r: 0.4, g: 0.4, b: 0.4 };
        }
      }
      
      // Switch state fallback
      if (!statusLabel && sensorInfo.switch_state) {
        if (sensorInfo.switch_state === 'on') {
          statusLabel = "🔴 ON";
          statusColor = { r: 1, g: 0.2, b: 0.2 };
        } else {
          statusLabel = "⚫ OFF";
          statusColor = { r: 0.4, g: 0.4, b: 0.4 };
        }
      }
      
      if (!statusLabel) continue;
      
      // Create overlay tag slightly above the POI
      try {
        const tagId = await matterportRef.current.addTag?.({
          label: statusLabel,
          description: sensorInfo.apparato_nome || "",
          position: {
            x: poi.position.x,
            y: poi.position.y + 0.25,
            z: poi.position.z
          },
          color: statusColor
        });
        if (tagId) {
          newOverlayIds.push(tagId);
        }
      } catch (e) {
        console.log("Could not create sensor overlay for POI:", poi.id);
      }
    }
    
    setPoiOverlayIds(newOverlayIds);
  }, [pois, poiSensorData, showStatusOverlays, poiOverlayIds]);

  // Update status overlays in 3D view
  const updateStatusOverlays = useCallback(async () => {
    if (!matterportRef.current || !showStatusOverlays) return;
    
    // Remove old overlays
    if (statusOverlayIds.length > 0) {
      await matterportRef.current.removeStatusOverlays?.(statusOverlayIds);
    }
    
    // Create new overlays for POIs with linked devices
    const linkedPois = pois.filter(p => p.smartthings_device_id);
    if (linkedPois.length > 0 && matterportRef.current.createStatusOverlays) {
      const newIds = await matterportRef.current.createStatusOverlays(
        linkedPois,
        deviceStates,
        sensorValues
      );
      setStatusOverlayIds(newIds);
    }
  }, [pois, deviceStates, sensorValues, showStatusOverlays, statusOverlayIds]);

  // Toggle SmartThings device on/off
  const toggleSmartThingsDevice = async (deviceId, currentState) => {
    const newState = currentState === 'on' ? 'off' : 'on';
    try {
      await axios.post(`${API_URL}/api/smartthings/device/${deviceId}/switch/${newState}`);
      // Update local state immediately for responsiveness
      setDeviceStates(prev => ({ ...prev, [deviceId]: newState }));
      toast.success(`Dispositivo ${newState === 'on' ? 'acceso' : 'spento'}!`);
      // Refresh overlays after a moment
      setTimeout(updateStatusOverlays, 500);
    } catch (error) {
      console.error("Error toggling device:", error);
      toast.error("Errore nel controllo del dispositivo");
    }
  };

  // Link POI to SmartThings device
  const linkPoiToDevice = async (poiId, deviceId) => {
    try {
      await axios.put(`${API_URL}/api/matterport/pois/${poiId}?token=${authToken}`, {
        smartthings_device_id: deviceId
      });
      toast.success("POI collegato al dispositivo!");
      if (activeSpace) {
        loadPois(activeSpace.id);
      }
    } catch (error) {
      console.error("Error linking POI to device:", error);
      toast.error("Errore nel collegamento");
    }
  };

  // Unlink POI from SmartThings device
  const unlinkPoiFromDevice = async (poiId) => {
    try {
      await axios.put(`${API_URL}/api/matterport/pois/${poiId}?token=${authToken}`, {
        smartthings_device_id: null
      });
      toast.success("Collegamento rimosso!");
      if (activeSpace) {
        loadPois(activeSpace.id);
      }
    } catch (error) {
      console.error("Error unlinking POI:", error);
      toast.error("Errore nella rimozione del collegamento");
    }
  };

  // Match POI to SmartThings device by name
  const getDeviceForPoi = useCallback((poi) => {
    const poiTitle = poi.translations?.find(t => t.language === "it")?.title?.toLowerCase() || "";
    
    // First check if POI has direct smartthings_device_id
    if (poi.smartthings_device_id) {
      const device = smartThingsDevices.find(d => d.id === poi.smartthings_device_id);
      if (device) return device;
    }
    
    // Fallback: match by name similarity
    const matchedDevice = smartThingsDevices.find(d => {
      const deviceName = d.name?.toLowerCase() || "";
      // Exact match or partial match
      return deviceName === poiTitle || 
             deviceName.includes(poiTitle) || 
             poiTitle.includes(deviceName) ||
             // Handle slight variations like "Luci Pedoni" vs "Luci pedoni"
             deviceName.replace(/\s+/g, '').toLowerCase() === poiTitle.replace(/\s+/g, '').toLowerCase();
    });
    
    return matchedDevice;
  }, [smartThingsDevices]);

  // Get device state for a POI (including sensor values)
  const getDeviceStateForPoi = useCallback((poi) => {
    const device = getDeviceForPoi(poi);
    if (device) {
      const sensors = sensorValues[device.id] || {};
      return {
        device,
        state: deviceStates[device.id] || null,
        hasSwitch: device.capabilities?.includes('switch'),
        sensors: sensors,
        hasTemperature: sensors.temperature !== undefined,
        hasHumidity: sensors.humidity !== undefined,
        hasPower: sensors.power !== undefined,
        hasBattery: sensors.battery !== undefined,
        hasMotion: sensors.motion !== undefined
      };
    }
    return null;
  }, [getDeviceForPoi, deviceStates, sensorValues]);

  useEffect(() => {
    loadSpaces();
    loadSmartThingsDevices();
    loadPoiSensorData();
    
    // Refresh device states and POI sensors every 30 seconds
    const interval = setInterval(() => {
      loadSmartThingsDevices();
      loadPoiSensorData();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadSpaces, loadSmartThingsDevices, loadPoiSensorData]);

  // Update POI sensor overlays when data changes
  useEffect(() => {
    if (Object.keys(poiSensorData).length > 0 && pois.length > 0) {
      updatePoiSensorOverlays();
    }
  }, [poiSensorData, pois, showStatusOverlays]);

  // Load linked appliance when a POI is selected
  const loadLinkedApparato = useCallback(async (poiId) => {
    if (!poiId) {
      setLinkedApparato(null);
      setLiveSensorData(null);
      return;
    }
    setLoadingApparato(true);
    setLoadingLiveSensor(true);
    try {
      const params = authToken ? { token: authToken } : {};
      
      // Load appliance data
      const res = await axios.get(`${API_URL}/api/elettrodomestici/by-poi/${poiId}`, { params });
      setLinkedApparato(res.data);
      
      // Load live sensor data
      const sensorRes = await axios.get(`${API_URL}/api/elettrodomestici/by-poi/${poiId}/live-sensor`, { params });
      setLiveSensorData(sensorRes.data);
    } catch (error) {
      console.log("No linked apparato for POI:", poiId);
      setLinkedApparato(null);
      setLiveSensorData(null);
    } finally {
      setLoadingApparato(false);
      setLoadingLiveSensor(false);
    }
  }, [authToken]);

  // Load linked apparato when selected POI changes
  useEffect(() => {
    if (selectedPoi?.id) {
      loadLinkedApparato(selectedPoi.id);
    } else {
      setLinkedApparato(null);
      setLiveSensorData(null);
    }
  }, [selectedPoi?.id, loadLinkedApparato]);

  // Refresh live sensor data periodically when POI is selected
  useEffect(() => {
    if (!selectedPoi?.id || !liveSensorData?.has_sensor) return;
    
    const refreshInterval = setInterval(async () => {
      try {
        const params = authToken ? { token: authToken } : {};
        const sensorRes = await axios.get(`${API_URL}/api/elettrodomestici/by-poi/${selectedPoi.id}/live-sensor`, { params });
        setLiveSensorData(sensorRes.data);
      } catch (error) {
        console.error("Error refreshing live sensor:", error);
      }
    }, 15000); // Refresh every 15 seconds
    
    return () => clearInterval(refreshInterval);
  }, [selectedPoi?.id, liveSensorData?.has_sensor, authToken]);

  // Handle external navigation to POI (from apparato card)
  useEffect(() => {
    if (!navigateToPoiId || pois.length === 0) return;
    
    // Find the POI to navigate to
    const targetPoi = pois.find(p => p.id === navigateToPoiId);
    if (targetPoi) {
      console.log("Navigating to POI from apparato:", targetPoi.translations?.[0]?.title);
      setSelectedPoi(targetPoi);
      setActiveTab("pois");
      
      // Navigate in the 3D viewer
      handleNavigateToPoi(targetPoi);
      
      // Clear the navigation request
      if (onNavigationComplete) {
        onNavigationComplete();
      }
    } else {
      console.warn("POI not found:", navigateToPoiId);
      toast.error("POI non trovato nel modello 3D");
      if (onNavigationComplete) {
        onNavigationComplete();
      }
    }
  }, [navigateToPoiId, pois, onNavigationComplete]);

  // Create/Update space
  const handleSaveSpace = async () => {
    setLoading(true);
    try {
      if (spaceForm.id) {
        await axios.put(`${API_URL}/api/matterport/spaces/${spaceForm.id}`, spaceForm);
        toast.success("Spazio aggiornato");
      } else {
        await axios.post(`${API_URL}/api/matterport/spaces`, {
          ...spaceForm,
          is_active: spaces.length === 0
        });
        toast.success("Spazio creato");
      }
      setShowSpaceDialog(false);
      setSpaceForm({ name: "", space_id: "", description: "", sdk_key: "" });
      loadSpaces();
    } catch (error) {
      toast.error("Errore nel salvataggio");
    } finally {
      setLoading(false);
    }
  };

  // Activate space
  const handleActivateSpace = async (spaceId) => {
    try {
      await axios.post(`${API_URL}/api/matterport/spaces/${spaceId}/activate`);
      toast.success("Spazio attivato");
      loadSpaces();
    } catch (error) {
      toast.error("Errore nell'attivazione");
    }
  };

  // Delete space
  const handleDeleteSpace = async (spaceId) => {
    if (!window.confirm("Eliminare questo spazio e tutti i POI associati?")) return;
    try {
      await axios.delete(`${API_URL}/api/matterport/spaces/${spaceId}`);
      toast.success("Spazio eliminato");
      loadSpaces();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  // Select space
  const handleSelectSpace = (space) => {
    setActiveSpace(space);
    loadPois(space.id);
    setSelectedPoi(null);
    setLinkedApparato(null);
  };

  // Import tags from Matterport
  const handleImportTags = async () => {
    if (selectedTagsForImport.length === 0) {
      toast.error("Seleziona almeno un tag da importare");
      return;
    }
    
    setIsImporting(true);
    try {
      const tagsToImport = matterportTags.filter(t => 
        selectedTagsForImport.includes(t.sid || t.id)
      );
      
      // Use the real Matterport space_id, not the virtual space ID
      const spaceId = activeSpace.space_id || currentUser?.matterport_space_id || activeSpace.id;
      
      const res = await axios.post(
        `${API_URL}/api/matterport/spaces/${spaceId}/import-tags?token=${authToken}`,
        tagsToImport
      );
      
      toast.success(res.data.message);
      setShowImportDialog(false);
      setSelectedTagsForImport([]);
      loadPois(spaceId);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Errore nell'importazione");
    } finally {
      setIsImporting(false);
    }
  };

  // Create POI at position
  // Helper function to find nearest sweep ID
  const findNearestSweepId = async (position) => {
    if (!matterportRef.current) return null;
    
    const sdk = matterportRef.current.getSdk();
    if (!sdk || !sdk.Sweep || !sdk.Sweep.data) return null;
    
    try {
      // Get all sweeps using subscription
      const sweeps = await new Promise((resolve) => {
        const sweepList = [];
        let resolved = false;
        
        sdk.Sweep.data.subscribe({
          onAdded: (index, item) => {
            sweepList.push(item);
          },
          onCollectionUpdated: (collection) => {
            if (!resolved) {
              resolved = true;
              const arr = [];
              try {
                if (Array.isArray(collection)) {
                  arr.push(...collection);
                } else if (collection && typeof collection[Symbol.iterator] === 'function') {
                  for (const item of collection) {
                    arr.push(item);
                  }
                } else if (collection) {
                  Object.values(collection).forEach(item => {
                    if (item && item.position) arr.push(item);
                  });
                }
              } catch (e) {
                console.log("Collection iteration error:", e);
              }
              resolve(arr.length > 0 ? arr : sweepList);
            }
          }
        });
        
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(sweepList);
          }
        }, 2000);
      });
      
      if (!sweeps || sweeps.length === 0) return null;
      
      // Find nearest sweep
      let nearestSweep = null;
      let minDistance = Infinity;
      
      for (const sweep of sweeps) {
        if (sweep.position) {
          const dx = sweep.position.x - position.x;
          const dy = sweep.position.y - position.y;
          const dz = sweep.position.z - position.z;
          const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (distance < minDistance) {
            minDistance = distance;
            nearestSweep = sweep;
          }
        }
      }
      
      if (nearestSweep) {
        return nearestSweep.sid || nearestSweep.id || nearestSweep.uuid || null;
      }
      return null;
    } catch (error) {
      console.error("Error finding nearest sweep:", error);
      return null;
    }
  };

  const handleCreatePoiAtPosition = async () => {
    if (!poiForm.title || !poiForm.position) {
      toast.error("Inserisci titolo e posizione");
      return;
    }
    
    setLoading(true);
    try {
      // Get icon color for Matterport
      const selectedIcon = POI_ICONS.find(i => i.id === poiForm.icon) || POI_ICONS[0];
      const hexColor = poiForm.color || selectedIcon.color;
      // Convert hex to RGB for Matterport
      const r = parseInt(hexColor.slice(1, 3), 16) / 255;
      const g = parseInt(hexColor.slice(3, 5), 16) / 255;
      const b = parseInt(hexColor.slice(5, 7), 16) / 255;
      
      // Find nearest sweep ID for navigation fallback
      toast.info("Ricerca punto di navigazione più vicino...");
      const nearestSweepId = await findNearestSweepId(poiForm.position);
      
      // Create POI in database - use space_id (Matterport ID) not id (local DB ID)
      const matterportSpaceId = activeSpace?.space_id || activeSpace?.id;
      const response = await axios.post(`${API_URL}/api/matterport/pois?token=${authToken}`, {
        space_id: matterportSpaceId,
        position: poiForm.position,
        nearest_sweep_id: nearestSweepId, // Save sweep ID for navigation
        translations: [{
          language: "it",
          title: poiForm.title,
          description: poiForm.description || ""
        }],
        icon: poiForm.icon,
        color: hexColor,
        is_imported: false,
        is_visible: true,
        category: poiForm.category || "general"
      });
      
      // Add tag to Matterport 3D view
      if (matterportRef.current) {
        const mattertagId = await matterportRef.current.addTag({
          label: poiForm.title,
          description: poiForm.description || "",
          position: poiForm.position,
          color: { r, g, b }
        });
        
        if (mattertagId) {
          // Update POI with the Matterport tag ID
          await axios.put(`${API_URL}/api/matterport/pois/${response.data.id}?token=${authToken}`, {
            matterport_tag_id: mattertagId
          });
        }
      }
      
      toast.success(`POI creato! ${nearestSweepId ? '✓ Navigazione configurata' : '⚠ Navigazione limitata'}`);
      setShowPoiDialog(false);
      setPoiForm({ title: "", description: "", position: null, icon: "mappin", color: "#00BFFF", category: "general" });
      // Reload POIs using the Matterport space_id
      loadPois(activeSpace?.space_id || activeSpace?.id);
    } catch (error) {
      console.error("Error creating POI:", error);
      toast.error("Errore nella creazione del POI");
    } finally {
      setLoading(false);
    }
  };

  // Delete POI
  const handleDeletePoi = async (poi) => {
    if (!window.confirm(`Eliminare il POI "${poi.translations?.[0]?.title || 'POI'}"?`)) return;
    
    try {
      // Remove from Matterport if has tag
      if (poi.matterport_tag_id && matterportRef.current) {
        await matterportRef.current.removeTag(poi.matterport_tag_id);
      }
      
      // Delete from database
      await axios.delete(`${API_URL}/api/matterport/pois/${poi.id}?token=${authToken}`);
      
      toast.success("POI eliminato");
      setSelectedPoi(null);
      loadPois(activeSpace.id);
    } catch (error) {
      console.error("Error deleting POI:", error);
      toast.error("Errore nell'eliminazione del POI");
    }
  };

  // Sync POI to Matterport Cloud
  const handleSyncToCloud = async (poi) => {
    if (!poi) return;
    
    setSyncingToCloud(poi.id);
    try {
      const response = await axios.post(`${API_URL}/api/matterport/cloud/sync-poi/${poi.id}`);
      
      if (response.data.success) {
        toast.success("POI sincronizzato su Matterport Cloud!");
        // Reload POI to get updated synced status
        loadPois(activeSpace.id);
        // Update selected POI if it's the same
        if (selectedPoi?.id === poi.id) {
          const updatedPoi = await axios.get(`${API_URL}/api/matterport/pois/${poi.id}`);
          setSelectedPoi(updatedPoi.data);
        }
      } else {
        toast.error(response.data.error || "Errore nella sincronizzazione");
      }
    } catch (error) {
      console.error("Error syncing to cloud:", error);
      const errorMsg = error.response?.data?.detail || "Errore nella sincronizzazione su Cloud";
      toast.error(errorMsg);
    } finally {
      setSyncingToCloud(null);
    }
  };

  // Edit POI - Open dialog
  const handleEditPoi = (poi) => {
    const itTrans = poi.translations?.find(t => t.language === "it") || {};
    setEditPoiForm({
      id: poi.id,
      title: itTrans.title || "",
      description: itTrans.description || "",
      icon: poi.icon || "mappin",
      color: poi.color || "#00BFFF",
      category: poi.category || "general",
      position: poi.position,
      matterport_tag_id: poi.matterport_tag_id
    });
    setShowEditPoiDialog(true);
  };

  // Save edited POI
  const handleSaveEditPoi = async () => {
    if (!editPoiForm) return;
    
    setLoading(true);
    try {
      // Update translations
      const currentPoi = pois.find(p => p.id === editPoiForm.id);
      const translations = currentPoi?.translations || [];
      
      // Update Italian translation
      const itIndex = translations.findIndex(t => t.language === "it");
      if (itIndex >= 0) {
        translations[itIndex] = {
          ...translations[itIndex],
          title: editPoiForm.title,
          description: editPoiForm.description
        };
      } else {
        translations.push({
          language: "it",
          title: editPoiForm.title,
          description: editPoiForm.description
        });
      }
      
      // Prepare update data
      const updateData = {
        translations,
        icon: editPoiForm.icon,
        color: editPoiForm.color,
        category: editPoiForm.category
      };
      
      // Include position if changed
      if (editPoiForm.position) {
        updateData.position = editPoiForm.position;
      }
      
      await axios.put(`${API_URL}/api/matterport/pois/${editPoiForm.id}?token=${authToken}`, updateData);
      
      // If position changed and POI has a Matterport tag, update it
      if (editPoiForm.position && editPoiForm.matterport_tag_id && matterportRef.current) {
        // Remove old tag and create new one at new position
        try {
          await matterportRef.current.removeTag(editPoiForm.matterport_tag_id);
          
          // Get icon color
          const selectedIcon = POI_ICONS.find(i => i.id === editPoiForm.icon);
          const hexColor = editPoiForm.color || selectedIcon?.color || "#00BFFF";
          const r = parseInt(hexColor.slice(1, 3), 16) / 255;
          const g = parseInt(hexColor.slice(3, 5), 16) / 255;
          const b = parseInt(hexColor.slice(5, 7), 16) / 255;
          
          const newTagId = await matterportRef.current.addTag({
            label: editPoiForm.title,
            description: editPoiForm.description,
            position: editPoiForm.position,
            color: { r, g, b }
          });
          
          if (newTagId) {
            await axios.put(`${API_URL}/api/matterport/pois/${editPoiForm.id}?token=${authToken}`, {
              matterport_tag_id: newTagId
            });
          }
        } catch (tagError) {
          console.error("Error updating Matterport tag:", tagError);
        }
      }
      
      toast.success("POI aggiornato");
      setShowEditPoiDialog(false);
      setEditPoiForm(null);
      
      // Refresh
      const poiRes = await axios.get(`${API_URL}/api/matterport/pois/${editPoiForm.id}?token=${authToken}`);
      setSelectedPoi(poiRes.data);
      loadPois(activeSpace.id);
    } catch (error) {
      console.error("Error updating POI:", error);
      toast.error("Errore nell'aggiornamento del POI");
    } finally {
      setLoading(false);
    }
  };

  // State for tour
  const [isTourRunning, setIsTourRunning] = useState(false);
  const [tourProgress, setTourProgress] = useState({ current: 0, total: 0, name: "" });
  
  // Draw path / Start guided tour through POIs
  const handleDrawPath = async () => {
    if (!matterportRef.current) {
      toast.error("SDK Matterport non connesso");
      return;
    }
    
    const sdk = matterportRef.current.getSdk();
    if (!sdk) {
      toast.error("SDK non disponibile");
      return;
    }
    
    // Get POIs with matterport tags (can navigate to them)
    const navigablePois = pois.filter(p => p.matterport_tag_id);
    
    if (navigablePois.length < 1) {
      toast.warning("Nessun POI navigabile. Importa o aggiungi POI alla vista 3D.");
      return;
    }
    
    if (navigablePois.length < 2) {
      // Just navigate to the single POI
      toast.info("Navigazione verso l'unico POI...");
      handleNavigateToPoi(navigablePois[0]);
      return;
    }
    
    // Start guided tour
    setIsTourRunning(true);
    setTourProgress({ current: 0, total: navigablePois.length, name: "Avvio tour..." });
    
    toast.success(`🎯 Tour guidato: ${navigablePois.length} punti di interesse`, {
      duration: 3000
    });
    
    try {
      for (let i = 0; i < navigablePois.length; i++) {
        const poi = navigablePois[i];
        const poiTitle = poi.translations?.find(t => t.language === "it")?.title || `POI ${i + 1}`;
        
        // Update progress
        setTourProgress({ 
          current: i + 1, 
          total: navigablePois.length, 
          name: poiTitle 
        });
        
        // Navigate to the POI
        try {
          await sdk.Mattertag.navigateToTag(
            poi.matterport_tag_id,
            sdk.Mattertag.Transition.FLY
          );
          
          // Wait at each stop (longer for first and last, shorter for middle)
          const waitTime = (i === 0 || i === navigablePois.length - 1) ? 3000 : 2000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } catch (navError) {
          console.error(`Tour navigation error at POI ${i}:`, navError);
          // Continue to next POI even if one fails
        }
      }
      
      toast.success("✅ Tour completato!", { duration: 3000 });
    } catch (error) {
      console.error("Tour error:", error);
      toast.error("Errore durante il tour");
    } finally {
      setIsTourRunning(false);
      setTourProgress({ current: 0, total: 0, name: "" });
    }
  };
  
  // Stop tour
  const handleStopTour = () => {
    setIsTourRunning(false);
    setTourProgress({ current: 0, total: 0, name: "" });
    toast.info("Tour interrotto");
  };

  // Add custom category
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const newCat = {
      id: newCategoryName.toLowerCase().replace(/\s+/g, "_"),
      name: newCategoryName,
      color: "#6B7280"
    };
    
    setCustomCategories(prev => [...prev, newCat]);
    setNewCategoryName("");
    toast.success("Categoria aggiunta");
  };

  // Get all categories (predefined + custom)
  const getAllCategories = () => {
    return [...POI_CATEGORIES, ...customCategories];
  };

  // Filter POIs by category
  const getFilteredPois = () => {
    if (selectedCategory === "all") return pois;
    return pois.filter(p => p.category === selectedCategory);
  };

  // Group POIs by category
  const getPoisByCategory = () => {
    const grouped = {};
    const allCats = getAllCategories();
    
    // Initialize all categories
    allCats.forEach(cat => {
      grouped[cat.id] = { ...cat, pois: [] };
    });
    grouped["uncategorized"] = { id: "uncategorized", name: "Senza categoria", color: "#6B7280", pois: [] };
    
    // Distribute POIs
    pois.forEach(poi => {
      const catId = poi.category || "uncategorized";
      if (grouped[catId]) {
        grouped[catId].pois.push(poi);
      } else {
        grouped["uncategorized"].pois.push(poi);
      }
    });
    
    // Return only categories with POIs
    return Object.values(grouped).filter(cat => cat.pois.length > 0);
  };

  // Translate POI
  const handleTranslatePoi = async () => {
    if (!selectedPoi || translateLanguages.length === 0) return;
    
    // Find Italian translation
    const itTrans = selectedPoi.translations?.find(t => t.language === "it");
    if (!itTrans) {
      toast.error("Aggiungi prima la traduzione italiana");
      return;
    }
    
    setIsTranslating(true);
    try {
      const res = await axios.post(`${API_URL}/api/matterport/pois/${selectedPoi.id}/translate`, {
        source_language: "it",
        source_text: itTrans.description,
        target_languages: translateLanguages
      });
      
      toast.success(res.data.message);
      setShowTranslateDialog(false);
      
      // Refresh POI
      const poiRes = await axios.get(`${API_URL}/api/matterport/pois/${selectedPoi.id}`);
      setSelectedPoi(poiRes.data);
      loadPois(activeSpace.id);
    } catch (error) {
      toast.error("Errore nella traduzione");
    } finally {
      setIsTranslating(false);
    }
  };

  // Generate audio
  const handleGenerateAudio = async () => {
    if (!selectedPoi || audioLanguages.length === 0) return;
    
    setIsGeneratingAudio(true);
    try {
      const res = await axios.post(`${API_URL}/api/matterport/pois/${selectedPoi.id}/generate-audio`, {
        poi_id: selectedPoi.id,
        languages: audioLanguages,
        voice: selectedVoice,
        model: "tts-1"
      });
      
      toast.success(res.data.message);
      setShowAudioDialog(false);
      
      // Refresh POI
      const poiRes = await axios.get(`${API_URL}/api/matterport/pois/${selectedPoi.id}`);
      setSelectedPoi(poiRes.data);
      loadPois(activeSpace.id);
    } catch (error) {
      toast.error("Errore nella generazione audio");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Upload attachment
  const handleUploadAttachment = async (poiId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      await axios.post(`${API_URL}/api/matterport/pois/${poiId}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("File caricato");
      
      // Refresh POI
      const poiRes = await axios.get(`${API_URL}/api/matterport/pois/${poiId}`);
      setSelectedPoi(poiRes.data);
      loadPois(activeSpace.id);
    } catch (error) {
      toast.error("Errore nel caricamento");
    }
  };

  // Delete attachment
  const handleDeleteAttachment = async (poiId, attachmentId) => {
    try {
      await axios.delete(`${API_URL}/api/matterport/pois/${poiId}/attachments/${attachmentId}`);
      toast.success("Allegato eliminato");
      
      // Refresh POI
      const poiRes = await axios.get(`${API_URL}/api/matterport/pois/${poiId}`);
      setSelectedPoi(poiRes.data);
      loadPois(activeSpace.id);
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  // Navigate to POI in Matterport
  // State for path visualization
  const [pathVisible, setPathVisible] = useState(false);
  
  // Show path with waypoints (Pollicino dots)
  const showPathToSweep = async (sdk, targetSweepId) => {
    try {
      // Get current sweep
      let currentSweepId = null;
      try {
        const currentPose = await sdk.Camera.getPose();
        const sweeps = await new Promise((resolve) => {
          const sweepList = [];
          let resolved = false;
          sdk.Sweep.data.subscribe({
            onAdded: (index, item) => sweepList.push(item),
            onCollectionUpdated: () => {
              if (!resolved) {
                resolved = true;
                resolve(sweepList);
              }
            }
          });
          setTimeout(() => { if (!resolved) { resolved = true; resolve(sweepList); } }, 2000);
        });
        
        // Find current sweep by position
        let minDist = Infinity;
        for (const sweep of sweeps) {
          if (sweep.position && currentPose.position) {
            const dx = sweep.position.x - currentPose.position.x;
            const dy = sweep.position.y - currentPose.position.y;
            const dz = sweep.position.z - currentPose.position.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (dist < minDist) {
              minDist = dist;
              currentSweepId = sweep.sid || sweep.id;
            }
          }
        }
      } catch (e) {
        console.log("Could not get current position:", e);
      }
      
      if (!currentSweepId) {
        console.log("No current sweep found, skipping path visualization");
        return;
      }
      
      // Try to create graph and show path
      if (sdk.Sweep.createGraph) {
        try {
          const graph = await sdk.Sweep.createGraph();
          
          // Find path using A* algorithm if available
          if (graph && sdk.Graph) {
            const path = await sdk.Graph.createAStarRunner(graph, currentSweepId, targetSweepId);
            if (path && path.path) {
              // Enable path visualization in the showcase
              toast.info(`📍 Percorso: ${path.path.length} punti`, { duration: 2000 });
              setPathVisible(true);
            }
          }
        } catch (e) {
          console.log("Graph/Path creation not available:", e);
        }
      }
      
      // Alternative: Show sweep highlights along the way
      try {
        // Enable highlight on target sweep
        if (sdk.Sweep.highlight) {
          await sdk.Sweep.highlight(targetSweepId, true);
        }
      } catch (e) {
        console.log("Sweep highlight not available:", e);
      }
      
    } catch (error) {
      console.error("Path visualization error:", error);
    }
  };

  // Clear navigation path and remove floor markers
  const clearNavigationPath = useCallback(async () => {
    // Remove floor markers from 3D view
    if (matterportRef.current && pathMarkerIds.length > 0) {
      try {
        await matterportRef.current.removePathMarkers(pathMarkerIds);
      } catch (e) {
        console.log("Error removing path markers:", e);
      }
    }
    setPathMarkerIds([]);
    setNavigationPath([]);
    toast.info("Percorso pulito");
  }, [pathMarkerIds]);

  // Helper function to orient camera towards a target position
  const orientCameraToPosition = async (sdk, targetPosition) => {
    try {
      // Get current camera pose
      const pose = await sdk.Camera.getPose();
      const cameraPos = pose.position;
      
      // Calculate direction from camera to target
      const dx = targetPosition.x - cameraPos.x;
      const dy = targetPosition.y - cameraPos.y;
      const dz = targetPosition.z - cameraPos.z;
      
      // Matterport coordinate system: +X is right, +Y is up, +Z is forward (into screen)
      // Yaw: rotation around Y axis. 0° = looking at -Z, 90° = looking at +X
      const yaw = Math.atan2(dx, dz) * (180 / Math.PI);
      
      // Calculate pitch (vertical rotation)
      const horizontalDist = Math.sqrt(dx * dx + dz * dz);
      const pitch = Math.atan2(dy - 1.2, horizontalDist) * (180 / Math.PI); // 1.2m eye level offset
      
      // Clamp pitch to reasonable values
      const clampedPitch = Math.max(-45, Math.min(45, pitch));
      
      console.log(`Orienting camera to POI: yaw=${yaw.toFixed(1)}°, pitch=${clampedPitch.toFixed(1)}°`);
      console.log(`  Camera: (${cameraPos.x.toFixed(2)}, ${cameraPos.y.toFixed(2)}, ${cameraPos.z.toFixed(2)})`);
      console.log(`  Target: (${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})`);
      
      // Set camera rotation with smooth transition
      await sdk.Camera.setRotation(
        { x: clampedPitch, y: yaw },
        { transitionTime: 1000 }
      );
      
      return true;
    } catch (error) {
      console.log("orientCameraToPosition error:", error);
      return false;
    }
  };

  const handleNavigateToPoi = async (poi) => {
    console.log("handleNavigateToPoi called for:", poi.translations?.[0]?.title);
    
    // Add to navigation path
    if (poi.position) {
      const newPoint = { 
        id: `${poi.id}-${Date.now()}`, // Unique ID to avoid duplicates
        name: poi.translations?.[0]?.title || "POI",
        position: poi.position 
      };
      
      // First remove old markers
      if (matterportRef.current && pathMarkerIds.length > 0) {
        try {
          await matterportRef.current.removePathMarkers(pathMarkerIds);
        } catch (e) {
          console.log("Error removing old markers:", e);
        }
      }
      
      setNavigationPath(prev => {
        const newPath = [...prev, newPoint];
        
        // Create new floor markers for the entire path
        if (matterportRef.current) {
          const waypoints = newPath.map(p => p.position);
          matterportRef.current.createPathMarkers(waypoints, {
            color: { r: 1, g: 0.5, b: 0 }, // Orange
            showArrows: true
          }).then(markerIds => {
            setPathMarkerIds(markerIds);
            console.log("Created path markers:", markerIds.length);
          }).catch(e => console.log("Could not create path markers:", e));
        }
        
        return newPath;
      });
    }
    
    if (!matterportRef.current) {
      toast.error("SDK Matterport non connesso");
      console.log("No matterportRef");
      return;
    }
    
    const sdk = matterportRef.current.getSdk();
    if (!sdk) {
      toast.error("SDK non disponibile");
      console.log("No SDK");
      return;
    }
    
    console.log("POI data:", { 
      tag: poi.matterport_tag_id, 
      imported: poi.is_imported, 
      sweep: poi.nearest_sweep_id,
      position: poi.position
    });
    
    toast.info("🗺️ Calcolo percorso...");
    
    // Try navigation with visual path if we have position
    if (poi.position && matterportRef.current.navigateWithPath) {
      try {
        const result = await matterportRef.current.navigateWithPath(
          poi.position,
          { 
            showPath: true, 
            autoNavigate: true,
            pathDuration: 8000 // Path markers visible for 8 seconds
          }
        );
        
        if (result.success) {
          toast.success("✅ Destinazione raggiunta!");
          return;
        }
      } catch (error) {
        console.log("navigateWithPath failed:", error.message);
      }
    }
    
    // Fallback: Try multiple navigation methods in order of preference
    
    // Method 1: Try navigateToTag for imported Matterport tags
    if (poi.matterport_tag_id) {
      try {
        console.log("Trying navigateToTag with:", poi.matterport_tag_id);
        await sdk.Mattertag.navigateToTag(
          poi.matterport_tag_id,
          sdk.Mattertag.Transition.FLY
        );
        toast.success("✅ Destinazione raggiunta!");
        console.log("navigateToTag successful");
        return;
      } catch (error) {
        console.log("navigateToTag failed:", error.message);
        // Continue to next method
      }
    }
    
    // Method 2: Use Sweep.moveTo with nearest_sweep_id
    if (poi.nearest_sweep_id) {
      try {
        console.log("Trying Sweep.moveTo with:", poi.nearest_sweep_id);
        await sdk.Sweep.moveTo(poi.nearest_sweep_id, {
          transition: sdk.Sweep.Transition.FLY,
          transitionTime: 1500
        });
        
        // After moving, orient camera towards the POI
        if (poi.position) {
          try {
            await orientCameraToPosition(sdk, poi.position);
          } catch (e) {
            console.log("Could not orient camera:", e);
          }
        }
        
        toast.success("✅ Destinazione raggiunta!");
        return;
      } catch (error) {
        console.log("Sweep.moveTo failed:", error.message);
      }
    }
    
    // Method 3: Navigate to position using Camera + nearest sweep
    if (poi.position) {
      try {
        console.log("Trying Camera navigation to position:", poi.position);
        
        // Try to move to nearest sweep
        const sweeps = await getSweepsFromSDK(sdk);
        if (sweeps && sweeps.length > 0) {
          let nearestSweep = null;
          let minDistance = Infinity;
          
          for (const sweep of sweeps) {
            if (sweep.position) {
              const dx = sweep.position.x - poi.position.x;
              const dy = sweep.position.y - poi.position.y;
              const dz = sweep.position.z - poi.position.z;
              const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
              if (distance < minDistance) {
                minDistance = distance;
                nearestSweep = sweep;
              }
            }
          }
          
          if (nearestSweep) {
            const sweepId = nearestSweep.sid || nearestSweep.id || nearestSweep.uuid;
            console.log("Found nearest sweep:", sweepId, "at distance:", minDistance);
            
            await sdk.Sweep.moveTo(sweepId, {
              transition: sdk.Sweep.Transition.FLY,
              transitionTime: 1500
            });
            
            // Save for future use
            if (poi.id) {
              try {
                await axios.put(`${API_URL}/api/matterport/pois/${poi.id}?token=${authToken}`, {
                  nearest_sweep_id: sweepId
                });
              } catch (e) {
                console.log("Could not save sweep ID:", e);
              }
            }
            
            // Orient camera towards the POI position
            try {
              await orientCameraToPosition(sdk, poi.position);
            } catch (e) {
              console.log("Could not orient camera:", e);
            }
            
            toast.success("✅ Destinazione raggiunta!");
            return;
          }
        }
        
        toast.warning("Navigazione limitata - muoviti manualmente verso il POI");
        return;
      } catch (error) {
        console.error("Camera navigation error:", error);
      }
    }
    
    toast.error("Impossibile navigare - nessuna posizione disponibile");
  };
  
  // Helper to get sweeps from SDK
  const getSweepsFromSDK = async (sdk) => {
    return new Promise((resolve) => {
      const sweepList = [];
      let resolved = false;
      let timeout = null;
      
      try {
        const sub = sdk.Sweep.data.subscribe({
          onAdded: (index, item) => {
            sweepList.push(item);
          },
          onCollectionUpdated: (collection) => {
            if (!resolved) {
              resolved = true;
              if (timeout) clearTimeout(timeout);
              
              const arr = [];
              try {
                if (Array.isArray(collection)) {
                  arr.push(...collection);
                } else if (collection && typeof collection[Symbol.iterator] === 'function') {
                  for (const item of collection) {
                    arr.push(item);
                  }
                } else if (collection && typeof collection.forEach === 'function') {
                  collection.forEach(item => arr.push(item));
                }
              } catch (e) {
                console.log("Collection iteration error:", e);
              }
              
              resolve(arr.length > 0 ? arr : sweepList);
            }
          }
        });
        
        // Timeout fallback
        timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.log("Sweep subscription timeout, using list:", sweepList.length);
            resolve(sweepList);
          }
        }, 3000);
      } catch (e) {
        console.error("Sweep subscription error:", e);
        resolve([]);
      }
    });
  };

  // Add POI to Matterport 3D view
  const handleAddTagToMatterport = async (poi) => {
    if (!matterportRef.current) {
      toast.error("SDK Matterport non connesso");
      return;
    }
    
    if (!poi.position) {
      toast.error("POI senza coordinate");
      return;
    }
    
    const itTrans = poi.translations?.find(t => t.language === "it") || {};
    
    try {
      const mattertagId = await matterportRef.current.addTag({
        label: itTrans.title || "POI",
        description: itTrans.description || "",
        position: poi.position,
        color: { r: 0, g: 0.8, b: 0.4 } // Verde
      });
      
      if (mattertagId) {
        // Aggiorna il POI nel database con il tag ID
        await axios.put(`${API_URL}/api/matterport/pois/${poi.id}?token=${authToken}`, {
          matterport_tag_id: mattertagId
        });
        
        // Aggiorna il POI selezionato
        const poiRes = await axios.get(`${API_URL}/api/matterport/pois/${poi.id}?token=${authToken}`);
        setSelectedPoi(poiRes.data);
        loadPois(activeSpace.id);
        
        toast.success("POI aggiunto alla vista 3D!");
      }
    } catch (error) {
      console.error("Error adding tag:", error);
      toast.error("Errore nell'aggiunta del tag");
    }
  };

  // Get current position from Matterport
  const handleGetCurrentPosition = async () => {
    if (!matterportRef.current) {
      toast.error("SDK Matterport non connesso");
      return;
    }
    
    try {
      const pos = await matterportRef.current.getCurrentPosition();
      if (pos) {
        setPoiForm(prev => ({
          ...prev,
          position: {
            x: pos.position.x,
            y: pos.position.y,
            z: pos.position.z
          }
        }));
        toast.success("Posizione acquisita!");
      }
    } catch (error) {
      toast.error("Errore nell'acquisizione posizione");
    }
  };

  // Render POI card
  const renderPoiCard = (poi) => {
    const itTrans = poi.translations?.find(t => t.language === "it") || {};
    const hasAudio = poi.translations?.some(t => t.audio_url);
    const translationCount = poi.translations?.length || 0;
    
    // Get icon for this POI
    const poiIcon = POI_ICONS.find(i => i.id === poi.icon) || POI_ICONS.find(i => i.id === "mappin");
    const IconComponent = poiIcon?.icon || MapPin;
    const iconColor = poi.color || poiIcon?.color || "#00BFFF";
    
    return (
      <Card 
        key={poi.id}
        className={`bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition-all cursor-pointer ${
          selectedPoi?.id === poi.id ? 'border-cyan-500 bg-slate-700/50' : ''
        }`}
        onClick={() => setSelectedPoi(poi)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${iconColor}20` }}
              >
                <IconComponent size={16} style={{ color: iconColor }} />
              </div>
              <div>
                <h4 className="font-medium text-white truncate">{itTrans.title || "POI"}</h4>
                {poi.matterport_tag_id && (
                  <span className="text-xs text-green-400">● In 3D</span>
                )}
              </div>
            </div>
            {poi.is_imported && (
              <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-400">
                Importato
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-slate-400 line-clamp-2 mb-3">
            {itTrans.description || "Nessuna descrizione"}
          </p>
          
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Languages size={12} />
              {translationCount} lingue
            </span>
            {hasAudio && (
              <span className="flex items-center gap-1 text-green-400">
                <Volume2 size={12} />
                Audio
              </span>
            )}
            {poi.attachments?.length > 0 && (
              <span className="flex items-center gap-1">
                <FileText size={12} />
                {poi.attachments.length}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-[calc(100vh-140px)] bg-[#09090B] text-white flex flex-col">
      {/* Animation styles for navigation path */}
      <style>{`
        @keyframes slideRight {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes dash {
          to { stroke-dashoffset: -30; }
        }
      `}</style>
      
      {/* Header compatto */}
      <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Box className="text-cyan-400 h-5 w-5" />
          <div>
            <h1 className="text-base font-bold">Spazi 3D & POI</h1>
            {activeSpace && (
              <p className="text-xs text-slate-400">{activeSpace.name}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Path indicator & clear button */}
          {navigationPath.length > 0 && (
            <div className="flex items-center gap-2 mr-2 px-3 py-1 bg-orange-500/20 rounded-full">
              <div className="flex items-center gap-1">
                {navigationPath.map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" style={{animationDelay: `${i * 0.2}s`}} />
                ))}
              </div>
              <span className="text-xs text-orange-300">{navigationPath.length} punti</span>
              <button
                onClick={clearNavigationPath}
                className="text-orange-400 hover:text-orange-300 ml-1"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-cyan-500/50 text-cyan-400 h-8"
            onClick={() => loadSpaces()}
          >
            <RefreshCw size={14} className="mr-1" />
            Aggiorna
          </Button>
          <Button
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700 h-8"
            onClick={() => {
              setSpaceForm({ name: "", space_id: "", description: "", sdk_key: "" });
              setShowSpaceDialog(true);
            }}
          >
            <Plus size={14} className="mr-1" />
            Spazio
          </Button>
        </div>
      </div>

      {/* Main area: Detail Panel + Viewer + Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - POI Details (appears when POI selected) */}
        {selectedPoi && (
          <div className="w-72 border-r border-slate-800 bg-slate-900/95 flex flex-col shrink-0 overflow-hidden">
            <div className="p-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-sm truncate">{selectedPoi.translations?.[0]?.title || "POI"}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPoi(null)}
                className="h-6 w-6 p-0 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Sync Status */}
              <div className="flex items-center gap-2">
                {selectedPoi.synced_to_cloud ? (
                  <Badge className="bg-green-600/20 text-green-400 text-xs">
                    <Cloud size={10} className="mr-1" />Sincronizzato
                  </Badge>
                ) : (
                  <Badge className="bg-slate-600/50 text-slate-300 text-xs">Non sync</Badge>
                )}
                {linkedApparato && (
                  <Badge className="bg-amber-600/20 text-amber-400 text-xs">
                    <Zap size={10} className="mr-1" />Collegato
                  </Badge>
                )}
              </div>
              
              {/* Description */}
              {selectedPoi.translations?.[0]?.description && (
                <p className="text-xs text-slate-400">{selectedPoi.translations?.[0]?.description}</p>
              )}
              
              {/* Linked Apparato Info */}
              {loadingApparato && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 size={12} className="animate-spin" />
                  Caricamento...
                </div>
              )}
              
              {linkedApparato && !loadingApparato && (
                <div className="p-2 bg-slate-800/50 rounded-lg border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    <span className="font-medium text-sm text-amber-300">{linkedApparato.nome}</span>
                  </div>
                  
                  {/* Live Sensor Data */}
                  {liveSensorData?.has_sensor && liveSensorData?.sensor && (
                    <div className="p-2 bg-gradient-to-r from-cyan-900/30 to-emerald-900/30 rounded border border-cyan-500/30 mb-2">
                      <p className="text-xs text-cyan-300 mb-2 font-medium">📡 Dati Live</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {liveSensorData.sensor.power !== null && liveSensorData.sensor.power !== undefined && (
                          <div className="text-center p-2 bg-slate-800/50 rounded">
                            <p className="text-xl font-bold text-yellow-400">{liveSensorData.sensor.power.toFixed(0)}W</p>
                            <p className="text-yellow-600 text-[10px]">Potenza</p>
                          </div>
                        )}
                        {liveSensorData.sensor.temperature !== null && liveSensorData.sensor.temperature !== undefined && (
                          <div className="text-center p-2 bg-slate-800/50 rounded">
                            <p className="text-xl font-bold text-cyan-400">{liveSensorData.sensor.temperature.toFixed(1)}°</p>
                            <p className="text-cyan-600 text-[10px]">Temp</p>
                          </div>
                        )}
                        {liveSensorData.sensor.voltage !== null && liveSensorData.sensor.voltage !== undefined && (
                          <div className="text-center p-2 bg-slate-800/50 rounded">
                            <p className="text-xl font-bold text-blue-400">{liveSensorData.sensor.voltage.toFixed(0)}V</p>
                            <p className="text-blue-600 text-[10px]">Tensione</p>
                          </div>
                        )}
                        {liveSensorData.sensor.current !== null && liveSensorData.sensor.current !== undefined && (
                          <div className="text-center p-2 bg-slate-800/50 rounded">
                            <p className="text-xl font-bold text-green-400">{liveSensorData.sensor.current.toFixed(1)}A</p>
                            <p className="text-green-600 text-[10px]">Corrente</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Switch State */}
                      {liveSensorData.sensor.switch_state && (
                        <div className={`mt-2 text-center py-1 rounded text-xs font-bold ${
                          liveSensorData.sensor.switch_state === 'on' 
                            ? 'bg-red-600/30 text-red-400' 
                            : 'bg-slate-700 text-slate-400'
                        }`}>
                          {liveSensorData.sensor.switch_state === 'on' ? '⚡ ACCESO' : '⚫ SPENTO'}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Apparato Details */}
                  <div className="text-xs text-slate-400 space-y-1">
                    {linkedApparato.marca && <p>Marca: <span className="text-slate-300">{linkedApparato.marca}</span></p>}
                    {linkedApparato.modello && <p>Modello: <span className="text-slate-300">{linkedApparato.modello}</span></p>}
                    {linkedApparato.posizione && <p>Posizione: <span className="text-slate-300">{linkedApparato.posizione}</span></p>}
                  </div>
                </div>
              )}
              
              {/* Category */}
              {selectedPoi.category && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Categoria:</span>
                  <Badge variant="outline" className="text-xs">
                    {getAllCategories().find(c => c.id === selectedPoi.category)?.name || selectedPoi.category}
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="p-3 border-t border-slate-700 space-y-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleNavigateToPoi(selectedPoi)}
                  className="flex-1 h-8 text-xs bg-orange-600 hover:bg-orange-700"
                >
                  <Navigation size={12} className="mr-1" />
                  Vai al POI
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditPoi(selectedPoi)}
                  className="h-8 text-xs"
                >
                  <Edit3 size={12} />
                </Button>
              </div>
              <Button
                size="sm"
                onClick={() => handleSyncToCloud(selectedPoi)}
                disabled={syncingToCloud === selectedPoi.id}
                className={`w-full h-8 text-xs ${selectedPoi.synced_to_cloud ? 'bg-green-600' : 'bg-blue-600'}`}
              >
                {syncingToCloud === selectedPoi.id ? (
                  <><Loader2 size={12} className="mr-1 animate-spin" />Sync...</>
                ) : (
                  <><Cloud size={12} className="mr-1" />{selectedPoi.synced_to_cloud ? 'Risync' : 'Sync Cloud'}</>
                )}
              </Button>
            </div>
          </div>
        )}
        
        {/* Viewer 3D - Main area */}
        <div className="flex-1 relative bg-slate-900">
          {activeSpace ? (
            <>
              <MatterportViewer
                ref={matterportRef}
                spaceId={activeSpace.space_id}
                sdkKey={activeSpace.sdk_key}
                onTagsLoaded={handleMatterportTagsLoaded}
                className="w-full h-full"
              />
              
              {/* Navigation Path Overlay - Animated dots showing the route */}
              {navigationPath.length > 1 && (
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                  {/* Animated path line */}
                  <svg className="absolute inset-0 w-full h-full">
                    <defs>
                      <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#fb923c" stopOpacity="1" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0.8" />
                      </linearGradient>
                    </defs>
                    {/* Animated dashed line connecting points */}
                    <path
                      d={`M ${20} ${50 + navigationPath.length * 5} ${navigationPath.map((_, i) => `L ${20 + (i + 1) * 60} ${50 + (navigationPath.length - i) * 5}`).join(' ')}`}
                      stroke="url(#pathGradient)"
                      strokeWidth="3"
                      strokeDasharray="10,5"
                      fill="none"
                      className="animate-pulse"
                      style={{ strokeDashoffset: '0', animation: 'dash 2s linear infinite' }}
                    />
                  </svg>
                  
                  {/* Path indicator panel */}
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-orange-600/90 to-amber-600/90 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-orange-400/30">
                    <div className="flex items-center gap-3 mb-3">
                      <Navigation className="text-white" size={20} />
                      <span className="text-white font-semibold">Percorso Attivo</span>
                      <button 
                        onClick={clearNavigationPath}
                        className="ml-auto bg-white/20 hover:bg-white/30 rounded-full p-1 pointer-events-auto transition-colors"
                      >
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                    
                    {/* Animated waypoints */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {navigationPath.map((point, i) => (
                        <div key={point.id} className="flex items-center">
                          {/* Animated dot */}
                          <div 
                            className="relative"
                            style={{ animationDelay: `${i * 0.3}s` }}
                          >
                            <div 
                              className="w-4 h-4 rounded-full bg-white shadow-lg animate-bounce"
                              style={{ 
                                animationDelay: `${i * 0.15}s`,
                                animationDuration: '1s'
                              }}
                            />
                            <div 
                              className="absolute inset-0 w-4 h-4 rounded-full bg-white/50 animate-ping"
                              style={{ animationDelay: `${i * 0.15}s` }}
                            />
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-white font-bold bg-orange-800/80 px-1.5 py-0.5 rounded">
                              {i + 1}
                            </span>
                          </div>
                          
                          {/* Connector line between dots */}
                          {i < navigationPath.length - 1 && (
                            <div className="flex items-center mx-1">
                              <div className="w-6 h-0.5 bg-white/40 relative overflow-hidden">
                                <div 
                                  className="absolute inset-y-0 left-0 w-2 bg-white animate-pulse"
                                  style={{ 
                                    animation: 'slideRight 1s ease-in-out infinite',
                                    animationDelay: `${i * 0.2}s`
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Waypoint names */}
                    <div className="mt-3 text-xs text-white/80 max-w-xs">
                      {navigationPath.map((point, i) => (
                        <span key={point.id}>
                          {i > 0 && <span className="text-orange-300"> → </span>}
                          <span className="text-white">{point.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Box size={64} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">Seleziona uno spazio dalla sidebar</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - POI & Spaces */}
        <div className={`${sidebarCollapsed ? 'w-12' : 'w-72'} border-l border-slate-800 bg-slate-900/80 flex flex-col transition-all duration-300`}>
          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 border-b border-slate-800 text-slate-400 hover:text-white flex justify-center"
          >
            {sidebarCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
          
          {!sidebarCollapsed && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full bg-slate-800/50 rounded-none shrink-0">
                <TabsTrigger value="pois" className="flex-1 text-xs">POI ({pois.length})</TabsTrigger>
                <TabsTrigger value="spaces" className="flex-1 text-xs">Spazi ({spaces.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="spaces" className="flex-1 overflow-auto m-0 p-2">
                <div className="space-y-2">
                  {spaces.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">
                      <Box size={32} className="mx-auto mb-2 opacity-50" />
                      <p>Nessuno spazio</p>
                      <Button
                        size="sm"
                        className="mt-2 bg-cyan-600"
                        onClick={() => setShowSpaceDialog(true)}
                      >
                        <Plus size={14} className="mr-1" />
                        Aggiungi
                      </Button>
                    </div>
                  ) : (
                    spaces.map(space => (
                      <div
                        key={space.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          activeSpace?.id === space.id 
                            ? 'bg-cyan-600/30 border border-cyan-500/50' 
                            : 'bg-slate-800/50 border border-slate-700 hover:border-slate-600'
                        }`}
                        onClick={() => handleSelectSpace(space)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{space.name}</h4>
                            <p className="text-xs text-slate-400 truncate">{space.space_id}</p>
                          </div>
                          {activeSpace?.id === space.id && (
                            <Check size={16} className="text-cyan-400 shrink-0" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="pois" className="flex-1 overflow-auto m-0 p-2">
                {/* POI Actions */}
                <div className="flex gap-1 mb-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 h-8 text-xs"
                    onClick={() => setShowPoiDialog(true)}
                    disabled={!activeSpace}
                  >
                    <Plus size={12} className="mr-1" />
                    Nuovo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-purple-500/50 text-purple-400 h-8 text-xs"
                    onClick={() => setShowImportDialog(true)}
                    disabled={!activeSpace || matterportTags.length === 0}
                  >
                    <Download size={12} className="mr-1" />
                    Importa ({matterportTags.length})
                  </Button>
                </div>

                {/* POI List */}
                <div className="space-y-1">
                  {pois.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">
                      <MapPin size={24} className="mx-auto mb-2 opacity-50" />
                      <p>Nessun POI</p>
                    </div>
                  ) : (
                    pois.map(poi => {
                      const itTrans = poi.translations?.find(t => t.language === "it") || {};
                      const isSelected = selectedPoi?.id === poi.id;
                      const category = getAllCategories().find(c => c.id === poi.category);
                      // Get sensor data for this POI
                      const sensorInfo = poiSensorData[poi.id];
                      const hasSmartThingsSensor = poi.smartthings_device_id && sensorValues[poi.smartthings_device_id];
                      
                      return (
                        <div
                          key={poi.id}
                          className={`p-2 rounded cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-cyan-600/30 border border-cyan-500/50' 
                              : 'bg-slate-800/30 border border-transparent hover:bg-slate-800/50'
                          }`}
                          onClick={() => {
                            setSelectedPoi(poi);
                            handleNavigateToPoi(poi);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                              style={{ backgroundColor: category?.color + "30" || "#3B82F630" }}
                            >
                              <MapPin size={12} style={{ color: category?.color || "#3B82F6" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{itTrans.title || "POI"}</p>
                              {/* Sensor status from poiSensorData (linked appliances) */}
                              {sensorInfo && (
                                <div className="flex items-center gap-2 mt-0.5">
                                  {sensorInfo.temperature !== null && sensorInfo.temperature !== undefined && (
                                    <span className="text-[10px] text-cyan-400 flex items-center gap-0.5">
                                      🌡️{Number(sensorInfo.temperature).toFixed(1)}°
                                    </span>
                                  )}
                                  {sensorInfo.power !== null && sensorInfo.power !== undefined && (
                                    <span className={`text-[10px] flex items-center gap-0.5 ${Number(sensorInfo.power) > 0 ? 'text-yellow-400' : 'text-slate-500'}`}>
                                      ⚡{Number(sensorInfo.power).toFixed(0)}W
                                    </span>
                                  )}
                                  {sensorInfo.switch_state && !sensorInfo.power && (
                                    <span className={`text-[10px] ${sensorInfo.switch_state === 'on' ? 'text-red-400' : 'text-slate-500'}`}>
                                      {sensorInfo.switch_state === 'on' ? '🔴 ON' : '⚫ OFF'}
                                    </span>
                                  )}
                                </div>
                              )}
                              {/* Legacy SmartThings sensor values */}
                              {!sensorInfo && hasSmartThingsSensor && (
                                <p className="text-[10px] text-emerald-400">
                                  {sensorValues[poi.smartthings_device_id].temperature?.toFixed(1)}° 
                                  {sensorValues[poi.smartthings_device_id].humidity && ` ${sensorValues[poi.smartthings_device_id].humidity}%`}
                                </p>
                              )}
                            </div>
                            {/* Status indicators */}
                            <div className="flex items-center gap-1 shrink-0">
                              {sensorInfo?.online && (
                                <div className="w-2 h-2 rounded-full bg-green-500" title="Online" />
                              )}
                              {poi.synced_to_cloud && (
                                <Cloud size={10} className="text-green-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>


      {/* Space Dialog */}
      <Dialog open={showSpaceDialog} onOpenChange={setShowSpaceDialog}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">{spaceForm.id ? "Modifica Spazio" : "Nuovo Spazio"}</DialogTitle>
            <DialogDescription className="text-slate-300">
              Configura uno spazio Matterport per gestire i POI
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-white font-medium">Nome Spazio *</Label>
              <Input
                value={spaceForm.name}
                onChange={(e) => setSpaceForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Es: Villa Principale"
                className="bg-slate-700 border-slate-500 text-white placeholder:text-slate-400 mt-1"
              />
            </div>
            <div>
              <Label className="text-white font-medium">Space ID Matterport *</Label>
              <Input
                value={spaceForm.space_id}
                onChange={(e) => setSpaceForm(p => ({ ...p, space_id: e.target.value }))}
                placeholder="Es: j1r4zUjanif"
                className="bg-slate-700 border-slate-500 text-white placeholder:text-slate-400 mt-1"
              />
            </div>
            <div>
              <Label className="text-white font-medium">Descrizione</Label>
              <Textarea
                value={spaceForm.description}
                onChange={(e) => setSpaceForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Descrizione opzionale..."
                className="bg-slate-700 border-slate-500 text-white placeholder:text-slate-400 mt-1"
              />
            </div>
            <div>
              <Label className="text-white font-medium">SDK Key (opzionale)</Label>
              <Input
                value={spaceForm.sdk_key}
                onChange={(e) => setSpaceForm(p => ({ ...p, sdk_key: e.target.value }))}
                placeholder="Usa quella globale se vuoto"
                className="bg-slate-700 border-slate-500 text-white placeholder:text-slate-400 mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowSpaceDialog(false)}
              className="border-slate-500 text-slate-300 hover:bg-slate-700"
            >
              Annulla
            </Button>
            <Button 
              className="bg-cyan-600 hover:bg-cyan-700 text-white" 
              onClick={handleSaveSpace}
              disabled={loading || !spaceForm.name || !spaceForm.space_id}
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Tags Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Importa Tag da Matterport</DialogTitle>
            <DialogDescription className="text-slate-300">
              Seleziona i tag da importare come POI ({matterportTags.length} tag disponibili)
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {matterportTags.map(tag => {
                const tagId = tag.sid || tag.id;
                const isSelected = selectedTagsForImport.includes(tagId);
                
                return (
                  <div
                    key={tagId}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-cyan-500/20 border-cyan-500' 
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                    onClick={() => {
                      setSelectedTagsForImport(prev => 
                        isSelected 
                          ? prev.filter(id => id !== tagId)
                          : [...prev, tagId]
                      );
                    }}
                  >
                    <Checkbox checked={isSelected} className="border-slate-400" />
                    <div className="flex-1">
                      <p className="font-medium text-white">
                        {tag.label || tag.name || `Tag ${tagId}`}
                      </p>
                      <p className="text-sm text-slate-400 line-clamp-1">
                        {tag.description || tag.stemLabel || "Nessuna descrizione"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs border-slate-500 text-slate-300">
                      {tagId.substring(0, 8)}...
                    </Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2 mr-auto">
              <Button
                variant="ghost"
                size="sm"
                className="text-cyan-400 hover:text-cyan-300"
                onClick={() => setSelectedTagsForImport(matterportTags.map(t => t.sid || t.id))}
              >
                Seleziona tutti
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-300"
                onClick={() => setSelectedTagsForImport([])}
              >
                Deseleziona tutti
              </Button>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowImportDialog(false)}
              className="border-slate-500 text-slate-300 hover:bg-slate-700"
            >
              Annulla
            </Button>
            <Button 
              className="bg-cyan-600 hover:bg-cyan-700 text-white" 
              onClick={handleImportTags}
              disabled={isImporting || selectedTagsForImport.length === 0}
            >
              {isImporting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Importa {selectedTagsForImport.length} Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create POI Dialog */}
      <Dialog open={showPoiDialog} onOpenChange={setShowPoiDialog}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Crea Nuovo POI</DialogTitle>
            <DialogDescription className="text-slate-300">
              Acquisisci la posizione dalla vista 3D e personalizza il punto di interesse
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white font-medium">Titolo *</Label>
                <Input
                  value={poiForm.title}
                  onChange={(e) => setPoiForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Nome del punto di interesse"
                  className="bg-slate-700 border-slate-500 text-white placeholder:text-slate-400 mt-1"
                />
              </div>
              <div>
                <Label className="text-white font-medium">Posizione 3D</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant="outline"
                    className="flex-1 border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                    onClick={handleGetCurrentPosition}
                  >
                    <Crosshair size={14} className="mr-1" />
                    Acquisisci
                  </Button>
                </div>
              </div>
            </div>
            
            {poiForm.position && (
              <div className="p-3 bg-green-500/20 border border-green-500/50 rounded text-sm text-green-300">
                <span className="font-medium">✓ Posizione acquisita:</span> X: {poiForm.position.x?.toFixed(2)} | Y: {poiForm.position.y?.toFixed(2)} | Z: {poiForm.position.z?.toFixed(2)}
              </div>
            )}
            
            <div>
              <Label className="text-white font-medium">Descrizione (Italiano)</Label>
              <Textarea
                value={poiForm.description}
                onChange={(e) => setPoiForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Descrizione dettagliata..."
                className="bg-slate-700 border-slate-500 text-white placeholder:text-slate-400 mt-1"
                rows={2}
              />
            </div>
            
            {/* Icon Selection */}
            <div>
              <Label className="text-white font-medium mb-2 block">Icona POI</Label>
              <ScrollArea className="h-[100px] rounded border border-slate-600 p-2">
                <div className="grid grid-cols-7 gap-2">
                  {POI_ICONS.map(iconItem => {
                    const IconComponent = iconItem.icon;
                    const isSelected = poiForm.icon === iconItem.id;
                    return (
                      <button
                        key={iconItem.id}
                        type="button"
                        title={iconItem.name}
                        className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                          isSelected 
                            ? 'bg-cyan-500 ring-2 ring-cyan-400' 
                            : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                        onClick={() => setPoiForm(p => ({ ...p, icon: iconItem.id, color: iconItem.color }))}
                      >
                        <IconComponent size={18} style={{ color: isSelected ? '#fff' : iconItem.color }} />
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
            
            {/* Category Selection */}
            <div>
              <Label className="text-white font-medium">Categoria</Label>
              <Select 
                value={poiForm.category} 
                onValueChange={(val) => setPoiForm(p => ({ ...p, category: val }))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-500 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {getAllCategories().map(cat => (
                    <SelectItem key={cat.id} value={cat.id} className="text-white">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowPoiDialog(false);
                setPoiForm({ title: "", description: "", position: null, icon: "mappin", color: "#00BFFF", category: "general" });
              }}
              className="border-slate-500 text-slate-300 hover:bg-slate-700"
            >
              Annulla
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white" 
              onClick={handleCreatePoiAtPosition}
              disabled={loading || !poiForm.title || !poiForm.position}
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Crea POI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Translate Dialog */}
      <Dialog open={showTranslateDialog} onOpenChange={setShowTranslateDialog}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Traduci POI</DialogTitle>
            <DialogDescription className="text-slate-300">
              Traduci automaticamente la descrizione in altre lingue
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block text-white font-medium">Lingue di destinazione</Label>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.filter(l => l.code !== "it").map(lang => (
                  <div
                    key={lang.code}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      translateLanguages.includes(lang.code)
                        ? 'bg-cyan-500/20 border-cyan-500'
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                    onClick={() => {
                      setTranslateLanguages(prev =>
                        prev.includes(lang.code)
                          ? prev.filter(c => c !== lang.code)
                          : [...prev, lang.code]
                      );
                    }}
                  >
                    <Checkbox checked={translateLanguages.includes(lang.code)} className="border-slate-400" />
                    <span className="text-white">{lang.flag} {lang.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowTranslateDialog(false)}
              className="border-slate-500 text-slate-300 hover:bg-slate-700"
            >
              Annulla
            </Button>
            <Button 
              className="bg-cyan-600 hover:bg-cyan-700 text-white" 
              onClick={handleTranslatePoi}
              disabled={isTranslating || translateLanguages.length === 0}
            >
              {isTranslating ? <Loader2 className="animate-spin mr-2" size={16} /> : <Languages size={16} className="mr-2" />}
              Traduci
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audio Generation Dialog */}
      <Dialog open={showAudioDialog} onOpenChange={setShowAudioDialog}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Genera Audio Guide</DialogTitle>
            <DialogDescription className="text-slate-300">
              Crea file audio dalle descrizioni tradotte
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block text-white font-medium">Voce</Label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger className="bg-slate-700 border-slate-500 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {TTS_VOICES.map(v => (
                    <SelectItem key={v.id} value={v.id} className="text-white hover:bg-slate-600">{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="mb-2 block text-white font-medium">Lingue</Label>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map(lang => {
                  const hasTrans = selectedPoi?.translations?.find(t => t.language === lang.code);
                  return (
                    <div
                      key={lang.code}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        !hasTrans ? 'opacity-50 cursor-not-allowed bg-slate-900/50 border-slate-700' :
                        audioLanguages.includes(lang.code)
                          ? 'bg-green-500/20 border-green-500'
                          : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                      }`}
                      onClick={() => {
                        if (!hasTrans) return;
                        setAudioLanguages(prev =>
                          prev.includes(lang.code)
                            ? prev.filter(c => c !== lang.code)
                            : [...prev, lang.code]
                        );
                      }}
                    >
                      <Checkbox 
                        checked={audioLanguages.includes(lang.code)} 
                        disabled={!hasTrans}
                        className="border-slate-400"
                      />
                      <span className="text-white">{lang.flag} {lang.name}</span>
                      {!hasTrans && <span className="text-xs text-red-400">(manca traduzione)</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowAudioDialog(false)}
              className="border-slate-500 text-slate-300 hover:bg-slate-700"
            >
              Annulla
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white" 
              onClick={handleGenerateAudio}
              disabled={isGeneratingAudio || audioLanguages.length === 0}
            >
              {isGeneratingAudio ? <Loader2 className="animate-spin mr-2" size={16} /> : <Mic size={16} className="mr-2" />}
              Genera Audio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit POI Dialog */}
      <Dialog open={showEditPoiDialog} onOpenChange={setShowEditPoiDialog}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Modifica POI</DialogTitle>
          </DialogHeader>
          
          {editPoiForm && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white font-medium">Titolo</Label>
                  <Input
                    value={editPoiForm.title}
                    onChange={(e) => setEditPoiForm(p => ({ ...p, title: e.target.value }))}
                    className="bg-slate-700 border-slate-500 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-white font-medium">Categoria</Label>
                  <Select 
                    value={editPoiForm.category} 
                    onValueChange={(val) => setEditPoiForm(p => ({ ...p, category: val }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-500 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {getAllCategories().map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="text-white">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label className="text-white font-medium">Descrizione</Label>
                <Textarea
                  value={editPoiForm.description}
                  onChange={(e) => setEditPoiForm(p => ({ ...p, description: e.target.value }))}
                  className="bg-slate-700 border-slate-500 text-white mt-1"
                  rows={2}
                />
              </div>
              
              {/* Position Section */}
              <div>
                <Label className="text-white font-medium">Posizione 3D</Label>
                <div className="mt-2 space-y-2">
                  {editPoiForm.position ? (
                    <div className="p-3 bg-slate-700 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-300">
                          <span className="text-cyan-400">X:</span> {editPoiForm.position.x?.toFixed(2)} | 
                          <span className="text-green-400 ml-2">Y:</span> {editPoiForm.position.y?.toFixed(2)} | 
                          <span className="text-yellow-400 ml-2">Z:</span> {editPoiForm.position.z?.toFixed(2)}
                        </div>
                        {editPoiForm.matterport_tag_id && (
                          <Badge className="bg-green-500/20 text-green-400 text-xs">
                            In 3D
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-700/50 rounded-lg text-sm text-slate-400">
                      Nessuna posizione definita
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                    onClick={async () => {
                      if (!matterportRef.current) {
                        toast.error("SDK Matterport non connesso");
                        return;
                      }
                      try {
                        const pos = await matterportRef.current.getCurrentPosition();
                        if (pos && pos.position) {
                          setEditPoiForm(p => ({
                            ...p,
                            position: {
                              x: pos.position.x,
                              y: pos.position.y,
                              z: pos.position.z
                            }
                          }));
                          toast.success("Nuova posizione acquisita!");
                        }
                      } catch (error) {
                        toast.error("Errore acquisizione posizione");
                      }
                    }}
                  >
                    <Crosshair size={14} className="mr-2" />
                    Acquisisci nuova posizione dalla vista
                  </Button>
                </div>
              </div>
              
              <div>
                <Label className="text-white font-medium mb-2 block">Icona</Label>
                <ScrollArea className="h-[80px]">
                  <div className="grid grid-cols-7 gap-2">
                    {POI_ICONS.map(iconItem => {
                      const IconComponent = iconItem.icon;
                      const isSelected = editPoiForm.icon === iconItem.id;
                      return (
                        <button
                          key={iconItem.id}
                          type="button"
                          title={iconItem.name}
                          className={`p-2 rounded-lg ${isSelected ? 'bg-cyan-500' : 'bg-slate-700 hover:bg-slate-600'}`}
                          onClick={() => setEditPoiForm(p => ({ ...p, icon: iconItem.id, color: iconItem.color }))}
                        >
                          <IconComponent size={16} style={{ color: isSelected ? '#fff' : iconItem.color }} />
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditPoiDialog(false)} className="border-slate-500 text-slate-300">
              Annulla
            </Button>
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={handleSaveEditPoi} disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Nuova Categoria</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-white font-medium">Nome Categoria</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Es: Sensori, Elettronica..."
                className="bg-slate-700 border-slate-500 text-white mt-1"
              />
            </div>
            
            <div>
              <Label className="text-white font-medium mb-2 block">Categorie esistenti</Label>
              <div className="flex flex-wrap gap-2">
                {getAllCategories().map(cat => (
                  <Badge key={cat.id} style={{ backgroundColor: cat.color + "30", borderColor: cat.color }}>
                    {cat.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)} className="border-slate-500 text-slate-300">
              Chiudi
            </Button>
            <Button 
              className="bg-purple-600 hover:bg-purple-700 text-white" 
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
            >
              Aggiungi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link POI to SmartThings Device Dialog */}
      <Dialog open={showLinkDeviceDialog} onOpenChange={setShowLinkDeviceDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Link size={18} className="text-cyan-400" />
              Collega a SmartThings
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedPoi && (
                <>Collega &quot;{selectedPoi.translations?.find(t => t.language === "it")?.title}&quot; a un dispositivo SmartThings</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current link status */}
            {selectedPoi?.smartthings_device_id && (
              <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-300 text-sm font-medium">Attualmente collegato a:</p>
                    <p className="text-white">
                      {smartThingsDevices.find(d => d.id === selectedPoi.smartthings_device_id)?.name || "Dispositivo sconosciuto"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                    onClick={() => {
                      unlinkPoiFromDevice(selectedPoi.id);
                      setShowLinkDeviceDialog(false);
                    }}
                  >
                    <Unlink size={14} className="mr-1" />
                    Scollega
                  </Button>
                </div>
              </div>
            )}
            
            {/* Device list */}
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Seleziona dispositivo:</label>
              <ScrollArea className="h-[300px] border border-slate-700 rounded-lg">
                <div className="p-2 space-y-1">
                  {smartThingsDevices.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                      <Loader2 className="animate-spin mx-auto mb-2" />
                      Caricamento dispositivi...
                    </div>
                  ) : (
                    smartThingsDevices
                      .filter(d => d.capabilities?.includes('switch'))
                      .map(device => {
                        const isLinked = selectedPoi?.smartthings_device_id === device.id;
                        const state = deviceStates[device.id];
                        
                        return (
                          <div
                            key={device.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              isLinked 
                                ? 'bg-cyan-500/20 border border-cyan-500' 
                                : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
                            }`}
                            onClick={() => {
                              if (!isLinked && selectedPoi) {
                                linkPoiToDevice(selectedPoi.id, device.id);
                                setShowLinkDeviceDialog(false);
                              }
                            }}
                          >
                            {/* LED status */}
                            <div className={`w-3 h-3 rounded-full ${
                              state === 'on' 
                                ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]' 
                                : 'bg-slate-600'
                            }`} />
                            
                            {/* Device icon */}
                            <Lightbulb size={16} className={state === 'on' ? 'text-yellow-400' : 'text-slate-400'} />
                            
                            {/* Device name */}
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">{device.name}</p>
                              <p className="text-slate-400 text-xs">{device.type}</p>
                            </div>
                            
                            {/* Status */}
                            <span className={`text-xs px-2 py-1 rounded ${
                              state === 'on' 
                                ? 'bg-red-500/30 text-red-300' 
                                : 'bg-slate-600/50 text-slate-400'
                            }`}>
                              {state === 'on' ? 'ON' : 'OFF'}
                            </span>
                            
                            {/* Link indicator */}
                            {isLinked && (
                              <Check size={16} className="text-cyan-400" />
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => setShowLinkDeviceDialog(false)}
            >
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apparato Details Dialog */}
      <Dialog open={showApparatoDialog} onOpenChange={setShowApparatoDialog}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              {linkedApparato?.nome || "Dettagli Apparato"}
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Apparato collegato al POI: {selectedPoi?.translations?.[0]?.title}
            </DialogDescription>
          </DialogHeader>
          
          {linkedApparato && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Marca</label>
                  <p className="text-white font-medium">{linkedApparato.marca || "-"}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Modello</label>
                  <p className="text-white font-medium">{linkedApparato.modello || "-"}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Numero Serie</label>
                  <p className="text-white font-medium">{linkedApparato.numero_serie || "-"}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Posizione</label>
                  <p className="text-white font-medium">{linkedApparato.posizione || "-"}</p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Data Acquisto</label>
                  <p className="text-white font-medium">
                    {linkedApparato.data_acquisto ? new Date(linkedApparato.data_acquisto).toLocaleDateString('it-IT') : "-"}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Scadenza Garanzia</label>
                  <p className={`font-medium ${linkedApparato.data_scadenza_garanzia && new Date(linkedApparato.data_scadenza_garanzia) > new Date() ? 'text-green-400' : 'text-red-400'}`}>
                    {linkedApparato.data_scadenza_garanzia ? new Date(linkedApparato.data_scadenza_garanzia).toLocaleDateString('it-IT') : "-"}
                  </p>
                </div>
              </div>

              {/* Energy */}
              {linkedApparato.consumo_orario_kw > 0 && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Potenza</label>
                    <p className="text-green-400 font-medium">{Math.round(linkedApparato.consumo_orario_kw * 1000)}W</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Uso Giornaliero</label>
                    <p className="text-white font-medium">{linkedApparato.ore_uso_giornaliero_stimate || 0}h</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Consumo Mensile</label>
                    <p className="text-amber-400 font-medium">
                      {((linkedApparato.consumo_orario_kw || 0) * (linkedApparato.ore_uso_giornaliero_stimate || 0) * 30).toFixed(1)} kWh
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {linkedApparato.note && (
                <div className="pt-4 border-t border-slate-700">
                  <label className="text-xs text-slate-400">Note</label>
                  <p className="text-white mt-1">{linkedApparato.note}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              className="border-slate-600 text-slate-300"
              onClick={() => setShowApparatoDialog(false)}
            >
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
