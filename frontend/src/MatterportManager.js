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
  Mic
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showTranslateDialog, setShowTranslateDialog] = useState(false);
  const [showAudioDialog, setShowAudioDialog] = useState(false);
  
  // Forms
  const [spaceForm, setSpaceForm] = useState({ name: "", space_id: "", description: "", sdk_key: "" });
  const [poiForm, setPoiForm] = useState({ title: "", description: "", position: null });
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
      // Create POI in database
      const response = await axios.post(`${API_URL}/api/matterport/pois`, {
        space_id: activeSpace?.id || activeSpace?.space_id,
        position: poiForm.position,
        translations: [{
          language: "it",
          title: poiForm.title,
          description: poiForm.description || ""
        }],
        is_imported: false,
        is_visible: true
      });
      
      // Add tag to Matterport 3D view
      if (matterportRef.current) {
        const mattertagId = await matterportRef.current.addTag({
          label: poiForm.title,
          description: poiForm.description || "",
          position: poiForm.position,
          color: { r: 0, g: 0.8, b: 0.4 } // Green for new POIs
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
      setPoiForm({ title: "", description: "", position: null });
      loadPois(activeSpace.id);
    } catch (error) {
      console.error("Error creating POI:", error);
      toast.error("Errore nella creazione del POI");
    } finally {
      setLoading(false);
    }
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
    if (matterportRef.current && poi.matterport_tag_id) {
      await matterportRef.current.navigateToTag(poi.matterport_tag_id);
    } else if (poi.position) {
      toast.info("Navigazione a coordinate non ancora supportata");
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
    
    return (
      <Card 
        key={poi.id}
        className={`bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition-all cursor-pointer ${
          selectedPoi?.id === poi.id ? 'border-cyan-500' : ''
        }`}
        onClick={() => setSelectedPoi(poi)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${poi.is_visible ? 'bg-green-500' : 'bg-slate-500'}`} />
              <h4 className="font-medium text-white truncate">{itTrans.title || "POI"}</h4>
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
    <div className="min-h-screen bg-[#09090B] text-white p-6">
      <div className="max-w-7xl mx-auto">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Spaces & POIs List */}
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full bg-slate-800">
                <TabsTrigger value="spaces" className="flex-1">Spazi</TabsTrigger>
                <TabsTrigger value="pois" className="flex-1">POI</TabsTrigger>
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
                <div className="flex gap-2 mb-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-500/50 text-blue-400"
                    onClick={() => {
                      if (matterportTags.length > 0) {
                        setShowImportDialog(true);
                      } else {
                        toast.info("Carica prima i tag dallo spazio Matterport");
                      }
                    }}
                  >
                    <Download size={14} className="mr-1" />
                    Importa Tag
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-500/50 text-green-400"
                    onClick={() => setShowPoiDialog(true)}
                  >
                    <Plus size={14} className="mr-1" />
                    Nuovo POI
                  </Button>
                </div>
                
                <ScrollArea className="h-[440px]">
                  <div className="space-y-3">
                    {pois.length === 0 ? (
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-6 text-center">
                          <MapPin size={48} className="mx-auto text-slate-600 mb-4" />
                          <p className="text-slate-400">Nessun POI per questo spazio</p>
                        </CardContent>
                      </Card>
                    ) : (
                      pois.map(poi => renderPoiCard(poi))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Center - Matterport Viewer */}
          <div className="lg:col-span-2 space-y-4">
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
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-white hover:bg-slate-700"
                      onClick={() => setSelectedPoi(null)}
                    >
                      <X size={16} />
                    </Button>
                  </div>
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
        <DialogContent className="bg-slate-800 border-slate-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Crea Nuovo POI</DialogTitle>
            <DialogDescription className="text-slate-300">
              Acquisisci la posizione dalla vista 3D o inserisci i dati manualmente
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
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
              <Label className="text-white font-medium">Descrizione (Italiano)</Label>
              <Textarea
                value={poiForm.description}
                onChange={(e) => setPoiForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Descrizione dettagliata..."
                className="bg-slate-700 border-slate-500 text-white placeholder:text-slate-400 mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-white font-medium">Posizione 3D</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  className="flex-1 border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                  onClick={handleGetCurrentPosition}
                >
                  <Crosshair size={14} className="mr-1" />
                  Acquisisci dalla vista
                </Button>
              </div>
              {poiForm.position && (
                <div className="mt-2 p-3 bg-green-500/20 border border-green-500/50 rounded text-sm text-green-300">
                  <span className="font-medium">✓ Posizione acquisita:</span><br/>
                  X: {poiForm.position.x?.toFixed(2)} | 
                  Y: {poiForm.position.y?.toFixed(2)} | 
                  Z: {poiForm.position.z?.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowPoiDialog(false)}
              className="border-slate-500 text-slate-300 hover:bg-slate-700"
            >
              Annulla
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white" 
              onClick={handleCreatePoiAtPosition}
              disabled={loading || !poiForm.title}
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
    </div>
  );
}
