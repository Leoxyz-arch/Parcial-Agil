const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let pool = null;
let usePostgres = false;

// Almacén de fallback local en caso de que aún no se configure Neon o no haya internet
const localDbPath = path.join(__dirname, '..', 'data', 'local_db.json');

function ensureLocalDataDir() {
    const dir = path.dirname(localDbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(localDbPath)) {
        const initialData = {
            usuarios: [],
            obligaciones: []
        };
        fs.writeFileSync(localDbPath, JSON.stringify(initialData, null, 2), 'utf-8');
    }
}

function readLocalDb() {
    ensureLocalDataDir();
    const raw = fs.readFileSync(localDbPath, 'utf-8');
    return JSON.parse(raw);
}

function writeLocalDb(data) {
    ensureLocalDataDir();
    fs.writeFileSync(localDbPath, JSON.stringify(data, null, 2), 'utf-8');
}

// Inicializar conexión
async function initDatabase() {
    const connectionString = process.env.DATABASE_URL;

    if (connectionString && connectionString.trim() !== '') {
        try {
            console.log('🔗 Conectando a Neon PostgreSQL...');
            pool = new Pool({
                connectionString: connectionString,
                ssl: {
                    rejectUnauthorized: false
                },
                connectionTimeoutMillis: 7000
            });

            // Probar la conexión
            const testRes = await pool.query('SELECT NOW()');
            usePostgres = true;
            console.log('✅ Conexión exitosa a Neon PostgreSQL a las:', testRes.rows[0].now);

            // Crear tablas en Neon
            await createTablesPostgres();
            await seedInitialDataPostgres();
            return;
        } catch (error) {
            console.warn('⚠️ No se pudo conectar a Neon PostgreSQL (verifique DATABASE_URL o conexión a internet):', error.message);
            console.log('🔄 Activando motor de datos local persistente (fallback seguro para la demo)...');
            usePostgres = false;
        }
    } else {
        console.log('ℹ️ DATABASE_URL no configurado aún en .env. Usando motor local persistente.');
        console.log('👉 Para conectar a Neon: añade tu cadena DATABASE_URL=postgresql://... en el archivo .env');
    }

    // Inicializar local
    initLocalDb();
}

async function createTablesPostgres() {
    const ddl = `
    CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        nombre_completo VARCHAR(120) NOT NULL,
        rol VARCHAR(20) NOT NULL CHECK (rol IN ('gerente', 'asistente')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS obligaciones (
        id SERIAL PRIMARY KEY,
        categoria VARCHAR(30) NOT NULL CHECK (categoria IN ('servicio', 'impuesto', 'proveedores', 'prestamo')),
        descripcion VARCHAR(255) NOT NULL,
        beneficiario VARCHAR(150) NOT NULL,
        monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
        fecha_emision DATE NOT NULL,
        fecha_vencimiento DATE NOT NULL,
        cuota_info VARCHAR(50) DEFAULT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado')),
        fecha_pago DATE DEFAULT NULL,
        nro_operacion VARCHAR(80) DEFAULT NULL,
        comprobante_url TEXT DEFAULT NULL,
        comprobante_tipo VARCHAR(20) DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `;
    await pool.query(ddl);
}

// Datos semilla
const defaultUsers = [
    { username: 'gerente', password_hash: 'gerente123', nombre_completo: 'Lic. Roberto Gerente', rol: 'gerente' },
    { username: 'asistente', password_hash: 'asistente123', nombre_completo: 'Ana María Asistente', rol: 'asistente' }
];

function getSampleObligaciones() {
    const today = new Date();
    
    // Función auxiliar para fechas relativas ISO (YYYY-MM-DD)
    const addDays = (days) => {
        const d = new Date(today);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    };

    return [
        {
            categoria: 'servicio',
            descripcion: 'Recibo de Energía Eléctrica - Sede Central',
            beneficiario: 'Luz del Sur S.A.A.',
            monto: 850.50,
            fecha_emision: addDays(-20),
            fecha_vencimiento: addDays(2), // Por vencer en 2 días (Alerta naranja/roja <= 3 días)
            cuota_info: null,
            estado: 'pendiente',
            fecha_pago: null,
            nro_operacion: null,
            comprobante_url: null,
            comprobante_tipo: null
        },
        {
            categoria: 'impuesto',
            descripcion: 'Declaración y Pago IGV - Periodo Tributario',
            beneficiario: 'SUNAT',
            monto: 2450.00,
            fecha_emision: addDays(-25),
            fecha_vencimiento: addDays(-1), // Vencido hace 1 día (Alerta roja mora)
            cuota_info: null,
            estado: 'pendiente',
            fecha_pago: null,
            nro_operacion: null,
            comprobante_url: null,
            comprobante_tipo: null
        },
        {
            categoria: 'prestamo',
            descripcion: 'Crédito de Capital de Trabajo Pyme',
            beneficiario: 'Banco BCP',
            monto: 1600.00,
            fecha_emision: addDays(-30),
            fecha_vencimiento: addDays(-5),
            cuota_info: 'Cuota 3 de 12',
            estado: 'pagado',
            fecha_pago: addDays(-6),
            nro_operacion: 'BCP-OP-894120',
            comprobante_url: '/uploads/sample_voucher_bcp.svg',
            comprobante_tipo: 'imagen'
        },
        {
            categoria: 'proveedores',
            descripcion: 'Factura F001-00293 Suministros y Empaques',
            beneficiario: 'Distribuidora Alfa S.A.C.',
            monto: 3200.00,
            fecha_emision: addDays(-5),
            fecha_vencimiento: addDays(12), // Programado (> 3 días)
            cuota_info: null,
            estado: 'pendiente',
            fecha_pago: null,
            nro_operacion: null,
            comprobante_url: null,
            comprobante_tipo: null
        }
    ];
}

async function seedInitialDataPostgres() {
    const userCountRes = await pool.query('SELECT COUNT(*) FROM usuarios');
    if (parseInt(userCountRes.rows[0].count, 10) === 0) {
        console.log('🌱 Sembrando usuarios iniciales en Neon PostgreSQL...');
        for (const u of defaultUsers) {
            await pool.query(
                'INSERT INTO usuarios (username, password_hash, nombre_completo, rol) VALUES ($1, $2, $3, $4)',
                [u.username, u.password_hash, u.nombre_completo, u.rol]
            );
        }
    }

    const obligCountRes = await pool.query('SELECT COUNT(*) FROM obligaciones');
    if (parseInt(obligCountRes.rows[0].count, 10) === 0) {
        console.log('🌱 Sembrando obligaciones iniciales de prueba en Neon PostgreSQL...');
        const samples = getSampleObligaciones();
        for (const s of samples) {
            await pool.query(
                `INSERT INTO obligaciones 
                (categoria, descripcion, beneficiario, monto, fecha_emision, fecha_vencimiento, cuota_info, estado, fecha_pago, nro_operacion, comprobante_url, comprobante_tipo)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [s.categoria, s.descripcion, s.beneficiario, s.monto, s.fecha_emision, s.fecha_vencimiento, s.cuota_info, s.estado, s.fecha_pago, s.nro_operacion, s.comprobante_url, s.comprobante_tipo]
            );
        }
    }
}

function initLocalDb() {
    const db = readLocalDb();
    let changed = false;

    if (!db.usuarios || db.usuarios.length === 0) {
        db.usuarios = defaultUsers.map((u, idx) => ({ id: idx + 1, ...u, created_at: new Date().toISOString() }));
        changed = true;
    }

    if (!db.obligaciones || db.obligaciones.length === 0) {
        const samples = getSampleObligaciones();
        db.obligaciones = samples.map((s, idx) => ({ id: idx + 1, ...s, created_at: new Date().toISOString() }));
        changed = true;
    }

    if (changed) {
        writeLocalDb(db);
        console.log('🌱 Base de datos local inicializada con datos semilla.');
    }
}

// Wrapper unificado para queries
async function query(sqlText, params = []) {
    if (usePostgres && pool) {
        return await pool.query(sqlText, params);
    }

    // Modo local emulado
    return executeLocalQuery(sqlText, params);
}

function executeLocalQuery(sqlText, params = []) {
    const db = readLocalDb();
    const text = sqlText.trim().toLowerCase();

    // 1. SELECT usuarios por username
    if (text.includes('from usuarios') && text.includes('username =')) {
        const username = params[0];
        const user = db.usuarios.find(u => u.username.toLowerCase() === (username || '').toLowerCase());
        return { rows: user ? [user] : [] };
    }

    // 2. INSERT INTO obligaciones
    if (text.startsWith('insert into obligaciones')) {
        const newId = db.obligaciones.length > 0 ? Math.max(...db.obligaciones.map(o => o.id)) + 1 : 1;
        const newRecord = {
            id: newId,
            categoria: params[0],
            descripcion: params[1],
            beneficiario: params[2],
            monto: parseFloat(params[3]),
            fecha_emision: params[4],
            fecha_vencimiento: params[5],
            cuota_info: params[6] || null,
            estado: 'pendiente',
            fecha_pago: null,
            nro_operacion: null,
            comprobante_url: null,
            comprobante_tipo: null,
            created_at: new Date().toISOString()
        };
        db.obligaciones.push(newRecord);
        writeLocalDb(db);
        return { rows: [newRecord] };
    }

    // 3. UPDATE obligaciones pagar
    if (text.startsWith('update obligaciones') && text.includes("set estado = 'pagado'")) {
        // params: [fecha_pago, nro_operacion, comprobante_url, comprobante_tipo, id]
        const id = parseInt(params[4], 10);
        const item = db.obligaciones.find(o => o.id === id);
        if (item) {
            item.estado = 'pagado';
            item.fecha_pago = params[0];
            item.nro_operacion = params[1];
            item.comprobante_url = params[2];
            item.comprobante_tipo = params[3];
            item.updated_at = new Date().toISOString();
            writeLocalDb(db);
            return { rows: [item] };
        }
        return { rows: [] };
    }

    // 4. SELECT obligaciones (general o por id)
    if (text.includes('from obligaciones')) {
        if (text.includes('where id =')) {
            const id = parseInt(params[0], 10);
            const found = db.obligaciones.find(o => o.id === id);
            return { rows: found ? [found] : [] };
        }
        let items = [...db.obligaciones];
        return { rows: items };
    }

    // 5. DELETE obligaciones
    if (text.startsWith('delete from obligaciones')) {
        const id = parseInt(params[0], 10);
        const index = db.obligaciones.findIndex(o => o.id === id);
        if (index !== -1) {
            const deleted = db.obligaciones.splice(index, 1);
            writeLocalDb(db);
            return { rows: deleted };
        }
        return { rows: [] };
    }

    return { rows: [] };
}

module.exports = {
    initDatabase,
    query,
    isPostgres: () => usePostgres
};
