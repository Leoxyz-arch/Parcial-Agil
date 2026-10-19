// app.js - Coordinador y Lifecycle Principal de la Aplicación

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
