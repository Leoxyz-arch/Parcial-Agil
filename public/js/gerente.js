// gerente.js - Módulo de Supervisión Ejecutiva y Auditoría del Gerente

window.GerenteModule = {
    obligaciones: [],
    paginaActual: 1,
    ITEMS_POR_PAGINA: 15,

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
        const filtroEst = document.getElementById('filtro-estado-gerente');
        const btnExportCsv = document.getElementById('btn-export-csv');
        const buscador = document.getElementById('buscador-gerente');

        const resetYcargar = () => {
            GerenteModule.paginaActual = 1;
            GerenteModule.cargarDashboard();
        };

        const resetYfiltrar = () => {
            GerenteModule.paginaActual = 1;
            GerenteModule.renderTablaAuditoria();
        };

        if (btnConsultar) btnConsultar.onclick = resetYcargar;
        if (filtroCat) filtroCat.onchange = resetYfiltrar;
        if (filtroEst) filtroEst.onchange = resetYfiltrar;

        // Paginación Gerente
        const btnPrev = document.getElementById('btn-prev-gerente');
        const btnNext = document.getElementById('btn-next-gerente');
        if (btnPrev) {
            btnPrev.onclick = () => {
                if (GerenteModule.paginaActual > 1) {
                    GerenteModule.paginaActual--;
                    GerenteModule.renderTablaAuditoria();
                }
            };
        }
        if (btnNext) {
            btnNext.onclick = () => {
                const totalFiltradas = GerenteModule.getFiltradas().length;
                const maxPag = Math.ceil(totalFiltradas / GerenteModule.ITEMS_POR_PAGINA) || 1;
                if (GerenteModule.paginaActual < maxPag) {
                    GerenteModule.paginaActual++;
                    GerenteModule.renderTablaAuditoria();
                }
            };
        }

        if (btnExportCsv) {
            btnExportCsv.onclick = () => {
                const mes = document.getElementById('gerente-mes').value;
                const anio = document.getElementById('gerente-anio').value;
                window.Toast.info('Descargando libro de compromisos y auditoría en formato CSV...', 3000);
                window.location.href = API.getExportCsvUrl(mes, anio);
            };
        }

        if (buscador) {
            let timeoutId = null;
            buscador.oninput = () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    GerenteModule.paginaActual = 1;
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
            window.Toast.error('Error de sincronización con el panel gerencial.');
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

        // Alerta si hay riesgo de mora
        const badgeCritico = document.getElementById('badge-critico-kpi');
        if (kpis.total_riesgo_mora > 0) {
            badgeCritico.textContent = `${conteos.en_alerta} En Riesgo`;
            badgeCritico.className = 'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white text-rose-700 shadow-2xs';
        } else {
            badgeCritico.textContent = 'Al día';
            badgeCritico.className = 'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white text-emerald-700 shadow-2xs';
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

    getFiltradas: () => {
        const filtroCat = document.getElementById('filtro-categoria-gerente');
        const catVal = filtroCat ? filtroCat.value : 'todas';
        const selectEst = document.getElementById('filtro-estado-gerente');
        const filtroEst = selectEst ? selectEst.value : 'pagado';
        const buscador = document.getElementById('buscador-gerente');
        const q = buscador ? buscador.value.trim().toLowerCase() : '';

        let filtradas = GerenteModule.obligaciones;

        if (filtroEst && filtroEst !== 'todos') {
            filtradas = filtradas.filter(o => o.estado === filtroEst);
        }

        if (catVal && catVal !== 'todas') {
            filtradas = filtradas.filter(o => o.categoria.toLowerCase() === catVal.toLowerCase());
        }

        if (q) {
            filtradas = filtradas.filter(o =>
                (o.descripcion || '').toLowerCase().includes(q) ||
                (o.beneficiario || '').toLowerCase().includes(q) ||
                (o.ruc_beneficiario || '').toLowerCase().includes(q) ||
                (o.nro_operacion || '').toLowerCase().includes(q)
            );
        }

        return filtradas;
    },

    renderTablaAuditoria: () => {
        const tbody = document.getElementById('tabla-obligaciones-gerente');
        tbody.innerHTML = '';

        const filtradas = GerenteModule.getFiltradas();
        const totalItems = filtradas.length;
        const totalPaginas = Math.ceil(totalItems / GerenteModule.ITEMS_POR_PAGINA) || 1;
        if (GerenteModule.paginaActual > totalPaginas) {
            GerenteModule.paginaActual = totalPaginas;
        }

        const infoPaginacion = document.getElementById('info-paginacion-gerente');
        const badgePagina = document.getElementById('badge-pagina-gerente');
        const btnPrev = document.getElementById('btn-prev-gerente');
        const btnNext = document.getElementById('btn-next-gerente');

        if (totalItems === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-10 text-center text-slate-400">
                        <i data-lucide="folder-search" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                        <p class="text-xs">No se encontraron registros de auditoría en este periodo.</p>
                    </td>
                </tr>
            `;
            if (infoPaginacion) infoPaginacion.textContent = 'Mostrando 0';
            if (badgePagina) badgePagina.textContent = '1 / 1';
            if (btnPrev) btnPrev.disabled = true;
            if (btnNext) btnNext.disabled = true;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        const inicio = (GerenteModule.paginaActual - 1) * GerenteModule.ITEMS_POR_PAGINA;
        const fin = Math.min(inicio + GerenteModule.ITEMS_POR_PAGINA, totalItems);
        const itemsPagina = filtradas.slice(inicio, fin);

        if (infoPaginacion) {
            infoPaginacion.textContent = `Mostrando ${inicio + 1} - ${fin} de ${totalItems}`;
        }
        if (badgePagina) {
            badgePagina.textContent = `${GerenteModule.paginaActual} / ${totalPaginas}`;
        }
        if (btnPrev) btnPrev.disabled = GerenteModule.paginaActual <= 1;
        if (btnNext) btnNext.disabled = GerenteModule.paginaActual >= totalPaginas;

        itemsPagina.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition-subtle border-b border-slate-100 cursor-pointer';
            tr.onclick = () => {
                if (window.AsistenteModule && window.AsistenteModule.abrirDetalle) {
                    window.AsistenteModule.abrirDetalle(item.id);
                }
            };

            // Etiquetas sólidas de alto contraste con iconos simbólicos
            let semaforoHtml = '';
            if (item.estado === 'pagado') {
                semaforoHtml = '<span class="status-pill status-pagado"><i data-lucide="check" class="w-3.5 h-3.5"></i><span>Pagado</span></span>';
            } else if (item.estado === 'anulado') {
                semaforoHtml = '<span class="status-pill status-anulado"><i data-lucide="ban" class="w-3.5 h-3.5"></i><span>Anulado</span></span>';
            } else if (item.semaforo.codigo === 'vencido') {
                semaforoHtml = '<span class="status-pill status-vencido"><i data-lucide="alert-octagon" class="w-3.5 h-3.5"></i><span>Vencido</span></span>';
            } else if (item.semaforo.codigo === 'programado') {
                semaforoHtml = '<span class="status-pill status-programado"><i data-lucide="calendar" class="w-3.5 h-3.5"></i><span>Programado</span></span>';
            } else {
                semaforoHtml = '<span class="status-pill status-por-pagar"><i data-lucide="clock" class="w-3.5 h-3.5"></i><span>Por Pagar</span></span>';
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
                <td class="font-medium text-slate-900 max-w-sm truncate text-[14.5px]" title="${item.descripcion}">
                    ${item.descripcion}
                </td>
                <td><span class="chip-category capitalize">${item.categoria}</span></td>
                <td class="font-mono-numbers text-[13.5px] text-slate-600">${item.fecha_vencimiento}</td>
                <td class="text-right font-mono-numbers font-semibold text-[15px] text-slate-900">
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
            window.Toast.warning('Esta obligación aún no cuenta con comprobante de pago digital adjunto.');
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

        if (item.comprobante_tipo === 'pdf' || (item.comprobante_url && item.comprobante_url.endsWith('.pdf'))) {
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
