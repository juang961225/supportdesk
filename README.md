# SupportDesk 🎫

Sistema interno de gestión de tickets de soporte. Reemplaza el flujo de soporte por correo con una plataforma centralizada, configurable y con seguimiento en tiempo real.

## Stack

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Base de datos:** MongoDB
- **Auth:** JWT + bcrypt
- **Deploy:** Vercel (frontend) + Railway (backend)

## Roles

- **Super Admin** — gestiona la plataforma completa
- **Admin** — configura formularios, asigna tickets, ve dashboards
- **Soporte** — atiende y responde tickets asignados
- **Usuario** — crea tickets y hace seguimiento

## Funcionalidades

- Formularios de tickets configurables desde el admin
- Subida de archivos (imágenes, documentos, zip)
- Asignación de tickets por rol de soporte
- Dashboard con gráficas de estado y tiempos de respuesta
- Tareas diarias automáticas con recordatorios

## Desarrollo local

### Requisitos
- Node.js 18+
- MongoDB local o Atlas

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Variables de entorno

Crea un archivo `.env` en `/backend`:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/supportdesk
JWT_SECRET=tu_secret_key
```

## Estado del proyecto

🚧 En desarrollo activo