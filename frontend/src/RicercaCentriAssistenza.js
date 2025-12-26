import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Search,
  MapPin,
  Phone,
  ExternalLink,
  Building2,
  Loader2,
  Plus,
  Globe,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function RicercaCentriAssistenza({ 
  open, 
  onOpenChange,
  onAddCentro // Callback per aggiungere un centro trovato 
}) {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [localita, setLocalita] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searchDone, setSearchDone] = useState(false);

  // Carica lista brand
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/centri-assistenza/brands`);
        setBrands(response.data.brands || []);
      } catch (error) {
        console.error("Error loading brands:", error);
      }
    };
    if (open) {
      loadBrands();
    }
  }, [open]);

  // Reset quando si chiude
  useEffect(() => {
    if (!open) {
      setResults([]);
      setSearchDone(false);
    }
  }, [open]);

  // Esegui ricerca
  const handleSearch = async () => {
    if (!selectedBrand || !localita.trim()) {
      toast.error("Seleziona una marca e inserisci una località");
      return;
    }

    setSearching(true);
    setSearchDone(false);
    
    try {
      const response = await axios.get(`${API_URL}/api/centri-assistenza/cerca-web`, {
        params: {
          marca: selectedBrand,
          localita: localita.trim()
        }
      });
      
      setResults(response.data.risultati || []);
      setSearchDone(true);
      
      if (response.data.risultati?.length === 0) {
        toast.info("Nessun risultato trovato, prova con una località diversa");
      }
    } catch (error) {
      toast.error("Errore nella ricerca: " + (error.response?.data?.detail || error.message));
    } finally {
      setSearching(false);
    }
  };

  // Aggiungi come centro assistenza
  const handleAddAsCentro = (result) => {
    if (onAddCentro) {
      onAddCentro({
        nome_azienda: result.titolo?.replace(/centro assistenza/gi, "").trim() || `Assistenza ${selectedBrand}`,
        telefono: result.telefono_trovato || "",
        indirizzo: localita,
        specializzazioni: [selectedBrand],
        note: `Trovato tramite ricerca web: ${result.url}`
      });
      toast.success("Centro aggiunto, completa i dati mancanti");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Cerca Centri Assistenza
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Form di ricerca */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca / Brand</Label>
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona marca..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {brands.map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="localita">Località</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="localita"
                      value={localita}
                      onChange={(e) => setLocalita(e.target.value)}
                      placeholder="es. Milano, Roma, Nuoro..."
                      className="pl-10"
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleSearch} 
                disabled={searching || !selectedBrand || !localita.trim()}
                className="w-full"
              >
                {searching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ricerca in corso...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Cerca sul Web
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Risultati */}
          {searchDone && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-700">
                  Risultati per "{selectedBrand}" a "{localita}"
                </h3>
                <Badge variant="secondary">{results.length} trovati</Badge>
              </div>

              {results.length === 0 ? (
                <Card className="bg-gray-50">
                  <CardContent className="py-8 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">Nessun risultato trovato</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Prova con una località diversa o una marca più comune
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <Card 
                      key={index} 
                      className="hover:border-blue-300 transition-colors"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {result.titolo}
                            </h4>
                            
                            {result.descrizione && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {result.descrizione}
                              </p>
                            )}
                            
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {result.telefono_trovato && (
                                <Badge variant="outline" className="text-green-700 border-green-300">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {result.telefono_trovato}
                                </Badge>
                              )}
                              
                              <Badge variant="secondary">
                                {result.marca}
                              </Badge>
                              
                              {result.tipo === "link_ricerca" && (
                                <Badge variant="outline" className="text-blue-600 border-blue-300">
                                  Link di ricerca
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(result.url, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Apri
                            </Button>
                            
                            {onAddCentro && result.tipo !== "link_ricerca" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleAddAsCentro(result)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Aggiungi
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Link utili aggiuntivi */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span>Link utili per la ricerca</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => window.open(
                        `https://www.google.com/maps/search/centro+assistenza+${selectedBrand}+${localita}`,
                        "_blank"
                      )}
                    >
                      <MapPin className="h-4 w-4 mr-2 text-red-500" />
                      Cerca su Google Maps
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => window.open(
                        `https://www.paginegialle.it/ricerca/${selectedBrand}/assistenza/${localita}`,
                        "_blank"
                      )}
                    >
                      <Building2 className="h-4 w-4 mr-2 text-yellow-500" />
                      Pagine Gialle
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => window.open(
                        `https://www.google.com/search?q=${selectedBrand}+assistenza+clienti+italia+numero+telefono`,
                        "_blank"
                      )}
                    >
                      <Phone className="h-4 w-4 mr-2 text-green-500" />
                      Numero Assistenza {selectedBrand}
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => window.open(
                        `https://www.google.com/search?q=${selectedBrand}+sito+ufficiale+assistenza`,
                        "_blank"
                      )}
                    >
                      <Globe className="h-4 w-4 mr-2 text-blue-500" />
                      Sito Ufficiale {selectedBrand}
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
