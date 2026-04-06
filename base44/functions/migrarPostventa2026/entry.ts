import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function addBusinessDays(startDate, days) {
    const date = new Date(startDate);
    let added = 0;
    while (added < days) {
        date.setDate(date.getDate() + 1);
        const day = date.getDay();
        if (day !== 0 && day !== 6) added++;
    }
    return date;
}

function toDateStr(date) {
    return date.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Acceso no autorizado' }, { status: 403 });
        }

        const ventas = await base44.asServiceRole.entities.Venta.filter({
            estado: 'Finalizada',
            fecha: {
                $gte: '2026-01-01',
                $lt: '2027-01-01'
            }
        });

        // Filtrar solo las que no tienen postventa activa
        const ventasSinPostventa = ventas.filter(v => !v.postventaActiva);

        const today = new Date();
        const proximoSeguimiento = toDateStr(addBusinessDays(today, 3));

        const updates = ventasSinPostventa.map(venta =>
            base44.asServiceRole.entities.Venta.update(venta.id, {
                postventaActiva: true,
                postventaEstado: 'Pendiente',
                postventaPaso: 0,
                proximoSeguimientoPostventa: proximoSeguimiento
            })
        );

        await Promise.all(updates);

        return Response.json({
            success: true,
            message: `Postventa activada para ${ventasSinPostventa.length} ventas de 2026.`,
            total: ventasSinPostventa.length
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});