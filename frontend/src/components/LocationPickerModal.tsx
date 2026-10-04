import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X, Navigation, Layers, Check, Search, AlertCircle, Compass, Building2, ShieldCheck, Map as MapIcon } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { loadZoneCoordinates, isPointInPolygon, calculatePolygonCenter, CoordinatePair } from '../utils/zoneHelper';

interface LocationPickerModalProps {
  isOpen: boolean;
  latitude: number | null;
  longitude: number | null;
  memberName?: string;
  streetNumber?: number;
  memberType?: 'RESIDENTIAL' | 'COMMERCIAL';
  onSave: (lat: number, lng: number) => void;
  onClose: () => void;
}

// Center of Al Thawra Al Khadraa / Sheikh Zayed, Egypt
const DEFAULT_CENTER: [number, number] = [30.0485, 30.9850];

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  latitude,
  longitude,
  memberName,
  streetNumber,
  memberType = 'RESIDENTIAL',
  onSave,
  onClose,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const zonePolygonRef = useRef<L.Polygon | null>(null);

  const [mapType, setMapType] = useState<'streets' | 'satellite'>('satellite');
  const [currentLat, setCurrentLat] = useState<number>(latitude ?? DEFAULT_CENTER[0]);
  const [currentLng, setCurrentLng] = useState<number>(longitude ?? DEFAULT_CENTER[1]);
  const [hasMarker, setHasMarker] = useState<boolean>(latitude !== null && longitude !== null);
  const [locating, setLocating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [pasteInput, setPasteInput] = useState<string>('');
  const [zoneCoords, setZoneCoords] = useState<CoordinatePair[]>([]);

  const isCommercial = memberType === 'COMMERCIAL';

  // Tile layers (Ultra-fast Google Hybrid Satellite + CartoDB Voyager Streets)
  const streetTiles = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const satelliteTiles = 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';


  // Load zone coordinates
  useEffect(() => {
    if (isOpen) {
      loadZoneCoordinates().then((coords) => {
        setZoneCoords(coords);
      }).catch(console.error);
    }
  }, [isOpen]);

  // Custom DivIcon for pin (tailored for commercial vs residential)
  const createCustomIcon = () => {
    const primaryColor = isCommercial ? '#4f46e5' : '#059669';
    const secondaryColor = isCommercial ? '#818cf8' : '#10b981';
    const ringColor = isCommercial ? 'rgba(79, 70, 229, 0.35)' : 'rgba(16, 185, 129, 0.35)';

    return L.divIcon({
      className: 'custom-picker-pin',
      html: `
        <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: grab;">
          <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: ${ringColor}; animation: pulse 2s infinite ease-in-out;"></div>
          <div style="position: relative; width: 30px; height: 30px; background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 14px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white;">
            ${
              isCommercial
                ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>`
                : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`
            }
          </div>
          <div style="position: absolute; bottom: 0px; left: 16px; width: 6px; height: 6px; background: ${primaryColor}; transform: rotate(45deg); border-right: 1px solid white; border-bottom: 1px solid white;"></div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 36],
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    const initialLat = latitude ?? DEFAULT_CENTER[0];
    const initialLng = longitude ?? DEFAULT_CENTER[1];
    setCurrentLat(initialLat);
    setCurrentLng(initialLng);
    setHasMarker(latitude !== null && longitude !== null);
    setErrorMsg('');

    // Wait for DOM container
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: latitude !== null ? 17 : 15,
          zoomControl: false,
        });

        L.control.zoom({ position: 'bottomleft' }).addTo(map);

        const initialLayer = L.tileLayer(mapType === 'satellite' ? satelliteTiles : streetTiles, {
          maxZoom: 20,
          subdomains: mapType === 'satellite' ? ['0', '1', '2', '3'] : 'abcd',
          attribution: mapType === 'satellite' ? '&copy; Google Maps' : '&copy; CARTO, OpenStreetMap',
        }).addTo(map);


        tileLayerRef.current = initialLayer;

        // Render Green Revolution Zone polygon if available
        if (zoneCoords.length >= 3) {
          const poly = L.polygon(zoneCoords, {
            color: '#10b981',
            weight: 2.5,
            dashArray: '6, 6',
            fillColor: '#10b981',
            fillOpacity: 0.12,
          }).addTo(map);
          poly.bindTooltip('🌿 نطاق منطقة الثورة الخضراء', { sticky: true });
          zonePolygonRef.current = poly;
        }

        if (latitude !== null && longitude !== null) {
          const marker = L.marker([initialLat, initialLng], {
            draggable: true,
            icon: createCustomIcon(),
          }).addTo(map);

          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            setCurrentLat(pos.lat);
            setCurrentLng(pos.lng);
            setHasMarker(true);
          });

          markerRef.current = marker;
        }

        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          setCurrentLat(lat);
          setCurrentLng(lng);
          setHasMarker(true);

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            const marker = L.marker([lat, lng], {
              draggable: true,
              icon: createCustomIcon(),
            }).addTo(map);

            marker.on('dragend', () => {
              const pos = marker.getLatLng();
              setCurrentLat(pos.lat);
              setCurrentLng(pos.lng);
            });

            markerRef.current = marker;
          }
        });

        mapInstanceRef.current = map;
      } else {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([initialLat, initialLng], latitude !== null ? 17 : 15);

        // Update zone polygon if updated
        if (zonePolygonRef.current && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(zonePolygonRef.current);
          zonePolygonRef.current = null;
        }
        if (zoneCoords.length >= 3 && mapInstanceRef.current) {
          const poly = L.polygon(zoneCoords, {
            color: '#10b981',
            weight: 2.5,
            dashArray: '6, 6',
            fillColor: '#10b981',
            fillOpacity: 0.12,
          }).addTo(mapInstanceRef.current);
          poly.bindTooltip('🌿 نطاق منطقة الثورة الخضراء', { sticky: true });
          zonePolygonRef.current = poly;
        }

        if (latitude !== null && longitude !== null) {
          if (markerRef.current) {
            markerRef.current.setLatLng([initialLat, initialLng]);
          } else {
            const marker = L.marker([initialLat, initialLng], {
              draggable: true,
              icon: createCustomIcon(),
            }).addTo(mapInstanceRef.current);
            markerRef.current = marker;
          }
        }
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, zoneCoords]);

  // Clean up map when modal fully closes
  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      tileLayerRef.current = null;
      zonePolygonRef.current = null;
    }
  }, [isOpen]);

  // Switch tile layer
  const toggleMapType = () => {
    const nextType = mapType === 'satellite' ? 'streets' : 'satellite';
    setMapType(nextType);
    if (mapInstanceRef.current && tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const newLayer = L.tileLayer(nextType === 'satellite' ? satelliteTiles : streetTiles, {
        maxZoom: 20,
        subdomains: nextType === 'satellite' ? ['0', '1', '2', '3'] : 'abcd',
        attribution: nextType === 'satellite' ? '&copy; Google Maps' : '&copy; CARTO, OpenStreetMap',
      }).addTo(mapInstanceRef.current);
      tileLayerRef.current = newLayer;
    }

  };

  // GPS Locate
  const handleGPS = () => {
    if (!navigator.geolocation) {
      setErrorMsg('المتصفح لا يدعم تحديد الموقع الجغرافي');
      return;
    }
    setLocating(true);
    setErrorMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentLat(lat);
        setCurrentLng(lng);
        setHasMarker(true);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 18);
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            const marker = L.marker([lat, lng], {
              draggable: true,
              icon: createCustomIcon(),
            }).addTo(mapInstanceRef.current);
            marker.on('dragend', () => {
              const p = marker.getLatLng();
              setCurrentLat(p.lat);
              setCurrentLng(p.lng);
            });
            markerRef.current = marker;
          }
        }
        setLocating(false);
      },
      () => {
        setErrorMsg('تعذر تحديد موقع GPS الحالي. يرجى التأكد من تفعيل الصلاحية.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  // Center on Al Thawra Al Khadraa Zone
  const handleCenterCompound = () => {
    if (mapInstanceRef.current) {
      if (zoneCoords.length >= 3) {
        const bounds = L.latLngBounds(zoneCoords as L.LatLngExpression[]);
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
      } else {
        mapInstanceRef.current.setView(DEFAULT_CENTER, 15);
      }
    }
  };

  // Parse pasted coordinates or Google Maps link
  const handleParsePaste = () => {
    setErrorMsg('');
    if (!pasteInput.trim()) return;

    let lat: number | null = null;
    let lng: number | null = null;

    // Pattern 1: coordinates like 30.0485, 30.9850 or @30.0485,30.9850
    const coordsMatch = pasteInput.match(/([+-]?\d+\.\d+)[,\s]+([+-]?\d+\.\d+)/);
    if (coordsMatch) {
      lat = parseFloat(coordsMatch[1]);
      lng = parseFloat(coordsMatch[2]);
    } else {
      // Pattern 2: ?q=lat,lng
      const qMatch = pasteInput.match(/[?&]q=([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
      if (qMatch) {
        lat = parseFloat(qMatch[1]);
        lng = parseFloat(qMatch[2]);
      }
    }

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      setCurrentLat(lat);
      setCurrentLng(lng);
      setHasMarker(true);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], 18);
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const marker = L.marker([lat, lng], {
            draggable: true,
            icon: createCustomIcon(),
          }).addTo(mapInstanceRef.current);
          marker.on('dragend', () => {
            const p = marker.getLatLng();
            setCurrentLat(p.lat);
            setCurrentLng(p.lng);
          });
          markerRef.current = marker;
        }
      }
      setPasteInput('');
    } else {
      setErrorMsg('تعذر استخراج الإحداثيات من النص المدخل. تأكد من إدخال رابط خرائط جوجل أو إحداثيات مثل 30.0485, 30.9850');
    }
  };

  const handleSave = () => {
    if (!hasMarker) {
      setErrorMsg('يرجى النقر على الخريطة لتحديد مكان العقار أولاً');
      return;
    }
    onSave(currentLat, currentLng);
    onClose();
  };

  const isInsideZone = hasMarker && zoneCoords.length >= 3
    ? isPointInPolygon([currentLat, currentLng], zoneCoords)
    : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-4xl h-[92vh] sm:h-[88vh] max-h-[820px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div
          className={`px-4 sm:px-6 py-3.5 text-white flex items-center justify-between shrink-0 ${
            isCommercial
              ? 'bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900'
              : 'bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                isCommercial
                  ? 'bg-indigo-500/20 border-indigo-400/30 text-indigo-300'
                  : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
              }`}
            >
              {isCommercial ? <Building2 className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-tight">
                  {isCommercial ? 'تحديد الموقع الجغرافي للنشاط التجاري' : 'تحديد الموقع الجغرافي للعقار'}
                </h2>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                    isCommercial
                      ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40'
                      : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                  }`}
                >
                  {isCommercial ? 'جهة تجارية' : 'عضو سكني'}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span>الثورة الخضراء</span>
                {memberName && (
                  <>
                    <span>•</span>
                    <span className="font-bold text-white">{memberName}</span>
                  </>
                )}
                {streetNumber && (
                  <>
                    <span>•</span>
                    <span className="bg-white/10 px-2 py-0.2 rounded-md font-bold text-white text-[10px]">
                      شارع {streetNumber}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Search Helper (Responsive) */}
        <div className="p-2.5 sm:p-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <input
                type="text"
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleParsePaste()}
                placeholder="ألصق رابط خرائط جوجل أو إحداثيات (30.048, 30.985)..."
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-mono focus:border-emerald-500 focus:outline-none placeholder:text-slate-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <button
              type="button"
              onClick={handleParsePaste}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold shrink-0 transition-colors"
            >
              تطبيق
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-between md:justify-end">
            <button
              type="button"
              onClick={toggleMapType}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold transition-colors shadow-sm"
              title="تبديل بين القمر الصناعي والخريطة الجغرافية"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>{mapType === 'satellite' ? 'قمر صناعي 🛰️' : 'شوارع 🗺️'}</span>
            </button>

            <button
              type="button"
              onClick={handleGPS}
              disabled={locating}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold transition-colors disabled:opacity-50 shadow-sm"
              title="تحديد موقعي الحالي الميداني GPS"
            >
              <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'جاري التحديد...' : 'موقعي GPS'}</span>
            </button>

            <button
              type="button"
              onClick={handleCenterCompound}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold transition-colors shadow-sm"
              title="توسيط الخريطة على زون الثورة الخضراء"
            >
              <Compass className="w-3.5 h-3.5 text-slate-500" />
              <span>زون الثورة الخضراء</span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Interactive Map Area */}
        <div className="flex-1 relative bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Map Helper Floating Hint */}
          <div className="absolute top-2.5 right-2.5 left-2.5 sm:left-auto z-20 bg-slate-900/85 backdrop-blur-md text-white text-[11px] px-3 py-2 rounded-2xl shadow-xl border border-slate-700 pointer-events-none flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
            <span className="truncate sm:whitespace-normal">
              انقر على موقع العقار لوضع الدبوس، أو اسحب الدبوس لتعديل موقعه بدقة
            </span>
          </div>
        </div>

        {/* Footer & Actions (Responsive for mobile & laptop) */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {hasMarker ? (
              <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-slate-800 font-bold flex-wrap">
                <MapPin className={`w-4 h-4 ${isCommercial ? 'text-indigo-600' : 'text-emerald-600'}`} />
                <span>{currentLat.toFixed(6)}, {currentLng.toFixed(6)}</span>
                {isInsideZone !== null && (
                  <span
                    className={`font-sans text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                      isInsideZone
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {isInsideZone ? '✓ داخل زون الثورة الخضراء' : '⚠️ خارج نطاق الزون المعتمد'}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-semibold py-1">
                لم يتم تحديد نقطة على الخريطة بعد (انقر على الخريطة)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasMarker}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50 ${
                isCommercial
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-700/25'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-700/20'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>تأكيد وحفظ الموقع</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
