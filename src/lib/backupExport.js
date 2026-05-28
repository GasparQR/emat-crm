import JSZip from "jszip";
import { entities } from "@/api/supabaseClient";
import { rowsToCsv, downloadBlob } from "@/lib/csvExport";

const BACKUP_LIMIT = 5000;

export const BACKUP_ENTITIES = [
  {
    id: "presupuestos",
    label: "Presupuestos",
    entityKey: "Consulta",
    filenamePrefix: "presupuestos",
    sortField: "-created_date",
  },
  {
    id: "contactos",
    label: "Contactos",
    entityKey: "Contacto",
    filenamePrefix: "contactos",
    sortField: "nombre",
  },
  {
    id: "pipeline_stages",
    label: "Etapas del pipeline",
    entityKey: "PipelineStage",
    filenamePrefix: "etapas_pipeline",
    sortField: "orden",
  },
  {
    id: "asesores",
    label: "Asesores y firmas",
    entityKey: "Asesor",
    filenamePrefix: "asesores",
    sortField: "nombre",
  },
  {
    id: "plantillas_whatsapp",
    label: "Plantillas WhatsApp",
    entityKey: "PlantillaWhatsApp",
    filenamePrefix: "plantillas_whatsapp",
    sortField: "nombre",
  },
  {
    id: "listas_whatsapp",
    label: "Listas WhatsApp",
    entityKey: "ListaWhatsApp",
    filenamePrefix: "listas_whatsapp",
    sortField: "nombre",
  },
  {
    id: "historial_envios",
    label: "Historial de envíos",
    entityKey: "HistorialEnvios",
    filenamePrefix: "historial_envios",
    sortField: "-created_date",
  },
];

export const BACKUP_ENTITY_IDS = BACKUP_ENTITIES.map((e) => e.id);

export function getDefaultBackupSelection() {
  return Object.fromEntries(BACKUP_ENTITY_IDS.map((id) => [id, true]));
}

function getDateStr() {
  return new Date().toISOString().split("T")[0];
}

export async function fetchBackupData(workspaceId, selectedIds) {
  const selected = BACKUP_ENTITIES.filter((e) => selectedIds.includes(e.id));
  const filter = { workspace_id: workspaceId };

  const results = await Promise.all(
    selected.map(async (config) => {
      const entity = entities[config.entityKey];
      const rows = await entity.filter(filter, config.sortField, BACKUP_LIMIT);
      return { config, rows: rows || [] };
    })
  );

  return results;
}

export async function buildBackupZip(fetchedResults, dateStr) {
  const zip = new JSZip();

  for (const { config, rows } of fetchedResults) {
    const filename = `${config.filenamePrefix}_${dateStr}.csv`;
    const csvContent = rowsToCsv(rows);
    zip.file(filename, csvContent);
  }

  return zip.generateAsync({ type: "blob" });
}

export async function exportWorkspaceBackup({ workspaceId, selectedIds }) {
  const dateStr = getDateStr();
  const fetched = await fetchBackupData(workspaceId, selectedIds);

  if (fetched.length === 0) {
    throw new Error("No hay ítems seleccionados para exportar");
  }

  const zipBlob = await buildBackupZip(fetched, dateStr);
  const filename = `backup_${dateStr}.zip`;
  downloadBlob(zipBlob, filename);

  const withData = fetched.filter(({ rows }) => rows.length > 0).length;
  const empty = fetched.length - withData;

  return {
    total: fetched.length,
    withData,
    empty,
  };
}
