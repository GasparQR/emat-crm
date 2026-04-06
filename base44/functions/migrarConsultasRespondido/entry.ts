import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Buscar todas las consultas con etapa "Respondido"
        const consultasRespondido = await base44.asServiceRole.entities.Consulta.filter({ 
            etapa: "Seguimiento1" 
        });

        // Actualizar cada una a "Seguimiento"
        const updates = [];
        for (const consulta of consultasRespondido) {
            const update = await base44.asServiceRole.entities.Consulta.update(consulta.id, {
                etapa: "Seguimiento"
            });
            updates.push(update);
        }

        return Response.json({ 
            success: true,
            mensaje: `Se actualizaron ${updates.length} consultas de "Respondido" a "Seguimiento"`,
            actualizadas: updates.length
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});