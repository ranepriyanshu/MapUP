
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Geofences from "./pages/Geofences";
import Vehicles from "./pages/Vehicles";
import VehicleTracking from "./pages/VehicleTracking";
import Alerts from "./pages/Alerts";
import Violations from "./pages/Violations";
import FleetMap from "./pages/FleetMap";
import { NotificationProvider } from "./context/NotificationContext";

function App() {
  return (
      <NotificationProvider>
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">

        <Sidebar />

        <div className="ml-64">
          <Navbar />

          <main className="p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />

              <Route
                path="/geofences"
                element={<Geofences />}
              />

              <Route
                path="/vehicles"
                element={<Vehicles />}
              />
              <Route path="/tracking" element={<VehicleTracking />} />

              <Route
                path="/alerts"
                element={<Alerts />}
              />

              <Route
                path="/violations"
                element={<Violations />}
              />
              <Route
                path="/map"
                element={<FleetMap />}
              />  
            </Routes>
          </main>
        </div>

      </div>
    </BrowserRouter>
      </NotificationProvider>
  );
}

export default App;
