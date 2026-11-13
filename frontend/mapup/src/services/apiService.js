
import api from "./api";

// ===============================
// GEOFENCE APIs
// ===============================

export const getGeofences = async (category) => {
  const response = await api.get("/geofences", {
    params: category ? { category } : {},
  });

  return response.data;
};

export const createGeofence = async (geofenceData) => {
  const response = await api.post("/geofences", geofenceData);
  return response.data;
};

// ===============================
// VEHICLE APIs
// ===============================

export const getVehicles = async () => {
  const response = await api.get("/vehicles");
  return response.data;
};

export const createVehicle = async (vehicleData) => {
  const response = await api.post("/vehicles", vehicleData);
  return response.data;
};

export const updateVehicleLocation = async (locationData) => {
  const response = await api.post(
    "/vehicles/location",
    locationData
  );

  return response.data;
};

export const getVehicleLocationHistory = async (vehicleId) => {
  const response = await api.get(
    `/vehicles/location/${vehicleId}`
  );

  return response.data;
};

// ===============================
// ALERT APIs
// ===============================

export const configureAlert = async (alertData) => {
  const response = await api.post(
    "/alerts/configure",
    alertData
  );

  return response.data;
};

export const getAlerts = async (filters = {}) => {
  const response = await api.get("/alerts", {
    params: filters,
  });

  return response.data;
};

// ===============================
// VIOLATION APIs
// ===============================

export const getViolationHistory = async (filters = {}) => {
  const response = await api.get("/violations/history", {
    params: filters,
  });

  return response.data;
};
