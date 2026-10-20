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
        const btnExportCsv = document.getElementById('btn-export-csv');
        const buscador = document.getElementById('buscador-gerente');

        if (btnConsultar) {
            btnConsultar.onclick = () => GerenteModule.cargarDashboard();
        }

        if (filtroCat) {
            filtroCat.onchange = () => GerenteModule.renderTablaAuditoria();
        }

        if (btnExportCsv) {
            btnExportCsv.onclick = () => {
                const mes = document.getElementById('gerente-mes').value;
                const anio = document.getElementById('gerente-anio').value;
                Toast.info('Descargando libro de compromisos y auditoría en formato CSV...', 3000);
                window.location.href = API.getExportCsvUrl(mes, anio);
            };
        }

        if (buscador) {
            let timeoutId = null;
            buscador.oninput = () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    GerenteModule.renderTablaAuditoria();
                }, 150);
            };
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
            Toast.error('Error de sincronización con el panel gerencial.');
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
            badgeCritico.textContent = `${conteos.en_alerta} En Riesgo`;
            badgeCritico.className = 'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300';
        } else {
            badgeCritico.textContent = 'Al día';
            badgeCritico.className = 'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300';
        }

        // Desglose por categorías
        const total = kpis.total_gastos_mes || 1;
        const renderCat = (catName, barId, montoId) => {
            const monto = por_categoria[catName] || 0;
            const barPct = Math.min(100, Math.round((monto / total) * 100));
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
        const buscador = document.getElementById('buscador-gerente');
        const q = buscador ? buscador.value.trim().toLowerCase() : '';

        tbody.innerHTML = '';

        let filtradas = GerenteModule.obligaciones;
        if (filtroCat && filtroCat !== 'todas') {
            filtradas = filtradas.filter(o => o.categoria.toLowerCase() === filtroCat.toLowerCase());
        }

        if (q) {
            filtradas = filtradas.filter(o =>
                (o.descripcion || '').toLowerCase().includes(q) ||
                (o.beneficiario || '').toLowerCase().includes(q) ||
                (o.ruc_beneficiario || '').toLowerCase().includes(q) ||
                (o.nro_operacion || '').toLowerCase().includes(q)
            );
        }

        if (filtradas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-10 text-center text-slate-400">
                        <i data-lucide="folder-search" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                        <p class="text-xs">No se encontraron registros de auditoría en este periodo.</p>
                    </td>
                </tr>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        filtradas.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition-subtle border-b border-slate-100 cursor-pointer';
            tr.onclick = () => {
                if (window.AsistenteModule && window.AsistenteModule.abrirDetalle) {
                    window.AsistenteModule.abrirDetalle(item.id);
                }
            };

            // Etiquetas literales solicitadas: Pagado (Verde), Programado (Azul), Por Pagar (Amarillo)
            let semaforoHtml = '';
            if (item.estado === 'pagado') {
                semaforoHtml = '<span class="status-pill status-pagado"><span class="status-pill-dot"></span>Pagado</span>';
            } else if (item.estado === 'anulado') {
                semaforoHtml = '<span class="status-pill status-anulado"><span class="status-pill-dot"></span>Anulado</span>';
            } else if (item.semaforo.codigo === 'programado') {
                semaforoHtml = '<span class="status-pill status-programado"><span class="status-pill-dot"></span>Programado</span>';
            } else {
                semaforoHtml = '<span class="status-pill status-por-pagar"><span class="status-pill-dot"></span>Por Pagar</span>';
            }

            let compHtml = '<span class="text-slate-400 font-mono text-xs">—</span>';
            if (item.estado === 'pagado') {
                compHtml = `
                    <button type="button" onclick="event.stopPropagation(); window.GerenteModule.abrirVisorComprobante(${item.id})"
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 transition-subtle text-xs font-medium" title="Auditar comprobante">
                        <i data-lucide="file-check-2" class="w-3.5 h-3.5 text-emerald-600"></i>
                        <span>Auditar</span>
                    </button>
                `;
            } else if (item.estado === 'anulado') {
                compHtml = '<span class="text-slate-400 font-mono text-xs">ANULADO</span>';
            }

            tr.innerHTML = `
                <td>${semaforoHtml}</td>
                <td class="font-medium text-slate-900 max-w-xs truncate text-sm" title="${item.descripcion}">
                    ${item.descripcion}
                </td>
                <td><span class="chip-category capitalize">${item.categoria}</span></td>
                <td class="font-mono-numbers text-xs text-slate-600">${item.fecha_vencimiento}</td>
                <td class="text-right font-mono-numbers font-semibold text-sm text-slate-900">
                    S/ ${item.monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td class="text-center">${compHtml}</td>
            `;

            tbody.appendChild(tr);
        });

        if (window.lucide) window.lucide.createIcons();
    },

    abrirVisorComprobante: async (id) => {
        let item = GerenteModule.obligaciones.find(o => o.id === id);
        if (!item && window.AsistenteModule) {
            item = window.AsistenteModule.obligaciones.find(o => o.id === id);
        }

        if (!item || !item.comprobante_url) {
            Toast.warning('Esta obligación aún no cuenta con comprobante de pago digital adjunto.');
            return;
        }

        const modal = document.getElementById('modal-visor-comprobante');
        const titulo = document.getElementById('visor-titulo');
        const subtitulo = document.getElementById('visor-subtitulo');
        const contenido = document.getElementById('visor-contenido');
        const opText = document.getElementById('visor-operacion');
        const fechaText = document.getElementById('visor-fecha');
        const btnDescargar = document.getElementById('visor-descargar');

        titulo.textContent = `Auditoría: ${item.descripcion}`;
        subtitulo.textContent = `${item.beneficiario} (RUC: ${item.ruc_beneficiario || 'S/N'}) • Monto: S/ ${item.monto.toFixed(2)}`;
        opText.textContent = item.nro_operacion || 'Sin registro';
        fechaText.textContent = item.fecha_pago || 'No registrada';
        btnDescargar.href = item.comprobante_url;

        if (item.comprobante_tipo === 'pdf') {
            contenido.innerHTML = `
                <iframe src="${item.comprobante_url}" class="w-full h-96 rounded border border-slate-200 bg-white"></iframe>
            `;
        } else {
            contenido.innerHTML = `
                <img src="${item.comprobante_url}" alt="Comprobante de Pago" class="max-h-[60vh] max-w-full rounded border border-slate-200 mx-auto object-contain bg-slate-50 p-2 shadow-xs">
            `;
        }

        modal.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
    }
};
