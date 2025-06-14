export type DriverData = {
  socketId?: string;
  role?: "driver";
  id?: string;
  lat?: number | null;
  lng?: number | null;
  vehicle_type?: "motorcycle" | "car" | "unknown";
  vehicle_plate?: string;
  status?: "available" | "on_trip" | "offline" | "waiting";
  update_via?: "websocket" | "api" | "mobile_app";
  last_updated_at?: string;
  speed_kph?: number;
  heading_deg?: number;
  accuracy_m?: number;
};
