// asistente.js - Módulo de Gestión Operativa del Asistente

function validarDocIdentidad(doc) {
    if (!doc || doc.trim() === '') return { valido: false, mensaje: 'Debe ingresar el RUC o DNI del beneficiario.' };
    const limpio = doc.trim();
    if (!/^\d+$/.test(limpio)) return { valido: false, mensaje: 'El RUC o DNI debe contener únicamente dígitos numéricos.' };
    if (limpio.length === 8) return { valido: true, tipo: 'DNI' };
    if (limpio.length === 11) {
        if (!/^(10|20)\d{9}$/.test(limpio)) {
            return { valido: false, mensaje: 'RUC inválido. Los RUC de personas o empresas en Perú deben iniciar con 10 o 20.' };
        }
        return { valido: true, tipo: 'RUC' };
    }
    return { valido: false, mensaje: 'El documento debe tener 8 dígitos (DNI) o 11 dígitos (RUC).' };
}

function validarAnioCoherente(fechaStr) {
    if (!fechaStr) return false;
    const y = parseInt(fechaStr.split('-')[0], 10);
    return !isNaN(y) && y >= 2020 && y <= 2035;
}

window.AsistenteModule = {
    obligaciones: [],
    paginaActual: 1,
    ITEMS_POR_PAGINA: 15,

    init: async () => {
        const hoy = new Date();
        const selMes = document.getElementById('filtro-mes-asistente');
        const selAnio = document.getElementById('filtro-anio-asistente');
        if (selMes) selMes.value = 'todos';
        if (selAnio) selAnio.value = 'todos';

        AsistenteModule.bindEvents();
        await AsistenteModule.cargarObligaciones();
    },

    bindEvents: () => {
        // Filtros y Buscador en tiempo real
        const filtroMes = document.getElementById('filtro-mes-asistente');
        const filtroAnio = document.getElementById('filtro-anio-asistente');
        const filtroCat = document.getElementById('filtro-categoria-asistente');
        const filtroEst = document.getElementById('filtro-estado-asistente');
        const btnRefresh = document.getElementById('btn-refresh-asistente');
        const buscador = document.getElementById('buscador-asistente');
        // Sanitización en tiempo real de RUC/DNI (solo dígitos)
        const inputCrearRuc = document.getElementById('crear-ruc');
        const inputEditarRuc = document.getElementById('editar-ruc');
        const soloDigitosRuc = (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11); };
        if (inputCrearRuc) inputCrearRuc.addEventListener('input', soloDigitosRuc);
        if (inputEditarRuc) inputEditarRuc.addEventListener('input', soloDigitosRuc);

        // Bloqueo de letra 'e', 'E', '+' y '-' en campos de monto
        const blockInvalidAmountKeys = (e) => {
            if (['e', 'E', '+', '-'].includes(e.key)) {
                e.preventDefault();
            }
        };
        const inputCrearMonto = document.getElementById('crear-monto');
        const inputEditarMonto = document.getElementById('editar-monto');
        if (inputCrearMonto) inputCrearMonto.addEventListener('keydown', blockInvalidAmountKeys);
        if (inputEditarMonto) inputEditarMonto.addEventListener('keydown', blockInvalidAmountKeys);

        // Sanitización de N° Operación (solo dígitos)
        const inputNroOp = document.getElementById('pagar-nro-operacion');
        if (inputNroOp) {
            inputNroOp.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 12);
            });
        }


        const resetYcargar = () => {
            AsistenteModule.paginaActual = 1;
            AsistenteModule.cargarObligaciones();
        };

        if (filtroMes) filtroMes.onchange = resetYcargar;
        if (filtroAnio) filtroAnio.onchange = resetYcargar;
        if (filtroCat) filtroCat.onchange = resetYcargar;
        if (filtroEst) filtroEst.onchange = resetYcargar;
        if (btnRefresh) btnRefresh.onclick = resetYcargar;

        if (buscador) {
            let timeoutId = null;
            buscador.oninput = () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    AsistenteModule.paginaActual = 1;
                    AsistenteModule.cargarObligaciones();
                }, 200);
            };
        }

        // Paginación
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
                const total = AsistenteModule.obligaciones.length;
                const maxPag = Math.ceil(total / AsistenteModule.ITEMS_POR_PAGINA) || 1;
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

        // Controles de Amortización de Préstamos
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

        const mostrarAvisoCrear = (msg, tipo = 'warning') => {
            if (!avisoCrear) return;
            avisoCrear.className = tipo === 'error'
                ? 'p-2 rounded border text-xs font-medium flex items-center gap-2 bg-rose-50 text-rose-800 border-rose-300'
                : 'p-2 rounded border text-xs font-medium flex items-center gap-2 bg-amber-50 text-amber-800 border-amber-300';
            avisoCrear.innerHTML = `<i data-lucide="alert-triangle" class="w-4 h-4 shrink-0"></i><span>${msg}</span>`;
            avisoCrear.classList.remove('hidden');
            if (window.lucide) window.lucide.createIcons();
        };

        const ocultarAvisoCrear = () => {
            if (avisoCrear) avisoCrear.classList.add('hidden');
        };

        const actualizarSimuladorPrestamo = () => {
            if (selectCatCrear.value !== 'prestamo') return;

            const monto = parseFloat(inputMonto.value) || 0;
            const tasa = parseFloat(inputInteres.value) || 0;
            const cuotas = parseInt(inputNumCuotas.value, 10) || 1;

            const interesCalculado = +(monto * (tasa / 100)).toFixed(2);
            const totalDeuda = +(monto + interesCalculado).toFixed(2);
            const cuotaMes = cuotas > 0 ? +(totalDeuda / cuotas).toFixed(2) : totalDeuda;

            if (calcCapital) calcCapital.textContent = `S/ ${monto.toFixed(2)}`;
            if (calcTasaLbl) calcTasaLbl.textContent = `${tasa}%`;
            if (calcInteres) calcInteres.textContent = `+ S/ ${interesCalculado.toFixed(2)}`;
            if (calcTotal) calcTotal.textContent = `S/ ${totalDeuda.toFixed(2)}`;
            if (displayMontoCuota) displayMontoCuota.textContent = `S/ ${cuotaMes.toFixed(2)}`;

            if (inputEmision && inputEmision.value && calcDiaMesPreview) {
                const dia = inputEmision.value.split('-')[2] || '--';
                calcDiaMesPreview.textContent = dia;
            }
        };

        if (inputMonto) inputMonto.addEventListener('input', actualizarSimuladorPrestamo);
        if (inputInteres) inputInteres.addEventListener('input', actualizarSimuladorPrestamo);
        if (inputNumCuotas) inputNumCuotas.addEventListener('input', actualizarSimuladorPrestamo);

        if (modManual && modAuto) {
            modManual.onchange = () => {
                if (modManual.checked) {
                    subManual.classList.remove('hidden');
                    subAuto.classList.add('hidden');
                    inputVencimiento.disabled = false;
                }
            };
            modAuto.onchange = () => {
                if (modAuto.checked) {
                    subManual.classList.add('hidden');
                    subAuto.classList.remove('hidden');
                    inputVencimiento.disabled = true;
                    actualizarSimuladorPrestamo();
                }
            };
        }

        // Validación reactiva de fechas
        const validarFechasReactivo = () => {
            ocultarAvisoCrear();
            const fEmis = inputEmision.value;
            const fVenc = inputVencimiento.value;
            const cat = selectCatCrear.value;
            const hoyISO = new Date().toISOString().split('T')[0];

            if (cat === 'prestamo' && fEmis && fEmis < hoyISO) {
                mostrarAvisoCrear('La fecha del préstamo no puede ser anterior a la fecha actual.', 'error');
                return false;
            }

            if (fEmis && fVenc && !inputVencimiento.disabled && fVenc < fEmis) {
                mostrarAvisoCrear('La fecha de vencimiento no puede ser anterior a la emisión.', 'error');
                return false;
            }

            return true;
        };

        if (inputEmision) {
            inputEmision.addEventListener('change', () => {
                validarFechasReactivo();
                actualizarSimuladorPrestamo();
            });
        }
        if (inputVencimiento) {
            inputVencimiento.addEventListener('change', validarFechasReactivo);
        }

        if (btnOpenCrear) {
            btnOpenCrear.onclick = () => {
                formCrear.reset();
                const hoyStr = new Date().toISOString().split('T')[0];
                document.getElementById('crear-emision').value = hoyStr;
                document.getElementById('crear-vencimiento').value = hoyStr;
                document.getElementById('crear-vencimiento').disabled = false;
                containerCuota.classList.add('hidden');
                subManual.classList.remove('hidden');
                subAuto.classList.add('hidden');
                modManual.checked = true;
                ocultarAvisoCrear();
                modalCrear.classList.remove('hidden');
            };
        }

        if (selectCatCrear) {
            selectCatCrear.onchange = (e) => {
                const tipoComp = document.getElementById('crear-tipo-comprobante');
                ocultarAvisoCrear();

                if (e.target.value === 'prestamo') {
                    containerCuota.classList.remove('hidden');
                    if (lblEmision) lblEmision.textContent = 'Fecha Préstamo';
                    if (lblVencimiento) lblVencimiento.textContent = 'Primer Vcto.';
                    if (tipoComp) tipoComp.value = 'Liquidación de Crédito';
                    actualizarSimuladorPrestamo();
                } else {
                    containerCuota.classList.add('hidden');
                    inputVencimiento.disabled = false;
                    if (lblEmision) lblEmision.textContent = 'F. Emisión';
                    if (lblVencimiento) lblVencimiento.textContent = 'F. Vencimiento';

                    if (e.target.value === 'impuesto') {
                        if (tipoComp) tipoComp.value = 'Declaración Jurada PDT';
                    } else if (e.target.value === 'servicio') {
                        if (tipoComp) tipoComp.value = 'Recibo Servicios Públicos';
                    } else {
                        if (tipoComp) tipoComp.value = 'Factura Electrónica';
                    }
                }
            };
        }

        if (formCrear) {
            formCrear.onsubmit = async (e) => {
                e.preventDefault();

                if (!validarFechasReactivo()) return;

                const categoria = document.getElementById('crear-categoria').value;
                const tipo_comprobante = document.getElementById('crear-tipo-comprobante').value;
                const descripcion = document.getElementById('crear-descripcion').value.trim();
                const beneficiario = document.getElementById('crear-beneficiario').value.trim();
                const ruc_beneficiario = document.getElementById('crear-ruc').value.trim();
                const monto = parseFloat(document.getElementById('crear-monto').value);
                const fecha_emision = document.getElementById('crear-emision').value;
                let fecha_vencimiento = document.getElementById('crear-vencimiento').value;

                const docCheck = validarDocIdentidad(ruc_beneficiario);
                if (!docCheck.valido) {
                    mostrarAvisoCrear(docCheck.mensaje, 'error');
                    return;
                }

                if (!validarAnioCoherente(fecha_emision) || !validarAnioCoherente(fecha_vencimiento)) {
                    mostrarAvisoCrear('Las fechas deben tener un año válido de 4 dígitos entre 2020 y 2035.', 'error');
                    return;
                }

                const esAutoCuotas = categoria === 'prestamo' && modAuto.checked;
                const tasa_interes = parseFloat(inputInteres.value) || 0;
                const num_cuotas = parseInt(inputNumCuotas.value, 10) || 1;
                const cuota_info = categoria === 'prestamo' && !esAutoCuotas ? document.getElementById('crear-cuota').value.trim() : null;

                if (esAutoCuotas) {
                    fecha_vencimiento = fecha_emision;
                }

                try {
                    const res = await API.crearObligacion({
                        categoria,
                        tipo_comprobante,
                        descripcion,
                        beneficiario,
                        ruc_beneficiario,
                        ruc_beneficiario,
                        monto,
                        fecha_emision,
                        fecha_vencimiento,
                        cuota_info,
                        generar_cuotas: esAutoCuotas,
                        num_cuotas,
                        tasa_interes
                    });

                    if (res.ok) {
                        modalCrear.classList.add('hidden');
                        window.Toast.success(res.mensaje || 'Obligación registrada con éxito en el sistema.');
                        await AsistenteModule.cargarObligaciones();
                    } else {
                        mostrarAvisoCrear(res.mensaje || 'Error al registrar la obligación.', 'error');
                    }
                } catch (err) {
                    mostrarAvisoCrear('Error de conexión con el servidor.', 'error');
                }
            };
        }

        // Modal Registrar Pago con Método de Pago y Doble Verificación en 1 Paso
        const modalPagar = document.getElementById('modal-pagar-obligacion');
        const formPagar = document.getElementById('form-pagar-obligacion');
        const inputArchivo = document.getElementById('pagar-archivo');
        const previewPlaceholder = document.getElementById('preview-placeholder');
        const previewContainer = document.getElementById('preview-container');
        const previewImg = document.getElementById('preview-img');
        const previewFilename = document.getElementById('preview-filename');
        const checkDeclaracion = document.getElementById('pagar-declaracion-responsabilidad');
        const btnSubmitPago = document.getElementById('btn-submit-pago');

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
                const horaInput = document.getElementById('pagar-hora');
                const hora_pago = (horaInput ? horaInput.value : '').trim();
                const nro_operacion = document.getElementById('pagar-nro-operacion').value.trim();
                const metodoSelect = document.getElementById('pagar-metodo');
                const metodo_pago = (metodoSelect ? metodoSelect.value : 'Transferencia Bancaria').trim();
                const file = inputArchivo.files[0];

                if (!/^\d{4,12}$/.test(nro_operacion)) {
                    window.Toast.warning('El N° de operación debe contener entre 4 y 12 dígitos numéricos sin letras.');
                    return;
                }

                if (!file) {
                    window.Toast.warning('Es obligatorio adjuntar el voucher bancario o PDF.');
                    return;
                }

                if (!nro_operacion) {
                    window.Toast.warning('Debe ingresar el código de operación bancaria.');
                    return;
                }

                if (!checkDeclaracion.checked) {
                    window.Toast.warning('Debe marcar la casilla de doble verificación y responsabilidad.');
                    return;
                }

                const formData = new FormData();
                formData.append('fecha_pago', fecha_pago);
                formData.append('hora_pago', hora_pago);
                formData.append('nro_operacion', nro_operacion);
                formData.append('metodo_pago', metodo_pago);
                formData.append('comprobante', file);

                btnSubmitPago.disabled = true;
                btnSubmitPago.textContent = 'Certificando pago...';

                try {
                    const res = await API.pagarObligacion(id, formData);
                    btnSubmitPago.disabled = false;
                    btnSubmitPago.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i><span>Confirmar Pago al 100%</span>`;

                    if (res.ok) {
                        modalPagar.classList.add('hidden');
                        formPagar.reset();
                        previewPlaceholder.classList.remove('hidden');
                        previewContainer.classList.add('hidden');
                        window.Toast.success('Pago liquidado y comprobante archivado correctamente.');
                        await AsistenteModule.cargarObligaciones();
                    } else {
                        window.Toast.error(res.mensaje || 'Error al procesar el pago.');
                    }
                } catch (err) {
                    btnSubmitPago.disabled = false;
                    btnSubmitPago.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i><span>Confirmar Pago al 100%</span>`;
                    window.Toast.error('Error de comunicación con el servidor.');
                }
            };
        }

        // Modal Editar Obligación (Emisión fija/solo lectura, solo vencimiento/monto/datos editables)
        const modalEditar = document.getElementById('modal-editar-obligacion');
        const formEditar = document.getElementById('form-editar-obligacion');
        const selectCatEditar = document.getElementById('editar-categoria');
        const containerCuotaEditar = document.getElementById('container-editar-cuota');

        if (selectCatEditar) {
            selectCatEditar.onchange = (e) => {
                if (e.target.value === 'prestamo') {
                    containerCuotaEditar.classList.remove('hidden');
                } else {
                    containerCuotaEditar.classList.add('hidden');
                }
            };
        }

        if (formEditar) {
            formEditar.onsubmit = async (e) => {
                e.preventDefault();
                const id = document.getElementById('editar-id').value;
                const categoria = document.getElementById('editar-categoria').value;
                const descripcion = document.getElementById('editar-descripcion').value.trim();
                const beneficiario = document.getElementById('editar-beneficiario').value.trim();
                const ruc_beneficiario = document.getElementById('editar-ruc').value.trim();
                const monto = parseFloat(document.getElementById('editar-monto').value);
                const fecha_emision = document.getElementById('editar-emision').value;
                const fecha_vencimiento = document.getElementById('editar-vencimiento').value;
                const cuota_info = categoria === 'prestamo' ? document.getElementById('editar-cuota').value.trim() : null;

                const docCheck = validarDocIdentidad(ruc_beneficiario);
                if (!docCheck.valido) {
                    window.Toast.error(docCheck.mensaje);
                    return;
                }

                if (!validarAnioCoherente(fecha_emision) || !validarAnioCoherente(fecha_vencimiento)) {
                    window.Toast.error('Las fechas deben tener un año válido entre 2020 y 2035.');
                    return;
                }

                if (fecha_vencimiento < fecha_emision) {
                    window.Toast.error('La fecha de vencimiento no puede ser anterior a la de emisión.');
                    return;
                }

                try {
                    const res = await API.editarObligacion(id, {
                        categoria,
                        descripcion,
                        beneficiario,
                        monto,
                        fecha_emision,
                        fecha_vencimiento,
                        cuota_info
                    });

                    if (res.ok) {
                        modalEditar.classList.add('hidden');
                        window.Toast.success('Obligación actualizada exitosamente.');
                        await AsistenteModule.cargarObligaciones();
                    } else {
                        window.Toast.error(res.mensaje || 'Error al actualizar.');
                    }
                } catch (err) {
                    window.Toast.error('Error de comunicación con el servidor.');
                }
            };
        }

        // Modal Anular Obligación (Error Humano)
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
                        window.Toast.info('Obligación anulada y retirada de los pasivos exigibles.');
                        await AsistenteModule.cargarObligaciones();
                    } else {
                        window.Toast.error(res.mensaje || 'Error al anular la obligación.');
                    }
                } catch (err) {
                    window.Toast.error('Error de conexión al anular.');
                }
            };
        }
    },

    cargarObligaciones: async () => {
        const filtroMes = document.getElementById('filtro-mes-asistente');
        const filtroAnio = document.getElementById('filtro-anio-asistente');
        const filtroCat = document.getElementById('filtro-categoria-asistente');
        const filtroEst = document.getElementById('filtro-estado-asistente');
        const buscador = document.getElementById('buscador-asistente');

        const mesVal = filtroMes && filtroMes.value !== 'todos' ? filtroMes.value : undefined;
        const anioVal = filtroAnio && filtroAnio.value !== 'todos' ? filtroAnio.value : undefined;
        const catVal = filtroCat ? filtroCat.value : 'todas';
        const estVal = filtroEst ? filtroEst.value : 'todos';
        const q = buscador ? buscador.value.trim() : '';

        try {
            const res = await API.getObligaciones({
                mes: mesVal,
                anio: anioVal,
                categoria: catVal,
                estado: estVal,
                q
            });

            if (res.ok) {
                AsistenteModule.obligaciones = res.obligaciones || [];
                AsistenteModule.renderTabla();
                AsistenteModule.actualizarContadores();
            }
        } catch (error) {
            console.error('Error cargando obligaciones:', error);
            window.Toast.error('No se pudo sincronizar el listado con el servidor.');
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

        const totalItems = AsistenteModule.obligaciones.length;
        const maxPag = Math.ceil(totalItems / AsistenteModule.ITEMS_POR_PAGINA) || 1;
        if (AsistenteModule.paginaActual > maxPag) {
            AsistenteModule.paginaActual = maxPag;
        }

        const infoPaginacion = document.getElementById('info-paginacion-asistente');
        const badgePagina = document.getElementById('badge-pagina-asistente');
        const btnPrev = document.getElementById('btn-prev-asistente');
        const btnNext = document.getElementById('btn-next-asistente');

        if (totalItems === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="py-10 text-center text-slate-400">
                        <i data-lucide="search-x" class="w-7 h-7 mx-auto mb-1 text-slate-300"></i>
                        <p class="font-medium text-xs">No se encontraron obligaciones con los criterios especificados.</p>
                    </td>
                </tr>
            `;
            if (infoPaginacion) infoPaginacion.textContent = 'Mostrando 0 registros';
            if (badgePagina) badgePagina.textContent = '1 / 1';
            if (btnPrev) btnPrev.disabled = true;
            if (btnNext) btnNext.disabled = true;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        const inicio = (AsistenteModule.paginaActual - 1) * AsistenteModule.ITEMS_POR_PAGINA;
        const fin = Math.min(inicio + AsistenteModule.ITEMS_POR_PAGINA, totalItems);
        const itemsPagina = AsistenteModule.obligaciones.slice(inicio, fin);

        if (infoPaginacion) infoPaginacion.textContent = `Mostrando ${inicio + 1} - ${fin} de ${totalItems} registros`;
        if (badgePagina) badgePagina.textContent = `${AsistenteModule.paginaActual} / ${maxPag}`;
        if (btnPrev) btnPrev.disabled = AsistenteModule.paginaActual <= 1;
        if (btnNext) btnNext.disabled = AsistenteModule.paginaActual >= maxPag;

        itemsPagina.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition-subtle border-b border-slate-100 cursor-pointer';
            tr.onclick = () => AsistenteModule.abrirDetalle(item.id);

            // Etiquetas sólidas de alto contraste con iconos simbólicos y texto descriptivo
            let semaforoHtml = '';
            if (item.estado === 'pagado') {
                semaforoHtml = '<span class="status-pill status-pagado" title="Obligación liquidada al 100%"><i data-lucide="check" class="w-3.5 h-3.5"></i><span>Pagado al 100%</span></span>';
            } else if (item.estado === 'anulado') {
                semaforoHtml = '<span class="status-pill status-anulado" title="Obligación anulada"><i data-lucide="ban" class="w-3.5 h-3.5"></i><span>Anulado</span></span>';
            } else if (item.semaforo.codigo === 'vencido') {
                const txt = item.semaforo.etiqueta || 'Vencido';
                semaforoHtml = `<span class="status-pill status-vencido" title="${item.semaforo.detalle_tiempo || txt}"><i data-lucide="alert-octagon" class="w-3.5 h-3.5"></i><span>${txt}</span></span>`;
            } else if (item.semaforo.codigo === 'programado') {
                semaforoHtml = '<span class="status-pill status-programado"><i data-lucide="calendar" class="w-3.5 h-3.5"></i><span>Programado</span></span>';
            } else {
                const txt = item.semaforo.etiqueta || 'Por Vencer';
                semaforoHtml = `<span class="status-pill status-por-pagar" title="${item.semaforo.detalle_tiempo || txt}"><i data-lucide="clock" class="w-3.5 h-3.5"></i><span>${txt}</span></span>`;
            }

            const cuotaText = item.cuota_info ? ` <span class="text-slate-500 font-mono text-xs">(${item.cuota_info})</span>` : '';

            // Botones de acción compactos con soporte para Editar y Anular/Eliminar
            let actionHtml = '';
            if (item.estado === 'pagado') {
                actionHtml = `
                    <div class="inline-flex items-center gap-1 justify-center">
                        <button type="button" onclick="event.stopPropagation(); window.GerenteModule.abrirVisorComprobante(${item.id})"
                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-subtle" title="Ver comprobante auditado">
                            <i data-lucide="file-check-2" class="w-3.5 h-3.5 text-emerald-600"></i>
                            <span>Auditar</span>
                        </button>
                    </div>
                `;
            } else if (item.estado === 'anulado') {
                actionHtml = `
                    <div class="inline-flex items-center gap-1 justify-center">
                        <span class="text-xs text-slate-400 font-mono">ANULADO</span>
                    </div>
                `;
            } else {
                actionHtml = `
                    <div class="inline-flex items-center gap-1 justify-center">
                        <button type="button" onclick="event.stopPropagation(); window.AsistenteModule.abrirModalPagar(${item.id})"
                            class="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-subtle shadow-2xs" title="Registrar pago">
                            Pagar
                        </button>
                        <button type="button" onclick="event.stopPropagation(); window.AsistenteModule.abrirModalEditar(${item.id})"
                            class="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-subtle" title="Editar obligación">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        </button>
                        <button type="button" onclick="event.stopPropagation(); window.AsistenteModule.eliminarObligacion(${item.id})"
                            class="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-subtle" title="Anular obligación">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                `;
            }

            tr.innerHTML = `
                <td>${semaforoHtml}</td>
                <td class="font-medium text-slate-900 max-w-sm truncate text-[14.5px]" title="${item.descripcion}">
                    ${item.descripcion}${cuotaText}
                </td>
                <td class="text-slate-700 max-w-[200px] truncate text-[13.5px]" title="${item.beneficiario}">
                    ${item.beneficiario}
                </td>
                <td><span class="chip-category">${item.tipo_comprobante || 'Factura'}</span></td>
                <td class="font-mono-numbers text-slate-600 text-[13.5px]">${item.fecha_vencimiento}</td>
                <td class="text-right font-mono-numbers font-semibold text-slate-900 text-[15px]">
                    S/ ${item.monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td class="text-center">${actionHtml}</td>
            `;

            tbody.appendChild(tr);
        });

        if (window.lucide) window.lucide.createIcons();
    },

    abrirModalEditar: (id) => {
        const item = AsistenteModule.obligaciones.find(o => o.id === id);
        if (!item) return;

        document.getElementById('editar-id').value = item.id;
        document.getElementById('editar-categoria').value = item.categoria;
        document.getElementById('editar-descripcion').value = item.descripcion;
        document.getElementById('editar-beneficiario').value = item.beneficiario;
        document.getElementById('editar-ruc').value = item.ruc_beneficiario || '';
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
                        window.Toast.success('Obligación anulada y retirada correctamente.');
                        await AsistenteModule.cargarObligaciones();
                    } else {
                        window.Toast.error(res.mensaje || 'No se pudo retirar la obligación.');
                    }
                } catch (e) {
                    window.Toast.error('Error de conexión con el servidor.');
                }
            }
        });
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
        document.getElementById('detalle-semaforo-tiempo').textContent = item.semaforo ? (item.semaforo.detalle_tiempo || item.semaforo.etiqueta) : '';
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
            document.getElementById('detalle-nro-operacion').textContent = `${item.nro_operacion || 'Sin Nro.'} (${item.metodo_pago || 'Transferencia'})`;
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

        const ahora = new Date();
        document.getElementById('pagar-id').value = item.id;
        document.getElementById('pagar-desc-resumen').textContent = item.descripcion;
        document.getElementById('pagar-benef-resumen').textContent = `${item.beneficiario} (RUC: ${item.ruc_beneficiario || 'S/N'})`;
        document.getElementById('pagar-monto-resumen').textContent = `S/ ${item.monto.toFixed(2)}`;
        document.getElementById('pagar-fecha').value = ahora.toISOString().split('T')[0];
        const inputHoraPagar = document.getElementById('pagar-hora');
        if (inputHoraPagar) inputHoraPagar.value = ahora.toTimeString().slice(0, 5);
        document.getElementById('pagar-nro-operacion').value = '';

        const selMetodo = document.getElementById('pagar-metodo');
        if (selMetodo) selMetodo.value = 'Transferencia Bancaria';

        const checkDecl = document.getElementById('pagar-declaracion-responsabilidad');
        if (checkDecl) checkDecl.checked = false;

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
