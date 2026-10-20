// auth.js - Manejo de Autenticación, Sesión y Control de Roles

const Auth = {
    SESSION_KEY: 'cashflow_user_session',

    getUser: () => {
        const raw = sessionStorage.getItem(Auth.SESSION_KEY);
        try {
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },

    setUser: (userData) => {
        sessionStorage.setItem(Auth.SESSION_KEY, JSON.stringify(userData));
    },

    clearUser: () => {
        sessionStorage.removeItem(Auth.SESSION_KEY);
    },

    isLoggedIn: () => {
        return !!Auth.getUser();
    },

    getRole: () => {
        const u = Auth.getUser();
        return u ? u.rol : null;
    }
};

// Eventos de Login y Control de Interfaz
document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('form-login');
    const inputUsername = document.getElementById('login-username');
    const inputPassword = document.getElementById('login-password');
    const loginError = document.getElementById('login-error');
    const loginErrorText = document.getElementById('login-error-text');
    const btnLogout = document.getElementById('btn-logout');

    const btnQuickAsistente = document.getElementById('btn-quick-asistente');
    const btnQuickGerente = document.getElementById('btn-quick-gerente');

    // Botones rápidos de prueba
    if (btnQuickAsistente) {
        btnQuickAsistente.addEventListener('click', () => {
            inputUsername.value = 'asistente';
            inputPassword.value = 'asistente123';
            formLogin.dispatchEvent(new Event('submit'));
        });
    }

    if (btnQuickGerente) {
        btnQuickGerente.addEventListener('click', () => {
            inputUsername.value = 'gerente';
            inputPassword.value = 'gerente123';
            formLogin.dispatchEvent(new Event('submit'));
        });
    }

    // Submit Login
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginError.classList.add('hidden');

            const username = inputUsername.value.trim();
            const password = inputPassword.value.trim();

            if (!username || !password) {
                showError('Por favor complete su usuario y contraseña.');
                return;
            }

            try {
                const res = await API.login(username, password);
                if (res.ok && res.usuario) {
                    Auth.setUser(res.usuario);
                    renderAppView();
                } else {
                    showError(res.mensaje || 'Usuario o contraseña incorrectos.');
                }
            } catch (err) {
                showError('Error de conexión con el servidor.');
            }
        });
    }

    function showError(msg) {
        loginErrorText.textContent = msg;
        loginError.classList.remove('hidden');
    }

    // Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            Auth.clearUser();
            renderAppView();
        });
    }

    // Navegación Sidebar de Módulos
    const navBtnAsistente = document.getElementById('nav-btn-asistente');
    const navBtnGerente = document.getElementById('nav-btn-gerente');

    if (navBtnAsistente) {
        navBtnAsistente.onclick = () => switchModulo('asistente');
    }
    if (navBtnGerente) {
        navBtnGerente.onclick = () => switchModulo('gerente');
    }
});

function switchModulo(modulo) {
    const moduleAsistente = document.getElementById('module-asistente');
    const moduleGerente = document.getElementById('module-gerente');
    const breadcrumb = document.getElementById('view-title-breadcrumb');
    const containerPeriodo = document.getElementById('container-periodo-gerente');
    const btnCrear = document.getElementById('btn-open-modal-crear');
    const navBtnAsistente = document.getElementById('nav-btn-asistente');
    const navBtnGerente = document.getElementById('nav-btn-gerente');

    if (modulo === 'gerente') {
        moduleGerente.classList.remove('hidden');
        moduleAsistente.classList.add('hidden');
        if (breadcrumb) breadcrumb.textContent = 'Dashboard Ejecutivo';
        if (containerPeriodo) containerPeriodo.classList.remove('hidden');
        if (btnCrear) btnCrear.classList.add('hidden');

        if (navBtnGerente) navBtnGerente.className = 'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 transition-subtle text-left';
        if (navBtnAsistente) navBtnAsistente.className = 'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-subtle text-left';

        if (window.GerenteModule) window.GerenteModule.init();
    } else {
        moduleAsistente.classList.remove('hidden');
        moduleGerente.classList.add('hidden');
        if (breadcrumb) breadcrumb.textContent = 'Obligaciones Financieras';
        if (containerPeriodo) containerPeriodo.classList.add('hidden');
        if (btnCrear) btnCrear.classList.remove('hidden');

        if (navBtnAsistente) navBtnAsistente.className = 'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 transition-subtle text-left';
        if (navBtnGerente) navBtnGerente.className = 'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-subtle text-left';

        if (window.AsistenteModule) window.AsistenteModule.init();
    }

    if (window.lucide) window.lucide.createIcons();
}

// Función de renderizado según sesión y rol
function renderAppView() {
    const viewLogin = document.getElementById('view-login');
    const viewApp = document.getElementById('view-app');
    const userDisplayName = document.getElementById('user-display-name');
    const userDisplayRole = document.getElementById('user-display-role');

    if (!Auth.isLoggedIn()) {
        viewLogin.classList.remove('hidden');
        viewApp.classList.add('hidden');
        return;
    }

    const user = Auth.getUser();
    viewLogin.classList.add('hidden');
    viewApp.classList.remove('hidden');

    userDisplayName.textContent = user.nombre_completo || user.username;
    userDisplayRole.textContent = user.rol === 'gerente' ? 'Gerente' : 'Asistente';

    switchModulo(user.rol === 'gerente' ? 'gerente' : 'asistente');

    if (window.lucide) {
        window.lucide.createIcons();
    }
}
