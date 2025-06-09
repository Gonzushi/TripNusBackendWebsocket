import { RequestHandler } from "express";
import { Redis } from "ioredis";
import { z } from "zod";

// Schema for driver data validation matching frontend types
const driverDataSchema = z.object({
  socketId: z.string().optional(),
  role: z.literal("driver"),
  id: z.string(),
  location: z.object({
    lat: z.number().nullable(),
    lng: z.number().nullable(),
  }),
  vehicle_type: z.enum(["motorcycle", "car", "unknown"]),
  vehicle_plate: z.string(),
  status: z.enum(["available", "on_trip", "offline", "waiting"]),
  update_via: z.enum(["websocket", "api", "mobile_app"]),
  last_updated_at: z.string(),
  speed_kph: z.number(),
  heading_deg: z.number(),
  battery_level: z.number(),
  accuracy_m: z.number(),
});

export const createDriverController = (redis: Redis) => {
  const TTL_SECONDS = 120; 

  const updateLocation: RequestHandler = async (req, res): Promise<void> => {
    try {
      const { location, ...dataWithoutLocation } = driverDataSchema.parse(
        req.body
      );
      const driverId = dataWithoutLocation.id;

      if (!driverId) {
        res.status(400).json({
          status: 400,
          message: "Driver ID is required",
          code: "DRIVER_ID_REQUIRED",
        });
        return;
      }

      // Update driver data in Redis hash
      await redis.hset(`driver:${driverId}`, dataWithoutLocation);
      await redis.expire(`driver:${driverId}`, TTL_SECONDS);

      // Update driver location in geo set if location is provided and not null
      if (location.lat !== null && location.lng !== null) {
        await redis.geoadd(
          "drivers:locations",
          location.lng,
          location.lat,
          driverId
        );
      }

      res.status(200).json({
        status: 200,
        message: "Driver location updated successfully",
        code: "LOCATION_UPDATE_SUCCESS",
      });
    } catch (error) {
      console.error("Error updating driver location:", error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          status: 400,
          message: "Invalid request data format",
          code: "INVALID_REQUEST_DATA",
          errors: error.errors,
        });
        return;
      }

      res.status(500).json({
        status: 500,
        message: "Internal server error occurred",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  };

  return {
    updateLocation,
  };
};
