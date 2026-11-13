
import { useEffect, useState } from "react";

import { useNotifications } from "../context/NotificationContext";

import {
  Activity,
  Clock,
  Car,
  MapPin,
  Map,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Wifi,
  WifiOff,
} from "lucide-react";

import StatCard from "../components/StatCard";

import {
  getVehicles,
  getGeofences,
  getViolationHistory,
} from "../services/apiService";

function Dashboard() {
  const [stats, setStats] = useState({
    vehicles: 0,
    geofences: 0,
    violations: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const {
    notifications,
    connected,
  } = useNotifications();

  const recentActivity = notifications.slice(0, 8);

  // Fetch dashboard statistics
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          vehicleResponse,
          geofenceResponse,
          violationResponse,
        ] = await Promise.all([
          getVehicles(),
          getGeofences(),
          getViolationHistory({ limit: 500 }),
        ]);

        setStats({
          vehicles: vehicleResponse.data?.length ?? 0,
          geofences: geofenceResponse.data?.length ?? 0,
          violations: violationResponse.data?.length ?? 0,
        });
      } catch (err) {
        console.error("Dashboard API error:", err);

        setError(
          "Unable to load dashboard data. Check backend connection."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Dashboard statistics cards
  const cards = [
    {
      title: "Total Vehicles",
      value: stats.vehicles,
      description: "Registered vehicles",
      icon: Car,
      color: "blue",
    },
    {
      title: "Total Geofences",
      value: stats.geofences,
      description: "Configured geofences",
      icon: Map,
      color: "purple",
    },
    {
      title: "Total Violations",
      value: stats.violations,
      description: "Recorded entry/exit events",
      icon: AlertTriangle,
      color: "orange",
    },
    {
      title: "Active Tracking",
      value: "—",
      description: "Live tracking integration pending",
      icon: Activity,
      color: "green",
    },
  ];

  return (
    <div className="space-y-6">

      {/* Dashboard Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard Overview
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Monitor vehicles, geofences and geofence events.
        </p>
      </div>

      {/* API Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard
            key={card.title}
            {...card}
            value={loading ? "..." : card.value}
          />
        ))}
      </div>

      {/* Live Geofencing Activity */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

        {/* Activity Header */}
        <div className="flex flex-col justify-between gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center">

          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Live Geofencing Activity
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Real-time vehicle ENTRY and EXIT events
            </p>
          </div>

          {/* WebSocket Status */}
          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />

                <Wifi size={16} className="text-green-600" />

                <span className="text-xs font-medium text-green-700">
                  WebSocket Connected
                </span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-red-500" />

                <WifiOff size={16} className="text-red-600" />

                <span className="text-xs font-medium text-red-600">
                  Disconnected
                </span>
              </>
            )}
          </div>

        </div>

        {/* Activity List */}
        {recentActivity.length === 0 ? (

          <div className="py-14 text-center">
            <Activity
              size={35}
              className="mx-auto mb-3 text-gray-400"
            />

            <p className="font-medium text-gray-700">
              No recent activity
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Vehicle geofence events will appear here automatically.
            </p>
          </div>

        ) : (

          <div className="divide-y divide-gray-100">

            {recentActivity.map((event) => {
              const isEntry = event.type === "ENTRY";

              return (
                <div
                  key={event.localId}
                  className="flex items-start gap-4 px-5 py-4 transition hover:bg-gray-50"
                >

                  {/* Event Icon */}
                  <div
                    className={`rounded-lg p-2.5 ${
                      isEntry
                        ? "bg-green-50 text-green-600"
                        : "bg-orange-50 text-orange-600"
                    }`}
                  >
                    {isEntry ? (
                      <ArrowDownRight size={20} />
                    ) : (
                      <ArrowUpRight size={20} />
                    )}
                  </div>

                  {/* Event Details */}
                  <div className="min-w-0 flex-1">

                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {event.vehicle?.vehicle_number ||
                          `Vehicle #${event.vehicle?.id ?? "Unknown"}`}
                      </p>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isEntry
                            ? "bg-green-50 text-green-700"
                            : "bg-orange-50 text-orange-700"
                        }`}
                      >
                        {event.type}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-600">
                      {isEntry ? "Entered" : "Exited"}{" "}

                      <span className="font-medium text-gray-800">
                        {event.geofence?.name ||
                          `Geofence #${event.geofence?.id ?? "Unknown"}`}
                      </span>
                    </p>

                    {/* Timestamp and Coordinates */}
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-400">

                      <span className="flex items-center gap-1">
                        <Clock size={13} />

                        {event.timestamp
                          ? new Date(event.timestamp).toLocaleString()
                          : "Just received"}
                      </span>

                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={13} />

                          {Number(
                            event.location.latitude
                          ).toFixed(5)},

                          {" "}

                          {Number(
                            event.location.longitude
                          ).toFixed(5)}
                        </span>
                      )}

                    </div>

                  </div>

                  <Car
                    size={19}
                    className="mt-1 shrink-0 text-gray-400"
                  />

                </div>
              );
            })}

          </div>
        )}

        {/* Activity Footer */}
        {notifications.length > 8 && (
          <div className="border-t border-gray-100 px-5 py-3 text-center text-xs text-gray-500">
            Showing the latest 8 of {notifications.length} notifications.
          </div>
        )}

      </div>

    </div>
  );
}

export default Dashboard;
