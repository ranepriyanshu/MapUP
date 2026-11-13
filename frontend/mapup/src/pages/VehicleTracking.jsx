
import { useEffect, useState } from "react";
import {
  MapPin,
  Navigation,
  RefreshCw,
  Loader2,
  Car,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

import {
  getVehicles,
  updateVehicleLocation,
  getVehicleLocationHistory,
} from "../services/apiService";

function VehicleTracking() {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getVehicles();
      const vehicleList = Array.isArray(response.data)
        ? response.data
        : [];

      setVehicles(vehicleList);

      if (vehicleList.length > 0) {
        setSelectedVehicle((previous) => {
          const exists = vehicleList.some(
            (vehicle) => String(vehicle.id) === previous
          );

          return exists ? previous : String(vehicleList[0].id);
        });
      }
    } catch (err) {
      console.error("Vehicle fetch error:", err);
      setError("Unable to load vehicles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchHistory = async (vehicleId) => {
    if (!vehicleId) {
      setHistory([]);
      return;
    }

    try {
      setHistoryLoading(true);

      const response = await getVehicleLocationHistory(vehicleId);

      setHistory(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      console.error("Location history error:", err);
      setError("Unable to fetch vehicle location history.");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    setResult(null);
    fetchHistory(selectedVehicle);
  }, [selectedVehicle]);

  const handleUseCurrentLocation = () => {
    setError("");
    setSuccess("");

    if (!navigator.geolocation) {
      setError("Your browser does not support geolocation.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
      },
      (geoError) => {
        console.error(geoError);
        setError(
          "Unable to get your location. Please allow location access or enter coordinates manually."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setResult(null);

    if (!selectedVehicle) {
      setError("Please select a vehicle.");
      return;
    }

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (
      latitude.trim() === "" ||
      longitude.trim() === "" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      setError("Please enter valid latitude and longitude values.");
      return;
    }

    const payload = {
      vehicle_id: Number(selectedVehicle),
      latitude: lat,
      longitude: lon,
      timestamp: new Date().toISOString(),
    };

    try {
      setSubmitting(true);

      const response = await updateVehicleLocation(payload);

      setResult(response);
      setSuccess("Vehicle location updated successfully!");

      await fetchHistory(selectedVehicle);
    } catch (err) {
      console.error("Location update error:", err);

      setError(
        err.response?.data?.message ||
        "Failed to update vehicle location."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedVehicleDetails = vehicles.find(
    (vehicle) => String(vehicle.id) === selectedVehicle
  );

  const currentGeofences = result?.current_geofences || [];
  const events = result?.events || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Vehicle Location Tracking
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Submit GPS updates and monitor geofence activity.
          </p>
        </div>

        <button
          onClick={fetchVehicles}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh Vehicles
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Vehicle Selection and Location Form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5">
              <Car className="text-blue-600" size={22} />
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">
                Select Vehicle
              </h2>
              <p className="text-xs text-gray-500">
                Choose a registered vehicle to track.
              </p>
            </div>
          </div>

          {loading ? (
            <Loader2 className="animate-spin text-blue-600" />
          ) : vehicles.length === 0 ? (
            <p className="text-sm text-gray-500">
              No registered vehicles found. Register a vehicle first.
            </p>
          ) : (
            <>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Vehicle *
              </label>

              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicle_number} — {vehicle.driver_name}
                  </option>
                ))}
              </select>

              {selectedVehicleDetails && (
                <div className="mt-4 rounded-lg bg-gray-50 p-4">
                  <p className="font-semibold text-gray-900">
                    {selectedVehicleDetails.vehicle_number}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Driver: {selectedVehicleDetails.driver_name}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Type: {selectedVehicleDetails.type}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-2.5">
              <Navigation className="text-green-600" size={22} />
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">
                Update GPS Location
              </h2>
              <p className="text-xs text-gray-500">
                Submit the vehicle's current coordinates.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Latitude *
              </label>

              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 22.725000"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Longitude *
              </label>

              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. 75.855000"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              <MapPin size={17} />
              Use My Current Location
            </button>

            <button
              type="submit"
              disabled={submitting || loading || vehicles.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Updating Location...
                </>
              ) : (
                <>
                  <Navigation size={17} />
                  Submit Location Update
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Location Update Result */}
      {result && (
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <CheckCircle className="text-green-600" size={22} />
              <h2 className="font-semibold text-gray-900">
                Location Update Result
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Latitude</p>
                <p className="mt-2 font-semibold text-gray-900">
                  {latitude}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Longitude</p>
                <p className="mt-2 font-semibold text-gray-900">
                  {longitude}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs text-gray-500">
                  Geofences Detected
                </p>
                <p className="mt-2 font-semibold text-gray-900">
                  {currentGeofences.length}
                </p>
              </div>
            </div>
          </div>

          {/* Geofences */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 font-semibold text-gray-900">
              Current Geofence Status
            </h2>

            {currentGeofences.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4">
                <XCircle className="text-gray-500" size={20} />
                <p className="text-sm text-gray-600">
                  Vehicle is currently outside all configured geofences.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentGeofences.map((geofence) => (
                  <div
                    key={geofence.id}
                    className="flex items-center justify-between rounded-lg border border-green-100 bg-green-50 p-4"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {geofence.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {geofence.category}
                      </p>
                    </div>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      INSIDE
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Events */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 font-semibold text-gray-900">
              Detected Events
            </h2>

            {events.length === 0 ? (
              <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                No ENTRY or EXIT transitions detected for this update.
              </p>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex items-center gap-3">
                      {event.event_type === "ENTRY" ? (
                        <CheckCircle className="text-green-600" size={21} />
                      ) : (
                        <AlertTriangle className="text-orange-600" size={21} />
                      )}

                      <div>
                        <p className="font-semibold text-gray-900">
                          {event.event_type}
                        </p>
                        <p className="text-xs text-gray-500">
                          Geofence ID: {event.geofence_id}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs text-gray-500">
                      {event.timestamp
                        ? new Date(event.timestamp).toLocaleString()
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location History */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">
              Location History
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Previous GPS updates for the selected vehicle.
            </p>
          </div>

          <Activity className="text-blue-600" size={21} />
        </div>

        {historyLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-blue-600" size={26} />
          </div>
        ) : history.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">
            No location history available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4">Latitude</th>
                  <th className="px-5 py-4">Longitude</th>
                  <th className="px-5 py-4">Recorded At</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {history.map((location) => (
                  <tr key={location.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-gray-800">
                      {location.latitude}
                    </td>

                    <td className="px-5 py-4 font-medium text-gray-800">
                      {location.longitude}
                    </td>

                    <td className="px-5 py-4 text-gray-500">
                      <span className="flex items-center gap-2">
                        <Clock size={14} />
                        {location.timestamp
                          ? new Date(location.timestamp).toLocaleString()
                          : "—"}
                      </span>
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

export default VehicleTracking;
