import { Router } from "express";
import { Redis } from "ioredis";
import { createDriverController } from "../controllers/driverController";

const router = Router();

/**
 * @swagger
 * /driver:
 *   put:
 *     summary: Update driver location and status
 *     tags: [Driver]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - id
 *               - location
 *               - vehicle_type
 *               - vehicle_plate
 *               - status
 *               - update_via
 *               - last_updated_at
 *               - speed_kph
 *               - heading_deg
 *               - battery_level
 *               - accuracy_m
 *             properties:
 *               socketId:
 *                 type: string
 *                 example: socket_123
 *               role:
 *                 type: string
 *                 enum: [driver]
 *                 example: driver
 *               id:
 *                 type: string
 *                 example: driver_123
 *               location:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                     nullable: true
 *                     example: -6.2088
 *                   lng:
 *                     type: number
 *                     nullable: true
 *                     example: 106.8456
 *               vehicle_type:
 *                 type: string
 *                 enum: [motorcycle, car, unknown]
 *                 example: motorcycle
 *               vehicle_plate:
 *                 type: string
 *                 example: B1234CD
 *               status:
 *                 type: string
 *                 enum: [available, on_trip, offline, waiting]
 *                 example: available
 *               update_via:
 *                 type: string
 *                 enum: [websocket, api, mobile_app]
 *                 example: api
 *               last_updated_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-03-20T08:30:00Z"
 *               speed_kph:
 *                 type: number
 *                 example: 30
 *               heading_deg:
 *                 type: number
 *                 example: 180
 *               battery_level:
 *                 type: number
 *                 example: 85
 *               accuracy_m:
 *                 type: number
 *                 example: 5
 *     responses:
 *       200:
 *         description: Driver location updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Driver location updated successfully
 *                 code:
 *                   type: string
 *                   example: LOCATION_UPDATE_SUCCESS
 *                 data:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       example: driver
 *                     id:
 *                       type: string
 *                       example: driver_123
 *                     location:
 *                       type: object
 *                       properties:
 *                         lat:
 *                           type: number
 *                           example: -6.2088
 *                         lng:
 *                           type: number
 *                           example: 106.8456
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: Invalid request data format
 *                 code:
 *                   type: string
 *                   example: INVALID_REQUEST_DATA
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: array
 *                         items:
 *                           type: string
 *                       message:
 *                         type: string
 *                   example:
 *                     - path: ["location", "lat"]
 *                       message: "Expected number, received string"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: Internal server error occurred
 *                 code:
 *                   type: string
 *                   example: INTERNAL_SERVER_ERROR
 */
export function createDriverRoutes(redis: Redis) {
  const driverController = createDriverController(redis);

  router.put("/", driverController.updateLocation);

  return router;
}
