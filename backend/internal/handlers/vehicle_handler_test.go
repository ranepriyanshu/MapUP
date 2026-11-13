package handlers

import (
	"math"
	"testing"
)

func TestIsValidGPSCoordinates(t *testing.T) {
	tests := []struct {
		name      string
		latitude  float64
		longitude float64
		want      bool
	}{
		{"Valid Indore coordinates", 22.7196, 75.8577, true},
		{"Valid zero coordinates", 0, 0, true},
		{"Minimum latitude", -90, 75, true},
		{"Maximum latitude", 90, 75, true},
		{"Minimum longitude", 22, -180, true},
		{"Maximum longitude", 22, 180, true},
		{"Latitude too high", 91, 75, false},
		{"Latitude too low", -91, 75, false},
		{"Longitude too high", 22, 181, false},
		{"Longitude too low", 22, -181, false},
		{"NaN latitude", math.NaN(), 75, false},
		{"NaN longitude", 22, math.NaN(), false},
		{"Infinite latitude", math.Inf(1), 75, false},
		{"Infinite longitude", 22, math.Inf(-1), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isValidGPSCoordinates(
				tt.latitude,
				tt.longitude,
			)

			if got != tt.want {
				t.Errorf(
					"isValidGPSCoordinates(%v, %v) = %v; want %v",
					tt.latitude,
					tt.longitude,
					got,
					tt.want,
				)
			}
		})
	}
}
