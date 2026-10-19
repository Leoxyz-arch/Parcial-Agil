# 🤖 AGENT_CONTEXT.md - Contexto Central del Proyecto

> **Propósito de este archivo:**  
> Este documento permite que cualquier Inteligencia Artificial o miembro del equipo de desarrollo (los 5 desarrolladores, Scrum Master o Product Owner) comprenda al 100% el propósito del sistema, la arquitectura técnica, las reglas de negocio y el estado del sprint con solo leer este archivo.

---

## 📌 1. Visión General del Negocio
- **Nombre del Sistema:** **CashFlow Guard** - Sistema Ágil de Control de Pagos y Alertas de Mora.
- **Cliente / Product Owner:** Dueño de negocio / Profesor.
- **Problema Principal:** Se olvidan los pagos de servicios, impuestos, proveedores y cuotas de préstamos, lo que genera cobro de **moras, penalizaciones e intereses innecesarios**.
- **Solución Ágil (MVP):** Un sistema web ligero donde el **Asistente** registra compromisos y pagos con evidencia fotográfica/PDF, y el **Gerente** visualiza de inmediato los gastos del mes y el riesgo de mora.
- **Regla de Oro:** **Facilitarle la vida al asistente**, sin pasos engorrosos ni formularios sobrecargados.

---

## 👥 2. Roles del Sistema
1. **Asistente (Perfil Operativo):**
   - Registra obligaciones de pago por categoría.
   - Monitorea el semáforo de vencimientos (identificando pagos a $\le 3$ días o vencidos).
   - Realiza los pagos al 100% (o cuota del mes) y los marca como **"Pagado"** adjuntando el voucher fotográfico o PDF y N° de operación.
2. **Gerente (Perfil Ejecutivo / Supervisión):**
   - Visualiza en una sola pantalla los **4 KPIs financieros del mes**:
     1. Total gastos del mes.
     2. Total ya pagado.
     3. Total pendiente por pagar.
     4. Total en riesgo de mora ($\le 3$ días o vencidos).
   - Filtra obligaciones por mes, año y categoría.
   - Audita los pagos abriendo la evidencia fotográfica en pantalla completa.

---

## 🚦 3. Reglas de Negocio Clave
1. **Categorías soportadas:**
   - `servicio` (Luz, agua, internet, etc.).
   - `impuesto` (SUNAT, tributos municipales, etc.).
   - `proveedores` (Facturas de insumos y mercadería).
   - `prestamo` (Cuotas bancarias recurrentes mes a mes).
2. **Semáforo de Vencimiento:**
   - 🔴 **VENCIDO / MORA:** Fecha de vencimiento < Fecha actual y `estado != 'pagado'`.
   - 🟠 **POR VENCER:** Faltan entre 0 y 3 días para vencer y `estado != 'pagado'`.
   - 🔵 **PROGRAMADO:** Faltan más de 3 días para vencer y `estado != 'pagado'`.
   - 🟢 **PAGADO:** Obligación cancelada al 100% con voucher adjunto.
3. **Validación de Pago:**
   - No se puede marcar un pago como pagado sin subir la foto del comprobante o archivo PDF.
4. **Cálculo de KPIs del Mes para el Gerente:**
   - Se calculan sobre el mes y año seleccionados.
   - `Total en Riesgo de Mora` = Suma de montos de pagos **Vencidos** + pagos **Por Vencer ($\le 3$ días)**.

---

## 💻 4. Stack Tecnológico Seleccionado
- **Backend:** Node.js (v26+) con **Express.js**.
- **Base de Datos:** **Neon PostgreSQL** en la nube (con soporte de cadena de conexión `DATABASE_URL` y fallback de memoria/local para desarrollo sin desconexión).
- **Gestión de Archivos:** **Multer** para carga de imágenes (JPG, PNG, WEBP) y documentos PDF en la carpeta `/uploads`.
- **Frontend:** **HTML5, CSS3, JavaScript Vanilla modular** con **Tailwind CSS (CDN)** para diseño moderno, responsivo y profesional, e iconos vectoriales con **Lucide Icons**.

---

## 📋 5. Estructura de Directorios del Proyecto
```text
Paarcial_Agile/
│
├── docs/                      # Documentación del proyecto y agentes
│   ├── AGENT_CONTEXT.md       # (Este archivo) Contexto maestro del proyecto
│   ├── SCRUM_SPRINT.md        # Planificación Scrum, HU y Criterios de Aceptación
│   ├── DATABASE_SCHEMA.sql    # DDL y esquema relacional para Neon PostgreSQL
│   └── API_SPEC.md            # Especificación de endpoints REST
│
├── src/                       # Código del Servidor Node.js
│   ├── server.js              # Servidor Express principal y middlewares
│   ├── db.js                  # Conexión a Neon PostgreSQL / migración automática
│   ├── routes/                # Rutas modulares de la API
│   │   ├── auth.js            # Login y control de roles
│   │   ├── obligaciones.js    # CRUD de gastos, semáforo y subida de vouchers
│   │   └── dashboard.js       # Cálculo de los 4 KPIs del Gerente
│   └── seed.js                # Datos iniciales para la presentación
│
├── uploads/                   # Vouchers y comprobantes fotográficos/PDF
│
├── public/                    # Frontend Web (HTML, CSS, JS)
│   ├── index.html             # Interfaz unificada (Login, Vista Asistente, Vista Gerente)
│   ├── css/
│   │   └── styles.css         # Estilos personalizados y animaciones de alertas
│   └── js/
│       ├── api.js             # Cliente HTTP para interactuar con el backend
│       ├── auth.js            # Manejo de sesión y roles
│       ├── asistente.js       # Lógica del módulo del asistente (registro y pagos)
│       └── gerente.js         # Lógica del dashboard gerencial y visor de vouchers
│
├── .env.example               # Plantilla de variables de entorno (Neon DB URL)
├── .env                       # Variables de entorno locales
├── package.json               # Dependencias del proyecto
└── README.md                  # Instrucciones de ejecución
```
