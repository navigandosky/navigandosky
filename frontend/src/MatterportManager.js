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
  Mail
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

export default function MatterportManager() {
  // State
  const [spaces, setSpaces] = useState([]);
  const [activeSpace, setActiveSpace] = useState(null);
  const [pois, setPois] = useState([]);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [matterportTags, setMatterportTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("spaces");
  
  // Dialogs
  const [showSpaceDialog, setShowSpaceDialog] = useState(false);
  const [showPoiDialog, setShowPoiDialog] = useState(false);
  const [showEditPoiDialog, setShowEditPoiDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showTranslateDialog, setShowTranslateDialog] = useState(false);
  const [showAudioDialog, setShowAudioDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  
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
      setSpaces(res.data);
      
      // Set active space
      const active = res.data.find(s => s.is_active);
      if (active) {
        setActiveSpace(active);
        loadPois(active.id);
      }
    } catch (error) {
      console.error("Error loading spaces:", error);
    }
  }, []);

  // Load POIs for a space
  const loadPois = useCallback(async (spaceId) => {
    try {
      const res = await axios.get(`${API_URL}/api/matterport/pois?space_id=${spaceId}`);
      setPois(res.data);
    } catch (error) {
      console.error("Error loading POIs:", error);
    }
  }, []);

  useEffect(() => {
    loadSpaces();
  }, [loadSpaces]);

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
      
      const res = await axios.post(
        `${API_URL}/api/matterport/spaces/${activeSpace.id}/import-tags`,
        tagsToImport
      );
      
      toast.success(res.data.message);
      setShowImportDialog(false);
      setSelectedTagsForImport([]);
      loadPois(activeSpace.id);
    } catch (error) {
      toast.error("Errore nell'importazione");
    } finally {
      setIsImporting(false);
    }
  };

  // Create POI at position
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
      
      // Create POI in database
      const response = await axios.post(`${API_URL}/api/matterport/pois`, {
        space_id: activeSpace?.id || activeSpace?.space_id,
        position: poiForm.position,
        translations: [{
          language: "it",
          title: poiForm.title,
          description: poiForm.description || ""
        }],
        icon: poiForm.icon,
        color: hexColor,
        is_imported: false,
        is_visible: true
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
          await axios.put(`${API_URL}/api/matterport/pois/${response.data.id}`, {
            matterport_tag_id: mattertagId
          });
        }
      }
      
      toast.success("POI creato e aggiunto alla vista 3D!");
      setShowPoiDialog(false);
      setPoiForm({ title: "", description: "", position: null, icon: "mappin", color: "#00BFFF", category: "general" });
      loadPois(activeSpace.id);
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
      await axios.delete(`${API_URL}/api/matterport/pois/${poi.id}`);
      
      toast.success("POI eliminato");
      setSelectedPoi(null);
      loadPois(activeSpace.id);
    } catch (error) {
      console.error("Error deleting POI:", error);
      toast.error("Errore nell'eliminazione del POI");
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
      
      await axios.put(`${API_URL}/api/matterport/pois/${editPoiForm.id}`, updateData);
      
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
            await axios.put(`${API_URL}/api/matterport/pois/${editPoiForm.id}`, {
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
      const poiRes = await axios.get(`${API_URL}/api/matterport/pois/${editPoiForm.id}`);
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
  const handleNavigateToPoi = async (poi) => {
    if (!matterportRef.current) {
      toast.error("SDK Matterport non connesso");
      return;
    }
    
    const sdk = matterportRef.current.getSdk();
    if (!sdk) {
      toast.error("SDK non disponibile");
      return;
    }
    
    // Helper function to navigate by coordinates using sweep nearest to position
    const navigateByPosition = async (position) => {
      try {
        // Get all sweeps using subscription
        const sweeps = await new Promise((resolve) => {
          const sweepList = [];
          let resolved = false;
          
          const sub = sdk.Sweep.data.subscribe({
            onAdded: (index, item) => {
              sweepList.push(item);
            },
            onCollectionUpdated: (collection) => {
              if (!resolved) {
                resolved = true;
                // Convert collection to array
                const arr = [];
                collection.forEach(item => arr.push(item));
                resolve(arr.length > 0 ? arr : sweepList);
              }
            }
          });
          
          // Timeout fallback
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve(sweepList);
            }
          }, 2000);
        });
        
        if (!sweeps || sweeps.length === 0) {
          toast.warning("Navigazione limitata - prova a muoverti manualmente verso il POI");
          return false;
        }
        
        // Find nearest sweep to the POI position
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
          const sweepId = nearestSweep.sid || nearestSweep.id || nearestSweep.uuid;
          if (sweepId) {
            await sdk.Sweep.moveTo(sweepId, {
              transition: sdk.Sweep.Transition.FLY,
              transitionTime: 1500
            });
            toast.success(`Navigazione completata (distanza: ${minDistance.toFixed(1)}m)`);
            return true;
          }
        }
        
        toast.warning("Nessun punto di vista trovato vicino al POI");
        return false;
      } catch (error) {
        console.error("Navigation by position error:", error);
        toast.error("Errore nella navigazione");
        return false;
      }
    };
    
    // Check if POI has a native Matterport tag ID (imported from model)
    // Tags created with Mattertag.add() are temporary and may not be navigable
    if (poi.matterport_tag_id && poi.is_imported) {
      toast.info("Navigazione verso il POI...");
      try {
        await sdk.Mattertag.navigateToTag(
          poi.matterport_tag_id,
          sdk.Mattertag.Transition.FLY
        );
        toast.success("Navigazione completata!");
        return;
      } catch (error) {
        console.error("Mattertag navigation error:", error);
        // Fallback to position navigation
        if (poi.position) {
          toast.info("Navigazione per coordinate...");
          await navigateByPosition(poi.position);
          return;
        }
      }
    }
    
    // For manually created POIs or fallback, navigate by position
    if (poi.position) {
      toast.info("Navigazione verso il POI...");
      await navigateByPosition(poi.position);
    } else {
      toast.warning("POI senza posizione definita");
    }
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
        await axios.put(`${API_URL}/api/matterport/pois/${poi.id}`, {
          matterport_tag_id: mattertagId
        });
        
        // Aggiorna il POI selezionato
        const poiRes = await axios.get(`${API_URL}/api/matterport/pois/${poi.id}`);
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
    <div className="min-h-screen bg-[#09090B] text-white p-4 lg:p-6">
      <div className="max-w-full mx-auto lg:px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Box className="text-cyan-400" />
              Gestione Spazi 3D & POI
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Importa, crea e gestisci i Point of Interest nei tuoi spazi Matterport
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-cyan-500/50 text-cyan-400"
              onClick={() => loadSpaces()}
            >
              <RefreshCw size={16} className="mr-2" />
              Aggiorna
            </Button>
            <Button
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={() => {
                setSpaceForm({ name: "", space_id: "", description: "", sdk_key: "" });
                setShowSpaceDialog(true);
              }}
            >
              <Plus size={16} className="mr-2" />
              Nuovo Spazio
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left Panel - POI List (Compact View) */}
          <div className="lg:col-span-2 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full bg-slate-800">
                <TabsTrigger value="pois" className="flex-1">POI</TabsTrigger>
                <TabsTrigger value="spaces" className="flex-1">Spazi</TabsTrigger>
              </TabsList>

              <TabsContent value="spaces" className="mt-4">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {spaces.length === 0 ? (
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-6 text-center">
                          <Box size={48} className="mx-auto text-slate-600 mb-4" />
                          <p className="text-slate-400">Nessuno spazio configurato</p>
                          <Button
                            className="mt-4 bg-cyan-600"
                            onClick={() => setShowSpaceDialog(true)}
                          >
                            <Plus size={16} className="mr-2" />
                            Aggiungi Spazio
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      spaces.map(space => (
                        <Card 
                          key={space.id}
                          className={`bg-slate-800/50 border-slate-700 ${
                            space.is_active ? 'border-green-500/50' : ''
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-white flex items-center gap-2">
                                  {space.name}
                                  {space.is_active && (
                                    <Badge className="bg-green-500 text-xs">Attivo</Badge>
                                  )}
                                </h4>
                                <p className="text-xs text-slate-500">{space.space_id}</p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setSpaceForm(space);
                                    setShowSpaceDialog(true);
                                  }}
                                >
                                  <Edit size={14} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-red-400"
                                  onClick={() => handleDeleteSpace(space.id)}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>
                            
                            <p className="text-sm text-slate-400 mb-3">
                              {space.description || "Nessuna descrizione"}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">
                                {space.poi_count || 0} POI
                              </span>
                              {!space.is_active && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() => handleActivateSpace(space.id)}
                                >
                                  Attiva
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="pois" className="mt-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-500/50 text-blue-400 text-xs"
                    onClick={() => {
                      if (matterportTags.length > 0) {
                        setShowImportDialog(true);
                      } else {
                        toast.info("Carica prima i tag dallo spazio Matterport");
                      }
                    }}
                  >
                    <Download size={12} className="mr-1" />
                    Importa
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-500/50 text-green-400 text-xs"
                    onClick={() => setShowPoiDialog(true)}
                  >
                    <Plus size={12} className="mr-1" />
                    Nuovo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-purple-500/50 text-purple-400 text-xs"
                    onClick={() => setShowCategoryDialog(true)}
                  >
                    <Plus size={12} className="mr-1" />
                    Categoria
                  </Button>
                </div>
                
                {/* Category Filter */}
                <div className="mb-3">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-8 text-xs">
                      <SelectValue placeholder="Filtra categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="all" className="text-white text-xs">Tutte le categorie</SelectItem>
                      {getAllCategories().map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="text-white text-xs">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Compact POI List with Numbers */}
                <ScrollArea className="h-[450px]">
                  <div className="space-y-1">
                    {getFilteredPois().length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-sm">
                        Nessun POI
                      </div>
                    ) : (
                      getFilteredPois().map((poi, index) => {
                        const itTrans = poi.translations?.find(t => t.language === "it") || {};
                        const poiIcon = POI_ICONS.find(i => i.id === poi.icon) || POI_ICONS.find(i => i.id === "mappin");
                        const IconComponent = poiIcon?.icon || MapPin;
                        const isSelected = selectedPoi?.id === poi.id;
                        
                        return (
                          <div
                            key={poi.id}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-cyan-500/20 border border-cyan-500' 
                                : 'bg-slate-800/50 hover:bg-slate-700/50 border border-transparent'
                            }`}
                            onClick={() => setSelectedPoi(poi)}
                          >
                            {/* Number */}
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isSelected ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300'
                            }`}>
                              {index + 1}
                            </div>
                            
                            {/* Icon */}
                            <IconComponent size={14} style={{ color: poi.color || poiIcon?.color }} />
                            
                            {/* Name */}
                            <span className={`flex-1 text-sm truncate ${isSelected ? 'text-white font-medium' : 'text-slate-300'}`}>
                              {itTrans.title || "POI"}
                            </span>
                            
                            {/* Status indicators */}
                            <div className="flex items-center gap-1">
                              {poi.matterport_tag_id && (
                                <span className="w-2 h-2 rounded-full bg-green-500" title="In 3D" />
                              )}
                              {poi.translations?.some(t => t.audio_url) && (
                                <Volume2 size={10} className="text-purple-400" />
                              )}
                            </div>
                            
                            {/* Quick navigate button */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-cyan-400 hover:bg-cyan-500/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNavigateToPoi(poi);
                              }}
                              title="Vai al POI"
                            >
                              <Navigation size={12} />
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
                
                {/* Tour / Path Button */}
                {pois.length >= 1 && (
                  <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                    {isTourRunning ? (
                      <>
                        {/* Tour Progress */}
                        <div className="bg-cyan-500/20 border border-cyan-500/50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-cyan-300 font-medium">
                              🎯 Tour in corso...
                            </span>
                            <span className="text-xs text-cyan-400">
                              {tourProgress.current}/{tourProgress.total}
                            </span>
                          </div>
                          <div className="text-white text-sm truncate mb-2">
                            {tourProgress.name}
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${(tourProgress.current / tourProgress.total) * 100}%` }}
                            />
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20"
                          onClick={handleStopTour}
                        >
                          <X size={14} className="mr-2" />
                          Interrompi Tour
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                        onClick={handleDrawPath}
                        disabled={pois.filter(p => p.matterport_tag_id).length < 1}
                      >
                        <Navigation size={14} className="mr-2" />
                        {pois.filter(p => p.matterport_tag_id).length >= 2 
                          ? `🚀 Tour Guidato (${pois.filter(p => p.matterport_tag_id).length} POI)` 
                          : pois.filter(p => p.matterport_tag_id).length === 1
                            ? "Vai al POI"
                            : "Nessun POI navigabile"
                        }
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Center - Matterport Viewer */}
          <div className="lg:col-span-3 space-y-4">
            {activeSpace ? (
              <MatterportViewer
                ref={matterportRef}
                spaceId={activeSpace.space_id}
                onSdkReady={(sdk) => {
                  console.log("SDK Ready in Manager");
                }}
                onTagsLoaded={(tags) => {
                  setMatterportTags(tags);
                  toast.info(`${tags.length} tag trovati nello spazio`);
                }}
                className="rounded-xl"
              />
            ) : (
              <Card className="bg-slate-800/50 border-slate-700 aspect-video">
                <CardContent className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Box size={64} className="mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400">Seleziona o crea uno spazio per visualizzarlo</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selected POI Details */}
            {selectedPoi && (
              <Card className="bg-slate-800 border-slate-600">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-white">
                      {selectedPoi.translations?.find(t => t.language === "it")?.title || "POI"}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-yellow-400 hover:bg-slate-700"
                        onClick={() => handleEditPoi(selectedPoi)}
                        title="Modifica"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-400 hover:bg-slate-700"
                        onClick={() => handleDeletePoi(selectedPoi)}
                        title="Elimina"
                      >
                        <Trash2 size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:bg-slate-700"
                        onClick={() => setSelectedPoi(null)}
                        title="Chiudi"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                  {/* Category badge */}
                  {selectedPoi.category && (
                    <Badge 
                      className="mt-1 text-xs"
                      style={{ backgroundColor: getAllCategories().find(c => c.id === selectedPoi.category)?.color + "30" }}
                    >
                      {getAllCategories().find(c => c.id === selectedPoi.category)?.name || "Generale"}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Translations */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-white font-medium">Traduzioni</Label>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => setShowTranslateDialog(true)}
                        >
                          <Languages size={14} className="mr-1" />
                          Traduci
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {LANGUAGES.map(lang => {
                          const trans = selectedPoi.translations?.find(t => t.language === lang.code);
                          return (
                            <Badge
                              key={lang.code}
                              variant={trans ? "default" : "outline"}
                              className={trans ? "bg-green-600 text-white border-green-500" : "text-slate-400 border-slate-500"}
                            >
                              {lang.flag} {lang.name}
                              {trans?.audio_url && <Volume2 size={10} className="ml-1" />}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    {/* Audio Generation */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-white font-medium">Audio Guide</Label>
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => setShowAudioDialog(true)}
                        >
                          <Mic size={14} className="mr-1" />
                          Genera Audio
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedPoi.translations?.filter(t => t.audio_url).map(trans => (
                          <div key={trans.language} className="flex items-center gap-2 bg-slate-700 rounded-lg p-2">
                            <span className="text-xs text-white">{LANGUAGES.find(l => l.code === trans.language)?.flag}</span>
                            <audio
                              controls
                              className="h-8"
                              src={`${API_URL}${trans.audio_url}`}
                            >
                              <track kind="captions" />
                            </audio>
                          </div>
                        ))}
                        {selectedPoi.translations?.filter(t => t.audio_url).length === 0 && (
                          <p className="text-sm text-slate-400">Nessun audio generato</p>
                        )}
                      </div>
                    </div>

                    {/* Attachments */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-white font-medium">Allegati</Label>
                        <label>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleUploadAttachment(selectedPoi.id, e.target.files[0]);
                              }
                            }}
                          />
                          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white cursor-pointer" asChild>
                            <span>
                              <Upload size={14} className="mr-1" />
                              Carica File
                            </span>
                          </Button>
                        </label>
                      </div>
                      <div className="space-y-2">
                        {selectedPoi.attachments?.length === 0 ? (
                          <p className="text-sm text-slate-400">Nessun allegato</p>
                        ) : (
                          selectedPoi.attachments?.map(att => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between bg-slate-700 rounded-lg p-2"
                            >
                              <div className="flex items-center gap-2">
                                {att.file_type === "pdf" && <FileText size={16} className="text-red-400" />}
                                {att.file_type === "image" && <Image size={16} className="text-blue-400" />}
                                {att.file_type === "video" && <Video size={16} className="text-purple-400" />}
                                <span className="text-sm text-white truncate max-w-[200px]">
                                  {att.original_name}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-cyan-400 hover:bg-slate-600"
                                  onClick={() => window.open(`${API_URL}${att.file_url}`, "_blank")}
                                >
                                  <Eye size={12} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-red-400 hover:bg-slate-600"
                                  onClick={() => handleDeleteAttachment(selectedPoi.id, att.id)}
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Navigation Actions */}
                    <div className="space-y-2 pt-2 border-t border-slate-600">
                      <Label className="text-white font-medium">Navigazione 3D</Label>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                          onClick={() => handleNavigateToPoi(selectedPoi)}
                        >
                          <Navigation size={14} className="mr-1" />
                          Vai al POI
                        </Button>
                        {!selectedPoi.matterport_tag_id && selectedPoi.position && (
                          <Button
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleAddTagToMatterport(selectedPoi)}
                          >
                            <MapPin size={14} className="mr-1" />
                            Aggiungi a 3D
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
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
    </div>
  );
}
