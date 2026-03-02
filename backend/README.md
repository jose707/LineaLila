# LineaLila Backend API

Backend API para la aplicación de transporte LineaLila construido con Node.js, Express, PostgreSQL y Sequelize.

## Requisitos Previos

- Node.js (v16 o superior)
- PostgreSQL (v12 o superior)
- npm o yarn

## Instalación

1. Navega a la carpeta del backend:

```bash
cd backend
```

2. Instala las dependencias:

```bash
npm install
```

3. Configura las variables de entorno:

```bash
# Copia el archivo .env.example a .env
cp .env.example .env

# Edita el archivo .env con tus valores de PostgreSQL
```

4. Crea la base de datos:

```bash
createdb linea_lila
```

5. Ejecuta las migraciones:

```bash
npm run migrate
```

6. (Opcional) Carga datos de prueba:

```bash
npm run seed
```

## Ejecutar el Servidor

**Modo Desarrollo (con hot-reload):**

```bash
npm run dev
```

**Modo Producción:**

```bash
npm start
```

El servidor se ejecutará en `http://localhost:3000`

## Endpoints Principales

### Autenticación (`/api/auth`)

- **POST** `/signup` - Registrar nuevo usuario
- **POST** `/login` - Iniciar sesión
- **GET** `/me` - Obtener usuario actual (protegido)
- **POST** `/refresh` - Refrescar token JWT (protegido)

### Usuarios (`/api/users`)

- **GET** `/profile` - Obtener perfil actual (protegido)
- **GET** `/:id` - Obtener perfil de usuario (protegido)
- **PUT** `/:id` - Actualizar perfil (protegido)
- **PUT** `/:id/photo` - Actualizar foto de perfil (protegido)
- **POST** `/:id/verify-phone` - Verificar teléfono (protegido)

### Viajes (`/api/rides`)

- **POST** `/` - Crear solicitud de viaje (protegido)
- **GET** `/active` - Obtener viaje activo (protegido)
- **GET** `/history` - Historial de viajes (protegido)
- **GET** `/:id` - Obtener detalles de viaje (protegido)
- **PUT** `/:rideId/accept` - Aceptar viaje (protegido)
- **PUT** `/:rideId/complete` - Completar viaje (protegido)
- **PUT** `/:rideId/cancel` - Cancelar viaje (protegido)

### Admin (`/api/admin`)

- **GET** `/users` - Listar usuarios (protegido, admin)
- **GET** `/drivers` - Listar conductores (protegido, admin)
- **GET** `/drivers/pending` - Conductores pendientes (protegido, admin)
- **PUT** `/drivers/:driverId/approve` - Aprobar conductor (protegido, admin)
- **PUT** `/drivers/:driverId/reject` - Rechazar conductor (protegido, admin)
- **GET** `/rides` - Ver todos los viajes (protegido, admin)
- **GET** `/analytics` - Análiticas del sistema (protegido, admin)
- **POST** `/promo-codes` - Crear código promocional (protegido, admin)

## Estructura del Proyecto

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # Configuración de Sequelize
│   ├── models/
│   │   ├── User.js              # Modelo de usuario
│   │   ├── Driver.js            # Modelo de conductor
│   │   └── Ride.js              # Modelo de viaje
│   ├── controllers/
│   │   ├── authController.js    # Lógica de autenticación
│   │   ├── userController.js    # Lógica de usuarios
│   │   ├── rideController.js    # Lógica de viajes
│   │   └── adminController.js   # Lógica de admin
│   ├── middleware/
│   │   └── auth.js              # Middleware de JWT
│   ├── routes/
│   │   ├── auth.js              # Rutas de autenticación
│   │   ├── users.js             # Rutas de usuarios
│   │   ├── rides.js             # Rutas de viajes
│   │   └── admin.js             # Rutas de admin
│   └── server.js                # Servidor principal
├── .env                         # Variables de entorno
├── .gitignore                   # Archivos ignorados por git
├── package.json                 # Dependencias del proyecto
└── README.md                    # Este archivo
```

## Modelos de Base de Datos

### User

- id (UUID, primaryKey)
- name (String)
- email (String, unique)
- phone (String, unique)
- password (String, hashed)
- role (ENUM: 'user', 'driver', 'admin')
- profilePhoto (String)
- rating (Float, 0-5)
- totalTrips (Integer)
- isActive (Boolean)
- isVerified (Boolean)
- lastLogin (DateTime)
- timestamps (createdAt, updatedAt)

### Driver

- id (UUID, primaryKey)
- userId (UUID, foreignKey → User)
- licenseNumber (String, unique)
- licenseExpiry (Date)
- vehicleType (ENUM)
- vehiclePlate (String, unique)
- vehicleYear (Integer)
- vehicleColor (String)
- vehicleModel (String)
- documents (JSON)
- backgroundCheckPassed (Boolean)
- status (ENUM: 'pending', 'approved', 'rejected')
- bankAccount (JSON)
- isAvailable (Boolean)
- totalEarnings (Float)
- totalRides (Integer)
- currentLocation (JSON)
- timestamps

### Ride

- id (UUID, primaryKey)
- passengerId (UUID, foreignKey → User)
- driverId (UUID, foreignKey → User, nullable)
- pickupLocation (JSON)
- dropoffLocation (JSON)
- distance (Float)
- duration (Integer)
- baseFare, farePerKm, farePerMinute (Float)
- totalFare, discountAmount, finalFare (Float)
- status (ENUM: 'requested', 'accepted', 'in_progress', 'completed', 'cancelled')
- paymentStatus (ENUM)
- paymentMethod (ENUM)
- driverRating, driverReview (Integer, Text)
- passengerRating, passengerReview (Integer, Text)
- timestamps

## Seguridad

- **JWT Authentication**: Todos los endpoints protegidos requieren un token JWT válido en el header `Authorization: Bearer <token>`
- **Password Hashing**: Las contraseñas se hashean con bcryptjs (10 salt rounds)
- **CORS**: Configurado para aceptar solicitudes desde el frontend
- **Helmet**: Headers de seguridad HTTP configurados
- **Role-Based Access Control**: Middleware para verificar roles (user, driver, admin)

## Desarrollo

### Crear una migración nueva:

```bash
npm run migrate
```

### Ejecutar pruebas:

```bash
npm test
```

### Linting:

```bash
npm run lint
```

## Variables de Entorno

```
NODE_ENV=development|production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=linea_lila
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
FRONTEND_MOBILE=http://localhost:8081
```

## Notas Importantes

1. Asegúrate de que PostgreSQL esté corriendo antes de iniciar el servidor
2. La base de datos se creará automáticamente en modo desarrollo con `alter: true`
3. Los tokens JWT expiran en 7 días por defecto
4. Las contraseñas deben tener al menos 6 caracteres

## Próximas Mejoras

- [ ] Implementar Socket.io para ubicación en tiempo real
- [ ] Agregar soporte para carga de documentos
- [ ] Integración con pasarela de pagos
- [ ] Sistema de notificaciones push
- [ ] Logging y monitoreo
- [ ] Tests unitarios e integración
- [ ] Documentación Swagger/OpenAPI
