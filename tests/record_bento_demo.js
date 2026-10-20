const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';
const FFMPEG_PATH = 'C:\\Users\\User\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe';

async function recordBentoDemo() {
  console.log('🎬 Iniciando grabación de demostración: Sidebar Azul Sobrio + Filas GitHub Limpias...');
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
    // 1. Pantalla de Login
    console.log('1. Cargando Login...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 2. Ingreso Asistente
    console.log('2. Iniciando sesión como Asistente Contable...');
    await page.click('#btn-quick-asistente');
    await page.waitForSelector('#module-asistente', { state: 'visible' });
    await page.waitForTimeout(1500);

    // 3. Demostración de Sidebar Azul Sobrio (Sin sección Próximos) y Filas Estilo GitHub
    console.log('3. Explorando Sidebar sobrio y filas de una sola línea...');
    await page.hover('#nav-btn-asistente');
    await page.waitForTimeout(1000);

    // 4. Apertura de Ficha Técnica Detallada (Click en fila limpia)
    console.log('4. Abriendo Ficha Técnica Detallada desde una fila...');
    const firstRow = await page.$('#tabla-obligaciones-asistente tr');
    if (firstRow) {
      await firstRow.click();
      await page.waitForSelector('#modal-detalle-obligacion:not(.hidden)');
      await page.waitForTimeout(1800);
      await page.click('#modal-detalle-obligacion button.btn-close-modal >> nth=0');
      await page.waitForSelector('#modal-detalle-obligacion', { state: 'hidden' });
      await page.waitForTimeout(600);
    }

    // 5. Búsqueda en tiempo real
    console.log('5. Filtrado en tiempo real...');
    await page.fill('#buscador-asistente', 'Luz');
    await page.waitForTimeout(1000);
    await page.fill('#buscador-asistente', '');
    await page.waitForTimeout(600);

    // 6. Registro de Obligación y Detección de Error Humano
    console.log('6. Probando validación de error humano (vencimiento anterior a emisión)...');
    await page.click('#btn-open-modal-crear');
    await page.waitForSelector('#modal-crear-obligacion:not(.hidden)');
    await page.waitForTimeout(600);

    const uid = Date.now().toString().slice(-4);
    await page.selectOption('#crear-categoria', 'servicio');
    await page.selectOption('#crear-tipo-comprobante', 'Factura Electrónica');
    await page.fill('#crear-beneficiario', `TELEFÓNICA DEL PERÚ #${uid}`);
    await page.fill('#crear-ruc', '20100130201');
    await page.fill('#crear-descripcion', `Servicio de Fibra Óptica Troncal #${uid}`);
    await page.fill('#crear-monto', (1300 + parseInt(uid % 400, 10)).toFixed(2));
    await page.fill('#crear-emision', '2026-10-25');
    await page.fill('#crear-vencimiento', '2026-10-10'); // Fecha errónea
    await page.click('#form-crear-obligacion button[type="submit"]');
    await page.waitForTimeout(1500); // Toast de error visible

    // 7. Corrección y Registro Exitoso
    console.log('7. Corrigiendo fecha y registrando con éxito...');
    await page.fill('#crear-vencimiento', '2026-11-20');
    await page.click('#form-crear-obligacion button[type="submit"]');
    await page.waitForSelector('#modal-crear-obligacion', { state: 'hidden' });
    await page.waitForTimeout(1500);

    // 8. Navegación fluida vía Sidebar al Dashboard Gerencial
    console.log('8. Cambiando de módulo al Dashboard Ejecutivo vía Sidebar...');
    await page.click('#nav-btn-gerente');
    await page.waitForSelector('#module-gerente', { state: 'visible' });
    await page.waitForTimeout(1800);

    // 9. Explorar métricas Bento y Auditoría de Comprobante
    console.log('9. Explorando métricas Bento y comprobante auditado...');
    await page.hover('#kpi-total-gastos');
    await page.waitForTimeout(600);

    const btnAudit = await page.$('#tabla-obligaciones-gerente button[onclick*="abrirVisorComprobante"]');
    if (btnAudit) {
      await btnAudit.click();
      await page.waitForSelector('#modal-visor-comprobante:not(.hidden)');
      await page.waitForTimeout(1500);
      await page.click('#modal-visor-comprobante button.btn-close-modal >> nth=0');
      await page.waitForSelector('#modal-visor-comprobante', { state: 'hidden' });
      await page.waitForTimeout(600);
    }

    // 10. Retorno a Obligaciones y Cierre de Sesión
    console.log('10. Retornando y cerrando sesión...');
    await page.click('#nav-btn-asistente');
    await page.waitForSelector('#module-asistente', { state: 'visible' });
    await page.waitForTimeout(800);

    await page.click('#btn-logout');
    await page.waitForSelector('#view-login:not(.hidden)');
    await page.waitForTimeout(1000);

    console.log('✅ Recorrido de grabación finalizado con éxito.');
  } catch (err) {
    console.error('Error durante la grabación:', err);
  }

  // Guardar video antes de cerrar
  const video = page.video();
  const rawVideoPath = await video.path();

  await context.close();
  await browser.close();

  const finalWebm = path.join(__dirname, '..', 'DEMO_BENTO_SIDEBAR.webm');
  const finalMp4 = path.join(__dirname, '..', 'DEMO_BENTO_SIDEBAR.mp4');

  if (fs.existsSync(rawVideoPath)) {
    fs.copyFileSync(rawVideoPath, finalWebm);
    console.log(`📹 Video WebM guardado en: ${finalWebm}`);

    try {
      console.log('⚙️ Convirtiendo a MP4 con FFmpeg...');
      execSync(`"${FFMPEG_PATH}" -y -i "${finalWebm}" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 22 "${finalMp4}"`, { stdio: 'inherit' });
      console.log(`🎬 Video final MP4 generado: ${finalMp4}`);
    } catch (ffmpegErr) {
      console.error('Error al convertir con FFmpeg:', ffmpegErr.message);
    }
  }

  // Limpiar directorio temporal
  try {
    fs.rmSync(videosDir, { recursive: true, force: true });
  } catch (e) {}
}

recordBentoDemo();
