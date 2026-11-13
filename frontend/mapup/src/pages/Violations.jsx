
import { useEffect, useState } from "react";
import {
  History,
  RefreshCw,
  Loader2,
  Search,
  Calendar,
  MapPin,
  Car,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

import {
  getViolationHistory,
  getVehicles,
  getGeofences,
} from "../services/apiService";

const initialFilters = {
  vehicle_id: "",
  geofence_id: "",
  start_date: "",
  end_date: "",
  limit: "50",
};

function toRFC3339(date, endOfDay = false) {
  const value = new Date(`${date}T00:00:00`);

  if (endOfDay) {
    value.setHours(23, 59, 59, 999);
  }

  return value.toISOString();
}

function Violations() {
  const [violations, setViolations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [geofences, setGeofences] = useState([]);

  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load vehicle and geofence dropdown data.
  useEffect(() => {
    const loadDropdownData = async () => {
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
        console.error("Dropdown data error:", err);
        setError("Unable to load vehicle and geofence filters.");
      }
    };

    loadDropdownData();
  }, []);

  // Fetch violation history whenever applied filters change.
  useEffect(() => {
    const fetchViolations = async () => {
      try {
        setLoading(true);
        setError("");

        const params = {
          limit: Number(appliedFilters.limit),
        };

        if (appliedFilters.vehicle_id) {
          params.vehicle_id = appliedFilters.vehicle_id;
        }

        if (appliedFilters.geofence_id) {
          params.geofence_id = appliedFilters.geofence_id;
        }

        if (appliedFilters.start_date) {
          params.start_date = toRFC3339(
            appliedFilters.start_date
          );
        }

        if (appliedFilters.end_date) {
          params.end_date = toRFC3339(
            appliedFilters.end_date,
            true
          );
        }

        const response = await getViolationHistory(params);

        setViolations(
          Array.isArray(response.data) ? response.data : []
        );
      } catch (err) {
        console.error("Violation history error:", err);
        setError(
          err.response?.data?.message ||
          "Unable to load violation history."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchViolations();
  }, [appliedFilters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();

    if (
      filters.start_date &&
      filters.end_date &&
      filters.start_date > filters.end_date
    ) {
      setError("Start date cannot be later than end date.");
      return;
    }

    setAppliedFilters({ ...filters });
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  };

  const handleRefresh = () => {
    setAppliedFilters({ ...appliedFilters });
  };

  const getVehicleName = (vehicleId) => {
    const vehicle = vehicles.find(
      (item) => Number(item.id) === Number(vehicleId)
    );

    return vehicle
      ? vehicle.vehicle_number
      : `Vehicle #${vehicleId}`;
  };

  const getGeofenceName = (geofenceId) => {
    const geofence = geofences.find(
      (item) => Number(item.id) === Number(geofenceId)
    );

    return geofence
      ? geofence.name
      : `Geofence #${geofenceId}`;
  };

  const entryCount = violations.filter(
    (item) => item.event_type === "ENTRY"
  ).length;

  const exitCount = violations.filter(
    (item) => item.event_type === "EXIT"
  ).length;

  const getEventStyle = (eventType) => {
    return eventType === "ENTRY"
      ? "bg-green-50 text-green-700"
      : "bg-orange-50 text-orange-700";
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Violation History
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Monitor vehicle ENTRY and EXIT events across geofences.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={17} />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Total Events
            </p>
            <History size={21} className="text-blue-600" />
          </div>

          <p className="mt-3 text-3xl font-bold text-gray-900">
            {loading ? "..." : violations.length}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Events matching selected filters
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              ENTRY Events
            </p>
            <CheckCircle size={21} className="text-green-600" />
          </div>

          <p className="mt-3 text-3xl font-bold text-gray-900">
            {loading ? "..." : entryCount}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Vehicles entering geofences
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              EXIT Events
            </p>
            <XCircle size={21} className="text-orange-600" />
          </div>

          <p className="mt-3 text-3xl font-bold text-gray-900">
            {loading ? "..." : exitCount}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Vehicles exiting geofences
          </p>
        </div>

      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-5 flex items-center gap-2">
          <Search size={19} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">
            Filter Violation History
          </h2>
        </div>

        <form onSubmit={handleApplyFilters}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Vehicle
              </label>

              <select
                name="vehicle_id"
                value={filters.vehicle_id}
                onChange={handleFilterChange}
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

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Geofence
              </label>

              <select
                name="geofence_id"
                value={filters.geofence_id}
                onChange={handleFilterChange}
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
                Result Limit
              </label>

              <select
                name="limit"
                value={filters.limit}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="50">50 Records</option>
                <option value="100">100 Records</option>
                <option value="250">250 Records</option>
                <option value="500">500 Records</option>
              </select>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar size={15} />
                Start Date
              </label>

              <input
                type="date"
                name="start_date"
                value={filters.start_date}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar size={15} />
                End Date
              </label>

              <input
                type="date"
                name="end_date"
                value={filters.end_date}
                onChange={handleFilterChange}
                min={filters.start_date || undefined}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reset Filters
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Search size={16} />
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      {/* Violation History Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">
              Event History
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Latest geofence transitions
            </p>
          </div>

          <History size={21} className="text-blue-600" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2
              className="animate-spin text-blue-600"
              size={28}
            />
          </div>
        ) : violations.length === 0 ? (
          <div className="py-12 text-center">
            <History
              className="mx-auto mb-3 text-gray-400"
              size={35}
            />

            <p className="font-medium text-gray-700">
              No violation events found
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Try changing your filters or submit a vehicle location update.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">

              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4">Event ID</th>
                  <th className="px-5 py-4">Vehicle</th>
                  <th className="px-5 py-4">Geofence</th>
                  <th className="px-5 py-4">Event Type</th>
                  <th className="px-5 py-4">Location</th>
                  <th className="px-5 py-4">Timestamp</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {violations.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">

                    <td className="px-5 py-4 font-medium text-gray-700">
                      #{item.id}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Car size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-800">
                          {getVehicleName(item.vehicle_id)}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-gray-400" />
                        <span className="text-gray-700">
                          {getGeofenceName(item.geofence_id)}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getEventStyle(item.event_type)}`}
                      >
                        {item.event_type}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {Number(item.latitude).toFixed(5)},{" "}
                      {Number(item.longitude).toFixed(5)}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-gray-500">
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

        {!loading && violations.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
            Showing {violations.length} records. Maximum API result limit: 500.
          </div>
        )}
      </div>

    </div>
  );
}

export default Violations;
