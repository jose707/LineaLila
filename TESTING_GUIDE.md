# 🧪 Guía de Prueba - Sistema de Aprobación de Conductores

## ✅ Requisitos Previos

1. **Backend corriendo:**

   ```bash
   cd backend
   npm start
   # Puerto: 3000
   ```

2. **Base de datos PostgreSQL iniciada**

3. **Token de admin válido** en el almacenamiento local

4. **Dirección IP correcta** en `src/services/admin.service.ts`:
   ```typescript
   const API_BASE_URL = 'http://192.168.100.133:3000/api';
   ```

---

## 🚀 Flujo de Prueba Completo

### 1️⃣ Cargar la Pantalla de Admin

**Pasos:**

- Iniciar la app
- Hacer login como admin
- Navegar a "Admin Dashboard"
- Hacer clic en "Driver Registration"

**Esperado:**

- Se carga la pantalla
- Se visualizan las solicitudes pendientes
- Los contadores muestran valores correctos (Pending, Approved, Rejected)
- Si falla la carga: muestra "Using demo data - Backend unavailable"

---

### 2️⃣ Prueba: Cargar Solicitudes desde Backend

**Pasos:**

1. Esperar 2 segundos después de abrir la pantalla
2. Observar el spinner de carga

**Esperado:**

- Aparece spinner mientras se cargan datos
- Los datos se cargan desde `/api/admin/drivers/pending`
- Si backend no responde: usa datos demo como fallback

**Para verificar la API:**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://192.168.100.133:3000/api/admin/drivers/pending
```

---

### 3️⃣ Prueba: Búsqueda y Filtros

**Pasos:**

1. En SearchBar, escribir nombre de conductor
2. Filtrar por estado (All, Pending, Approved, Rejected)

**Esperado:**

- Los filtros locales funcionan correctamente
- Se muestran solo los conductores que coinciden
- Los contadores se actualizan

**Ejemplo:**

- Buscar: "Sofia" → Muestra solo Sofía Martínez
- Filtrar: "Pending" → Muestra solo solicitudes pendientes

---

### 4️⃣ Prueba: Abrir Detalles de Solicitud

**Pasos:**

1. Hacer clic en una aplicación pendiente
2. Revisar modal con detalles

**Esperado:**

- Modal se abre con animación
- Muestran:
  - Nombre y foto del conductor
  - Email y teléfono
  - Licencia (número y vencimiento)
  - Vehículo (tipo, placa, año)
  - Estado de verificación
  - Notas de verificación
- Botones "✓ Approve Driver" y "✕ Reject Driver" visibles

**Modal debe mostrar:**

```
┌─────────────────────────────┐
│      Sofía Martínez         │
│    ⏳ Pending Review         │
├─────────────────────────────┤
│ Personal Information         │
│ Email: sofia@...           │
│ Phone: +591 71...          │
├─────────────────────────────┤
│ License Information         │
│ Number: LIC-2024-001       │
│ Expiry: 2026-06-15         │
├─────────────────────────────┤
│ Vehicle Information         │
│ Type: Sedan                │
│ Plate: LPZ-1234            │
│ Year: 2022                 │
├─────────────────────────────┤
│ ✓ Approve Driver            │
│ ✕ Reject Driver             │
└─────────────────────────────┘
```

---

### 5️⃣ Prueba: APROBAR un Conductor

**Pasos:**

1. Abrir modal de solicitud pendiente
2. Hacer clic en "✓ Approve Driver"
3. Esperar respuesta del servidor

**Esperado:**

- Botón muestra spinner de carga
- Se envía `PUT /api/admin/drivers/{id}/approve`
- Alert: "Success - Driver Name has been approved as a driver!"
- Modal se cierra
- Conductor desaparece de lista "Pending"
- Contador de "Approved" aumenta

**Backend recibe:**

```json
PUT /api/admin/drivers/APP001/approve
{
  // body vacío
}

Response:
{
  "message": "Conductor aprobado exitosamente",
  "driver": {
    "id": "APP001",
    "status": "approved",
    "backgroundCheckPassed": true,
    ...
  }
}
```

**Para verificar en base de datos:**

```sql
SELECT id, name, status, backgroundCheckPassed
FROM drivers
WHERE id = 'APP001';
-- Status debe ser 'approved'
```

---

### 6️⃣ Prueba: RECHAZAR un Conductor

**Pasos:**

1. Abrir modal de solicitud pendiente
2. Hacer clic en "✕ Reject Driver"
3. Se abre modal para ingresar motivo
4. Escribir motivo: "Documentation incomplete"
5. Hacer clic en "Reject"

**Esperado:**

- Modal de rechazo se muestra
- Campo de texto está enfocado
- Botón "Reject" se activa después de escribir
- Spinner se muestra mientras se procesa
- Alert: "Driver Rejected - Driver Name has been rejected."
- Modales se cierran
- Conductor cambia a "Rejected" en lista
- Contador de "Rejected" aumenta

**Backend recibe:**

```json
PUT /api/admin/drivers/APP002/reject
{
  "reason": "Documentation incomplete"
}

Response:
{
  "message": "Conductor rechazado",
  "driver": {
    "id": "APP002",
    "status": "rejected",
    "backgroundCheckPassed": false,
    "rejectionReason": "Documentation incomplete",
    ...
  }
}
```

**Verificar en base de datos:**

```sql
SELECT id, name, status, rejectionReason
FROM drivers
WHERE id = 'APP002';
-- Status debe ser 'rejected'
-- rejectionReason debe ser el motivo ingresado
```

---

### 7️⃣ Prueba: Ver Motivo de Rechazo

**Pasos:**

1. Filtrar a "Rejected"
2. Hacer clic en conductor rechazado
3. Revisar sección "Rejection Reason"

**Esperado:**

- Se muestra la razón en caja roja
- "✕ Documentation incomplete"
- Botones de acción NO se muestran (estado rechazado)

---

### 8️⃣ Prueba: Manejo de Errores

#### Error 401 (No autorizado):

```bash
# Borrar token del almacenamiento
# Intentar aprobar conductor

# Esperado: Alert "Error al aprobar el conductor"
# Backend rechaza sin token válido
```

#### Error 404 (Conductor no encontrado):

```bash
# Modificar driverId en la URL manualmente
# Hacer request a /api/admin/drivers/INVALID_ID/approve

# Esperado: Alert "Error al aprobar el conductor"
```

#### Error de conexión (Backend offline):

```bash
# Apagar backend server
# Intentar cargar solicitudes

# Esperado:
# - Banner gris: "Using demo data - Backend unavailable"
# - Muestra datos demo
# - Al intentar aprobar: "Error al aprobar el conductor"
```

---

## 📊 Matriz de Pruebas

| #   | Escenario          | Acción                        | Resultado Esperado    | Status |
| --- | ------------------ | ----------------------------- | --------------------- | ------ |
| 1   | Cargar pantalla    | Navegar a Driver Registration | Muestra solicitudes   | ✅     |
| 2   | Abrir detalles     | Click en solicitud            | Modal con detalles    | ✅     |
| 3   | Aprobar conductor  | Click "Approve"               | Status → approved     | ✅     |
| 4   | Rechazar conductor | Click "Reject" + motivo       | Status → rejected     | ✅     |
| 5   | Ver rechazo        | Click en rechazado            | Muestra motivo        | ✅     |
| 6   | Filtrar pending    | Click "Pending"               | Muestra solo pending  | ✅     |
| 7   | Filtrar approved   | Click "Approved"              | Muestra solo approved | ✅     |
| 8   | Filtrar rejected   | Click "Rejected"              | Muestra solo rejected | ✅     |
| 9   | Buscar por nombre  | SearchBar + nombre            | Filtra por nombre     | ✅     |
| 10  | Error backend      | Backend offline               | Muestra demo data     | ✅     |

---

## 🔍 Verificación en Backend

### 1. Ver solicitudes pendientes:

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://192.168.100.133:3000/api/admin/drivers/pending
```

### 2. Ver todos los conductores:

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://192.168.100.133:3000/api/admin/drivers
```

### 3. Aprobar un conductor:

```bash
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  http://192.168.100.133:3000/api/admin/drivers/APP001/approve
```

### 4. Rechazar un conductor:

```bash
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Documentation incomplete"}' \
  http://192.168.100.133:3000/api/admin/drivers/APP002/reject
```

---

## 🐛 Debugging

### Habilitar logs en console:

En `admin.service.ts`:

```typescript
const response = await api.get('/admin/drivers/pending', { params });
console.log('Response:', response); // Ver respuesta
```

### Ver estado local:

En `AdminDriverRegistrationScreen.tsx`:

```typescript
useEffect(() => {
  console.log('Applications:', applications);
  console.log('Filtered:', filteredApplications);
  console.log('Error:', error);
}, [applications, selectedStatus, searchText]);
```

### Verificar autorización:

```bash
# Obtener token desde app:
# AuthContext → useAuth() → token

# Usar en curl:
curl -H "Authorization: Bearer TOKEN" ...
```

---

## ✨ Checklist Final

- [ ] Backend está corriendo en puerto 3000
- [ ] Base de datos tiene conductores de prueba
- [ ] Admin tiene sesión válida
- [ ] API_BASE_URL es correcta
- [ ] Datos de demo se cargan correctamente
- [ ] Búsqueda y filtros funcionan
- [ ] Aprobar conductor funciona
- [ ] Rechazar conductor funciona
- [ ] Motivo de rechazo se guarda
- [ ] Errores se manejan correctamente
- [ ] UI responde sin retrasos
- [ ] Modales se cierran correctamente

---

**Nota:** Si las pruebas no pasan, revisar:

1. Logs del backend
2. Red (IP correcta)
3. Token de autenticación
4. Permisos de admin en base de datos
