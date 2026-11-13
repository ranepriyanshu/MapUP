
package models

import "time"

type Vehicle struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	VehicleNumber string    `json:"vehicle_number" gorm:"not null;uniqueIndex"`
	DriverName    string    `json:"driver_name" gorm:"not null"`
	Type          string    `json:"type" gorm:"not null"`
	Phone         string    `json:"phone" gorm:"not null"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
