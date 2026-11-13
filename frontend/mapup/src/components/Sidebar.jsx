
import {
  LayoutDashboard,
  Map,
  MapPinned,
  Truck,
  Navigation,
  Bell,
  History,
  ShieldCheck,
} from "lucide-react";

import { NavLink } from "react-router-dom";

const navigation = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Geofences", path: "/geofences", icon: Map },
  { name: "Vehicles", path: "/vehicles", icon: Truck },
  { name: "Vehicle Tracking", path: "/tracking", icon: Navigation },
  { name: "Alerts", path: "/alerts", icon: Bell },
  { name: "Violations", path: "/violations", icon: History },
  { name: "Fleet Map", path: "/map", icon: MapPinned },
];

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-64 flex-col bg-slate-950 text-white">

      {/* Logo */}
      <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
          <ShieldCheck size={23} />
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-wide">MapUP</h1>
          <p className="text-xs text-slate-400">
            Geofencing Platform
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-4 py-6">
        <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Main Menu
        </p>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <Icon size={19} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-slate-800 p-5">
        <p className="text-xs text-slate-500">
          MapUP Geofencing System
        </p>
        <p className="mt-1 text-sm text-slate-300">
          Version 1.0.0
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
