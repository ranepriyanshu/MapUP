
import { useEffect, useState } from "react";
import {
  Bell,
  Plus,
  RefreshCw,
  Loader2,
  X,
  ShieldCheck,
  Car,
  MapPin,
} from "lucide-react";

import {
  getAlerts,
  configureAlert,
  getVehicles,
  getGeofences,
} from "../services/apiService";

const initialForm = {
  geofence_id: "",
  vehicle_id: "",
  event_type: "BOTH",
};

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [geofences, setGeofences] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState(initialForm);

  const [geofenceFilter, setGeofenceFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError("");

      const filters = {};

      if (geofenceFilter) {
        filters.geofence_id = geofenceFilter;
      }

      if (vehicleFilter) {
        filters.vehicle_id = vehicleFilter;
      }

      const response = await getAlerts(filters);

      setAlerts(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      console.error("Fetch alerts error:", err);
      setError("Unable to load alert configurations.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [vehicleResponse, geofenceResponse] = await Promise.all([
        getVehicles(),
        getGeofences(),
      ]);

      setVehicles(
        Array.isArray(vehicleResponse.data)
          ? vehicleResponse.data
          : []
      );

      setGeofences(
        Array.isArray(geofenceResponse.data)
          ? geofenceResponse.data
          : []
      );
    } catch (err) {
      console.error("Load form data error:", err);
      setError("Unable to load vehicles or geofences.");
    }
  };

  useEffect(() => {
    fetchFormData();
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [geofenceFilter, vehicleFilter]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.geofence_id) {
      setError("Please select a geofence.");
      return;
    }

    const payload = {
      geofence_id: Number(formData.geofence_id),
      event_type: formData.event_type,
    };

    // An empty vehicle_id means the alert applies to all vehicles.
    if (formData.vehicle_id) {
      payload.vehicle_id = Number(formData.vehicle_id);
    }

    try {
      setSubmitting(true);

      await configureAlert(payload);

      setSuccess("Alert configuration created successfully!");

      setFormData(initialForm);
      setShowForm(false);

      await fetchAlerts();
    } catch (err) {
      console.error("Configure alert error:", err);

      setError(
        err.response?.data?.message ||
        "Unable to configure alert. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getVehicleName = (vehicleId) => {
    if (!vehicleId) return "All Vehicles";

    const vehicle = vehicles.find(
      (item) => item.id === vehicleId
    );

    return vehicle
      ? vehicle.vehicle_number
      : `Vehicle #${vehicleId}`;
  };

  const getGeofenceName = (geofenceId) => {
    const geofence = geofences.find(
      (item) => item.id === geofenceId
    );

    return geofence
      ? geofence.name
      : `Geofence #${geofenceId}`;
  };

  const getEventStyle = (eventType) => {
    switch (eventType) {
      case "ENTRY":
        return "bg-green-50 text-green-700";

      case "EXIT":
        return "bg-orange-50 text-orange-700";

      case "BOTH":
        return "bg-blue-50 text-blue-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Alert Configuration
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Configure notifications for vehicle geofence events.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={fetchAlerts}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            onClick={() => {
              setError("");
              setSuccess("");
              setShowForm(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={17} />
            Configure Alert
          </button>
        </div>
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

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Total Configurations
            </p>
            <Bell size={21} className="text-blue-600" />
          </div>

          <p className="mt-3 text-3xl font-bold text-gray-900">
            {loading ? "..." : alerts.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              All Vehicle Rules
            </p>
            <Car size={21} className="text-purple-600" />
          </div>

          <p className="mt-3 text-3xl font-bold text-gray-900">
            {loading
              ? "..."
              : alerts.filter((alert) => !alert.vehicle_id).length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Specific Vehicle Rules
            </p>
            <ShieldCheck size={21} className="text-green-600" />
          </div>

          <p className="mt-3 text-3xl font-bold text-gray-900">
            {loading
              ? "..."
              : alerts.filter((alert) => alert.vehicle_id).length}
          </p>
        </div>

      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 md:grid-cols-2">

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Filter by Geofence
          </label>

          <select
            value={geofenceFilter}
            onChange={(e) => setGeofenceFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All Geofences</option>

            {geofences.map((geofence) => (
              <option key={geofence.id} value={geofence.id}>
                {geofence.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Filter by Vehicle
          </label>

          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All Vehicles</option>

            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.vehicle_number}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Alert Configurations Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            Configured Alerts
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2
              className="animate-spin text-blue-600"
              size={28}
            />
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-12 text-center">
            <Bell
              className="mx-auto mb-3 text-gray-400"
              size={34}
            />

            <p className="font-medium text-gray-700">
              No alert configurations found
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Configure an alert to start receiving geofence notifications.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">

              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4">ID</th>
                  <th className="px-5 py-4">Geofence</th>
                  <th className="px-5 py-4">Vehicle</th>
                  <th className="px-5 py-4">Event Type</th>
                  <th className="px-5 py-4">Created At</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-5 py-4 font-medium text-gray-700">
                      #{alert.id}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin
                          size={16}
                          className="text-gray-400"
                        />

                        <span className="font-medium text-gray-800">
                          {getGeofenceName(alert.geofence_id)}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {getVehicleName(alert.vehicle_id)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getEventStyle(alert.event_type)}`}
                      >
                        {alert.event_type}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-500">
                      {alert.created_at
                        ? new Date(alert.created_at).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}
      </div>

      {/* Configure Alert Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">

          <div className="my-auto w-full max-w-lg rounded-xl bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Configure New Alert
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Define when geofence notifications should be triggered.
                </p>
              </div>

              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Select Geofence *
                </label>

                <select
                  name="geofence_id"
                  value={formData.geofence_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Choose a geofence</option>

                  {geofences.map((geofence) => (
                    <option
                      key={geofence.id}
                      value={geofence.id}
                    >
                      {geofence.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Select Vehicle
                </label>

                <select
                  name="vehicle_id"
                  value={formData.vehicle_id}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">
                    All Vehicles
                  </option>

                  {vehicles.map((vehicle) => (
                    <option
                      key={vehicle.id}
                      value={vehicle.id}
                    >
                      {vehicle.vehicle_number} — {vehicle.driver_name}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-gray-500">
                  Leave this empty to apply the alert to every vehicle.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Event Type *
                </label>

                <select
                  name="event_type"
                  value={formData.event_type}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="ENTRY">ENTRY Only</option>
                  <option value="EXIT">EXIT Only</option>
                  <option value="BOTH">ENTRY and EXIT</option>
                </select>
              </div>

              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-800">
                  How this alert works
                </p>

                <p className="mt-1 text-xs leading-5 text-blue-700">
                  When a selected vehicle enters or exits the selected
                  geofence, the system checks this configuration and
                  broadcasts a notification through WebSocket.
                </p>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || geofences.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {submitting
                    ? "Saving..."
                    : "Save Configuration"}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Alerts;
 