import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Search, Edit2, Trash2, Eye, Phone, Mail, Globe, MapPin, X, Send, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const REGIONI_ITALIA = [
  "", "ABRUZZO", "BASILICATA", "CALABRIA", "CAMPANIA", "EMILIA ROMAGNA",
  "FRIULI VENEZIA GIULIA", "LAZIO", "LIGURIA", "LOMBARDIA", "MARCHE",
  "MOLISE", "PIEMONTE", "PUGLIA", "SARDEGNA", "SICILIA", "TOSCANA",
  "TRENTINO ALTO ADIGE", "UMBRIA", "VALLE D'AOSTA", "VENETO"
];

export default function ListaSociTab({ soci, onEdit, onRefresh, onContactSocio }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [regioneFilter, setRegioneFilter] = useState("");
  const [caricaFilter, setCaricaFilter] = useState("");
  const [gruppoFilter, setGruppoFilter] = useState("");
  const [gruppi, setGruppi] = useState([]);
  const [selectedSocio, setSelectedSocio] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const resetFilters = () => {
    setSearchTerm("");
    setRegioneFilter("");
    setCaricaFilter("");
    setGruppoFilter("");
  };

  useEffect(() => {
    const fetchGruppi = async () => {
      try {
        const res = await axios.get(`${API}/dropdown/gruppo`);
        setGruppi(res.data);
      } catch (error) {
        console.error("Error fetching gruppi:", error);
      }
    };
    fetchGruppi();
  }, []);

  const filteredSoci = useMemo(() => {
    return soci.filter((socio) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        socio.nome?.toLowerCase().includes(searchLower) ||
        socio.cognome?.toLowerCase().includes(searchLower) ||
        socio.citta?.toLowerCase().includes(searchLower) ||
        socio.email?.toLowerCase().includes(searchLower);

      const matchesRegione =
        !regioneFilter || socio.regione?.toUpperCase().includes(regioneFilter.toUpperCase());

      const matchesCarica =
        !caricaFilter || socio.carica?.toLowerCase().includes(caricaFilter.toLowerCase());

      const matchesGruppo =
        !gruppoFilter || socio.gruppo?.toLowerCase().includes(gruppoFilter.toLowerCase());

      return matchesSearch && matchesRegione && matchesCarica && matchesGruppo;
    });
  }, [soci, searchTerm, regioneFilter, caricaFilter, gruppoFilter]);

  const handleDelete = async (socioId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo socio?")) return;

    try {
      await axios.delete(`${API}/soci/${socioId}`);
      toast.success("Socio eliminato");
      onRefresh();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const handleViewDetail = (socio) => {
    setSelectedSocio(socio);
    setShowDetail(true);
  };

  const getCaricaBadgeColor = (carica) => {
    switch (carica) {
      case "Presidente":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "Vice Presidente":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      case "Segretario":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
      case "Tesoriere":
        return "bg-purple-500/20 text-purple-400 border-purple-500/50";
      case "Consigliere":
        return "bg-orange-500/20 text-orange-400 border-orange-500/50";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/50";
    }
  };

  return (
    <>
      <Card className="glass-card border-slate-800/60" data-testid="lista-soci">
        <CardHeader>
          <CardTitle className="text-slate-100 text-xl">Rubrica Soci</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Cerca per nome, cognome, città, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-950/50 border-slate-800 focus:border-blue-500 text-slate-200"
                data-testid="search-input"
              />
            </div>
            <Select value={regioneFilter || "all"} onValueChange={(v) => setRegioneFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full md:w-48 bg-slate-950/50 border-slate-800 text-slate-200" data-testid="filter-regione">
                <SelectValue placeholder="Tutte le regioni" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="all" className="text-slate-200">Tutte le regioni</SelectItem>
                {REGIONI_ITALIA.filter(Boolean).map((r) => (
                  <SelectItem key={r} value={r} className="text-slate-200 focus:bg-slate-800">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={caricaFilter || "all"} onValueChange={(v) => setCaricaFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full md:w-40 bg-slate-950/50 border-slate-800 text-slate-200" data-testid="filter-carica">
                <SelectValue placeholder="Tutte le cariche" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="all" className="text-slate-200">Tutte le cariche</SelectItem>
                <SelectItem value="Presidente" className="text-slate-200">Presidente</SelectItem>
                <SelectItem value="Vice Presidente" className="text-slate-200">Vice Presidente</SelectItem>
                <SelectItem value="Segretario" className="text-slate-200">Segretario</SelectItem>
                <SelectItem value="Tesoriere" className="text-slate-200">Tesoriere</SelectItem>
                <SelectItem value="Consigliere" className="text-slate-200">Consigliere</SelectItem>
                <SelectItem value="Socio" className="text-slate-200">Socio</SelectItem>
              </SelectContent>
            </Select>
            <Select value={gruppoFilter || "all"} onValueChange={(v) => setGruppoFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full md:w-44 bg-slate-950/50 border-slate-800 text-slate-200" data-testid="filter-gruppo">
                <SelectValue placeholder="Tutti i gruppi" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="all" className="text-slate-200">Tutti i gruppi</SelectItem>
                {gruppi.map((g) => (
                  <SelectItem key={g.id} value={g.value} className="text-slate-200 focus:bg-slate-800">
                    {g.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={resetFilters}
              className="border-slate-700 text-slate-300 hover:bg-slate-800/50"
              data-testid="reset-filters"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Azzera filtri
            </Button>
          </div>

          {/* Results count */}
          <div className="text-sm text-slate-400">
            {filteredSoci.length} {filteredSoci.length === 1 ? "socio trovato" : "soci trovati"}
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Nome</TableHead>
                  <TableHead className="text-slate-400">Regione</TableHead>
                  <TableHead className="text-slate-400">Carica</TableHead>
                  <TableHead className="text-slate-400">Email</TableHead>
                  <TableHead className="text-slate-400">Dispositivo</TableHead>
                  <TableHead className="text-slate-400 text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSoci.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                      Nessun socio trovato
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSoci.map((socio) => (
                    <TableRow
                      key={socio.id}
                      className="border-slate-800 hover:bg-slate-800/30 cursor-pointer"
                      onClick={() => handleViewDetail(socio)}
                      data-testid={`socio-row-${socio.id}`}
                    >
                      <TableCell className="text-slate-200 font-medium">
                        {socio.nome} {socio.cognome}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {socio.regione || "-"}
                      </TableCell>
                      <TableCell>
                        {socio.carica && (
                          <Badge
                            variant="outline"
                            className={getCaricaBadgeColor(socio.carica)}
                          >
                            {socio.carica}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {socio.email || "-"}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {socio.tipo_dispositivo || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetail(socio);
                            }}
                            className="text-slate-400 hover:text-blue-400"
                            data-testid={`view-${socio.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(socio);
                            }}
                            className="text-slate-400 hover:text-yellow-400"
                            data-testid={`edit-${socio.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(socio.id);
                            }}
                            className="text-slate-400 hover:text-red-400"
                            data-testid={`delete-${socio.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="glass-card border-slate-800 max-w-lg" data-testid="socio-detail-modal">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-slate-100 text-xl">
              {selectedSocio?.nome} {selectedSocio?.cognome}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetail(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          {selectedSocio && (
            <div className="space-y-4 mt-4">
              {selectedSocio.carica && (
                <Badge
                  variant="outline"
                  className={`${getCaricaBadgeColor(selectedSocio.carica)} text-sm`}
                >
                  {selectedSocio.carica}
                </Badge>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedSocio.qualifica && (
                  <div>
                    <p className="text-xs text-slate-500">Qualifica</p>
                    <p className="text-slate-200">{selectedSocio.qualifica}</p>
                  </div>
                )}
                {selectedSocio.regione && (
                  <div>
                    <p className="text-xs text-slate-500">Regione</p>
                    <p className="text-slate-200">{selectedSocio.regione}</p>
                  </div>
                )}
              </div>

              {(selectedSocio.citta || selectedSocio.indirizzo) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-500 mt-1" />
                  <div>
                    <p className="text-slate-200">
                      {selectedSocio.indirizzo}
                      {selectedSocio.indirizzo && selectedSocio.citta && ", "}
                      {selectedSocio.citta}
                    </p>
                  </div>
                </div>
              )}

              {selectedSocio.telefono && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-500" />
                  <a
                    href={`tel:${selectedSocio.telefono}`}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {selectedSocio.telefono}
                  </a>
                </div>
              )}

              {selectedSocio.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <a
                    href={`mailto:${selectedSocio.email}`}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {selectedSocio.email}
                  </a>
                </div>
              )}

              {selectedSocio.sito_web && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-500" />
                  <a
                    href={selectedSocio.sito_web.startsWith("http") ? selectedSocio.sito_web : `https://${selectedSocio.sito_web}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {selectedSocio.sito_web}
                  </a>
                </div>
              )}

              {selectedSocio.zona_copertura && (
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Zona di Copertura</p>
                  <p className="text-slate-200">{selectedSocio.zona_copertura}</p>
                </div>
              )}

              {selectedSocio.tipo_dispositivo && (
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Dispositivo</p>
                  <p className="text-slate-200">{selectedSocio.tipo_dispositivo}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    setShowDetail(false);
                    onEdit(selectedSocio);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-500"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Modifica
                </Button>
                {selectedSocio.email && onContactSocio && (
                  <Button
                    onClick={() => {
                      setShowDetail(false);
                      onContactSocio(selectedSocio);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Contatta
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
