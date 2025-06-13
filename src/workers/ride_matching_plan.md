# Ride Matching System Plan

## 1. Driver Matching Conditions

### Accept Driver If:
- `is_online = true`
- `availability_status = 'available'`
- `is_suspended = false`
- `decline_count <= 3`
- `missed_requests <= 3`

### Skip Driver If:
- `availability_status = 'busy'`
- But `decline_count` and `missed_requests` are still acceptable

### Mark as Inactive (Clean Up) If:
- `is_online = true`, `availability_status = 'available'`
- But `decline_count > 3` **or** `missed_requests > 3`
- **Actions:**
  - Set `is_online = false`
  - Set `is_suspended = true`
  - Remove Redis keys:
    - `drivers:locations`
    - `drivers:<driverId>`

### Also Clean Up If:
- `is_online = false`
- **Actions:** same as above (clean Redis keys)

---

## 2. Match Worker Behavior

### On Each Retry:
- Select next available driver using conditions above
- Save `messageData` and retry info to `rides.match_attempt`
- Send push notification and WebSocket message to driver
- Add job back to queue with updated `retry_count`

### When Driver Doesn’t Respond:
- Increment `missed_requests` for the attempted driver

### If Max Retries Reached or No Drivers Available:
- Update ride:
  - `status = 'cancelled'`
  - `status_note = 'no_driver_available'`
- Notify rider via push notification and WebSocket

---

## 3. Database Fields

### `drivers` Table:
| Column             | Type       | Description                                      |
|--------------------|------------|--------------------------------------------------|
| `id`               | UUID       | Unique driver ID                                 |
| `is_online`        | boolean    | Driver’s online status                           |
| `availability_status` | string  | Either `'available'` or `'busy'`                |
| `decline_count`    | integer    | Count of declined ride requests                  |
| `missed_requests`  | integer    | Count of missed (non-responded) ride requests    |
| `is_suspended`     | boolean    | Whether driver is suspended/inactive             |
| `push_token`       | string     | Token for push notifications                     |

### `rides` Table:
| Column             | Type       | Description                                      |
|--------------------|------------|--------------------------------------------------|
| `id`               | UUID       | Unique ride ID                                   |
| `driver_id`        | UUID       | Assigned driver ID                               |
| `status`           | string     | Ride status (`pending`, `requesting_driver`, etc) |
| `status_note`      | string     | Reason for cancellation or status change         |
| `match_attempt`    | JSONB      | Includes `messageData`, attempted drivers, etc   |

---

## 4. Optional: Cleaning Worker

Create a separate BullMQ worker that runs periodically to:
- Identify inactive/suspended drivers
- Update their status
- Clean up their Redis keys

---

## Summary
- Robust matching logic with retry and fallback
- Tracks driver reliability (declines & misses)
- Cleans up Redis and prevents unresponsive drivers from spamming queue
- Clear separation of responsibilities between ride match worker and optional cleaner worker

