# 🛡️ CashFlow Guard - Sistema Ágil de Control de Pagos y Alertas de Mora

**Proyecto para Examen Parcial de Agile Development • Metodología Scrum**  
**Sprint 1 (MVP Funcional - 1 Semana • 5 Desarrolladores)**

---

## 🚀 1. Resumen Ejecutivo del Negocio
El sistema resuelve el principal dolor financiero de la empresa: **evitar el cobro de moras, intereses y penalizaciones causadas por pagos atrasados u olvidados**.
- **Asistente:** Cuenta con una interfaz intuitiva para registrar compromisos de pago, monitorear el semáforo de urgencia ($\le 3$ días y vencidos) y certificar los pagos adjuntando la fotografía del voucher bancario o PDF.
- **Gerente:** Consulta en tiempo real en una sola pantalla los **4 KPIs clave del mes**: Total gastos del mes, Total pagado, Total pendiente por pagar y Total en riesgo de mora, además de auditar cualquier comprobante fotográfico.

---

## 🔑 2. Credenciales de Acceso al Sistema

| Rol | Usuario | Contraseña | Funcionalidad Principal |
| :--- | :--- | :--- | :--- |
| **Gerente** | `gerente` | `gerente123` | Dashboard Ejecutivo (4 KPIs, auditoría de vouchers y filtros mensuales) |
| **Asistente** | `asistente` | `asistente123` | Registro de gastos, semáforo visual de alertas y carga de comprobantes |

*(La pantalla de inicio de sesión incluye botones de 1 clic para autocompletar credenciales durante la sustentación).*

---

## 🗄️ 3. Conexión a Base de Datos (Neon PostgreSQL)

El proyecto está preparado de forma nativa para conectarse a **Neon PostgreSQL**:

1. Abre el archivo `.env` en la raíz del proyecto.
2. Añade tu cadena de conexión de Neon:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://neondb_owner:tu_password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. **Respaldo Automático (Fallback):** Si por alguna razón la conexión remota no está configurada o no hay internet en el aula, el sistema activa automáticamente su **motor persistente local** para que la sustentación no se detenga.

---

## 💻 4. Cómo Ejecutar el Proyecto

> 📖 **Guía detallada para tus compañeros:** Consulta [GUIA_INSTALACION_EQUIPO.md](file:///c:/Users/antho/OneDrive/Desktop/AGILR/Paarcial_Agile/GUIA_INSTALACION_EQUIPO.md) para un paso a paso visual y a prueba de fallos.

1. Abrir la terminal en la carpeta del proyecto:
   ```bash
   cd Paarcial_Agile
   ```
2. Instalar dependencias (si aún no se han instalado):
   ```bash
   npm install
   ```
3. Iniciar el servidor:
   ```bash
   npm start
   ```
4. Abrir en el navegador:
   👉 **http://localhost:3000**

---

## 📊 5. Parámetros del Proyecto Scrum (Para el Profesor)
- **Equipo de Desarrollo:** 5 Desarrolladores Full-Stack + 1 Scrum Master.
- **Duración del Sprint:** 1 Semana (Sprint 1 - Entrega de MVP Funcional).
- **Capacidad del Sprint:** 200 Horas Hombre (5 devs $\times$ 40 hrs).
- **Costo del Sprint 1 (MVP):** **S/. 8,855.00**
- **Presupuesto Total Estimado (3 Sprints):** **S/. 26,565.00**

---

## 🤖 6. Documentación de Agentes y Contexto
En la carpeta `/docs` encontrarás los archivos en formato Markdown que describen minuciosamente cada área del proyecto:
- [docs/AGENT_CONTEXT.md](file:///c:/Users/antho/OneDrive/Desktop/AGILR/Paarcial_Agile/docs/AGENT_CONTEXT.md): Contexto central para que cualquier IA o desarrollador comprenda el 100% del sistema.
- [docs/SCRUM_SPRINT.md](file:///c:/Users/antho/OneDrive/Desktop/AGILR/Paarcial_Agile/docs/SCRUM_SPRINT.md): Planificación del Sprint, Historias de Usuario (HU-01 a HU-06) y Criterios de Aceptación (Gherkin).
- [docs/DATABASE_SCHEMA.sql](file:///c:/Users/antho/OneDrive/Desktop/AGILR/Paarcial_Agile/docs/DATABASE_SCHEMA.sql): DDL completo de PostgreSQL.
