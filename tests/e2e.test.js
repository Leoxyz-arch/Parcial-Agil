const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';

async function runTestSuite() {
  console.log('🧪 Iniciando Suite de Pruebas Automatizadas (CashFlow Guard v1.0)...');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name} ->`, err.message);
      failed++;
    }
  }

  // TEST 1: Control de Acceso y Rechazo de Credenciales Inválidas
  await test('HU-01: Rechazo de credenciales no autorizadas', async () => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await page.fill('#login-username', 'hacker');
    await page.fill('#login-password', 'incorrecta');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#login-error:not(.hidden)');

    const errorVisible = await page.isVisible('#login-error');
    assert.strictEqual(errorVisible, true, 'El mensaje de error de login debe ser visible');
  });

  // TEST 2: Acceso Autorizado Asistente
  await test('HU-01: Acceso correcto de Asistente', async () => {
    await page.fill('#login-username', 'asistente');
    await page.fill('#login-password', 'asistente123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#module-asistente', { state: 'visible' });
    const roleText = await page.textContent('#user-display-role');
    assert(roleText.includes('Asistente'), 'El rol mostrado debe ser Asistente');
  });

  // TEST 3: Prevención de Error Humano (Fecha vencimiento < Fecha emisión)
  await test('Error Humano: Bloqueo de vencimiento anterior a emisión', async () => {
    await page.click('#btn-open-modal-crear');
    await page.waitForSelector('#modal-crear-obligacion:not(.hidden)');

    await page.fill('#crear-descripcion', 'Prueba Inconsistencia Fechas');
    await page.fill('#crear-beneficiario', 'Proveedor Test');
    await page.fill('#crear-ruc', '20100047218');
    await page.fill('#crear-monto', '500');
    await page.fill('#crear-emision', '2026-10-25');
    await page.fill('#crear-vencimiento', '2026-10-10'); // Anterior a emisión

    await page.click('#form-crear-obligacion button[type="submit"]');
    await page.waitForTimeout(500);

    // Modal sigue visible porque falló la validación
    const modalVisible = await page.isVisible('#modal-crear-obligacion');
    assert.strictEqual(modalVisible, true, 'No debe permitir registrar vencimiento anterior a emisión');

    // Cerrar modal
    await page.click('#modal-crear-obligacion button.btn-close-modal >> nth=0');
    await page.waitForSelector('#modal-crear-obligacion', { state: 'hidden' });
  });

  // TEST 4: Registro Válido con RUC y Tipo Comprobante
  await test('HU-02: Registro ágil de obligación con RUC válido', async () => {
    await page.click('#btn-open-modal-crear');
    await page.waitForSelector('#modal-crear-obligacion:not(.hidden)');

    const uniqueId = Date.now().toString().slice(-4);
    await page.selectOption('#crear-categoria', 'servicio');
    await page.selectOption('#crear-tipo-comprobante', 'Factura Electrónica');
    await page.fill('#crear-beneficiario', `Claro Telecomunicaciones ${uniqueId}`);
    await page.fill('#crear-ruc', '20467534026');
    await page.fill('#crear-descripcion', `Servicio de Enlace Troncal #${uniqueId}`);
    await page.fill('#crear-monto', '780.00');

    const hoyStr = new Date().toISOString().split('T')[0];
    await page.fill('#crear-emision', hoyStr);
    await page.fill('#crear-vencimiento', hoyStr);

    await page.click('#form-crear-obligacion button[type="submit"]');
    await page.waitForSelector('#modal-crear-obligacion', { state: 'hidden' });
    await page.waitForTimeout(1000);

    const tableContent = await page.textContent('#tabla-obligaciones-asistente');
    assert(tableContent.includes(`Servicio de Enlace Troncal #${uniqueId}`), 'La obligación debe aparecer en la tabla');
  });

  // TEST 5: Buscador en tiempo real
  await test('Filtros: Buscador en tiempo real por texto', async () => {
    await page.fill('#buscador-asistente', 'Luz del Sur');
    await page.waitForTimeout(500);

    const tableContent = await page.textContent('#tabla-obligaciones-asistente');
    assert(tableContent.includes('Luz del Sur'), 'El buscador debe encontrar a Luz del Sur');

    await page.fill('#buscador-asistente', '');
    await page.waitForTimeout(300);
  });

  // TEST 6: Acceso Gerente y 4 KPIs
  await test('HU-05: Dashboard Gerencial con 4 KPIs', async () => {
    await page.click('#btn-logout');
    await page.waitForSelector('#view-login:not(.hidden)');

    await page.fill('#login-username', 'gerente');
    await page.fill('#login-password', 'gerente123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#module-gerente', { state: 'visible' });

    const totalGastos = await page.textContent('#kpi-total-gastos');
    const totalPagado = await page.textContent('#kpi-total-pagado');
    const totalPendiente = await page.textContent('#kpi-total-pendiente');
    const totalRiesgo = await page.textContent('#kpi-total-riesgo-mora');

    assert(totalGastos.startsWith('S/'), 'KPI 1 Total Gastos debe ser un monto en PEN');
    assert(totalPagado.startsWith('S/'), 'KPI 2 Total Pagado debe ser un monto en PEN');
    assert(totalPendiente.startsWith('S/'), 'KPI 3 Total Pendiente debe ser un monto en PEN');
    assert(totalRiesgo.startsWith('S/'), 'KPI 4 Riesgo de Mora debe ser un monto en PEN');
  });

  // TEST 7: Auditoría de comprobante
  await test('HU-06: Visor modal de comprobante auditado', async () => {
    const btnAudit = await page.$('#tabla-obligaciones-gerente button[onclick*="abrirVisorComprobante"]');
    if (btnAudit) {
      await btnAudit.click();
      await page.waitForSelector('#modal-visor-comprobante:not(.hidden)');

      const titulo = await page.textContent('#visor-titulo');
      assert(titulo.includes('Auditoría'), 'El visor debe abrirse con el título de auditoría');

      await page.click('#modal-visor-comprobante button.btn-close-modal >> nth=0');
      await page.waitForSelector('#modal-visor-comprobante', { state: 'hidden' });
    }
  });

  // TEST 8: Apertura de Ficha Técnica Detallada de Obligación
  await test('HU-07: Ficha técnica de obligación en modal (Anti-Bloat)', async () => {
    // Volver a la vista de obligaciones
    await page.click('#nav-btn-asistente');
    await page.waitForSelector('#module-asistente', { state: 'visible' });
    await page.waitForSelector('#tabla-obligaciones-asistente tr', { state: 'visible' });

    // Hacer click en la primera fila de la tabla
    const firstRow = await page.$('#tabla-obligaciones-asistente tr');
    assert(firstRow !== null, 'Debe existir al menos una fila en la tabla');
    await firstRow.click();
    await page.waitForSelector('#modal-detalle-obligacion:not(.hidden)');

    const concepto = await page.textContent('#detalle-concepto');
    assert(concepto.length > 0, 'La ficha técnica debe mostrar el concepto de la obligación');

    await page.click('#modal-detalle-obligacion button.btn-close-modal >> nth=0');
    await page.waitForSelector('#modal-detalle-obligacion', { state: 'hidden' });
  });

  await browser.close();

  console.log('\n=======================================');
  console.log(`📊 RESULTADOS: ${passed} pasadas, ${failed} fallidas.`);
  console.log('=======================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Error crítico en suite de pruebas:', err);
  process.exit(1);
});
