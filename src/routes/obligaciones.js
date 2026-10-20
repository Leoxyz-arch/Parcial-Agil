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
        cb(new Error('Formato no admitido. Solo se admiten archivos JPG, PNG, WEBP, PDF o SVG.'));
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

// Validación de RUC (Perú SUNAT: 11 dígitos, inicia con 10, 15, 17 o 20) o DNI (8 dígitos)
function validarIdentificadorFiscal(idStr) {
    if (!idStr) return true; // Opcional
    const clean = idStr.trim();
    if (/^\d{8}$/.test(clean)) return true; // DNI válido
    if (/^\d{11}$/.test(clean)) {
        const prefijo = clean.substring(0, 2);
        return ['10', '15', '17', '20'].includes(prefijo);
    }
    return false;
}

// Función auxiliar para calcular el semáforo y días restantes
function enrichObligacionWithSemaforo(rawItem) {
    const fVencStr = formatDateISO(rawItem.fecha_vencimiento);
    const fEmisStr = formatDateISO(rawItem.fecha_emision);
    const fPagoStr = formatDateISO(rawItem.fecha_pago);

    const item = {
        ...rawItem,
        tipo_comprobante: rawItem.tipo_comprobante || 'Factura Electrónica',
        ruc_beneficiario: rawItem.ruc_beneficiario || 'No especificado',
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
        detalle_tiempo: diffDias > 1 ? `Plazo: ${diffDias} días` : 'Plazo regular',
        dias_restantes: diffDias,
        clase_badge: 'bg-slate-100 text-slate-700 border-slate-300',
        alerta_critica: false
    };

    if (item.estado === 'anulado') {
        semaforo = {
            codigo: 'anulado',
            color: 'gris',
            etiqueta: 'Anulado',
            detalle_tiempo: item.motivo_anulacion || 'Cancelado por error humano',
            dias_restantes: diffDias,
            clase_badge: 'bg-zinc-100 text-zinc-500 border-zinc-200 line-through',
            alerta_critica: false
        };
    } else if (item.estado === 'pagado') {
        semaforo = {
            codigo: 'pagado',
            color: 'verde',
            etiqueta: 'Liquidado al 100%',
            detalle_tiempo: item.fecha_pago ? `Pagado el ${item.fecha_pago}` : 'Certificado',
            dias_restantes: diffDias,
            clase_badge: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
            alerta_critica: false
        };
    } else if (diffDias < 0) {
        const diasTarde = Math.abs(diffDias);
        semaforo = {
            codigo: 'vencido',
            color: 'rojo',
            etiqueta: 'Mora Activa',
            detalle_tiempo: `${diasTarde} ${diasTarde === 1 ? 'día' : 'días'} de retraso`,
            dias_restantes: diffDias,
            clase_badge: 'bg-rose-600 text-white font-bold',
            alerta_critica: true
        };
    } else if (diffDias <= 3) {
        const textoDias = diffDias === 0 ? 'Vence hoy' : `Vence en ${diffDias} ${diffDias === 1 ? 'día' : 'días'}`;
        semaforo = {
            codigo: 'por_vencer',
            color: 'naranja',
            etiqueta: 'Vencimiento Inminente',
            detalle_tiempo: textoDias,
            dias_restantes: diffDias,
            clase_badge: 'bg-amber-600 text-white font-semibold',
            alerta_critica: true
        };
    }

    // Regla legal tributaria: Sanción SUNAT para obligaciones tributarias en mora
    const esImpuesto = (item.categoria || '').toLowerCase() === 'impuesto';
    const advertenciaLegal = (esImpuesto && semaforo.alerta_critica)
        ? 'Riesgo SUNAT: Aplicación de TIM diaria + Multa por Omisión (Art. 178 Num. 1 C.T.)'
        : null;

    return {
        ...item,
        monto: parseFloat(item.monto),
        semaforo,
        advertencia_legal: advertenciaLegal
    };
}

// GET /api/obligaciones
router.get('/', async (req, res) => {
    try {
        const { mes, anio, categoria, estado, q } = req.query;

        const result = await db.query('SELECT * FROM obligaciones ORDER BY fecha_vencimiento ASC');
        let list = result.rows || [];

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
            enriched = enriched.filter(o => (o.categoria || '').toLowerCase() === categoria.toLowerCase());
        }

        if (estado && estado !== 'todos') {
            if (estado === 'riesgo') {
                enriched = enriched.filter(o => o.semaforo.alerta_critica && o.estado !== 'anulado');
            } else if (estado === 'pagado') {
                enriched = enriched.filter(o => o.estado === 'pagado');
            } else if (estado === 'pendiente') {
                enriched = enriched.filter(o => o.estado === 'pendiente');
            } else if (estado === 'anulado') {
                enriched = enriched.filter(o => o.estado === 'anulado');
            }
        }

        // Búsqueda textual en tiempo real (por descripción, beneficiario o RUC)
        if (q && q.trim() !== '') {
            const queryClean = q.trim().toLowerCase();
            enriched = enriched.filter(o =>
                (o.descripcion || '').toLowerCase().includes(queryClean) ||
                (o.beneficiario || '').toLowerCase().includes(queryClean) ||
                (o.ruc_beneficiario || '').toLowerCase().includes(queryClean) ||
                (o.tipo_comprobante || '').toLowerCase().includes(queryClean) ||
                (o.nro_operacion || '').toLowerCase().includes(queryClean)
            );
        }

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

// POST /api/obligaciones (Registro estricto con validaciones tributarias y humanas)
router.post('/', async (req, res) => {
    try {
        const {
            categoria,
            tipo_comprobante,
            descripcion,
            beneficiario,
            ruc_beneficiario,
            monto,
            fecha_emision,
            fecha_vencimiento,
            cuota_info
        } = req.body;

        // 1. Validación de Categoría
        const validCategorias = ['servicio', 'impuesto', 'proveedores', 'prestamo'];
        if (!categoria || !validCategorias.includes(categoria.toLowerCase())) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Categoría inválida. Debe ser: Servicio, Impuesto, Proveedores o Préstamo.'
            });
        }

        // 2. Validación de campos obligatorios
        if (!descripcion || descripcion.trim().length < 3) {
            return res.status(400).json({ ok: false, mensaje: 'Debe ingresar un concepto o descripción clara (mínimo 3 caracteres).' });
        }

        if (!beneficiario || beneficiario.trim().length < 2) {
            return res.status(400).json({ ok: false, mensaje: 'Debe indicar la razón social del beneficiario o proveedor.' });
        }

        // 3. Validación de Monto (no cero, no negativo)
        const montoNum = parseFloat(monto);
        if (isNaN(montoNum) || montoNum <= 0) {
            return res.status(400).json({ ok: false, mensaje: 'El importe a pagar debe ser un valor numérico estrictamente mayor a cero.' });
        }

        // 4. Validación de Fechas (Prevención de Error Humano: Vencimiento previo a Emisión)
        if (!fecha_emision || !fecha_vencimiento) {
            return res.status(400).json({ ok: false, mensaje: 'Debe registrar tanto la fecha de emisión como la de vencimiento.' });
        }

        if (fecha_vencimiento < fecha_emision) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Inconsistencia temporal: La fecha de vencimiento no puede ser anterior a la fecha de emisión del comprobante.'
            });
        }

        // 5. Validación Legal Tributaria (RUC SUNAT o DNI)
        if (ruc_beneficiario && !validarIdentificadorFiscal(ruc_beneficiario)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Identificador fiscal no válido. Debe ser un RUC válido de 11 dígitos (10, 15, 17, 20) o DNI de 8 dígitos.'
            });
        }

        // 6. Prevención de Duplicidad Humana
        const existingRes = await db.query('SELECT * FROM obligaciones');
        const duplicates = (existingRes.rows || []).filter(o =>
            o.estado !== 'anulado' &&
            o.beneficiario.toLowerCase() === beneficiario.trim().toLowerCase() &&
            Math.abs(parseFloat(o.monto) - montoNum) < 0.01 &&
            formatDateISO(o.fecha_vencimiento) === fecha_vencimiento
        );

        if (duplicates.length > 0) {
            return res.status(409).json({
                ok: false,
                mensaje: `Alerta de duplicidad: Ya existe una obligación registrada para "${beneficiario.trim()}" con el mismo importe y fecha de vencimiento.`
            });
        }

        const sql = `
            INSERT INTO obligaciones 
            (categoria, tipo_comprobante, descripcion, beneficiario, ruc_beneficiario, monto, fecha_emision, fecha_vencimiento, cuota_info)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const params = [
            categoria.toLowerCase(),
            tipo_comprobante ? tipo_comprobante.trim() : 'Factura Electrónica',
            descripcion.trim(),
            beneficiario.trim(),
            ruc_beneficiario ? ruc_beneficiario.trim() : null,
            montoNum,
            fecha_emision,
            fecha_vencimiento,
            cuota_info ? cuota_info.trim() : null
        ];

        const insertRes = await db.query(sql, params);
        const nuevaObligacion = enrichObligacionWithSemaforo(insertRes.rows[0]);

        res.status(201).json({
            ok: true,
            mensaje: 'Obligación financiera registrada en el sistema.',
            obligacion: nuevaObligacion
        });
    } catch (error) {
        console.error('Error en POST /api/obligaciones:', error);
        res.status(500).json({ ok: false, mensaje: 'Error interno al registrar la obligación.' });
    }
});

// POST /api/obligaciones/:id/pagar (Registro de pago con comprobante y control de inmutabilidad)
router.post('/:id/pagar', upload.single('comprobante'), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { nro_operacion, fecha_pago } = req.body;

        // Comprobar estado previo
        const findRes = await db.query('SELECT * FROM obligaciones WHERE id = $1', [id]);
        const actual = (findRes.rows || []).find(o => o.id === id);

        if (!actual) {
            return res.status(404).json({ ok: false, mensaje: 'Obligación no encontrada.' });
        }

        if (actual.estado === 'pagado') {
            return res.status(400).json({ ok: false, mensaje: 'Esta obligación ya se encuentra liquidada y cuenta con comprobante archivado.' });
        }

        if (actual.estado === 'anulado') {
            return res.status(400).json({ ok: false, mensaje: 'No se puede ejecutar el pago de una obligación que ha sido anulada.' });
        }

        if (!req.file) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Es obligatorio adjuntar el archivo digital del voucher o comprobante de transferencia bancaria.'
            });
        }

        if (!nro_operacion || nro_operacion.trim() === '') {
            return res.status(400).json({
                ok: false,
                mensaje: 'Debe ingresar el código de operación o trazabilidad bancaria.'
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

        const pagada = enrichObligacionWithSemaforo(updateRes.rows[0]);

        res.json({
            ok: true,
            mensaje: 'Pago certificado y archivado exitosamente.',
            obligacion: pagada
        });
    } catch (error) {
        console.error('Error en POST /api/obligaciones/:id/pagar:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al registrar el pago: ' + error.message });
    }
});

// POST /api/obligaciones/:id/anular (Manejo de Error Humano: Anulación formal con motivo)
router.post('/:id/anular', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { motivo } = req.body;

        const findRes = await db.query('SELECT * FROM obligaciones WHERE id = $1', [id]);
        const actual = (findRes.rows || []).find(o => o.id === id);

        if (!actual) {
            return res.status(404).json({ ok: false, mensaje: 'Obligación no encontrada.' });
        }

        if (actual.estado === 'pagado') {
            return res.status(400).json({
                ok: false,
                mensaje: 'No es posible anular una obligación ya liquidada. Requiere procedimiento de nota de crédito contable.'
            });
        }

        const motivoFinal = (motivo && motivo.trim() !== '') ? motivo.trim() : 'Corrección por error de digitación';

        const updateSql = `
            UPDATE obligaciones 
            SET estado = 'anulado',
                motivo_anulacion = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;

        const updateRes = await db.query(updateSql, [motivoFinal, id]);
        const anulada = enrichObligacionWithSemaforo(updateRes.rows[0]);

        res.json({
            ok: true,
            mensaje: 'Obligación anulada correctamente en el libro de compromisos.',
            obligacion: anulada
        });
    } catch (error) {
        console.error('Error en anular obligación:', error);
        res.status(500).json({ ok: false, mensaje: 'Error interno al anular la obligación.' });
    }
});

module.exports = router;
