# CashFlow Guard — Control Financiero y Gestión de Pasivos

Sistema corporativo para la gestión ágil de obligaciones financieras, prevención de penalizaciones y control de mora tributaria y comercial.

---

## 1. Visión General del Negocio

El sistema resuelve el principal dolor financiero de las organizaciones operativas: **evitar el cobro de moras, intereses bancarios y multas fiscales (SUNAT) causadas por vencimientos inadvertidos**.

- **Perfil Asistente (Operativo):**
  - Registro de obligaciones con validación fiscal de RUC y Tipo de Comprobante.
  - Semáforo de urgencia en tiempo real (Mora Activa, Vencimiento Inminente $\le 3$ días, Plazo Regular y Liquidado).
  - Certificación y pago al 100% adjuntando comprobante bancario (JPG, PNG, PDF, SVG) y código de operación.
  - Anulación formal de registros por error de digitación.
  - Búsqueda y filtrado instantáneo por texto libre (concepto, proveedor, RUC).
- **Perfil Gerente (Supervisión Ejecutiva):**
  - Monitoreo en tiempo real de **4 KPIs Clave del Periodo**: Total Compromisos, Total Liquidado (con porcentaje de avance), Total Pendiente en Plazo y Total en Riesgo de Mora.
  - Auditoría visual de comprobantes y vouchers en pantalla completa.
  - Desglose presupuestario por categoría de gasto.
  - Exportación consolidada en formato **CSV compatible con Excel** para contabilidad.

---

## 2. Credenciales de Acceso

| Perfil | Usuario | Contraseña | Rol y Permisos |
| :--- | :--- | :--- | :--- |
| **Gerente** | `gerente` | `gerente123` | Supervisión ejecutiva, auditoría de vouchers, KPIs y exportación |
| **Asistente** | `asistente` | `asistente123` | Registro de pasivos, certificación de vouchers y anulación por error |

*(La pantalla de inicio de sesión incluye botones de 1 clic para autocompletar credenciales en pruebas).*

---

## 3. Arquitectura del Sistema

```text
Paarcial_Agile/
│
├── docs/                      # Documentación técnica y especificaciones
│   ├── AGENT_CONTEXT.md       # Contexto maestro del sistema y reglas de negocio
│   ├── SCRUM_SPRINT.md        # Historias de usuario (HU-01 a HU-06) y criterios de aceptación
│   └── DATABASE_SCHEMA.sql    # Esquema relacional DDL (PostgreSQL)
│
├── src/                       # Código de la API REST (Node.js / Express)
│   ├── server.js              # Inicialización de Express y middlewares
│   ├── db.js                  # Conector Neon PostgreSQL y motor local fallback
│   └── routes/                # Rutas modulares
│       ├── auth.js            # Autenticación y gestión de roles
│       ├── obligaciones.js    # CRUD, semáforo, validación fiscal y anulación
│       └── dashboard.js       # Cálculo de los 4 KPIs y exportación CSV
│
├── tests/                     # Suite de Pruebas Automatizadas
│   └── e2e.test.js            # Pruebas End-to-End con Playwright
│
├── uploads/                   # Repositorio de evidencias y vouchers digitales
│
├── public/                    # Frontend Modular (Vanilla JS, Tailwind CSS, Lucide Icons)
│   ├── index.html             # Interfaz SPA corporativa (Light Mode)
│   ├── css/styles.css         # Tipografía Plus Jakarta Sans / JetBrains Mono y Toasts
│   └── js/
│       ├── api.js             # Cliente HTTP desacoplado
│       ├── auth.js            # Control de sesión
│       ├── asistente.js       # Módulo operativo
│       ├── gerente.js         # Módulo ejecutivo
│       └── app.js             # Notificaciones Toast y ciclo de vida
│
├── package.json
└── README.md
```

---

## 4. Mitigaciones de Integridad y Errores Implementadas

1. **Prevención de Error Humano:**
   - **Incoherencia de Fechas:** Bloqueo estricto si la fecha de vencimiento es anterior a la fecha de emisión.
   - **Duplicidad:** Rechazo automático de obligaciones registradas con el mismo proveedor, importe y fecha de vencimiento.
   - **Anulación con Motivo:** Registro formal del motivo de error de digitación para retirar el pasivo sin borrar trazabilidad.
   - **Sistema Toast:** Eliminación de los `alert()` bloqueantes del navegador por notificaciones contextuales animadas.
2. **Rigor Legal y Fiscal (SUNAT / Perú):**
   - **Validación de RUC:** Comprobación de formato (11 dígitos, prefijos válidos 10, 15, 17, 20) o DNI (8 dígitos).
   - **Tipo de Comprobante:** Clasificación formal conforme al Reglamento de Comprobantes de Pago (*Factura Electrónica, Recibo por Honorarios, Recibo Servicios Públicos, Declaración Jurada PDT, Liquidación de Crédito*).
   - **Alerta de Sanción Tributaria:** Identificación automática de multas por omisión (Art. 178 Num. 1 C.T.) e intereses moratorios (TIM) para impuestos vencidos.

---

## 5. Instalación y Ejecución

### Prerrequisitos
- Node.js (v18 o superior)
- npm (v9 o superior)

### Pasos de Inicio
1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Configuración de Base de Datos:
   - **Opción A (Recomendada):** Crear archivo `.env` en la raíz con la cadena de conexión de Neon:
     ```env
     PORT=3000
     DATABASE_URL=postgresql://usuario:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
   - **Opción B (Fallback Local):** Si `DATABASE_URL` no está definida, el sistema activa automáticamente su motor de persistencia local en `data/local_db.json`.

3. Iniciar el servidor:
   ```bash
   npm start
   ```

4. Abrir en el navegador:
   👉 **http://localhost:3000**

---

## 6. Pruebas Automatizadas

El proyecto incluye una suite completa de pruebas End-to-End con Playwright:

```bash
npm test
```

Valida:
- Rechazo de credenciales incorrectas.
- Acceso por roles y permisos diferenciados.
- Bloqueo de errores humanos de digitación (fechas incongruentes, montos inválidos).
- Registro con validación fiscal de RUC y Tipo de Comprobante.
- Buscador reactivo en tiempo real.
- Cálculo de los 4 KPIs del Dashboard Ejecutivo.
- Apertura y auditoría del visor de comprobantes.
