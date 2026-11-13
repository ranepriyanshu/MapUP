package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"mapup-geofencing/config"
	"mapup-geofencing/internal/models"
	"mapup-geofencing/internal/services"
	appws "mapup-geofencing/internal/websocket"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ==========================================
// REQUEST STRUCTURES
// ==========================================

type CreateVehicleRequest struct {
	VehicleNumber string `json:"vehicle_number" binding:"required"`
	DriverName    string `json:"driver_name" binding:"required"`
	Type          string `json:"type" binding:"required"`
	Phone         string `json:"phone" binding:"required"`
}

type UpdateVehicleLocationRequest struct {
	VehicleID uint     `json:"vehicle_id" binding:"required"`
	Latitude  *float64 `json:"latitude" binding:"required"`
	Longitude *float64 `json:"longitude" binding:"required"`
	Timestamp string   `json:"timestamp" binding:"required"`
}

var errStaleLocation = errors.New(
	"GPS timestamp is older than or equal to the latest recorded location",
)

func isValidGPSCoordinates(latitude, longitude float64) bool {
	return !math.IsNaN(latitude) &&
		!math.IsNaN(longitude) &&
		!math.IsInf(latitude, 0) &&
		!math.IsInf(longitude, 0) &&
		latitude >= -90 &&
		latitude <= 90 &&
		longitude >= -180 &&
		longitude <= 180
}

// ==========================================
// WEBSOCKET LOCATION BROADCAST
// ==========================================

func BroadcastVehicleLocation(
	hub *appws.Hub,
	vehicle models.Vehicle,
	location models.VehicleLocation,
) error {

	if hub == nil {
		return errors.New("websocket hub is not initialized")
	}

	event := map[string]interface{}{
		"event_id":  location.ID,
		"type":      "LOCATION_UPDATE",
		"timestamp": location.Timestamp,
		"vehicle": map[string]interface{}{
			"id":             vehicle.ID,
			"vehicle_number": vehicle.VehicleNumber,
			"driver_name":    vehicle.DriverName,
			"type":           vehicle.Type,
		},
		"location": map[string]interface{}{
			"latitude":  location.Latitude,
			"longitude": location.Longitude,
		},
	}

	message, err := json.Marshal(event)
	if err != nil {
		return err
	}

	return hub.Publish(message)

}

// ==========================================
// 1. POST /vehicles
// REGISTER A NEW VEHICLE
// ==========================================

func CreateVehicle(c *gin.Context) {
	start := time.Now()

	var request CreateVehicleRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid request body: " + err.Error(),
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	request.VehicleNumber = strings.ToUpper(strings.TrimSpace(request.VehicleNumber))
	request.DriverName = strings.TrimSpace(request.DriverName)
	request.Type = strings.TrimSpace(request.Type)
	request.Phone = strings.TrimSpace(request.Phone)

	if request.VehicleNumber == "" ||
		request.DriverName == "" ||
		request.Type == "" ||
		request.Phone == "" {

		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "All vehicle fields are required",
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	vehicle := models.Vehicle{
		VehicleNumber: request.VehicleNumber,
		DriverName:    request.DriverName,
		Type:          request.Type,
		Phone:         request.Phone,
	}

	if err := config.DB.Create(&vehicle).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to register vehicle",
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "Vehicle registered successfully",
		"data":    vehicle,
		"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
	})
}

// ==========================================
// 2. GET /vehicles
// RETRIEVE ALL VEHICLES
// ==========================================

func GetVehicles(c *gin.Context) {
	start := time.Now()

	vehicles := make([]models.Vehicle, 0)

	if err := config.DB.
		Order("created_at DESC").
		Find(&vehicles).Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch vehicles",
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Vehicles fetched successfully",
		"count":   len(vehicles),
		"data":    vehicles,
		"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
	})
}

// ==========================================
// 3. POST /vehicles/location
// SAVE GPS LOCATION AND DETECT TRANSITIONS
// ==========================================

func UpdateVehicleLocation(hub *appws.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		var request UpdateVehicleLocationRequest

		// STEP 1: Parse JSON request.
		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Invalid request body: " + err.Error(),
				"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
			})
			return
		}

		latitude := *request.Latitude
		longitude := *request.Longitude

		// STEP 2: Validate coordinates.
		if math.IsNaN(latitude) ||
			math.IsNaN(longitude) ||
			math.IsInf(latitude, 0) ||
			math.IsInf(longitude, 0) ||
			latitude < -90 ||
			latitude > 90 ||
			longitude < -180 ||
			longitude > 180 {

			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Invalid latitude or longitude",
				"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
			})
			return
		}

		// STEP 3: Parse timestamp.
		locationTime, err := time.Parse(time.RFC3339, request.Timestamp)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Invalid timestamp. Use RFC3339 format",
				"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
			})
			return
		}

		// Variables populated during the transaction.
		var vehicle models.Vehicle
		var currentLocation models.VehicleLocation
		var currentGeofences []models.Geofence
		var violations []models.Violation

		// STEP 4: Start database transaction.
		err = config.DB.Transaction(func(tx *gorm.DB) error {

			// Lock the vehicle row to serialize GPS processing
			// for this vehicle across concurrent requests.
			if err := tx.
				Clauses(clause.Locking{Strength: "UPDATE"}).
				First(&vehicle, request.VehicleID).Error; err != nil {

				return err
			}

			// STEP 5: Fetch the latest previous GPS location.
			var previousLocation models.VehicleLocation

			previousResult := tx.
				Where("vehicle_id = ?", request.VehicleID).
				Order("recorded_at DESC").
				Order("id DESC").
				Limit(1).
				Find(&previousLocation)

			if previousResult.Error != nil {
				return previousResult.Error
			}

			var previousLocationPtr *models.VehicleLocation

			if previousResult.RowsAffected > 0 {
				previousLocationPtr = &previousLocation

				// Reject duplicate or out-of-order timestamps.
				if !locationTime.After(previousLocation.Timestamp) {
					return errStaleLocation
				}
			}

			// STEP 6: Prepare current GPS location.
			currentLocation = models.VehicleLocation{
				VehicleID: request.VehicleID,
				Latitude:  latitude,
				Longitude: longitude,
				Timestamp: locationTime,
			}

			// STEP 7: Save GPS location inside transaction.
			if err := tx.Create(&currentLocation).Error; err != nil {
				return err
			}

			// STEP 8: Detect transitions using the same transaction.
			var err error

			currentGeofences, violations, err = services.DetectTransitions(
				tx,
				previousLocationPtr,
				currentLocation,
			)

			if err != nil {
				return err
			}

			return nil
		})

		// STEP 9: Handle transaction errors.
		if err != nil {

			if errors.Is(err, errStaleLocation) {
				c.JSON(http.StatusConflict, gin.H{
					"status":  "error",
					"message": err.Error(),
					"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
				})
				return
			}

			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{
					"status":  "error",
					"message": "Vehicle not found",
					"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
				})
				return
			}

			log.Printf("GPS location transaction failed: %v", err)

			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Failed to process vehicle location",
				"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
			})
			return
		}

		// STEP 10: Broadcast only after successful commit.
		if err := BroadcastVehicleLocation(
			hub,
			vehicle,
			currentLocation,
		); err != nil {
			log.Printf("Failed to broadcast vehicle location update: %v", err)
		}

		// STEP 11: Broadcast configured ENTRY/EXIT alerts.
		if len(violations) > 0 {
			if err := services.BroadcastConfiguredAlerts(hub, violations); err != nil {
				log.Printf("Failed to broadcast geofence alerts: %v", err)
			}
		}

		// STEP 12: Return successful response.
		c.JSON(http.StatusCreated, gin.H{
			"status":            "success",
			"message":           "Vehicle location processed successfully",
			"vehicle":           vehicle,
			"data":              currentLocation,
			"current_geofences": currentGeofences,
			"geofence_count":    len(currentGeofences),
			"detected_events":   violations,
			"event_count":       len(violations),
			"time_ns":           strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
	}
}

// ==========================================
// 4. GET /vehicles/location/:vehicle_id
// RETRIEVE VEHICLE GPS HISTORY
// ==========================================

func GetVehicleLocationHistory(c *gin.Context) {
	start := time.Now()

	vehicleID, err := strconv.ParseUint(
		c.Param("vehicle_id"), 10, 32,
	)

	if err != nil || vehicleID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid vehicle ID",
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	// STEP 1: Verify vehicle exists.
	var vehicle models.Vehicle

	if err := config.DB.First(&vehicle, uint(vehicleID)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"status":  "error",
				"message": "Vehicle not found",
				"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch vehicle",
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	// STEP 2: Fetch GPS history.
	var locations []models.VehicleLocation

	if err := config.DB.
		Where("vehicle_id = ?", vehicleID).
		Order("recorded_at DESC").
		Order("id DESC").
		Find(&locations).Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch location history",
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	// STEP 3: Return response.
	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Vehicle location history fetched successfully",
		"vehicle": vehicle,
		"count":   len(locations),
		"data":    locations,
		"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
	})
}
