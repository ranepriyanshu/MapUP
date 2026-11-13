
package models

import "time"

type Violation struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	VehicleID  uint      `json:"vehicle_id" gorm:"not null;index"`
	GeofenceID uint      `json:"geofence_id" gorm:"not null;index"`
	EventType  string    `json:"event_type" gorm:"not null;index"`
	Latitude   float64   `json:"latitude" gorm:"not null"`
	Longitude  float64   `json:"longitude" gorm:"not null"`
	Timestamp  time.Time `json:"timestamp" gorm:"not null;index"`
	CreatedAt  time.Time `json:"created_at"`
}
