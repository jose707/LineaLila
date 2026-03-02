# 📐 Arquitectura del Sistema LineaLila

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React Native)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Login      │  │  Home Screen │  │ Admin Panel  │          │
│  │  Signup      │  │  Maps        │  │ Analytics    │          │
│  │  Forgot Pass │  │  Rides       │  │ Users        │          │
│  │  Role Select │  │  Profile     │  │ Drivers      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                     HTTP REST API
                             │
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js/Express)                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               Routes & Controllers                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  /auth   │ │ /users   │ │ /rides   │ │ /admin   │  │   │
│  │  │ Signup   │ │ Profile  │ │ Create   │ │ Users    │  │   │
│  │  │ Login    │ │ Update   │ │ Accept   │ │ Drivers  │  │   │
│  │  │ Refresh  │ │ Photo    │ │ Complete │ │ Analytics│  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             │                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            Middleware (Authentication)                  │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │   │
│  │  │  JWT Auth    │ │ Admin Check  │ │ Driver Check │   │   │
│  │  │ (Token)      │ │ (Role=admin) │ │ (Role=driver)│   │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             │                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Business Logic (Controllers)                  │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │   │
│  │  │ authCtrl     │ │ userCtrl     │ │ rideCtrl     │   │   │
│  │  │ adminCtrl    │ │              │ │              │   │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             │                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           ORM Models (Sequelize)                        │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │   │
│  │  │ User Model   │ │ Driver Model │ │ Ride Model   │   │   │
│  │  │ 15 fields    │ │ 24 fields    │ │ 40+ fields   │   │   │
│  │  │ UUID, role   │ │ License,     │ │ Locations,   │   │   │
│  │  │ email, phone │ │ vehicle,     │ │ fare,        │   │   │
│  │  │ password     │ │ earnings     │ │ ratings      │   │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             │                                    │
└─────────────────────────────┼──────────────────────────────────┘
                             │
                        SQL Queries
                             │
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ users table  │  │ drivers table │  │  rides table │          │
│  │ - id (UUID)  │  │ - id (UUID)   │  │ - id (UUID)  │          │
│  │ - email      │  │ - userId (FK) │  │ - passengerId│          │
│  │ - phone      │  │ - license     │  │ - driverId   │          │
│  │ - password   │  │ - vehicle     │  │ - locations  │          │
│  │ - role       │  │ - status      │  │ - fare       │          │
│  │ - rating     │  │ - earnings    │  │ - status     │          │
│  │ - profile... │  │ - location... │  │ - ratings... │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Indexes: email (users), userId (drivers), passengerId   │   │
│  │ Relationships: Driver→User, Ride→User (passenger,driver)│   │
│  │ Constraints: Unique email/phone, ENUM types, Foreign Keys
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Flujo de Autenticación

```
1. User Signs Up
   │
   └─→ POST /api/auth/signup
       │
       ├─→ Validate inputs
       ├─→ Check email uniqueness
       ├─→ Hash password (bcryptjs)
       ├─→ Create user in PostgreSQL
       │
       └─→ Generate JWT token
           ├─→ Payload: {id, email, role}
           ├─→ Secret: JWT_SECRET
           ├─→ Expires: 7 days
           │
           └─→ Return token + user data

2. User Logs In
   │
   └─→ POST /api/auth/login
       │
       ├─→ Validate email/password
       ├─→ Find user in DB
       ├─→ Compare password (bcryptjs.compare)
       ├─→ Update lastLogin
       │
       └─→ Generate & return JWT token

3. User Makes Request
   │
   └─→ Authorization: Bearer <JWT_TOKEN>
       │
       ├─→ authMiddleware
       │   ├─→ Extract token from header
       │   ├─→ Verify signature
       │   ├─→ Check expiration
       │   │
       │   └─→ Attach user to req.user
       │
       ├─→ Check role if needed (adminMiddleware, driverMiddleware)
       │
       └─→ Process request
           └─→ Return response
```

## Flujo de Solicitud de Viaje

```
1. Pasajero solicita viaje
   │
   └─→ POST /api/rides (autenticado)
       │
       ├─→ Get pickup/dropoff locations
       ├─→ Calculate distance & fare
       │   ├─→ baseFare = $3.00
       │   ├─→ perKm = $1.20 × distance
       │   ├─→ perMinute = $0.15 × duration
       │   │
       │   └─→ totalFare = baseFare + perKm + perMinute
       │
       ├─→ Apply promo code (if any)
       ├─→ Create ride in DB (status: "requested")
       │
       └─→ Return ride details with fare

2. Conductor acepta viaje
   │
   └─→ PUT /api/rides/:rideId/accept (autenticado)
       │
       ├─→ Find ride (must be "requested")
       ├─→ Assign driverId
       ├─→ Update status to "accepted"
       │
       └─→ Notify passenger (via Socket.io)

3. Conductor completa viaje
   │
   └─→ PUT /api/rides/:rideId/complete (autenticado)
       │
       ├─→ Find ride (must be "in_progress")
       ├─→ Add passenger rating/review
       ├─→ Update status to "completed"
       ├─→ Update paymentStatus to "completed"
       ├─→ Add driver earnings
       │
       └─→ Return completed ride data
```

## Flujo de Aprobación de Conductor

```
1. Usuario registra como conductor
   │
   └─→ POST /api/drivers/register (autenticado)
       │
       ├─→ Submit license, vehicle, documents
       ├─→ Create Driver record (status: "pending")
       │
       └─→ Notify admin for approval

2. Admin revisa solicitud
   │
   └─→ GET /api/admin/drivers/pending (admin only)
       │
       ├─→ List all pending drivers
       ├─→ Review documents
       │
       └─→ Approve or reject

3a. Admin aprueba
    │
    └─→ PUT /api/admin/drivers/:driverId/approve (admin only)
        │
        ├─→ Update driver status to "approved"
        ├─→ Update user role to "driver"
        ├─→ backgroundCheckPassed = true
        │
        └─→ Send approval email

3b. Admin rechaza
    │
    └─→ PUT /api/admin/drivers/:driverId/reject (admin only)
        │
        ├─→ Update driver status to "rejected"
        ├─→ Store rejection reason
        │
        └─→ Send rejection email
```

## Seguridad

```
┌─────────────────────────────────────┐
│       Security Layers               │
├─────────────────────────────────────┤
│ 1. HTTPS (in production)            │
│ 2. CORS - whitelist frontend URLs   │
│ 3. Helmet - security headers        │
│ 4. JWT - stateless authentication   │
│ 5. bcryptjs - password hashing      │
│ 6. Role-based middleware            │
│ 7. Input validation                 │
│ 8. SQL injection prevention (ORM)   │
│ 9. Rate limiting (future)           │
│ 10. Database connection pooling     │
└─────────────────────────────────────┘
```

## Modelos de Base de Datos - Relaciones

```
User (Base)
├── id (UUID, PK)
├── email (UNIQUE)
├── phone (UNIQUE)
├── password (hashed)
└── role (ENUM: user, driver, admin)

    ↓ 1:1 (optional)

Driver (Extension para conductores)
├── id (UUID, PK)
├── userId (FK → User.id)
├── licenseNumber (UNIQUE)
├── vehicle info
└── bankAccount

    ↑ 1:N

Ride
├── id (UUID, PK)
├── passengerId (FK → User.id)
├── driverId (FK → User.id) [nullable]
├── pickupLocation
├── dropoffLocation
├── fare
└── ratings
```

## Escalabilidad Futura

```
┌──────────────────────────────────────┐
│  Load Balancer (nginx/HAProxy)       │
└──────────────────────────────────────┘
           ↓
┌────────────┬────────────┬────────────┐
│  Server 1  │  Server 2  │  Server 3  │
│  :3000     │  :3001     │  :3002     │
└────────────┴────────────┴────────────┘
           ↓
┌──────────────────────────────────────┐
│  PostgreSQL Cluster (replication)    │
│  with read replicas                  │
└──────────────────────────────────────┘
           ↓
┌──────────────────────────────────────┐
│  Redis Cache (session, rate limiting)│
└──────────────────────────────────────┘
```

---

**Arquitectura completa documentada** ✅
