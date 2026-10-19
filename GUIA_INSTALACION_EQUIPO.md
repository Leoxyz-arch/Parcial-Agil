# 🚀 Guía Rápida de Instalación y Ejecución para el Equipo

> **Proyecto:** CashFlow Guard • Examen Parcial Agile Development (Scrum)  
> **Destinatarios:** Integrantes del equipo de desarrollo y evaluadores.

---

## 📌 Requisito Previo
Asegúrate de tener instalado **Node.js** (versión 18 o superior).  
Si no lo tienes, descárgalo e instálalo desde: 👉 [https://nodejs.org](https://nodejs.org) (versión LTS recomendada).

Para verificar que lo tienes instalado, abre tu terminal y ejecuta:
```bash
node -v
npm -v
```

---

## 🛠️ Pasos para Correr el Proyecto en tu PC

### Paso 1: Abrir la terminal en la carpeta del proyecto
Abre PowerShell, CMD o tu terminal favorita y entra a la carpeta del proyecto:
```bash
cd Paarcial_Agile
```

---

### Paso 2: Instalar dependencias
Ejecuta el siguiente comando (solo es necesario la primera vez que descargas el código):
```bash
npm install
```
*(Esto descargará automáticamente Express, el conector de PostgreSQL, Multer y las demás librerías necesarias).*

---

### Paso 3: Configurar la Base de Datos (`.env`)
Tienes **2 formas** de trabajar:

#### Opción A: Conectarse a la Base de Datos Neon PostgreSQL del equipo (Recomendada)
Para que todos compartamos la misma información en la nube en tiempo real:
1. Crea un archivo llamado `.env` en la raíz del proyecto (puedes duplicar el archivo `.env.example`).
2. Pega dentro la cadena de conexión de Neon que compartió el equipo:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://neondb_owner:tu_password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

#### Opción B: Modo Local / Offline (Sin internet)
Si estás en la universidad sin conexión o prefieres probar en local:
- No necesitas configurar nada. Deja el archivo `.env` vacío o no lo crees.
- El sistema detectará automáticamente que no hay internet/Neon y **activará su base de datos local** (`data/local_db.json`) para que el sistema funcione al 100% sin caerse.

---

### Paso 4: Iniciar el Servidor
Ejecuta:
```bash
npm start
```
*(Si estás programando y quieres que se reinicie automáticamente con cada cambio, puedes usar `npm run dev`).*

Verás en tu consola un mensaje como este:
```text
=======================================================
✅ CashFlow Guard escuchando en: http://localhost:3000
💼 Perfil Gerente:   usuario: gerente   | clave: gerente123
📋 Perfil Asistente: usuario: asistente | clave: asistente123
💾 Base de Datos:    Neon PostgreSQL (o Local Fallback)
=======================================================
```

---

### Paso 5: Abrir la Aplicación en tu Navegador
Abre Google Chrome, Edge o tu navegador preferido e ingresa a:  
👉 **http://localhost:3000**

---

## 🔑 Credenciales de Acceso

| Perfil | Usuario | Contraseña | ¿Qué puedes hacer? |
| :--- | :--- | :--- | :--- |
| **📋 Asistente** | `asistente` | `asistente123` | Registrar nuevas obligaciones por categoría, ver el semáforo de $\le 3$ días y moras, y subir la foto/PDF del voucher al marcar como pagado. |
| **💼 Gerente** | `gerente` | `gerente123` | Ver el **Dashboard con los 4 KPIs del mes**, filtrar por mes/año/categoría y hacer clic en **"Auditar Foto"** para inspeccionar cualquier comprobante en pantalla completa. |

> 💡 **Tip para la Sustentación:** En la pantalla de login encontrarás 2 botones de acceso rápido (**"📋 Asistente"** y **"💼 Gerente"**) que inician sesión automáticamente con 1 solo clic para agilizar la demo con el profesor.

---

## 📂 ¿Dónde está la Documentación del Proyecto?
Si necesitas consultar la arquitectura o defender el proyecto ante el profesor:
- [`docs/AGENT_CONTEXT.md`](docs/AGENT_CONTEXT.md): Contexto maestro del sistema, reglas de negocio y arquitectura técnica.
- [`docs/SCRUM_SPRINT.md`](docs/SCRUM_SPRINT.md): Planificación del Sprint de 1 semana, estimación de costos y las 6 Historias de Usuario con Criterios de Aceptación.
- [`docs/DATABASE_SCHEMA.sql`](docs/DATABASE_SCHEMA.sql): Tablas y esquema SQL relacional para PostgreSQL.
