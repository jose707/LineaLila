# 🚀 Deployment Guide - LineaLila Backend

## Opciones de Deployment

### 1. Heroku (Recomendado para principiantes)

#### Requisitos

- Cuenta en [Heroku](https://www.heroku.com)
- Heroku CLI instalado
- Git configurado

#### Pasos

1. **Crear cuenta en Heroku**

```bash
heroku login
```

2. **Crear aplicación**

```bash
cd backend
heroku create linea-lila-api
```

3. **Agregar PostgreSQL**

```bash
heroku addons:create heroku-postgresql:hobby-dev
```

4. **Configurar variables de entorno**

```bash
heroku config:set JWT_SECRET=tu_clave_super_secreta
heroku config:set NODE_ENV=production
heroku config:set FRONTEND_URL=https://tu-frontend.com
```

5. **Deploy**

```bash
git push heroku main
```

6. **Ver logs**

```bash
heroku logs --tail
```

---

### 2. DigitalOcean (Droplet con Ubuntu)

#### Requisitos

- Cuenta en [DigitalOcean](https://www.digitalocean.com)
- Droplet Ubuntu 20.04 o superior
- SSH key configurada

#### Pasos

1. **Conectar al Droplet**

```bash
ssh root@YOUR_DROPLET_IP
```

2. **Instalar dependencias**

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Instalar PostgreSQL
apt install -y postgresql postgresql-contrib

# Instalar Nginx
apt install -y nginx

# Instalar PM2
npm install -g pm2
```

3. **Configurar PostgreSQL**

```bash
sudo -u postgres psql

# En psql:
CREATE DATABASE linea_lila;
CREATE USER linea_user WITH PASSWORD 'contraseña_segura';
ALTER ROLE linea_user SET client_encoding TO 'utf8';
ALTER ROLE linea_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE linea_user SET default_transaction_deferrable TO on;
ALTER ROLE linea_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE linea_lila TO linea_user;
\q
```

4. **Clonar repositorio**

```bash
cd /var/www
git clone <tu-repo> linea-lila-backend
cd linea-lila-backend
npm install
```

5. **Configurar variables de entorno**

```bash
cat > .env << EOF
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=linea_lila
DB_USER=linea_user
DB_PASSWORD=contraseña_segura
JWT_SECRET=tu_clave_super_secreta
JWT_EXPIRE=7d
FRONTEND_URL=https://tu-frontend.com
EOF
```

6. **Iniciar con PM2**

```bash
pm2 start src/server.js --name "linea-lila-api"
pm2 startup
pm2 save
```

7. **Configurar Nginx (Reverse Proxy)**

```bash
cat > /etc/nginx/sites-available/linea-lila << EOF
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/linea-lila /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

8. **Instalar SSL (Let's Encrypt)**

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d tu-dominio.com
```

---

### 3. AWS (EC2 + RDS)

#### Requisitos

- Cuenta AWS
- EC2 instance (t2.micro)
- RDS PostgreSQL

#### Pasos

1. **Crear instancia EC2**

   - AMI: Ubuntu 20.04 LTS
   - Type: t2.micro (free tier)
   - Security Group: Allow SSH (22), HTTP (80), HTTPS (443)

2. **Crear RDS PostgreSQL**

   - Engine: PostgreSQL 13+
   - Multi-AZ: No (para desarrollo)
   - Publicly accessible: No
   - Security Group: Allow 5432 desde EC2

3. **Conectar y configurar EC2**

```bash
ssh -i tu-key.pem ubuntu@tu-ec2-ip

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar dependencias
npm install -g pm2

# Clonar y configurar proyecto
git clone <tu-repo>
cd backend
npm install
```

4. **Configurar .env con RDS endpoint**

```bash
DB_HOST=<tu-rds-endpoint>.rds.amazonaws.com
DB_USER=postgres
DB_PASSWORD=<tu-contraseña-rds>
DB_NAME=linea_lila
```

5. **Iniciar servidor**

```bash
pm2 start src/server.js
pm2 save
```

---

### 4. Google Cloud Platform (App Engine)

#### Pasos

1. **Instalar Google Cloud SDK**

```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

2. **Crear archivo `app.yaml`**

```yaml
runtime: nodejs18

env: standard

env_variables:
  NODE_ENV: 'production'
  JWT_SECRET: 'tu-clave-secreta'

entrypoint: 'npm start'
```

3. **Crear Cloud SQL instance**

```bash
gcloud sql instances create linea-lila-db \
  --database-version=POSTGRES_13 \
  --tier=db-f1-micro \
  --region=us-central1
```

4. **Crear base de datos**

```bash
gcloud sql databases create linea_lila \
  --instance=linea-lila-db
```

5. **Deploy**

```bash
gcloud app deploy
```

---

## Configuración para Producción

### 1. Variables de Entorno Producción

```env
NODE_ENV=production
PORT=3000

# Database
DB_HOST=<RDS/Cloud SQL endpoint>
DB_PORT=5432
DB_NAME=linea_lila
DB_USER=<user>
DB_PASSWORD=<strong-password>

# JWT
JWT_SECRET=<random-strong-secret>  # Generar: openssl rand -base64 32
JWT_EXPIRE=7d

# Frontend
FRONTEND_URL=https://www.linealila.com
FRONTEND_MOBILE=https://app.linealila.com

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/var/www/uploads

# API
API_URL=https://api.linealila.com
```

### 2. Generar JWT_SECRET Seguro

```bash
# macOS/Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))
```

### 3. Configuración CORS para Producción

```javascript
// En src/server.js
const allowedOrigins = [
  'https://www.linealila.com',
  'https://app.linealila.com',
  'https://admin.linealila.com',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);
```

### 4. Cambios en Base de Datos

```javascript
// En src/config/database.js
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false, // Desactivar logs en producción
    pool: {
      max: 10, // Aumentar para más conexiones
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
    ssl: true, // Requerido para RDS/Cloud SQL
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
);
```

### 5. SSL/TLS

```bash
# Con Certbot (Let's Encrypt)
sudo certbot certonly --standalone -d api.linealila.com

# Con AWS Certificate Manager
# En AWS Console → Certificate Manager → Request Certificate
```

---

## Monitoreo y Mantenimiento

### 1. PM2 Monitoring

```bash
# Dashboard
pm2 monit

# Configurar alertas
pm2 install pm2-auto-pull
pm2 install pm2-logrotate

# Guardar procesos
pm2 save
pm2 startup
```

### 2. Logging

```bash
# Ver logs
pm2 logs linea-lila-api

# Rotar logs
pm2 install pm2-logrotate
```

### 3. Monitoreo con Sentry

```bash
# Instalar
npm install @sentry/node @sentry/tracing

# En src/server.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### 4. Backup Automático

```bash
# Script de backup PostgreSQL
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

pg_dump -U linea_user linea_lila | gzip > \
  $BACKUP_DIR/linea_lila_$TIMESTAMP.sql.gz

# Agregar a crontab
# 0 2 * * * /home/ubuntu/backup-db.sh
```

---

## Checklist de Deployment

- [ ] JWT_SECRET configurado (openssl random)
- [ ] BASE URL correcta en .env
- [ ] CORS whitelist actualizado
- [ ] Contraseña de BD cambiadaexplicación
- [ ] SSL/TLS habilitado
- [ ] Logs configurados
- [ ] Backup automático configurado
- [ ] Monitoreo activado
- [ ] Base de datos sincronizada
- [ ] Seeders no ejecutados en producción
- [ ] NODE_ENV=production
- [ ] npm install --production
- [ ] PM2 guardado
- [ ] Firewall configurado
- [ ] DNS apuntando a servidor
- [ ] Email de contacto para alertas

---

## Rollback en Caso de Error

```bash
# Con Git
git revert <commit-hash>
git push

# Con PM2
pm2 restart linea-lila-api
pm2 save

# Restaurar desde backup
psql -U linea_user linea_lila < backup.sql
```

---

## Performance Tuning

```javascript
// Connection pooling
const sequelize = new Sequelize(..., {
  pool: {
    max: 20,      // Más conexiones
    min: 5,
    acquire: 30000,
    idle: 5000,   // Descartar ociosas
  },
});

// Caching con Redis
const redis = require('redis');
const client = redis.createClient();

// Query optimization
const rides = await Ride.findAll({
  attributes: ['id', 'finalFare', 'status'],  // Solo campos necesarios
  where: { status: 'completed' },
  limit: 100,
  raw: true,  // Datos crudos sin instancias Sequelize
});
```

---

## Costos Estimados (por mes)

| Servicio  | Opción            | Costo        |
| --------- | ----------------- | ------------ |
| Hosting   | Heroku            | $7 - $50     |
| Hosting   | DigitalOcean      | $5 - $40     |
| Hosting   | AWS               | $10 - $50    |
| Database  | Heroku PostgreSQL | Incluido     |
| Database  | RDS               | $15 - $50    |
| Domain    | GoDaddy/Namecheap | $0.99 - $10  |
| SSL       | Let's Encrypt     | Gratis       |
| **Total** | **Mínimo**        | **$6 - $20** |

---

**¡Listo para producción!** 🚀
