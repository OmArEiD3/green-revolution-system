import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MapPin, Layers, Navigation, Compass, Search, Filter,
  Phone, Shield, User, ChevronLeft, ChevronRight, CheckCircle2,
  AlertTriangle, DollarSign, ExternalLink, Edit3, X, Eye, EyeOff,
  Sparkles, Building2, Save, RotateCcw, Trash2, CreditCard
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Member, Practice } from '../types';
import { membersApi, practicesApi } from '../api/client';
import { LocationPickerModal } from './LocationPickerModal';
import {
  loadZoneCoordinates,
  saveZoneCoordinates,
  resetZoneCoordinates,
  CoordinatePair
} from '../utils/zoneHelper';

interface LiveMapViewProps {
  year: number;
  month: number;
  onSelectMember: (memberId: number) => void;
  onRecordPayment?: (practiceId: number, memberId: number) => void;
}

// Al Thawra Al Khadraa / Sheikh Zayed Center Coordinates
const DEFAULT_CENTER: [number, number] = [30.0485, 30.9850];

// High-speed tile endpoints:
// Google Hybrid (lyrs=y) = Satellite photography + crystal clear street names & villa labels in Egypt
const TILE_CONFIGS = {
  hybrid: {
    name: 'قمر صناعي هجين 🛰️',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps',
  },
  streets: {
    name: 'خريطة شوارع 🗺️',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
    attribution: '&copy; CARTO, OpenStreetMap',
  },
  satellite: {
    name: 'قمر صناعي نقي 🌍',
    url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps',
  },
};

type MapLayerType = 'hybrid' | 'streets' | 'satellite';

export const LiveMapView: React.FC<LiveMapViewProps> = ({
  year,
  month,
  onSelectMember,
  onRecordPayment,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);

  // Zone map layers
  const zonePolygonLayerRef = useRef<L.Polygon | null>(null);
  const zoneVerticesLayerRef = useRef<L.LayerGroup | null>(null);

  // Data states
  const [members, setMembers] = useState<Member[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Zone states
  const [zoneCoords, setZoneCoords] = useState<CoordinatePair[]>([]);
  const [showZone, setShowZone] = useState<boolean>(true);
  const [isEditingZone, setIsEditingZone] = useState<boolean>(false);
  const [zoneEditVertices, setZoneEditVertices] = useState<CoordinatePair[]>([]);

  // UI & Filter states
  const [mapType, setMapType] = useState<MapLayerType>('hybrid');
  const [selectedStreet, setSelectedStreet] = useState<string>('ALL');
  const [memberTypeFilter, setMemberTypeFilter] = useState<'ALL' | 'RESIDENTIAL' | 'COMMERCIAL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'DUE' | 'NO_COORDS'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [sidebarTab, setSidebarTab] = useState<'plotted' | 'unplotted'>('plotted');

  // Quick Pick & Edit States
  const [placingMember, setPlacingMember] = useState<Member | null>(null);
  const [editingMemberLocation, setEditingMemberLocation] = useState<Member | null>(null);
  const [locatingUser, setLocatingUser] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  // Refs for map click handlers to prevent map recreation on state changes
  const placingMemberRef = useRef<Member | null>(null);
  const isEditingZoneRef = useRef<boolean>(false);

  useEffect(() => {
    placingMemberRef.current = placingMember;
  }, [placingMember]);

  useEffect(() => {
    isEditingZoneRef.current = isEditingZone;
  }, [isEditingZone]);

  // Month names in Arabic
  const monthNames = [
    '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  // Load all members and current practices
  const loadData = async () => {
    setLoading(true);
    try {
      const [membersData, practicesData, zoneData] = await Promise.all([
        membersApi.list({ member_type: 'ALL' }),
        practicesApi.list({ year, month }),
        loadZoneCoordinates(),
      ]);
      setMembers(membersData);
      setPractices(practicesData);
      setZoneCoords(zoneData);
      setZoneEditVertices(zoneData);
    } catch (err) {
      console.error('Error loading map data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year, month]);

  // Keep zoneEditVertices in sync with zoneCoords when not editing
  useEffect(() => {
    if (!isEditingZone) {
      setZoneEditVertices(zoneCoords);
    }
  }, [zoneCoords, isEditingZone]);

  // Map practice financial status per member
  const memberFinancialStatus = useMemo(() => {
    const map = new Map<number, {
      status: 'FULLY_PAID' | 'PARTIAL' | 'UNPAID' | 'NO_PRACTICE';
      practiceId?: number;
      required: number;
      paid: number;
      remaining: number;
      overpayment: number;
    }>();

    members.forEach((m) => {
      const memberPractices = practices.filter((p) => p.member === m.id && !p.notes?.includes('[DELETED]'));
      if (memberPractices.length === 0) {
        map.set(m.id, {
          status: 'NO_PRACTICE',
          required: 0,
          paid: 0,
          remaining: 0,
          overpayment: 0,
        });
      } else {
        const required = memberPractices.reduce((s, p) => s + Number(p.required_amount || 0), 0);
        const paid = memberPractices.reduce((s, p) => s + Number(p.total_paid || 0), 0);
        const remaining = memberPractices.reduce((s, p) => s + Number(p.remaining_amount || 0), 0);
        const overpayment = memberPractices.reduce((s, p) => s + Number(p.overpayment_amount || 0), 0);

        let status: 'FULLY_PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
        if (remaining <= 0 && required > 0) {
          status = 'FULLY_PAID';
        } else if (paid > 0 && remaining > 0) {
          status = 'PARTIAL';
        }

        map.set(m.id, {
          status,
          practiceId: memberPractices[0]?.id,
          required,
          paid,
          remaining,
          overpayment,
        });
      }
    });

    return map;
  }, [members, practices]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Member type filter
      if (memberTypeFilter !== 'ALL' && m.member_type !== memberTypeFilter) {
        return false;
      }
      // Street filter
      if (selectedStreet !== 'ALL' && String(m.street_number) !== selectedStreet) {
        return false;
      }
      // Status filter
      const fin = memberFinancialStatus.get(m.id);
      const hasCoords = m.latitude != null && m.longitude != null;
      if (statusFilter === 'NO_COORDS' && hasCoords) return false;
      if (statusFilter === 'PAID' && fin?.status !== 'FULLY_PAID') return false;
      if (statusFilter === 'DUE' && fin?.status !== 'UNPAID' && fin?.status !== 'PARTIAL') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = m.full_name?.toLowerCase().includes(q);
        const mobileMatch = m.mobile_number?.toLowerCase().includes(q);
        const guardMatch = m.guard_name?.toLowerCase().includes(q) || m.guard_mobile?.includes(q);
        const idMatch = String(m.id) === q;
        if (!nameMatch && !mobileMatch && !guardMatch && !idMatch) {
          return false;
        }
      }
      return true;
    });
  }, [members, memberTypeFilter, selectedStreet, statusFilter, searchQuery, memberFinancialStatus]);

  const plottedMembers = useMemo(() => {
    return filteredMembers.filter((m) => m.latitude != null && m.longitude != null);
  }, [filteredMembers]);

  const unplottedMembers = useMemo(() => {
    return filteredMembers.filter((m) => m.latitude == null || m.longitude == null);
  }, [filteredMembers]);

  // Financial summary numbers for the top status pill
  const financialTotals = useMemo(() => {
    let totalReq = 0;
    let totalCollected = 0;
    let totalDue = 0;

    practices.forEach((p) => {
      if (!p.notes?.includes('[DELETED]')) {
        totalReq += Number(p.required_amount || 0);
        totalCollected += Number(p.total_paid || 0);
        totalDue += Number(p.remaining_amount || 0);
      }
    });

    return { totalReq, totalCollected, totalDue };
  }, [practices]);

  // Create custom modern HTML pin for Leaflet
  const createMarkerIcon = (member: Member) => {
    const fin = memberFinancialStatus.get(member.id);
    const isCommercial = member.member_type === 'COMMERCIAL';

    let pinColor = '#059669'; // Emerald Green (paid)
    let ringColor = 'rgba(16, 185, 129, 0.4)';
    const badgeText = `${member.street_number}`;

    if (isCommercial) {
      pinColor = '#4f46e5'; // Indigo (commercial)
      ringColor = 'rgba(79, 70, 229, 0.45)';
    } else if (fin?.status === 'UNPAID') {
      pinColor = '#e11d48'; // Rose Red (unpaid)
      ringColor = 'rgba(225, 29, 72, 0.4)';
    } else if (fin?.status === 'PARTIAL') {
      pinColor = '#d97706'; // Amber (partial)
      ringColor = 'rgba(217, 119, 6, 0.4)';
    } else if (fin?.status === 'NO_PRACTICE') {
      pinColor = '#64748b'; // Slate
      ringColor = 'rgba(100, 116, 139, 0.3)';
    }

    return L.divIcon({
      className: 'live-map-custom-pin',
      html: `
        <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);">
          <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: ${ringColor};"></div>
          <div style="position: relative; width: 30px; height: 30px; background: ${pinColor}; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 11px; font-family: Cairo, system-ui, sans-serif;">
            ${
              isCommercial
                ? `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1;">
                     <span style="font-size: 8px;">🏢</span>
                     <span style="font-size: 9px;">${badgeText}</span>
                   </div>`
                : `<span>${badgeText}</span>`
            }
          </div>
          <div style="position: absolute; bottom: 0px; left: 16px; width: 6px; height: 6px; background: ${pinColor}; transform: rotate(45deg); border-right: 1px solid white; border-bottom: 1px solid white;"></div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 36],
      popupAnchor: [0, -36],
    });
  };

  // Vertex icon for manual zone editing
  const createVertexIcon = (index: number) => {
    return L.divIcon({
      className: 'zone-vertex-pin',
      html: `
        <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: grab;">
          <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: rgba(16, 185, 129, 0.4); animation: pulse 1.5s infinite;"></div>
          <div style="width: 20px; height: 20px; border-radius: 50%; background: #059669; border: 2.5px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 900; font-family: Cairo, system-ui, sans-serif;">
            ${index + 1}
          </div>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
  };

  // Switch map layer safely and quickly
  const applyTileLayer = (type: MapLayerType) => {
    if (!mapInstanceRef.current) return;
    const config = TILE_CONFIGS[type];

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const newLayer = L.tileLayer(config.url, {
      maxZoom: config.maxZoom,
      subdomains: config.subdomains,
      attribution: config.attribution,
    }).addTo(mapInstanceRef.current);

    // Keep tiles beneath markers
    newLayer.bringToBack();
    tileLayerRef.current = newLayer;
  };

  const handleSelectMapLayer = (type: MapLayerType) => {
    setMapType(type);
    applyTileLayer(type);
  };

  // Initialize Map ONCE on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 15,
      zoomControl: false,
      preferCanvas: true, // Hardware-accelerated rendering
    });

    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    // Initial tile layer (Google Hybrid by default for speed & clarity)
    const initialConfig = TILE_CONFIGS[mapType];
    const initialLayer = L.tileLayer(initialConfig.url, {
      maxZoom: initialConfig.maxZoom,
      subdomains: initialConfig.subdomains,
      attribution: initialConfig.attribution,
    }).addTo(map);
    tileLayerRef.current = initialLayer;

    // Layer groups for markers
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    const verticesGroup = L.layerGroup().addTo(map);
    zoneVerticesLayerRef.current = verticesGroup;

    // Handle map clicks dynamically using current ref values
    map.on('click', async (e: L.LeafletMouseEvent) => {
      // 1. Placing member mode
      if (placingMemberRef.current) {
        const targetMember = placingMemberRef.current;
        const { lat, lng } = e.latlng;
        try {
          await membersApi.update(targetMember.id, {
            latitude: lat,
            longitude: lng,
          });
          setActionSuccessMsg(`تم تحديد موقع "${targetMember.full_name}" بنجاح!`);
          setTimeout(() => setActionSuccessMsg(''), 4000);
          setPlacingMember(null);
          await loadData();
        } catch (err) {
          console.error('Error saving member coordinates:', err);
        }
        return;
      }

      // 2. Editing Zone polygon vertices mode: clicking map adds a new point
      if (isEditingZoneRef.current) {
        const { lat, lng } = e.latlng;
        setZoneEditVertices((prev) => [...prev, [lat, lng]]);
      }
    });

    mapInstanceRef.current = map;

    // Invalidate map size after DOM layout settles to prevent grey squares or layout lag
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // Run ONLY once on mount!

  // Render Green Revolution Zone Polygon
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (zonePolygonLayerRef.current) {
      mapInstanceRef.current.removeLayer(zonePolygonLayerRef.current);
      zonePolygonLayerRef.current = null;
    }

    const activePolygon = isEditingZone ? zoneEditVertices : zoneCoords;

    if (showZone && activePolygon.length >= 3) {
      const polygon = L.polygon(activePolygon as L.LatLngExpression[], {
        color: isEditingZone ? '#d97706' : '#10b981',
        weight: isEditingZone ? 3.5 : 2.5,
        dashArray: isEditingZone ? '4, 4' : '6, 6',
        fillColor: isEditingZone ? '#f59e0b' : '#10b981',
        fillOpacity: isEditingZone ? 0.2 : 0.12,
      }).addTo(mapInstanceRef.current);

      polygon.bindTooltip(
        isEditingZone ? '✏️ جاري تعديل زون الثورة الخضراء' : '🌿 منطقة الثورة الخضراء (الشوارع 1 - 20)',
        { sticky: true }
      );

      zonePolygonLayerRef.current = polygon;
    }
  }, [showZone, zoneCoords, zoneEditVertices, isEditingZone]);

  // Render Vertex Markers when editing Zone
  useEffect(() => {
    if (!mapInstanceRef.current || !zoneVerticesLayerRef.current) return;

    zoneVerticesLayerRef.current.clearLayers();

    if (!isEditingZone) return;

    zoneEditVertices.forEach((coord, idx) => {
      const marker = L.marker(coord, {
        draggable: true,
        icon: createVertexIcon(idx),
      });

      marker.on('drag', () => {
        const pos = marker.getLatLng();
        setZoneEditVertices((prev) => {
          const next = [...prev];
          next[idx] = [pos.lat, pos.lng];
          return next;
        });
      });

      marker.bindPopup(`
        <div style="direction: rtl; text-align: center; font-family: Cairo, system-ui, sans-serif; padding: 4px;">
          <div style="font-weight: 800; font-size: 11px; margin-bottom: 4px;">نقطة الزون #${idx + 1}</div>
          <button id="btn-del-vertex-${idx}" style="background: #e11d48; color: white; border: none; border-radius: 6px; padding: 4px 8px; font-size: 10px; font-weight: 800; cursor: pointer;">
            🗑️ حذف هذه النقطة
          </button>
        </div>
      `);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-del-vertex-${idx}`);
        if (btn) {
          btn.onclick = () => {
            if (zoneEditVertices.length <= 3) {
              alert('لا يمكن حذف النقطة؛ يجب أن يحتوي الزون على 3 نقاط على الأقل.');
              return;
            }
            setZoneEditVertices((prev) => prev.filter((_, i) => i !== idx));
          };
        }
      });

      zoneVerticesLayerRef.current?.addLayer(marker);
    });
  }, [isEditingZone, zoneEditVertices]);

  // Save updated zone
  const handleSaveZone = async () => {
    if (zoneEditVertices.length < 3) {
      alert('يجب تحديد 3 نقاط على الأقل لتكوين زون صحيح');
      return;
    }
    try {
      await saveZoneCoordinates(zoneEditVertices);
      setZoneCoords(zoneEditVertices);
      setIsEditingZone(false);
      setActionSuccessMsg('تم حفظ حدود زون الثورة الخضراء بنجاح! 🌿');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء حفظ الزون');
    }
  };

  // Reset zone to default
  const handleResetZone = async () => {
    if (!window.confirm('هل أنت متأكد من استعادة حدود الزون الافتراضية لمنطقة الثورة الخضراء؟')) return;
    try {
      const def = await resetZoneCoordinates();
      setZoneCoords(def);
      setZoneEditVertices(def);
      setIsEditingZone(false);
      setActionSuccessMsg('تم استعادة حدود الزون الافتراضية بنجاح!');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  // Render Plotted Member Markers efficiently
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    plottedMembers.forEach((member) => {
      const lat = Number(member.latitude);
      const lng = Number(member.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const fin = memberFinancialStatus.get(member.id);
      const isCommercial = member.member_type === 'COMMERCIAL';

      const marker = L.marker([lat, lng], {
        icon: createMarkerIcon(member),
      });

      // Construct interactive popup content
      const popupHtml = `
        <div style="direction: rtl; text-align: right; font-family: Cairo, system-ui, sans-serif; min-width: 250px; max-width: 290px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 900; font-size: 14px; color: #0f172a;">${member.full_name}</div>
              <div style="font-size: 11px; color: #64748b; font-weight: 700;">
                شارع ${member.street_number} • ${isCommercial ? '🏢 نشاط تجاري مستقل' : '🏡 عقار سكني'}
              </div>
            </div>
            <span style="font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 8px; background: ${
              isCommercial
                ? '#e0e7ff; color: #4338ca;'
                : fin?.status === 'FULLY_PAID'
                ? '#dcfce7; color: #15803d;'
                : fin?.status === 'PARTIAL'
                ? '#fef3c7; color: #b45309;'
                : '#ffe4e6; color: #be123c;'
            }">
              ${isCommercial ? 'تجاري' : fin?.status === 'FULLY_PAID' ? 'مسدد' : fin?.status === 'PARTIAL' ? 'سداد جزئي' : 'مستحق'}
            </span>
          </div>

          <div style="background: #f8fafc; padding: 8px; border-radius: 12px; margin-bottom: 10px; font-size: 11px; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #64748b;">مستحق شهر ${monthNames[month]}:</span>
              <span style="font-weight: 900; color: #0f172a;">${fin?.required || 0} ج.م</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #64748b;">المدفوع:</span>
              <span style="font-weight: 900; color: #16a34a;">${fin?.paid || 0} ج.م</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">المتبقي:</span>
              <span style="font-weight: 900; color: ${fin?.remaining ? '#dc2626' : '#64748b'};">${fin?.remaining || 0} ج.م</span>
            </div>
          </div>

          ${
            member.mobile_number
              ? `<div style="font-size: 11px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
                  <span style="color: #64748b;">الموبايل:</span>
                  <a href="tel:${member.mobile_number}" style="font-weight: 800; color: #059669; text-decoration: none; font-family: monospace;">
                    📞 ${member.mobile_number}
                  </a>
                </div>`
              : ''
          }

          ${
            member.has_guard
              ? `<div style="font-size: 11px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                  <span style="color: #64748b;">الغفير (${member.guard_name || 'مسجل'}):</span>
                  ${member.guard_mobile ? `<a href="tel:${member.guard_mobile}" style="font-weight: 800; color: #059669; text-decoration: none; font-family: monospace;">📞 ${member.guard_mobile}</a>` : '<span style="color: #94a3b8;">بدون هاتف</span>'}
                </div>`
              : ''
          }

          <div style="display: flex; flex-direction: column; gap: 5px; margin-top: 8px; border-top: 1px solid #f1f5f9; padding-top: 6px;">
            <button
              id="btn-statement-${member.id}"
              style="width: 100%; padding: 6px; border-radius: 8px; background: #059669; color: white; border: none; font-weight: 800; font-size: 11px; cursor: pointer;"
            >
              📄 كشف الحساب والمستحقات
            </button>

            ${
              onRecordPayment && fin?.practiceId
                ? `<button
                    id="btn-quick-pay-${member.id}"
                    style="width: 100%; padding: 6px; border-radius: 8px; background: #2563eb; color: white; border: none; font-weight: 800; font-size: 11px; cursor: pointer;"
                  >
                    💵 تسجيل دفعة سريعة
                  </button>`
                : ''
            }

            <div style="display: flex; gap: 4px;">
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}"
                target="_blank"
                rel="noreferrer"
                style="flex: 1; text-align: center; padding: 5px; border-radius: 8px; background: #f1f5f9; color: #334155; text-decoration: none; font-weight: 700; font-size: 10px;"
              >
                🧭 توجيه GPS
              </a>
              <button
                id="btn-editloc-${member.id}"
                style="flex: 1; padding: 5px; border-radius: 8px; background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; font-weight: 700; font-size: 10px; cursor: pointer;"
              >
                📍 تعديل الموقع
              </button>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'custom-leaflet-popup',
      });

      marker.on('popupopen', () => {
        const stmtBtn = document.getElementById(`btn-statement-${member.id}`);
        if (stmtBtn) {
          stmtBtn.onclick = () => onSelectMember(member.id);
        }

        const payBtn = document.getElementById(`btn-quick-pay-${member.id}`);
        if (payBtn && onRecordPayment && fin?.practiceId) {
          payBtn.onclick = () => onRecordPayment(fin.practiceId!, member.id);
        }

        const editLocBtn = document.getElementById(`btn-editloc-${member.id}`);
        if (editLocBtn) {
          editLocBtn.onclick = () => setEditingMemberLocation(member);
        }
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [plottedMembers, memberFinancialStatus, onRecordPayment]);

  // Center on compound zone or plotted members
  const handleCenterCompound = () => {
    if (!mapInstanceRef.current) return;

    if (plottedMembers.length > 0) {
      const bounds = L.latLngBounds(plottedMembers.map((m) => [Number(m.latitude), Number(m.longitude)]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    } else if (zoneCoords.length >= 3) {
      const bounds = L.latLngBounds(zoneCoords as L.LatLngExpression[]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else {
      mapInstanceRef.current.setView(DEFAULT_CENTER, 15);
    }
  };

  // Fly smoothly to a specific member
  const handleFlyToMember = (member: Member) => {
    if (member.latitude != null && member.longitude != null && mapInstanceRef.current) {
      const lat = Number(member.latitude);
      const lng = Number(member.longitude);
      mapInstanceRef.current.flyTo([lat, lng], 18, {
        duration: 1.0,
      });

      if (markersLayerRef.current) {
        markersLayerRef.current.eachLayer((layer: any) => {
          if (layer.getLatLng && Math.abs(layer.getLatLng().lat - lat) < 0.00001 && Math.abs(layer.getLatLng().lng - lng) < 0.00001) {
            setTimeout(() => layer.openPopup(), 1050);
          }
        });
      }

      if (window.innerWidth < 640) {
        setIsSidebarOpen(false);
      }
    }
  };

  // GPS Locate User
  const handleGPSUser = () => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم تحديد الموقع الجغرافي');
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 17);

          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            const userIcon = L.divIcon({
              className: 'user-radar-pin',
              html: `
                <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                  <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(59, 130, 246, 0.4); animation: ping 1.5s infinite ease-out;"></div>
                  <div style="width: 16px; height: 16px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(37,99,235,0.6);"></div>
                </div>
              `,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            });

            const marker = L.marker([latitude, longitude], { icon: userIcon }).addTo(mapInstanceRef.current);
            marker.bindPopup('<div style="text-align: center; font-weight: bold; font-family: Cairo;">📍 موقعك الميداني الحالي</div>');
            userLocationMarkerRef.current = marker;
          }
        }
        setLocatingUser(false);
      },
      () => {
        alert('تعذر الوصول إلى موقع GPS الحالي. يرجى التأكد من تفعيل صلاحية الموقع.');
        setLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="relative w-full h-[calc(100vh-130px)] min-h-[550px] rounded-3xl overflow-hidden border border-slate-200/90 shadow-2xl flex flex-col bg-slate-900 selection:bg-emerald-500">
      
      {/* Top Floating Control Bar */}
      <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 right-2.5 sm:right-3 z-30 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pointer-events-none">
        
        {/* Left Action Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto flex-wrap">
          {/* Drawer Toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/95 backdrop-blur-md text-slate-800 font-black text-xs shadow-xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-emerald-700" />
            <span>العقارات ({plottedMembers.length})</span>
            {isSidebarOpen ? <ChevronRight className="w-3 h-3 text-slate-400" /> : <ChevronLeft className="w-3 h-3 text-slate-400" />}
          </button>

          {/* Layer Switcher Buttons */}
          <div className="flex items-center bg-white/95 backdrop-blur-md p-0.5 rounded-2xl border border-slate-200 shadow-xl">
            <button
              onClick={() => handleSelectMapLayer('hybrid')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                mapType === 'hybrid'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="قمر صناعي هجين فائق السرعة مع أسماء الشوارع"
            >
              🛰️ هجين
            </button>
            <button
              onClick={() => handleSelectMapLayer('streets')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                mapType === 'streets'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="خريطة شوارع حديثة تفصيلية"
            >
              🗺️ شوارع
            </button>
            <button
              onClick={() => handleSelectMapLayer('satellite')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer hidden sm:block ${
                mapType === 'satellite'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="قمر صناعي نقي بدون أسماء"
            >
              🌍 نقي
            </button>
          </div>

          {/* Toggle Zone Visibility */}
          <button
            onClick={() => setShowZone(!showZone)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl backdrop-blur-md font-black text-xs shadow-xl border transition-all active:scale-95 cursor-pointer ${
              showZone
                ? 'bg-emerald-50/95 text-emerald-900 border-emerald-300'
                : 'bg-white/95 text-slate-600 border-slate-200'
            }`}
            title="إظهار أو إخفاء حدود زون الثورة الخضراء"
          >
            {showZone ? <Eye className="w-3.5 h-3.5 text-emerald-700" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline">زون الثورة الخضراء</span>
          </button>

          {/* Manual Zone Edit Mode Trigger */}
          <button
            onClick={() => setIsEditingZone(!isEditingZone)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl backdrop-blur-md font-black text-xs shadow-xl border transition-all active:scale-95 cursor-pointer ${
              isEditingZone
                ? 'bg-amber-600 text-white border-amber-400 animate-pulse'
                : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-slate-50'
            }`}
            title="تحديد وتعديل حدود زون الثورة الخضراء يدوياً"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">{isEditingZone ? 'إنهاء التعديل' : 'تعديل الزون'}</span>
          </button>

          {/* Center Map */}
          <button
            onClick={handleCenterCompound}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/95 backdrop-blur-md text-slate-800 font-bold text-xs shadow-xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
            title="توسيط الخريطة على العقارات الموقعة"
          >
            <Compass className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">توسيط</span>
          </button>

          {/* GPS Locate User */}
          <button
            onClick={handleGPSUser}
            disabled={locatingUser}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-50/95 backdrop-blur-md text-emerald-900 border border-emerald-300 font-black text-xs shadow-xl hover:bg-emerald-100 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
            title="موقعي الحالي الميداني GPS"
          >
            <Navigation className={`w-3.5 h-3.5 text-emerald-700 ${locatingUser ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">موقعي GPS</span>
          </button>
        </div>

        {/* Right Status Badges */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="hidden lg:flex items-center gap-3 bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold">
            <span className="text-emerald-400">
              موقع: {plottedMembers.length}/{members.length}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-amber-300">
              المتبقي: {financialTotals.totalDue.toLocaleString()} ج.م
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl shadow-xl border border-slate-700 text-[11px] sm:text-xs font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="hidden sm:inline">الخريطة الحية</span>
            <span className="text-emerald-400 font-mono">({monthNames[month]} {year})</span>
          </div>
        </div>
      </div>

      {/* Manual Zone Editor Floating Toolbar */}
      {isEditingZone && (
        <div className="absolute top-14 sm:top-16 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 z-40 bg-gradient-to-r from-amber-700 via-slate-900 to-amber-800 text-white p-3.5 sm:px-5 sm:py-3 rounded-2xl shadow-2xl border-2 border-amber-400 flex flex-col sm:flex-row items-center justify-between gap-3 animate-slide-up pointer-events-auto">
          <div className="flex items-center gap-2.5 text-xs text-right w-full sm:w-auto">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-black text-sm">وضع رسم وتعديل زون الثورة الخضراء 🌿</div>
              <div className="text-[11px] text-amber-200 mt-0.5">
                انقر على الخريطة لإضافة نقطة، أو اسحب النقاط لتعديل الحدود ({zoneEditVertices.length} نقطة محددة)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
            <button
              onClick={handleSaveZone}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ الزون</span>
            </button>

            <button
              onClick={() => setZoneEditVertices([])}
              className="px-2.5 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer"
              title="مسح النقاط والبدء من جديد"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleResetZone}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
              title="إعادة تعيين إلى الحدود الافتراضية للثورة الخضراء"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                setZoneEditVertices(zoneCoords);
                setIsEditingZone(false);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Mode Alert: Placing Member Pin */}
      {placingMember && (
        <div className="absolute top-14 sm:top-16 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 z-40 bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl shadow-2xl border-2 border-amber-300 flex items-center justify-between gap-3 animate-bounce pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-white shrink-0 animate-pulse" />
            <div className="text-xs">
              <span className="font-bold">وضع تحديد موقع: </span>
              <span className="font-black underline">{placingMember.full_name}</span> (شارع {placingMember.street_number})
              <div className="text-[11px] text-amber-100 mt-0.5">انقر على الخريطة في المكان المحدد لحفظ موقعه فوراً</div>
            </div>
          </div>
          <button
            onClick={() => setPlacingMember(null)}
            className="w-7 h-7 rounded-xl bg-black/20 hover:bg-black/30 flex items-center justify-center text-white shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Notification Alert */}
      {actionSuccessMsg && (
        <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-40 bg-emerald-700 text-white px-5 py-2.5 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-2 text-xs font-bold animate-slide-up pointer-events-auto">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Map Canvas */}
      <div className="w-full h-full relative">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Legend Overlay at bottom-right */}
        <div className="absolute bottom-3 right-3 z-20 bg-slate-950/85 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-white text-[11px] shadow-2xl flex flex-col gap-1.5 hidden md:flex pointer-events-none">
          <div className="font-black text-slate-300 border-b border-slate-800 pb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>دليل الخريطة</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></span>
            <span>مسدد بالكامل لهذا الشهر</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-white"></span>
            <span>سداد جزئي</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-600 border border-white"></span>
            <span>مستحق الدفع / متبقي</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500 border border-white"></span>
            <span>نشاط تجاري (مستقل) 🏢</span>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800 text-emerald-400 font-bold">
            <span className="w-3 h-1 bg-emerald-400 border border-white rounded"></span>
            <span>نطاق زون الثورة الخضراء 🌿</span>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="sm:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Floating Side Drawer / Property Panel */}
      <div
        className={`absolute top-14 sm:top-16 right-2 sm:right-3 bottom-2 sm:bottom-3 w-[calc(100%-16px)] sm:w-96 max-w-sm z-30 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ${
          isSidebarOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-[110%] opacity-0 pointer-events-none'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm">عقارات الثورة الخضراء</h3>
              <p className="text-[10px] text-slate-400">
                {plottedMembers.length} محددة • {unplottedMembers.length} غير محددة
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200 text-xs font-black shrink-0">
          <button
            onClick={() => setSidebarTab('plotted')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              sidebarTab === 'plotted'
                ? 'bg-white text-emerald-800 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>على الخريطة ({plottedMembers.length})</span>
          </button>
          <button
            onClick={() => setSidebarTab('unplotted')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              sidebarTab === 'unplotted'
                ? 'bg-white text-amber-800 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>بحاجة لتحديد ({unplottedMembers.length})</span>
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0 text-xs">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم، رقم الموبايل، الغفير..."
              className="w-full pl-8 pr-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Street & Type Selectors */}
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={selectedStreet}
              onChange={(e) => setSelectedStreet(e.target.value)}
              className="px-2 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">جميع الشوارع (1-20)</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map((s) => (
                <option key={s} value={String(s)}>
                  شارع {s}
                </option>
              ))}
            </select>

            <select
              value={memberTypeFilter}
              onChange={(e) => setMemberTypeFilter(e.target.value as any)}
              className="px-2 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">الكل (سكني وتجاري)</option>
              <option value="RESIDENTIAL">سكني فقط</option>
              <option value="COMMERCIAL">تجاري فقط</option>
            </select>
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">جاري تحميل البيانات...</div>
          ) : sidebarTab === 'plotted' ? (
            plottedMembers.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                لا توجد عقارات محددة تطابق الفلتر الحالي
              </div>
            ) : (
              plottedMembers.map((m) => {
                const fin = memberFinancialStatus.get(m.id);
                const isCommercial = m.member_type === 'COMMERCIAL';
                return (
                  <div
                    key={m.id}
                    onClick={() => handleFlyToMember(m)}
                    className="p-3 bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                            isCommercial ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {m.street_number}
                        </span>
                        <h4 className="font-black text-xs text-slate-900 group-hover:text-emerald-800 transition-colors">
                          {m.full_name}
                        </h4>
                      </div>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                          isCommercial
                            ? 'bg-indigo-50 text-indigo-700'
                            : fin?.status === 'FULLY_PAID'
                            ? 'bg-emerald-50 text-emerald-700'
                            : fin?.status === 'PARTIAL'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        ${isCommercial ? 'تجاري' : fin?.status === 'FULLY_PAID' ? 'مسدد' : fin?.status === 'PARTIAL' ? 'جزئي' : 'مستحق'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>شارع {m.street_number}</span>
                      <span className="font-bold text-slate-700">
                        {fin?.remaining ? `متبقي: ${fin.remaining} ج.م` : 'لا مستحقات'}
                      </span>
                    </div>
                  </div>
                );
              })
            )
          ) : unplottedMembers.length === 0 ? (
            <div className="text-center py-10 text-emerald-700 text-xs font-bold bg-emerald-50 rounded-2xl p-4">
              🎉 رائع! جميع الأعضاء محددة مواقعهم على الخريطة!
            </div>
          ) : (
            unplottedMembers.map((m) => (
              <div
                key={m.id}
                className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center font-black text-xs">
                      {m.street_number}
                    </span>
                    <div>
                      <h4 className="font-black text-xs text-slate-900">{m.full_name}</h4>
                      <span className="text-[10px] text-slate-500">
                        شارع {m.street_number} {m.member_type === 'COMMERCIAL' ? '• تجاري' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-amber-100">
                  <button
                    onClick={() => {
                      setPlacingMember(m);
                      setIsSidebarOpen(false);
                    }}
                    className="flex-1 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>تحديد بالنقر على الخريطة</span>
                  </button>

                  <button
                    onClick={() => setEditingMemberLocation(m)}
                    className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-[11px] transition-colors cursor-pointer"
                    title="فتح نافذة التحديد التفصيلية"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer Status */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 font-bold text-center shrink-0">
          إجمالي المسجلين بالنظام: {members.length} عضو
        </div>
      </div>

      {/* Location Picker Modal for manual fine-tuning */}
      {editingMemberLocation && (
        <LocationPickerModal
          isOpen={Boolean(editingMemberLocation)}
          latitude={editingMemberLocation.latitude ? Number(editingMemberLocation.latitude) : null}
          longitude={editingMemberLocation.longitude ? Number(editingMemberLocation.longitude) : null}
          memberName={editingMemberLocation.full_name}
          streetNumber={editingMemberLocation.street_number}
          memberType={editingMemberLocation.member_type}
          onSave={async (lat, lng) => {
            try {
              await membersApi.update(editingMemberLocation.id, {
                latitude: lat,
                longitude: lng,
              });
              setActionSuccessMsg(`تم تحديث موقع "${editingMemberLocation.full_name}" بنجاح!`);
              setTimeout(() => setActionSuccessMsg(''), 4000);
              setEditingMemberLocation(null);
              await loadData();
            } catch (e) {
              console.error(e);
            }
          }}
          onClose={() => setEditingMemberLocation(null)}
        />
      )}

    </div>
  );
};

export default LiveMapView;
