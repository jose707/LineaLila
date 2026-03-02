# 🚗 Integración Completa de Servicio de Viajes (Rides)

## 📋 Resumen Ejecutivo

Este documento describe la integración completa del sistema de viajes (rides) en la aplicación LineaLila, incluyendo tipos, servicios, pantallas y navegación.

## ✅ Estado de Implementación

### Tipos e Interfaces

- ✅ `Ride` - Modelo base de viaje
- ✅ `CreateRideRequest` - Solicitud de creación
- ✅ `AcceptRideRequest` - Solicitud de aceptación
- ✅ `RejectRideRequest` - Solicitud de rechazo
- ✅ `CompleteRideRequest` - Solicitud de completación
- ✅ `CancelRideRequest` - Solicitud de cancelación
- ✅ `RideDetailsResponse` - Detalles completos con info de usuarios
- ✅ `RideRequestsResponse` - Formato de solicitudes disponibles
- ✅ `AvailableDriversResponse` - Conductores disponibles cerca
- ✅ `RideEstimateResponse` - Estimación de tarifa

### Servicio (ridesService)

- ✅ `createRide()` - Crear nueva solicitud de viaje
- ✅ `getRideById()` - Obtener detalles completos del viaje
- ✅ `updateRide()` - Actualizar información del viaje
- ✅ `acceptRide()` - Aceptar viaje (conductor)
- ✅ `rejectRide()` - Rechazar viaje (conductor)
- ✅ `completeRide()` - Finalizar viaje
- ✅ `cancelRide()` - Cancelar viaje
- ✅ `getRideHistory()` - Historial de viajes paginado
- ✅ `getActiveRides()` - Viajes activos
- ✅ `getActiveRide()` - Viaje activo actual del usuario
- ✅ `getRideRequests()` - Solicitudes disponibles para conductor
- ✅ `getAvailableDrivers()` - Conductores cercanos
- ✅ `estimateRideCost()` - Estimar tarifa
- ✅ `submitRating()` - Calificar y reseñar viaje
- ✅ `searchRides()` - Buscar viajes con filtros
- ✅ `getRideStatistics()` - Estadísticas de viajes

### Pantallas

- ✅ **RequestRideScreen** - Solicitar/confirmar viaje
  - Ubicación pickup/dropoff
  - Estimación de tarifa
  - Selección de método de pago
- ✅ **DriverRideRequestScreen** - Aceptar/rechazar viaje (conductor)
  - Info del pasajero
  - Ubicaciones del viaje
  - Botones aceptar/rechazar
- ✅ **ActiveRideScreen** - Viaje en progreso
  - Mapa en tiempo real
  - Info del conductor/pasajero
  - ETA y distancia restante
  - Botón para completar/cancelar
- ✅ **RideCompletedScreen** - Finalización de viaje
  - Detalles del viaje
  - Tarifa final y desglose
  - Calificación y reseña
  - Historial de viajes

### Navegación (AppNavigator.tsx)

- ✅ Rutas integradas en RootStackParamList
- ✅ Parámetros tipados para cada pantalla
- ✅ Animaciones configuradas
- ✅ Flujo de navegación correcto

## 🔄 Flujo de Viajes

### Flujo Cliente → Conductor → Finalización

```
1. SOLICITUD (Cliente)
   MapScreen → RequestRideScreen
   ├─ Cliente ingresa pickup/dropoff
   ├─ Sistema estima tarifa
   └─ Cliente confirma solicitud

2. BÚSQUEDA Y ACEPTACIÓN (Conductor)
   DriverHomeScreen → DriverRideRequestScreen
   ├─ Conductor ve solicitud
   ├─ Acepta o rechaza
   └─ Si acepta → ActiveRideScreen

3. VIAJE EN PROGRESO
   ActiveRideScreen
   ├─ Mapa con ubicación en tiempo real
   ├─ Info del otro usuario
   └─ Opciones para cancelar o reportar

4. FINALIZACIÓN
   ActiveRideScreen → RideCompletedScreen
   ├─ Sistema calcula tarifa final
   ├─ Usuario califica
   └─ Viaje se archiva en historial
```

## 📡 Endpoints API Esperados

```
POST   /rides                      - Crear viaje
GET    /rides/:rideId              - Obtener detalles
PUT    /rides/:rideId              - Actualizar viaje
POST   /rides/:rideId/accept       - Aceptar viaje
POST   /rides/:rideId/reject       - Rechazar viaje
POST   /rides/:rideId/complete     - Completar viaje
POST   /rides/:rideId/cancel       - Cancelar viaje
POST   /rides/:rideId/rating       - Calificar viaje
GET    /rides/active               - Viajes activos
GET    /rides/my-active-ride       - Mi viaje activo
GET    /rides/requests             - Solicitudes disponibles
GET    /rides/estimate             - Estimar tarifa
GET    /rides/search               - Buscar con filtros
GET    /rides/statistics           - Estadísticas
GET    /users/:userId/rides        - Historial de viajes
GET    /drivers/available          - Conductores disponibles
```

## 🎯 Uso del Servicio

### Ejemplo: Crear y Confirmar Viaje

```typescript
import { ridesService } from '../services/rides.service';

// 1. Estimar tarifa
const estimate = await ridesService.estimateRideCost(
  pickupLat,
  pickupLon,
  dropoffLat,
  dropoffLon,
);

// 2. Crear solicitud de viaje
const ride = await ridesService.createRide({
  pickupLocation: {
    latitude: pickupLat,
    longitude: pickupLon,
    address: 'Plaza Murillo, La Paz',
  },
  dropoffLocation: {
    latitude: dropoffLat,
    longitude: dropoffLon,
    address: 'Calle Bolivia, La Paz',
  },
  paymentMethod: 'credit_card',
  fare: estimate.totalFare,
  distance: estimate.distance,
  duration: estimate.duration,
});

// 3. Navegar a viaje activo
navigation.navigate('ActiveRide', { rideId: ride.id });
```

### Ejemplo: Aceptar Viaje (Conductor)

```typescript
import { ridesService } from '../services/rides.service';

// 1. Obtener solicitudes disponibles
const requests = await ridesService.getRideRequests();

// 2. Aceptar solicitud
const acceptedRide = await ridesService.acceptRide(rideId);

// 3. Navegar a viaje activo
navigation.navigate('ActiveRide', { rideId: acceptedRide.id });
```

### Ejemplo: Completar Viaje

```typescript
// 1. Obtener datos finales
const rideDetails = await ridesService.getRideById(rideId);

// 2. Completar viaje
const completedRide = await ridesService.completeRide(rideId, {
  endLocation: {
    latitude: finalLat,
    longitude: finalLon,
    address: 'Final location',
  },
  actualDistance: actualKm,
  actualDuration: actualMinutes,
});

// 3. Calificar
await ridesService.submitRating(rideId, 5, 'Excelente viaje!', [
  { name: 'safety', score: 5 },
  { name: 'cleanliness', score: 4 },
]);

// 4. Navegar a pantalla completada
navigation.navigate('RideCompleted', { rideId });
```

## 🛡️ Manejo de Errores

Todos los métodos del servicio incluyen try-catch con logging:

```typescript
try {
  const ride = await ridesService.getRideById(rideId);
} catch (error) {
  console.error('Error fetching ride:', error);
  // Mostrar alerta al usuario
  Alert.alert('Error', 'No se pudo obtener los detalles del viaje');
}
```

## 📊 Estados del Viaje

```typescript
enum RideStatus {
  PENDING = 'pending', // Esperando aceptación
  ACCEPTED = 'accepted', // Aceptado por conductor
  IN_PROGRESS = 'in_progress', // Viaje en curso
  COMPLETED = 'completed', // Viaje finalizado
  CANCELLED = 'cancelled', // Viaje cancelado
  DISPUTED = 'disputed', // Viaje en disputa
}
```

## 🔐 Seguridad

- ✅ Autenticación requerida (via token)
- ✅ Validación de datos en tipos TypeScript
- ✅ Error handling consistente
- ✅ Logging de operaciones
- ✅ Parámetros tipados en navegación

## 📱 Pantallas Relacionadas

- **MapScreen** - Punto de entrada para cliente
- **SearchScreen** - Selección de destino
- **DriverHomeScreen** - Hub del conductor
- **ClientRideHistoryScreen** - Ver historial
- **ProfileScreen** - Información del usuario

## 🚀 Próximos Pasos

1. Conectar con backend real (reemplazar mockups)
2. Implementar WebSocket para ubicación en tiempo real
3. Agregar notificaciones push
4. Integración con sistema de pagos
5. Implementar chat conductor-pasajero
6. Agregar tracking de viaje en tiempo real

## 📝 Notas de Desarrollo

- Todos los endpoints asumen autenticación Bearer token
- Las respuestas incluyen timestamps en ISO format
- La paginación usa page/limit (1-indexed)
- Las ubicaciones están en formato WGS84 (lat/lon)
- Las distancias están en kilómetros
- Las duraciones están en minutos
