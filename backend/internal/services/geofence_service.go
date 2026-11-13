
package services

import (
	"mapup-geofencing/internal/models"

	"gorm.io/gorm"
)

// ============================================
// GET GEOFENCES AT A LOCATION
// ============================================

func GetGeofencesAtLocation(
	db *gorm.DB,
	latitude float64,
	longitude float64,
) ([]models.Geofence, error) {

	var geofences []models.Geofence

	err := db.
		Where(`
			ST_Covers(
				geom,
				ST_SetSRID(
					ST_MakePoint(?, ?),
					4326
				)
			)
		`, longitude, latitude).
		Find(&geofences).Error

	return geofences, err
}

// ============================================
// DETECT ENTRY / EXIT EVENTS
// ============================================

func DetectTransitions(
	tx *gorm.DB,
	previousLocation *models.VehicleLocation,
	currentLocation models.VehicleLocation,
) ([]models.Geofence, []models.Violation, error) {

	// STEP 1: Find geofences containing current location.
	currentGeofences, err := GetGeofencesAtLocation(
		tx,
		currentLocation.Latitude,
		currentLocation.Longitude,
	)

	if err != nil {
		return nil, nil, err
	}

	// STEP 2: First location establishes the baseline.
	if previousLocation == nil {
		return currentGeofences, []models.Violation{}, nil
	}

	// STEP 3: Find geofences containing previous location.
	previousGeofences, err := GetGeofencesAtLocation(
		tx,
		previousLocation.Latitude,
		previousLocation.Longitude,
	)

	if err != nil {
		return nil, nil, err
	}

	// STEP 4: Create maps for comparing geofence IDs.
	previousMap := make(map[uint]bool)
	currentMap := make(map[uint]bool)

	for _, geofence := range previousGeofences {
		previousMap[geofence.ID] = true
	}

	for _, geofence := range currentGeofences {
		currentMap[geofence.ID] = true
	}

	// STEP 5: Detect ENTRY and EXIT events.
	var violations []models.Violation

	// ENTRY: Previously outside, currently inside.
	for _, geofence := range currentGeofences {
		if !previousMap[geofence.ID] {
			violations = append(violations, models.Violation{
				VehicleID:  currentLocation.VehicleID,
				GeofenceID: geofence.ID,
				EventType:  "ENTRY",
				Latitude:   currentLocation.Latitude,
				Longitude:  currentLocation.Longitude,
				Timestamp:  currentLocation.Timestamp,
			})
		}
	}

	// EXIT: Previously inside, currently outside.
	for _, geofence := range previousGeofences {
		if !currentMap[geofence.ID] {
			violations = append(violations, models.Violation{
				VehicleID:  currentLocation.VehicleID,
				GeofenceID: geofence.ID,
				EventType:  "EXIT",
				Latitude:   currentLocation.Latitude,
				Longitude:  currentLocation.Longitude,
				Timestamp:  currentLocation.Timestamp,
			})
		}
	}

	// STEP 6: Save violations using the caller's transaction.
	for i := range violations {
		if err := tx.Create(&violations[i]).Error; err != nil {
			return nil, nil, err
		}
	}

	return currentGeofences, violations, nil
}
