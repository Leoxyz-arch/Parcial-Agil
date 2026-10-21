const express = require('express');
const router = express.Router();
const db = require('../db');

function formatDateISO(val) {
    if (!val) return '';
    if (val instanceof Date) {
        return val.toISOString().split('T')[0];
    }
    return String(val).split('T')[0];
}

// GET /api/dashboard/kpis?mes=10&anio=2026
router.get('/kpis', async (req, res) => {
    try {
        const hoy = new Date();
        const currentMonth = hoy.getMonth() + 1;
        const currentYear = hoy.getFullYear();

        const mes = req.query.mes ? parseInt(req.query.mes, 10) : currentMonth;
        const anio = req.query.anio ? parseInt(req.query.anio, 10) : currentYear;

        const result = await db.query('SELECT * FROM obligaciones');
        const todas = result.rows || [];

        hoy.setHours(0, 0, 0, 0);

        // Filtrar obligaciones del mes y año consultado (excluyendo anuladas de los cálculos monetarios)
        const obligacionesMes = todas.map(o => ({
            ...o,
            tipo_comprobante: o.tipo_comprobante || 'Factura Electrónica',
            ruc_beneficiario: o.ruc_beneficiario || 'No especificado',
            fecha_vencimiento: formatDateISO(o.fecha_vencimiento),
            fecha_emision: formatDateISO(o.fecha_emision),
            fecha_pago: formatDateISO(o.fecha_pago)
        })).filter(o => {
            const parts = (o.fecha_vencimiento || '').split('-');
            const oYear = parseInt(parts[0], 10);
            const oMonth = parseInt(parts[1], 10);
            return oMonth === mes && oYear === anio;
        });

        let totalGastosMes = 0;
        let totalPagado = 0;
        let totalPendiente = 0;
        let totalRiesgoMora = 0;

        let cantTotal = obligacionesMes.length;
        let cantPagados = 0;
        let cantVencidos = 0;
        let cantPorVencer = 0;
        let cantProgramados = 0;
        let cantAnulados = 0;

        const categoriasTotal = {
            servicio: 0,
            impuesto: 0,
            proveedores: 0,
            prestamo: 0
        };

        obligacionesMes.forEach(item => {
            if (item.estado === 'anulado') {
                cantAnulados++;
                return; // No computa pasivos financieros
            }

            const monto = parseFloat(item.monto) || 0;
            totalGastosMes += monto;

            const cat = (item.categoria || '').toLowerCase();
            if (categoriasTotal[cat] !== undefined) {
                categoriasTotal[cat] += monto;
            }

            if (item.estado === 'pagado') {
                totalPagado += monto;
                cantPagados++;
            } else {
                const [y, m, d] = (item.fecha_vencimiento || '').split('-').map(Number);
                const fVenc = new Date(y, m - 1, d);
                fVenc.setHours(0, 0, 0, 0);

                const diffDias = Math.round((fVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDias < 0) {
                    cantVencidos++;
                    totalRiesgoMora += monto;
                } else if (diffDias <= 3) {
                    cantPorVencer++;
                    totalRiesgoMora += monto;
                } else {
                    cantProgramados++;
                    totalPendiente += monto;
                }
            }
        });

        const porcentajePagado = totalGastosMes > 0 
            ? Math.round((totalPagado / totalGastosMes) * 100) 
            : 0;

        res.json({
            ok: true,
            periodo: { mes, anio },
            kpis: {
                total_gastos_mes: totalGastosMes,
                total_pagado: totalPagado,
                total_pendiente: totalPendiente,
                total_riesgo_mora: totalRiesgoMora,
                porcentaje_pagado: porcentajePagado
            },
            conteos: {
                total: cantTotal,
                pagados: cantPagados,
                vencidos: cantVencidos,
                por_vencer: cantPorVencer,
                programados: cantProgramados,
                anulados: cantAnulados,
                en_alerta: cantVencidos + cantPorVencer
            },
            por_categoria: categoriasTotal
        });
    } catch (error) {
        console.error('Error en /api/dashboard/kpis:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al calcular los KPIs del dashboard.' });
    }
});

// GET /api/dashboard/export/csv?mes=10&anio=2026 (Exportación contable legal para el Gerente)
router.get('/export/csv', async (req, res) => {
    try {
        const { mes, anio } = req.query;
        const result = await db.query('SELECT * FROM obligaciones ORDER BY fecha_vencimiento ASC');
        let list = result.rows || [];

        if (mes) {
            const m = parseInt(mes, 10);
            list = list.filter(o => parseInt(formatDateISO(o.fecha_vencimiento).split('-')[1], 10) === m);
        }
        if (anio) {
            const a = parseInt(anio, 10);
            list = list.filter(o => parseInt(formatDateISO(o.fecha_vencimiento).split('-')[0], 10) === a);
        }

        // Generar formato CSV con BOM UTF-8 para apertura directa en Excel
        let csv = '\uFEFF';
        csv += 'ID;Categoria;Tipo Comprobante;Beneficiario / Proveedor;RUC / Identificador;Concepto / Descripcion;Monto (PEN);Emision;Vencimiento;Estado;Fecha Pago;Nro Operacion\n';

        list.forEach(o => {
            const row = [
                o.id,
                o.categoria,
                `"${(o.tipo_comprobante || 'Factura').replace(/"/g, '""')}"`,
                `"${(o.beneficiario || '').replace(/"/g, '""')}"`,
                `"${o.ruc_beneficiario || 'S/N'}"`,
                `"${(o.descripcion || '').replace(/"/g, '""')}"`,
                parseFloat(o.monto || 0).toFixed(2),
                formatDateISO(o.fecha_emision),
                formatDateISO(o.fecha_vencimiento),
                o.estado,
                formatDateISO(o.fecha_pago) || 'N/A',
                `"${o.nro_operacion || 'N/A'}"`
            ];
            csv += row.join(';') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Reporte_Obligaciones_${anio || 'Periodo'}_${mes || 'Mes'}.csv"`);
        res.send(csv);
    } catch (err) {
        console.error('Error al exportar CSV:', err);
        res.status(500).json({ ok: false, mensaje: 'Error al exportar reporte contable.' });
    }
});

module.exports = router;
