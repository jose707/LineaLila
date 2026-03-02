# 🔗 Guía: Conectar Frontend + Backend

## ✅ Estado Actual

**Frontend**: ✅ Listo  
**Backend**: ✅ Listo  
**Configuración**: ✅ Ya actualizada

---

## 📋 Guía Paso a Paso

### **PASO 1: Inicia el Backend**

En una terminal:

```bash
cd backend
npm install              # Si es la primera vez
npm run dev
```

Deberías ver:

```
Base de datos sincronizada
Servidor ejecutándose en http://localhost:3000
```

✅ **Backend corriendo**

---

### **PASO 2: Carga datos de prueba (Opcional)**

En otra terminal:

```bash
cd backend
npm run seed
```

Esto crea usuarios de prueba:

```
✓ Admin: admin@test.com / password123
✓ Conductor: conductor@test.com / password123
✓ Cliente: cliente@test.com / password123
```

✅ **Datos de prueba cargados**

---

### **PASO 3: Inicia el Frontend**

En otra terminal:

```bash
npm install              # Si es la primera vez
npm start                # Para Expo
# o
npm run android          # Para Android emulator
# o
npm run ios              # Para iOS simulator
```

✅ **Frontend corriendo**

---

### **PASO 4: Prueba la Conexión**

En la app del frontend:

1. **Ve a LoginScreen**
2. **Intenta registrarte:**

   ```
   Name: Tu Nombre
   Email: test@ejemplo.com
   Phone: +573001234567
   Password: password123
   ```

3. **Mira la consola:**
   - ✅ Si ves solicitudes a `http://localhost:3000/api/auth/signup` → **Funciona**
   - ❌ Si ves error de conexión → Ir a Solución de Problemas

---

## 🔧 Qué Ya Fue Actualizado

### **api.client.ts**

```typescript
const API_URL = 'http://localhost:3000'; // ✅ Correcto
```

### **auth.service.ts** - Login

```typescript
// ✅ Ahora usa el backend real
const response = await api.post<LoginResponse>('/auth/login', credentials);
```

### **auth.service.ts** - Signup

```typescript
// ✅ Ahora usa el backend real
const response = await api.post<SignupResponse>('/auth/signup', data);
```

### **auth.service.ts** - Refresh Token

```typescript
// ✅ Compatible con el backend
const response = await api.post<{ token: string }>('/auth/refresh');
```

---

## 🧪 Prueba Endpoints desde el Frontend

### **1. Test Signup**

El frontend debe enviar:

```json
{
  "name": "Juan Prueba",
  "email": "juan@test.com",
  "phone": "+573001234567",
  "password": "password123",
  "confirmPassword": "password123"
}
```

El backend responde:

```json
{
  "message": "Usuario registrado exitosamente",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-aqui",
    "name": "Juan Prueba",
    "email": "juan@test.com",
    "role": "user"
  }
}
```

### **2. Test Login**

El frontend envía:

```json
{
  "email": "juan@test.com",
  "password": "password123"
}
```

El backend responde con token JWT

### **3. Test Get User (Protegido)**

Headers:

```
Authorization: Bearer <TOKEN>
```

Backend responde:

```json
{
  "user": {
    "id": "uuid",
    "name": "Juan Prueba",
    "email": "juan@test.com",
    "role": "user",
    "rating": 5.0,
    "totalTrips": 0
  }
}
```

---

## 🐛 Solución de Problemas

### **Error: "Network Error" o "Cannot connect to server"**

**Causa**: Backend no está corriendo

**Solución**:

```bash
cd backend
npm run dev
# Verifica que veas: "Servidor ejecutándose en http://localhost:3000"
```

---

### **Error: "404 Not Found"**

**Causa**: Endpoint incorrecto

**Solución**:

- Verifica que la URL sea `http://localhost:3000/api/auth/login`
- Revisa que `api.client.ts` tenga `API_URL = 'http://localhost:3000'`

---

### **Error: "401 Unauthorized" al hacer requests protegidos**

**Causa**: Token no se está guardando o enviando

**Solución**:

1. Verifica que `auth.service.ts` guarde el token:
   ```typescript
   StorageHelper.setItem('authToken', response.token);
   ```
2. Verifica que `api.client.ts` lo envíe:
   ```typescript
   const token = StorageHelper.getItem('authToken');
   if (token) {
     config.headers.Authorization = `Bearer ${token}`;
   }
   ```

---

### **Error: "CORS error"**

**Causa**: Origen no está permitido

**Solución**: El backend permite `http://localhost:8081` (Expo) y `http://localhost:3000`

Si cambias de puerto, actualiza en `backend/src/server.js`:

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8081', // Tu puerto Expo
  'http://localhost:19000', // Puerto alternativo
];
```

---

### **Error: "database does not exist"**

**Causa**: PostgreSQL no tiene la BD `linea_lila`

**Solución**:

```bash
psql -U postgres
CREATE DATABASE linea_lila;
\q
```

Luego reinicia el backend con `npm run dev`

---

### **Error: "password authentication failed"**

**Causa**: Contraseña de PostgreSQL incorrecta

**Solución**: Actualiza `.env`:

```env
DB_PASSWORD=tu_contraseña_real
```

---

## 📱 Verificar la Conexión en Tiempo Real

### **Opción 1: Ver logs del Backend**

Terminal del backend:

```
Backend ejecutándose → POST /api/auth/signup
Base de datos sincronizada
Servidor ejecutándose en http://localhost:3000
```

Cuando hagas login desde el app:

```
POST /api/auth/login
GET /api/auth/me
```

### **Opción 2: Usar Insomnia o Postman**

**Test Simple:**

1. **POST** `http://localhost:3000/api/auth/signup`

   ```json
   {
     "name": "Test User",
     "email": "test@example.com",
     "phone": "+573001234567",
     "password": "password123",
     "confirmPassword": "password123"
   }
   ```

2. **POST** `http://localhost:3000/api/auth/login`

   ```json
   {
     "email": "test@example.com",
     "password": "password123"
   }
   ```

3. **GET** `http://localhost:3000/api/auth/me`
   - Header: `Authorization: Bearer <TOKEN>`

Si todo responde correctamente → **Conexión funciona** ✅

---

## 🔐 Token JWT en el Frontend

El token se guarda automáticamente en:

```typescript
StorageHelper.setItem('authToken', response.token);
```

Y se envía automáticamente en cada request con:

```typescript
config.headers.Authorization = `Bearer ${token}`;
```

**No necesitas hacer nada manualmente** ✅

---

## 📊 Flujo Completo: Signup → Login → Usar App

```
1. Usuario abre app
   ↓
2. Ve LoginScreen
   ↓
3. Hace click en "Registrarse"
   ↓
4. Frontend envía POST /auth/signup
   ↓
5. Backend valida y crea usuario en BD
   ↓
6. Backend responde con token JWT
   ↓
7. Frontend guarda token en storage
   ↓
8. Frontend redirige a HomeScreen
   ↓
9. HomeScreen hace GET /auth/me (con token)
   ↓
10. Backend valida token y devuelve usuario
    ↓
11. App muestra datos del usuario ✅
```

---

## ✨ Próximos Pasos

### **Para usar más funcionalidades:**

1. **Pantalla de Viajes**

   - Actualizar `rides.service.ts`
   - Conectar endpoints `/api/rides/*`

2. **Pantalla de Perfil**

   - Actualizar `user.service.ts`
   - Conectar endpoints `/api/users/*`

3. **Panel Admin**

   - Crear `admin.service.ts`
   - Conectar endpoints `/api/admin/*`

4. **Mapas en Tiempo Real**
   - Instalar `socket.io-client`
   - Conectar WebSocket para ubicación

---

## 📞 Resumen Rápido

| Acción             | Comando                                     |
| ------------------ | ------------------------------------------- |
| Iniciar Backend    | `cd backend && npm run dev`                 |
| Cargar test data   | `cd backend && npm run seed`                |
| Iniciar Frontend   | `npm start`                                 |
| Test API (Postman) | POST `http://localhost:3000/api/auth/login` |
| Ver logs Backend   | Terminal donde corre `npm run dev`          |
| Ver logs Frontend  | Terminal/consola de Expo                    |

---

## 🎯 Checklist de Conexión

- [ ] Backend corriendo en `http://localhost:3000`
- [ ] PostgreSQL corriendo
- [ ] Base de datos `linea_lila` existe
- [ ] `.env` configurado con credenciales DB
- [ ] Frontend compilado sin errores
- [ ] `api.client.ts` apunta a `http://localhost:3000`
- [ ] `auth.service.ts` actualizado para backend real
- [ ] Test signup funciona
- [ ] Test login funciona
- [ ] Token se guarda en storage
- [ ] Token se envía en requests

✅ **Si todo está marcado → Conexión completada**

---

## 🎉 ¡Listo!

Ahora frontend y backend están completamente conectados. Puedes:

- ✅ Registrar usuarios reales
- ✅ Iniciar sesión
- ✅ Guardar datos en PostgreSQL
- ✅ Usar autenticación JWT
- ✅ Acceder a endpoints protegidos
- ✅ Hacer requests con rol-based access

**¡A desarrollar! 🚀**
