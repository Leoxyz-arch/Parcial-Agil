# AGENT_CONTEXT.md — Contexto Maestro del Sistema

> **Propósito de este archivo:**  
> Permite a cualquier Inteligencia Artificial, desarrollador o arquitecto incorporarse al proyecto y comprender de forma inmediata la arquitectura, reglas de negocio, modelos de datos, estándares de calidad y mecanismos de integridad implementados.

---

## 1. Visión General del Negocio
- **Sistema:** **CashFlow Guard** — Control Financiero y Gestión de Pasivos.
- **Problema de Negocio:** Penalizaciones financieras, intereses moratorios bancarios y multas de SUNAT generadas por olvido o desorganización de los plazos de vencimiento.
- **Solución:** Sistema web modular de alta fidelidad donde el **Asistente** registra pasivos certificados con RUC y comprobante, y el **Gerente** supervisa en tiempo real los 4 KPIs clave del mes y audita vouchers fotográficos y PDFs.
- **Enfoque de Experiencia:** Alta densidad de datos, cifras tabulares monoespaciadas y ausencia total de bloqueos intrusivos (`alert()` sustituido por sistema de Toasts asíncronos).

---

## 2. Perfiles y Segmentación de Roles
1. **Asistente (Operativo):**
   - Registro de compromisos financieros por categoría.
   - Validación estricta de coherencia temporal (vencimiento $\ge$ emisión).
   - Monitoreo del semáforo visual de urgencia en tiempo real.
   - Certificación de pago al 100% adjuntando código de operación bancario y voucher digital.
   - Anulación formal de obligaciones en caso de error de digitación (sin borrado destructivo).
   - Búsqueda en tiempo real sobre la tabla de trabajo.
2. **Gerente (Supervisión Ejecutiva):**
   - Consulta consolidada de los **4 KPIs Financieros del Periodo**:
     1. Total compromisos del mes.
     2. Total liquidado (con barra de avance porcentual).
     3. Total pendiente en plazo regular.
     4. Total en riesgo de mora (vencidos + próximos $\le 3$ días).
   - Desglose presupuestario por categoría.
   - Auditoría de comprobantes digitales a pantalla completa.
   - Exportación de libros contables en formato **CSV compatible con Microsoft Excel**.

---

## 3. Reglas de Negocio e Integridad Fiscal
1. **Categorías Soportadas:**
   - `servicio` (Energía, agua, telecomunicaciones).
   - `impuesto` (SUNAT PDT, tributos municipales).
   - `proveedores` (Facturas comerciales y compras de insumos).
   - `prestamo` (Cuotas bancarias amortizadas con cronograma).
2. **Tipos de Comprobante de Pago (Normativa SUNAT):**
   - Factura Electrónica, Recibo por Honorarios, Recibo Servicios Públicos, Declaración Jurada PDT, Liquidación de Crédito, Boleta de Venta.
3. **Validación de Identificador Fiscal:**
   - RUC de 11 dígitos (validación de prefijos 10, 15, 17, 20) o DNI de 8 dígitos.
4. **Semáforo de Vencimiento:**
   - **Mora Activa:** Vencimiento < Fecha actual y `estado == 'pendiente'`.
   - **Vencimiento Inminente:** Faltan entre 0 y 3 días y `estado == 'pendiente'`.
   - **Plazo Regular:** Faltan más de 3 días y `estado == 'pendiente'`.
   - **Liquidado:** Obligación cancelada al 100% con evidencia archivada.
   - **Anulado:** Obligación cancelada por error de digitación con motivo registrado (no computa pasivos monetarios).
5. **Advertencia Legal Tributaria:**
   - Impuestos en mora despliegan automáticamente la alerta legal sobre aplicación de TIM (Tasa de Interés Moratorio) y sanción por omisión conforme al Art. 178 Numeral 1 del Código Tributario.
6. **Inmutabilidad de Liquidaciones:**
   - Una obligación en estado `pagado` no puede ser modificada, re-pagada ni anulada.

---

## 4. Stack Tecnológico y Arquitectura
- **Backend:** Node.js (v18+) con **Express.js** estructurado en controladores y rutas REST desacopladas.
- **Persistencia:** Conector híbrido a **PostgreSQL (Neon Cloud)** con respaldo automático a motor JSON local (`data/local_db.json`) si no hay conexión a internet.
- **Gestión de Archivos:** **Multer** para carga y validación de vouchers (JPG, PNG, WEBP, PDF, SVG) con nombres hasheados únicos.
- **Frontend:** SPA modular con Vanilla JavaScript, Tailwind CSS (configurado en modo corporativo Light), tipografía dual (`Plus Jakarta Sans` + `JetBrains Mono`) e iconografía vectorial **Lucide Icons**.
- **Testing:** Suite E2E con **Playwright** (`npm test`).

---

## 5. Estructura de Directorios
```text
Paarcial_Agile/
│
├── docs/                      # Documentación del sistema
│   ├── AGENT_CONTEXT.md       # (Este archivo) Contexto maestro
│   ├── SCRUM_SPRINT.md        # Planificación y criterios Given-When-Then
│   └── DATABASE_SCHEMA.sql    # DDL relacional PostgreSQL
│
├── src/                       # Backend Express
│   ├── server.js              # Servidor principal
│   ├── db.js                  # Conexión Neon / motor fallback
│   └── routes/                # Endpoints modulares (auth, obligaciones, dashboard)
│
├── tests/                     # Suite de pruebas automatizadas
│   └── e2e.test.js            # Pruebas End-to-End con Playwright
│
├── uploads/                   # Repositorio de vouchers digitales
│
├── public/                    # Frontend Web (Light Mode Corporativo)
│   ├── index.html             # Interfaz SPA
│   ├── css/styles.css         # Estilos y sistema Toast
│   └── js/                    # Módulos JS (api, auth, asistente, gerente, app)
│
├── package.json
└── README.md
```
