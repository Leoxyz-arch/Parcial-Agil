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
});

// Función de renderizado según sesión y rol
function renderAppView() {
    const viewLogin = document.getElementById('view-login');
    const viewApp = document.getElementById('view-app');
    const moduleAsistente = document.getElementById('module-asistente');
    const moduleGerente = document.getElementById('module-gerente');
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

    if (user.rol === 'gerente') {
        moduleGerente.classList.remove('hidden');
        moduleAsistente.classList.add('hidden');
        if (window.GerenteModule) {
            window.GerenteModule.init();
        }
    } else {
        moduleAsistente.classList.remove('hidden');
        moduleGerente.classList.add('hidden');
        if (window.AsistenteModule) {
            window.AsistenteModule.init();
        }
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
}
