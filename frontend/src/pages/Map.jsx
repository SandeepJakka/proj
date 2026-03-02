import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Fix Leaflet default icon
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({ iconUrl, shadowUrl: iconShadow });

const makeIcon = (color) => new L.DivIcon({
    html: `<div style="width:20px;height:20px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
    iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -12],
    className: '',
});

// TYPE_COLOR — covers all Indian OSM healthcare tags
const TYPE_COLOR = {
    hospital: '#EF4444',
    clinic: '#2563EB',
    pharmacy: '#10B981',
    doctors: '#F59E0B',
    dentist: '#8b5cf6',
    chemist: '#10B981',
    medical: '#10B981',
    medical_supply: '#10B981',
    health_post: '#F59E0B',
    physiotherapist: '#06b6d4',
    laboratory: '#06b6d4',
    blood_bank: '#EF4444',
    diagnostic: '#06b6d4',
    // Indian-specific healthcare= tags
    centre: '#2563EB',
    diagnostics: '#06b6d4',
    alternative: '#06b6d4',
    sample_collection: '#06b6d4',
    optician: '#06b6d4',
};

const getColor = (p) => TYPE_COLOR[p.amenity] || TYPE_COLOR[p.shop] || TYPE_COLOR[p.healthcare] || '#888';

const getPlaceLabel = (p) => {
    if (p.amenity === 'hospital') return '🏥 Hospital';
    if (p.amenity === 'clinic' && p.healthcare === 'diagnostics') return '🔬 Diagnostic Clinic';
    if (p.amenity === 'clinic') return '👨⚕️ Clinic';
    if (p.amenity === 'doctors') return '👨⚕️ Doctor';
    if (p.amenity === 'dentist') return '🦷 Dentist';
    if (p.amenity === 'laboratory' || p.healthcare === 'laboratory') return '🔬 Lab';
    if (p.amenity === 'blood_bank') return '🩸 Blood Bank';
    if (p.healthcare === 'centre' || p.healthcare === 'diagnostics' || p.healthcare === 'diagnostic') return '🔬 Diagnostic Centre';
    if (p.healthcare === 'sample_collection') return '🧪 Sample Collection';
    if (p.healthcare === 'pharmacy') return '💊 Medical Store';
    if (p.healthcare === 'alternative') return '🌿 Ayurvedic/Homeopathic';
    if (p.shop === 'chemist' || p.shop === 'medical' || p.shop === 'medical_supply') return '💊 Medical Shop';
    if (p.shop === 'optician') return '👓 Eye Clinic';
    if (p.amenity === 'pharmacy' || p.shop === 'pharmacy') return '💊 Pharmacy';
    if (p.amenity === 'health_post') return '🏥 Health Post';
    if (p.amenity === 'physiotherapist') return '💆 Physiotherapist';
    return '🏥 Healthcare';
};

const SetMapCenter = ({ center }) => {
    const map = useMap();
    useEffect(() => { if (center) map.setView(center, 14); }, [center]);
    return null;
};

// Fix 1: Multiple Overpass endpoints with fallback (kumi.systems first for best CORS)
const OVERPASS_ENDPOINTS = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass-api.de/api/interpreter',
];

const MapPage = () => {
    const [center, setCenter] = useState(null);
    const [userPos, setUserPos] = useState(null);
    const [places, setPlaces] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const [searchCity, setSearchCity] = useState('');

    // Auto-locate on mount
    useEffect(() => { getLocation(); }, []);

    const getLocation = () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation not supported. Please search your city manually.');
            return;
        }
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                const pos = [coords.latitude, coords.longitude];
                setCenter(pos);
                setUserPos(pos);
                setLocationError(null);
                fetchPlaces(coords.latitude, coords.longitude);
            },
            (error) => {
                let message = 'Location access denied.';
                if (error.code === 1) message = 'Please allow location access in your browser to find nearby healthcare.';
                if (error.code === 2) message = 'Location unavailable. Please search your city manually below.';
                if (error.code === 3) message = 'Location timed out. Please search your city manually below.';
                setLocationError(message);
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const searchByCity = async () => {
        if (!searchCity.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchCity + ', India')}&format=json&limit=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await res.json();
            if (data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                setCenter([lat, lon]);
                setUserPos([lat, lon]);
                setLocationError(null);
                fetchPlaces(lat, lon);
            } else {
                toast.error('City not found. Try a different name.');
                setLoading(false);
            }
        } catch {
            toast.error('Search failed. Please try again.');
            setLoading(false);
        }
    };

    // Fix 1: fetchPlaces with endpoint fallback loop
    const fetchPlaces = async (lat, lon) => {
        setLoading(true);

        // Radius bumped to 7km; added Indian OSM healthcare= tags
        const R = 7000;
        const q = `[out:json][timeout:30];
(
  node["amenity"="hospital"](around:${R},${lat},${lon});
  node["amenity"="clinic"](around:${R},${lat},${lon});
  node["amenity"="pharmacy"](around:${R},${lat},${lon});
  node["amenity"="doctors"](around:${R},${lat},${lon});
  node["amenity"="dentist"](around:${R},${lat},${lon});
  node["amenity"="health_post"](around:${R},${lat},${lon});
  node["amenity"="physiotherapist"](around:${R},${lat},${lon});
  node["amenity"="laboratory"](around:${R},${lat},${lon});
  node["amenity"="blood_bank"](around:${R},${lat},${lon});
  node["amenity"="clinic"]["healthcare"="diagnostics"](around:${R},${lat},${lon});
  node["healthcare"="pharmacy"](around:${R},${lat},${lon});
  node["healthcare"="laboratory"](around:${R},${lat},${lon});
  node["healthcare"="centre"](around:${R},${lat},${lon});
  node["healthcare"="diagnostics"](around:${R},${lat},${lon});
  node["healthcare"="diagnostic"](around:${R},${lat},${lon});
  node["healthcare"="sample_collection"](around:${R},${lat},${lon});
  node["healthcare"="alternative"](around:${R},${lat},${lon});
  node["shop"="chemist"](around:${R},${lat},${lon});
  node["shop"="medical"](around:${R},${lat},${lon});
  node["shop"="pharmacy"](around:${R},${lat},${lon});
  node["shop"="medical_supply"](around:${R},${lat},${lon});
  node["shop"="optician"](around:${R},${lat},${lon});
  way["amenity"="hospital"](around:${R},${lat},${lon});
  way["amenity"="clinic"](around:${R},${lat},${lon});
  way["amenity"="laboratory"](around:${R},${lat},${lon});
  way["healthcare"="centre"](around:${R},${lat},${lon});
  way["healthcare"="pharmacy"](around:${R},${lat},${lon});
  way["shop"="chemist"](around:${R},${lat},${lon});
  way["shop"="medical"](around:${R},${lat},${lon});
  way["shop"="optician"](around:${R},${lat},${lon});
  relation["amenity"="hospital"](around:${R},${lat},${lon});
);
out center;`;

        let lastError = null;

        for (const endpoint of OVERPASS_ENDPOINTS) {
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `data=${encodeURIComponent(q)}`,
                });

                if (!res.ok) continue;

                const data = await res.json();

                const parsed = data.elements
                    .map(el => ({
                        id: el.id,
                        name: el.tags?.name || el.tags?.['name:en'] || 'Unnamed',
                        amenity: el.tags?.amenity || el.tags?.shop || el.tags?.healthcare || 'clinic',
                        shop: el.tags?.shop || null,
                        healthcare: el.tags?.healthcare || null,
                        address: [
                            el.tags?.['addr:housenumber'],
                            el.tags?.['addr:street'],
                            el.tags?.['addr:city'],
                        ].filter(Boolean).join(', ') || el.tags?.['addr:full'] || 'Address not available',
                        phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
                        lat: el.lat ?? el.center?.lat,
                        lon: el.lon ?? el.center?.lon,
                    }))
                    .filter(p => p.lat && p.lon);

                setPlaces(parsed);

                if (parsed.length === 0) {
                    toast('No healthcare places found nearby. Try a different area.', { icon: '📍' });
                } else {
                    toast.success(`Found ${parsed.length} places nearby`);
                }

                setLoading(false);
                return; // Success — stop trying other endpoints

            } catch (err) {
                lastError = err;
                continue; // Try next endpoint
            }
        }

        // All endpoints failed
        console.error('All Overpass endpoints failed:', lastError);
        toast.error('Could not load nearby places. Please check your internet connection.');
        setLoading(false);
    };

    const distKm = (lat, lon) => {
        if (!userPos) return null;
        const R = 6371;
        const dLat = (lat - userPos[0]) * Math.PI / 180;
        const dLon = (lon - userPos[1]) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(userPos[0] * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
    };

    const FILTERS = [
        { key: 'all', label: '🏃 All' },
        { key: 'hospital', label: '🏥 Hospitals' },
        { key: 'clinic', label: '👨⚕️ Clinics' },
        { key: 'pharmacy', label: '💊 Pharmacies' },
        { key: 'chemist', label: '🧪 Chemists' },
        { key: 'lab', label: '🔬 Labs' },
        { key: 'dentist', label: '🦷 Dentists' },
    ];

    // Filter matches amenity, shop, OR healthcare. 'pharmacy' filter also catches healthcare=pharmacy
    const filtered = filter === 'all'
        ? places
        : places.filter(p => {
            if (filter === 'pharmacy') {
                // Catch all medical store variants
                return p.amenity === 'pharmacy' ||
                    p.shop === 'pharmacy' ||
                    p.shop === 'chemist' ||
                    p.shop === 'medical' ||
                    p.shop === 'medical_supply' ||
                    p.healthcare === 'pharmacy';
            }
            if (filter === 'lab') {
                // Catch lab + diagnostic variants
                return p.amenity === 'laboratory' ||
                    p.healthcare === 'laboratory' ||
                    p.healthcare === 'diagnostics' ||
                    p.healthcare === 'diagnostic' ||
                    p.healthcare === 'sample_collection' ||
                    p.healthcare === 'centre' ||
                    p.shop === 'optician' ||
                    (p.amenity === 'clinic' && p.healthcare === 'diagnostics');
            }
            return p.amenity === filter || p.shop === filter || p.healthcare === filter;
        });

    return (
        <div style={{ minHeight: '100vh', background: '#0F1117' }}>
            <Toaster position="top-right" toastOptions={{ className: 'toast-dark' }} />

            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px' }}>
                <div className="page-header">
                    <h1>Find Nearby Healthcare</h1>
                    <p>Hospitals, clinics, pharmacies, labs near you</p>
                </div>

                {/* Location error banner */}
                {locationError && (
                    <div style={{
                        background: '#1A1D27',
                        border: '1px solid #F59E0B',
                        borderRadius: 8, padding: '12px 16px',
                        color: '#F59E0B', marginBottom: 16,
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: 8,
                    }}>
                        <span>⚠️ {locationError}</span>
                        <button
                            onClick={getLocation}
                            style={{
                                background: 'none', border: '1px solid #2563EB',
                                borderRadius: 6, color: '#2563EB',
                                fontWeight: 600, cursor: 'pointer',
                                fontSize: '0.8rem', padding: '4px 10px'
                            }}
                        >
                            📍 Try Again
                        </button>
                    </div>
                )}

                {/* City search */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input
                        className="form-input"
                        placeholder="Search city or area (e.g. Nellore, Vijayawada, Guntur)..."
                        value={searchCity}
                        onChange={e => setSearchCity(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && searchByCity()}
                        style={{ flex: 1 }}
                    />
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={searchByCity}
                        disabled={loading || !searchCity.trim()}
                    >
                        Search
                    </button>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {FILTERS.map(f => (
                            <button
                                key={f.key}
                                className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setFilter(f.key)}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={getLocation} disabled={loading} style={{ marginLeft: 'auto' }}>
                        <Navigation size={14} /> {loading ? 'Loading…' : 'Use my location'}
                    </button>
                    {center && (
                        <a
                            href={`https://www.google.com/maps/search/hospitals+clinics+pharmacy+near+me/@${center[0]},${center[1]},14z`}
                            target="_blank" rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#4285F4', border: '1px solid rgba(66,133,244,0.3)' }}
                        >
                            🗺 Open Google Maps
                        </a>
                    )}
                </div>

                {/* Google Maps category search */}
                {center && (
                    <div style={{ 
                        display: 'flex', gap: 8, flexWrap: 'wrap', 
                        marginBottom: 16, padding: '10px 14px',
                        background: '#1A1D27', borderRadius: 8,
                        border: '1px solid #2A2D3A'
                    }}>
                        <span style={{ color: '#9CA3AF', fontSize: '0.75rem', 
                            width: '100%', marginBottom: 4 }}>
                            Not finding what you need? Search on Google Maps:
                        </span>
                        {[
                            { label: '🏥 Hospitals', q: 'hospitals near me' },
                            { label: '💊 Medical Shops', q: 'medical shops pharmacy chemist near me' },
                            { label: '🔬 Diagnostic Labs', q: 'diagnostic lab blood test near me' },
                            { label: '👨⚕️ Doctors', q: 'doctors clinic near me' },
                            { label: '🦷 Dentists', q: 'dentist near me' },
                        ].map(item => (
                            <a
                                key={item.q}
                                href={`https://www.google.com/maps/search/${encodeURIComponent(item.q)}/@${center[0]},${center[1]},14z`}
                                target="_blank" rel="noopener noreferrer"
                                style={{
                                    padding: '4px 10px',
                                    background: 'rgba(66,133,244,0.08)',
                                    border: '1px solid rgba(66,133,244,0.2)',
                                    borderRadius: 6,
                                    color: '#4285F4',
                                    fontSize: '0.75rem',
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                }}
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>
                )}

                {/* Map */}
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #2A2D3A', marginBottom: 24 }}>
                    <MapContainer center={center || [20.5937, 78.9629]} zoom={13} style={{ height: 480, width: '100%' }}>
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; OpenStreetMap contributors'
                        />
                        <SetMapCenter center={center} />

                        {userPos && (
                            <>
                                <Marker
                                    position={userPos}
                                    icon={new L.DivIcon({
                                        html: `<div style="width:16px;height:16px;background:#2563EB;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(37,99,235,.25)"></div>`,
                                        iconSize: [16, 16], iconAnchor: [8, 8], className: ''
                                    })}
                                >
                                    <Popup>📍 You are here</Popup>
                                </Marker>
                                <Circle center={userPos} radius={5000} pathOptions={{ color: '#2563EB', fillOpacity: .04, weight: 1 }} />
                            </>
                        )}

                        {filtered.map(p => (
                            <Marker key={p.id} position={[p.lat, p.lon]} icon={makeIcon(getColor(p))}>
                                <Popup>
                                    <strong>{p.name}</strong><br />
                                    <span style={{ color: '#666', textTransform: 'capitalize' }}>
                                        {p.amenity || p.shop || p.healthcare}
                                    </span><br />
                                    {p.address !== 'Address not available' && <>{p.address}<br /></>}
                                    {p.phone && <><a href={`tel:${p.phone}`}>{p.phone}</a><br /></>}
                                    {distKm(p.lat, p.lon) && <span>{distKm(p.lat, p.lon)} km away</span>}
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>

                {/* Results list */}
                {filtered.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <h3 style={{ marginBottom: 8 }}>{filtered.length} places found</h3>
                        {filtered.slice(0, 20).map(p => {
                            const km = distKm(p.lat, p.lon);
                            const color = getColor(p);
                            return (
                                <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                                        <MapPin size={18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                                            <span>{getPlaceLabel(p)}</span>
                                            {p.address !== 'Address not available' && ` • ${p.address}`}
                                            {km && ` • ${km} km`}
                                            {p.phone && (
                                                <>
                                                    <br />
                                                    <a href={`tel:${p.phone}`} style={{ color: '#2563EB' }}>{p.phone}</a>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="btn btn-ghost btn-sm"
                                    >
                                        Directions
                                    </a>
                                    <a
                                        href={`https://www.google.com/maps/search/${encodeURIComponent(p.name)}/@${p.lat},${p.lon},17z`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="btn btn-ghost btn-sm"
                                        style={{ color: '#4285F4' }}
                                    >
                                        Maps
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Empty state - no center yet */}
                {!loading && !center && !locationError && (
                    <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                        <MapPin size={36} color="#2563EB" style={{ marginBottom: 12 }} />
                        <p style={{ marginBottom: 16 }}>
                            Allow location access to find healthcare near you,
                            or search your city above.
                        </p>
                        <button className="btn btn-primary" onClick={getLocation}>
                            📍 Use My Location
                        </button>
                    </div>
                )}

                {/* Empty state - no results */}
                {!loading && filtered.length === 0 && center && (
                    <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                        <MapPin size={36} color="#6B7280" style={{ marginBottom: 12 }} />
                        <p style={{ marginBottom: 8 }}>
                            No {filter === 'all' ? 'healthcare places' : filter} found within 5km on OpenStreetMap.
                        </p>
                        <p style={{ color: '#9CA3AF', fontSize: '0.8rem', marginBottom: 16 }}>
                            OpenStreetMap coverage may be limited in your area. Try Google Maps for more results.
                        </p>
                        <a
                            href={`https://www.google.com/maps/search/${encodeURIComponent(
                                filter === 'all' ? 'hospitals clinics pharmacy near me' :
                                filter === 'chemist' ? 'medical shops pharmacy near me' :
                                filter === 'lab' ? 'diagnostic lab near me' :
                                filter + ' near me'
                            )}/@${center[0]},${center[1]},14z`}
                            target="_blank" rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ background: '#4285F4', border: 'none' }}
                        >
                            🗺 Search on Google Maps
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MapPage;
