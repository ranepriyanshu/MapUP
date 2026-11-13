
package models

import "time"

type VehicleLocation struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	VehicleID uint      `json:"vehicle_id" gorm:"not null;index"`
	Latitude  float64   `json:"latitude" gorm:"not null"`
	Longitude float64   `json:"longitude" gorm:"not null"`
	Timestamp time.Time `json:"timestamp" gorm:"column:recorded_at;not null;index"`
	CreatedAt time.Time `json:"created_at"`
}
