// asistente.js - Módulo de Gestión Operativa del Asistente

window.AsistenteModule = {
    obligaciones: [],
    paginaActual: 1,
    ITEMS_POR_PAGINA: 15,

    init: async () => {
        const hoy = new Date();
        const selMes = document.getElementById('filtro-mes-asistente');
        const selAnio = document.getElementById('filtro-anio-asistente');
        if (selMes) selMes.value = (hoy.getMonth() + 1).toString();
        if (selAnio) selAnio.value = hoy.getFullYear().toString();

        AsistenteModule.bindEvents();
        await AsistenteModule.cargarObligaciones();
    },

    bindEvents: () => {
        // Filtros
        const filtroMes = document.getElementById('filtro-mes-asistente');
        const filtroAnio = document.getElementById('filtro-anio-asistente');
        const filtroCat = document.getElementById('filtro-categoria-asistente');
        const filtroEst = document.getElementById('filtro-estado-asistente');
        const btnRefresh = document.getElementById('btn-refresh-asistente');

        const resetYcargar = () => {
            AsistenteModule.paginaActual = 1;
            AsistenteModule.cargarObligaciones();
        };

        if (filtroMes) filtroMes.onchange = resetYcargar;
        if (filtroAnio) filtroAnio.onchange = resetYcargar;
        if (filtroCat) filtroCat.onchange = resetYcargar;
        if (filtroEst) filtroEst.onchange = resetYcargar;
        if (btnRefresh) btnRefresh.onclick = resetYcargar;

        // Botones Paginación Asistente
        const btnPrev = document.getElementById('btn-prev-asistente');
        const btnNext = document.getElementById('btn-next-asistente');
        if (btnPrev) {
            btnPrev.onclick = () => {
                if (AsistenteModule.paginaActual > 1) {
                    AsistenteModule.paginaActual--;
                    AsistenteModule.renderTabla();
                }
            };
        }
        if (btnNext) {
            btnNext.onclick = () => {
                const maxPag = Math.ceil(AsistenteModule.obligaciones.length / AsistenteModule.ITEMS_POR_PAGINA) || 1;
                if (AsistenteModule.paginaActual < maxPag) {
                    AsistenteModule.paginaActual++;
                    AsistenteModule.renderTabla();
                }
            };
        }

        // Modal Crear Obligación
        const btnOpenCrear = document.getElementById('btn-open-modal-crear');
        const modalCrear = document.getElementById('modal-crear-obligacion');
        const formCrear = document.getElementById('form-crear-obligacion');
        const selectCatCrear = document.getElementById('crear-categoria');
        const containerCuota = document.getElementById('container-cuota-prestamo');
        const modManual = document.getElementById('modalidad-manual');
        const modAuto = document.getElementById('modalidad-auto');
        const subManual = document.getElementById('subcontainer-cuota-manual');
        const subAuto = document.getElementById('subcontainer-cuota-auto');
        const inputMonto = document.getElementById('crear-monto');
        const inputInteres = document.getElementById('crear-interes');
        const inputNumCuotas = document.getElementById('crear-num-cuotas');
        const displayMontoCuota = document.getElementById('display-monto-cuota');
        const calcCapital = document.getElementById('calc-prestamo-capital');
        const calcTasaLbl = document.getElementById('calc-prestamo-tasa-lbl');
        const calcInteres = document.getElementById('calc-prestamo-interes');
        const calcTotal = document.getElementById('calc-prestamo-total');
        const calcDiaMesPreview = document.getElementById('calc-dia-mes-preview');
        const inputEmision = document.getElementById('crear-emision');
        const inputVencimiento = document.getElementById('crear-vencimiento');
        const lblEmision = document.getElementById('lbl-crear-emision');
        const lblVencimiento = document.getElementById('lbl-crear-vencimiento');
        const avisoCrear = document.getElementById('crear-aviso-inline');

        let timerAvisoCrear = null;
        const mostrarAvisoCrear = (msg, tipo = 'warning') => {
            if (!avisoCrear) return;
            const clases = {
                warning: 'bg-amber-50 text-amber-900 border-amber-200',
                error: 'bg-red-50 text-red-800 border-red-200',
                info: 'bg-blue-50 text-blue-800 border-blue-200',
                success: 'bg-emerald-50 text-emerald-800 border-emerald-200'
            };
            avisoCrear.className = `p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition ${clases[tipo] || clases.warning}`;
            avisoCrear.innerHTML = `<i data-lucide="info" class="w-4 h-4 shrink-0"></i><span>${msg}</span>`;
            avisoCrear.classList.remove('hidden');
            if (window.lucide) window.lucide.createIcons();
            if (timerAvisoCrear) clearTimeout(timerAvisoCrear);
            timerAvisoCrear = setTimeout(() => avisoCrear.classList.add('hidden'), 4500);
        };

        const recalcularMontoCuota = () => {
            const m = parseFloat(inputMonto.value) || 0;
            const t = parseFloat(inputInteres ? inputInteres.value : 0) || 0;
            const c = parseInt(inputNumCuotas.value, 10) || 1;

            const intMonto = +(m * (t / 100)).toFixed(2);
            const totalDeuda = +(m + intMonto).toFixed(2);
            const cuotaMonto = +(totalDeuda / c).toFixed(2);

            if (calcCapital) calcCapital.textContent = `S/ ${m.toFixed(2)}`;
            if (calcTasaLbl) calcTasaLbl.textContent = `${t}%`;
            if (calcInteres) calcInteres.textContent = `+ S/ ${intMonto.toFixed(2)}`;
            if (calcTotal) calcTotal.textContent = `S/ ${totalDeuda.toFixed(2)}`;
            if (displayMontoCuota) displayMontoCuota.textContent = `S/ ${cuotaMonto.toFixed(2)} / mes`;

            if (inputEmision && inputEmision.value) {
                const parts = inputEmision.value.split('-').map(Number);
                if (parts.length === 3 && calcDiaMesPreview) {
                    calcDiaMesPreview.textContent = `Día ${parts[2]}`;
                }

                // Si es modalidad automática de cuotas, la 1ra cuota vence el mismo día del mes siguiente
                if (modAuto && modAuto.checked) {
                    const targetMonthIdx = (parts[1] - 1) + 1;
                    const targetY = parts[0] + Math.floor(targetMonthIdx / 12);
                    const targetM = ((targetMonthIdx % 12) + 12) % 12;
                    const maxD = new Date(targetY, targetM + 1, 0).getDate();
                    const finalD = Math.min(parts[2], maxD);
                    inputVencimiento.value = `${targetY}-${String(targetM + 1).padStart(2, '0')}-${String(finalD).padStart(2, '0')}`;
                }
            }
        };

        if (inputMonto) inputMonto.addEventListener('input', recalcularMontoCuota);
        if (inputInteres) inputInteres.addEventListener('input', recalcularMontoCuota);
        if (inputNumCuotas) inputNumCuotas.addEventListener('input', recalcularMontoCuota);

        if (modManual && modAuto) {
            modManual.onchange = () => {
                subManual.classList.remove('hidden');
                subAuto.classList.add('hidden');
                if (lblVencimiento) lblVencimiento.textContent = 'F. Vencimiento';
            };
            modAuto.onchange = () => {
                subManual.classList.add('hidden');
                subAuto.classList.remove('hidden');
                if (lblVencimiento) lblVencimiento.textContent = 'F. Vencimiento (1ra Cuota)';
                recalcularMontoCuota();
            };
        }

        // Lógica de Fechas In-App (Sin alertas ni popups de navegador)
        if (inputEmision && inputVencimiento) {
            inputEmision.addEventListener('change', () => {
                const hoyStr = new Date().toISOString().split('T')[0];
                if (selectCatCrear && selectCatCrear.value === 'prestamo' && inputEmision.value < hoyStr) {
                    inputEmision.value = hoyStr;
                    mostrarAvisoCrear('La fecha del préstamo no puede ser anterior a hoy; se ajustó automáticamente a la fecha actual.', 'warning');
                }
                inputVencimiento.min = inputEmision.value;
                if (inputVencimiento.value && inputVencimiento.value < inputEmision.value) {
                    inputVencimiento.value = inputEmision.value;
                    mostrarAvisoCrear('La fecha de vencimiento no puede ser anterior a la de emisión; se sincronizó automáticamente.', 'info');
                }
                recalcularMontoCuota();
            });

            inputVencimiento.addEventListener('change', () => {
                if (inputEmision.value && inputVencimiento.value < inputEmision.value) {
                    inputVencimiento.value = inputEmision.value;
                    mostrarAvisoCrear('La fecha de vencimiento no puede ser anterior a la de emisión; se corrigió automáticamente.', 'warning');
                }
            });
        }

        if (btnOpenCrear) {
            btnOpenCrear.onclick = () => {
                formCrear.reset();
                if (avisoCrear) avisoCrear.classList.add('hidden');
                const hoyStr = new Date().toISOString().split('T')[0];
                inputEmision.value = hoyStr;
                inputVencimiento.min = hoyStr;
                containerCuota.classList.add('hidden');
                if (modManual) modManual.checked = true;
                if (subManual) subManual.classList.remove('hidden');
                if (subAuto) subAuto.classList.add('hidden');
                if (lblEmision) lblEmision.textContent = 'F. Emisión';
                if (lblVencimiento) lblVencimiento.textContent = 'F. Vencimiento';
                modalCrear.classList.remove('hidden');
            };
        }

        if (selectCatCrear) {
            selectCatCrear.onchange = (e) => {
                const hoyStr = new Date().toISOString().split('T')[0];
                if (e.target.value === 'prestamo') {
                    containerCuota.classList.remove('hidden');
                    if (lblEmision) lblEmision.textContent = 'Fecha Préstamo (Desembolso)';
                    if (lblVencimiento) lblVencimiento.textContent = modAuto && modAuto.checked ? 'F. Vencimiento (1ra Cuota)' : 'F. Vencimiento';
                    inputEmision.min = hoyStr;
                    if (inputEmision.value < hoyStr) inputEmision.value = hoyStr;
                    recalcularMontoCuota();
                } else {
                    containerCuota.classList.add('hidden');
                    if (lblEmision) lblEmision.textContent = 'F. Emisión';
                    if (lblVencimiento) lblVencimiento.textContent = 'F. Vencimiento';
                    inputEmision.removeAttribute('min');
                }
            };
        }

        if (formCrear) {
            formCrear.onsubmit = async (e) => {
                e.preventDefault();
                const categoria = document.getElementById('crear-categoria').value;
                const descripcion = document.getElementById('crear-descripcion').value.trim();
                const beneficiario = document.getElementById('crear-beneficiario').value.trim();
                const monto = parseFloat(document.getElementById('crear-monto').value);
                const fecha_emision = document.getElementById('crear-emision').value;
                const fecha_vencimiento = document.getElementById('crear-vencimiento').value;
                const hoyStr = new Date().toISOString().split('T')[0];

                if (categoria === 'prestamo' && fecha_emision < hoyStr) {
                    mostrarAvisoCrear('La fecha del préstamo no puede ser menor a la fecha actual.', 'error');
                    return;
                }

                if (fecha_vencimiento < fecha_emision) {
                    mostrarAvisoCrear('La fecha de vencimiento no puede ser anterior a la fecha de emisión.', 'error');
                    return;
                }

                let cuota_info = null;
                let generar_cuotas = false;
                let num_cuotas = 1;
                let tasa_interes = 0;

                if (categoria === 'prestamo') {
                    tasa_interes = parseFloat(inputInteres ? inputInteres.value : 0) || 0;
                    if (modAuto && modAuto.checked) {
                        generar_cuotas = true;
                        num_cuotas = parseInt(inputNumCuotas.value, 10) || 6;
                    } else {
                        cuota_info = document.getElementById('crear-cuota').value.trim() || 'Cuota de Préstamo';
                    }
                }

                try {
                    const res = await API.crearObligacion({
                        categoria,
                        descripcion,
                        beneficiario,
                        monto,
                        fecha_emision,
                        fecha_vencimiento,
                        cuota_info,
                        generar_cuotas,
                        num_cuotas,
                        tasa_interes
                    });

                    if (res.ok) {
                        modalCrear.classList.add('hidden');
                        window.mostrarNotificacion('Obligación registrada exitosamente.', 'success');
                        await AsistenteModule.cargarObligaciones();
                    } else {
                        mostrarAvisoCrear(res.mensaje || 'Error al registrar la obligación.', 'error');
                    }
                } catch (err) {
                    mostrarAvisoCrear('Error de conexión con el servidor.', 'error');
                }
            };
        }

        // ==========================================
        // Modal Registrar Pago - Un solo paso, doble verificación en la misma interfaz
        // ==========================================
        const modalPagar = document.getElementById('modal-pagar-obligacion');
        const formPagar = document.getElementById('form-pagar-obligacion');
        const inputArchivo = document.getElementById('pagar-archivo');
        const checkDeclaracion = document.getElementById('pagar-declaracion-responsabilidad');
        const previewPlaceholder = document.getElementById('preview-placeholder');
        const previewContainer = document.getElementById('preview-container');
        const previewImg = document.getElementById('preview-img');
        const previewFilename = document.getElementById('preview-filename');
        const pagoErrorInline = document.getElementById('pago-error-inline');
        const pagoErrorTexto = document.getElementById('pago-error-texto');

        const mostrarErrorPagoInline = (msg) => {
            if (pagoErrorTexto && pagoErrorInline) {
                pagoErrorTexto.textContent = msg;
                pagoErrorInline.classList.remove('hidden');
                if (window.lucide) window.lucide.createIcons();
            }
        };

        if (inputArchivo) {
            inputArchivo.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (pagoErrorInline) pagoErrorInline.classList.add('hidden');
                    previewPlaceholder.classList.add('hidden');
                    previewContainer.classList.remove('hidden');
                    previewFilename.textContent = `Archivo: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (re) => { previewImg.src = re.target.result; previewImg.classList.remove('hidden'); };
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
                const metodo_pago = document.getElementById('pagar-metodo').value;
                const file = inputArchivo.files[0];

                if (!nro_operacion) { mostrarErrorPagoInline('Debe ingresar el número de operación o referencia bancaria.'); return; }
                if (!file) { mostrarErrorPagoInline('Debe adjuntar la evidencia fotográfica o PDF del voucher.'); return; }
                if (!checkDeclaracion || !checkDeclaracion.checked) { mostrarErrorPagoInline('Debe marcar la casilla de doble verificación y asunción de responsabilidad para continuar.'); return; }

                if (pagoErrorInline) pagoErrorInline.classList.add('hidden');

                const formData = new FormData();
                formData.append('fecha_pago', fecha_pago);
                formData.append('nro_operacion', nro_operacion);
                formData.append('metodo_pago', metodo_pago);
                formData.append('comprobante', file);

                const btnSubmit = document.getElementById('btn-submit-pago');
                btnSubmit.disabled = true;
                btnSubmit.textContent = 'Procesando pago...';

                try {
                    const res = await API.pagarObligacion(id, formData);
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i><span>Confirmar Pago al 100%</span>`;

                    if (res.ok) {
                        modalPagar.classList.add('hidden');
                        formPagar.reset();
                        if (checkDeclaracion) checkDeclaracion.checked = false;
                        previewPlaceholder.classList.remove('hidden');
                        previewContainer.classList.add('hidden');
                        window.mostrarNotificacion('Pago registrado exitosamente con comprobante fotográfico.', 'success');
                        await AsistenteModule.cargarObligaciones();
                    } else {
                        mostrarErrorPagoInline(res.mensaje || 'Error al procesar el pago.');
                    }
                } catch (err) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i><span>Confirmar Pago al 100%</span>`;
                    mostrarErrorPagoInline('Error de conexión al subir el comprobante.');
                }
            };
        }

        // ==========================================
        // Modal Editar Obligación (emisión BLOQUEADA, solo vencimiento editable)
        // ==========================================
        const formEditar = document.getElementById('form-editar-obligacion');
        const modalEditar = document.getElementById('modal-editar-obligacion');
        const selectCatEditar = document.getElementById('editar-categoria');
        const containerCuotaEditar = document.getElementById('container-editar-cuota');
        const inputEditarVenc = document.getElementById('editar-vencimiento');
        const avisoEditar = document.getElementById('editar-aviso-inline');

        let timerAvisoEditar = null;
        const mostrarAvisoEditar = (msg) => {
            if (!avisoEditar) return;
            avisoEditar.className = 'p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-semibold flex items-center gap-2';
            avisoEditar.innerHTML = `<i data-lucide="info" class="w-4 h-4 shrink-0"></i><span>${msg}</span>`;
            avisoEditar.classList.remove('hidden');
            if (window.lucide) window.lucide.createIcons();
            if (timerAvisoEditar) clearTimeout(timerAvisoEditar);
            timerAvisoEditar = setTimeout(() => avisoEditar.classList.add('hidden'), 4000);
        };

        if (selectCatEditar) {
            selectCatEditar.onchange = (e) => {
                if (e.target.value === 'prestamo') containerCuotaEditar.classList.remove('hidden');
                else containerCuotaEditar.classList.add('hidden');
            };
        }

        if (formEditar) {
            formEditar.onsubmit = async (e) => {
                e.preventDefault();
                const id = document.getElementById('editar-id').value;
                const categoria = document.getElementById('editar-categoria').value;
                const descripcion = document.getElementById('editar-descripcion').value.trim();
                const beneficiario = document.getElementById('editar-beneficiario').value.trim();
                const monto = parseFloat(document.getElementById('editar-monto').value);
                const fecha_emision = document.getElementById('editar-emision').value; // solo lectura, no cambia
                const fecha_vencimiento = document.getElementById('editar-vencimiento').value;
                const cuota_info = categoria === 'prestamo' ? document.getElementById('editar-cuota').value.trim() : null;

                try {
                    const res = await API.editarObligacion(id, { categoria, descripcion, beneficiario, monto, fecha_emision, fecha_vencimiento, cuota_info });
                    if (res.ok) {
                        modalEditar.classList.add('hidden');
                        window.mostrarNotificacion('Obligación actualizada exitosamente.', 'success');
                        await AsistenteModule.cargarObligaciones();
                    } else {
                        mostrarAvisoEditar(res.mensaje || 'Error al actualizar la obligación.');
                    }
                } catch (err) {
                    mostrarAvisoEditar('Error de conexión al actualizar.');
                }
            };
        }
    },

    cargarObligaciones: async () => {
        const filtroMes = document.getElementById('filtro-mes-asistente');
        const filtroAnio = document.getElementById('filtro-anio-asistente');
        const filtroCat = document.getElementById('filtro-categoria-asistente');
        const filtroEst = document.getElementById('filtro-estado-asistente');

        const params = {};
        if (filtroMes && filtroMes.value !== 'todos') params.mes = filtroMes.value;
        if (filtroAnio && filtroAnio.value !== 'todos') params.anio = filtroAnio.value;
        if (filtroCat && filtroCat.value !== 'todas') params.categoria = filtroCat.value;
        if (filtroEst && filtroEst.value !== 'todos') params.estado = filtroEst.value;

        try {
            const res = await API.getObligaciones(params);

            if (res.ok) {
                AsistenteModule.obligaciones = res.obligaciones || [];
                AsistenteModule.renderTabla();
                AsistenteModule.actualizarContadores();
            }
        } catch (error) {
            console.error('Error cargando obligaciones:', error);
        }
    },

    actualizarContadores: () => {
        let vencidos = 0;
        let porVencer = 0;
        let programados = 0;
        let pagados = 0;

        AsistenteModule.obligaciones.forEach(o => {
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

        const totalItems = AsistenteModule.obligaciones.length;
        const totalPaginas = Math.ceil(totalItems / AsistenteModule.ITEMS_POR_PAGINA) || 1;
        if (AsistenteModule.paginaActual > totalPaginas) {
            AsistenteModule.paginaActual = totalPaginas;
        }

        const infoPaginacion = document.getElementById('info-paginacion-asistente');
        const badgePagina = document.getElementById('badge-pagina-asistente');
        const btnPrev = document.getElementById('btn-prev-asistente');
        const btnNext = document.getElementById('btn-next-asistente');

        if (totalItems === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="py-8 text-center text-slate-400">
                        <i data-lucide="inbox" class="w-10 h-10 mx-auto mb-2 text-slate-300"></i>
                        <p class="font-medium text-sm">No hay obligaciones registradas para este filtro.</p>
                    </td>
                </tr>
            `;
            if (infoPaginacion) infoPaginacion.textContent = 'Mostrando 0 obligaciones';
            if (badgePagina) badgePagina.textContent = '1 / 1';
            if (btnPrev) btnPrev.disabled = true;
            if (btnNext) btnNext.disabled = true;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        const inicio = (AsistenteModule.paginaActual - 1) * AsistenteModule.ITEMS_POR_PAGINA;
        const fin = Math.min(inicio + AsistenteModule.ITEMS_POR_PAGINA, totalItems);
        const itemsPagina = AsistenteModule.obligaciones.slice(inicio, fin);

        if (infoPaginacion) {
            infoPaginacion.textContent = `Mostrando ${inicio + 1} - ${fin} de ${totalItems} obligaciones`;
        }
        if (badgePagina) {
            badgePagina.textContent = `${AsistenteModule.paginaActual} / ${totalPaginas}`;
        }
        if (btnPrev) btnPrev.disabled = AsistenteModule.paginaActual <= 1;
        if (btnNext) btnNext.disabled = AsistenteModule.paginaActual >= totalPaginas;

        itemsPagina.forEach(item => {
            const tr = document.createElement('tr');
            
            // Clase de semáforo en borde (sin animación parpadeante)
            let borderClass = 'border-programado';
            if (item.estado === 'pagado') borderClass = 'border-pagado';
            else if (item.semaforo.codigo === 'vencido') borderClass = 'border-mora-critica bg-red-50/20';
            else if (item.semaforo.codigo === 'por_vencer') borderClass = 'border-por-vencer bg-amber-50/20';

            tr.className = `hover:bg-slate-50 transition border-b border-slate-100 ${borderClass}`;

            // Badge Categoría
            const catBadges = {
                servicio: 'bg-blue-50 text-blue-700 border-blue-200',
                impuesto: 'bg-amber-50 text-amber-700 border-amber-200',
                proveedores: 'bg-purple-50 text-purple-700 border-purple-200',
                prestamo: 'bg-emerald-50 text-emerald-700 border-emerald-200'
            };
            const catBadge = catBadges[item.categoria] || 'bg-slate-100 text-slate-700';

            // Etiqueta semáforo
            const semaforoHtml = `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${item.semaforo.clase_badge}">
                    ${item.semaforo.alerta_critica ? '<i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i>' : ''}
                    <span>${item.semaforo.etiqueta}</span>
                </span>
            `;

            // Botón de acción
            let actionHtml = '';
            if (item.estado === 'pagado') {
                actionHtml = `
                    <button type="button" onclick="window.GerenteModule.abrirVisorComprobante(${item.id})"
                        class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition text-xs font-bold">
                        <i data-lucide="file-check" class="w-4 h-4"></i>
                        <span>Ver Voucher</span>
                    </button>
                `;
            } else {
                actionHtml = `
                    <div class="flex items-center justify-center gap-1.5">
                        <button type="button" onclick="window.AsistenteModule.abrirModalPagar(${item.id})"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition text-xs font-bold">
                            <i data-lucide="upload" class="w-3.5 h-3.5"></i>
                            <span>Pagar</span>
                        </button>
                        <button type="button" onclick="window.AsistenteModule.abrirModalEditar(${item.id})"
                            title="Editar obligación"
                            class="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        <button type="button" onclick="window.AsistenteModule.eliminarObligacion(${item.id})"
                            title="Anular obligación creada por error"
                            class="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                `;
            }

            tr.innerHTML = `
                <td class="py-3 px-4">${semaforoHtml}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${catBadge}">
                        ${item.categoria}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <p class="font-bold text-slate-800 text-sm">${item.descripcion}</p>
                    ${item.cuota_info ? `<span class="inline-block mt-0.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">${item.cuota_info}</span>` : ''}
                </td>
                <td class="py-3 px-4 font-medium text-slate-600 text-xs">${item.beneficiario}</td>
                <td class="py-3 px-4 font-semibold text-xs ${item.semaforo.alerta_critica ? 'text-red-600 font-bold' : 'text-slate-600'}">
                    ${item.fecha_vencimiento}
                </td>
                <td class="py-3 px-4 text-right font-black text-slate-900 text-sm">
                    S/ ${item.monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td class="py-3 px-4 text-center">${actionHtml}</td>
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
        document.getElementById('pagar-benef-resumen').textContent = item.beneficiario;
        document.getElementById('pagar-monto-resumen').textContent = `S/ ${item.monto.toFixed(2)}`;
        document.getElementById('pagar-fecha').value = new Date().toISOString().split('T')[0];
        document.getElementById('pagar-nro-operacion').value = '';

        // Reset de vistas (Asegura volver al paso 1)
        const formPagar = document.getElementById('form-pagar-obligacion');
        const vistaConf = document.getElementById('pago-vista-confirmacion');
        const errInline = document.getElementById('pago-error-inline');
        const checkDecl = document.getElementById('pagar-declaracion-responsabilidad');

        if (formPagar) formPagar.classList.remove('hidden');
        if (vistaConf) vistaConf.classList.add('hidden');
        if (errInline) errInline.classList.add('hidden');
        if (checkDecl) checkDecl.checked = false;

        document.getElementById('modal-pagar-header-titulo').textContent = 'Registrar Pago al 100%';
        document.getElementById('modal-pagar-header-subtitulo').textContent = 'Adjunta el comprobante o fotografía para certificar la cancelación';

        // Reset vista previa
        const previewPlaceholder = document.getElementById('preview-placeholder');
        const previewContainer = document.getElementById('preview-container');
        previewPlaceholder.classList.remove('hidden');
        previewContainer.classList.add('hidden');
        document.getElementById('pagar-archivo').value = '';

        document.getElementById('modal-pagar-obligacion').classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
    },

    eliminarObligacion: async (id) => {
        const item = AsistenteModule.obligaciones.find(o => o.id === id);
        if (!item) return;

        window.mostrarConfirmacion({
            titulo: 'Anular Obligación Pendiente',
            subtitulo: `¿Deseas anular "${item.descripcion}"?`,
            mensaje: `Esta acción retirará el compromiso de pago de S/ ${item.monto.toFixed(2)} (${item.beneficiario}) del sistema de Castillo Robles.`,
            textoBoton: 'Sí, Anular Obligación',
            esPeligroso: true,
            onConfirm: async () => {
                try {
                    const res = await API.eliminarObligacion(id);
                    if (res.ok) {
                        window.mostrarNotificacion('Obligación anulada correctamente.', 'success');
                        await AsistenteModule.cargarObligaciones();
                    } else {
                        window.mostrarNotificacion(res.mensaje || 'No se pudo anular la obligación.', 'error');
                    }
                } catch (e) {
                    window.mostrarNotificacion('Error de conexión con el servidor.', 'error');
                }
            }
        });
    },

    abrirModalEditar: (id) => {
        const item = AsistenteModule.obligaciones.find(o => o.id === id);
        if (!item) return;

        document.getElementById('editar-id').value = item.id;
        document.getElementById('editar-categoria').value = item.categoria;
        document.getElementById('editar-descripcion').value = item.descripcion;
        document.getElementById('editar-beneficiario').value = item.beneficiario;
        document.getElementById('editar-monto').value = item.monto;
        document.getElementById('editar-emision').value = item.fecha_emision;
        document.getElementById('editar-vencimiento').value = item.fecha_vencimiento;

        const containerCuotaEditar = document.getElementById('container-editar-cuota');
        const inputCuotaEditar = document.getElementById('editar-cuota');
        if (item.categoria === 'prestamo') {
            containerCuotaEditar.classList.remove('hidden');
            inputCuotaEditar.value = item.cuota_info || '';
        } else {
            containerCuotaEditar.classList.add('hidden');
            inputCuotaEditar.value = '';
        }

        document.getElementById('modal-editar-obligacion').classList.remove('hidden');
    }
};
