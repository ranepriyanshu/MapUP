
package main

import (
	"net/http"
	"strconv"
	"time"

	"mapup-geofencing/config"
	"mapup-geofencing/internal/handlers"
	"mapup-geofencing/internal/models"
	appws "mapup-geofencing/internal/websocket"

	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	allowedOrigins := map[string]bool{
		"http://localhost:3000": true,
		"http://localhost:5173": true,
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		if allowedOrigins[origin] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Vary", "Origin")
			c.Writer.Header().Set(
				"Access-Control-Allow-Methods",
				"GET, POST, PUT, PATCH, DELETE, OPTIONS",
			)
			c.Writer.Header().Set(
				"Access-Control-Allow-Headers",
				"Origin, Content-Type, Accept, Authorization",
			)
		}

		if c.Request.Method == http.MethodOptions {
			if !allowedOrigins[origin] {
				c.AbortWithStatus(http.StatusForbidden)
				return
			}

			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func main() {
	// Connect PostgreSQL
	config.ConnectDatabase()

	// Automatically create/update database tables
	err := config.DB.AutoMigrate(
		&models.Geofence{},
		&models.Vehicle{},
		&models.VehicleLocation{},
		&models.Violation{},
		&models.AlertConfig{},
	)

	if err != nil {
		panic("Failed to migrate database tables: " + err.Error())
	}

	// Add PostGIS geometry column
	if err := config.DB.Exec(`
		ALTER TABLE geofences
		ADD COLUMN IF NOT EXISTS geom geometry(Polygon, 4326)
	`).Error; err != nil {
		panic("Failed to add geofence geometry column: " + err.Error())
	}

	// Convert existing JSON coordinates into PostGIS polygons
	if err := config.DB.Exec(`
		UPDATE geofences AS g
		SET geom = (
			SELECT ST_SetSRID(
				ST_MakePolygon(
					ST_MakeLine(points.point ORDER BY points.position)
				),
				4326
			)
			FROM (
				SELECT
					ST_MakePoint(
						(coord->>1)::double precision,
						(coord->>0)::double precision
					) AS point,
					position
				FROM jsonb_array_elements(g.coordinates)
					WITH ORDINALITY AS elements(coord, position)
			) AS points
		)
		WHERE g.geom IS NULL
	`).Error; err != nil {
		panic("Failed to convert geofence coordinates: " + err.Error())
	}

	// Create spatial index
	if err := config.DB.Exec(`
		CREATE INDEX IF NOT EXISTS idx_geofences_geom
		ON geofences USING GIST (geom)
	`).Error; err != nil {
		panic("Failed to create geofence spatial index: " + err.Error())
	}

	// Start WebSocket server
	hub := appws.NewHub()
	go hub.Run()

	// Create Gin router
	router := gin.Default()

	// Register CORS middleware
	router.Use(CORSMiddleware())

	// Geofence routes
	router.POST("/geofences", handlers.CreateGeofence)
	router.GET("/geofences", handlers.GetGeofences)

	// Vehicle routes
	router.POST("/vehicles", handlers.CreateVehicle)
	router.GET("/vehicles", handlers.GetVehicles)
	router.POST("/vehicles/location", handlers.UpdateVehicleLocation(hub))
	router.GET(
		"/vehicles/location/:vehicle_id",
		handlers.GetVehicleLocationHistory,
	)

	// Alert routes
	router.POST("/alerts/configure", handlers.ConfigureAlert)
	router.GET("/alerts", handlers.GetAlerts)
	router.GET("/ws/alerts", handlers.WebSocketAlerts(hub))

	// Violation history
	router.GET("/violations/history", handlers.GetViolationHistory)

	// Basic health check
	router.GET("/health", func(c *gin.Context) {
		start := time.Now()

		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "MapUp server is running",
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
	})

	// Database health check
	router.GET("/health/db", func(c *gin.Context) {
		start := time.Now()

		sqlDB, err := config.DB.DB()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Failed to get database connection",
				"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
			})
			return
		}

		err = sqlDB.Ping()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Database is not reachable",
				"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "PostgreSQL database is connected",
			"time_ns": strconv.FormatInt(time.Since(start).Nanoseconds(), 10),
		})
	})

	// Start server
	router.Run(":8080")
}
