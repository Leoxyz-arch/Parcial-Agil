// asistente.js - Módulo de Gestión Operativa del Asistente

window.AsistenteModule = {
    obligaciones: [],

    init: async () => {
        AsistenteModule.bindEvents();
        await AsistenteModule.cargarObligaciones();
    },

    bindEvents: () => {
        // Filtros
        const filtroCat = document.getElementById('filtro-categoria-asistente');
        const filtroEst = document.getElementById('filtro-estado-asistente');
        const btnRefresh = document.getElementById('btn-refresh-asistente');

        if (filtroCat) filtroCat.onchange = () => AsistenteModule.cargarObligaciones();
        if (filtroEst) filtroEst.onchange = () => AsistenteModule.cargarObligaciones();
        if (btnRefresh) btnRefresh.onclick = () => AsistenteModule.cargarObligaciones();

        // Modal Crear Obligación
        const btnOpenCrear = document.getElementById('btn-open-modal-crear');
        const modalCrear = document.getElementById('modal-crear-obligacion');
        const formCrear = document.getElementById('form-crear-obligacion');
        const selectCatCrear = document.getElementById('crear-categoria');
        const containerCuota = document.getElementById('container-cuota-prestamo');

        if (btnOpenCrear) {
            btnOpenCrear.onclick = () => {
                formCrear.reset();
                // Fecha emisión por defecto hoy
                document.getElementById('crear-emision').value = new Date().toISOString().split('T')[0];
                containerCuota.classList.add('hidden');
                modalCrear.classList.remove('hidden');
            };
        }

        if (selectCatCrear) {
            selectCatCrear.onchange = (e) => {
                if (e.target.value === 'prestamo') {
                    containerCuota.classList.remove('hidden');
                } else {
                    containerCuota.classList.add('hidden');
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
                const cuota_info = categoria === 'prestamo' ? document.getElementById('crear-cuota').value.trim() : null;

                try {
                    const res = await API.crearObligacion({
                        categoria,
                        descripcion,
                        beneficiario,
                        monto,
                        fecha_emision,
                        fecha_vencimiento,
                        cuota_info
                    });

                    if (res.ok) {
                        modalCrear.classList.add('hidden');
                        await AsistenteModule.cargarObligaciones();
                    } else {
                        alert(res.mensaje || 'Error al registrar la obligación.');
                    }
                } catch (err) {
                    alert('Error de conexión con el servidor.');
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

        // Previsualización inmediata de comprobante
        if (inputArchivo) {
            inputArchivo.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    previewPlaceholder.classList.add('hidden');
                    previewContainer.classList.remove('hidden');
                    previewFilename.textContent = `Archivo: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (re) => {
                            previewImg.src = re.target.result;
                            previewImg.classList.remove('hidden');
                        };
                        reader.readAsDataURL(file);
                    } else {
                        // PDF
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
                    alert('Debe adjuntar la evidencia fotográfica o PDF del voucher.');
                    return;
                }

                const formData = new FormData();
                formData.append('fecha_pago', fecha_pago);
                formData.append('nro_operacion', nro_operacion);
                formData.append('comprobante', file);

                const btnSubmit = document.getElementById('btn-submit-pago');
                btnSubmit.disabled = true;
                btnSubmit.textContent = 'Subiendo voucher...';

                try {
                    const res = await API.pagarObligacion(id, formData);
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i><span>Confirmar Pago al 100%</span>`;

                    if (res.ok) {
                        modalPagar.classList.add('hidden');
                        formPagar.reset();
                        previewPlaceholder.classList.remove('hidden');
                        previewContainer.classList.add('hidden');
                        await AsistenteModule.cargarObligaciones();
                    } else {
                        alert(res.mensaje || 'Error al procesar el pago.');
                    }
                } catch (err) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = `Confirmar Pago al 100%`;
                    alert('Error de conexión al subir el comprobante.');
                }
            };
        }
    },

    cargarObligaciones: async () => {
        const filtroCat = document.getElementById('filtro-categoria-asistente').value;
        const filtroEst = document.getElementById('filtro-estado-asistente').value;

        try {
            const res = await API.getObligaciones({
                categoria: filtroCat,
                estado: filtroEst
            });

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

        if (AsistenteModule.obligaciones.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="py-8 text-center text-slate-400">
                        <i data-lucide="inbox" class="w-10 h-10 mx-auto mb-2 text-slate-300"></i>
                        <p class="font-medium text-sm">No hay obligaciones registradas para este filtro.</p>
                    </td>
                </tr>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        AsistenteModule.obligaciones.forEach(item => {
            const tr = document.createElement('tr');
            
            // Clase de semáforo en borde
            let borderClass = 'border-programado';
            if (item.estado === 'pagado') borderClass = 'border-pagado';
            else if (item.semaforo.codigo === 'vencido') borderClass = 'border-mora-critica pulse-mora bg-red-50/20';
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
                    <button type="button" onclick="window.AsistenteModule.abrirModalPagar(${item.id})"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition text-xs font-bold">
                        <i data-lucide="upload" class="w-3.5 h-3.5"></i>
                        <span>Pagar & Voucher</span>
                    </button>
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

        // Reset vista previa
        const previewPlaceholder = document.getElementById('preview-placeholder');
        const previewContainer = document.getElementById('preview-container');
        previewPlaceholder.classList.remove('hidden');
        previewContainer.classList.add('hidden');
        document.getElementById('pagar-archivo').value = '';

        document.getElementById('modal-pagar-obligacion').classList.remove('hidden');
    }
};
