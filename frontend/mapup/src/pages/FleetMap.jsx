
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  MapContainer,
  TileLayer,
  Polygon,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";

import { latLngBounds } from "leaflet";

import {
  RefreshCw,
  Loader2,
  MapPin,
  Car,
  Layers,
  Radio,
} from "lucide-react";

import {
  getGeofences,
  getVehicles,
  getVehicleLocationHistory,
} from "../services/apiService";

import { useNotifications } from "../context/NotificationContext";

import "leaflet/dist/leaflet.css";

// ==========================================
// FIT MAP TO INITIAL DATA
// ==========================================

function FitMapToData({
  geofences,
  vehicleLocations,
  ready,
}) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (!ready || hasFitted.current) return;

    const bounds = latLngBounds([]);

    geofences.forEach((geofence) => {
      if (Array.isArray(geofence.coordinates)) {
        geofence.coordinates.forEach((coordinate) => {
          if (
            Array.isArray(coordinate) &&
            coordinate.length === 2
          ) {
            bounds.extend([
              Number(coordinate[0]),
              Number(coordinate[1]),
            ]);
          }
        });
      }
    });

    vehicleLocations.forEach((item) => {
      bounds.extend([
        Number(item.latitude),
        Number(item.longitude),
      ]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 14,
      });

      hasFitted.current = true;
    }
  }, [map, geofences, vehicleLocations, ready]);

  return null;
}

// ==========================================
// FLEET MAP COMPONENT
// ==========================================

function FleetMap() {
  const [geofences, setGeofences] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleLocations, setVehicleLocations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Get real-time WebSocket location updates
  const {
    locationUpdates,
    connected,
  } = useNotifications();

  // ==========================================
  // FETCH INITIAL MAP DATA
  // ==========================================

  const fetchMapData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [
        geofenceResponse,
        vehicleResponse,
      ] = await Promise.all([
        getGeofences(),
        getVehicles(),
      ]);

      const geofenceList = Array.isArray(geofenceResponse.data)
        ? geofenceResponse.data
        : [];

      const vehicleList = Array.isArray(vehicleResponse.data)
        ? vehicleResponse.data
        : [];

      setGeofences(geofenceList);
      setVehicles(vehicleList);

      // Fetch latest GPS record for every vehicle.
      const locationResults = await Promise.all(
        vehicleList.map(async (vehicle) => {
          try {
            const response = await getVehicleLocationHistory(
              vehicle.id
            );

            const history = Array.isArray(response.data)
              ? response.data
              : [];

            if (history.length === 0) {
              return null;
            }

            // Backend returns history in descending timestamp order.
            const latestLocation = history[0];

            return {
              ...latestLocation,
              vehicle,
            };
          } catch (err) {
            console.error(
              `Location fetch failed for vehicle ${vehicle.id}:`,
              err
            );

            return null;
          }
        })
      );

      setVehicleLocations(locationResults.filter(Boolean));

      setLastUpdated(new Date());

    } catch (err) {
      console.error("Fleet map error:", err);

      setError("Unable to load fleet map data.");

    } finally {
      setLoading(false);
    }
  }, []);

  // Initial API data
  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  // ==========================================
  // MERGE DATABASE LOCATIONS WITH LIVE UPDATES
  // ==========================================

  const displayedVehicleLocations = useMemo(() => {
    const latestLocations = new Map();

    // Add initial locations from the database.
    vehicleLocations.forEach((item) => {
      const vehicleId = Number(
        item.vehicle?.id ??
        item.vehicle_id ??
        item.vehicleId
      );

      if (!vehicleId) return;

      latestLocations.set(vehicleId, item);
    });

    // Override with newer WebSocket updates.
    Object.values(locationUpdates).forEach((item) => {
      const vehicleId = Number(item.vehicle?.id);

      if (!vehicleId || !item.location && (
        item.latitude === undefined ||
        item.longitude === undefined
      )) {
        return;
      }

      latestLocations.set(vehicleId, {
        id: item.event_id,
        vehicle: item.vehicle,
        latitude: item.latitude ?? item.location?.latitude,
        longitude: item.longitude ?? item.location?.longitude,
        timestamp: item.timestamp,
      });
    });

    return Array.from(latestLocations.values());

  }, [vehicleLocations, locationUpdates]);

  // Update last-updated time when new GPS data arrives.
  useEffect(() => {
    if (Object.keys(locationUpdates).length > 0) {
      setLastUpdated(new Date());
    }
  }, [locationUpdates]);

  // ==========================================
  // GEOFENCE CATEGORY COLORS
  // ==========================================

  const getCategoryColor = (category) => {
    const colors = {
      delivery_zone: "#2563eb",
      restricted_zone: "#dc2626",
      toll_zone: "#ea580c",
      customer_area: "#16a34a",
    };

    return colors[category] || "#64748b";
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Fleet Monitoring Map
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Monitor vehicle locations and geographical boundaries.
          </p>
        </div>

        <button
          onClick={fetchMapData}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}

          Refresh Map
        </button>

      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Total Vehicles
            </p>

            <Car size={21} className="text-blue-600" />
          </div>

          <p className="mt-3 text-3xl font-bold text-gray-900">
            {vehicles.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Geofences
            </p>

            <Layers size={21} className="text-purple-600" />
          </div>

          <p className="mt-3 text-3xl font-bold text-gray-900">
            {geofences.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Vehicles With GPS Data
            </p>

            <MapPin size={21} className="text-green-600" />
          </div>

          <p className="mt-3 text-3xl font-bold text-gray-900">
            {displayedVehicleLocations.length}
          </p>
        </div>

      </div>

      {/* Map Legend */}
      <div className="flex flex-wrap items-center gap-5 rounded-xl border border-gray-200 bg-white p-4">

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green-500" />

          <span className="text-sm text-gray-600">
            Vehicle Location
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-blue-600" />

          <span className="text-sm text-gray-600">
            Delivery Zone
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-red-600" />

          <span className="text-sm text-gray-600">
            Restricted Zone
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-orange-600" />

          <span className="text-sm text-gray-600">
            Toll Zone
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-green-600" />

          <span className="text-sm text-gray-600">
            Customer Area
          </span>
        </div>

      </div>

      {/* Live Fleet Map */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">

          <div>
            <h2 className="font-semibold text-gray-900">
              Live Fleet Map
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Vehicle positions update automatically through WebSocket.
            </p>
          </div>

          <div className="flex items-center gap-3">

            <span className={`flex items-center gap-1.5 text-xs font-medium ${
              connected ? "text-green-600" : "text-red-600"
            }`}>
              <Radio size={15} />

              {connected ? "Live Connected" : "Disconnected"}
            </span>

            <span className="text-xs text-gray-500">
              {lastUpdated
                ? `Updated: ${lastUpdated.toLocaleTimeString()}`
                : "Loading map data..."}
            </span>

          </div>
        </div>

        <div className="relative h-[600px] w-full">

          {loading && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70">
              <Loader2
                size={32}
                className="animate-spin text-blue-600"
              />
            </div>
          )}

          <MapContainer
            center={[22.725, 75.855]}
            zoom={12}
            scrollWheelZoom={true}
            className="h-full w-full"
          >

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitMapToData
              geofences={geofences}
              vehicleLocations={displayedVehicleLocations}
              ready={!loading}
            />

            {/* Geofence Polygons */}
            {geofences.map((geofence) => {

              if (
                !Array.isArray(geofence.coordinates) ||
                geofence.coordinates.length < 4
              ) {
                return null;
              }

              const color = getCategoryColor(
                geofence.category
              );

              return (
                <Polygon
                  key={geofence.id}
                  positions={geofence.coordinates}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.18,
                    weight: 3,
                  }}
                >
                  <Popup>
                    <div className="min-w-[170px]">

                      <h3 className="font-semibold">
                        {geofence.name}
                      </h3>

                      <p className="mt-1 text-sm">
                        Category: {geofence.category}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Geofence ID: {geofence.id}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {geofence.description || "No description"}
                      </p>

                    </div>
                  </Popup>
                </Polygon>
              );
            })}

            {/* Live Vehicle Markers */}
            {displayedVehicleLocations.map((item) => {

              const vehicleId = item.vehicle?.id;

              if (
                !vehicleId ||
                !Number.isFinite(Number(item.latitude)) ||
                !Number.isFinite(Number(item.longitude))
              ) {
                return null;
              }

              return (
                <CircleMarker
                  key={`vehicle-${vehicleId}`}
                  center={[
                    Number(item.latitude),
                    Number(item.longitude),
                  ]}
                  radius={9}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 2,
                    fillColor: "#16a34a",
                    fillOpacity: 1,
                  }}
                >

                  <Popup>
                    <div className="min-w-[190px]">

                      <h3 className="font-semibold text-gray-900">
                        {item.vehicle.vehicle_number}
                      </h3>

                      <p className="mt-1 text-sm">
                        Driver: {item.vehicle.driver_name}
                      </p>

                      <p className="mt-1 text-sm">
                        Type: {item.vehicle.type}
                      </p>

                      <p className="mt-2 text-xs text-gray-500">
                        Latitude: {Number(item.latitude).toFixed(6)}
                      </p>

                      <p className="text-xs text-gray-500">
                        Longitude: {Number(item.longitude).toFixed(6)}
                      </p>

                      <p className="mt-2 text-xs text-gray-500">
                        Last GPS Update:{" "}
                        {item.timestamp
                          ? new Date(item.timestamp).toLocaleString()
                          : "Unknown"}
                      </p>

                    </div>
                  </Popup>

                </CircleMarker>
              );
            })}

          </MapContainer>

        </div>
      </div>

      {/* Vehicle Location Details */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            Vehicle Location Details
          </h2>
        </div>

        {displayedVehicleLocations.length === 0 ? (

          <div className="py-10 text-center text-sm text-gray-500">
            No GPS locations available. Submit a vehicle location update first.
          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4">Vehicle</th>
                  <th className="px-5 py-4">Driver</th>
                  <th className="px-5 py-4">Latitude</th>
                  <th className="px-5 py-4">Longitude</th>
                  <th className="px-5 py-4">Last Updated</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">

                {displayedVehicleLocations.map((item) => (

                  <tr
                    key={item.vehicle.id}
                    className="hover:bg-gray-50"
                  >

                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {item.vehicle.vehicle_number}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {item.vehicle.driver_name}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {Number(item.latitude).toFixed(6)}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {Number(item.longitude).toFixed(6)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                      {item.timestamp
                        ? new Date(item.timestamp).toLocaleString()
                        : "—"}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}

export default FleetMap;
