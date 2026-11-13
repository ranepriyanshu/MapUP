
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  RefreshCw,
  X,
  Loader2,
  Car,
  Search,
  User,
  Phone,
} from "lucide-react";

import {
  getVehicles,
  createVehicle,
} from "../services/apiService";

const initialForm = {
  vehicle_number: "",
  driver_name: "",
  type: "Truck",
  phone: "",
};

function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState(initialForm);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getVehicles();

      setVehicles(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      console.error("Fetch vehicles error:", err);
      setError("Unable to fetch vehicles. Check your backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

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

    const payload = {
      vehicle_number: formData.vehicle_number.trim().toUpperCase(),
      driver_name: formData.driver_name.trim(),
      type: formData.type,
      phone: formData.phone.trim(),
    };

    if (!payload.vehicle_number || !payload.driver_name || !payload.phone) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!/^[0-9+\-\s()]{7,20}$/.test(payload.phone)) {
      setError("Please enter a valid phone number.");
      return;
    }

    try {
      setSubmitting(true);

      await createVehicle(payload);

      setSuccess("Vehicle registered successfully!");
      setFormData(initialForm);
      setShowForm(false);

      await fetchVehicles();
    } catch (err) {
      console.error("Create vehicle error:", err);

      setError(
        err.response?.data?.message ||
        "Unable to register vehicle. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVehicles = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) return vehicles;

    return vehicles.filter((vehicle) =>
      [
        vehicle.vehicle_number,
        vehicle.driver_name,
        vehicle.type,
        vehicle.phone,
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchText)
    );
  }, [vehicles, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Vehicle Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Register and manage your fleet vehicles.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={fetchVehicles}
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
            Add Vehicle
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Total Vehicles</p>
            <Car className="text-blue-600" size={22} />
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {loading ? "..." : vehicles.length}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Registered in the system
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Search Results</p>
            <Search className="text-purple-600" size={22} />
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {loading ? "..." : filteredVehicles.length}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Vehicles matching your search
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by vehicle number, driver name, type..."
          className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500"
        />
      </div>

      {/* Vehicle Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            Registered Vehicles
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="py-12 text-center">
            <Car className="mx-auto mb-3 text-gray-400" size={34} />
            <p className="font-medium text-gray-700">
              No vehicles found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Register a vehicle or try a different search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4">Vehicle</th>
                  <th className="px-5 py-4">Driver</th>
                  <th className="px-5 py-4">Vehicle Type</th>
                  <th className="px-5 py-4">Phone Number</th>
                  <th className="px-5 py-4">Registered On</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-50 p-2">
                          <Car size={19} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {vehicle.vehicle_number}
                          </p>
                          <p className="text-xs text-gray-500">
                            ID: {vehicle.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <User size={15} className="text-gray-400" />
                        {vehicle.driver_name}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                        {vehicle.type}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Phone size={15} className="text-gray-400" />
                        {vehicle.phone}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-gray-500">
                      {vehicle.created_at
                        ? new Date(vehicle.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Vehicle Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-auto w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Register New Vehicle
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Enter the vehicle and driver details.
                </p>
              </div>

              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Vehicle Number *
                </label>
                <input
                  name="vehicle_number"
                  value={formData.vehicle_number}
                  onChange={handleChange}
                  required
                  placeholder="e.g. MP09AB1234"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Driver Name *
                </label>
                <input
                  name="driver_name"
                  value={formData.driver_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter driver name"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Vehicle Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="Truck">Truck</option>
                  <option value="Van">Van</option>
                  <option value="Car">Car</option>
                  <option value="Bike">Bike</option>
                  <option value="Bus">Bus</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Phone Number *
                </label>
                <input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="Enter driver phone number"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
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
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {submitting ? "Registering..." : "Register Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vehicles;
