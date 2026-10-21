// api.js - Cliente HTTP para consumir los endpoints REST de Castillo Robles

// Función global utilitaria para formatear fechas a formato peruano DD-MM-AA
function formatFechaDDMMAA(isoStr) {
    if (!isoStr) return '—';
    const parts = String(isoStr).split('-');
    if (parts.length !== 3) return isoStr;
    const yy = parts[0].length === 4 ? parts[0].slice(-2) : parts[0];
    return `${parts[2]}-${parts[1]}-${yy}`;
}
window.formatFechaDDMMAA = formatFechaDDMMAA;

const API = {
    // 1. Autenticación
    login: async (username, password) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return await res.json();
    },

    // 2. Estado de la API y DB
    getStatus: async () => {
        try {
            const res = await fetch('/api/status');
            return await res.json();
        } catch (e) {
            return { ok: false, motor_db: 'Desconectado' };
        }
    },

    // 3. Obligaciones
    getObligaciones: async (filtros = {}) => {
        const queryParams = new URLSearchParams();
        if (filtros.mes) queryParams.append('mes', filtros.mes);
        if (filtros.anio) queryParams.append('anio', filtros.anio);
        if (filtros.categoria && filtros.categoria !== 'todas') queryParams.append('categoria', filtros.categoria);
        if (filtros.estado && filtros.estado !== 'todos') queryParams.append('estado', filtros.estado);
        if (filtros.q && filtros.q.trim() !== '') queryParams.append('q', filtros.q.trim());

        const url = `/api/obligaciones?${queryParams.toString()}`;
        const res = await fetch(url);
        return await res.json();
    },

    crearObligacion: async (datos) => {
        const res = await fetch('/api/obligaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        return await res.json();
    },

    pagarObligacion: async (id, formData) => {
        const res = await fetch(`/api/obligaciones/${id}/pagar`, {
            method: 'POST',
            body: formData // multipart/form-data con archivo de voucher
        });
        return await res.json();
    },

    anularObligacion: async (id, motivo) => {
        const res = await fetch(`/api/obligaciones/${id}/anular`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motivo })
        });
        return await res.json();
    },

    eliminarObligacion: async (id) => {
        const res = await fetch(`/api/obligaciones/${id}`, {
            method: 'DELETE'
        });
        return await res.json();
    },

    editarObligacion: async (id, datos) => {
        const res = await fetch(`/api/obligaciones/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        return await res.json();
    },

    // 4. Dashboard Gerencial
    getKpis: async (mes, anio) => {
        const queryParams = new URLSearchParams();
        if (mes) queryParams.append('mes', mes);
        if (anio) queryParams.append('anio', anio);

        const url = `/api/dashboard/kpis?${queryParams.toString()}`;
        const res = await fetch(url);
        return await res.json();
    },

    getExportCsvUrl: (mes, anio) => {
        return `/api/dashboard/export/csv?mes=${mes || ''}&anio=${anio || ''}`;
    }
};
