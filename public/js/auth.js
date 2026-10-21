// auth.js - Control de Sesión, Roles y Permisos en el Cliente

const AUTH = {
    TOKEN_KEY: 'cashflow_user_session',

    getUser: () => {
        try {
            const raw = localStorage.getItem(AUTH.TOKEN_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },

    setUser: (userData) => {
        localStorage.setItem(AUTH.TOKEN_KEY, JSON.stringify(userData));
    },

    logout: () => {
        localStorage.removeItem(AUTH.TOKEN_KEY);
        window.location.reload();
    },

    isAuthenticated: () => {
        return AUTH.getUser() !== null;
    },

    isGerente: () => {
        const u = AUTH.getUser();
        return u && u.rol === 'gerente';
    },

    isAsistente: () => {
        const u = AUTH.getUser();
        return u && u.rol === 'asistente';
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
                if (res.ok) {
                    AUTH.setUser(res.usuario);
                    renderAppView();
                } else {
                    showError(res.mensaje || 'Credenciales inválidas.');
                }
            } catch (err) {
                showError('Error al conectar con el servidor.');
            }
        });
    }

    // Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            AUTH.logout();
        });
    }

    function showError(msg) {
        loginErrorText.textContent = msg;
        loginError.classList.remove('hidden');
    }

    // Inicializar Vista inicial
    renderAppView();
});

// Renderizar la vista según el rol autenticado
function renderAppView() {
    const viewLogin = document.getElementById('view-login');
    const viewApp = document.getElementById('view-app');
    const moduleAsistente = document.getElementById('module-asistente');
    const moduleGerente = document.getElementById('module-gerente');
    const userDisplayName = document.getElementById('user-display-name');
    const userDisplayRole = document.getElementById('user-display-role');

    if (!AUTH.isAuthenticated()) {
        viewLogin.classList.remove('hidden');
        viewApp.classList.add('hidden');
        return;
    }

    const user = AUTH.getUser();
    viewLogin.classList.add('hidden');
    viewApp.classList.remove('hidden');

    userDisplayName.textContent = user.nombre_completo || user.username;
    userDisplayRole.textContent = user.rol === 'gerente' ? 'Gerente' : 'Asistente';

    const tabAsistente = document.getElementById('nav-btn-asistente') || document.getElementById('tab-nav-asistente');
    const tabGerente = document.getElementById('nav-btn-gerente') || document.getElementById('tab-nav-gerente');

    function switchModule(modulo) {
        const iconAsistente = tabAsistente ? tabAsistente.querySelector('.nav-icon') : null;
        const iconGerente = tabGerente ? tabGerente.querySelector('.nav-icon') : null;
        const breadcrumb = document.getElementById('view-title-breadcrumb');

        if (modulo === 'gerente') {
            moduleGerente.classList.remove('hidden');
            moduleAsistente.classList.add('hidden');
            if (tabGerente) {
                tabGerente.classList.add('bg-slate-800', 'text-white', 'border-slate-700');
                tabGerente.classList.remove('text-slate-400');
                if (iconGerente) {
                    iconGerente.classList.add('text-blue-400');
                    iconGerente.classList.remove('text-slate-400');
                }
            }
            if (tabAsistente) {
                tabAsistente.classList.remove('bg-slate-800', 'text-white', 'border-slate-700');
                tabAsistente.classList.add('text-slate-400');
                if (iconAsistente) {
                    iconAsistente.classList.remove('text-blue-400');
                    iconAsistente.classList.add('text-slate-400');
                }
            }
            if (breadcrumb) {
                breadcrumb.textContent = 'Dashboard Gerencial y Auditoría';
            }
            if (window.GerenteModule && typeof window.GerenteModule.init === 'function') {
                window.GerenteModule.init();
            }
        } else {
            moduleAsistente.classList.remove('hidden');
            moduleGerente.classList.add('hidden');
            if (tabAsistente) {
                tabAsistente.classList.add('bg-slate-800', 'text-white', 'border-slate-700');
                tabAsistente.classList.remove('text-slate-400');
                if (iconAsistente) {
                    iconAsistente.classList.add('text-blue-400');
                    iconAsistente.classList.remove('text-slate-400');
                }
            }
            if (tabGerente) {
                tabGerente.classList.remove('bg-slate-800', 'text-white', 'border-slate-700');
                tabGerente.classList.add('text-slate-400');
                if (iconGerente) {
                    iconGerente.classList.remove('text-blue-400');
                    iconGerente.classList.add('text-slate-400');
                }
            }
            if (breadcrumb) {
                breadcrumb.textContent = 'Control de Obligaciones y Pagos';
            }
            if (window.AsistenteModule && typeof window.AsistenteModule.init === 'function') {
                window.AsistenteModule.init();
            }
        }
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    if (user.rol === 'gerente') {
        if (tabAsistente) {
            tabAsistente.classList.remove('hidden');
            tabAsistente.onclick = () => switchModule('asistente');
        }
        if (tabGerente) {
            tabGerente.classList.remove('hidden');
            tabGerente.onclick = () => switchModule('gerente');
        }
        switchModule('gerente');
    } else {
        if (tabAsistente) {
            tabAsistente.classList.remove('hidden');
            tabAsistente.onclick = null;
        }
        if (tabGerente) {
            tabGerente.classList.add('hidden');
        }
        switchModule('asistente');
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

