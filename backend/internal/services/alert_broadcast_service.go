package services

import (
	"encoding/json"
	"fmt"

	"mapup-geofencing/config"
	"mapup-geofencing/internal/models"
	appws "mapup-geofencing/internal/websocket"
)

func BroadcastConfiguredAlerts(hub *appws.Hub, violations []models.Violation) error {
	for _, violation := range violations {

		// Check whether an alert configuration matches this event.
		var count int64

		err := config.DB.Model(&models.AlertConfig{}).
			Where(`
				geofence_id = ?
				AND (vehicle_id IS NULL OR vehicle_id = ?)
				AND (event_type = ? OR event_type = 'BOTH')
			`,
				violation.GeofenceID,
				violation.VehicleID,
				violation.EventType,
			).
			Count(&count).Error

		if err != nil {
			return err
		}

		// Do not broadcast events without a matching configuration.
		if count == 0 {
			continue
		}

		// Fetch vehicle information.
		var vehicle models.Vehicle
		if err := config.DB.First(&vehicle, violation.VehicleID).Error; err != nil {
			return err
		}

		// Fetch geofence information.
		var geofence models.Geofence
		if err := config.DB.First(&geofence, violation.GeofenceID).Error; err != nil {
			return err
		}

		// Prepare the WebSocket event payload.
		event := map[string]interface{}{
			"event_id":  violation.ID,
			"type":      violation.EventType,
			"timestamp": violation.Timestamp,
			"vehicle": map[string]interface{}{
				"id":             vehicle.ID,
				"vehicle_number": vehicle.VehicleNumber,
				"driver_name":    vehicle.DriverName,
				"type":           vehicle.Type,
			},
			"geofence": map[string]interface{}{
				"id":       geofence.ID,
				"name":     geofence.Name,
				"category": geofence.Category,
			},
			"location": map[string]interface{}{
				"latitude":  violation.Latitude,
				"longitude": violation.Longitude,
			},
		}

		message, err := json.Marshal(event)
		if err != nil {
			return fmt.Errorf("failed to encode alert event: %w", err)
		}

		// Broadcast to all connected WebSocket clients.
		if err := hub.Publish(message); err != nil {
			return err
		}
	}

	return nil
}
