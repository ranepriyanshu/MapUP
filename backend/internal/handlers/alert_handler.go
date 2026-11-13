
package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"mapup-geofencing/config"
	"mapup-geofencing/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ============================================
// REQUEST DTO
// ============================================

type ConfigureAlertRequest struct {
	GeofenceID uint  `json:"geofence_id" binding:"required"`
	VehicleID  *uint `json:"vehicle_id"`
	EventType  string `json:"event_type" binding:"required"`
}

// ============================================
// POST /alerts/configure
// ============================================

func ConfigureAlert(c *gin.Context) {
	start := time.Now()

	var request ConfigureAlertRequest

	// STEP 1: Parse request
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid request body: " + err.Error(),
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	// STEP 2: Validate event type
	request.EventType = strings.ToUpper(
		strings.TrimSpace(request.EventType),
	)

	validEvents := map[string]bool{
		"ENTRY": true,
		"EXIT":  true,
		"BOTH":  true,
	}

	if !validEvents[request.EventType] {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Event type must be ENTRY, EXIT or BOTH",
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	// STEP 3: Verify geofence exists
	var geofence models.Geofence

	if err := config.DB.First(
		&geofence,
		request.GeofenceID,
	).Error; err != nil {

		status := http.StatusInternalServerError
		message := "Failed to fetch geofence"

		if err == gorm.ErrRecordNotFound {
			status = http.StatusNotFound
			message = "Geofence not found"
		}

		c.JSON(status, gin.H{
			"status":  "error",
			"message": message,
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	// STEP 4: Verify vehicle if vehicle_id is provided
	if request.VehicleID != nil {
		var vehicle models.Vehicle

		if err := config.DB.First(
			&vehicle,
			*request.VehicleID,
		).Error; err != nil {

			status := http.StatusInternalServerError
			message := "Failed to fetch vehicle"

			if err == gorm.ErrRecordNotFound {
				status = http.StatusNotFound
				message = "Vehicle not found"
			}

			c.JSON(status, gin.H{
				"status":  "error",
				"message": message,
				"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
			})
			return
		}
	}

	// STEP 5: Create alert configuration
	alertConfig := models.AlertConfig{
		GeofenceID: request.GeofenceID,
		VehicleID:  request.VehicleID,
		EventType:  request.EventType,
	}

	// STEP 6: Save configuration
	if err := config.DB.Create(&alertConfig).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to configure alert",
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	// STEP 7: Return response
	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "Alert configured successfully",
		"data":    alertConfig,
		"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
	})
}


func GetAlerts(c *gin.Context) {
    start := time.Now()

    var alerts []models.AlertConfig
    query := config.DB.Model(&models.AlertConfig{})

    if geofenceID := c.Query("geofence_id"); geofenceID != "" {
        id, err := strconv.ParseUint(geofenceID, 10, 32)
        if err != nil || id == 0 {
            c.JSON(http.StatusBadRequest, gin.H{
                "status": "error",
                "message": "Invalid geofence_id",
                "time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
            })
            return
        }
        query = query.Where("geofence_id = ?", id)
    }

    if vehicleID := c.Query("vehicle_id"); vehicleID != "" {
        id, err := strconv.ParseUint(vehicleID, 10, 32)
        if err != nil || id == 0 {
            c.JSON(http.StatusBadRequest, gin.H{
                "status": "error",
                "message": "Invalid vehicle_id",
                "time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
            })
            return
        }
        query = query.Where("vehicle_id = ?", id)
    }

    if err := query.Order("created_at DESC").Find(&alerts).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "status": "error",
            "message": "Failed to fetch alert configurations",
            "time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "status": "success",
        "data": alerts,
        "count": len(alerts),
        "time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
    })
}

