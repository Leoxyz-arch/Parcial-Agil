const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';
const FFMPEG_PATH = 'C:\\Users\\User\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe';

async function recordBentoDemo() {
  console.log('🎬 Iniciando grabación de demostración: Bento Grid + Sidebar Izquierda...');
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
    // 1. Pantalla de Login en Light Mode Sobrio
    console.log('1. Cargando Login...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);

    // 2. Ingreso Asistente
    console.log('2. Iniciando sesión como Asistente Contable...');
    await page.click('#btn-quick-asistente');
    await page.waitForSelector('#module-asistente', { state: 'visible' });
    await page.waitForTimeout(1500);

    // 3. Demostración de Navegación por Barra Lateral Izquierda (Bento Grid)
    console.log('3. Explorando Sidebar izquierda y densidad de tabla...');
    await page.hover('#nav-btn-asistente');
    await page.waitForTimeout(800);

    // 4. Búsqueda en tiempo real (alta reactividad)
    console.log('4. Filtrado en tiempo real...');
    await page.fill('#buscador-asistente', 'Luz');
    await page.waitForTimeout(1200);
    await page.fill('#buscador-asistente', '');
    await page.waitForTimeout(800);

    // 5. Apertura de Modal y Detección de Error Humano
    console.log('5. Probando validación de error humano (vencimiento anterior a emisión)...');
    await page.click('#btn-open-modal-crear');
    await page.waitForSelector('#modal-crear-obligacion:not(.hidden)');
    await page.waitForTimeout(800);

    const uid = Date.now().toString().slice(-4);
    await page.selectOption('#crear-categoria', 'servicio');
    await page.selectOption('#crear-tipo-comprobante', 'Factura Electrónica');
    await page.fill('#crear-beneficiario', `TELEFÓNICA DEL PERÚ #${uid}`);
    await page.fill('#crear-ruc', '20100130201');
    await page.fill('#crear-descripcion', `Servicio de Fibra Óptica Dedicada Lote ${uid}`);
    await page.fill('#crear-monto', (1200 + parseInt(uid % 500, 10)).toFixed(2));
    await page.fill('#crear-emision', '2026-10-25');
    await page.fill('#crear-vencimiento', '2026-10-10'); // Fecha errónea (anterior a emisión)
    await page.click('#form-crear-obligacion button[type="submit"]');
    await page.waitForTimeout(1800); // Toast de error visible

    // 6. Corrección y Registro Exitoso
    console.log('6. Corrigiendo fecha y registrando con éxito...');
    await page.fill('#crear-vencimiento', '2026-11-20');
    await page.click('#form-crear-obligacion button[type="submit"]');
    await page.waitForSelector('#modal-crear-obligacion', { state: 'hidden' });
    await page.waitForTimeout(1800); // Toast de éxito y actualización de tabla

    // 7. Navegación fluida vía Sidebar al Dashboard Gerencial
    console.log('7. Cambiando de módulo al Dashboard Ejecutivo vía Sidebar...');
    await page.click('#nav-btn-gerente');
    await page.waitForSelector('#module-gerente', { state: 'visible' });
    await page.waitForTimeout(2000);

    // 8. Explorar métricas Bento
    console.log('8. Explorando KPIs Bento...');
    await page.hover('#kpi-total-gastos');
    await page.waitForTimeout(1000);
    await page.hover('#kpi-total-riesgo-mora');
    await page.waitForTimeout(1000);

    // 9. Retorno a Módulo de Obligaciones
    console.log('9. Retornando a Obligaciones...');
    await page.click('#nav-btn-asistente');
    await page.waitForSelector('#module-asistente', { state: 'visible' });
    await page.waitForTimeout(1500);

    // 10. Cerrar Sesión
    console.log('10. Cerrando sesión...');
    await page.click('#btn-logout');
    await page.waitForSelector('#view-login:not(.hidden)');
    await page.waitForTimeout(1500);

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
