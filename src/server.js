const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const db = require('./db');

const authRoutes = require('./routes/auth');
const obligacionesRoutes = require('./routes/obligaciones');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Servir la carpeta de comprobantes subidos
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Montar Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/obligaciones', obligacionesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Endpoint de salud del sistema
app.get('/api/status', (req, res) => {
    res.json({
        ok: true,
        nombre: 'Castillo Robles API',
        estado: 'operativo',
        motor_db: db.isPostgres() ? 'Neon PostgreSQL (Cloud)' : 'Motor Local Persistente (Fallback)',
        timestamp: new Date().toISOString()
    });
});

// Manejo de rutas no encontradas de API
app.use('/api/*', (req, res) => {
    res.status(404).json({ ok: false, mensaje: 'Endpoint no encontrado.' });
});

// Redirigir cualquier otra petición al index.html (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Iniciar Servidor
async function startServer() {
    try {
        console.log('Inicializando Sistema Castillo Robles...');
        await db.initDatabase();

        app.listen(PORT, () => {
            console.log(`=======================================================`);
            console.log(`Castillo Robles escuchando en: http://localhost:${PORT}`);
            console.log(`Perfil Gerente:   usuario: gerente   | clave: gerente123`);
            console.log(`Perfil Asistente: usuario: asistente | clave: asistente123`);
            console.log(`Base de Datos:    ${db.isPostgres() ? 'Neon PostgreSQL' : 'Local Fallback'}`);
            console.log(`=======================================================`);
        });
    } catch (error) {
        console.error('Error fatal al iniciar el servidor:', error);
        process.exit(1);
    }
}

startServer();
