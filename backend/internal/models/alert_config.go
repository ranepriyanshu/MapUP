
package models

import "time"

type AlertConfig struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	GeofenceID uint      `json:"geofence_id" gorm:"not null;index"`
	VehicleID  *uint     `json:"vehicle_id" gorm:"index"`
	EventType  string    `json:"event_type" gorm:"not null"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
