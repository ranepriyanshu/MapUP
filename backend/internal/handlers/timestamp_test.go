package handlers

import (
	"testing"
	"time"
)

func TestParseGPSTimestamp(t *testing.T) {
	tests := []struct {
		name      string
		timestamp string
		wantError bool
	}{
		{
			name:      "Valid UTC timestamp",
			timestamp: "2026-11-13T10:00:00Z",
			wantError: false,
		},
		{
			name:      "Valid timezone offset",
			timestamp: "2026-11-13T15:30:00+05:30",
			wantError: false,
		},
		{
			name:      "Invalid timestamp",
			timestamp: "13-11-2026",
			wantError: true,
		},
		{
			name:      "Empty timestamp",
			timestamp: "",
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := time.Parse(time.RFC3339, tt.timestamp)

			if (err != nil) != tt.wantError {
				t.Errorf(
					"Unexpected timestamp validation result: error = %v",
					err,
				)
			}
		})
	}
}
