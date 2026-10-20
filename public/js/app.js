// app.js - Coordinador y Lifecycle Principal de la Aplicación

// Sistema Profesional de Notificaciones Toast (Reemplaza los alert nativos)
window.Toast = {
    show: (mensaje, tipo = 'info', duracion = 4000) => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;

        const icons = {
            success: 'check-circle-2',
            error: 'alert-octagon',
            warning: 'alert-triangle',
            info: 'info'
        };
        const iconName = icons[tipo] || 'bell';

        toast.innerHTML = `
            <i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
            <div class="flex-1 font-medium">${mensaje}</div>
            <button type="button" class="text-white/60 hover:text-white ml-2 flex-shrink-0" title="Cerrar">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
        `;

        const closeBtn = toast.querySelector('button');
        const dismiss = () => {
            toast.style.animation = 'toastSlideOut 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards';
            setTimeout(() => {
                if (toast.parentElement) toast.parentElement.removeChild(toast);
            }, 200);
        };

        closeBtn.onclick = dismiss;
        container.appendChild(toast);
        if (window.lucide) window.lucide.createIcons();

        if (duracion > 0) {
            setTimeout(dismiss, duracion);
        }
    },
    success: (msg, dur) => window.Toast.show(msg, 'success', dur),
    error: (msg, dur) => window.Toast.show(msg, 'error', dur),
    warning: (msg, dur) => window.Toast.show(msg, 'warning', dur),
    info: (msg, dur) => window.Toast.show(msg, 'info', dur)
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando CashFlow Guard Web...');

    // 1. Verificar estado de la DB y API
    try {
        const status = await API.getStatus();
        const badgeDb = document.getElementById('badge-db');
        const textDb = document.getElementById('text-db-status');
        if (status && status.ok && textDb && badgeDb) {
            textDb.textContent = status.motor_db;
            badgeDb.classList.remove('hidden');
        }
    } catch (e) {
        console.warn('No se pudo verificar el status inicial de la base de datos.');
    }

    // 2. Control de Cierre de Modales Generales
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal-backdrop').forEach(modal => {
                modal.classList.add('hidden');
            });
        });
    });

    // Cerrar al hacer clic en el fondo oscuro
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });


    // 4. Render inicial según sesión previa
    renderAppView();

    // 5. Renderizar iconos Lucide
    if (window.lucide) {
        window.lucide.createIcons();
    }
});

// ========================================================
// SISTEMA DE NOTIFICACIONES Y CONFIRMACIONES IN-APP
// (Reemplaza definitivamente alert() y confirm() del browser)
// ========================================================

window.mostrarNotificacion = (mensaje, tipo = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const borderColors = {
        success: 'border-emerald-500 bg-white text-slate-800',
        error: 'border-red-500 bg-white text-slate-800',
        warning: 'border-amber-500 bg-white text-slate-800',
        info: 'border-blue-500 bg-white text-slate-800'
    };
    const iconColors = {
        success: 'text-emerald-600',
        error: 'text-red-600',
        warning: 'text-amber-600',
        info: 'text-blue-600'
    };
    const icons = {
        success: 'check-circle-2',
        error: 'alert-circle',
        warning: 'alert-triangle',
        info: 'info'
    };

    const bClass = borderColors[tipo] || borderColors.info;
    const iClass = iconColors[tipo] || iconColors.info;
    const iconName = icons[tipo] || 'info';

    toast.className = `p-3.5 rounded-xl border-l-4 shadow-lg border border-slate-200 pointer-events-auto flex items-center justify-between gap-3 transform transition-all duration-300 opacity-0 translate-y-2 ${bClass}`;
    toast.innerHTML = `
        <div class="flex items-center gap-2.5">
            <i data-lucide="${iconName}" class="w-5 h-5 shrink-0 ${iClass}"></i>
            <span class="text-xs font-semibold leading-snug">${mensaje}</span>
        </div>
        <button type="button" class="btn-cerrar-toast text-slate-400 hover:text-slate-600 p-1">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
        toast.classList.remove('opacity-0', 'translate-y-2');
    }, 10);

    const remover = () => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    };

    const btnCerrar = toast.querySelector('.btn-cerrar-toast');
    if (btnCerrar) btnCerrar.onclick = remover;
    setTimeout(remover, 3800);
};

window.mostrarConfirmacion = ({ titulo = 'Confirmación', subtitulo = '¿Estás seguro?', mensaje = '', textoBoton = 'Confirmar', esPeligroso = true, onConfirm }) => {
    const modal = document.getElementById('modal-confirmar-generico');
    if (!modal) {
        if (onConfirm) onConfirm();
        return;
    }

    document.getElementById('modal-conf-titulo').textContent = titulo;
    document.getElementById('modal-conf-subtitulo').textContent = subtitulo;
    document.getElementById('modal-conf-mensaje').textContent = mensaje;

    const btnAceptar = document.getElementById('btn-aceptar-conf');
    const btnCancelar = document.getElementById('btn-cancelar-conf');
    const btnCerrar = document.getElementById('btn-cerrar-modal-conf');

    btnAceptar.textContent = textoBoton;
    if (esPeligroso) {
        btnAceptar.className = 'px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition';
    } else {
        btnAceptar.className = 'px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition';
    }

    const cerrar = () => modal.classList.add('hidden');
    btnCancelar.onclick = cerrar;
    btnCerrar.onclick = cerrar;

    btnAceptar.onclick = () => {
        cerrar();
        if (onConfirm) onConfirm();
    };

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
};

