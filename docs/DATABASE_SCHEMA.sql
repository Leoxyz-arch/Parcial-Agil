-- =======================================================
-- CashFlow Guard - Esquema de Base de Datos (Neon PostgreSQL)
-- =======================================================

-- 1. Tabla de Usuarios y Roles
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(120) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('gerente', 'asistente')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Obligaciones / Gastos
CREATE TABLE IF NOT EXISTS obligaciones (
    id SERIAL PRIMARY KEY,
    categoria VARCHAR(30) NOT NULL CHECK (categoria IN ('servicio', 'impuesto', 'proveedores', 'prestamo')),
    descripcion VARCHAR(255) NOT NULL,
    beneficiario VARCHAR(150) NOT NULL,
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    cuota_info VARCHAR(50) DEFAULT NULL, -- Para préstamos (ej. "Cuota 3 de 12")
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado')),
    fecha_pago DATE DEFAULT NULL,
    nro_operacion VARCHAR(80) DEFAULT NULL,
    comprobante_url TEXT DEFAULT NULL,
    comprobante_tipo VARCHAR(20) DEFAULT NULL, -- 'imagen' o 'pdf'
    creado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas de dashboard y filtros
CREATE INDEX IF NOT EXISTS idx_obligaciones_fecha_venc ON obligaciones(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_obligaciones_estado ON obligaciones(estado);
CREATE INDEX IF NOT EXISTS idx_obligaciones_categoria ON obligaciones(categoria);
