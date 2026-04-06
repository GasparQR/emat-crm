import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CRM_ENTITIES = [
  "Venta", "Contacto", "Consulta", "Proveedor",
  "PipelineStage", "PlantillaWhatsApp", "Mensaje",
  "VariablePlantilla", "ListaWhatsApp", "EnvioWhatsApp"
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;

    // 1. Obtener o crear el Workspace del admin
    let myWorkspace = null;
    const existingMembers = await base44.asServiceRole.entities.WorkspaceMember.filter({ user_id: user.email });
    const adminMembership = existingMembers.find(m => m.role === "admin");

    if (adminMembership) {
      const workspaces = await base44.asServiceRole.entities.Workspace.filter({ id: adminMembership.workspace_id });
      if (workspaces.length > 0) myWorkspace = workspaces[0];
    }

    if (!myWorkspace) {
      if (!dryRun) {
        myWorkspace = await base44.asServiceRole.entities.Workspace.create({
          name: user.full_name ? `Workspace de ${user.full_name}` : "Mi Workspace",
          owner_user_id: user.email
        });
        await base44.asServiceRole.entities.WorkspaceMember.create({
          workspace_id: myWorkspace.id,
          user_id: user.email,
          role: "admin"
        });
      } else {
        myWorkspace = { id: "DRY_RUN_WORKSPACE_ID" };
      }
    }

    const workspaceId = myWorkspace.id;
    const report = { workspace_id: workspaceId, dry_run: dryRun, entities: {} };

    // 2. Recorrer cada entidad del CRM
    for (const entityName of CRM_ENTITIES) {
      const all = await base44.asServiceRole.entities[entityName].list('-created_date', 2000);
      const needsMigration = all.filter(r => !r.workspace_id);
      const alreadyMigrated = all.length - needsMigration.length;

      report.entities[entityName] = {
        total: all.length,
        to_migrate: needsMigration.length,
        already_migrated: alreadyMigrated
      };

      if (!dryRun && needsMigration.length > 0) {
        // Actualizar en lotes de 5 con pausa para no saturar
        const BATCH = 5;
        for (let i = 0; i < needsMigration.length; i += BATCH) {
          const batch = needsMigration.slice(i, i + BATCH);
          for (const record of batch) {
            await base44.asServiceRole.entities[entityName].update(record.id, { workspace_id: workspaceId });
            await new Promise(r => setTimeout(r, 150));
          }
          if (i + BATCH < needsMigration.length) {
            await new Promise(r => setTimeout(r, 500));
          }
        }
      }
    }

    const totalMigrated = Object.values(report.entities).reduce((sum, e) => sum + e.to_migrate, 0);
    const totalAlready = Object.values(report.entities).reduce((sum, e) => sum + e.already_migrated, 0);

    return Response.json({
      success: true,
      dry_run: dryRun,
      workspace_id: workspaceId,
      summary: {
        total_migrated: dryRun ? 0 : totalMigrated,
        would_migrate: dryRun ? totalMigrated : undefined,
        already_had_workspace_id: totalAlready
      },
      entities: report.entities
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});