# 🚀 GUÍA RÁPIDA - Sistema de Viajes (Rides)

## ⚡ 5 Minutos para Empezar

### 1️⃣ Importar el Hook

```typescript
import useRides from '../hooks/useRides';
```

### 2️⃣ Usar en tu Pantalla

```typescript
const MyScreen = () => {
  const { createRide, acceptRide, completeRide, isLoading, error } = useRides();

  // Tu código aquí
};
```

### 3️⃣ Operación Básica

```typescript
// Crear viaje
const ride = await createRide({
  pickupLocation: { latitude: -16.5, longitude: -68.1, address: 'Aquí' },
  dropoffLocation: { latitude: -16.4, longitude: -68.1, address: 'Allá' },
  paymentMethod: 'credit_card',
});
```

---

## 📚 Ejemplos Completos

### Cliente - Solicitar Viaje

```typescript
import React, { useState } from 'react';
import { View, Button, Text, ActivityIndicator } from 'react-native';
import useRides from '../hooks/useRides';
import { isValidCreateRideRequest } from '../utils/rideValidation';

export const RequestRideExample = ({ navigation }) => {
  const { createRide, isLoading, error } = useRides();
  const [pickup] = useState({
    latitude: -16.5,
    longitude: -68.1,
    address: 'Plaza Murillo, La Paz',
  });
  const [dropoff] = useState({
    latitude: -16.4,
    longitude: -68.1,
    address: 'Calle Bolivia, La Paz',
  });

  const handleRequest = async () => {
    const rideData = {
      pickupLocation: pickup,
      dropoffLocation: dropoff,
      paymentMethod: 'credit_card',
    };

    if (isValidCreateRideRequest(rideData)) {
      const ride = await createRide(rideData);
      if (ride) {
        navigation.navigate('ActiveRide', { rideId: ride.id });
      }
    }
  };

  return (
    <View>
      {isLoading && <ActivityIndicator size="large" />}
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      <Button
        title="Request Ride"
        onPress={handleRequest}
        disabled={isLoading}
      />
    </View>
  );
};
```

### Conductor - Aceptar Viaje

```typescript
import React, { useEffect, useState } from 'react';
import { View, Button, Text, FlatList } from 'react-native';
import useRides from '../hooks/useRides';

export const AcceptRideExample = ({ navigation }) => {
  const { getRideRequests, acceptRide, rideRequests, isLoading } = useRides();

  useEffect(() => {
    getRideRequests();
  }, []);

  const handleAccept = async rideId => {
    const ride = await acceptRide(rideId);
    if (ride) {
      navigation.navigate('ActiveRide', { rideId });
    }
  };

  return (
    <View>
      <FlatList
        data={rideRequests}
        keyExtractor={item => item.rideId}
        renderItem={({ item }) => (
          <View>
            <Text>{item.passengerName}</Text>
            <Text>{item.pickupLocation.address}</Text>
            <Text>${item.fare}</Text>
            <Button
              title="Accept"
              onPress={() => handleAccept(item.rideId)}
              disabled={isLoading}
            />
          </View>
        )}
      />
    </View>
  );
};
```

### Completar Viaje

```typescript
import useRides from '../hooks/useRides';

export const CompleteRideExample = () => {
  const { completeRide, isLoading } = useRides();

  const handleComplete = async rideId => {
    const completed = await completeRide(rideId, {
      endLocation: {
        latitude: -16.4,
        longitude: -68.1,
        address: 'Final destination',
      },
      actualDistance: 5.2,
      actualDuration: 18,
    });

    if (completed) {
      // Ir a pantalla de calificación
    }
  };

  return (
    <Button title="Complete Ride" onPress={() => handleComplete('ride_123')} />
  );
};
```

### Calificar Viaje

```typescript
import useRides from '../hooks/useRides';

export const RateRideExample = () => {
  const { submitRating, isLoading } = useRides();

  const handleRate = async () => {
    const success = await submitRating('ride_123', 5, 'Excelente viaje!', [
      { name: 'safety', score: 5 },
      { name: 'cleanliness', score: 4 },
      { name: 'driving', score: 5 },
    ]);

    if (success) {
      // Volver a home
    }
  };

  return <Button title="Rate" onPress={handleRate} disabled={isLoading} />;
};
```

### Estimar Tarifa

```typescript
import useRides from '../hooks/useRides';
import { formatFare } from '../utils/rideValidation';

export const EstimateExample = () => {
  const { estimateCost, estimate, isLoading } = useRides();

  const handleEstimate = async () => {
    const est = await estimateCost(-16.5, -68.1, -16.4, -68.1);
    if (est) {
      console.log('Distance:', est.distance, 'km');
      console.log('Fare:', formatFare(est.totalFare));
    }
  };

  return (
    <View>
      <Button title="Estimate Fare" onPress={handleEstimate} />
      {estimate && <Text>{formatFare(estimate.totalFare)}</Text>}
    </View>
  );
};
```

---

## 🔍 Funciones Útiles

### Validar Datos

```typescript
import {
  isValidLocation,
  isValidCreateRideRequest,
  isValidRating,
} from '../utils/rideValidation';

// Validar ubicación
if (isValidLocation(location)) {
  // Ubicación válida
}

// Validar solicitud completa
if (isValidCreateRideRequest(rideData)) {
  // Datos completos y válidos
}

// Validar calificación
if (isValidRating(5)) {
  // Puntuación válida
}
```

### Formatear Datos

```typescript
import {
  formatDistance,
  formatDuration,
  formatFare,
  getRideStatusLabel,
  getRideStatusColor,
} from '../utils/rideValidation';

const distance = formatDistance(5.5); // "5.5 km"
const duration = formatDuration(15); // "15 min"
const fare = formatFare(50, 'BOB'); // "50.00 BOB"
const status = getRideStatusLabel('accepted'); // "Aceptado"
const color = getRideStatusColor('in_progress'); // "#1E90FF"
```

### Validar Operaciones

```typescript
import {
  canAcceptRide,
  canCompleteRide,
  canCancelRide,
  getRideSafetyInfo,
} from '../utils/rideValidation';

if (canAcceptRide(ride)) {
  // Mostrar botón aceptar
}

if (canCompleteRide(ride)) {
  // Mostrar botón completar
}

const { isSafe } = getRideSafetyInfo(ride);
if (isSafe) {
  // Mostrar icono de seguridad
}
```

---

## 🐛 Depuración

### Ver Estado Actual

```typescript
const useRidesDebug = () => {
  const rides = useRides();

  useEffect(() => {
    console.log('Rides State:', {
      ride: rides.ride,
      activeRide: rides.activeRide,
      isLoading: rides.isLoading,
      error: rides.error,
    });
  }, [rides.ride, rides.activeRide, rides.isLoading, rides.error]);
};
```

### Manejar Errores

```typescript
const MyScreen = () => {
  const { createRide, error, clearErrors } = useRides();

  useEffect(() => {
    if (error) {
      console.error('Error:', error);
      // Mostrar Alert al usuario
    }
  }, [error]);

  const handleClear = () => {
    clearErrors();
  };

  return <Button title="Clear Errors" onPress={handleClear} />;
};
```

---

## 📋 Checklist de Implementación

- [ ] Importar `useRides` en pantalla
- [ ] Obtener métodos y estado del hook
- [ ] Validar datos antes de enviar
- [ ] Manejar `isLoading` para botones
- [ ] Mostrar `error` si existe
- [ ] Navegar a pantalla siguiente
- [ ] Limpiar estado cuando sea necesario

---

## 🆘 Preguntas Frecuentes

### ¿Qué pasa si falla la solicitud?

```typescript
const ride = await createRide(data);
if (!ride) {
  // El error está en state.error
  // Se mostró un Alert automáticamente
}
```

### ¿Cómo obtengo los detalles del viaje actual?

```typescript
const { activeRide, getRideById } = useRides();

// Opción 1: Usar activeRide directamente
console.log(activeRide);

// Opción 2: Obtener detalles completos
const details = await getRideById(rideId);
```

### ¿Cómo sé si puedo aceptar un viaje?

```typescript
import { canAcceptRide } from '../utils/rideValidation';

if (canAcceptRide(ride)) {
  // Mostrar botón de aceptar
}
```

### ¿Cómo calculo la tarifa?

```typescript
import { calculateEstimatedFare } from '../utils/rideValidation';

const fare = calculateEstimatedFare(5, 15); // 5 km, 15 minutos
// Retorna tarifa estimada
```

---

## 📞 Documentación Completa

Para más detalles, ver:

- `RIDES_INTEGRATION.md` - Documentación técnica completa
- `RIDES_SUMMARY.md` - Resumen de implementación
- `src/hooks/useRides.ts` - Código del hook
- `src/services/rides.service.ts` - Métodos del servicio

---

**Versión:** 1.0  
**Última actualización:** 9 de Febrero, 2026
