# 🚀 Quick Start - Admin Driver Approval

## TL;DR (Resumen Rápido)

Se completó la integración del sistema de aprobación de conductores. El admin puede ahora:

- ✅ Ver solicitudes de conductores
- ✅ Aprobar conductores
- ✅ Rechazar conductores con motivo

---

## 📦 Archivos Principales

### Creados:

- `src/services/admin.service.ts` - Servicio API (134 líneas)
- `DRIVER_APPROVAL_INTEGRATION.md` - Documentación técnica
- `TESTING_GUIDE.md` - Guía de pruebas
- `IMPLEMENTATION_SUMMARY.md` - Resumen ejecutivo
- `API_REFERENCE.md` - Referencia de endpoints
- `ARCHITECTURE.md` - Diagrama de arquitectura

### Modificados:

- `src/screens/AdminDriverRegistrationScreen.tsx` - Integración con API

---

## 🔌 Servicios API

```typescript
// Importar
import * as AdminService from '../services/admin.service';

// Usar
const response = await AdminService.getPendingDriverRequests(50, 0);
const result = await AdminService.approveDriver(driverId);
const result = await AdminService.rejectDriver(driverId, reason);
```

---

## 📋 Endpoints Backend

| Método | Endpoint                          | Función                        |
| ------ | --------------------------------- | ------------------------------ |
| GET    | `/api/admin/drivers/pending`      | Obtener solicitudes pendientes |
| GET    | `/api/admin/drivers`              | Obtener todos los conductores  |
| PUT    | `/api/admin/drivers/{id}/approve` | Aprobar conductor              |
| PUT    | `/api/admin/drivers/{id}/reject`  | Rechazar conductor             |

---

## 🧪 Prueba Rápida

```bash
# 1. Verificar que backend corre en puerto 3000
curl http://192.168.100.133:3000/api/admin/drivers/pending \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Abrir app y navegar a Admin → Driver Registration
# 3. Hacer clic en un conductor para revisar detalles
# 4. Hacer clic en "✓ Approve Driver" o "✕ Reject Driver"
```

---

## ⚙️ Configuración

Si cambias la IP o puerto del backend:

**Archivo:** `src/services/admin.service.ts`

```typescript
const API_BASE_URL = 'http://192.168.100.133:3000/api';
// ↓ Cambiar a tu URL
const API_BASE_URL = 'http://YOUR_IP:YOUR_PORT/api';
```

---

## 📊 Estados del Componente

```typescript
const [isLoading, setIsLoading] = useState(false); // Cargando datos
const [isSubmitting, setIsSubmitting] = useState(false); // Procesando acción
const [error, setError] = useState<string | null>(null); // Error message
```

---

## 🔄 Flujo Principal

```
1. useEffect carga solicitudes → loadDriverApplications()
2. Usuario abre solicitud → Modal con detalles
3. Usuario hace clic Approve/Reject → handleApproveDriver() / handleRejectDriver()
4. Se envía request al backend → AdminService.approveDriver/rejectDriver()
5. Backend actualiza BD → Retorna respuesta
6. Frontend actualiza estado local → Solicitud cambia de estado
7. UI se renderiza nuevamente → Cambios visibles al usuario
```

---

## ✨ Características Nuevas

### Cargando Datos

```
┌─────────────────────┐
│   Loading...        │
│      [spinner]      │
└─────────────────────┘
```

### Manejo de Errores

```
┌─────────────────────┐
│ ⚠️  Backend offline  │
│ Using demo data...  │
└─────────────────────┘
```

### Botones con Loading

```
Antes: [✓ Approve Driver]
Después (loading): [[spinner]]
```

---

## 🔐 Autenticación

El token JWT se maneja automáticamente:

- Se obtiene del almacenamiento local (MMKV)
- Se incluye en el header `Authorization: Bearer {token}`
- Si expira, `api.client` intenta refrescarlo

---

## 📈 Verificación de Éxito

### En Base de Datos:

```sql
-- Ver cambios después de aprobar
SELECT id, name, status, backgroundCheckPassed
FROM drivers
WHERE status = 'approved';
```

### En Browser Console:

```javascript
// Ver logs
console.log('Applications:', applications);
console.log('Error:', error);
console.log('IsSubmitting:', isSubmitting);
```

---

## 🐛 Solución de Problemas

| Problema               | Solución                                 |
| ---------------------- | ---------------------------------------- |
| Backend no responde    | Verificar que corre en puerto 3000       |
| Token inválido         | Hacer logout y login nuevamente          |
| Datos no cargan        | Comprobar URL de API en admin.service.ts |
| Botones deshabilitados | Esperar a que termine la request actual  |

---

## 📚 Documentación Adicional

- **[DRIVER_APPROVAL_INTEGRATION.md](./DRIVER_APPROVAL_INTEGRATION.md)** - Detalles técnicos
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Pasos de prueba
- **[API_REFERENCE.md](./API_REFERENCE.md)** - Endpoints detallados
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Diagrama de flujo

---

## ✅ Checklist Pre-Deploy

- [ ] Backend corriendo en puerto 3000
- [ ] Base de datos con conductores de prueba
- [ ] Admin tiene token válido
- [ ] URL de API correcta (admin.service.ts)
- [ ] Pruebas completadas (TESTING_GUIDE.md)
- [ ] Sin errores de compilación
- [ ] Datos cargan correctamente
- [ ] Aprobación funciona
- [ ] Rechazo funciona

---

## 🎯 Ejemplos de Uso

### Cargar solicitudes:

```typescript
const loadDrivers = async () => {
  const response = await AdminService.getPendingDriverRequests(50, 0);
  setApplications(response.data);
};
```

### Aprobar conductor:

```typescript
const approve = async (driverId: string) => {
  try {
    await AdminService.approveDriver(driverId);
    Alert.alert('Success', 'Driver approved!');
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

### Rechazar conductor:

```typescript
const reject = async (driverId: string, reason: string) => {
  try {
    await AdminService.rejectDriver(driverId, reason);
    Alert.alert('Success', 'Driver rejected!');
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa [TESTING_GUIDE.md](./TESTING_GUIDE.md)
2. Verifica logs en backend
3. Comprueba conexión de red
4. Revisa token de autenticación

---

**Estado:** ✅ COMPLETADO  
**Fecha:** 26 Enero, 2026  
**Versión:** 1.0
