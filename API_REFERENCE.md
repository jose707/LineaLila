# 🔌 API Reference - Admin Driver Approval System

## Base URL

```
http://192.168.100.133:3000/api
```

## Authentication

```
Header: Authorization: Bearer {TOKEN}
Method: JWT Token (Bearer Token)
```

---

## 📋 Endpoints

### 1. GET /admin/drivers/pending

**Obtener solicitudes de conductores pendientes**

**Request:**

```http
GET /api/admin/drivers/pending?limit=20&offset=0
Authorization: Bearer {TOKEN}
Content-Type: application/json
```

**Query Parameters:**
| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 20 | Cantidad de resultados |
| `offset` | number | No | 0 | Posición de inicio |

**Response (200 OK):**

```json
{
  "drivers": [
    {
      "id": "driver-uuid-1",
      "userId": "user-uuid-1",
      "licenseNumber": "LIC-2024-001",
      "licenseExpiry": "2026-06-15T00:00:00Z",
      "vehicleType": "sedan",
      "vehiclePlate": "LPZ-1234",
      "vehicleYear": 2022,
      "vehicleColor": "Black",
      "vehicleModel": "Toyota Corolla",
      "documents": {
        "soatPhoto": null,
        "ruatPhoto": null,
        "licensePhoto": null
      },
      "backgroundCheckPassed": true,
      "status": "pending",
      "rejectionReason": null,
      "bankAccount": null,
      "isAvailable": false,
      "totalEarnings": 0,
      "totalRides": 0,
      "currentLocation": null,
      "createdAt": "2025-12-10T10:00:00Z",
      "updatedAt": "2025-12-10T10:00:00Z",
      "User": {
        "id": "user-uuid-1",
        "name": "Sofía Martínez",
        "email": "sofia.martinez@email.com",
        "phone": "+591 71 234 5678",
        "role": "pending_driver"
      }
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

**Errors:**

```json
{
  "status": 401,
  "error": "Unauthorized"
}

{
  "status": 500,
  "error": "Error al obtener solicitudes pendientes"
}
```

---

### 2. GET /admin/drivers

**Obtener todos los conductores con filtros**

**Request:**

```http
GET /api/admin/drivers?status=pending&search=sofia&limit=20&offset=0
Authorization: Bearer {TOKEN}
Content-Type: application/json
```

**Query Parameters:**
| Parámetro | Tipo | Requerido | Valores | Descripción |
|-----------|------|----------|--------|-------------|
| `status` | string | No | pending, approved, rejected | Filtro por estado |
| `search` | string | No | - | Buscar por licenseNumber |
| `limit` | number | No | 20 | Cantidad de resultados |
| `offset` | number | No | 0 | Posición de inicio |

**Response (200 OK):**

```json
{
  "drivers": [...],
  "total": 12,
  "limit": 20,
  "offset": 0
}
```

**Examples:**

```bash
# Obtener todos los aprobados
GET /api/admin/drivers?status=approved

# Buscar por número de licencia
GET /api/admin/drivers?search=LIC-2024-001

# Combinado
GET /api/admin/drivers?status=pending&search=LIC&limit=10
```

---

### 3. GET /admin/drivers/:driverId

**Obtener detalles de un conductor específico**

**Request:**

```http
GET /api/admin/drivers/{driverId}
Authorization: Bearer {TOKEN}
Content-Type: application/json
```

**Path Parameters:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|----------|-------------|
| `driverId` | string (UUID) | Sí | ID del conductor |

**Response (200 OK):**

```json
{
  "message": "Driver retrieved successfully",
  "driver": {
    "id": "driver-uuid-1",
    "userId": "user-uuid-1",
    "licenseNumber": "LIC-2024-001",
    "licenseExpiry": "2026-06-15T00:00:00Z",
    "vehicleType": "sedan",
    "vehiclePlate": "LPZ-1234",
    "vehicleYear": 2022,
    "vehicleColor": "Black",
    "vehicleModel": "Toyota Corolla",
    "documents": { ... },
    "backgroundCheckPassed": true,
    "status": "pending",
    "rejectionReason": null,
    "bankAccount": null,
    "isAvailable": false,
    "totalEarnings": 0,
    "totalRides": 0,
    "currentLocation": null,
    "createdAt": "2025-12-10T10:00:00Z",
    "updatedAt": "2025-12-10T10:00:00Z",
    "User": {
      "id": "user-uuid-1",
      "name": "Sofía Martínez",
      "email": "sofia.martinez@email.com",
      "phone": "+591 71 234 5678",
      "role": "pending_driver"
    }
  }
}
```

**Errors:**

```json
{
  "status": 404,
  "error": "Conductor no encontrado"
}
```

---

### 4. PUT /admin/drivers/:driverId/approve

**Aprobar una solicitud de conductor**

**Request:**

```http
PUT /api/admin/drivers/{driverId}/approve
Authorization: Bearer {TOKEN}
Content-Type: application/json

{}
```

**Path Parameters:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|----------|-------------|
| `driverId` | string (UUID) | Sí | ID del conductor a aprobar |

**Request Body:**

```json
{
  // Sin cuerpo requerido
}
```

**Response (200 OK):**

```json
{
  "message": "Conductor aprobado exitosamente",
  "driver": {
    "id": "driver-uuid-1",
    "userId": "user-uuid-1",
    "status": "approved",
    "backgroundCheckPassed": true,
    "licenseNumber": "LIC-2024-001",
    "vehicleType": "sedan",
    "vehiclePlate": "LPZ-1234",
    ... (resto de campos)
  }
}
```

**Side Effects:**

1. Status cambias de `pending` a `approved`
2. `backgroundCheckPassed` se establece en `true`
3. Usuario asociado recibe rol `driver`
4. Se puede generar notificación por email (opcional)

**Errors:**

```json
{
  "status": 404,
  "error": "Conductor no encontrado"
}

{
  "status": 400,
  "error": "El conductor ya está aprobado"
}

{
  "status": 401,
  "error": "No autorizado"
}
```

**Example cURL:**

```bash
curl -X PUT \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  http://192.168.100.133:3000/api/admin/drivers/driver-uuid-1/approve
```

---

### 5. PUT /admin/drivers/:driverId/reject

**Rechazar una solicitud de conductor**

**Request:**

```http
PUT /api/admin/drivers/{driverId}/reject
Authorization: Bearer {TOKEN}
Content-Type: application/json

{
  "reason": "Documentation incomplete"
}
```

**Path Parameters:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|----------|-------------|
| `driverId` | string (UUID) | Sí | ID del conductor a rechazar |

**Request Body:**
| Campo | Tipo | Requerido | Max Length | Descripción |
|-------|------|----------|-----------|-------------|
| `reason` | string | Sí | 500 | Motivo del rechazo |

**Response (200 OK):**

```json
{
  "message": "Conductor rechazado",
  "driver": {
    "id": "driver-uuid-1",
    "userId": "user-uuid-1",
    "status": "rejected",
    "backgroundCheckPassed": false,
    "rejectionReason": "Documentation incomplete",
    "licenseNumber": "LIC-2024-001",
    "vehicleType": "sedan",
    "vehiclePlate": "LPZ-1234",
    ... (resto de campos)
  }
}
```

**Side Effects:**

1. Status cambia de `pending` a `rejected`
2. `backgroundCheckPassed` se establece en `false`
3. `rejectionReason` se almacena en BD
4. Se puede generar notificación por email (opcional)
5. Usuario NO recibe rol `driver`

**Errors:**

```json
{
  "status": 404,
  "error": "Conductor no encontrado"
}

{
  "status": 400,
  "error": "El campo 'reason' es requerido"
}

{
  "status": 401,
  "error": "No autorizado"
}
```

**Example cURL:**

```bash
curl -X PUT \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"reason":"Documentación incompleta"}' \
  http://192.168.100.133:3000/api/admin/drivers/driver-uuid-1/reject
```

---

## 🔒 Autorización y Permisos

### Requisitos:

1. **Token JWT válido** en header `Authorization: Bearer {token}`
2. **Rol `admin`** en la tabla `users`
3. **Middleware `authMiddleware`** válida el token
4. **Middleware `adminMiddleware`** valida el rol

### Campos requeridos en Usuario Admin:

```json
{
  "id": "admin-uuid",
  "email": "admin@linealiła.com",
  "password": "hashed_password",
  "role": "admin",
  "name": "Admin Línea Lila",
  "phone": "+591...",
  "isActive": true
}
```

---

## 📊 Estados del Conductor

### Estados válidos:

```
┌─────────────┬──────────────────────────────────────┐
│ Estado      │ Descripción                          │
├─────────────┼──────────────────────────────────────┤
│ pending     │ Solicitud en revisión                │
│ approved    │ Aprobado y activo en la plataforma   │
│ rejected    │ Rechazado (puede reaplicar)          │
│ suspended   │ Suspendido temporalmente (futuro)    │
│ inactive    │ Inactivo (futuro)                    │
└─────────────┴──────────────────────────────────────┘
```

### Transiciones de estado permitidas:

```
pending   → approved  [PUT /approve]
pending   → rejected  [PUT /reject]
approved  → suspended [futuro]
rejected  → pending   [reapplication process - futuro]
```

---

## 🗄️ Base de Datos

### Tabla: drivers

```sql
CREATE TABLE drivers (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL REFERENCES users(id),
  licenseNumber VARCHAR(50) UNIQUE NOT NULL,
  licenseExpiry DATE NOT NULL,
  vehicleType ENUM('sedan', 'suv', 'van', 'motorcycle') NOT NULL,
  vehiclePlate VARCHAR(20) UNIQUE NOT NULL,
  vehicleYear INTEGER NOT NULL,
  vehicleColor VARCHAR(30) NOT NULL,
  vehicleModel VARCHAR(50) NOT NULL,
  documents JSON,
  backgroundCheckPassed BOOLEAN DEFAULT false,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  rejectionReason VARCHAR(500),
  bankAccount JSON,
  isAvailable BOOLEAN DEFAULT false,
  totalEarnings FLOAT DEFAULT 0,
  totalRides INTEGER DEFAULT 0,
  currentLocation JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_userId ON drivers(userId);
CREATE INDEX idx_drivers_licenseNumber ON drivers(licenseNumber);
```

---

## 🧪 Prueba rápida

```bash
# 1. Obtener solicitudes pendientes
curl -H "Authorization: Bearer TOKEN" \
  http://192.168.100.133:3000/api/admin/drivers/pending

# 2. Aprobar un conductor
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  http://192.168.100.133:3000/api/admin/drivers/DRIVER_ID/approve

# 3. Rechazar con motivo
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Documentación incompleta"}' \
  http://192.168.100.133:3000/api/admin/drivers/DRIVER_ID/reject
```

---

## 📝 Códigos de Error

| Código | Mensaje               | Causa                             |
| ------ | --------------------- | --------------------------------- |
| 200    | Success               | Operación exitosa                 |
| 400    | Bad Request           | Parámetros inválidos              |
| 401    | Unauthorized          | Token inválido o no presente      |
| 403    | Forbidden             | Usuario no es admin               |
| 404    | Not Found             | Conductor no encontrado           |
| 409    | Conflict              | Estado inválido para la operación |
| 500    | Internal Server Error | Error en servidor                 |

---

## 🔄 Rate Limiting (Futuro)

Actualmente sin límite. Será implementado en producción:

```
- 100 requests/min por usuario
- 1000 requests/min por IP
```

---

## 📚 Referencias

- **Backend Code:** `backend/src/controllers/adminController.js`
- **Routes:** `backend/src/routes/admin.js`
- **Model:** `backend/src/models/Driver.js`
- **Middleware:** `backend/src/middleware/auth.js`

---

**Última actualización:** 26 Enero, 2026
