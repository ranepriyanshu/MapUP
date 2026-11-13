package websocket

import (
	"errors"
	"sync"

	"github.com/gorilla/websocket"
)

var ErrHubClosed = errors.New("websocket hub is closed")

type Client struct {
	Conn *websocket.Conn
	Send chan []byte
}

type Hub struct {
	Clients    map[*Client]bool
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan []byte

	mu        sync.Mutex
	closeOnce sync.Once
	done      chan struct{}
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[*Client]bool),
		Register:   make(chan *Client, 32),
		Unregister: make(chan *Client, 32),
		Broadcast:  make(chan []byte, 256),
		done:       make(chan struct{}),
	}
}

// ============================================
// START HUB
// ============================================

func (h *Hub) Run() {
	defer h.shutdownClients()

	for {
		select {
		case <-h.done:
			return

		case client := <-h.Register:
			if client == nil {
				continue
			}

			h.mu.Lock()

			select {
			case <-h.done:
				h.mu.Unlock()
				return
			default:
			}

			if _, exists := h.Clients[client]; !exists {
				h.Clients[client] = true
			}

			h.mu.Unlock()

		case client := <-h.Unregister:
			if client == nil {
				continue
			}

			h.removeClient(client)

		case message := <-h.Broadcast:
			h.mu.Lock()

			for client := range h.Clients {
				select {
				case client.Send <- message:
				default:
					// Remove slow clients instead of blocking
					// the broadcast operation.
					delete(h.Clients, client)
					close(client.Send)

					go client.Conn.Close()
				}
			}

			h.mu.Unlock()
		}
	}
}

// ============================================
// BROADCAST MESSAGE
// ============================================

func (h *Hub) Publish(message []byte) error {
	select {
	case <-h.done:
		return ErrHubClosed
	default:
	}

	// Avoid sharing a mutable byte slice between callers.
	messageCopy := append([]byte(nil), message...)

	select {
	case <-h.done:
		return ErrHubClosed

	case h.Broadcast <- messageCopy:
		return nil

	default:
		return errors.New("websocket broadcast queue is full")
	}
}

// ============================================
// REMOVE CLIENT
// ============================================

func (h *Hub) removeClient(client *Client) {
	h.mu.Lock()

	if _, exists := h.Clients[client]; exists {
		delete(h.Clients, client)
		close(client.Send)

		h.mu.Unlock()

		go client.Conn.Close()
		return
	}

	h.mu.Unlock()
}

// ============================================
// SHUTDOWN CLIENTS
// ============================================

func (h *Hub) shutdownClients() {
	h.mu.Lock()
	defer h.mu.Unlock()

	for client := range h.Clients {
		delete(h.Clients, client)
		close(client.Send)

		go client.Conn.Close()
	}
}

// ============================================
// STOP HUB
// ============================================

func (h *Hub) Stop() {
	h.closeOnce.Do(func() {
		close(h.done)
	})
}
