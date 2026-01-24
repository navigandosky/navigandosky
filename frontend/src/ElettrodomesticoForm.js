import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Plus,
  Upload,
  X,
  Link as LinkIcon,
  FileText,
  Image,
  Video,
  Euro,
  Zap,
  ExternalLink,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Categorie predefinite
const CATEGORIE_BASE = [
  { value: "climatizzazione", label: "Climatizzazione", icon: "❄️" },
  { value: "cucina", label: "Cucina", icon: "🍳" },
  { value: "lavanderia", label: "Lavanderia", icon: "👕" },
  { value: "intrattenimento", label: "Intrattenimento", icon: "📺" },
  { value: "illuminazione", label: "Illuminazione", icon: "💡" },
  { value: "sicurezza", label: "Sicurezza", icon: "🔒" },
  { value: "riscaldamento", label: "Riscaldamento", icon: "🔥" },
  { value: "pulizia", label: "Pulizia", icon: "🧹" },
  { value: "altro", label: "Altro", icon: "📦" },
];

// Marche predefinite
const MARCHE_BASE = [
  "Samsung", "LG", "Bosch", "Siemens", "Whirlpool", "Electrolux", 
  "Miele", "AEG", "Philips", "Sony", "Panasonic", "Haier", 
  "Candy", "Indesit", "Beko", "Hotpoint", "De'Longhi", "Smeg",
  "Daikin", "Mitsubishi", "Hisense", "TCL"
];

// Smart Plug Providers
const SMART_PLUG_PROVIDERS = [
  { value: "nessuno", label: "Nessuno" },
  { value: "smartthings", label: "SmartThings" },
  { value: "shelly", label: "Shelly" },
  { value: "tapo", label: "TP-Link Tapo" },
  { value: "tuya", label: "Tuya/Smart Life" },
  { value: "meross", label: "Meross" },
  { value: "altro", label: "Altro" },
];

export default function ElettrodomesticoDialog({ 
  open, 
  onOpenChange, 
  elettrodomestico, 
  centriAssistenza = [], 
  smartThingsDevices = [],
  pois = [],
  onSave 
}) {
  const [formData, setFormData] = useState({
    nome: "",
    marca: "",
    marca_custom: "",
    modello: "",
    numero_serie: "",
    categoria: "altro",
    categoria_custom: "",
    posizione: "",
    data_acquisto: "",
    data_scadenza_garanzia: "",
    costo_acquisto: "",
    valore_attuale: "",
    consumo_orario_kw: 0,
    ore_uso_giornaliero_stimate: 0,
    smart_plug_provider: "nessuno",
    smart_plug_id: "",
    smartthings_device_id: "",
    smartthings_device_name: "",
    matterport_tag_id: "",
    centro_assistenza_id: "",
    manuale_link_sito: "",
    note: "",
    // Files
    fattura_url: "",
    foto_url: "",
    manuali_urls: [],
    video_istruzioni: [],
    pdf_istruzioni: [],
    documenti_acquisto: [],
  });

  const [categorieCustom, setCategorieCustom] = useState([]);
  const [marcheCustom, setMarcheCustom] = useState([]);
  const [showAddCategoria, setShowAddCategoria] = useState(false);
  const [showAddMarca, setShowAddMarca] = useState(false);
  const [newCategoria, setNewCategoria] = useState("");
  const [newMarca, setNewMarca] = useState("");
  const [uploading, setUploading] = useState({});
  const [useSmartThingsDevice, setUseSmartThingsDevice] = useState(false);

  const fileInputRefs = {
    fattura: useRef(null),
    foto: useRef(null),
    manuale: useRef(null),
    video: useRef(null),
    pdf_istruzioni: useRef(null),
  };

  // Load custom categories and brands
  useEffect(() => {
    const loadCustomData = async () => {
      try {
        const [catRes, marcheRes] = await Promise.all([
          axios.get(`${API_URL}/api/categorie-custom`),
          axios.get(`${API_URL}/api/marche-custom`)
        ]);
        setCategorieCustom(catRes.data || []);
        setMarcheCustom(marcheRes.data || []);
      } catch (error) {
        console.log("Error loading custom data:", error);
      }
    };
    loadCustomData();
  }, []);

  // Reset form when dialog opens
  useEffect(() => {
    if (elettrodomestico) {
      setFormData({
        ...elettrodomestico,
        costo_acquisto: elettrodomestico.costo_acquisto || "",
        valore_attuale: elettrodomestico.valore_attuale || "",
        centro_assistenza_id: elettrodomestico.centro_assistenza_id || "",
        matterport_tag_id: elettrodomestico.matterport_tag_id || "",
        manuali_urls: elettrodomestico.manuali_urls || [],
        video_istruzioni: elettrodomestico.video_istruzioni || [],
        pdf_istruzioni: elettrodomestico.pdf_istruzioni || [],
        documenti_acquisto: elettrodomestico.documenti_acquisto || [],
      });
      setUseSmartThingsDevice(!!elettrodomestico.smartthings_device_id);
    } else {
      setFormData({
        nome: "",
        marca: "",
        marca_custom: "",
        modello: "",
        numero_serie: "",
        categoria: "altro",
        categoria_custom: "",
        posizione: "",
        data_acquisto: "",
        data_scadenza_garanzia: "",
        costo_acquisto: "",
        valore_attuale: "",
        consumo_orario_kw: 0,
        ore_uso_giornaliero_stimate: 0,
        smart_plug_provider: "nessuno",
        smart_plug_id: "",
        smartthings_device_id: "",
        smartthings_device_name: "",
        matterport_tag_id: "",
        centro_assistenza_id: "",
        manuale_link_sito: "",
        note: "",
        fattura_url: "",
        foto_url: "",
        manuali_urls: [],
        video_istruzioni: [],
        pdf_istruzioni: [],
        documenti_acquisto: [],
      });
      setUseSmartThingsDevice(false);
    }
  }, [elettrodomestico, open]);

  // Handle file upload
  const handleFileUpload = async (tipo, file) => {
    if (!file) return;
    
    setUploading(prev => ({ ...prev, [tipo]: true }));
    
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    if (elettrodomestico?.id) {
      formDataUpload.append('elettrodomestico_id', elettrodomestico.id);
    }
    
    try {
      const response = await axios.post(`${API_URL}/api/upload/${tipo}`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const fileUrl = response.data.url;
      
      // Update form data based on type
      if (tipo === 'fattura') {
        setFormData(prev => ({ ...prev, fattura_url: fileUrl }));
      } else if (tipo === 'foto') {
        setFormData(prev => ({ ...prev, foto_url: fileUrl }));
      } else if (tipo === 'manuale') {
        setFormData(prev => ({ ...prev, manuali_urls: [...prev.manuali_urls, fileUrl] }));
      } else if (tipo === 'video') {
        setFormData(prev => ({ ...prev, video_istruzioni: [...prev.video_istruzioni, fileUrl] }));
      } else if (tipo === 'pdf_istruzioni') {
        setFormData(prev => ({ ...prev, pdf_istruzioni: [...prev.pdf_istruzioni, fileUrl] }));
      }
      
      toast.success(`${tipo} caricato con successo`);
    } catch (error) {
      toast.error(`Errore upload: ${error.message}`);
    } finally {
      setUploading(prev => ({ ...prev, [tipo]: false }));
    }
  };

  // Add custom category
  const handleAddCategoria = async () => {
    if (!newCategoria.trim()) return;
    try {
      const formDataCat = new FormData();
      formDataCat.append('nome', newCategoria.trim());
      const response = await axios.post(`${API_URL}/api/categorie-custom`, formDataCat);
      setCategorieCustom(prev => [...prev, response.data]);
      setFormData(prev => ({ ...prev, categoria: "custom", categoria_custom: newCategoria.trim() }));
      setNewCategoria("");
      setShowAddCategoria(false);
      toast.success("Categoria aggiunta");
    } catch (error) {
      toast.error("Errore nell'aggiungere la categoria");
    }
  };

  // Add custom brand
  const handleAddMarca = async () => {
    if (!newMarca.trim()) return;
    try {
      const formDataMarca = new FormData();
      formDataMarca.append('nome', newMarca.trim());
      const response = await axios.post(`${API_URL}/api/marche-custom`, formDataMarca);
      setMarcheCustom(prev => [...prev, response.data]);
      setFormData(prev => ({ ...prev, marca: "custom", marca_custom: newMarca.trim() }));
      setNewMarca("");
      setShowAddMarca(false);
      toast.success("Marca aggiunta");
    } catch (error) {
      toast.error("Errore nell'aggiungere la marca");
    }
  };

  // Select SmartThings device
  const handleSelectSmartThingsDevice = (deviceId) => {
    const device = smartThingsDevices.find(d => d.id === deviceId);
    if (device) {
      setFormData(prev => ({
        ...prev,
        nome: prev.nome || device.name,
        smartthings_device_id: device.id,
        smartthings_device_name: device.name,
        smart_plug_provider: "smartthings",
        smart_plug_id: device.id
      }));
    }
  };

  // Remove file from list
  const removeFileFromList = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      costo_acquisto: formData.costo_acquisto ? parseFloat(formData.costo_acquisto) : null,
      valore_attuale: formData.valore_attuale ? parseFloat(formData.valore_attuale) : null,
      centro_assistenza_id: formData.centro_assistenza_id || null,
    };
    onSave(dataToSave);
  };

  const consumoGiornaliero = formData.consumo_orario_kw * formData.ore_uso_giornaliero_stimate;
  const consumoMensile = consumoGiornaliero * 30;

  // Combine categories
  const allCategorie = [
    ...CATEGORIE_BASE,
    ...categorieCustom.map(c => ({ value: "custom_" + c.id, label: c.nome, icon: "📁" }))
  ];

  // Combine brands
  const allMarche = [...MARCHE_BASE, ...marcheCustom.map(m => m.nome)];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {elettrodomestico ? "Modifica Elettrodomestico" : "Nuovo Elettrodomestico"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="acquisto">Acquisto</TabsTrigger>
              <TabsTrigger value="consumi">Consumi</TabsTrigger>
              <TabsTrigger value="smart">Smart</TabsTrigger>
              <TabsTrigger value="assistenza">Assistenza</TabsTrigger>
            </TabsList>

            {/* TAB INFO */}
            <TabsContent value="info" className="space-y-4 mt-4">
              {/* Select from SmartThings */}
              {smartThingsDevices.length > 0 && (
                <Card className="bg-cyan-50 border-cyan-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="h-4 w-4 text-cyan-600" />
                      <span className="font-medium text-cyan-800">Importa da SmartThings</span>
                    </div>
                    <Select onValueChange={handleSelectSmartThingsDevice}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Seleziona dispositivo SmartThings..." />
                      </SelectTrigger>
                      <SelectContent>
                        {smartThingsDevices.map((device) => (
                          <SelectItem key={device.id} value={device.id}>
                            {device.name} ({device.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-cyan-600 mt-2">
                      Oppure inserisci manualmente i dati sotto
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>
                
                {/* Categoria con aggiunta */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Categoria</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowAddCategoria(true)}
                      className="h-6 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Aggiungi
                    </Button>
                  </div>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategorie.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Marca con aggiunta */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Marca</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowAddMarca(true)}
                      className="h-6 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Aggiungi
                    </Button>
                  </div>
                  <Select
                    value={formData.marca}
                    onValueChange={(value) => setFormData({ ...formData, marca: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {allMarche.map((marca) => (
                        <SelectItem key={marca} value={marca}>
                          {marca}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="modello">Modello</Label>
                  <Input
                    id="modello"
                    value={formData.modello || ""}
                    onChange={(e) => setFormData({ ...formData, modello: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_serie">Numero Serie</Label>
                  <Input
                    id="numero_serie"
                    value={formData.numero_serie || ""}
                    onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="posizione">Posizione</Label>
                  <Input
                    id="posizione"
                    value={formData.posizione || ""}
                    onChange={(e) => setFormData({ ...formData, posizione: e.target.value })}
                    placeholder="es. Cucina, Bagno piano 1..."
                  />
                </div>
              </div>

              {/* Foto */}
              <div className="space-y-2">
                <Label>Foto (opzionale)</Label>
                <div className="flex items-center gap-4">
                  {formData.foto_url ? (
                    <div className="relative">
                      <img 
                        src={`${API_URL}${formData.foto_url}`} 
                        alt="Foto" 
                        className="h-20 w-20 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setFormData(prev => ({ ...prev, foto_url: "" }))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRefs.foto.current?.click()}
                      className="h-20 w-20 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                    >
                      {uploading.foto ? (
                        <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent" />
                      ) : (
                        <Image className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  )}
                  <input
                    ref={fileInputRefs.foto}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload('foto', e.target.files?.[0])}
                  />
                  <p className="text-sm text-gray-500">Clicca per caricare una foto</p>
                </div>
              </div>
            </TabsContent>

            {/* TAB ACQUISTO */}
            <TabsContent value="acquisto" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_acquisto">Data Acquisto</Label>
                  <Input
                    id="data_acquisto"
                    type="date"
                    value={formData.data_acquisto || ""}
                    onChange={(e) => setFormData({ ...formData, data_acquisto: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_scadenza_garanzia">Scadenza Garanzia</Label>
                  <Input
                    id="data_scadenza_garanzia"
                    type="date"
                    value={formData.data_scadenza_garanzia || ""}
                    onChange={(e) => setFormData({ ...formData, data_scadenza_garanzia: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costo_acquisto">
                    <Euro className="h-4 w-4 inline mr-1" />
                    Costo Acquisto (€)
                  </Label>
                  <Input
                    id="costo_acquisto"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costo_acquisto}
                    onChange={(e) => setFormData({ ...formData, costo_acquisto: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valore_attuale">
                    <Euro className="h-4 w-4 inline mr-1" />
                    Valore Attuale (€)
                  </Label>
                  <Input
                    id="valore_attuale"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valore_attuale}
                    onChange={(e) => setFormData({ ...formData, valore_attuale: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Upload Fattura */}
              <div className="space-y-2">
                <Label>Fattura / Documenti Acquisto</Label>
                <div className="flex items-center gap-4">
                  {formData.fattura_url ? (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-green-700">Fattura caricata</span>
                      <a 
                        href={`${API_URL}${formData.fattura_url}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setFormData(prev => ({ ...prev, fattura_url: "" }))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRefs.fattura.current?.click()}
                      disabled={uploading.fattura}
                    >
                      {uploading.fattura ? (
                        <div className="animate-spin h-4 w-4 border-2 border-gray-500 rounded-full border-t-transparent mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Carica Fattura (PDF/Immagine)
                    </Button>
                  )}
                  <input
                    ref={fileInputRefs.fattura}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => handleFileUpload('fattura', e.target.files?.[0])}
                  />
                </div>

                {/* Lista documenti acquisto aggiuntivi */}
                {formData.documenti_acquisto.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.documenti_acquisto.map((doc, i) => (
                      <Badge key={i} variant="secondary" className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Documento {i + 1}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1"
                          onClick={() => removeFileFromList('documenti_acquisto', i)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB CONSUMI */}
            <TabsContent value="consumi" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="consumo_orario_w">Consumo Orario (W)</Label>
                  <Input
                    id="consumo_orario_w"
                    type="number"
                    step="1"
                    min="0"
                    value={Math.round(formData.consumo_orario_kw * 1000) || 0}
                    onChange={(e) => setFormData({ ...formData, consumo_orario_kw: (parseFloat(e.target.value) || 0) / 1000 })}
                    placeholder="es. 1500 W"
                  />
                  <p className="text-xs text-gray-500">Inserisci la potenza in Watt (es. 1500W = 1.5kW)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ore_uso_giornaliero_stimate">Ore Uso/Giorno Stimate</Label>
                  <Input
                    id="ore_uso_giornaliero_stimate"
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={formData.ore_uso_giornaliero_stimate}
                    onChange={(e) => setFormData({ ...formData, ore_uso_giornaliero_stimate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <Card className="bg-blue-50">
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Consumi Stimati
                  </h4>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Potenza</p>
                      <p className="font-bold">{Math.round(formData.consumo_orario_kw * 1000)} W</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Giornaliero</p>
                      <p className="font-bold">{consumoGiornaliero.toFixed(2)} kWh</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Mensile</p>
                      <p className="font-bold">{consumoMensile.toFixed(2)} kWh</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Costo/Mese (€0.25/kWh)</p>
                      <p className="font-bold text-green-700">€{(consumoMensile * 0.25).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB SMART */}
            <TabsContent value="smart" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Provider Smart Plug</Label>
                <Select
                  value={formData.smart_plug_provider}
                  onValueChange={(value) => setFormData({ ...formData, smart_plug_provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SMART_PLUG_PROVIDERS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.smart_plug_provider === "smartthings" && smartThingsDevices.length > 0 && (
                <div className="space-y-2">
                  <Label>Dispositivo SmartThings</Label>
                  <Select
                    value={formData.smartthings_device_id}
                    onValueChange={handleSelectSmartThingsDevice}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona dispositivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {smartThingsDevices.map((device) => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.smart_plug_provider !== "nessuno" && formData.smart_plug_provider !== "smartthings" && (
                <div className="space-y-2">
                  <Label htmlFor="smart_plug_id">ID Dispositivo Smart</Label>
                  <Input
                    id="smart_plug_id"
                    value={formData.smart_plug_id || ""}
                    onChange={(e) => setFormData({ ...formData, smart_plug_id: e.target.value })}
                    placeholder="ID del dispositivo"
                  />
                </div>
              )}
              
              {/* Associazione POI Matterport */}
              <div className="mt-6 pt-4 border-t border-slate-700">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    Posizione 3D (Tag Matterport/MPSKIN)
                  </Label>
                  <p className="text-xs text-slate-500 mb-2">
                    Associa questo dispositivo a un punto di interesse nella vista 3D
                  </p>
                  <Select
                    value={formData.matterport_tag_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, matterport_tag_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona POI..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nessun POI associato</SelectItem>
                      {pois.map((poi) => (
                        <SelectItem key={poi.id} value={poi.id}>
                          📍 {poi.name || poi.title || poi.label || `POI ${poi.id.slice(0,8)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.matterport_tag_id && (
                    <p className="text-xs text-green-500 mt-1">
                      ✓ Questo dispositivo sarà visibile nella Vista 3D
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB ASSISTENZA */}
            <TabsContent value="assistenza" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Centro Assistenza</Label>
                <Select
                  value={formData.centro_assistenza_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, centro_assistenza_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona centro assistenza" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuno</SelectItem>
                    {centriAssistenza.map((centro) => (
                      <SelectItem key={centro.id} value={centro.id}>
                        {centro.nome_azienda} - {centro.telefono}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Upload Manuali */}
              <div className="space-y-2">
                <Label>Manuali (PDF)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRefs.manuale.current?.click()}
                    disabled={uploading.manuale}
                  >
                    {uploading.manuale ? (
                      <div className="animate-spin h-4 w-4 border-2 border-gray-500 rounded-full border-t-transparent mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Carica Manuale PDF
                  </Button>
                  <input
                    ref={fileInputRefs.manuale}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => handleFileUpload('manuale', e.target.files?.[0])}
                  />
                </div>
                {formData.manuali_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.manuali_urls.map((url, i) => (
                      <Badge key={i} variant="secondary" className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Manuale {i + 1}
                        <a href={`${API_URL}${url}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1"
                          onClick={() => removeFileFromList('manuali_urls', i)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Link Sito Manuale */}
              <div className="space-y-2">
                <Label htmlFor="manuale_link_sito">
                  <LinkIcon className="h-4 w-4 inline mr-1" />
                  Link al Sito del Manuale
                </Label>
                <Input
                  id="manuale_link_sito"
                  type="url"
                  value={formData.manuale_link_sito || ""}
                  onChange={(e) => setFormData({ ...formData, manuale_link_sito: e.target.value })}
                  placeholder="https://www.esempio.com/manuali/..."
                />
              </div>

              {/* Video Istruzioni */}
              <div className="space-y-2">
                <Label>Video Istruzioni</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRefs.video.current?.click()}
                    disabled={uploading.video}
                  >
                    {uploading.video ? (
                      <div className="animate-spin h-4 w-4 border-2 border-gray-500 rounded-full border-t-transparent mr-2" />
                    ) : (
                      <Video className="h-4 w-4 mr-2" />
                    )}
                    Carica Video
                  </Button>
                  <input
                    ref={fileInputRefs.video}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload('video', e.target.files?.[0])}
                  />
                </div>
                {formData.video_istruzioni.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.video_istruzioni.map((url, i) => (
                      <Badge key={i} variant="secondary" className="flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        Video {i + 1}
                        <a href={`${API_URL}${url}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1"
                          onClick={() => removeFileFromList('video_istruzioni', i)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* PDF Istruzioni Pratiche */}
              <div className="space-y-2">
                <Label>PDF Istruzioni Pratiche</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRefs.pdf_istruzioni.current?.click()}
                    disabled={uploading.pdf_istruzioni}
                  >
                    {uploading.pdf_istruzioni ? (
                      <div className="animate-spin h-4 w-4 border-2 border-gray-500 rounded-full border-t-transparent mr-2" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Carica PDF Istruzioni
                  </Button>
                  <input
                    ref={fileInputRefs.pdf_istruzioni}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => handleFileUpload('pdf_istruzioni', e.target.files?.[0])}
                  />
                </div>
                {formData.pdf_istruzioni.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.pdf_istruzioni.map((url, i) => (
                      <Badge key={i} variant="secondary" className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        PDF {i + 1}
                        <a href={`${API_URL}${url}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1"
                          onClick={() => removeFileFromList('pdf_istruzioni', i)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  value={formData.note || ""}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit">
              {elettrodomestico ? "Salva Modifiche" : "Crea Elettrodomestico"}
            </Button>
          </DialogFooter>
        </form>

        {/* Dialog Aggiungi Categoria */}
        <Dialog open={showAddCategoria} onOpenChange={setShowAddCategoria}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Aggiungi Categoria</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Nome categoria..."
                value={newCategoria}
                onChange={(e) => setNewCategoria(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddCategoria(false)}>
                  Annulla
                </Button>
                <Button onClick={handleAddCategoria}>Aggiungi</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Aggiungi Marca */}
        <Dialog open={showAddMarca} onOpenChange={setShowAddMarca}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Aggiungi Marca</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Nome marca..."
                value={newMarca}
                onChange={(e) => setNewMarca(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddMarca(false)}>
                  Annulla
                </Button>
                <Button onClick={handleAddMarca}>Aggiungi</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
