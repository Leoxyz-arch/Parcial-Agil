// gerente.js - Módulo de Supervisión Ejecutiva y Auditoría del Gerente

window.GerenteModule = {
    obligaciones: [],

    init: async () => {
        GerenteModule.setDefaultPeriod();
        GerenteModule.bindEvents();
        await GerenteModule.cargarDashboard();
    },

    setDefaultPeriod: () => {
        const hoy = new Date();
        const selMes = document.getElementById('gerente-mes');
        const selAnio = document.getElementById('gerente-anio');

        if (selMes) selMes.value = (hoy.getMonth() + 1).toString();
        if (selAnio) selAnio.value = hoy.getFullYear().toString();
    },

    bindEvents: () => {
        const btnConsultar = document.getElementById('btn-consultar-gerente');
        const filtroCat = document.getElementById('filtro-categoria-gerente');

        if (btnConsultar) {
            btnConsultar.onclick = () => GerenteModule.cargarDashboard();
        }

        if (filtroCat) {
            filtroCat.onchange = () => GerenteModule.renderTablaAuditoria();
        }
    },

    cargarDashboard: async () => {
        const mes = document.getElementById('gerente-mes').value;
        const anio = document.getElementById('gerente-anio').value;

        try {
            // 1. Obtener KPIs
            const resKpis = await API.getKpis(mes, anio);
            if (resKpis.ok) {
                GerenteModule.renderKpis(resKpis);
            }

            // 2. Obtener Obligaciones para la tabla de auditoría del periodo
            const resOblig = await API.getObligaciones({ mes, anio });
            if (resOblig.ok) {
                GerenteModule.obligaciones = resOblig.obligaciones || [];
                GerenteModule.renderTablaAuditoria();
            }
        } catch (error) {
            console.error('Error al cargar dashboard del gerente:', error);
        }
    },

    renderKpis: (data) => {
        const { kpis, por_categoria, conteos } = data;
        const formatMoney = (val) => `S/ ${(val || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // 4 KPIs Clave
        document.getElementById('kpi-total-gastos').textContent = formatMoney(kpis.total_gastos_mes);
        document.getElementById('kpi-total-pagado').textContent = formatMoney(kpis.total_pagado);
        document.getElementById('kpi-total-pendiente').textContent = formatMoney(kpis.total_pendiente);
        document.getElementById('kpi-total-riesgo-mora').textContent = formatMoney(kpis.total_riesgo_mora);

        // Barra de avance pagado
        const pct = kpis.porcentaje_pagado || 0;
        document.getElementById('kpi-porcentaje-pagado').textContent = `${pct}%`;
        document.getElementById('kpi-barra-progreso').style.width = `${pct}%`;

        // Alerta crítica si hay riesgo de mora
        const badgeCritico = document.getElementById('badge-critico-kpi');
        if (kpis.total_riesgo_mora > 0) {
            badgeCritico.textContent = `${conteos.en_alerta} En Alerta`;
            badgeCritico.className = 'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse';
        } else {
            badgeCritico.textContent = 'Al día';
            badgeCritico.className = 'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800';
        }

        // Desglose por categorías
        const total = kpis.total_gastos_mes || 1; // Evitar división por cero
        const renderCat = (catName, barId, montoId) => {
            const monto = por_categoria[catName] || 0;
            const barPct = Math.round((monto / total) * 100);
            document.getElementById(montoId).textContent = formatMoney(monto);
            document.getElementById(barId).style.width = `${barPct}%`;
        };

        renderCat('servicio', 'bar-cat-servicio', 'cat-monto-servicio');
        renderCat('impuesto', 'bar-cat-impuesto', 'cat-monto-impuesto');
        renderCat('proveedores', 'bar-cat-proveedores', 'cat-monto-proveedores');
        renderCat('prestamo', 'bar-cat-prestamo', 'cat-monto-prestamo');

        if (window.lucide) window.lucide.createIcons();
    },

    renderTablaAuditoria: () => {
        const tbody = document.getElementById('tabla-obligaciones-gerente');
        const filtroCat = document.getElementById('filtro-categoria-gerente').value;

        tbody.innerHTML = '';

        let filtradas = GerenteModule.obligaciones;
        if (filtroCat && filtroCat !== 'todas') {
            filtradas = filtradas.filter(o => o.categoria.toLowerCase() === filtroCat.toLowerCase());
        }

        if (filtradas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-6 text-center text-slate-400">
                        No hay obligaciones en el periodo seleccionado.
                    </td>
                </tr>
            `;
            return;
        }

        filtradas.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';

            // Semáforo badge
            const semaforoBadge = `
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${item.semaforo.clase_badge}">
                    ${item.semaforo.alerta_critica ? '⚠️ ' : ''}${item.semaforo.etiqueta}
                </span>
            `;

            // Botón voucher
            let compHtml = '<span class="text-slate-400 text-[11px]">Sin pago</span>';
            if (item.estado === 'pagado') {
                compHtml = `
                    <button type="button" onclick="window.GerenteModule.abrirVisorComprobante(${item.id})"
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition text-[11px] font-bold">
                        <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                        <span>Auditar Foto</span>
                    </button>
                `;
            }

            tr.innerHTML = `
                <td class="py-2.5 px-3">${semaforoBadge}</td>
                <td class="py-2.5 px-3">
                    <span class="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        ${item.categoria}
                    </span>
                </td>
                <td class="py-2.5 px-3">
                    <p class="font-bold text-slate-800">${item.descripcion}</p>
                    <p class="text-[10px] text-slate-600">${item.beneficiario} ${item.cuota_info ? `• ${item.cuota_info}` : ''}</p>
                </td>
                <td class="py-2.5 px-3 font-medium text-slate-600">${item.fecha_vencimiento}</td>
                <td class="py-2.5 px-3 text-right font-black text-slate-900">
                    S/ ${item.monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td class="py-2.5 px-3 text-center">${compHtml}</td>
            `;

            tbody.appendChild(tr);
        });

        if (window.lucide) window.lucide.createIcons();
    },

    abrirVisorComprobante: async (id) => {
        // Buscar en asistente u gerente
        let item = GerenteModule.obligaciones.find(o => o.id === id);
        if (!item && window.AsistenteModule) {
            item = window.AsistenteModule.obligaciones.find(o => o.id === id);
        }

        if (!item || !item.comprobante_url) {
            alert('No se encontró el comprobante para esta obligación.');
            return;
        }

        const modal = document.getElementById('modal-visor-comprobante');
        const titulo = document.getElementById('visor-titulo');
        const subtitulo = document.getElementById('visor-subtitulo');
        const contenido = document.getElementById('visor-contenido');
        const opText = document.getElementById('visor-operacion');
        const fechaText = document.getElementById('visor-fecha');
        const btnDescargar = document.getElementById('visor-descargar');

        titulo.textContent = `Voucher: ${item.descripcion}`;
        subtitulo.textContent = `${item.beneficiario} • Importe: S/ ${item.monto.toFixed(2)}`;
        opText.textContent = item.nro_operacion || 'No registrado';
        fechaText.textContent = item.fecha_pago || 'No registrada';
        btnDescargar.href = item.comprobante_url;

        // Renderizar según tipo
        if (item.comprobante_tipo === 'pdf') {
            contenido.innerHTML = `
                <iframe src="${item.comprobante_url}" class="w-full h-96 rounded-lg border border-slate-300"></iframe>
            `;
        } else {
            contenido.innerHTML = `
                <img src="${item.comprobante_url}" alt="Comprobante de Pago" class="max-h-[60vh] max-w-full rounded-xl shadow-lg border border-slate-200 mx-auto object-contain">
            `;
        }

        modal.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
    }
};
