# Guía de Instalación - PostgreSQL

## Instalación de PostgreSQL

### Windows

1. **Descargar PostgreSQL:**

   - Ve a https://www.postgresql.org/download/windows/
   - Descarga la versión más reciente (15 o superior)

2. **Ejecutar el instalador:**

   - Ejecuta el archivo descargado
   - Acepta los términos de licencia
   - Selecciona la carpeta de instalación (por defecto: C:\Program Files\PostgreSQL\15)
   - En "Installation Directory", selecciona el directorio
   - En "Server Installation", selecciona todos los componentes
   - En "Port", mantén el puerto 5432 (por defecto)
   - En "Locale", selecciona tu idioma

3. **Crear contraseña para superusuario:**

   - Se te pedirá una contraseña para el usuario "postgres"
   - **Importante:** Anota esta contraseña o usa "password" para pruebas
   - Confirma la contraseña

4. **Completar instalación:**

   - Deja las opciones por defecto
   - Finaliza la instalación

5. **Verificar instalación:**
   ```bash
   psql --version
   ```

### macOS (con Homebrew)

```bash
# Instalar PostgreSQL
brew install postgresql@15

# Iniciar el servidor
brew services start postgresql@15

# Verificar instalación
psql --version
```

### Linux (Ubuntu/Debian)

```bash
# Actualizar paquetes
sudo apt update

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Iniciar el servicio
sudo systemctl start postgresql

# Verificar instalación
psql --version
```

## Crear la Base de Datos

### Método 1: Usando psql (recomendado)

1. **Abrir psql:**

   ```bash
   psql -U postgres
   ```

2. **Crear la base de datos:**

   ```sql
   CREATE DATABASE linea_lila;
   ```

3. **Verificar creación:**

   ```sql
   \l
   ```

4. **Salir de psql:**
   ```sql
   \q
   ```

### Método 2: Usando pgAdmin (interfaz gráfica)

1. **Abrir pgAdmin:**

   - En Windows: Start → pgAdmin 4
   - En macOS: Abre pgAdmin desde las aplicaciones
   - En Linux: Abre pgAdmin en el navegador (http://localhost:5050)

2. **Conectar al servidor:**

   - Servidor: localhost
   - Puerto: 5432
   - Usuario: postgres
   - Contraseña: (la que ingresaste en la instalación)

3. **Crear nueva base de datos:**
   - Click derecho en "Databases" → "Create" → "Database"
   - Nombre: `linea_lila`
   - Click en "Save"

## Configurar Variables de Entorno

En el archivo `.env` del backend:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=linea_lila
DB_USER=postgres
DB_PASSWORD=password  # Cambia esto a tu contraseña de PostgreSQL
```

## Instalar Herramientas (opcional)

### pgAdmin (Interfaz gráfica)

```bash
# Windows
choco install pgadmin4  # Con Chocolatey

# macOS
brew install pgadmin4

# Linux
sudo apt install pgadmin4
```

### DBeaver (Cliente SQL multiplataforma)

```bash
# Windows
choco install dbeaver

# macOS
brew install --cask dbeaver-community

# Linux
https://dbeaver.io/download/
```

## Verificar Conexión

```bash
# Conectar a la base de datos
psql -U postgres -d linea_lila -h localhost

# Si funciona, deberías ver:
# psql (15.x)
# Type "help" for help.
# linea_lila=#

# Salir
\q
```

## Solución de Problemas

### Error: "role postgres does not exist"

```bash
# En Windows, usa Command Prompt como administrador:
psql -U postgres

# En Linux:
sudo -u postgres psql
```

### Error: "could not connect to server"

```bash
# Verificar que PostgreSQL esté ejecutándose

# Windows: Abre Services (services.msc) y busca "PostgreSQL"
# macOS: brew services list
# Linux: sudo systemctl status postgresql
```

### Cambiar contraseña del usuario postgres

```bash
# Conectar como superusuario
psql -U postgres

# Cambiar contraseña
ALTER USER postgres WITH PASSWORD 'nueva_contraseña';
```

## Próximas Pasos

Una vez PostgreSQL esté configurado:

1. Navega a la carpeta del backend:

   ```bash
   cd backend
   ```

2. Instala dependencias:

   ```bash
   npm install
   ```

3. Ejecuta el servidor:

   ```bash
   npm run dev
   ```

4. (Opcional) Carga datos de prueba:
   ```bash
   npm run seed
   ```

¡Listo! El backend debería estar corriendo en http://localhost:3000
