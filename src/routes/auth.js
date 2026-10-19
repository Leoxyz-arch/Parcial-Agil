const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Debe ingresar su usuario y contraseña.'
            });
        }

        const cleanUser = username.trim().toLowerCase();
        const cleanPass = password.trim();

        const result = await db.query(
            'SELECT id, username, password_hash, nombre_completo, rol FROM usuarios WHERE username = $1',
            [cleanUser]
        );

        if (!result.rows || result.rows.length === 0) {
            return res.status(401).json({
                ok: false,
                mensaje: 'Usuario o contraseña incorrectos.'
            });
        }

        const user = result.rows[0];

        // Verificación de credenciales (en MVP manejamos hash/texto directo)
        if (user.password_hash !== cleanPass) {
            return res.status(401).json({
                ok: false,
                mensaje: 'Usuario o contraseña incorrectos.'
            });
        }

        // Retornar información de sesión
        res.json({
            ok: true,
            mensaje: 'Inicio de sesión exitoso.',
            usuario: {
                id: user.id,
                username: user.username,
                nombre_completo: user.nombre_completo,
                rol: user.rol
            }
        });
    } catch (error) {
        console.error('Error en /api/auth/login:', error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al procesar el inicio de sesión.'
        });
    }
});

module.exports = router;
