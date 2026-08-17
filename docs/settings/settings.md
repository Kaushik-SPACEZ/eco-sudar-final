# Settings Module

**UI file:** [`eco-sudar-control/src/pages/Settings.tsx`](../../eco-sudar-control/src/pages/Settings.tsx)
**API module:** [`eco-sudar-control/src/lib/api/settings.ts`](../../eco-sudar-control/src/lib/api/settings.ts) — `settingsApi`
**Backend:** [`api/controllers/admin/AdminSettingsController.php`](../../api/controllers/admin/AdminSettingsController.php)
**DB table:** `settings` (key-value store)

---

## Scope

Centralised configuration for the business. Four sections: Company Profile, Contact Us (shown in mobile app), Savings Calculator (fuel prices / toggles shown in mobile app), and Notification preferences.

---

## Endpoints

All endpoints require `Authorization: Bearer <admin-token>`.

### `GET /admin/settings`
Returns all settings grouped into a structured object.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "company_name":    "Eco Sudar Bio Energy LLP",
    "gstin":           "33AABCE1234F1Z5",
    "company_email":   "contact@ecosudar.com",
    "company_phone":   "+91 98765 43210",
    "company_address": "Industrial Area, Chennai, TN 600001",

    "contact_email":   "ecosudarbiomasspellets@gmail.com",
    "contact_phone":   "+91 63799 35362",
    "contact_address": "49/D, EB Avenue, Kanchipuram, TN 631502",

    "delivery_fee":       150.0,
    "gst_rate":           18.0,
    "pellet_price":       14.0,
    "conversion_factor":  2.83,

    "fuels": [
      { "name": "LPG",      "unit": "/kg", "defaultPrice": 85, "enabled": true },
      { "name": "Diesel",   "unit": "/L",  "defaultPrice": 92, "enabled": true },
      { "name": "Coal",     "unit": "/kg", "defaultPrice": 12, "enabled": true },
      { "name": "Firewood", "unit": "/kg", "defaultPrice": 8,  "enabled": true }
    ],

    "notifications": {
      "order_alerts":      true,
      "low_stock":         true,
      "dealer_commission": false
    }
  }
}
```

---

### `PUT /admin/settings`
Update any combination of settings. Responds with the full updated settings object (same as GET).

**Body (any subset):**
```json
{
  "company_name": "Eco Sudar Bio Energy LLP",
  "pellet_price": 15,
  "fuels": [
    { "name": "LPG", "defaultPrice": 90, "enabled": true }
  ],
  "notifications": {
    "order_alerts": true,
    "low_stock": false
  }
}
```

**Fuel update:** Each fuel in the array is identified by `name` (case-insensitive). Only provided fuels are updated. Maps to individual DB keys: `fuel_lpg_price`, `fuel_lpg_enabled`, `fuel_diesel_price`, etc.

**Notification update:** UI keys mapped to DB keys:
| Body key | DB key |
|---|---|
| `order_alerts` | `notify_order` |
| `low_stock` | `notify_low_stock` |
| `dealer_commission` | `notify_new_customer` |

---

## Database Storage

All settings are stored as rows in the `settings` table (`setting_key`, `setting_value` — both `VARCHAR`). Upserted with:
```sql
INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
```

### Key Reference

| setting_key | Default | Notes |
|---|---|---|
| `company_name` | `Eco Sudar Bio Energy LLP` | |
| `gstin` | `` | |
| `company_email` | `` | |
| `company_phone` | `` | |
| `company_address` | `` | |
| `contact_email` | falls back to `company_email` | Shown in mobile app |
| `contact_phone` | falls back to `company_phone` | Shown in mobile app |
| `contact_address` | falls back to `company_address` | Shown in mobile app |
| `delivery_fee` | `150` | |
| `gst_rate` | `18` | |
| `pellet_price` | `14` | ₹/kg |
| `conversion_factor` | `2.83` | kg pellets per kg fuel |
| `fuel_lpg_price` | `85` | |
| `fuel_lpg_enabled` | `1` | |
| `fuel_diesel_price` | `92` | |
| `fuel_diesel_enabled` | `1` | |
| `fuel_coal_price` | `12` | |
| `fuel_coal_enabled` | `1` | |
| `fuel_firewood_price` | `8` | |
| `fuel_firewood_enabled` | `1` | |
| `notify_order` | `1` | |
| `notify_low_stock` | `1` | |
| `notify_new_customer` | `0` | |
| `invoice_prefix` | — | e.g. `INV` |
| `order_prefix` | — | e.g. `ORD` |

---

## Frontend API (`settings.ts` — `settingsApi`)

| Method | Call |
|---|---|
| `get()` | `GET /admin/settings` → `.data` |
| `update(payload)` | `PUT /admin/settings` → `.data` (full updated settings) |

---

## UI Sections

| Section | Save trigger | Fields sent |
|---|---|---|
| Company Profile | "Save Changes" button | `company_name`, `gstin`, `company_email`, `company_phone`, `company_address` |
| Contact Us (Mobile App) | "Update Contact Info" button | `contact_email`, `contact_phone`, `contact_address` |
| Savings Calculator | "Update Calculator Settings" button | `pellet_price`, `conversion_factor`, `fuels` array |
| Notifications | Switch toggle (immediate) | `notifications` object with toggled key |

Notification toggles fire immediately on change (no save button) and revert on error.
