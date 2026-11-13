
package handlers

import (
	"math"
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

type CreateGeofenceRequest struct {
	Name        string      `json:"name" binding:"required"`
	Description string      `json:"description"`
	Coordinates [][]float64 `json:"coordinates" binding:"required"`
	Category    string      `json:"category" binding:"required"`
}

// ============================================
// VALID CATEGORIES
// ============================================

var validGeofenceCategories = map[string]bool{
	"delivery_zone":   true,
	"restricted_zone": true,
	"toll_zone":       true,
	"customer_area":  true,
}

// ============================================
// POST /geofences
// CREATE GEOFENCE
// ============================================

func CreateGeofence(c *gin.Context) {
	start := time.Now()

	var request CreateGeofenceRequest

	// STEP 1: Parse JSON request.
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid request body: " + err.Error(),
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	// STEP 2: Normalize input.
	request.Name = strings.TrimSpace(request.Name)
	request.Category = strings.TrimSpace(request.Category)

	// STEP 3: Validate required fields.
	if request.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Geofence name is required",
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	// STEP 4: Validate category.
	if !validGeofenceCategories[request.Category] {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid geofence category",
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	// STEP 5: Validate polygon point count.
	if len(request.Coordinates) < 4 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Polygon must contain at least 4 coordinate points",
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	// STEP 6: Validate coordinate pairs and ranges.
	for _, point := range request.Coordinates {
		if len(point) != 2 {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Each coordinate must contain latitude and longitude",
				"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
			})
			return
		}

		latitude := point[0]
		longitude := point[1]

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
				"message": "Invalid latitude or longitude values",
				"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
			})
			return
		}
	}

	// STEP 7: Validate polygon closure.
	firstPoint := request.Coordinates[0]
	lastPoint := request.Coordinates[len(request.Coordinates)-1]

	if firstPoint[0] != lastPoint[0] ||
		firstPoint[1] != lastPoint[1] {

		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Polygon must be closed: first and last coordinates must match",
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	// STEP 8: Prepare geofence model.
	geofence := models.Geofence{
		Name:        request.Name,
		Description: request.Description,
		Coordinates: request.Coordinates,
		Category:    request.Category,
	}

	// STEP 9: Save geofence and PostGIS geometry atomically.
	err := config.DB.Transaction(func(tx *gorm.DB) error {

		// Insert geofence.
		if err := tx.Create(&geofence).Error; err != nil {
			return err
		}

		// Convert API coordinates [latitude, longitude]
		// into PostGIS coordinates POINT(longitude, latitude).
		if err := tx.Exec(`
			UPDATE geofences
			SET geom = ST_SetSRID(
				ST_MakePolygon(
					ST_MakeLine(ARRAY(
						SELECT ST_MakePoint(
							(coord->>1)::double precision,
							(coord->>0)::double precision
						)
						FROM jsonb_array_elements(coordinates)
						WITH ORDINALITY AS elements(coord, position)
						ORDER BY position
					))
				),
				4326
			)
			WHERE id = ?
		`, geofence.ID).Error; err != nil {
			return err
		}

		return nil
	})

	// STEP 10: Handle transaction errors.
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to create geofence and its PostGIS geometry",
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	// STEP 11: Return created geofence.
	c.JSON(http.StatusCreated, gin.H{
		"status":   "success",
		"message":  "Geofence created successfully",
		"data":     geofence,
		"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
	})
}

// ============================================
// GET /geofences
// RETRIEVE GEOFENCES
// ============================================

func GetGeofences(c *gin.Context) {
	start := time.Now()

	geofences := make([]models.Geofence, 0)

	// STEP 1: Initialize database query.
	query := config.DB.Model(&models.Geofence{})

	// STEP 2: Apply optional category filter.
	category := strings.TrimSpace(c.Query("category"))

	if category != "" {
		if !validGeofenceCategories[category] {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Invalid geofence category",
				"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
			})
			return
		}

		query = query.Where("category = ?", category)
	}

	// STEP 3: Fetch geofences.
	if err := query.Order("created_at DESC").Find(&geofences).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch geofences",
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	// STEP 4: Return response.
	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Geofences fetched successfully",
		"count":   len(geofences),
		"data":    geofences,
		"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
	})
}
