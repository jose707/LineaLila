# Backend Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js                      # Sequelize PostgreSQL Config
│   │
│   ├── models/
│   │   ├── User.js                          # Usuario (pasajeros, conductores, admin)
│   │   ├── Driver.js                        # Perfil de conductor
│   │   └── Ride.js                          # Información de viajes
│   │
│   ├── controllers/
│   │   ├── authController.js                # signup, login, me, refresh
│   │   ├── userController.js                # getProfile, updateProfile, etc
│   │   ├── rideController.js                # createRide, acceptRide, etc
│   │   └── adminController.js               # admin endpoints
│   │
│   ├── middleware/
│   │   └── auth.js                          # JWT validation, role checks
│   │
│   ├── routes/
│   │   ├── auth.js                          # /api/auth/* endpoints
│   │   ├── users.js                         # /api/users/* endpoints
│   │   ├── rides.js                         # /api/rides/* endpoints
│   │   └── admin.js                         # /api/admin/* endpoints
│   │
│   ├── utils/
│   │   └── tokenHelper.js                   # JWT token utilities
│   │
│   ├── seeders/
│   │   └── seeder.js                        # Database seed with test data
│   │
│   └── server.js                            # Express app entry point
│
├── .env                                     # Environment variables
├── .gitignore                               # Git ignore rules
├── package.json                             # Node dependencies
├── README.md                                # API Documentation
├── BACKEND_SUMMARY.md                       # Implementation summary
└── POSTGRESQL_SETUP.md                      # PostgreSQL installation guide
```

## File Descriptions

### Config

- **database.js** - Sequelize ORM initialization with PostgreSQL dialect, connection pooling

### Models

- **User.js** - Base user model with UUID, email, phone, password, role, rating
- **Driver.js** - Driver-specific fields (license, vehicle, documents, status, earnings)
- **Ride.js** - Ride model with locations, fare calculation, status, ratings

### Controllers

- **authController.js**

  - `signup(req, res)` - Register with bcrypt hashing
  - `login(req, res)` - Authenticate and return JWT
  - `getCurrentUser(req, res)` - Get authenticated user
  - `refreshToken(req, res)` - Generate new JWT

- **userController.js**

  - `getUserProfile(req, res)` - Get user by ID
  - `updateUserProfile(req, res)` - Update name, email, phone
  - `updateProfilePhoto(req, res)` - Update profile picture URL
  - `verifyPhone(req, res)` - Mark phone as verified

- **rideController.js**

  - `createRide(req, res)` - Request new ride
  - `getRideById(req, res)` - Get ride details
  - `getActiveRide(req, res)` - Get user's active ride
  - `getRideHistory(req, res)` - Paginated history
  - `acceptRide(req, res)` - Driver accept ride
  - `completeRide(req, res)` - Mark ride complete
  - `cancelRide(req, res)` - Cancel ride

- **adminController.js**
  - `getAllUsers(req, res)` - List users with search/filter
  - `getAllDrivers(req, res)` - List drivers with status filter
  - `approveDriver(req, res)` - Approve driver registration
  - `rejectDriver(req, res)` - Reject driver application
  - `getPendingDriverRequests(req, res)` - Get pending approvals
  - `getAllRides(req, res)` - List all rides with filters
  - `getAnalytics(req, res)` - Dashboard statistics
  - `createPromoCode(req, res)` - Create discount code

### Middleware

- **auth.js**
  - `authMiddleware` - JWT verification, attach user to req
  - `adminMiddleware` - Require admin role
  - `driverMiddleware` - Require driver role

### Routes

- **auth.js**

  - POST `/signup` - Public
  - POST `/login` - Public
  - GET `/me` - Protected
  - POST `/refresh` - Protected

- **users.js**

  - GET `/profile` - Protected
  - GET `/:id` - Protected
  - PUT `/:id` - Protected
  - PUT `/:id/photo` - Protected
  - POST `/:id/verify-phone` - Protected

- **rides.js**

  - POST `/` - Protected
  - GET `/active` - Protected
  - GET `/history` - Protected
  - GET `/:id` - Protected
  - PUT `/:rideId/accept` - Protected
  - PUT `/:rideId/complete` - Protected
  - PUT `/:rideId/cancel` - Protected

- **admin.js** (All require authMiddleware + adminMiddleware)
  - GET `/users` - Search users
  - GET `/drivers` - List drivers
  - GET `/drivers/pending` - Driver approvals
  - PUT `/drivers/:driverId/approve` - Approve driver
  - PUT `/drivers/:driverId/reject` - Reject driver
  - GET `/rides` - List rides
  - GET `/analytics` - Dashboard data
  - POST `/promo-codes` - Create promo

### Utils

- **tokenHelper.js**
  - `generateToken(user)` - Create JWT
  - `verifyToken(token)` - Validate JWT
  - `decodeToken(token)` - Extract JWT payload

### Seeders

- **seeder.js** - Creates test users (admin, driver, client) and sample ride

## Database Schema

### Users Table

```sql
id (UUID)
name (VARCHAR)
email (VARCHAR, UNIQUE)
phone (VARCHAR, UNIQUE)
password (VARCHAR, hashed)
role (ENUM: user, driver, admin)
profilePhoto (VARCHAR, nullable)
rating (FLOAT, 0-5)
totalTrips (INT)
isActive (BOOLEAN)
isVerified (BOOLEAN)
lastLogin (DATETIME)
createdAt (DATETIME)
updatedAt (DATETIME)
```

### Drivers Table

```sql
id (UUID)
userId (UUID, FK→users)
licenseNumber (VARCHAR, UNIQUE)
licenseExpiry (DATE)
vehicleType (ENUM)
vehiclePlate (VARCHAR, UNIQUE)
vehicleYear (INT)
vehicleColor (VARCHAR)
vehicleModel (VARCHAR)
documents (JSON)
backgroundCheckPassed (BOOLEAN)
status (ENUM: pending, approved, rejected)
rejectionReason (VARCHAR, nullable)
bankAccount (JSON)
isAvailable (BOOLEAN)
totalEarnings (FLOAT)
totalRides (INT)
currentLocation (JSON)
createdAt (DATETIME)
updatedAt (DATETIME)
```

### Rides Table

```sql
id (UUID)
passengerId (UUID, FK→users)
driverId (UUID, FK→users, nullable)
pickupLocation (JSON)
dropoffLocation (JSON)
distance (FLOAT)
duration (INT)
baseFare (FLOAT)
farePerKm (FLOAT)
farePerMinute (FLOAT)
totalFare (FLOAT)
discountAmount (FLOAT)
promoCode (VARCHAR)
finalFare (FLOAT)
status (ENUM)
paymentStatus (ENUM)
paymentMethod (ENUM)
driverRating (INT)
driverReview (TEXT)
passengerRating (INT)
passengerReview (TEXT)
requestedAt (DATETIME)
acceptedAt (DATETIME, nullable)
startedAt (DATETIME, nullable)
completedAt (DATETIME, nullable)
cancellationReason (VARCHAR)
cancelledBy (ENUM)
createdAt (DATETIME)
updatedAt (DATETIME)
```

## Environment Variables

```
NODE_ENV=development|production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=linea_lila
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=secret_key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
FRONTEND_MOBILE=http://localhost:8081
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads/
```

## NPM Scripts

```json
{
  "start": "node src/server.js",
  "dev": "nodemon src/server.js",
  "migrate": "node src/migrations/migrate.js",
  "seed": "node src/seeders/seeder.js"
}
```

## Dependencies

- **express** 4.18.2 - Web framework
- **sequelize** 6.35.2 - ORM for database
- **pg** 8.11.3 - PostgreSQL driver
- **bcryptjs** 2.4.3 - Password hashing
- **jsonwebtoken** 9.1.2 - JWT creation/verification
- **cors** 2.8.5 - Cross-origin requests
- **helmet** 7.1.0 - Security headers
- **uuid** 9.0.1 - UUID generation
- **dotenv** 16.3.1 - Environment variable loading

## Dev Dependencies

- **nodemon** 3.0.2 - Auto-reload on file changes
