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

        // Filtrar obligaciones del mes y año consultado
        const obligacionesMes = todas.map(o => ({
            ...o,
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

        // Desglose por categoría
        const categoriasTotal = {
            servicio: 0,
            impuesto: 0,
            proveedores: 0,
            prestamo: 0
        };

        obligacionesMes.forEach(item => {
            const monto = parseFloat(item.monto) || 0;
            totalGastosMes += monto;

            // Desglose categoría
            const cat = (item.categoria || '').toLowerCase();
            if (categoriasTotal[cat] !== undefined) {
                categoriasTotal[cat] += monto;
            }

            if (item.estado === 'pagado') {
                totalPagado += monto;
                cantPagados++;
            } else {
                // Calcular días restantes
                const [y, m, d] = (item.fecha_vencimiento || '').split('-').map(Number);
                const fVenc = new Date(y, m - 1, d);
                fVenc.setHours(0, 0, 0, 0);

                const diffDias = Math.round((fVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDias < 0) {
                    // Vencido
                    cantVencidos++;
                    totalRiesgoMora += monto;
                } else if (diffDias <= 3) {
                    // Por vencer (<= 3 días)
                    cantPorVencer++;
                    totalRiesgoMora += monto;
                } else {
                    // Programado normal (> 3 días)
                    cantProgramados++;
                    totalPendiente += monto;
                }
            }
        });

        // Porcentaje pagado
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
                en_alerta: cantVencidos + cantPorVencer
            },
            por_categoria: categoriasTotal
        });
    } catch (error) {
        console.error('Error en /api/dashboard/kpis:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al calcular los KPIs del dashboard.' });
    }
});

module.exports = router;
