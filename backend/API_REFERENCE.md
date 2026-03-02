# 📋 API Endpoints Reference

## Base URL

```
http://localhost:3000/api
```

## Authentication Endpoints

### 1. Sign Up (Registro)

```
POST /auth/signup
Content-Type: application/json

Request:
{
  "name": "Juan Doe",
  "email": "juan@example.com",
  "phone": "+573001234567",
  "password": "password123",
  "confirmPassword": "password123"
}

Response (201):
{
  "message": "Usuario registrado exitosamente",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Juan Doe",
    "email": "juan@example.com",
    "phone": "+573001234567",
    "role": "user"
  }
}

Error Response (400):
{
  "error": "Todos los campos son requeridos"
}
```

### 2. Login (Iniciar Sesión)

```
POST /auth/login
Content-Type: application/json

Request:
{
  "email": "juan@example.com",
  "password": "password123"
}

Response (200):
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Juan Doe",
    "email": "juan@example.com",
    "phone": "+573001234567",
    "role": "user",
    "profilePhoto": null
  }
}

Error Response (401):
{
  "error": "Email o contraseña incorrectos"
}
```

### 3. Get Current User (Usuario Actual)

```
GET /auth/me
Authorization: Bearer <JWT_TOKEN>

Response (200):
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Juan Doe",
    "email": "juan@example.com",
    "phone": "+573001234567",
    "role": "user",
    "profilePhoto": "https://example.com/photo.jpg",
    "rating": 4.5,
    "totalTrips": 12,
    "isActive": true,
    "isVerified": true,
    "lastLogin": "2024-01-15T10:30:00Z"
  }
}

Error Response (401):
{
  "error": "Token inválido o expirado"
}
```

### 4. Refresh Token (Refrescar Token)

```
POST /auth/refresh
Authorization: Bearer <OLD_JWT_TOKEN>

Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Error Response (401):
{
  "error": "Token inválido o expirado"
}
```

---

## User Endpoints

### 5. Get User Profile (Obtener Perfil)

```
GET /users/profile
Authorization: Bearer <JWT_TOKEN>

Response (200):
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Juan Doe",
    "email": "juan@example.com",
    "phone": "+573001234567",
    "role": "user",
    "profilePhoto": "https://example.com/photo.jpg",
    "rating": 4.5,
    "totalTrips": 12,
    "isActive": true,
    "isVerified": true,
    "createdAt": "2023-12-01T10:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 6. Get User by ID

```
GET /users/:id
Authorization: Bearer <JWT_TOKEN>

Response (200):
{
  "user": { ... same as above ... }
}
```

### 7. Update User Profile

```
PUT /users/:id
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Request:
{
  "name": "Juan Updated",
  "email": "juanupdated@example.com",
  "phone": "+573009876543"
}

Response (200):
{
  "message": "Perfil actualizado correctamente",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Juan Updated",
    "email": "juanupdated@example.com",
    "phone": "+573009876543",
    "role": "user",
    "profilePhoto": null,
    "rating": 4.5
  }
}
```

### 8. Update Profile Photo

```
PUT /users/:id/photo
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Request:
{
  "photoUrl": "https://example.com/new-photo.jpg"
}

Response (200):
{
  "message": "Foto de perfil actualizada",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "profilePhoto": "https://example.com/new-photo.jpg"
  }
}
```

### 9. Verify Phone

```
POST /users/:id/verify-phone
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Request:
{
  "verificationCode": "123456"
}

Response (200):
{
  "message": "Teléfono verificado correctamente"
}
```

---

## Ride Endpoints

### 10. Create Ride (Crear Viaje)

```
POST /rides
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Request:
{
  "pickupLocation": {
    "latitude": 4.7110,
    "longitude": -74.0087,
    "address": "Carrera 7 #100, Bogotá"
  },
  "dropoffLocation": {
    "latitude": 4.7169,
    "longitude": -74.0076,
    "address": "Calle 85 #15-50, Bogotá"
  },
  "distance": 2.5,
  "duration": 12
}

Response (201):
{
  "message": "Solicitud de viaje creada",
  "ride": {
    "id": "660f8400-e29b-41d4-a716-446655440000",
    "passengerId": "550e8400-e29b-41d4-a716-446655440000",
    "driverId": null,
    "pickupLocation": { ... },
    "dropoffLocation": { ... },
    "distance": 2.5,
    "duration": 12,
    "baseFare": 3.0,
    "farePerKm": 1.2,
    "farePerMinute": 0.15,
    "totalFare": 6.6,
    "finalFare": 6.6,
    "status": "requested",
    "paymentStatus": "pending",
    "paymentMethod": "cash",
    "createdAt": "2024-01-15T14:30:00Z"
  }
}
```

### 11. Get Active Ride

```
GET /rides/active
Authorization: Bearer <JWT_TOKEN>

Response (200):
{
  "ride": {
    "id": "660f8400-e29b-41d4-a716-446655440000",
    "passengerId": "550e8400-e29b-41d4-a716-446655440000",
    "driverId": "770e8400-e29b-41d4-a716-446655440000",
    "status": "in_progress",
    "pickupLocation": { ... },
    "dropoffLocation": { ... },
    "finalFare": 6.6,
    "passenger": { ... },
    "driver": { ... }
  }
}

Error (404):
{
  "error": "No hay viajes activos"
}
```

### 12. Get Ride History

```
GET /rides/history?limit=10&offset=0
Authorization: Bearer <JWT_TOKEN>

Response (200):
{
  "rides": [ ... array of completed rides ... ],
  "total": 45,
  "limit": 10,
  "offset": 0
}
```

### 13. Get Ride by ID

```
GET /rides/:id
Authorization: Bearer <JWT_TOKEN>

Response (200):
{
  "ride": {
    "id": "660f8400-e29b-41d4-a716-446655440000",
    "passengerId": "550e8400-e29b-41d4-a716-446655440000",
    "driverId": "770e8400-e29b-41d4-a716-446655440000",
    "pickupLocation": { ... },
    "dropoffLocation": { ... },
    "distance": 2.5,
    "duration": 12,
    "totalFare": 6.6,
    "status": "completed",
    "driverRating": 5,
    "driverReview": "Muy buen conductor",
    "passenger": { ... },
    "driver": { ... },
    "createdAt": "2024-01-15T14:30:00Z",
    "completedAt": "2024-01-15T14:45:00Z"
  }
}
```

### 14. Accept Ride (Aceptar Viaje)

```
PUT /rides/:rideId/accept
Authorization: Bearer <JWT_TOKEN>

Response (200):
{
  "message": "Viaje aceptado exitosamente",
  "ride": {
    "id": "660f8400-e29b-41d4-a716-446655440000",
    "status": "accepted",
    "driverId": "770e8400-e29b-41d4-a716-446655440000",
    "acceptedAt": "2024-01-15T14:32:00Z"
  }
}

Error (400):
{
  "error": "El viaje ya ha sido aceptado o cancelado"
}
```

### 15. Complete Ride

```
PUT /rides/:rideId/complete
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Request:
{
  "driverRating": 5,
  "driverReview": "Excelente servicio"
}

Response (200):
{
  "message": "Viaje completado exitosamente",
  "ride": {
    "id": "660f8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "paymentStatus": "completed",
    "completedAt": "2024-01-15T14:45:00Z",
    "driverRating": 5,
    "driverReview": "Excelente servicio"
  }
}
```

### 16. Cancel Ride

```
PUT /rides/:rideId/cancel
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Request:
{
  "reason": "Cambié de opinión",
  "cancelledBy": "passenger"
}

Response (200):
{
  "message": "Viaje cancelado",
  "ride": {
    "id": "660f8400-e29b-41d4-a716-446655440000",
    "status": "cancelled",
    "cancellationReason": "Cambié de opinión",
    "cancelledBy": "passenger"
  }
}
```

---

## Admin Endpoints

### 17. Get All Users

```
GET /admin/users?search=juan&role=user&limit=20&offset=0
Authorization: Bearer <JWT_TOKEN>
Role: admin

Response (200):
{
  "users": [ ... array of users ... ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

### 18. Get All Drivers

```
GET /admin/drivers?status=approved&limit=20&offset=0
Authorization: Bearer <JWT_TOKEN>
Role: admin

Response (200):
{
  "drivers": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "licenseNumber": "DL123456789",
      "licenseExpiry": "2025-12-31",
      "vehicleType": "sedan",
      "vehiclePlate": "ABC123",
      "status": "approved",
      "totalEarnings": 1250.50,
      "totalRides": 45,
      "isAvailable": true,
      "User": { ... }
    }
  ],
  "total": 25,
  "limit": 20,
  "offset": 0
}
```

### 19. Get Pending Drivers

```
GET /admin/drivers/pending?limit=20&offset=0
Authorization: Bearer <JWT_TOKEN>
Role: admin

Response (200):
{
  "drivers": [ ... pending drivers ... ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

### 20. Approve Driver

```
PUT /admin/drivers/:driverId/approve
Authorization: Bearer <JWT_TOKEN>
Role: admin

Response (200):
{
  "message": "Conductor aprobado exitosamente",
  "driver": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "status": "approved",
    "backgroundCheckPassed": true
  }
}
```

### 21. Reject Driver

```
PUT /admin/drivers/:driverId/reject
Authorization: Bearer <JWT_TOKEN>
Role: admin
Content-Type: application/json

Request:
{
  "reason": "Documentos incompletos"
}

Response (200):
{
  "message": "Conductor rechazado",
  "driver": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "status": "rejected",
    "rejectionReason": "Documentos incompletos"
  }
}
```

### 22. Get All Rides

```
GET /admin/rides?status=completed&startDate=2024-01-01&endDate=2024-01-31&limit=20
Authorization: Bearer <JWT_TOKEN>
Role: admin

Response (200):
{
  "rides": [ ... rides with filters ... ],
  "total": 156,
  "limit": 20,
  "offset": 0
}
```

### 23. Get Analytics

```
GET /admin/analytics
Authorization: Bearer <JWT_TOKEN>
Role: admin

Response (200):
{
  "analytics": {
    "totalUsers": 340,
    "totalDrivers": 85,
    "activeDrivers": 32,
    "totalRides": 1250,
    "completedRides": 1180,
    "totalRevenue": 5600.50,
    "avgRideRating": 4.7,
    "ridesThisMonth": 280
  }
}
```

### 24. Create Promo Code

```
POST /admin/promo-codes
Authorization: Bearer <JWT_TOKEN>
Role: admin
Content-Type: application/json

Request:
{
  "code": "NEWUSER20",
  "discountPercentage": 20,
  "discountAmount": null,
  "maxUses": 100,
  "expiryDate": "2024-02-28"
}

Response (201):
{
  "message": "Código promocional creado",
  "promoCode": {
    "code": "NEWUSER20",
    "discountPercentage": 20,
    "discountAmount": null,
    "maxUses": 100,
    "expiryDate": "2024-02-28"
  }
}
```

---

## Health Check

### 25. Health Status

```
GET /health

Response (200):
{
  "status": "OK",
  "timestamp": "2024-01-15T15:00:00.000Z"
}
```

---

## Status Codes

| Code | Meaning                           |
| ---- | --------------------------------- |
| 200  | OK - Solicitud exitosa            |
| 201  | Created - Recurso creado          |
| 400  | Bad Request - Error de validación |
| 401  | Unauthorized - Token no válido    |
| 403  | Forbidden - Permiso denegado      |
| 404  | Not Found - Recurso no existe     |
| 500  | Server Error - Error interno      |

---

## Authentication

Todos los endpoints excepto `/signup`, `/login` y `/health` requieren:

```
Authorization: Bearer <JWT_TOKEN>
```

El token se obtiene de la respuesta de `/signup` o `/login`.

---

## Rate Limiting (Futuro)

Por implementar:

- 100 requests por minuto por IP
- 1000 requests por hora por usuario autenticado

---

**Total: 25 Endpoints Operacionales** ✅
