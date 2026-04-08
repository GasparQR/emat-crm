// Local data store using localStorage
// Reemplaza base44 SDK — EMAT Celulosa CRM

class LocalDataStore {
  constructor(entityName) {
    this.entityName = entityName;
    this._key = `emat_${entityName}`;
  }

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this._key) || '[]');
    } catch {
      return [];
    }
  }

  save(data) {
    localStorage.setItem(this._key, JSON.stringify(data));
  }

  async filter(query = {}, sortField = null, limit = 2000) {
    let items = this.getAll();

    // Filtrar por campos (ignorar workspace_id — single tenant)
    Object.entries(query).forEach(([k, v]) => {
      if (k === 'workspace_id') return;
      items = items.filter(item => item[k] === v);
    });

    // Ordenar
    if (sortField) {
      const desc = sortField.startsWith('-');
      const field = desc ? sortField.slice(1) : sortField;
      items.sort((a, b) => {
        const av = a[field] ?? '';
        const bv = b[field] ?? '';
        if (desc) return bv > av ? 1 : bv < av ? -1 : 0;
        return av > bv ? 1 : av < bv ? -1 : 0;
      });
    }

    return limit ? items.slice(0, limit) : items;
  }

  async list(sortField = null, limit = 2000) {
    return this.filter({}, sortField, limit);
  }

  async get(id) {
    const items = this.getAll();
    return items.find(item => item.id === id) || null;
  }

  async create(data) {
    const items = this.getAll();
    const newItem = {
      id: `${this.entityName}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      workspace_id: 'local',
      ...data,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };
    items.push(newItem);
    this.save(items);
    return newItem;
  }

  async update(id, data) {
    const items = this.getAll();
    const idx = items.findIndex(item => item.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...data, updated_date: new Date().toISOString() };
      this.save(items);
      return items[idx];
    }
    return null;
  }

  async delete(id) {
    const items = this.getAll();
    const idx = items.findIndex(item => item.id === id);
    if (idx !== -1) {
      const [deleted] = items.splice(idx, 1);
      this.save(items);
      return deleted;
    }
    return null;
  }
}

// ─── Auto-seed desde public/seed_data.json ──────────────────────────────────
// Cambiar SEED_VERSION cada vez que se regenera seed_data.json para forzar recarga
const SEED_VERSION = 'v4';

async function seedIfNeeded() {
  const currentVersion = localStorage.getItem('emat_seed_version');
  if (currentVersion === SEED_VERSION) return; // ya tiene datos actualizados

  try {
    const res = await fetch('/seed_data.json');
    if (!res.ok) return;
    const { presupuestos = [], clientes = [], stages = [] } = await res.json();

    if (presupuestos.length > 0) {
      localStorage.setItem('emat_Consulta', JSON.stringify(presupuestos));
    }
    if (clientes.length > 0) {
      localStorage.setItem('emat_Contacto', JSON.stringify(clientes));
    }
    if (stages.length > 0) {
      localStorage.setItem('emat_PipelineStage', JSON.stringify(stages));
    }
    localStorage.setItem('emat_seed_version', SEED_VERSION);
    console.log(`✅ EMAT CRM ${SEED_VERSION}: ${presupuestos.length} presupuestos, ${clientes.length} clientes cargados`);
  } catch (e) {
    console.warn('seed_data.json no disponible:', e.message);
  }
}

seedIfNeeded();
// ─────────────────────────────────────────────────────────────────────────────

const createEntityProxy = (entityName) => {
  const store = new LocalDataStore(entityName);
  return {
    filter: (query, sortField, limit) => store.filter(query, sortField, limit),
    list: (sortField, limit) => store.list(sortField, limit),
    get: (id) => store.get(id),
    create: (data) => store.create(data),
    update: (id, data) => store.update(id, data),
    delete: (id) => store.delete(id),
    getAll: () => store.getAll(),
  };
};

const LOCAL_USER = {
  id: 'admin',
  full_name: 'EMAT Admin',
  email: 'admin@ematcelulosa.com',
  role: 'admin',
  canEditContacts: true,
  canSendMessages: true,
  canViewReports: true,
};

export const base44 = {
  auth: {
    me: async () => LOCAL_USER,
    logout: () => {},
    redirectToLogin: () => {},
  },
  appLogs: {
    logUserInApp: () => Promise.resolve(),
  },
  entities: {
    Workspace: createEntityProxy('Workspace'),
    WorkspaceMember: createEntityProxy('WorkspaceMember'),
    Consulta: createEntityProxy('Consulta'),
    Contacto: createEntityProxy('Contacto'),
    Venta: createEntityProxy('Venta'),
    Proveedor: createEntityProxy('Proveedor'),
    PipelineStage: createEntityProxy('PipelineStage'),
    Postventa: createEntityProxy('Postventa'),
    HistorialEnvios: createEntityProxy('HistorialEnvios'),
    Cliente: createEntityProxy('Cliente'),
    Presupuesto: createEntityProxy('Presupuesto'),
    PlantillaWhatsApp: createEntityProxy('PlantillaWhatsApp'),
    EnvioWhatsApp: createEntityProxy('EnvioWhatsApp'),
    Mensaje: createEntityProxy('Mensaje'),
    ListaWhatsApp: createEntityProxy('ListaWhatsApp'),
    VariablePlantilla: createEntityProxy('VariablePlantilla'),
    Usuario: createEntityProxy('Usuario'),
  },
};
