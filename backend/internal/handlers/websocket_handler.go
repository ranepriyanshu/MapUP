
package handlers

import (
	"log"
	"net/http"
	"time"

	appws "mapup-geofencing/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = 54 * time.Second
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,

	// Allow same-host frontend connections, including
	// local development on different ports.
CheckOrigin: func(r *http.Request) bool {
    origin := r.Header.Get("Origin")

    // Allow non-browser clients such as Postman.
    if origin == "" {
        return true
    }

    // Allow local frontend origins.
    return origin == "http://localhost:3000" ||
        origin == "http://localhost:5173"
},
}

// ============================================
// GET /ws/alerts
// WEBSOCKET CONNECTION
// ============================================

func WebSocketAlerts(hub *appws.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {

		// STEP 1: Verify hub.
		if hub == nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "WebSocket hub is not initialized",
			})
			return
		}

		// STEP 2: Upgrade HTTP connection to WebSocket.
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("WebSocket upgrade failed: %v", err)
			return
		}

		// STEP 3: Create WebSocket client.
		client := &appws.Client{
			Conn: conn,
			Send: make(chan []byte, 256),
		}

		// STEP 4: Register client with the hub.
		select {
		case hub.Register <- client:
			// Client registered successfully.

		case <-c.Request.Context().Done():
			conn.Close()
			return

		case <-time.After(5 * time.Second):
			log.Println("WebSocket client registration timed out")
			conn.Close()
			return
		}

		// STEP 5: Start independent read and write pumps.
		go readPump(hub, client)
		go writePump(hub, client)
	}
}

// ============================================
// READ PUMP
// READ CLIENT MESSAGES AND HANDLE HEARTBEATS
// ============================================

func readPump(hub *appws.Hub, client *appws.Client) {
	conn := client.Conn

	defer func() {
		unregisterClient(hub, client)
		conn.Close()
	}()

	conn.SetReadLimit(maxMessageSize)

	conn.SetReadDeadline(time.Now().Add(pongWait))

	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		// Read incoming messages.
		// The application currently only needs connection
		// monitoring, so client messages are not processed.
		_, _, err := conn.ReadMessage()

		if err != nil {
			if websocket.IsUnexpectedCloseError(
				err,
				websocket.CloseGoingAway,
				websocket.CloseNormalClosure,
			) {
				log.Printf("WebSocket read error: %v", err)
			}

			break
		}
	}
}

// ============================================
// WRITE PUMP
// SEND ALERTS AND PING CLIENTS
// ============================================

func writePump(hub *appws.Hub, client *appws.Client) {
	conn := client.Conn

	ticker := time.NewTicker(pingPeriod)

	defer func() {
		ticker.Stop()
		unregisterClient(hub, client)
		conn.Close()
	}()

	for {
		select {

		// Send queued messages.
		case message, ok := <-client.Send:

			conn.SetWriteDeadline(time.Now().Add(writeWait))

			if !ok {
				conn.WriteMessage(
					websocket.CloseMessage,
					[]byte{},
				)
				return
			}

			if err := conn.WriteMessage(
				websocket.TextMessage,
				message,
			); err != nil {
				log.Printf("WebSocket write error: %v", err)
				return
			}

		// Send periodic ping messages.
		case <-ticker.C:

			conn.SetWriteDeadline(time.Now().Add(writeWait))

			if err := conn.WriteMessage(
				websocket.PingMessage,
				nil,
			); err != nil {
				log.Printf("WebSocket ping failed: %v", err)
				return
			}
		}
	}
}

// ============================================
// UNREGISTER CLIENT
// ============================================

func unregisterClient(hub *appws.Hub, client *appws.Client) {
	select {
	case hub.Unregister <- client:
	case <-time.After(time.Second):
		log.Println("WebSocket client unregistration timed out")
	}
}
