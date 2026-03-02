# Driver Approval System Integration

## Overview

Se ha completado la integración completa del sistema de aprobación de solicitudes de conductores en la pantalla de admin. El sistema ahora se comunica correctamente con el backend.

---

## ✅ Cambios Implementados

### 1. **Nuevo Servicio: `admin.service.ts`**

Ubicación: `src/services/admin.service.ts`

**Funcionalidades:**

- `getPendingDriverRequests()` - Obtiene solicitudes pendientes
- `getAllDrivers()` - Obtiene todos los conductores con filtros
- `getDriverById()` - Obtiene detalles de un conductor específico
- `approveDriver()` - Aprueba una solicitud de conductor
- `rejectDriver()` - Rechaza una solicitud con motivo

**Características:**

- Autenticación con token JWT
- Manejo de errores robusto
- Soporte para almacenamiento con MMKV y AsyncStorage

### 2. **Actualización: `AdminDriverRegistrationScreen.tsx`**

Se han agregado:

**Estados nuevos:**

- `isLoading` - Indica cuando se cargan datos
- `isSubmitting` - Indica cuando se está procesando una acción
- `error` - Almacena mensajes de error

**Métodos actualizados:**

- `handleApproveDriver()` - Ahora llama a la API
- `handleRejectDriver()` - Ahora llama a la API con motivo

**Efecto useEffect:**

- `loadDriverApplications()` - Carga datos del backend al montar el componente

**UI Mejorada:**

- Indicador de carga mientras se obtienen datos
- Banner de error si algo falla
- Botones deshabilitados durante el procesamiento
- Indicador de carga en botones de acción

### 3. **Backend Endpoints Verificados**

Los siguientes endpoints ya están implementados en `backend/src/controllers/adminController.js`:

```
GET    /api/admin/drivers/pending      - Obtener solicitudes pendientes
GET    /api/admin/drivers              - Obtener todos los conductores
PUT    /api/admin/drivers/:driverId/approve  - Aprobar conductor
PUT    /api/admin/drivers/:driverId/reject   - Rechazar conductor
```

---

## 📋 Flujo de Aprobación/Rechazo

### Aprobar un Conductor:

1. Admin hace clic en una solicitud pendiente
2. Se abre modal con detalles completos
3. Admin hace clic en "✓ Approve Driver"
4. Se envía `PUT /api/admin/drivers/{id}/approve`
5. Estado local se actualiza a "approved"
6. Se muestra confirmación
7. Modal se cierra

### Rechazar un Conductor:

1. Admin hace clic en una solicitud pendiente
2. Se abre modal con detalles completos
3. Admin hace clic en "✕ Reject Driver"
4. Se abre modal para ingresar motivo
5. Admin ingresa motivo y hace clic en "Reject"
6. Se envía `PUT /api/admin/drivers/{id}/reject` con motivo
7. Estado local se actualiza a "rejected"
8. Se muestra confirmación
9. Modales se cierran

---

## 🔧 Configuración Requerida

### Variables de Entorno

En `src/services/admin.service.ts`:

```typescript
const API_BASE_URL = 'http://192.168.100.133:3000/api';
```

Asegurar que:

- Backend está corriendo en el puerto especificado
- Admin tiene token de autenticación válido

### Permisos

El usuario debe tener:

- Rol: `admin`
- Middleware `adminMiddleware` debe validar en backend

---

## 🧪 Prueba de la Integración

### Caso de Prueba 1: Cargar Solicitudes

```bash
# El componente debe cargar automáticamente las solicitudes pendientes
# Si falla, muestra: "Using demo data - Backend unavailable"
```

### Caso de Prueba 2: Aprobar Conductor

1. Abrir pantalla "Driver Registration"
2. Hacer clic en conductor con estado "Pending"
3. Hacer clic en "✓ Approve Driver"
4. Verificar que:
   - Botón muestra loading spinner
   - Backend recibe la solicitud
   - Conductor cambia a "Approved"

### Caso de Prueba 3: Rechazar Conductor

1. Abrir pantalla "Driver Registration"
2. Hacer clic en conductor con estado "Pending"
3. Hacer clic en "✕ Reject Driver"
4. Ingresar motivo: "Documentation incomplete"
5. Hacer clic en "Reject"
6. Verificar que:
   - Motivo se guardó
   - Estado cambió a "Rejected"
   - Motivo es visible en detalles

---

## 🐛 Manejo de Errores

Si ocurre un error durante aprobación/rechazo:

1. Se muestra `Alert` con mensaje de error
2. El estado local se mantiene sin cambios
3. Usuario puede reintentar

Errores comunes:

- **"Backend unavailable"** - El servidor no responde
- **"Unauthorized"** - Token inválido o expirado
- **"Not found"** - El conductor no existe

---

## 📝 Estructura del Modelo DriverApplication

```typescript
interface DriverApplication {
  id: string; // ID único del conductor
  name: string; // Nombre completo
  email: string; // Email del conductor
  phone: string; // Teléfono
  licenseNumber: string; // Número de licencia
  licenseExpiryDate: string; // Fecha de vencimiento
  vehicleType: string; // Tipo de vehículo
  vehiclePlate: string; // Placa del vehículo
  vehicleYear: number; // Año del vehículo
  documentsVerified: boolean; // ¿Documentos verificados?
  backgroundCheckPassed: boolean; // ¿Background check pasó?
  backgroundCheckDate: string; // Fecha de background check
  applicationDate: string; // Fecha de solicitud
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string; // Motivo de rechazo
  verificationNotes: string; // Notas de verificación
  userId: string; // ID del usuario
  user?: object; // Datos del usuario
}
```

---

## 🔗 Relaciones Backend

### Driver Model (`backend/src/models/Driver.js`)

- ✅ `status` (ENUM: pending, approved, rejected)
- ✅ `backgroundCheckPassed` (BOOLEAN)
- ✅ `rejectionReason` (STRING)
- ✅ `userId` (FK a User)

### Rutas de Admin (`backend/src/routes/admin.js`)

- ✅ Protegidas con `authMiddleware`
- ✅ Protegidas con `adminMiddleware`
- ✅ Validación de driverId en params

---

## 🚀 Próximos Pasos (Opcional)

1. **Notificaciones**: Enviar email al conductor cuando se aprueba/rechaza
2. **Documentos**: Agregar visualización de documentos adjuntos
3. **Auditoría**: Guardar quién aprobó/rechazó y cuándo
4. **Búsqueda avanzada**: Filtros por fecha, verificación, etc.
5. **Exportar**: Descargar reporte de solicitudes en CSV/PDF

---

## 📞 Soporte

Si encuentras problemas:

1. Verifica que el backend esté corriendo
2. Comprueba el token de autenticación
3. Revisa logs del backend en `backend/logs/`
4. Verifica la URL de API_BASE_URL en `admin.service.ts`

---

**Última actualización:** Enero 26, 2026
**Estado:** ✅ COMPLETADO
