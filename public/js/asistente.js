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
            tr.className = 'hover:bg-slate-50 transition-subtle border-b border-slate-100 cursor-pointer';
            tr.onclick = () => AsistenteModule.abrirDetalle(item.id);

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

            // Concepto legible con detalles secundarios
            const cuotaText = item.cuota_info ? ` <span class="text-slate-500 font-mono text-xs">(${item.cuota_info})</span>` : '';
            const legalIndicator = item.advertencia_legal ? ` <span class="chip-legal ml-1" title="${item.advertencia_legal}"><i data-lucide="scale" class="w-3 h-3"></i><span>TIM</span></span>` : '';

            // Botones de acción compactos
            let actionHtml = '';
            if (item.estado === 'pagado') {
                actionHtml = `
                    <div class="inline-flex items-center gap-1 justify-center">
                        <button type="button" onclick="event.stopPropagation(); window.GerenteModule.abrirVisorComprobante(${item.id})"
                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-subtle" title="Ver comprobante auditado">
                            <i data-lucide="file-check-2" class="w-3.5 h-3.5 text-emerald-600"></i>
                            <span>Auditar</span>
                        </button>
                        <button type="button" onclick="event.stopPropagation(); window.AsistenteModule.abrirDetalle(${item.id})"
                            class="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-subtle" title="Ver ficha técnica">
                            <i data-lucide="info" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                `;
            } else if (item.estado === 'anulado') {
                actionHtml = `
                    <div class="inline-flex items-center gap-1 justify-center">
                        <span class="text-xs text-slate-400 font-mono">ANULADO</span>
                        <button type="button" onclick="event.stopPropagation(); window.AsistenteModule.abrirDetalle(${item.id})"
                            class="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-subtle" title="Ver motivo de anulación">
                            <i data-lucide="info" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                `;
            } else {
                actionHtml = `
                    <div class="inline-flex items-center gap-1 justify-center">
                        <button type="button" onclick="event.stopPropagation(); window.AsistenteModule.abrirModalPagar(${item.id})"
                            class="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-subtle shadow-2xs" title="Registrar pago">
                            Pagar
                        </button>
                        <button type="button" onclick="event.stopPropagation(); window.AsistenteModule.abrirDetalle(${item.id})"
                            class="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-subtle" title="Ver ficha técnica">
                            <i data-lucide="info" class="w-3.5 h-3.5"></i>
                        </button>
                        <button type="button" onclick="event.stopPropagation(); window.AsistenteModule.abrirModalAnular(${item.id})"
                            class="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-subtle" title="Anular obligación">
                            <i data-lucide="ban" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                `;
            }

            tr.innerHTML = `
                <td>${semaforoHtml}</td>
                <td class="font-medium text-slate-900 max-w-xs truncate text-sm" title="${item.descripcion}">
                    ${item.descripcion}${cuotaText}${legalIndicator}
                </td>
                <td class="text-slate-700 max-w-[180px] truncate text-xs" title="${item.beneficiario}">
                    ${item.beneficiario}
                </td>
                <td><span class="chip-category">${item.tipo_comprobante || 'Factura'}</span></td>
                <td class="font-mono-numbers text-slate-600 text-xs">${item.fecha_vencimiento}</td>
                <td class="text-right font-mono-numbers font-semibold text-slate-900 text-sm">
                    S/ ${item.monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td class="text-center">${actionHtml}</td>
            `;

            tbody.appendChild(tr);
        });

        if (window.lucide) window.lucide.createIcons();
    },

    abrirDetalle: (id) => {
        const item = AsistenteModule.obligaciones.find(o => o.id === id);
        if (!item) return;

        const modal = document.getElementById('modal-detalle-obligacion');
        if (!modal) return;

        let badgeHtml = '';
        if (item.estado === 'pagado') {
            badgeHtml = '<span class="status-pill status-pagado"><span class="status-pill-dot"></span>Pagado</span>';
        } else if (item.estado === 'anulado') {
            badgeHtml = '<span class="status-pill status-anulado"><span class="status-pill-dot"></span>Anulado</span>';
        } else if (item.semaforo.codigo === 'programado') {
            badgeHtml = '<span class="status-pill status-programado"><span class="status-pill-dot"></span>Programado</span>';
        } else {
            badgeHtml = '<span class="status-pill status-por-pagar"><span class="status-pill-dot"></span>Por Pagar</span>';
        }

        document.getElementById('detalle-estado-badge').innerHTML = badgeHtml;
        document.getElementById('detalle-semaforo-tiempo').textContent = item.semaforo ? item.semaforo.detalle_tiempo : '';
        document.getElementById('detalle-monto').textContent = `S/ ${(item.monto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('detalle-concepto').textContent = item.descripcion;
        document.getElementById('detalle-tipo-comprobante').textContent = item.tipo_comprobante || 'Factura Electrónica';
        document.getElementById('detalle-beneficiario').textContent = item.beneficiario;
        document.getElementById('detalle-ruc').textContent = item.ruc_beneficiario || 'No especificado (S/N)';
        document.getElementById('detalle-fecha-emision').textContent = item.fecha_emision || 'No registrada';
        document.getElementById('detalle-fecha-vencimiento').textContent = item.fecha_vencimiento;

        const containerCuota = document.getElementById('detalle-container-cuota');
        if (item.cuota_info) {
            containerCuota.classList.remove('hidden');
            document.getElementById('detalle-cuota').textContent = item.cuota_info;
        } else {
            containerCuota.classList.add('hidden');
        }

        const containerLegal = document.getElementById('detalle-container-legal');
        if (item.advertencia_legal) {
            containerLegal.classList.remove('hidden');
            document.getElementById('detalle-legal-texto').textContent = item.advertencia_legal;
        } else {
            containerLegal.classList.add('hidden');
        }

        const containerPago = document.getElementById('detalle-container-pago');
        if (item.estado === 'pagado') {
            containerPago.classList.remove('hidden');
            document.getElementById('detalle-fecha-pago').textContent = item.fecha_pago || 'No registrada';
            document.getElementById('detalle-nro-operacion').textContent = item.nro_operacion || 'Sin Nro.';
        } else {
            containerPago.classList.add('hidden');
        }

        const containerAnulacion = document.getElementById('detalle-container-anulacion');
        if (item.estado === 'anulado') {
            containerAnulacion.classList.remove('hidden');
            document.getElementById('detalle-motivo-anulacion').textContent = item.motivo_anulacion || 'Sin motivo registrado.';
        } else {
            containerAnulacion.classList.add('hidden');
        }

        modal.classList.remove('hidden');
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
