// workers/rideMatchWorker.ts
import { Worker, Job, Queue } from "bullmq";
import { Redis } from "ioredis";
import { SupabaseClient } from "@supabase/supabase-js";
import { sendPushNotification } from "../services/notificationService";
import redisConfigBullMQ from "../config/redisConfig";

type RideMatchJobData = {
  ride_id: string;
  distance_m: number;
  duration_s: number;
  fare: number;
  platform_fee: number;
  driver_earning: number;
  app_commission: number;
  fare_breakdown: any;
  pickup: { coords: [number, number]; address: string };
  dropoff: any;
  attemptedDrivers?: string[];
  retry_count?: number;
};

const MAX_RETRIES = 10;
const GEO_KEY = "drivers:locations";
const MAX_RADIUS_KM = 10;
const WAIT_TIME = 60; // in seconds
const MAX_ALLOWED_REQUEST_FAILURES = 3;

export function startRideMatchWorker(
  redis: Redis,
  supabase: SupabaseClient,
  publisher: { publish: (channel: string, message: string) => Promise<number> }
) {
  const rideMatchQueue = new Queue("ride-matching", { connection: redis });

  const rideMatchWorker = new Worker<RideMatchJobData>(
    "ride-matching",
    async (job: Job<RideMatchJobData>) => {
      const {
        ride_id,
        distance_m,
        duration_s,
        fare,
        platform_fee,
        driver_earning,
        app_commission,
        fare_breakdown,
        pickup,
        dropoff,
        attemptedDrivers = [],
      } = job.data;

      const retryCount = job.data.retry_count ?? 0;

      const previousDriverId = attemptedDrivers[attemptedDrivers.length - 1];
      if (previousDriverId) {
        await supabase.rpc("increment_missed_requests", {
          driver_id: previousDriverId,
        });
      }

      const geoResults = (await redis.geosearch(
        GEO_KEY,
        "FROMLONLAT",
        pickup.coords[0],
        pickup.coords[1],
        "BYRADIUS",
        MAX_RADIUS_KM,
        "km",
        "ASC",
        "WITHDIST"
      )) as [string, string][];

      const candidates = geoResults.filter(
        ([driverId]) => !attemptedDrivers.includes(driverId)
      );
      const candidateIds = candidates.map(([driverId]) => driverId);

      const { data: driversData } = await supabase
        .from("drivers")
        .select(
          "id, is_online, availability_status, is_suspended, decline_count, missed_requests, push_token"
        )
        .in("id", candidateIds);

      const driverMap = new Map(driversData?.map((d) => [d.id, d]));
      let selectedDriver: [string, string] | undefined;

      for (const [driverId, distanceStr] of candidates) {
        const driver = driverMap.get(driverId);
        if (!driver) continue;

        if (!driver.is_online || driver.is_suspended) {
          await redis.zrem(GEO_KEY, driverId);
          await redis.del(`driver:${driverId}`);
          continue;
        }

        if (
          driver.decline_count > MAX_ALLOWED_REQUEST_FAILURES ||
          driver.missed_requests > MAX_ALLOWED_REQUEST_FAILURES
        ) {
          await supabase
            .from("drivers")
            .update({ is_online: false, is_suspended: true })
            .eq("id", driverId);

          const suspensionMessage = {
            type: "ACCOUNT_DEACTIVATED_TEMPORARILY",
            reason:
              "Anda melewatkan atau menolak terlalu banyak permintaan. Status Anda telah dinonaktifkan. Silakan nonaktifkan dan aktifkan kembali tombol untuk menerima order.",
          };

          if (driver.push_token) {
            await sendPushNotification(driver.push_token, {
              title: "Status Anda: Tidak Aktif Sementara",
              body: suspensionMessage.reason,
              data: suspensionMessage,
            });
          }

          await publisher.publish(
            `driver:${driverId}`,
            JSON.stringify(suspensionMessage)
          );

          await redis.zrem(GEO_KEY, driverId);
          await redis.del(`driver:${driverId}`);

          continue;
        }

        if (driver.availability_status === "busy") continue;

        const isReviewing = await redis.get(`driver:is_reviewing:${driverId}`);
        if (isReviewing === "true") continue;

        selectedDriver = [driverId, distanceStr];
        break;
      }

      if (retryCount >= MAX_RETRIES || !selectedDriver) {
        const reason =
          retryCount >= MAX_RETRIES
            ? `Ride cancelled: no drivers accepted after ${MAX_RETRIES} attempts.`
            : "Ride cancelled: no available drivers nearby.";

        await supabase
          .from("rides")
          .update({
            status: "cancelled",
            status_reason: reason,
            driver_id: null,
          })
          .eq("id", ride_id);

        const { data: rideData } = await supabase
          .from("rides")
          .select("rider_id")
          .eq("id", ride_id)
          .single();

        if (rideData?.rider_id) {
          const { data: riderData } = await supabase
            .from("riders")
            .select("push_token")
            .eq("id", rideData.rider_id)
            .single();

          const cancelMessage = {
            type: "RIDE_CANCELLED",
            ride_id,
            reason,
          };

          if (riderData?.push_token) {
            await sendPushNotification(riderData.push_token, {
              title: "Maaf, tidak ada driver tersedia 😞",
              body: "Kami tidak menemukan driver untuk perjalanan Anda.",
              data: cancelMessage,
            });
          }

          await publisher.publish(
            `rider:${rideData.rider_id}`,
            JSON.stringify(cancelMessage)
          );
        }

        console.log(`🚫 Ride ${ride_id} cancelled: ${reason}`);
        return;
      }

      const [driverId, distanceToPickupStr] = selectedDriver;
      const distanceToPickup = parseFloat(distanceToPickupStr);
      const timestamp = Date.now();

      const messageData = {
        type: "NEW_RIDE_REQUEST",
        ride_id,
        distance_to_pickup_km: distanceToPickup,
        distance_m,
        duration_s,
        fare,
        platform_fee,
        driver_earning,
        app_commission,
        fare_breakdown,
        pickup,
        dropoff,
        request_expired_at: timestamp + WAIT_TIME * 1000,
      };

      await supabase
        .from("rides")
        .update({
          status: "requesting_driver",
          driver_id: driverId,
          match_attempt: {
            message_data: messageData,
            attemptedDrivers: [...attemptedDrivers, driverId],
            retry_count: retryCount,
            attempted_at: timestamp,
          },
        })
        .eq("id", ride_id);

      const driver = driverMap.get(driverId);
      if (driver?.push_token) {
        await sendPushNotification(driver.push_token, {
          title: "Ada penumpang baru!",
          body: `Jemput di ${pickup.address} (${distanceToPickup} km)`,
          data: messageData,
        });
      }

      await publisher.publish(
        `driver:${driverId}`,
        JSON.stringify(messageData)
      );

      await redis.setex(
        `driver:is_reviewing:${driverId}`,
        WAIT_TIME + 5,
        "true"
      );

      const existingJob = await rideMatchQueue.getJob(`ride_match_${ride_id}`);
      if (existingJob) {
        await existingJob.remove(); 
      }

      await rideMatchQueue.add(
        `ride_match_${ride_id}`,
        {
          ...job.data,
          attemptedDrivers: [...attemptedDrivers, driverId],
          retry_count: retryCount + 1,
        },
        {
          jobId: `ride_match_${ride_id}`,
          delay: WAIT_TIME * 1000,
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
    },
    { connection: redisConfigBullMQ }
  );

  rideMatchWorker.on("completed", (job) => {
    console.log(`✅ Ride match job ${job.id} completed`);
  });

  rideMatchWorker.on("failed", (job, err) => {
    console.error(`❌ Ride match job ${job?.id} failed:`, err);
  });
}
