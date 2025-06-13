import {
  Expo,
  ExpoPushMessage,
  ExpoPushReceipt,
} from "expo-server-sdk";

// Initialize Expo client
const expo = new Expo();

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const sendPushNotification = async (
  token: string,
  notification: NotificationPayload
): Promise<string[]> => {
  try {
    // Check that the token is valid
    if (!Expo.isExpoPushToken(token)) {
      console.error(`Invalid Expo push token: ${token}`);
      throw new Error("Invalid Expo push token");
    }

    // Construct the message
    const message: ExpoPushMessage = {
      to: token,
      sound: "default",
      title: notification.title,
      body: notification.body,
      data: notification.data,
      priority: "high",
      channelId: "default",
      badge: 1,
    };

    // Send the notification
    const chunks = expo.chunkPushNotifications([message]);
    const tickets: string[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

        // Collect ticket IDs for successful sends
        ticketChunk.forEach((ticket) => {
          if (ticket.status === "ok" && ticket.id) {
            tickets.push(ticket.id);
          }
        });
      } catch (error) {
        console.error("Error sending chunk:", error);
      }
    }

    return tickets;
  } catch (error) {
    console.error("Error sending push notification:", error);
    throw error;
  }
};

/**
 * Helper function to handle notification receipts
 * You can call this periodically to get delivery status
 */
export const handleNotificationReceipts = async (
  tickets: string[]
): Promise<void> => {
  try {
    const receiptIds = tickets.map((ticket) => ticket);
    const receiptChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

    for (const chunk of receiptChunks) {
      try {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

        // Process receipts
        for (const [id, receipt] of Object.entries(receipts)) {
          const typedReceipt = receipt as ExpoPushReceipt;

          if (typedReceipt.status === "ok") {
            console.log(`Notification ${id} delivered successfully`);
          } else if (typedReceipt.status === "error") {
            console.error(
              `Error delivering notification ${id}:`,
              typedReceipt.message,
              typedReceipt.details
            );
          }
        }
      } catch (error) {
        console.error("Error checking receipts:", error);
      }
    }
  } catch (error) {
    console.error("Error handling notification receipts:", error);
    throw error;
  }
};
