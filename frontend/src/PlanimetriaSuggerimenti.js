import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Plus, Trash2, MapPin, Upload, Loader2, AlertTriangle,
  CheckCircle, Info, Lightbulb, Shield, RefreshCw, Zap,
  Calendar, Euro, X, Move, Save, Image
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ============== PLANIMETRIA INTERATTIVA ==============

export const PlanimetriaEditor = ({ elettrodomestici, onElettrodomesticoClick }) => {
  const [planimetrie, setPlanimetrie] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planDetail, setPlanDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedElettro, setDraggedElettro] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [localPunti, setLocalPunti] = useState([]);
  const imageRef = useRef(null);

  const loadPlanimetrie = async () => {
    try {
      const res = await axios.get(`${API}/planimetrie`);
      setPlanimetrie(res.data);
      if (res.data.length > 0 && !selectedPlan) {
        setSelectedPlan(res.data[0].id);
      }
    } catch (error) {
      console.error("Error loading planimetrie:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlanDetail = async (planId) => {
    try {
      const res = await axios.get(`${API}/planimetrie/${planId}`);
      setPlanDetail(res.data);
      setLocalPunti(res.data.punti || []);
    } catch (error) {
      console.error("Error loading plan detail:", error);
    }
  };

  useEffect(() => {
    loadPlanimetrie();
  }, []);

  useEffect(() => {
    if (selectedPlan) {
      loadPlanDetail(selectedPlan);
    }
  }, [selectedPlan]);

  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      await axios.post(`${API}/planimetrie`, formData);
      toast.success("Planimetria caricata");
      setUploadDialogOpen(false);
      loadPlanimetrie();
    } catch (error) {
      toast.error("Errore nel caricamento");
    }
  };

  const handleDeletePlan = async () => {
    if (!selectedPlan || !window.confirm("Eliminare questa planimetria?")) return;
    
    try {
      await axios.delete(`${API}/planimetrie/${selectedPlan}`);
      toast.success("Planimetria eliminata");
      setSelectedPlan(null);
      setPlanDetail(null);
      loadPlanimetrie();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const handleImageClick = (e) => {
    if (!editMode || !draggedElettro) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Verifica se l'elettrodomestico è già sulla mappa
    const esistente = localPunti.find(p => p.elettrodomestico_id === draggedElettro.id);
    if (esistente) {
      // Aggiorna posizione
      setLocalPunti(prev => prev.map(p => 
        p.elettrodomestico_id === draggedElettro.id ? { ...p, x, y } : p
      ));
    } else {
      // Aggiungi nuovo punto
      setLocalPunti(prev => [...prev, {
        elettrodomestico_id: draggedElettro.id,
        x,
        y,
        label: draggedElettro.nome
      }]);
    }
    
    setDraggedElettro(null);
  };

  const handleRemovePunto = (elettroId) => {
    setLocalPunti(prev => prev.filter(p => p.elettrodomestico_id !== elettroId));
  };

  const handleSavePunti = async () => {
    if (!selectedPlan) return;
    
    try {
      await axios.put(`${API}/planimetrie/${selectedPlan}/punti`, localPunti);
      toast.success("Posizioni salvate");
      setEditMode(false);
      loadPlanDetail(selectedPlan);
    } catch (error) {
      toast.error("Errore nel salvataggio");
    }
  };

  const handlePuntoClick = (punto) => {
    if (editMode) return;
    
    const elettro = planDetail?.punti_dettagliati?.find(
      p => p.elettrodomestico_id === punto.elettrodomestico_id
    )?.elettrodomestico;
    
    if (elettro && onElettrodomesticoClick) {
      onElettrodomesticoClick(elettro);
    }
  };

  // Elettrodomestici non ancora posizionati
  const elettroNonPosizionati = elettrodomestici.filter(
    e => !localPunti.find(p => p.elettrodomestico_id === e.id)
  );

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Select value={selectedPlan || ""} onValueChange={setSelectedPlan}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Seleziona planimetria" />
            </SelectTrigger>
            <SelectContent>
              {planimetrie.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome} {p.piano && `(${p.piano})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedPlan && (
            <>
              <Button 
                variant={editMode ? "default" : "outline"}
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? <Save className="h-4 w-4 mr-2" /> : <Move className="h-4 w-4 mr-2" />}
                {editMode ? "Modifica attiva" : "Modifica"}
              </Button>
              {editMode && (
                <Button onClick={handleSavePunti}>
                  <Save className="h-4 w-4 mr-2" /> Salva posizioni
                </Button>
              )}
            </>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Carica planimetria
          </Button>
          {selectedPlan && (
            <Button variant="outline" className="text-red-600" onClick={handleDeletePlan}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Editor Area */}
      {selectedPlan && planDetail ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Planimetria */}
          <Card className="lg:col-span-3">
            <CardContent className="p-4">
              <div 
                className={`relative border rounded-lg overflow-hidden ${editMode ? 'cursor-crosshair' : ''}`}
                onClick={handleImageClick}
              >
                <img
                  ref={imageRef}
                  src={`${BACKEND_URL}/api/planimetrie/${selectedPlan}/image`}
                  alt={planDetail.nome}
                  className="w-full h-auto"
                  draggable={false}
                />
                
                {/* Punti sulla mappa */}
                {localPunti.map((punto, index) => {
                  const elettro = elettrodomestici.find(e => e.id === punto.elettrodomestico_id);
                  const isSelected = draggedElettro?.id === punto.elettrodomestico_id;
                  
                  return (
                    <div
                      key={punto.elettrodomestico_id}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer
                        ${isSelected ? 'z-20' : 'z-10'}
                        ${editMode ? 'hover:scale-110' : 'hover:scale-105'}
                        transition-transform`}
                      style={{ left: `${punto.x}%`, top: `${punto.y}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!editMode) handlePuntoClick(punto);
                      }}
                    >
                      <div className={`
                        flex flex-col items-center
                        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 rounded-full' : ''}
                      `}>
                        <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <span className="mt-1 px-2 py-0.5 bg-white rounded shadow text-xs font-medium max-w-[100px] truncate">
                          {elettro?.nome || punto.label}
                        </span>
                        {editMode && (
                          <button
                            className="mt-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePunto(punto.elettrodomestico_id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {editMode && draggedElettro && (
                  <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                    <p className="bg-white px-4 py-2 rounded shadow">
                      Clicca sulla planimetria per posizionare "{draggedElettro.nome}"
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {editMode ? "Elettrodomestici da posizionare" : "Legenda"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {editMode ? (
                  <div className="space-y-2">
                    {elettroNonPosizionati.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Tutti gli elettrodomestici sono posizionati
                      </p>
                    ) : (
                      elettroNonPosizionati.map(e => (
                        <button
                          key={e.id}
                          className={`w-full text-left p-2 rounded border hover:bg-blue-50 transition-colors
                            ${draggedElettro?.id === e.id ? 'bg-blue-100 border-blue-500' : ''}`}
                          onClick={() => setDraggedElettro(
                            draggedElettro?.id === e.id ? null : e
                          )}
                        >
                          <p className="font-medium text-sm">{e.nome}</p>
                          <p className="text-xs text-gray-500">{e.marca} {e.modello}</p>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {localPunti.map(punto => {
                      const elettro = elettrodomestici.find(e => e.id === punto.elettrodomestico_id);
                      return (
                        <div
                          key={punto.elettrodomestico_id}
                          className="p-2 rounded border hover:bg-gray-50 cursor-pointer"
                          onClick={() => handlePuntoClick(punto)}
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="font-medium text-sm">{elettro?.nome || punto.label}</p>
                              {elettro && (
                                <p className="text-xs text-gray-500">{elettro.posizione}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {localPunti.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Nessun elettrodomestico posizionato
                      </p>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Image className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">
            {planimetrie.length === 0 
              ? "Nessuna planimetria caricata" 
              : "Seleziona una planimetria"}
          </p>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Carica la prima planimetria
          </Button>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carica Planimetria</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" name="nome" required placeholder="Es: Appartamento Via Roma" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="piano">Piano</Label>
              <Input id="piano" name="piano" placeholder="Es: Piano Terra, Primo Piano" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descrizione">Descrizione</Label>
              <Input id="descrizione" name="descrizione" placeholder="Descrizione opzionale" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">File immagine *</Label>
              <Input id="file" name="file" type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" required />
              <p className="text-xs text-gray-500">Formati: PNG, JPG, WEBP, PDF</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>Annulla</Button>
              <Button type="submit">Carica</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============== SUGGERIMENTI PROATTIVI ==============

const PRIORITA_COLORS = {
  urgente: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300", icon: "text-red-600" },
  attenzione: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300", icon: "text-orange-600" },
  info: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300", icon: "text-blue-600" }
};

const TIPO_ICONS = {
  manutenzione: Zap,
  garanzia: Shield,
  risparmio: Euro,
  sicurezza: Shield,
  sostituzione: RefreshCw
};

export const SuggerimentiProattivi = ({ onNavigateToElettrodomestico }) => {
  const [suggerimenti, setSuggerimenti] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtro, setFiltro] = useState("tutti");
  const [dismissed, setDismissed] = useState(new Set());

  const loadSuggerimenti = async () => {
    try {
      const res = await axios.get(`${API}/suggerimenti`);
      setSuggerimenti(res.data);
    } catch (error) {
      console.error("Error loading suggerimenti:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuggerimenti();
  }, []);

  const handleDismiss = (id) => {
    setDismissed(prev => new Set([...prev, id]));
  };

  const filteredSuggerimenti = suggerimenti.filter(s => {
    if (dismissed.has(s.id)) return false;
    if (filtro === "tutti") return true;
    return s.priorita === filtro;
  });

  const counts = {
    urgenti: suggerimenti.filter(s => s.priorita === "urgente" && !dismissed.has(s.id)).length,
    attenzione: suggerimenti.filter(s => s.priorita === "attenzione" && !dismissed.has(s.id)).length,
    info: suggerimenti.filter(s => s.priorita === "info" && !dismissed.has(s.id)).length
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
            Suggerimenti Proattivi
          </h2>
          <div className="flex gap-2">
            {counts.urgenti > 0 && (
              <Badge className="bg-red-500">{counts.urgenti} urgenti</Badge>
            )}
            {counts.attenzione > 0 && (
              <Badge className="bg-orange-500">{counts.attenzione} attenzione</Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti</SelectItem>
              <SelectItem value="urgente">🔴 Urgenti</SelectItem>
              <SelectItem value="attenzione">🟠 Attenzione</SelectItem>
              <SelectItem value="info">🔵 Info</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadSuggerimenti}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lista suggerimenti */}
      <div className="space-y-3">
        {filteredSuggerimenti.length === 0 ? (
          <Card className="p-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-gray-600 font-medium">Tutto a posto!</p>
            <p className="text-gray-500 text-sm">Non ci sono suggerimenti al momento.</p>
          </Card>
        ) : (
          filteredSuggerimenti.map(s => {
            const colors = PRIORITA_COLORS[s.priorita];
            const IconComponent = TIPO_ICONS[s.tipo] || Info;
            
            return (
              <Card 
                key={s.id} 
                className={`${colors.bg} ${colors.border} border-l-4 hover:shadow-md transition-shadow`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${colors.bg}`}>
                      <IconComponent className={`h-5 w-5 ${colors.icon}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-semibold ${colors.text}`}>{s.titolo}</h4>
                        <Badge variant="outline" className="text-xs">
                          {s.tipo}
                        </Badge>
                      </div>
                      <p className="text-gray-700 text-sm mb-2">{s.messaggio}</p>
                      
                      {s.elettrodomestico_nome && (
                        <p className="text-xs text-gray-500 mb-2">
                          📦 {s.elettrodomestico_nome}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2">
                        {s.azione_suggerita && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (s.elettrodomestico_id && onNavigateToElettrodomestico) {
                                onNavigateToElettrodomestico(s.elettrodomestico_id);
                              }
                            }}
                          >
                            {s.azione_suggerita}
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDismiss(s.id)}
                        >
                          Nascondi
                        </Button>
                      </div>
                    </div>
                    
                    <button 
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => handleDismiss(s.id)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

// Badge per notifiche header
export const NotificationBadge = ({ onClick }) => {
  const [count, setCount] = useState({ totale: 0, urgenti: 0 });

  useEffect(() => {
    const loadCount = async () => {
      try {
        const res = await axios.get(`${API}/suggerimenti/count`);
        setCount(res.data);
      } catch (error) {
        console.error("Error loading count:", error);
      }
    };
    
    loadCount();
    const interval = setInterval(loadCount, 60000); // Refresh ogni minuto
    return () => clearInterval(interval);
  }, []);

  if (count.totale === 0) return null;

  return (
    <button 
      onClick={onClick}
      className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
    >
      <Lightbulb className={`h-5 w-5 ${count.urgenti > 0 ? 'text-red-500' : 'text-yellow-500'}`} />
      {count.totale > 0 && (
        <span className={`absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold text-white rounded-full
          ${count.urgenti > 0 ? 'bg-red-500' : 'bg-yellow-500'}`}>
          {count.totale}
        </span>
      )}
    </button>
  );
};
