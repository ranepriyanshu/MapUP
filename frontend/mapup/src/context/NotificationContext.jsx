
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const NotificationContext = createContext(null);

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws/alerts";
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [locationUpdates, setLocationUpdates] = useState({});
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let socket;
    let reconnectTimer;
    let reconnectDelay = 2000;
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        if (!isMounted) return;

        setConnected(true);
        reconnectDelay = 2000;

        console.log("WebSocket connected successfully.");
      };

      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data);

          // Handle GPS location updates separately.
          if (event.type === "LOCATION_UPDATE") {
            const vehicleId = event.vehicle?.id;

            if (!vehicleId || !event.location) {
              console.warn("Invalid location update received:", event);
              return;
            }

            setLocationUpdates((previous) => ({
              ...previous,
              [vehicleId]: {
                vehicle: event.vehicle,
                latitude: event.location.latitude,
                longitude: event.location.longitude,
                timestamp: event.timestamp,
                event_id: event.event_id,
              },
            }));

            return;
          }

          // Only ENTRY and EXIT events become notifications.
          if (event.type === "ENTRY" || event.type === "EXIT") {
            const notification = {
              ...event,
              localId: `${event.event_id ?? "event"}-${Date.now()}`,
              read: false,
              receivedAt: new Date().toISOString(),
            };

            setNotifications((previous) => [
              notification,
              ...previous,
            ]);

            setUnreadCount((previous) => previous + 1);
          }
        } catch (error) {
          console.error("Invalid WebSocket message:", error);
        }
      };

      socket.onerror = () => {
        // Reconnection is handled by onclose.
      };

      socket.onclose = () => {
        if (!isMounted) return;

        setConnected(false);

        console.warn("WebSocket disconnected. Reconnecting...");

        reconnectTimer = setTimeout(() => {
          connect();
        }, reconnectDelay);

        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer);

      if (socket) {
        socket.close();
      }
    };
  }, []);

  const markAllRead = () => {
    setNotifications((previous) =>
      previous.map((item) => ({
        ...item,
        read: true,
      }))
    );

    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        locationUpdates,
        connected,
        unreadCount,
        markAllRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider"
    );
  }

  return context;
}
