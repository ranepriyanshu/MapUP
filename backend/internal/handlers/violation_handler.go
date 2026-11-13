package handlers

import (
	"net/http"
	"strconv"
	"time"

	"mapup-geofencing/config"
	"mapup-geofencing/internal/models"

	"github.com/gin-gonic/gin"
)

func GetViolationHistory(c *gin.Context) {
	start := time.Now()

	query := config.DB.Model(&models.Violation{})

	// Filter by vehicle ID
	if vehicleID := c.Query("vehicle_id"); vehicleID != "" {
		id, err := strconv.ParseUint(vehicleID, 10, 32)
		if err != nil || id == 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Invalid vehicle_id",
				"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
			})
			return
		}

		query = query.Where("vehicle_id = ?", id)
	}

	// Filter by geofence ID
	if geofenceID := c.Query("geofence_id"); geofenceID != "" {
		id, err := strconv.ParseUint(geofenceID, 10, 32)
		if err != nil || id == 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Invalid geofence_id",
				"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
			})
			return
		}

		query = query.Where("geofence_id = ?", id)
	}

	// Filter by start date
	if startDate := c.Query("start_date"); startDate != "" {
		parsedDate, err := time.Parse(time.RFC3339, startDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Invalid start_date. Use RFC3339 format",
				"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
			})
			return
		}

		query = query.Where("timestamp >= ?", parsedDate)
	}

	// Filter by end date
	if endDate := c.Query("end_date"); endDate != "" {
		parsedDate, err := time.Parse(time.RFC3339, endDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Invalid end_date. Use RFC3339 format",
				"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
			})
			return
		}

		query = query.Where("timestamp <= ?", parsedDate)
	}

	// Validate limit
	limit := 50

	if limitParam := c.Query("limit"); limitParam != "" {
		parsedLimit, err := strconv.Atoi(limitParam)

		if err != nil || parsedLimit < 1 || parsedLimit > 500 {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Limit must be between 1 and 500",
				"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
			})
			return
		}

		limit = parsedLimit
	}

	// Fetch violation history
	var violations []models.Violation

	if err := query.
		Order("timestamp DESC").
		Limit(limit).
		Find(&violations).Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch violation history",
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Violation history fetched successfully",
		"count":   len(violations),
		"data":    violations,
		"limit":   limit,
		"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
	})
}
