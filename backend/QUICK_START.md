# 🚀 Quick Start - LineaLila Backend

## ⚡ 5 Minutos para comenzar

### Paso 1: Instalar PostgreSQL (si no lo tienes)

```bash
# Windows: Descargar de https://www.postgresql.org/download/windows/
# macOS: brew install postgresql@15
# Linux: sudo apt install postgresql

# Crear base de datos
psql -U postgres
CREATE DATABASE linea_lila;
\q
```

### Paso 2: Instalar dependencias del backend

```bash
cd backend
npm install
```

### Paso 3: Configurar variables de entorno

```bash
# backend/.env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=linea_lila
DB_USER=postgres
DB_PASSWORD=password  # Tu contraseña de PostgreSQL
JWT_SECRET=tu_clave_secreta
```

### Paso 4: Ejecutar el servidor

```bash
# Desarrollo (con hot-reload)
npm run dev

# Producción
npm start
```

✅ El servidor está en `http://localhost:3000`

---

## 📋 Test Rápido

### 1. Registrarse

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Test",
    "email": "juan@test.com",
    "phone": "+573001234567",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

### 2. Iniciar sesión

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@test.com",
    "password": "password123"
  }'
```

### 3. Usar el token (reemplaza TOKEN con el token de login)

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

---

## 🗄️ Cargar Datos de Prueba

```bash
npm run seed
```

Credenciales de prueba:

- **Admin**: admin@test.com / password123
- **Conductor**: conductor@test.com / password123
- **Cliente**: cliente@test.com / password123

---

## 📊 Frontend Integration

En el archivo frontend `src/services/api.client.ts`:

```typescript
const API_BASE_URL = 'http://localhost:3000/api';
```

---

## 🔧 Troubleshooting

### Error: "Cannot find module 'sequelize'"

```bash
npm install
```

### Error: "connect ECONNREFUSED"

```bash
# PostgreSQL no está corriendo
# Windows: Start PostgreSQL from services
# macOS: brew services start postgresql@15
# Linux: sudo systemctl start postgresql
```

### Error: "database linea_lila does not exist"

```bash
psql -U postgres
CREATE DATABASE linea_lila;
\q
```

---

## 📚 Documentación Completa

- [README.md](./README.md) - Documentación completa de la API
- [STRUCTURE.md](./STRUCTURE.md) - Estructura del proyecto
- [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md) - Guía de instalación PostgreSQL
- [BACKEND_SUMMARY.md](./BACKEND_SUMMARY.md) - Resumen de implementación

---

## 🎯 Próximos Pasos

1. ✅ Backend corriendo
2. 🔄 Conectar frontend a backend
3. 📡 Implementar Socket.io (ubicación en tiempo real)
4. 💳 Integración de pagos
5. 📱 Pruebas y deployment

---

## 💡 Tips

- Usa [Insomnia](https://insomnia.rest/) o [Postman](https://www.postman.com/) para probar endpoints
- Verifica logs del servidor en la terminal
- Los datos se sincronizarán automáticamente a PostgreSQL
- En desarrollo, usa `npm run dev` para hot-reload

¡Listo! 🎉
