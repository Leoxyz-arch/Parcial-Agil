# 📊 SCRUM_SPRINT.md - Planificación del Sprint y Backlog

## 1. Parámetros del Proyecto y Equipo Scrum
- **Metodología:** Scrum.
- **Duración del Sprint:** **1 semana (Sprint 1)**.
- **Equipo de Trabajo:**
  - **Product Owner:** Dueño de negocio / Cliente (Profesor).
  - **Scrum Master:** 1 Facilitador ágil.
  - **Equipo de Desarrollo:** **5 Desarrolladores Full-Stack**.
- **Capacidad Total del Sprint:** 5 desarrolladores × 40 hrs/semana = **200 horas hombre**.
- **Objetivo del Sprint (Sprint Goal):** Entregar un Producto Mínimo Viable (MVP) 100% funcional que resuelva el control de gastos, el semáforo de alerta a $\le 3$ días y moras, la carga de vouchers de pago y el dashboard con los 4 KPIs del Gerente.

---

## 2. Estimación Económica del Proyecto
| Rol / Recurso | Cantidad | Dedicación | Tarifa Mercado | Costo Sprint 1 | Costo Proyecto Total (3 Sprints) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Desarrolladores Full-Stack** | 5 | 40 hrs/sem c/u (200 hrs/sem) | S/. 35.00 / hr | S/. 7,000.00 | S/. 21,000.00 |
| **Scrum Master / Agile Coach** | 1 | 20 hrs/sem | S/. 45.00 / hr | S/. 900.00 | S/. 2,700.00 |
| **Base de Datos Neon & Storage** | - | Mensual | S/. 150.00 | S/. 150.00 | S/. 450.00 |
| **Fondo de Contingencia (10%)** | - | - | - | S/. 805.00 | S/. 2,415.00 |
| **TOTAL INVERSIÓN:** | | | | **S/. 8,855.00** *(Sprint 1)* | **S/. 26,565.00** *(Proyecto Completo)* |

---

## 3. Product Backlog del Sprint 1

| ID | Historia de Usuario | Puntos de Historia (SP) | Prioridad | Estado |
| :--- | :--- | :---: | :---: | :---: |
| **HU-01** | Control de Acceso por Roles (Gerente y Asistente) | 3 | Alta | En Desarrollo |
| **HU-02** | Registro Ágil de Obligaciones Financieras | 5 | Muy Alta | En Desarrollo |
| **HU-03** | Semáforo Visual de Vencimientos y Alertas ($\le 3$ días) | 5 | Muy Alta | En Desarrollo |
| **HU-04** | Registro de Pago y Evidencia Fotográfica / PDF | 8 | Muy Alta | En Desarrollo |
| **HU-05** | Dashboard Gerencial con 4 KPIs Clave del Mes | 5 | Muy Alta | En Desarrollo |
| **HU-06** | Filtros de Consulta y Auditoría de Comprobantes | 5 | Alta | En Desarrollo |
| **TOTAL** | **6 Historias de Usuario para el MVP** | **31 SP** | | **Sprint 1** |

---

## 4. Criterios de Aceptación (Gherkin / Given-When-Then)

### HU-01: Control de Acceso por Roles
- **Escenario 1 (Asistente exitoso):**  
  *Dado* que el usuario ingresa `asistente` y su clave correcta,  
  *Cuando* presiona "Iniciar Sesión",  
  *Entonces* accede al panel operativo del Asistente.
- **Escenario 2 (Gerente exitoso):**  
  *Dado* que el usuario ingresa `gerente` y su clave correcta,  
  *Cuando* presiona "Iniciar Sesión",  
  *Entonces* accede al Dashboard de KPIs del Gerente.
- **Escenario 3 (Credenciales inválidas):**  
  *Dado* un usuario o clave errónea,  
  *Cuando* intenta iniciar sesión,  
  *Entonces* el sistema muestra el error "Usuario o contraseña incorrectos".

### HU-02: Registro Ágil de Pagos Pendientes
- **Escenario 1 (Registro estándar):**  
  *Dado* que el asistente ingresa Categoría (`servicio`, `impuesto`, `proveedores`), Descripción, Beneficiario, Monto > 0, Fecha de emisión y Fecha de vencimiento,  
  *Cuando* presiona "Guardar Obligación",  
  *Entonces* se guarda y calcula su estado inicial según la fecha de vencimiento.
- **Escenario 2 (Registro de préstamo):**  
  *Dado* que el asistente selecciona la categoría `prestamo`,  
  *Cuando* completa la descripción e indica la cuota (ej. Cuota 3 de 12),  
  *Entonces* se agenda con la fecha de vencimiento correspondiente a ese mes.

### HU-03: Semáforo y Alertas de 3 Días y Mora
- **Escenario 1 (Alerta por vencer):**  
  *Dado* un pago pendiente cuya fecha de vencimiento está entre hoy y hoy + 3 días,  
  *Cuando* se muestra en la interfaz,  
  *Entonces* se pinta con badge/borde naranja/rojo y texto "¡POR VENCER!".
- **Escenario 2 (Alerta mora):**  
  *Dado* un pago pendiente cuya fecha de vencimiento es menor a la fecha de hoy,  
  *Cuando* se visualiza,  
  *Entonces* se resalta en rojo intenso con la advertencia "¡VENCIDO / EN MORA!".

### HU-04: Carga de Comprobante / Voucher
- **Escenario 1 (Pago completado al 100%):**  
  *Dado* un pago pendiente o por vencer,  
  *Cuando* el asistente hace clic en "Registrar Pago", ingresa N° de operación y adjunta foto o PDF del voucher,  
  *Entonces* el estado pasa a "Pagado", se archiva la evidencia y se habilita el botón "Ver Comprobante".

### HU-05: Dashboard Gerencial del Mes
- **Escenario 1 (Cálculo de los 4 KPIs):**  
  *Dado* el mes y año consultado por el Gerente,  
  *Cuando* carga la pantalla,  
  *Entonces* ve:
  1. **Total Gastos del Mes:** Suma de todos los registros del mes.
  2. **Total Ya Pagado:** Suma de los registros marcados como pagados.
  3. **Total Pendiente por Pagar:** Suma de compromisos pendientes sin mora.
  4. **Total en Riesgo de Mora:** Suma de pagos vencidos + pagos que vencen en $\le 3$ días.

### HU-06: Filtro y Auditoría de Comprobantes
- **Escenario 1 (Filtro por fecha y categoría):**  
  *Dado* que el Gerente selecciona un mes anterior o una categoría específica,  
  *Cuando* aplica el filtro,  
  *Entonces* la tabla muestra únicamente los registros coincidentes.
- **Escenario 2 (Visor de evidencia):**  
  *Dado* un registro pagado,  
  *Cuando* el Gerente hace clic en "Ver Comprobante",  
  *Entonces* se despliega un visor modal con la foto o PDF del voucher en alta calidad y los detalles de la transacción.
