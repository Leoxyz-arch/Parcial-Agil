const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const FFMPEG_PATH = 'C:\\Users\\User\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe';

async function recordFullDemo() {
  console.log(`🎬 Iniciando grabación de prueba integral en: ${BASE_URL}...`);
  const videosDir = path.join(__dirname, 'video_temp');
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: videosDir,
      size: { width: 1440, height: 900 }
    }
  });

  const page = await context.newPage();

  try {
    // 1. Login y Control de Acceso
    console.log('1. Probando Login y Credenciales...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    // Intento con credenciales erróneas
    await page.fill('#login-username', 'asistente');
    await page.fill('#login-password', 'error123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#login-error:not(.hidden)');
    await page.waitForTimeout(1000);

    // Login correcto como asistente
    await page.fill('#login-password', 'asistente123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#module-asistente:not(.hidden)');
    await page.waitForTimeout(1200);

    // 2. Comprobación de Filtros Exactos y Búsqueda
    console.log('2. Probando filtros exactos y búsqueda...');
    await page.selectOption('#filtro-estado-asistente', 'vencido');
    await page.waitForTimeout(1000);
    await page.selectOption('#filtro-estado-asistente', 'por_vencer');
    await page.waitForTimeout(1000);
    await page.selectOption('#filtro-estado-asistente', 'todos');
    await page.waitForTimeout(800);

    await page.fill('#buscador-asistente', 'Luz');
    await page.waitForTimeout(1000);
    await page.fill('#buscador-asistente', '');
    await page.waitForTimeout(600);

    // 3. Crear Obligación: Validación RUC sin letras, monto sin 'e', fechas coherentes
    console.log('3. Probando validaciones estrictas en Modal Crear...');
    await page.click('#btn-open-modal-crear');
    await page.waitForSelector('#modal-crear-obligacion:not(.hidden)');
    await page.waitForTimeout(600);

    // Intentar escribir letras en RUC (debe bloquearlas)
    await page.fill('#crear-ruc', 'ABC20467XYZ');
    await page.waitForTimeout(600);

    // Intentar escribir 'e' en monto (debe quedar bloqueado)
    await page.fill('#crear-monto', '1000');
    await page.waitForTimeout(400);

    // Datos válidos
    const uniqueId = Date.now().toString().slice(-4);
    await page.selectOption('#crear-categoria', 'proveedores');
    await page.fill('#crear-beneficiario', `Distribuidora Nacional ${uniqueId}`);
    await page.fill('#crear-ruc', '20601234567');
    await page.fill('#crear-descripcion', `Suministro de Materiales Lote #${uniqueId}`);
    await page.fill('#crear-monto', '1450.00');
    
    const hoyStr = new Date().toISOString().split('T')[0];
    await page.fill('#crear-emision', hoyStr);
    await page.fill('#crear-vencimiento', hoyStr);
    await page.waitForTimeout(800);

    await page.click('#form-crear-obligacion button[type="submit"]');
    await page.waitForSelector('#modal-crear-obligacion', { state: 'hidden' });
    await page.waitForTimeout(1000);

    // 4. Editar Obligación con RUC editable
    console.log('4. Probando edición de obligación con RUC editable...');
    const btnEdit = await page.$('#tabla-obligaciones-asistente tr button[onclick*="abrirModalEditar"]');
    if (btnEdit) {
      await btnEdit.click();
      await page.waitForSelector('#modal-editar-obligacion:not(.hidden)');
      await page.waitForTimeout(1000);
      await page.fill('#editar-ruc', '20601234567');
      await page.fill('#editar-monto', '1500.00');
      const emisionVal = await page.inputValue('#editar-emision');
      if (emisionVal) {
        await page.fill('#editar-vencimiento', emisionVal);
      }
      await page.waitForTimeout(600);
      await page.click('#form-editar-obligacion button[type="submit"]');
      await page.waitForSelector('#modal-editar-obligacion', { state: 'hidden' });
      await page.waitForTimeout(1000);
    }

    // 5. Pagar con Fecha/Hora automática inmutable y código numérico
    console.log('5. Probando pago con fecha/hora inmutable y doble verificación...');
    const btnPagar = await page.$('#tabla-obligaciones-asistente tr button[onclick*="abrirModalPagar"]');
    if (btnPagar) {
      await btnPagar.click();
      await page.waitForSelector('#modal-pagar-obligacion:not(.hidden)');
      await page.waitForTimeout(1000);

      // Ingresar N° de operación estrictamente numérico
      await page.fill('#pagar-nro-operacion', '984125');

      // Adjuntar voucher de prueba
      const sampleVoucher = path.join(__dirname, '..', 'uploads', 'sample_voucher_bcp.svg');
      if (fs.existsSync(sampleVoucher)) {
        await page.setInputFiles('#pagar-archivo', sampleVoucher);
      }
      await page.waitForTimeout(800);

      // Marcar doble verificación
      await page.click('#pagar-declaracion-responsabilidad');
      await page.waitForTimeout(600);

      // Confirmar pago
      await page.click('#btn-submit-pago');
      await page.waitForSelector('#modal-pagar-obligacion', { state: 'hidden' });
      await page.waitForTimeout(1200);
    }

    // 6. Cerrar sesión de Asistente y autenticarse como Gerente (Segregación de roles)
    console.log('6. Cerrando sesión de Asistente e iniciando como Gerente...');
    await page.click('#btn-logout');
    await page.waitForSelector('#view-login:not(.hidden)');
    await page.waitForTimeout(1000);

    await page.fill('#login-username', 'gerente');
    await page.fill('#login-password', 'gerente123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#module-gerente:not(.hidden)');
    await page.waitForTimeout(1500);

    // 7. Dashboard Gerencial, KPIs y Auditoría con Filtros de Mes/Año
    console.log('7. Probando Dashboard Gerencial, KPIs y Auditoría con Filtros...');
    await page.selectOption('#filtro-mes-gerente', '10');
    await page.waitForTimeout(800);
    await page.selectOption('#filtro-anio-gerente', '2026');
    await page.waitForTimeout(800);
    await page.selectOption('#filtro-estado-gerente', 'pagado');
    await page.waitForTimeout(1000);

    // 8. Abrir Visor de Comprobante Ampliado
    console.log('8. Abriendo Visor de Auditoría ampliado...');
    const btnAuditar = await page.$('#tabla-obligaciones-gerente button[onclick*="abrirVisorComprobante"]');
    if (btnAuditar) {
      await btnAuditar.click();
      await page.waitForSelector('#modal-visor-comprobante:not(.hidden)');
      await page.waitForTimeout(2500);
      await page.click('#modal-visor-comprobante button.btn-close-modal >> nth=0');
      await page.waitForSelector('#modal-visor-comprobante', { state: 'hidden' });
      await page.waitForTimeout(800);
    }

    // 9. Cierre de Sesión Gerente
    console.log('9. Finalizando y cerrando sesión del Gerente...');
    await page.click('#btn-logout');
    await page.waitForSelector('#view-login:not(.hidden)');
    await page.waitForTimeout(1000);

    console.log('✅ Grabación completa finalizada exitosamente.');
  } catch (err) {
    console.error('Error durante la grabación:', err);
  }

  const video = page.video();
  const rawVideoPath = await video.path();

  await context.close();
  await browser.close();

  const finalMp4 = path.join(__dirname, '..', 'DEMO_SISTEMA_COMPLETO.mp4');

  if (fs.existsSync(rawVideoPath)) {
    try {
      console.log('⚙️ Convirtiendo video a formato MP4 con FFmpeg...');
      execSync(`"${FFMPEG_PATH}" -y -i "${rawVideoPath}" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 22 "${finalMp4}"`, { stdio: 'inherit' });
      console.log(`🎬 Video generado exitosamente en: ${finalMp4}`);
    } catch (ffmpegErr) {
      console.error('Error en FFmpeg:', ffmpegErr.message);
    }
  }

  try {
    fs.rmSync(videosDir, { recursive: true, force: true });
  } catch (e) {}
}

module.exports = { recordFullDemo };

if (require.main === module) {
  recordFullDemo();
}
