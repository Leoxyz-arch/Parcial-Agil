const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// Configuración de Multer para almacenamiento seguro de comprobantes (fotos o PDF)
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `voucher-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo se aceptan imágenes (JPG, PNG, WEBP) o documentos PDF.'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB máximo
    fileFilter: fileFilter
});

function formatDateISO(val) {
    if (!val) return '';
    if (val instanceof Date) {
        return val.toISOString().split('T')[0];
    }
    return String(val).split('T')[0];
}

// Función auxiliar para calcular el semáforo y días restantes
function enrichObligacionWithSemaforo(rawItem) {
    const fVencStr = formatDateISO(rawItem.fecha_vencimiento);
    const fEmisStr = formatDateISO(rawItem.fecha_emision);
    const fPagoStr = formatDateISO(rawItem.fecha_pago);

    const item = {
        ...rawItem,
        fecha_vencimiento: fVencStr,
        fecha_emision: fEmisStr,
        fecha_pago: fPagoStr
    };

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Parsear fecha vencimiento
    const [y, m, d] = (item.fecha_vencimiento || '').split('-').map(Number);
    const fVenc = new Date(y, m - 1, d);
    fVenc.setHours(0, 0, 0, 0);

    const diffMs = fVenc.getTime() - hoy.getTime();
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

    let semaforo = {
        codigo: 'programado',
        color: 'azul',
        etiqueta: 'Programado',
        dias_restantes: diffDias,
        clase_badge: 'bg-blue-100 text-blue-800 border-blue-200',
        alerta_critica: false
    };

    if (item.estado === 'pagado') {
        semaforo = {
            codigo: 'pagado',
            color: 'verde',
            etiqueta: 'Pagado al 100%',
            dias_restantes: diffDias,
            clase_badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            alerta_critica: false
        };
    } else if (diffDias < 0) {
        semaforo = {
            codigo: 'vencido',
            color: 'rojo',
            etiqueta: `VENCIDO / EN MORA (${Math.abs(diffDias)} ${Math.abs(diffDias) === 1 ? 'día' : 'días'} tarde)`,
            dias_restantes: diffDias,
            clase_badge: 'bg-red-600 text-white font-bold shadow-sm',
            alerta_critica: true
        };
    } else if (diffDias <= 3) {
        // Regla: 3 días o menos
        const textoDias = diffDias === 0 ? 'Vence Hoy' : `Quedan ${diffDias} ${diffDias === 1 ? 'día' : 'días'}`;
        semaforo = {
            codigo: 'por_vencer',
            color: 'naranja',
            etiqueta: `POR VENCER (${textoDias})`,
            dias_restantes: diffDias,
            clase_badge: 'bg-amber-500 text-white font-semibold',
            alerta_critica: true
        };
    }

    return {
        ...item,
        monto: parseFloat(item.monto),
        semaforo
    };
}

// GET /api/obligaciones
// Soporta query params: mes, anio, categoria, estado
router.get('/', async (req, res) => {
    try {
        const { mes, anio, categoria, estado } = req.query;

        const result = await db.query('SELECT * FROM obligaciones ORDER BY fecha_vencimiento ASC');
        let list = result.rows || [];

        // Filtrar y enriquecer
        let enriched = list.map(enrichObligacionWithSemaforo);

        if (mes) {
            const mesNum = parseInt(mes, 10);
            enriched = enriched.filter(o => {
                const parts = (o.fecha_vencimiento || '').split('-');
                return parseInt(parts[1], 10) === mesNum;
            });
        }

        if (anio) {
            const anioNum = parseInt(anio, 10);
            enriched = enriched.filter(o => {
                const parts = (o.fecha_vencimiento || '').split('-');
                return parseInt(parts[0], 10) === anioNum;
            });
        }

        if (categoria && categoria !== 'todas') {
            enriched = enriched.filter(o => o.categoria.toLowerCase() === categoria.toLowerCase());
        }

        if (estado && estado !== 'todos') {
            if (estado === 'riesgo') {
                enriched = enriched.filter(o => o.semaforo.alerta_critica);
            } else if (estado === 'pagado') {
                enriched = enriched.filter(o => o.estado === 'pagado');
            } else if (estado === 'pendiente') {
                enriched = enriched.filter(o => o.estado === 'pendiente');
            }
        }

        // Orden predeterminado: Vencidos -> Por Vencer (<= 3 días) -> Programados -> Pagados
        const prioridadSemaforo = {
            'vencido': 1,
            'por_vencer': 2,
            'programado': 3,
            'pagado': 4
        };

        enriched.sort((a, b) => {
            const pA = prioridadSemaforo[a.semaforo.codigo] || 99;
            const pB = prioridadSemaforo[b.semaforo.codigo] || 99;
            if (pA !== pB) return pA - pB;
            return (a.fecha_vencimiento || '').localeCompare(b.fecha_vencimiento || '');
        });

        res.json({
            ok: true,
            total: enriched.length,
            obligaciones: enriched
        });
    } catch (error) {
        console.error('Error en GET /api/obligaciones:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al obtener el listado de obligaciones.' });
    }
});

// POST /api/obligaciones (Registro ágil para Asistente)
router.post('/', async (req, res) => {
    try {
        const {
            categoria,
            descripcion,
            beneficiario,
            monto,
            fecha_emision,
            fecha_vencimiento,
            cuota_info
        } = req.body;

        // Validaciones
        const validCategorias = ['servicio', 'impuesto', 'proveedores', 'prestamo'];
        if (!categoria || !validCategorias.includes(categoria.toLowerCase())) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La categoría debe ser: Servicio, Impuesto, Proveedores o Préstamo.'
            });
        }

        if (!descripcion || descripcion.trim() === '') {
            return res.status(400).json({ ok: false, mensaje: 'Debe ingresar una descripción de la obligación.' });
        }

        if (!beneficiario || beneficiario.trim() === '') {
            return res.status(400).json({ ok: false, mensaje: 'Debe ingresar el beneficiario o proveedor.' });
        }

        const montoNum = parseFloat(monto);
        if (isNaN(montoNum) || montoNum <= 0) {
            return res.status(400).json({ ok: false, mensaje: 'El monto debe ser un número mayor a cero.' });
        }

        if (!fecha_emision || !fecha_vencimiento) {
            return res.status(400).json({ ok: false, mensaje: 'Debe seleccionar la fecha de emisión y de vencimiento.' });
        }

        const hoyISO = new Date().toISOString().split('T')[0];

        // Regla: En préstamos, la fecha de desembolso no puede ser menor a la fecha actual
        if (categoria.toLowerCase() === 'prestamo' && fecha_emision < hoyISO) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La fecha del préstamo no puede ser anterior a la fecha actual.'
            });
        }

        if (fecha_vencimiento < fecha_emision) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La fecha de vencimiento no puede ser anterior a la fecha de emisión.'
            });
        }

        // Función auxiliar para calcular el mismo día del mes en meses sucesivos
        const calcularFechaMesSucesivo = (baseY, baseM, baseD, offsetMeses) => {
            const targetMonthIdx = (baseM - 1) + offsetMeses;
            const targetYear = baseY + Math.floor(targetMonthIdx / 12);
            const targetMonth = ((targetMonthIdx % 12) + 12) % 12; // 0..11
            const maxDiasMes = new Date(targetYear, targetMonth + 1, 0).getDate();
            const diaFinal = Math.min(baseD, maxDiasMes);
            return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`;
        };

        // Si es préstamo y se solicita amortización progresiva en cuotas automáticas
        const numCuotas = parseInt(req.body.num_cuotas, 10);
        const tasaInteres = parseFloat(req.body.tasa_interes) || 0;

        if (categoria.toLowerCase() === 'prestamo' && req.body.generar_cuotas && numCuotas > 1) {
            const montoInteresTotal = +(montoNum * (tasaInteres / 100)).toFixed(2);
            const montoTotalDeuda = +(montoNum + montoInteresTotal).toFixed(2);
            const montoCuota = +(montoTotalDeuda / numCuotas).toFixed(2);

            // La fecha base para el día de vencimiento mensual se toma de fecha_emision (fecha del préstamo)
            const [baseY, baseM, baseD] = fecha_emision.split('-').map(Number);
            const creadas = [];

            for (let i = 1; i <= numCuotas; i++) {
                // Cuota i vence i meses después en el mismo día del mes
                const fVencISO = calcularFechaMesSucesivo(baseY, baseM, baseD, i);
                const cuotaLabel = `Cuota ${i} de ${numCuotas}`;
                const interesTxt = tasaInteres > 0 ? ` (Int. ${tasaInteres}%)` : '';
                const descCuota = `${descripcion.trim()} (${cuotaLabel}${interesTxt})`;

                const sql = `
                    INSERT INTO obligaciones 
                    (categoria, descripcion, beneficiario, monto, fecha_emision, fecha_vencimiento, cuota_info)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
                `;
                const params = [
                    'prestamo',
                    descCuota,
                    beneficiario.trim(),
                    montoCuota,
                    fecha_emision,
                    fVencISO,
                    cuotaLabel
                ];

                const insertRes = await db.query(sql, params);
                creadas.push(enrichObligacionWithSemaforo(insertRes.rows[0]));
            }

            return res.status(201).json({
                ok: true,
                mensaje: `Préstamo registrado: ${numCuotas} cuotas de S/ ${montoCuota} (vence día ${baseD} de cada mes). Total: S/ ${montoTotalDeuda}.`,
                obligaciones: creadas
            });
        }

        // Si es préstamo individual con interés
        let montoFinal = montoNum;
        let descFinal = descripcion.trim();
        if (categoria.toLowerCase() === 'prestamo' && tasaInteres > 0) {
            const intVal = +(montoNum * (tasaInteres / 100)).toFixed(2);
            montoFinal = +(montoNum + intVal).toFixed(2);
            descFinal = `${descFinal} (Int. ${tasaInteres}%)`;
        }

        const sql = `
            INSERT INTO obligaciones 
            (categoria, descripcion, beneficiario, monto, fecha_emision, fecha_vencimiento, cuota_info)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const params = [
            categoria.toLowerCase(),
            descFinal,
            beneficiario.trim(),
            montoFinal,
            fecha_emision,
            fecha_vencimiento,
            cuota_info ? cuota_info.trim() : null
        ];

        const insertRes = await db.query(sql, params);
        const nuevaObligacion = enrichObligacionWithSemaforo(insertRes.rows[0]);

        res.status(201).json({
            ok: true,
            mensaje: 'Obligación registrada exitosamente.',
            obligacion: nuevaObligacion
        });
    } catch (error) {
        console.error('Error en POST /api/obligaciones:', error);
        res.status(500).json({ ok: false, mensaje: 'Error interno al registrar la obligación.' });
    }
});

// POST /api/obligaciones/:id/pagar (Registro de pago con evidencia fotográfica o PDF)
router.post('/:id/pagar', upload.single('comprobante'), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { nro_operacion, fecha_pago } = req.body;

        // Validar evidencia
        if (!req.file) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Se requiere adjuntar la evidencia fotográfica o PDF del comprobante de pago.'
            });
        }

        if (!nro_operacion || nro_operacion.trim() === '') {
            return res.status(400).json({
                ok: false,
                mensaje: 'Debe ingresar el número de operación o referencia bancaria.'
            });
        }

        const fechaPagoVal = fecha_pago || new Date().toISOString().split('T')[0];
        const ext = path.extname(req.file.originalname).toLowerCase();
        const comprobanteTipo = ext === '.pdf' ? 'pdf' : 'imagen';
        const comprobanteUrl = `/uploads/${req.file.filename}`;

        const updateSql = `
            UPDATE obligaciones 
            SET estado = 'pagado',
                fecha_pago = $1,
                nro_operacion = $2,
                comprobante_url = $3,
                comprobante_tipo = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
        `;

        const updateRes = await db.query(updateSql, [
            fechaPagoVal,
            nro_operacion.trim(),
            comprobanteUrl,
            comprobanteTipo,
            id
        ]);

        if (!updateRes.rows || updateRes.rows.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Obligación no encontrada.' });
        }

        const pagada = enrichObligacionWithSemaforo(updateRes.rows[0]);

        res.json({
            ok: true,
            mensaje: 'Pago registrado exitosamente con evidencia fotográfica.',
            obligacion: pagada
        });
    } catch (error) {
        console.error('Error en POST /api/obligaciones/:id/pagar:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al registrar el pago: ' + error.message });
    }
});

// DELETE /api/obligaciones/:id (Eliminar / Anular obligación pendiente)
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        const findRes = await db.query('SELECT * FROM obligaciones WHERE id = $1', [id]);
        if (!findRes.rows || findRes.rows.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Obligación no encontrada.' });
        }

        const oblig = findRes.rows[0];
        if (oblig.estado === 'pagado') {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se puede anular una obligación que ya ha sido pagada y certificada con voucher.'
            });
        }

        await db.query('DELETE FROM obligaciones WHERE id = $1', [id]);

        res.json({
            ok: true,
            mensaje: 'Obligación eliminada exitosamente.'
        });
    } catch (error) {
        console.error('Error en DELETE /api/obligaciones/:id:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al eliminar la obligación: ' + error.message });
    }
});

// PUT /api/obligaciones/:id (Editar obligación pendiente)
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const {
            categoria,
            descripcion,
            beneficiario,
            monto,
            fecha_emision,
            fecha_vencimiento,
            cuota_info
        } = req.body;

        const findRes = await db.query('SELECT * FROM obligaciones WHERE id = $1', [id]);
        if (!findRes.rows || findRes.rows.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Obligación no encontrada.' });
        }

        const oblig = findRes.rows[0];
        if (oblig.estado === 'pagado') {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se puede editar una obligación que ya ha sido pagada.'
            });
        }

        const validCategorias = ['servicio', 'impuesto', 'proveedores', 'prestamo'];
        if (!categoria || !validCategorias.includes(categoria.toLowerCase())) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La categoría debe ser: Servicio, Impuesto, Proveedores o Préstamo.'
            });
        }

        if (!descripcion || descripcion.trim() === '') {
            return res.status(400).json({ ok: false, mensaje: 'Debe ingresar una descripción de la obligación.' });
        }

        if (!beneficiario || beneficiario.trim() === '') {
            return res.status(400).json({ ok: false, mensaje: 'Debe ingresar el beneficiario o proveedor.' });
        }

        const montoNum = parseFloat(monto);
        if (isNaN(montoNum) || montoNum <= 0) {
            return res.status(400).json({ ok: false, mensaje: 'El monto debe ser un número mayor a cero.' });
        }

        if (!fecha_emision || !fecha_vencimiento) {
            return res.status(400).json({ ok: false, mensaje: 'Debe seleccionar la fecha de emisión y de vencimiento.' });
        }

        if (fecha_vencimiento < fecha_emision) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La fecha de vencimiento no puede ser anterior a la fecha de emisión.'
            });
        }

        const updateSql = `
            UPDATE obligaciones
            SET categoria = $1,
                descripcion = $2,
                beneficiario = $3,
                monto = $4,
                fecha_emision = $5,
                fecha_vencimiento = $6,
                cuota_info = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `;

        const updateParams = [
            categoria.toLowerCase(),
            descripcion.trim(),
            beneficiario.trim(),
            montoNum,
            fecha_emision,
            fecha_vencimiento,
            cuota_info ? cuota_info.trim() : null,
            id
        ];

        const updateRes = await db.query(updateSql, updateParams);
        const enriquecida = enrichObligacionWithSemaforo(updateRes.rows[0]);

        res.json({
            ok: true,
            mensaje: 'Obligación actualizada exitosamente.',
            obligacion: enriquecida
        });
    } catch (error) {
        console.error('Error en PUT /api/obligaciones/:id:', error);
        res.status(500).json({ ok: false, mensaje: 'Error interno al actualizar la obligación.' });
    }
});

module.exports = router;
