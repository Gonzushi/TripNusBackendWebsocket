import { Redis } from "ioredis";
import { SupabaseClient } from "@supabase/supabase-js";
import { sendPushNotification } from "../services/notificationService";

type Publisher = {
  publish: (channel: string, message: string) => Promise<number>;
};

export async function cleanInactiveDriversWorker(
  redis: Redis,
  supabase: SupabaseClient,
  publisher: Publisher
) {
  const { data: drivers } = await supabase
    .from("drivers")
    .select(
      "id, decline_count, missed_requests, is_online, push_token, vehicle_type"
    )
    .eq("is_online", true)
    .or("decline_count.gt.3,missed_requests.gt.3");

  if (!drivers || drivers.length === 0) return;

  const allDriverIdsToSuspend = drivers.map((driver) => driver.id);

  const motorcycleDriverIdsToSuspend = drivers
    .filter((driver) => driver.vehicle_type === "motorcycle")
    .map((driver) => driver.id);

  const carDriverIdsToSuspend = drivers
    .filter((driver) => driver.vehicle_type === "car")
    .map((driver) => driver.id);

  // 🚀 Batch update in Supabase
  await supabase
    .from("drivers")
    .update({ is_online: false, is_suspended: true })
    .in("id", allDriverIdsToSuspend);

  // 🚀 Batch Redis cleanup for location
  await redis.zrem(
    "drivers:locations:motorcycle",
    ...motorcycleDriverIdsToSuspend
  );
  await redis.zrem("drivers:locations:car", ...carDriverIdsToSuspend);

  // 📲 Push notification + WebSocket message
  const suspensionMessage = {
    type: "ACCOUNT_DEACTIVATED_TEMPORARILY",
    reason:
      "Anda melewatkan atau menolak terlalu banyak permintaan. Status Anda telah dinonaktifkan. Silakan nonaktifkan dan aktifkan kembali tombol untuk menerima order.",
  };

  await Promise.all(
    drivers.map(async ({ id: driverId, push_token }) => {
      if (push_token) {
        await sendPushNotification(push_token, {
          title: "Status Anda: Tidak Aktif Sementara",
          body: suspensionMessage.reason,
          data: suspensionMessage,
        });
      }

      await publisher.publish(
        `driver:${driverId}`,
        JSON.stringify(suspensionMessage)
      );

      console.log(`🧹 Suspended and cleaned up driver ${driverId}`);
    })
  );

  // 🚀 Batch Redis cleanup for driver data
  const keysToDelete = allDriverIdsToSuspend.map((id) => `driver:${id}`);
  await redis.del(...keysToDelete);
}
