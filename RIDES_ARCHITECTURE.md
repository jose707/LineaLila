# 🏗️ ARQUITECTURA - Sistema de Viajes (Rides)

## 📊 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                     PANTALLAS (Screens)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐    ┌──────────────────────┐       │
│  │ RequestRideScreen   │    │ DriverRideRequest... │       │
│  │ (Cliente solicita)  │    │ (Conductor acepta)   │       │
│  └──────────┬──────────┘    └──────────┬───────────┘       │
│             │                          │                   │
│  ┌──────────▼──────────────────────────▼────────┐         │
│  │     ActiveRideScreen                         │         │
│  │     (Viaje en progreso)                      │         │
│  └──────────┬──────────────────────────────────┘          │
│             │                                              │
│  ┌──────────▼──────────────────────────────────┐         │
│  │   RideCompletedScreen                       │         │
│  │   (Finalización y calificación)             │         │
│  └──────────────────────────────────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ useRides()
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        HOOK: useRides                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Estado:                    Acciones:                      │
│  ├─ ride                    ├─ createRide()                │
│  ├─ rideDetails             ├─ getRideById()               │
│  ├─ activeRide              ├─ acceptRide()                │
│  ├─ rideRequests            ├─ rejectRide()                │
│  ├─ rideHistory             ├─ completeRide()              │
│  ├─ estimate                ├─ cancelRide()                │
│  ├─ isLoading               ├─ getRideRequests()           │
│  ├─ error                   ├─ estimateCost()              │
│  └─ isError                 ├─ submitRating()              │
│                             └─ más...                      │
│                                                             │
└──────────────┬───────────────────────────────────┬─────────┘
               │                                   │
               │                                   │ rideValidation
               ▼                                   ▼
┌──────────────────────────────┐  ┌──────────────────────────┐
│   SERVICIO: ridesService     │  │  UTILIDADES:              │
├──────────────────────────────┤  │  rideValidation          │
│                              │  ├──────────────────────────┤
│ createRide()                 │  │                          │
│ getRideById()                │  │ Validación:              │
│ updateRide()                 │  │ ├─ isValidLocation()     │
│ acceptRide()                 │  │ ├─ isValidRating()       │
│ rejectRide()                 │  │ └─ más...                │
│ completeRide()               │  │                          │
│ cancelRide()                 │  │ Cálculo:                 │
│ getRideHistory()             │  │ ├─ calculateDistance()   │
│ getActiveRides()             │  │ ├─ calculateFare()       │
│ getActiveRide()              │  │ └─ más...                │
│ getRideRequests()            │  │                          │
│ getAvailableDrivers()        │  │ Formato:                 │
│ estimateRideCost()           │  │ ├─ formatDistance()      │
│ submitRating()               │  │ ├─ formatFare()          │
│ searchRides()                │  │ └─ más...                │
│ getRideStatistics()          │  │                          │
│                              │  │                          │
└──────────────┬───────────────┘  └────────────┬─────────────┘
               │                               │
               └───────────────┬───────────────┘
                               │
                               ▼
                   ┌──────────────────────────┐
                   │   API CLIENT             │
                   │   (api.client.ts)        │
                   └──────────────┬───────────┘
                                  │
                                  ▼
                   ┌──────────────────────────┐
                   │   BACKEND API            │
                   │   (Servidor)             │
                   └──────────────────────────┘
```

---

## 🔄 Flujo de Datos - Cliente Solicita Viaje

```
┌─────────────────────────────────────────┐
│  RequestRideScreen                      │
│  Usuario ingresa ubicaciones            │
└────────┬────────────────────────────────┘
         │
         ▼ click Request Ride
┌─────────────────────────────────────────┐
│  useRides.createRide(data)              │
│  ├─ Valida datos                        │
│  └─ Llama al servicio                   │
└────────┬────────────────────────────────┘
         │
         ▼ ridesService.createRide(data)
┌─────────────────────────────────────────┐
│  API POST /rides                        │
│  ├─ Crea viaje en BD                    │
│  └─ Retorna Ride con ID                 │
└────────┬────────────────────────────────┘
         │
         ▼ Viaje creado
┌─────────────────────────────────────────┐
│  Hook actualiza estado                  │
│  ride = viaje creado                    │
└────────┬────────────────────────────────┘
         │
         ▼ Navegar a ActiveRide
┌─────────────────────────────────────────┐
│  ActiveRideScreen                       │
│  Espera aceptación del conductor        │
└─────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos - Conductor Acepta Viaje

```
┌──────────────────────────────────────────┐
│  DriverRideRequestScreen                 │
│  ├─ Carga solicitudes disponibles        │
│  └─ Muestra detalles del viaje           │
└────────┬─────────────────────────────────┘
         │
         ▼ click Accept
┌──────────────────────────────────────────┐
│  useRides.acceptRide(rideId)             │
│  ├─ Valida que puede aceptar             │
│  └─ Llama al servicio                    │
└────────┬─────────────────────────────────┘
         │
         ▼ ridesService.acceptRide(rideId)
┌──────────────────────────────────────────┐
│  API POST /rides/:id/accept              │
│  ├─ Asigna conductor al viaje            │
│  ├─ Actualiza estado a 'accepted'        │
│  └─ Retorna Ride actualizado             │
└────────┬─────────────────────────────────┘
         │
         ▼ Viaje aceptado
┌──────────────────────────────────────────┐
│  Hook actualiza estado                   │
│  activeRide = viaje aceptado             │
└────────┬─────────────────────────────────┘
         │
         ▼ Navegar a ActiveRide
┌──────────────────────────────────────────┐
│  ActiveRideScreen                        │
│  Conductor y cliente ven progreso        │
└──────────────────────────────────────────┘
```

---

## 🏛️ Capas de la Arquitectura

### Capa 1: Presentación (UI)

```
├─ RequestRideScreen
├─ DriverRideRequestScreen
├─ ActiveRideScreen
└─ RideCompletedScreen
```

### Capa 2: Lógica de Negocio

```
└─ useRides Hook
   ├─ Maneja estado
   ├─ Controla flujos
   └─ Integra servicio
```

### Capa 3: Servicios

```
├─ ridesService
│  └─ 16 métodos API
└─ Utilidades
   ├─ rideValidation
   └─ Formatos
```

### Capa 4: API/Red

```
└─ api.client.ts
   ├─ Autenticación
   ├─ Error handling
   └─ Interceptores
```

### Capa 5: Backend

```
└─ Servidor
   ├─ Base de datos
   ├─ Lógica negocio
   └─ Persistencia
```

---

## 📦 Tipos de Datos

### Entrada (Request)

```
CreateRideRequest
├─ pickupLocation
├─ dropoffLocation
├─ paymentMethod
└─ notas

AcceptRideRequest
└─ rideId

CompleteRideRequest
├─ endLocation
├─ actualDistance
└─ actualDuration
```

### Salida (Response)

```
Ride
├─ id
├─ userId
├─ driverId
├─ status (pending/accepted/in_progress/completed/cancelled)
├─ fare
├─ distance
├─ duration
└─ timestamps

RideDetailsResponse (extends Ride)
├─ driverDetails
├─ passengerDetails
├─ estimatedArrival
└─ paymentDetails
```

---

## 🔐 Seguridad & Validación

```
┌─────────────────────────────┐
│  Datos Usuario              │
└────────┬────────────────────┘
         │
         ▼ Validación Local
    ┌─────────────────┐
    │ isValidLocation │
    │ isValidRating   │
    └────────┬────────┘
             │ ✓ Ok
             ▼
    ┌─────────────────┐
    │ Hook (useRides) │ Manejo de errores
    └────────┬────────┘
             │
             ▼ Envía a servidor
    ┌──────────────────┐
    │ API con JWT      │ Autenticación
    └────────┬─────────┘
             │
             ▼ Servidor
    ┌──────────────────┐
    │ Validación BD    │ Integridad datos
    └────────┬─────────┘
             │
             ▼ Respuesta segura
    ┌──────────────────┐
    │ Datos validados  │
    └──────────────────┘
```

---

## 🔀 Estados del Viaje

```
                    ┌─────────┐
                    │ PENDING │
                    └────┬────┘
                         │
                    ┌────▼────────┐
                    │   REJECTED  │
                    └─────────────┘

                    ┌────▼──────────┐
                    │   ACCEPTED    │
                    └────┬──────────┘
                         │
                    ┌────▼──────────┐
                    │  IN_PROGRESS  │
                    └────┬──────────┘
                         │
                    ┌────▼──────────┐
                    │  COMPLETED    │
                    └───────────────┘

        ┌─────────────────────────────────┐
        │ CANCELLED (desde cualquier estado)│
        └─────────────────────────────────┘

        ┌─────────────────────────────────┐
        │ DISPUTED (desde cualquier estado)│
        └─────────────────────────────────┘
```

---

## 🎯 Responsabilidades por Componente

### RequestRideScreen

- ✓ Captar entrada del usuario
- ✓ Validar ubicaciones
- ✓ Llamar a createRide()
- ✓ Navegar al siguiente paso

### useRides Hook

- ✓ Mantener estado de viaje
- ✓ Manejar promesas del servicio
- ✓ Actualizar UI automáticamente
- ✓ Mostrar errores

### ridesService

- ✓ Comunicar con API
- ✓ Aplicar lógica de petición
- ✓ Manejar respuestas
- ✓ Log de operaciones

### rideValidation

- ✓ Validar datos
- ✓ Calcular valores
- ✓ Formatear para mostrar
- ✓ Evaluar reglas de negocio

---

## 📈 Expansión Futura

```
Fase 1: ✅ Sistema básico (COMPLETADO)
├─ Solicitud de viaje
├─ Aceptación
├─ Viaje activo
└─ Finalización

Fase 2: WebSocket (PRÓXIMA)
├─ Ubicación en tiempo real
├─ Actualizaciones en vivo
└─ Chat conductor-pasajero

Fase 3: Notificaciones (PRÓXIMA)
├─ Push notifications
├─ Alertas de estado
└─ Recordatorios

Fase 4: Pagos (PRÓXIMA)
├─ Integración Stripe
├─ Wallet digital
└─ Historial transacciones
```

---

## 🧪 Testing (Recomendado)

```
└─ Tests para ridesService
   ├─ createRide
   ├─ acceptRide
   ├─ completeRide
   └─ error handling

└─ Tests para useRides Hook
   ├─ Estado inicial
   ├─ Actualización de estado
   └─ Error handling

└─ Tests para validaciones
   ├─ isValidLocation
   ├─ calculateDistance
   └─ formatFare
```

---

**Versión:** 1.0  
**Última actualización:** 9 de Febrero, 2026
