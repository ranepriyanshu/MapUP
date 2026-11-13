
package models

import "time"

type Geofence struct {
	ID          uint        `json:"id" gorm:"primaryKey"`
	Name        string      `json:"name" gorm:"not null"`
	Description string      `json:"description"`
	Coordinates [][]float64 `json:"coordinates" gorm:"type:jsonb;serializer:json;not null"`
	Category    string      `json:"category" gorm:"not null;index"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}
