import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator,
  Platform, Alert,
  TextInput, FlatList,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface LocationResult {
  latitude:  number;
  longitude: number;
  address:   string;
}

type PendingPoint = { lat: number; lng: number };

interface Props {
  value?:       LocationResult | null;
  onSelect:     (location: LocationResult) => void;
  placeholder?: string;
}

// ── Leaflet + OpenStreetMap HTML (fully embedded, zero API key needed) ──────
const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; background:#e0e0e0; }
    .leaflet-control-attribution { font-size: 9px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: true }).setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>'
    }).addTo(map);

    var marker = null;

    function placeMarker(lat, lng) {
      if (marker) {
        marker.setLatLng([lat, lng]);
      } else {
        marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on('dragend', function() {
          var pos = marker.getLatLng();
          send(pos.lat, pos.lng);
        });
      }
      send(lat, lng);
    }

    function send(lat, lng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lat, lng: lng }));
    }

    map.on('click', function(e) {
      placeMarker(e.latlng.lat, e.latlng.lng);
    });

    // Receive messages from React Native
    function handleRNMessage(event) {
      try {
        var msg = JSON.parse(event.data);
        if (msg.type === 'goto') {
          placeMarker(msg.lat, msg.lng);
          map.setView([msg.lat, msg.lng], 16);
        }
      } catch(e) {}
    }
    document.addEventListener('message', handleRNMessage);
    window.addEventListener('message', handleRNMessage);
  </script>
</body>
</html>`;

// ── Nominatim reverse geocoding (OpenStreetMap, free, no key) ───────────────
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'KaamWala/1.0' } }
    );
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (data.display_name) {
      // Shorten: take first 3 meaningful parts
      const parts: string[] = data.display_name.split(',').map((s: string) => s.trim()).filter(Boolean);
      return parts.slice(0, 3).join(', ');
    }
  } catch { /* fallback */ }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

interface SearchResult {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

async function searchPlaces(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=jsonv2&limit=6&addressdetails=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'KaamWala/1.0' } }
    );
    if (!res.ok) throw new Error();
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map((item: any, index: number) => ({
      id: item.place_id ? String(item.place_id) : `${item.lat}-${item.lon}-${index}`,
      name: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
    }));
  } catch {
    return [];
  }
}

export default function LocationPicker({ value, onSelect, placeholder }: Props) {
  const insets = useSafeAreaInsets();
  const [visible,   setVisible]   = useState(false);
  const [pending,   setPending]   = useState<PendingPoint | null>(null);
  const [address,   setAddress]   = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [locating,  setLocating]  = useState(false);
  const [searching, setSearching] = useState(false);
  const [search,    setSearch]    = useState('');
  const [results,   setResults]   = useState<SearchResult[]>([]);
  const webViewRef = useRef<WebView>(null);

  // When map picks a point, reverse-geocode it
  useEffect(() => {
    if (!pending) return;
    setGeocoding(true);
    reverseGeocode(pending.lat, pending.lng).then(addr => {
      setAddress(addr);
      setGeocoding(false);
    });
  }, [pending]);

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (search.trim().length < 3) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      const nextResults = await searchPlaces(search);
      setResults(nextResults);
      setSearching(false);
    }, 350);
    return () => clearTimeout(handle);
  }, [search]);

  // When modal opens, restore previous selection on map
  const onWebViewLoad = () => {
    const initial = value ?? pending;
    if (initial) {
      const lat = 'latitude' in initial ? initial.latitude : initial.lat;
      const lng = 'longitude' in initial ? initial.longitude : initial.lng;
      webViewRef.current?.injectJavaScript(
        `placeMarker(${lat}, ${lng}); map.setView([${lat}, ${lng}], 15); true;`
      );
    }
  };

  const handleMapMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const { lat, lng } = JSON.parse(event.nativeEvent.data);
      setPending({ lat, lng });
    } catch { /* ignore */ }
  };

  const handleCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow location access in your device settings.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      webViewRef.current?.injectJavaScript(
        `placeMarker(${latitude}, ${longitude}); map.setView([${latitude}, ${longitude}], 16); true;`
      );
      setPending({ lat: latitude, lng: longitude });
    } catch {
      Alert.alert('Error', 'Could not get your location. Tap on the map to select manually.');
    } finally { setLocating(false); }
  };

  const handleConfirm = () => {
    if (!pending) { Alert.alert('No location', 'Tap anywhere on the map to drop a pin first.'); return; }
    onSelect({ latitude: pending.lat, longitude: pending.lng, address });
    setVisible(false);
  };

  const handleOpen = () => {
    // Reset pending to current value when opening
    if (value) setPending({ lat: value.latitude, lng: value.longitude });
    setSearch('');
    setResults([]);
    setVisible(true);
  };

  const goToLocation = (latitude: number, longitude: number) => {
    webViewRef.current?.injectJavaScript(
      `placeMarker(${latitude}, ${longitude}); map.setView([${latitude}, ${longitude}], 16); true;`
    );
    setPending({ lat: latitude, lng: longitude });
  };

  const handleSearchSelect = (result: SearchResult) => {
    setSearch(result.name);
    setResults([]);
    goToLocation(result.latitude, result.longitude);
  };

  const hasValue = !!value;

  return (
    <>
      {/* Trigger row */}
      <TouchableOpacity style={[styles.trigger, hasValue && styles.triggerFilled]} onPress={handleOpen}>
        <Ionicons name="location" size={20} color={hasValue ? Colors.primary : Colors.textMuted} />
        <View style={styles.triggerText}>
          {hasValue ? (
            <>
              <Text style={styles.triggerLabel} numberOfLines={1}>{value!.address}</Text>
              <Text style={styles.triggerCoords}>
                {value!.latitude.toFixed(5)}, {value!.longitude.toFixed(5)}
              </Text>
            </>
          ) : (
            <Text style={styles.triggerPlaceholder}>{placeholder || 'Tap to select location on map'}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      {/* Full-screen map modal */}
      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.modal}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setVisible(false)} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color={Colors.secondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Select Location</Text>
            <View style={styles.headerBtn} />
          </View>

          {/* Hint bar */}
          <View style={styles.hintBar}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.hintText}>Search a place, tap on the map, or drag the pin to adjust</Text>
          </View>

          <View style={styles.searchWrap}>
            <View style={styles.searchInputWrap}>
              <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search area, street, landmark..."
                placeholderTextColor={Colors.textMuted}
                style={styles.searchInput}
                returnKeyType="search"
              />
              {searching ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : search.length > 0 ? (
                <TouchableOpacity onPress={() => { setSearch(''); setResults([]); }}>
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
            {results.length > 0 && (
              <View style={styles.resultsCard}>
                <FlatList
                  data={results}
                  keyExtractor={item => item.id}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.resultRow} onPress={() => handleSearchSelect(item)}>
                      <Ionicons name="location-outline" size={16} color={Colors.primary} />
                      <Text style={styles.resultText} numberOfLines={2}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>

          {/* Map */}
          <View style={styles.mapWrap}>
            <WebView
              ref={webViewRef}
              source={{ html: MAP_HTML }}
              style={styles.map}
              onMessage={handleMapMessage}
              onLoad={onWebViewLoad}
              javaScriptEnabled
              domStorageEnabled
              mixedContentMode="always"
              originWhitelist={['*']}
            />

            {/* Current location FAB */}
            <TouchableOpacity style={[styles.myLocBtn, { bottom: 96 + insets.bottom }]} onPress={handleCurrentLocation} disabled={locating}>
              {locating
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Ionicons name="navigate" size={22} color={Colors.primary} />}
            </TouchableOpacity>
          </View>

          {/* Address + confirm footer */}
          <View style={styles.footer}>
            {geocoding ? (
              <View style={styles.addressRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.addressGeocode}>Getting address…</Text>
              </View>
            ) : pending ? (
              <View style={styles.addressRow}>
                <Ionicons name="location" size={18} color={Colors.primary} />
                <Text style={styles.addressText} numberOfLines={2}>{address || `${pending.lat.toFixed(5)}, ${pending.lng.toFixed(5)}`}</Text>
              </View>
            ) : (
              <Text style={styles.addressPlaceholder}>No location selected — tap on the map</Text>
            )}

            <TouchableOpacity
              style={[styles.confirmBtn, (!pending || geocoding) && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!pending || geocoding}>
              <Text style={styles.confirmBtnText}>Confirm Location</Text>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>

        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 14,
    minHeight: 56,
  },
  triggerFilled:      { borderColor: Colors.primary + '60', backgroundColor: '#FFF3EE' },
  triggerText:        { flex: 1 },
  triggerLabel:       { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  triggerCoords:      { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  triggerPlaceholder: { fontSize: 14, color: Colors.textMuted },

  modal:   { flex: 1, backgroundColor: Colors.background },
  header:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerBtn:   { width: 36, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.secondary },

  hintBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#FFFBEB', borderBottomWidth: 1, borderBottomColor: '#FDE68A',
  },
  hintText: { fontSize: 12, color: Colors.textMuted, flex: 1 },

  searchWrap:       { backgroundColor: Colors.white, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  searchInputWrap:  {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.background, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.border, paddingHorizontal: 12, minHeight: 48,
  },
  searchInput:      { flex: 1, fontSize: 14, color: Colors.textPrimary, paddingVertical: 12 },
  resultsCard:      {
    backgroundColor: Colors.white, borderRadius: 14, marginTop: 10,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    maxHeight: 220,
  },
  resultRow:        { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  resultText:       { flex: 1, fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },

  mapWrap: { flex: 1 },
  map:     { flex: 1 },

  myLocBtn: {
    position: 'absolute', right: 16,
    width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 5,
  },

  footer: {
    backgroundColor: Colors.white, padding: 16,
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  addressRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 14 },
  addressText:        { flex: 1, fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  addressGeocode:     { fontSize: 14, color: Colors.textMuted, marginLeft: 6 },
  addressPlaceholder: { fontSize: 14, color: Colors.textMuted, marginBottom: 14, textAlign: 'center' },

  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  confirmBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  confirmBtnText:     { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
