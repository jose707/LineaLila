# 🏗️ Estructura de la Implementación

## Árbol de Cambios

```
LineaLila/
├── src/
│   ├── services/
│   │   ├── api.client.ts                    [EXISTENTE - No modificado]
│   │   ├── auth.service.ts                  [EXISTENTE - No modificado]
│   │   └── admin.service.ts                 [✨ NUEVO - Servicio de Admin]
│   │
│   └── screens/
│       ├── AdminAnalyticsScreen.tsx         [EXISTENTE - No modificado]
│       ├── AdminDashboardScreen.tsx         [EXISTENTE - No modificado]
│       ├── AdminDriverRegistrationScreen.tsx [📝 MODIFICADO - API Integration]
│       ├── AdminPaymentsScreen.tsx          [EXISTENTE - No modificado]
│       ├── AdminPromoScreen.tsx             [EXISTENTE - No modificado]
│       ├── AdminRidesScreen.tsx             [EXISTENTE - No modificado]
│       ├── AdminSupportScreen.tsx           [EXISTENTE - No modificado]
│       └── AdminUsersScreen.tsx             [EXISTENTE - No modificado]
│
├── backend/
│   └── src/
│       ├── controllers/
│       │   └── adminController.js           [EXISTENTE - Endpoints ya implementados]
│       │
│       ├── models/
│       │   └── Driver.js                    [EXISTENTE - Modelo correcto]
│       │
│       └── routes/
│           └── admin.js                     [EXISTENTE - Rutas correctas]
│
├── DRIVER_APPROVAL_INTEGRATION.md           [📄 DOCUMENTACIÓN TÉCNICA]
├── TESTING_GUIDE.md                          [📄 GUÍA DE PRUEBAS]
├── IMPLEMENTATION_SUMMARY.md                 [📄 RESUMEN EJECUTIVO]
├── API_REFERENCE.md                          [📄 REFERENCIA DE API]
└── README.md                                 [EXISTENTE - No modificado]
```

---

## Flujo de Componentes

```
┌──────────────────────────────────────────────────────────────────┐
│                    AdminDashboard Screen                         │
└──────────────────────────────────────────────────────────────────┘
                            ↓
                 [Navigation → Driver Registration]
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│          AdminDriverRegistrationScreen (React Component)          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  States:                                                         │
│  • applications[]                 ← Datos de conductores         │
│  • selectedApplication            ← Conductor seleccionado      │
│  • modalVisible                   ← Mostrar/ocultar modal       │
│  • isLoading                      ← Cargando datos del servidor  │
│  • isSubmitting                   ← Procesando acción            │
│  • error                          ← Mensaje de error             │
│                                                                   │
│  Effects:                                                        │
│  • useEffect() → loadDriverApplications()                        │
│    └─ Carga inicial de solicitudes pendientes                    │
│                                                                   │
│  Handlers:                                                       │
│  • handleApproveDriver()  → AdminService.approveDriver()        │
│  • handleRejectDriver()   → AdminService.rejectDriver()         │
│                                                                   │
│  Render:                                                         │
│  • Header con título y botones                                   │
│  • Stats (Pending, Approved, Rejected)                          │
│  • SearchBar para buscar                                         │
│  • FilterButtons (All, Pending, Approved, Rejected)             │
│  • ApplicationCard List (resultado de búsqueda/filtro)          │
│  • DetailsModal (información detallada + botones de acción)     │
│  • RejectionModal (campo para motivo de rechazo)                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                            ↓
                 [Usuarios: AdminService]
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│               admin.service.ts (API Service Layer)                │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Funciones Exportadas:                                           │
│  • getPendingDriverRequests()     → GET /admin/drivers/pending  │
│  • getAllDrivers()                 → GET /admin/drivers         │
│  • getDriverById()                 → GET /admin/drivers/{id}    │
│  • approveDriver()                 → PUT /admin/drivers/{id}/approve
│  • rejectDriver()                  → PUT /admin/drivers/{id}/reject
│                                                                   │
│  Características:                                                │
│  • Usa api.client para comunicación HTTP                         │
│  • Manejo automático de token JWT                               │
│  • Transformación de errores                                     │
│  • Tipado TypeScript completo                                    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                            ↓
                    [Usa: api.client]
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│              api.client.ts (HTTP Client Layer)                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Implementación:                                                 │
│  • Clase ApiClient personalizada                                 │
│  • Usa Fetch API (no requiere axios)                             │
│  • Manejo automático de Token JWT                               │
│  • Timeout configurable                                         │
│  • Refresh token automático (401)                               │
│                                                                   │
│  Métodos:                                                        │
│  • get(url, options)                                             │
│  • post(url, data, options)                                      │
│  • put(url, data, options)                                       │
│  • delete(url, options)                                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                            ↓
            [Hace request HTTP con Fetch API]
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│                   Backend (Node.js/Express)                       │
│                  http://192.168.100.133:3000                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Rutas (backend/src/routes/admin.js):                           │
│  • GET    /api/admin/drivers/pending      ← adminController     │
│  • GET    /api/admin/drivers              ← adminController     │
│  • GET    /api/admin/drivers/:id          ← adminController     │
│  • PUT    /api/admin/drivers/:id/approve  ← adminController     │
│  • PUT    /api/admin/drivers/:id/reject   ← adminController     │
│                                                                   │
│  Middlewares:                                                    │
│  • authMiddleware       (Valida token JWT)                      │
│  • adminMiddleware      (Valida rol admin)                      │
│                                                                   │
│  Controladores (backend/src/controllers/adminController.js):    │
│  • getPendingDriverRequests()  → Query BD                        │
│  • getAllDrivers()             → Query BD                        │
│  • approveDriver()             → Update BD                       │
│  • rejectDriver()              → Update BD                       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                            ↓
            [Consulta/Actualiza Base de Datos]
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│               PostgreSQL Database                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Tabla: drivers                                                  │
│  ┌──────────────┬──────────────────────────────────────┐        │
│  │ Columna      │ Descripción                          │        │
│  ├──────────────┼──────────────────────────────────────┤        │
│  │ id (PK)      │ UUID único del conductor             │        │
│  │ userId (FK)  │ Referencia a tabla users             │        │
│  │ status       │ ENUM: pending|approved|rejected      │        │
│  │ licenseNumber│ Número de licencia único             │        │
│  │ vehicleType  │ ENUM: sedan|suv|van|motorcycle       │        │
│  │ vehiclePlate │ Placa del vehículo (única)           │        │
│  │ ... (otros)  │ ...                                  │        │
│  └──────────────┴──────────────────────────────────────┘        │
│                                                                   │
│  Tabla: users                                                    │
│  ┌──────────────┬──────────────────────────────────────┐        │
│  │ Columna      │ Descripción                          │        │
│  ├──────────────┼──────────────────────────────────────┤        │
│  │ id (PK)      │ UUID único del usuario               │        │
│  │ email        │ Email del usuario                    │        │
│  │ role         │ ENUM: admin|driver|passenger|...     │        │
│  │ ... (otros)  │ ...                                  │        │
│  └──────────────┴──────────────────────────────────────┘        │
│                                                                   │
│  Query ejemplo:                                                  │
│  SELECT d.*, u.name, u.email FROM drivers d                    │
│  JOIN users u ON d.userId = u.id                               │
│  WHERE d.status = 'pending'                                     │
│  ORDER BY d.createdAt ASC                                       │
│  LIMIT 20 OFFSET 0;                                             │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Flujo de Datos Completo

### 1️⃣ Cargar Solicitudes (al montar componente)

```
┌─────────────────────────────────────────────────────────────────┐
│ AdminDriverRegistrationScreen monta                             │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ useEffect(() => {                                               │
│   loadDriverApplications()                                       │
│ }, [])                                                           │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ setIsLoading(true)                                              │
│ setError(null)                                                   │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ await AdminService.getPendingDriverRequests(50, 0)             │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ api.get('/admin/drivers/pending', { params })                  │
│ → Fetch: GET /api/admin/drivers/pending                        │
│ → Header: Authorization: Bearer {token}                         │
└─────────────────────────────────────────────────────────────────┘
         ↓ [Backend]
┌─────────────────────────────────────────────────────────────────┐
│ adminController.getPendingDriverRequests()                      │
│ → Driver.findAll({ where: { status: 'pending' } })            │
└─────────────────────────────────────────────────────────────────┘
         ↓ [Database]
┌─────────────────────────────────────────────────────────────────┐
│ SELECT * FROM drivers WHERE status = 'pending'                  │
│ LIMIT 50 OFFSET 0                                               │
└─────────────────────────────────────────────────────────────────┘
         ↓ [Response]
┌─────────────────────────────────────────────────────────────────┐
│ {                                                                │
│   "drivers": [...5 conductores...],                            │
│   "total": 5,                                                    │
│   "limit": 50,                                                   │
│   "offset": 0                                                    │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ setApplications(response.data)                                   │
│ setIsLoading(false)                                             │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Render lista de solicitudes                                     │
│ • Cards con información de conductores                          │
│ • Status badge (Pending/Approved/Rejected)                     │
│ • Verificación checks (Documents/Background)                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2️⃣ Aprobar Conductor

```
┌─────────────────────────────────────────────────────────────────┐
│ Usuario hace clic en conductor pendiente                        │
│ → setSelectedApplication(app)                                    │
│ → setModalVisible(true)                                          │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Modal abre mostrando detalles del conductor                    │
│ • Información personal, licencia, vehículo                      │
│ • Status: ⏳ Pending Review                                     │
│ • Botones: ✓ Approve Driver | ✕ Reject Driver               │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Usuario hace clic en "✓ Approve Driver"                        │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ handleApproveDriver()                                            │
│ setIsSubmitting(true)                                            │
│ Botón muestra: <ActivityIndicator />                            │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ await AdminService.approveDriver(selectedApplication.id)        │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ api.put(`/admin/drivers/${id}/approve`, {})                    │
│ → Fetch: PUT /api/admin/drivers/{id}/approve                  │
│ → Header: Authorization: Bearer {token}                         │
│ → Body: {} (vacío)                                              │
└─────────────────────────────────────────────────────────────────┘
         ↓ [Backend]
┌─────────────────────────────────────────────────────────────────┐
│ adminController.approveDriver(req, res)                         │
│                                                                  │
│ driver = await Driver.findByPk(driverId)                       │
│ await driver.update({                                            │
│   status: 'approved',                                           │
│   backgroundCheckPassed: true                                   │
│ })                                                               │
│                                                                  │
│ user = await User.findByPk(driver.userId)                      │
│ await user.update({ role: 'driver' })                          │
└─────────────────────────────────────────────────────────────────┘
         ↓ [Database]
┌─────────────────────────────────────────────────────────────────┐
│ UPDATE drivers SET status='approved',                            │
│   backgroundCheckPassed=true                                    │
│ WHERE id = 'driver-id'                                          │
│                                                                  │
│ UPDATE users SET role='driver'                                   │
│ WHERE id = 'user-id'                                            │
└─────────────────────────────────────────────────────────────────┘
         ↓ [Response]
┌─────────────────────────────────────────────────────────────────┐
│ {                                                                │
│   "message": "Conductor aprobado exitosamente",                │
│   "driver": {                                                    │
│     "id": "driver-id",                                           │
│     "status": "approved",                                        │
│     "backgroundCheckPassed": true,                              │
│     ...                                                          │
│   }                                                              │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Frontend recibe respuesta                                       │
│ → setIsSubmitting(false)                                        │
│ → Actualizar estado local:                                      │
│   setApplications(                                               │
│     applications.map(app =>                                     │
│       app.id === id ? {...app, status: 'approved'} : app       │
│     )                                                            │
│   )                                                              │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Alert.alert(                                                     │
│   "Success",                                                     │
│   "Sofía Martínez has been approved as a driver!"             │
│ )                                                                │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ setModalVisible(false)                                           │
│ setSelectedApplication(null)                                    │
│ Modal se cierra                                                  │
└─────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Render lista actualizada                                        │
│ • Conductor desaparece de "Pending"                             │
│ • Aparece en "Approved" si es filtrado                          │
│ • Contador de "Approved" aumenta en 1                           │
│ • Conductor de "Pending" disminuye en 1                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquitectura de Capas

```
┌─────────────────────────────────────────┐
│   Frontend (React Native)                 │
│   AdminDriverRegistrationScreen.tsx      │
├─────────────────────────────────────────┤
│   Component Logic:                       │
│   • State Management                     │
│   • Event Handlers                       │
│   • Conditional Rendering                │
│   • Form Validation                      │
└─────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│   Service Layer                          │
│   admin.service.ts                       │
├─────────────────────────────────────────┤
│   API Methods:                           │
│   • getPendingDriverRequests()           │
│   • approveDriver()                      │
│   • rejectDriver()                       │
│   • Error Handling                       │
│   • Data Transformation                  │
└─────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│   HTTP Client Layer                      │
│   api.client.ts                          │
├─────────────────────────────────────────┤
│   Fetch API Wrapper:                     │
│   • HTTP Methods (GET, PUT, POST)        │
│   • Token Management                     │
│   • Error Handling                       │
│   • Timeout Management                   │
│   • Refresh Token Logic                  │
└─────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│   Backend (Node.js/Express)              │
│   http://192.168.100.133:3000/api       │
├─────────────────────────────────────────┤
│   Routing Layer:                         │
│   admin.js routes                        │
│   • Endpoint Definitions                 │
│   • Middleware Stack                     │
│   • Route Protection                     │
└─────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│   Controller Layer                       │
│   adminController.js                     │
├─────────────────────────────────────────┤
│   Business Logic:                        │
│   • Request Validation                   │
│   • Data Processing                      │
│   • Database Operations                  │
│   • Response Formatting                  │
└─────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│   Model/ORM Layer                        │
│   Sequelize Models                       │
├─────────────────────────────────────────┤
│   • Driver.js                            │
│   • User.js                              │
│   • Query Building                       │
│   • Data Validation                      │
└─────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│   Database Layer                         │
│   PostgreSQL                             │
├─────────────────────────────────────────┤
│   Tables:                                │
│   • drivers                              │
│   • users                                │
│   • Data Persistence                     │
│   • Transactions                         │
└─────────────────────────────────────────┘
```

---

## Dependencias

### Frontend

- `react-native` - Framework principal
- `@react-navigation/native-stack` - Navegación
- `react-native-mmkv` - Almacenamiento local

### Backend

- `express` - Framework web
- `sequelize` - ORM
- `pg` - Driver PostgreSQL
- `jsonwebtoken` - JWT

### No requiere dependencias nuevas

- ✅ Usa Fetch API (built-in)
- ✅ No requiere axios
- ✅ Compatible con arquitectura existente

---

**Diagrama creado:** 26 Enero, 2026
