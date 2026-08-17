# Products Module

**Base URL**: `https://api.ecosudar.com/api`  
**Public prefix**: `/products` — No auth required  
**Admin prefix**: `/admin/products` — Requires `Authorization: Bearer <admin_token>`

---

## Endpoints

### `GET /products`
Fetch all available products with their configurations.

**Query Params**: `?limit=100&page=1&type=pellets&is_available=true`

**Response** `200`
```json
{
  "data": [
    {
      "product_id": 1,
      "product_name": "Biomass Pellets",
      "product_type": "pellets",
      "description": "...",
      "base_price": 8.5,
      "category": "Pellets",
      "image_url": "",
      "is_available": true,
      "configurations": [
        { "config_id": 1, "size": "6mm", "purpose": "Commercial Kitchen", "sub_purpose": "Restaurant Kitchen", "price": "12.00" }
      ]
    }
  ],
  "pagination": { "page": 1, "limit": 100, "total": 3, "totalPages": 1 }
}
```

---

### `GET /products/{id}`
Fetch a single product with full configurations.

---

### `POST /admin/products`
Create a new product.

**Body**
```json
{
  "product_name": "Biomass Pellets",
  "product_type": "pellets",
  "description": "...",
  "base_price": 12.00,
  "category": "Pellets",
  "image_url": "",
  "is_available": true,
  "configurations": [
    { "size": "6mm", "purpose": "Commercial Kitchen", "sub_purpose": "Restaurant Kitchen", "price": 12 }
  ]
}
```

**`product_type` Enum** (must match exactly):
| Category | product_type |
|---|---|
| Pellets | `pellets` |
| Biomass Stove | `biomass-stove` |
| Biomass Burner | `biomass-burner` |

**Response** `201 Created` — returns the created product object.

---

### `PUT /admin/products/{id}`
Update product fields. All fields are optional (partial update).  
If `configurations` array is included, **all old configs are deleted and replaced**.

**Body** *(send only fields to update)*
```json
{
  "product_name": "Updated Name",
  "base_price": 14.00,
  "configurations": [
    { "size": "8mm", "purpose": "Industrial Dryer", "sub_purpose": "Textile Dryer", "price": 14 }
  ]
}
```

---

### `DELETE /admin/products/{id}`
Soft-deletes the product (`is_deleted=1, is_available=0`) and **hard-deletes all its configurations**.

**Response** `200`
```json
{ "success": true, "message": "Product deleted successfully" }
```

---

## Data Model

### `product_configurations` table
Each row = one **size × purpose × sub_purpose** combination.

| Column | Type | Notes |
|---|---|---|
| `config_id` | int | PK |
| `product_id` | int | FK → products |
| `size` | varchar | e.g. `6mm`, `1kg`, `50kw` |
| `purpose` | varchar | e.g. `Commercial Kitchen` |
| `sub_purpose` | varchar / NULL | e.g. `Restaurant Kitchen` |
| `price` | decimal | Price for this config |

**Unique key**: `(product_id, size, purpose, sub_purpose)` — allows multiple sub_purposes per size+purpose.

---

## Frontend Mapping (`src/lib/api/products.ts`)

API `configurations[]` → UI shape:

| API field | UI field |
|---|---|
| `product_name` | `product` |
| `product_id` | `id` |
| Unique `purpose` values | `purposes[]` |
| `sub_purpose` values per purpose | `subPurposes[purpose][]` |
| Unique `size` + `price` pairs | `sizes[]` |

---

## Known Constraints

- `product_type` is a MySQL ENUM — must use hyphenated values (`biomass-stove`, not `biomass_stove`)
- Deleting a product removes all its configurations permanently
- Images must be 300×300px (enforced on frontend only)
