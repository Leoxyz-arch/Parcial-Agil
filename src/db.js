const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Pool de conexión para Neon PostgreSQL
let pool = null;
let usePostgres = false;

// Ruta de persistencia local (fallback confiable si no hay internet o DATABASE_URL)
const localDbPath = path.join(__dirname, '..', 'data', 'local_db.json');

// Utilidad para fechas relativas
function addDays(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

// Inicializar la conexión a la base de datos (PostgreSQL Neon o Fallback Local)
async function initDatabase() {
    const connectionString = process.env.DATABASE_URL;

    if (connectionString && connectionString.trim() !== '') {
        try {
            console.log('🔄 Conectando a Neon PostgreSQL...');
            pool = new Pool({
                connectionString,
                ssl: {
                    rejectUnauthorized: false
                }
            });

            // Verificar conexión
            const client = await pool.connect();
            const res = await client.query('SELECT NOW() as now');
            client.release();

            usePostgres = true;
            console.log('✅ Conexión establecida exitosamente con Neon PostgreSQL en:', res.rows[0].now);

            // Migrar tablas si no existen
            await createTablesPostgres();
            await seedInitialDataPostgres();
            return;
        } catch (err) {
            console.warn('⚠️ No se pudo conectar a Neon PostgreSQL (' + err.message + '). Activando fallback local persistente...');
            usePostgres = false;
        }
    } else {
        console.log('ℹ️ DATABASE_URL no configurado aún en .env. Usando motor local persistente.');
        console.log('👉 Para conectar a Neon: añade tu cadena DATABASE_URL=postgresql://... en el archivo .env');
        usePostgres = false;
    }

    // Inicializar DB Local
    initLocalDb();
}

// Migración DDL en Postgres
async function createTablesPostgres() {
    const ddl = `
    CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        nombre_completo VARCHAR(100) NOT NULL,
        rol VARCHAR(20) NOT NULL CHECK (rol IN ('gerente', 'asistente')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS obligaciones (
        id SERIAL PRIMARY KEY,
        categoria VARCHAR(30) NOT NULL,
        tipo_comprobante VARCHAR(50) DEFAULT 'Factura Electrónica',
        descripcion VARCHAR(255) NOT NULL,
        beneficiario VARCHAR(150) NOT NULL,
        ruc_beneficiario VARCHAR(20) DEFAULT NULL,
        monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
        fecha_emision DATE NOT NULL,
        fecha_vencimiento DATE NOT NULL,
        cuota_info VARCHAR(50) DEFAULT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
        fecha_pago DATE DEFAULT NULL,
        nro_operacion VARCHAR(80) DEFAULT NULL,
        comprobante_url TEXT DEFAULT NULL,
        comprobante_tipo VARCHAR(20) DEFAULT NULL,
        motivo_anulacion TEXT DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `;
    await pool.query(ddl);
    console.log('📋 Esquema de tablas verificado en Neon PostgreSQL.');
}

// Datos semilla en Postgres si está vacío
async function seedInitialDataPostgres() {
    const checkUsers = await pool.query('SELECT COUNT(*) FROM usuarios');
    if (parseInt(checkUsers.rows[0].count, 10) === 0) {
        await pool.query(`
            INSERT INTO usuarios (username, password, nombre_completo, rol) VALUES
            ('gerente', 'gerente123', 'Carlos Mendoza', 'gerente'),
            ('asistente', 'asistente123', 'Ana Morales', 'asistente');
        `);
        console.log('👤 Usuarios sembrados en Neon PostgreSQL.');
    }

    const checkObligaciones = await pool.query('SELECT COUNT(*) FROM obligaciones');
    if (parseInt(checkObligaciones.rows[0].count, 10) === 0) {
        const seedItems = getSampleObligaciones();
        for (const item of seedItems) {
            await pool.query(`
                INSERT INTO obligaciones 
                (categoria, tipo_comprobante, descripcion, beneficiario, ruc_beneficiario, monto, fecha_emision, fecha_vencimiento, cuota_info, estado, fecha_pago, nro_operacion, comprobante_url, comprobante_tipo, motivo_anulacion)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
                item.categoria,
                item.tipo_comprobante || 'Factura Electrónica',
                item.descripcion,
                item.beneficiario,
                item.ruc_beneficiario || null,
                item.monto,
                item.fecha_emision,
                item.fecha_vencimiento,
                item.cuota_info,
                item.estado,
                item.fecha_pago,
                item.nro_operacion,
                item.comprobante_url,
                item.comprobante_tipo,
                item.motivo_anulacion || null
            ]);
        }
        console.log('💼 Obligaciones iniciales sembradas en Neon PostgreSQL.');
    }
}

function getSampleObligaciones() {
    return [
        {
            categoria: 'servicio',
            tipo_comprobante: 'Recibo Servicios Públicos',
            descripcion: 'Recibo de Energía Eléctrica - Sede Central',
            beneficiario: 'Luz del Sur S.A.A.',
            ruc_beneficiario: '20331898971',
            monto: 850.50,
            fecha_emision: addDays(-20),
            fecha_vencimiento: addDays(2),
            cuota_info: null,
            estado: 'pendiente',
            fecha_pago: null,
            nro_operacion: null,
            comprobante_url: null,
            comprobante_tipo: null,
            motivo_anulacion: null
        },
        {
            categoria: 'impuesto',
            tipo_comprobante: 'Declaración Jurada PDT',
            descripcion: 'Declaración y Pago IGV - Periodo Tributario',
            beneficiario: 'SUNAT',
            ruc_beneficiario: '20131312955',
            monto: 2450.00,
            fecha_emision: addDays(-25),
            fecha_vencimiento: addDays(-1),
            cuota_info: null,
            estado: 'pendiente',
            fecha_pago: null,
            nro_operacion: null,
            comprobante_url: null,
            comprobante_tipo: null,
            motivo_anulacion: null
        },
        {
            categoria: 'prestamo',
            tipo_comprobante: 'Cronograma Bancario',
            descripcion: 'Amortización Préstamo Capital de Trabajo',
            beneficiario: 'Banco de Crédito del Perú (BCP)',
            ruc_beneficiario: '20100047218',
            monto: 3200.00,
            fecha_emision: addDays(-30),
            fecha_vencimiento: addDays(3),
            cuota_info: 'Cuota 08/24',
            estado: 'pendiente',
            fecha_pago: null,
            nro_operacion: null,
            comprobante_url: null,
            comprobante_tipo: null,
            motivo_anulacion: null
        },
        {
            categoria: 'proveedores',
            tipo_comprobante: 'Factura Electrónica',
            descripcion: 'Suministros Operativos de Limpieza y Mantenimiento',
            beneficiario: 'Distribuidora Industrial Lima S.A.C.',
            ruc_beneficiario: '20502391044',
            monto: 1120.00,
            fecha_emision: addDays(-15),
            fecha_vencimiento: addDays(12),
            cuota_info: null,
            estado: 'pendiente',
            fecha_pago: null,
            nro_operacion: null,
            comprobante_url: null,
            comprobante_tipo: null,
            motivo_anulacion: null
        },
        {
            categoria: 'servicio',
            tipo_comprobante: 'Recibo Servicios Públicos',
            descripcion: 'Servicio de Internet Fibra Dedicada 500Mbps',
            beneficiario: 'Telefónica del Perú S.A.A.',
            ruc_beneficiario: '20100017491',
            monto: 420.00,
            fecha_emision: addDays(-40),
            fecha_vencimiento: addDays(-5),
            cuota_info: null,
            estado: 'pagado',
            fecha_pago: addDays(-6),
            nro_operacion: 'OP-7782193',
            comprobante_url: '/img/voucher-sample.svg',
            comprobante_tipo: 'image/svg+xml',
            motivo_anulacion: null
        }
    ];
}

// ----------------- MOTOR LOCAL (FALLBACK EN ARCHIVO JSON) -----------------

function readLocalDb() {
    try {
        if (!fs.existsSync(localDbPath)) {
            const dataDir = path.dirname(localDbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            const initial = { usuarios: [], obligaciones: [] };
            fs.writeFileSync(localDbPath, JSON.stringify(initial, null, 2), 'utf8');
            return initial;
        }
        const raw = fs.readFileSync(localDbPath, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        console.error('Error leyendo base local:', e);
        return { usuarios: [], obligaciones: [] };
    }
}

function writeLocalDb(data) {
    try {
        fs.writeFileSync(localDbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('Error escribiendo base local:', e);
    }
}

function initLocalDb() {
    const db = readLocalDb();
    let changed = false;

    if (!db.usuarios || db.usuarios.length === 0) {
        db.usuarios = [
            { id: 1, username: 'gerente', password: 'gerente123', nombre_completo: 'Carlos Mendoza', rol: 'gerente' },
            { id: 2, username: 'asistente', password: 'asistente123', nombre_completo: 'Ana Morales', rol: 'asistente' }
        ];
        changed = true;
    }

    if (!db.obligaciones || db.obligaciones.length === 0) {
        const seed = getSampleObligaciones();
        db.obligaciones = seed.map((item, idx) => ({
            id: idx + 1,
            ...item,
            created_at: new Date().toISOString()
        }));
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
        
        let newRecord;
        if (params.length === 7) {
            // Formato standard de cuotas/simple: [categoria, desc, bene, monto, fEmis, fVenc, cuota_info]
            newRecord = {
                id: newId,
                categoria: params[0],
                tipo_comprobante: 'Factura Electrónica',
                descripcion: params[1],
                beneficiario: params[2],
                ruc_beneficiario: null,
                monto: parseFloat(params[3]),
                fecha_emision: params[4],
                fecha_vencimiento: params[5],
                cuota_info: params[6] || null,
                estado: 'pendiente',
                fecha_pago: null,
                nro_operacion: null,
                comprobante_url: null,
                comprobante_tipo: null,
                motivo_anulacion: null,
                created_at: new Date().toISOString()
            };
        } else {
            // Formato extendido con RUC y comprobante
            newRecord = {
                id: newId,
                categoria: params[0],
                tipo_comprobante: params[1] || 'Factura Electrónica',
                descripcion: params[2],
                beneficiario: params[3],
                ruc_beneficiario: params[4] || null,
                monto: parseFloat(params[5]),
                fecha_emision: params[6],
                fecha_vencimiento: params[7],
                cuota_info: params[8] || null,
                estado: 'pendiente',
                fecha_pago: null,
                nro_operacion: null,
                comprobante_url: null,
                comprobante_tipo: null,
                motivo_anulacion: null,
                created_at: new Date().toISOString()
            };
        }

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

    // 3.1 UPDATE obligaciones editar
    if (text.startsWith('update obligaciones') && text.includes('set categoria =')) {
        // params: [categoria, descripcion, beneficiario, monto, fecha_emision, fecha_vencimiento, cuota_info, id]
        const id = parseInt(params[7], 10);
        const item = db.obligaciones.find(o => o.id === id);
        if (item) {
            item.categoria = params[0];
            item.descripcion = params[1];
            item.beneficiario = params[2];
            item.monto = parseFloat(params[3]);
            item.fecha_emision = params[4];
            item.fecha_vencimiento = params[5];
            item.cuota_info = params[6] || null;
            item.updated_at = new Date().toISOString();
            writeLocalDb(db);
            return { rows: [item] };
        }
        return { rows: [] };
    }

    // 4. UPDATE obligaciones anular
    if (text.startsWith('update obligaciones') && text.includes("set estado = 'anulado'")) {
        // params: [motivo_anulacion, id]
        const id = parseInt(params[1], 10);
        const item = db.obligaciones.find(o => o.id === id);
        if (item) {
            item.estado = 'anulado';
            item.motivo_anulacion = params[0];
            item.updated_at = new Date().toISOString();
            writeLocalDb(db);
            return { rows: [item] };
        }
        return { rows: [] };
    }

    // 5. SELECT obligaciones (general o por id)
    if (text.includes('from obligaciones')) {
        if (text.includes('where id =')) {
            const id = parseInt(params[0], 10);
            const found = db.obligaciones.find(o => o.id === id);
            return { rows: found ? [found] : [] };
        }
        let items = [...db.obligaciones];
        return { rows: items };
    }

    // 6. DELETE obligaciones
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
