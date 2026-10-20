// asistente.js - Módulo de Gestión Operativa del Asistente

window.AsistenteModule = {
    obligaciones: [],

    init: async () => {
        AsistenteModule.bindEvents();
        await AsistenteModule.cargarObligaciones();
    },

    bindEvents: () => {
        // Filtros y Buscador en tiempo real
        const filtroCat = document.getElementById('filtro-categoria-asistente');
        const filtroEst = document.getElementById('filtro-estado-asistente');
        const btnRefresh = document.getElementById('btn-refresh-asistente');
        const buscador = document.getElementById('buscador-asistente');

        if (filtroCat) filtroCat.onchange = () => AsistenteModule.cargarObligaciones();
        if (filtroEst) filtroEst.onchange = () => AsistenteModule.cargarObligaciones();
        if (btnRefresh) btnRefresh.onclick = () => AsistenteModule.cargarObligaciones();
        if (buscador) {
            let timeoutId = null;
            buscador.oninput = () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    AsistenteModule.cargarObligaciones();
                }, 200);
            };
        }

        // Modal Crear Obligación
        const btnOpenCrear = document.getElementById('btn-open-modal-crear');
        const modalCrear = document.getElementById('modal-crear-obligacion');
        const formCrear = document.getElementById('form-crear-obligacion');
        const selectCatCrear = document.getElementById('crear-categoria');
        const containerCuota = document.getElementById('container-cuota-prestamo');

        if (btnOpenCrear) {
            btnOpenCrear.onclick = () => {
                formCrear.reset();
                const hoyStr = new Date().toISOString().split('T')[0];
                document.getElementById('crear-emision').value = hoyStr;
                document.getElementById('crear-vencimiento').value = hoyStr;
                containerCuota.classList.add('hidden');
                modalCrear.classList.remove('hidden');
            };
        }

        if (selectCatCrear) {
            selectCatCrear.onchange = (e) => {
                const tipoComp = document.getElementById('crear-tipo-comprobante');
                if (e.target.value === 'prestamo') {
                    containerCuota.classList.remove('hidden');
                    if (tipoComp) tipoComp.value = 'Liquidación de Crédito';
                } else if (e.target.value === 'impuesto') {
                    containerCuota.classList.add('hidden');
                    if (tipoComp) tipoComp.value = 'Declaración Jurada PDT';
                } else if (e.target.value === 'servicio') {
                    containerCuota.classList.add('hidden');
                    if (tipoComp) tipoComp.value = 'Recibo Servicios Públicos';
                } else {
                    containerCuota.classList.add('hidden');
                    if (tipoComp) tipoComp.value = 'Factura Electrónica';
                }
            };
        }

        if (formCrear) {
            formCrear.onsubmit = async (e) => {
                e.preventDefault();
                const categoria = document.getElementById('crear-categoria').value;
                const tipo_comprobante = document.getElementById('crear-tipo-comprobante').value;
                const descripcion = document.getElementById('crear-descripcion').value.trim();
                const beneficiario = document.getElementById('crear-beneficiario').value.trim();
                const ruc_beneficiario = document.getElementById('crear-ruc').value.trim();
                const monto = parseFloat(document.getElementById('crear-monto').value);
                const fecha_emision = document.getElementById('crear-emision').value;
                const fecha_vencimiento = document.getElementById('crear-vencimiento').value;
                const cuota_info = categoria === 'prestamo' ? document.getElementById('crear-cuota').value.trim() : null;

                // Validación de coherencia temporal (Prevención de Error Humano)
                if (fecha_vencimiento < fecha_emision) {
                    Toast.error('La fecha de vencimiento no puede ser anterior a la fecha de emisión.');
                    return;
                }

                if (isNaN(monto) || monto <= 0) {
                    Toast.error('El importe debe ser mayor a cero.');
                    return;
                }

                try {
                    const res = await API.crearObligacion({
                        categoria,
                        tipo_comprobante,
                        descripcion,
                        beneficiario,
                        ruc_beneficiario,
                        monto,
                        fecha_emision,
                        fecha_vencimiento,
                        cuota_info
                    });

                    if (res.ok) {
                        modalCrear.classList.add('hidden');
                        Toast.success('Obligación registrada con éxito en el sistema.');
                        await AsistenteModule.cargarObligaciones();
                    } else {
                        Toast.error(res.mensaje || 'Error al registrar la obligación.');
                    }
                } catch (err) {
                    Toast.error('Error de conexión con el servidor.');
                }
            };
        }

        // Modal Registrar Pago con Evidencia
        const modalPagar = document.getElementById('modal-pagar-obligacion');
        const formPagar = document.getElementById('form-pagar-obligacion');
        const inputArchivo = document.getElementById('pagar-archivo');
        const previewPlaceholder = document.getElementById('preview-placeholder');
        const previewContainer = document.getElementById('preview-container');
        const previewImg = document.getElementById('preview-img');
        const previewFilename = document.getElementById('preview-filename');

        if (inputArchivo) {
            inputArchivo.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    previewPlaceholder.classList.add('hidden');
                    previewContainer.classList.remove('hidden');
                    previewFilename.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (re) => {
                            previewImg.src = re.target.result;
                            previewImg.classList.remove('hidden');
                        };
                        reader.readAsDataURL(file);
                    } else {
                        previewImg.classList.add('hidden');
                    }
                }
            };
        }

        if (formPagar) {
            formPagar.onsubmit = async (e) => {
                e.preventDefault();
                const id = document.getElementById('pagar-id').value;
                const fecha_pago = document.getElementById('pagar-fecha').value;
                const nro_operacion = document.getElementById('pagar-nro-operacion').value.trim();
                const file = inputArchivo.files[0];

                if (!file) {
                    Toast.warning('Es obligatorio adjuntar el voucher bancario o PDF.');
                    return;
                }

                if (!nro_operacion) {
                    Toast.warning('Debe ingresar el número de operación o referencia bancaria.');
                    return;
                }

                const formData = new FormData();
                formData.append('fecha_pago', fecha_pago);
                formData.append('nro_operacion', nro_operacion);
                formData.append('comprobante', file);

                const btnSubmit = document.getElementById('btn-submit-pago');
                btnSubmit.disabled = true;
                btnSubmit.textContent = 'Certificando pago...';

                try {
                    const res = await API.pagarObligacion(id, formData);
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i><span>Certificar Pago al 100%</span>`;

                    if (res.ok) {
                        modalPagar.classList.add('hidden');
                        formPagar.reset();
                        previewPlaceholder.classList.remove('hidden');
                        previewContainer.classList.add('hidden');
                        Toast.success('Pago liquidado y comprobante archivado correctamente.');
                        await AsistenteModule.cargarObligaciones();
                    } else {
                        Toast.error(res.mensaje || 'Error al procesar el pago.');
                    }
                } catch (err) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = `Certificar Pago al 100%`;
                    Toast.error('Error de comunicación con el servidor.');
                }
            };
        }

        // Modal Anular Obligación (Manejo de Error Humano)
        const modalAnular = document.getElementById('modal-anular-obligacion');
        const formAnular = document.getElementById('form-anular-obligacion');
        if (formAnular) {
            formAnular.onsubmit = async (e) => {
                e.preventDefault();
                const id = document.getElementById('anular-id').value;
                const motivo = document.getElementById('anular-motivo').value.trim();

                try {
                    const res = await API.anularObligacion(id, motivo);
                    if (res.ok) {
                        modalAnular.classList.add('hidden');
                        Toast.info('Obligación anulada y retirada de los pasivos exigibles.');
                        await AsistenteModule.cargarObligaciones();
                    } else {
                        Toast.error(res.mensaje || 'Error al anular la obligación.');
                    }
                } catch (err) {
                    Toast.error('Error de conexión al anular.');
                }
            };
        }
    },

    cargarObligaciones: async () => {
        const filtroCat = document.getElementById('filtro-categoria-asistente').value;
        const filtroEst = document.getElementById('filtro-estado-asistente').value;
        const buscador = document.getElementById('buscador-asistente');
        const q = buscador ? buscador.value.trim() : '';

        try {
            const res = await API.getObligaciones({
                categoria: filtroCat,
                estado: filtroEst,
                q
            });

            if (res.ok) {
                AsistenteModule.obligaciones = res.obligaciones || [];
                AsistenteModule.renderTabla();
                AsistenteModule.actualizarContadores();
            }
        } catch (error) {
            console.error('Error cargando obligaciones:', error);
            Toast.error('No se pudo sincronizar el listado con el servidor.');
        }
    },

    actualizarContadores: () => {
        let vencidos = 0;
        let porVencer = 0;
        let programados = 0;
        let pagados = 0;

        AsistenteModule.obligaciones.forEach(o => {
            if (o.estado === 'anulado') return;
            if (o.estado === 'pagado') pagados++;
            else if (o.semaforo.codigo === 'vencido') vencidos++;
            else if (o.semaforo.codigo === 'por_vencer') porVencer++;
            else programados++;
        });

        document.getElementById('asistente-count-vencidos').textContent = vencidos;
        document.getElementById('asistente-count-porvencer').textContent = porVencer;
        document.getElementById('asistente-count-programados').textContent = programados;
        document.getElementById('asistente-count-pagados').textContent = pagados;
    },

    renderTabla: () => {
        const tbody = document.getElementById('tabla-obligaciones-asistente');
        tbody.innerHTML = '';

        if (AsistenteModule.obligaciones.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="py-12 text-center text-slate-400">
                        <i data-lucide="search-x" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                        <p class="font-medium text-xs">No se encontraron obligaciones con los criterios especificados.</p>
                    </td>
                </tr>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        AsistenteModule.obligaciones.forEach(item => {
            const tr = document.createElement('tr');
            
            // Clase de semáforo en borde para Light Mode
            let borderClass = 'border-programado';
            if (item.estado === 'anulado') borderClass = 'border-anulado opacity-60 bg-slate-50';
            else if (item.estado === 'pagado') borderClass = 'border-pagado bg-emerald-50/20';
            else if (item.semaforo.codigo === 'vencido') borderClass = 'border-mora-critica bg-rose-50/30';
            else if (item.semaforo.codigo === 'por_vencer') borderClass = 'border-por-vencer bg-amber-50/30';

            tr.className = `hover:bg-slate-50 transition-subtle border-b border-slate-100 ${borderClass}`;

            // Badges Categoría para Light Mode
            const catBadges = {
                servicio: 'bg-blue-50 text-blue-700 border-blue-200',
                impuesto: 'bg-amber-50 text-amber-800 border-amber-200',
                proveedores: 'bg-purple-50 text-purple-700 border-purple-200',
                prestamo: 'bg-emerald-50 text-emerald-800 border-emerald-200'
            };
            const catBadge = catBadges[item.categoria] || 'bg-slate-100 text-slate-700 border-slate-200';

            // Semáforo badge classes en Light Mode
            let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
            if (item.estado === 'pagado') badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            else if (item.estado === 'anulado') badgeStyle = 'bg-slate-100 text-slate-400 border-slate-200 line-through';
            else if (item.semaforo.codigo === 'vencido') badgeStyle = 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
            else if (item.semaforo.codigo === 'por_vencer') badgeStyle = 'bg-amber-50 text-amber-900 border-amber-200 font-semibold';

            const semaforoHtml = `
                <div class="inline-flex flex-col">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] border ${badgeStyle}">
                        ${item.semaforo.alerta_critica && item.estado !== 'anulado' ? '<i data-lucide="alert-triangle" class="w-3 h-3 text-rose-600"></i>' : ''}
                        <span>${item.semaforo.etiqueta}</span>
                    </span>
                    <span class="text-[10px] text-slate-500 mt-0.5">${item.semaforo.detalle_tiempo}</span>
                </div>
            `;

            // Botones de acción
            let actionHtml = '';
            if (item.estado === 'pagado') {
                actionHtml = `
                    <button type="button" onclick="window.GerenteModule.abrirVisorComprobante(${item.id})"
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium transition-subtle shadow-xs" title="Ver comprobante archivado">
                        <i data-lucide="file-check-2" class="w-3.5 h-3.5"></i>
                        <span>Auditar</span>
                    </button>
                `;
            } else if (item.estado === 'anulado') {
                actionHtml = `
                    <span class="text-[11px] text-slate-400 font-mono">ANULADO</span>
                `;
            } else {
                actionHtml = `
                    <div class="inline-flex items-center gap-1">
                        <button type="button" onclick="window.AsistenteModule.abrirModalPagar(${item.id})"
                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium shadow-xs transition-subtle" title="Registrar voucher de pago">
                            <i data-lucide="receipt" class="w-3.5 h-3.5"></i>
                            <span>Pagar</span>
                        </button>
                        <button type="button" onclick="window.AsistenteModule.abrirModalAnular(${item.id})"
                            class="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-subtle" title="Anular por error de digitación">
                            <i data-lucide="ban" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                `;
            }

            // Legal badge en Light Mode
            const legalBadge = item.advertencia_legal ? `
                <div class="mt-1 flex items-center gap-1 text-[10px] text-rose-700 font-medium">
                    <i data-lucide="scale" class="w-3 h-3 flex-shrink-0"></i>
                    <span>${item.advertencia_legal}</span>
                </div>
            ` : '';

            tr.innerHTML = `
                <td class="py-3 px-3">${semaforoHtml}</td>
                <td class="py-3 px-3">
                    <div class="flex flex-col gap-0.5">
                        <span class="w-fit px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${catBadge}">
                            ${item.categoria}
                        </span>
                        <span class="text-[11px] text-slate-500">${item.tipo_comprobante}</span>
                    </div>
                </td>
                <td class="py-3 px-3">
                    <p class="font-semibold text-slate-900 text-xs">${item.descripcion}</p>
                    ${item.cuota_info ? `<span class="inline-block mt-0.5 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">${item.cuota_info}</span>` : ''}
                    ${legalBadge}
                </td>
                <td class="py-3 px-3">
                    <p class="font-medium text-slate-800 text-xs">${item.beneficiario}</p>
                    <p class="text-[10px] text-slate-500 font-mono-numbers">RUC: ${item.ruc_beneficiario || 'S/N'}</p>
                </td>
                <td class="py-3 px-3 font-mono-numbers text-xs ${item.semaforo.alerta_critica && item.estado !== 'anulado' ? 'text-rose-700 font-bold' : 'text-slate-600'}">
                    ${item.fecha_vencimiento}
                </td>
                <td class="py-3 px-3 text-right font-mono-numbers font-bold text-slate-900 text-xs">
                    S/ ${item.monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td class="py-3 px-3 text-center">${actionHtml}</td>
            `;

            tbody.appendChild(tr);
        });

        if (window.lucide) window.lucide.createIcons();
    },

    abrirModalPagar: (id) => {
        const item = AsistenteModule.obligaciones.find(o => o.id === id);
        if (!item) return;

        document.getElementById('pagar-id').value = item.id;
        document.getElementById('pagar-desc-resumen').textContent = item.descripcion;
        document.getElementById('pagar-benef-resumen').textContent = `${item.beneficiario} (RUC: ${item.ruc_beneficiario || 'S/N'})`;
        document.getElementById('pagar-monto-resumen').textContent = `S/ ${item.monto.toFixed(2)}`;
        document.getElementById('pagar-fecha').value = new Date().toISOString().split('T')[0];
        document.getElementById('pagar-nro-operacion').value = '';

        const previewPlaceholder = document.getElementById('preview-placeholder');
        const previewContainer = document.getElementById('preview-container');
        previewPlaceholder.classList.remove('hidden');
        previewContainer.classList.add('hidden');
        document.getElementById('pagar-archivo').value = '';

        document.getElementById('modal-pagar-obligacion').classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
    },

    abrirModalAnular: (id) => {
        const item = AsistenteModule.obligaciones.find(o => o.id === id);
        if (!item) return;

        document.getElementById('anular-id').value = item.id;
        document.getElementById('anular-concepto-resumen').textContent = `${item.descripcion} — S/ ${item.monto.toFixed(2)} (${item.beneficiario})`;
        document.getElementById('anular-motivo').value = '';

        document.getElementById('modal-anular-obligacion').classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
    }
};
