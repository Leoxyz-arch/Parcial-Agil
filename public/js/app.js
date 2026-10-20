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
    console.log('🚀 Inicializando CashFlow Guard Web...');

    // 1. Verificar estado de la DB y API
    try {
        const status = await API.getStatus();
        const badgeDb = document.getElementById('badge-db');
        const textDb = document.getElementById('text-db-status');
        if (status && status.ok) {
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

    // 3. Modal de Contexto Scrum / Proyecto
    const btnShowContext = document.getElementById('btn-show-context');
    const modalContext = document.getElementById('modal-contexto-scrum');

    if (btnShowContext && modalContext) {
        btnShowContext.addEventListener('click', () => {
            modalContext.classList.remove('hidden');
            if (window.lucide) window.lucide.createIcons();
        });
    }

    // 4. Render inicial según sesión previa
    renderAppView();

    // 5. Renderizar iconos Lucide
    if (window.lucide) {
        window.lucide.createIcons();
    }
});
