import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { MapPin, Phone, Mail, Globe, Users, X, Send } from "lucide-react";
import { MapContainer, TileLayer, GeoJSON, Popup, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "leaflet/dist/leaflet.css";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GEOJSON_URL = "https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_IT_regions.geojson";

// Region name mapping
const REGION_MAPPING = {
  "Valle d'Aosta/Vallée d'Aoste": "VALLE D'AOSTA",
  "Piemonte": "PIEMONTE",
  "Lombardia": "LOMBARDIA",
  "Trentino-Alto Adige/Südtirol": "TRENTINO ALTO ADIGE",
  "Veneto": "VENETO",
  "Friuli-Venezia Giulia": "FRIULI VENEZIA GIULIA",
  "Liguria": "LIGURIA",
  "Emilia-Romagna": "EMILIA ROMAGNA",
  "Toscana": "TOSCANA",
  "Umbria": "UMBRIA",
  "Marche": "MARCHE",
  "Lazio": "LAZIO",
  "Abruzzo": "ABRUZZO",
  "Molise": "MOLISE",
  "Campania": "CAMPANIA",
  "Puglia": "PUGLIA",
  "Basilicata": "BASILICATA",
  "Calabria": "CALABRIA",
  "Sicilia": "SICILIA",
  "Sardegna": "SARDEGNA",
};

// Region centers for positioning
const REGION_CENTERS = {
  "PIEMONTE": [45.0703, 7.6869],
  "VALLE D'AOSTA": [45.7389, 7.4262],
  "LOMBARDIA": [45.4654, 9.1859],
  "TRENTINO ALTO ADIGE": [46.0702, 11.1212],
  "VENETO": [45.4414, 11.8713],
  "FRIULI VENEZIA GIULIA": [45.6366, 13.8042],
  "LIGURIA": [44.4111, 8.9328],
  "EMILIA ROMAGNA": [44.4939, 11.3428],
  "TOSCANA": [43.7711, 11.2486],
  "UMBRIA": [42.9564, 12.6232],
  "MARCHE": [43.6166, 13.5183],
  "LAZIO": [41.9028, 12.4964],
  "ABRUZZO": [42.3514, 13.3981],
  "MOLISE": [41.5609, 14.6684],
  "CAMPANIA": [40.8396, 14.2508],
  "PUGLIA": [41.1257, 16.8640],
  "BASILICATA": [40.6395, 15.8054],
  "CALABRIA": [38.9103, 16.5876],
  "SICILIA": [37.5994, 14.0154],
  "SARDEGNA": [40.1209, 9.0129],
};

function MapController({ selectedRegion }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedRegion && REGION_CENTERS[selectedRegion]) {
      map.flyTo(REGION_CENTERS[selectedRegion], 7, { duration: 0.5 });
    } else {
      map.flyTo([42.5, 12.5], 5.5, { duration: 0.5 });
    }
  }, [selectedRegion, map]);
  
  return null;
}

export default function MappaTab({ onContactSocio }) {
  const [geoData, setGeoData] = useState(null);
  const [mapData, setMapData] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [showCityModal, setShowCityModal] = useState(false);
  const [selectedCityData, setSelectedCityData] = useState(null);
  const geoJsonRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [geoRes, mapRes] = await Promise.all([
          axios.get(GEOJSON_URL),
          axios.get(`${API}/map-data`),
        ]);
        setGeoData(geoRes.data);
        setMapData(mapRes.data);
      } catch (error) {
        console.error("Error fetching map data:", error);
      }
    };
    fetchData();
  }, []);

  const getRegionCount = (regionName) => {
    const normalizedName = REGION_MAPPING[regionName] || regionName.toUpperCase();
    const regionData = mapData.find(
      (r) => r.regione?.toUpperCase() === normalizedName
    );
    return regionData?.totale || 0;
  };

  const getRegionData = (regionName) => {
    const normalizedName = REGION_MAPPING[regionName] || regionName.toUpperCase();
    return mapData.find((r) => r.regione?.toUpperCase() === normalizedName);
  };

  const getStyle = (feature) => {
    const count = getRegionCount(feature.properties.reg_name);
    const isSelected = selectedRegion === (REGION_MAPPING[feature.properties.reg_name] || feature.properties.reg_name.toUpperCase());
    
    let fillColor = "#1e293b";
    let fillOpacity = 0.3;
    
    if (count > 0) {
      if (count >= 5) {
        fillColor = "#1E90FF";
        fillOpacity = 0.6;
      } else if (count >= 3) {
        fillColor = "#3b82f6";
        fillOpacity = 0.5;
      } else {
        fillColor = "#60a5fa";
        fillOpacity = 0.4;
      }
    }
    
    return {
      fillColor: isSelected ? "#FFD700" : fillColor,
      weight: isSelected ? 3 : 1,
      opacity: 1,
      color: isSelected ? "#FFD700" : "#334155",
      fillOpacity: isSelected ? 0.5 : fillOpacity,
    };
  };

  const onEachFeature = (feature, layer) => {
    const regionName = REGION_MAPPING[feature.properties.reg_name] || feature.properties.reg_name.toUpperCase();
    const count = getRegionCount(feature.properties.reg_name);
    const regionData = getRegionData(feature.properties.reg_name);

    layer.bindTooltip(
      `<div class="text-center">
        <strong>${regionName}</strong><br/>
        <span class="text-blue-400">${count} ${count === 1 ? "socio" : "soci"}</span>
      </div>`,
      { permanent: false, direction: "center", className: "map-tooltip" }
    );

    layer.on({
      click: () => {
        setSelectedRegion(regionName);
        if (regionData && regionData.citta?.length > 0) {
          setSelectedCityData(regionData);
          setShowCityModal(true);
        }
      },
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 2,
          fillOpacity: 0.7,
        });
      },
      mouseout: (e) => {
        if (geoJsonRef.current) {
          geoJsonRef.current.resetStyle(e.target);
        }
      },
    });
  };

  const handleSocioClick = (socio) => {
    // Could open detail modal or navigate
    console.log("Selected socio:", socio);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <Card className="glass-card border-slate-800/60 lg:col-span-3" data-testid="mappa-italia">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100 text-xl flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-400" />
              Mappa Soci Italia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[600px] rounded-xl overflow-hidden border border-slate-800">
              <MapContainer
                center={[42.5, 12.5]}
                zoom={5.5}
                scrollWheelZoom={true}
                className="h-full w-full"
                style={{ background: "#020617" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {geoData && (
                  <GeoJSON
                    ref={geoJsonRef}
                    data={geoData}
                    style={getStyle}
                    onEachFeature={onEachFeature}
                  />
                )}
                <MapController selectedRegion={selectedRegion} />
              </MapContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#60a5fa] opacity-40"></div>
                <span>1-2 soci</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#3b82f6] opacity-50"></div>
                <span>3-4 soci</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#1E90FF] opacity-60"></div>
                <span>5+ soci</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Region List */}
        <Card className="glass-card border-slate-800/60" data-testid="regioni-list">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100 text-lg">Soci per Regione</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            <div className="space-y-2">
              {mapData
                .filter((r) => r.regione !== "Non specificata" && r.totale > 0)
                .sort((a, b) => b.totale - a.totale)
                .map((region) => (
                  <button
                    key={region.regione}
                    onClick={() => {
                      setSelectedRegion(region.regione);
                      setSelectedCityData(region);
                      setShowCityModal(true);
                    }}
                    className={`w-full p-3 rounded-lg flex items-center justify-between transition-all ${
                      selectedRegion === region.regione
                        ? "bg-blue-500/20 border border-blue-500/50"
                        : "bg-slate-900/50 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-slate-200 text-sm">{region.regione}</span>
                    <Badge
                      variant="outline"
                      className="bg-blue-500/20 text-blue-400 border-blue-500/50"
                    >
                      {region.totale}
                    </Badge>
                  </button>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* City/Soci Modal */}
      <Dialog open={showCityModal} onOpenChange={setShowCityModal}>
        <DialogContent className="glass-card border-slate-800 max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="city-modal">
          <DialogHeader>
            <DialogTitle className="text-slate-100 text-xl flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-400" />
                {selectedCityData?.regione}
              </span>
              <button
                onClick={() => setShowCityModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedCityData && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Users className="h-4 w-4" />
                <span>{selectedCityData.totale} soci in questa regione</span>
              </div>

              {selectedCityData.citta?.map((city) => (
                <div
                  key={city.nome || "no-city"}
                  className="p-4 rounded-xl bg-slate-900/50 border border-slate-800"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-slate-200 font-medium">
                      {city.nome || "Città non specificata"}
                    </h3>
                    <Badge variant="outline" className="bg-slate-800 text-slate-300">
                      {city.count} {city.count === 1 ? "socio" : "soci"}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {city.soci?.map((socio) => (
                      <div
                        key={socio.id}
                        className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-slate-100 font-medium">
                              {socio.nome} {socio.cognome}
                            </p>
                            {socio.carica && socio.carica !== "Socio" && (
                              <Badge
                                variant="outline"
                                className="mt-1 bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-xs"
                              >
                                {socio.carica}
                              </Badge>
                            )}
                          </div>
                          {socio.tipo_dispositivo && (
                            <Badge
                              variant="outline"
                              className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-xs"
                            >
                              {socio.tipo_dispositivo}
                            </Badge>
                          )}
                        </div>

                        <div className="mt-2 space-y-1">
                          {socio.citta && (
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <MapPin className="h-3 w-3" />
                              {socio.citta}
                            </div>
                          )}
                          {socio.telefono && (
                            <a
                              href={`tel:${socio.telefono}`}
                              className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400"
                            >
                              <Phone className="h-3 w-3" />
                              {socio.telefono}
                            </a>
                          )}
                          {socio.email && (
                            <a
                              href={`mailto:${socio.email}`}
                              className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400"
                            >
                              <Mail className="h-3 w-3" />
                              {socio.email}
                            </a>
                          )}
                          {socio.sito_web && (
                            <a
                              href={socio.sito_web.startsWith("http") ? socio.sito_web : `https://${socio.sito_web}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400"
                            >
                              <Globe className="h-3 w-3" />
                              {socio.sito_web}
                            </a>
                          )}
                        </div>

                        {socio.email && onContactSocio && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <Button
                              size="sm"
                              onClick={() => {
                                setShowCityModal(false);
                                onContactSocio(socio);
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                              data-testid={`contact-${socio.id}`}
                            >
                              <Send className="h-3 w-3 mr-2" />
                              Invia Comunicazione
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style>{`
        .map-tooltip {
          background: rgba(15, 23, 42, 0.95) !important;
          border: 1px solid #1e293b !important;
          border-radius: 8px !important;
          color: #f8fafc !important;
          padding: 8px 12px !important;
          font-family: 'DM Sans', sans-serif !important;
        }
        .map-tooltip::before {
          border-top-color: #1e293b !important;
        }
      `}</style>
    </>
  );
}
