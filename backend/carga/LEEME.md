# Prueba de carga (100 usuarios simultáneos)

Corre contra una **base MongoDB local en Docker**, nunca contra Atlas. No toca tu `.env`.

```bash
# 1. Base local (con Docker Desktop abierto)
docker run -d --name supportdesk-carga -p 27018:27017 mongo:7.0

# 2. Datos de prueba: 100 usuarios y 3000 tickets
cd backend
MONGODB_URI=mongodb://localhost:27018/supportdesk_carga npm run carga:datos

# 3. Backend de prueba compilado, en otra terminal (puerto 3100, sin logs por petición)
npm run build
MONGODB_URI=mongodb://localhost:27018/supportdesk_carga JWT_SECRET=carga PORT=3100 LOG_PETICIONES=false MONGO_DEBUG=false node dist/index.js

# 4. La prueba: 100 conexiones durante 30 s
API_URL=http://localhost:3100 JWT_SECRET=carga npm run carga:prueba

# 5. Limpiar
docker rm -f supportdesk-carga
```

Opcional: `CONEXIONES=200 SEGUNDOS=60 npm run carga:prueba` para exigir más.

Mide el backend y la base (lecturas de listas, detalle, comentarios, historial, tramos y dashboards con los
permisos de cada rol). No incluye la latencia de red hasta Atlas: esa depende del plan y la región de producción.
