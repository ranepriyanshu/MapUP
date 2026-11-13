
import { useEffect, useState } from "react";
import {
  Plus,
  MapPin,
  RefreshCw,
  X,
  Loader2,
  Trash2,
} from "lucide-react";

import {
  getGeofences,
  createGeofence,
} from "../services/apiService";

const categories = [
  "delivery_zone",
  "restricted_zone",
  "toll_zone",
  "customer_area",
];

const categoryLabels = {
  delivery_zone: "Delivery Zone",
  restricted_zone: "Restricted Zone",
  toll_zone: "Toll Zone",
  customer_area: "Customer Area",
};

function Geofences() {
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "delivery_zone",
    coordinates:
      "22.7196, 75.8577\n22.7300, 75.8600\n22.7350, 75.8450\n22.7196, 75.8577",
  });

  const fetchGeofences = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getGeofences();

      setGeofences(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      console.error("Failed to fetch geofences:", err);
      setError("Unable to load geofences. Please check the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeofences();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    try {
      const coordinates = formData.coordinates
        .trim()
        .split("\n")
        .filter((line) => line.trim() !== "")
        .map((line) => {
          const values = line.split(",").map((value) => Number(value.trim()));

          if (
            values.length !== 2 ||
            !values.every(Number.isFinite)
          ) {
            throw new Error(
              "Each coordinate must contain latitude and longitude separated by a comma."
            );
          }

          return values;
        });

      if (coordinates.length < 4) {
        throw new Error("A polygon must contain at least 4 coordinate pairs.");
      }

      const first = coordinates[0];
      const last = coordinates[coordinates.length - 1];

      if (first[0] !== last[0] || first[1] !== last[1]) {
        throw new Error(
          "The polygon must be closed. Repeat the first coordinate at the end."
        );
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        coordinates,
      };

      if (!payload.name) {
        throw new Error("Geofence name is required.");
      }

      setSubmitting(true);

      await createGeofence(payload);

      setSuccess("Geofence created successfully!");

      setFormData({
        name: "",
        description: "",
        category: "delivery_zone",
        coordinates: "",
      });

      setShowForm(false);
      await fetchGeofences();
    } catch (err) {
      console.error("Create geofence error:", err);

      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to create geofence."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGeofences =
    selectedCategory === "all"
      ? geofences
      : geofences.filter(
          (item) => item.category === selectedCategory
        );

  const getCategoryStyle = (category) => {
    const styles = {
      delivery_zone: "bg-blue-50 text-blue-700",
      restricted_zone: "bg-red-50 text-red-700",
      toll_zone: "bg-orange-50 text-orange-700",
      customer_area: "bg-green-50 text-green-700",
    };

    return styles[category] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Geofence Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage geographical boundaries.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={fetchGeofences}
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
            Create Geofence
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
          <p className="text-sm text-gray-500">Total Geofences</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {geofences.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Selected Category</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">
            {selectedCategory === "all"
              ? "All Categories"
              : categoryLabels[selectedCategory]}
          </p>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {["all", ...categories].map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              selectedCategory === category
                ? "bg-blue-600 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {category === "all"
              ? "All"
              : categoryLabels[category]}
          </button>
        ))}
      </div>

      {/* Geofence Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            Registered Geofences
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : filteredGeofences.length === 0 ? (
          <div className="py-12 text-center">
            <MapPin className="mx-auto mb-3 text-gray-400" size={32} />
            <p className="font-medium text-gray-700">
              No geofences found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Create a geofence to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4">Geofence</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Coordinates</th>
                  <th className="px-5 py-4">Created At</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredGeofences.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.description || "No description"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getCategoryStyle(item.category)}`}
                      >
                        {categoryLabels[item.category] || item.category}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {item.coordinates?.length || 0} points
                    </td>

                    <td className="px-5 py-4 text-gray-500">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Geofence Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-auto w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Create New Geofence
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Define a polygon boundary for your geofence.
                </p>
              </div>

              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Geofence Name *
                </label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Indore Delivery Zone"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Describe this geofence..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Polygon Coordinates *
                </label>

                <p className="mb-2 text-xs text-gray-500">
                  Enter one latitude, longitude pair per line.
                  Repeat the first point at the end to close the polygon.
                </p>

                <textarea
                  name="coordinates"
                  value={formData.coordinates}
                  onChange={handleChange}
                  required
                  rows={6}
                  placeholder={"22.7196, 75.8577\n22.7300, 75.8600\n22.7350, 75.8450\n22.7196, 75.8577"}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Format: latitude, longitude — minimum 4 coordinate pairs.
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
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {submitting ? "Creating..." : "Create Geofence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Geofences;
