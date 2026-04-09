import { createClient } from '@supabase/supabase-js';

// Configuración Supabase
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!PROJECT_ID) {
  console.error('❌ VITE_SUPABASE_PROJECT_ID no está configurada en .env');
}
if (!SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_ANON_KEY no está configurada en .env');
}

const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;

// Cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Wrapper para compatibilidad con código existente ──────────────────────────

class SupabaseDataStore {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async filter(query = {}, sortField = null, limit = 2000) {
  const PAGE_SIZE = 1000;
  let allData = [];
  let from = 0;

  while (true) {
    let q = supabase.from(this.tableName).select('*');

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        q = q.eq(key, value);
      }
    });

    if (sortField) {
      const ascending = !sortField.startsWith('-');
      const field = sortField.startsWith('-') ? sortField.slice(1) : sortField;
      q = q.order(field, { ascending });
    }

    const to = from + PAGE_SIZE - 1;
    q = q.range(from, to);

    const { data, error } = await q;
    if (error) {
      console.error(`Error fetching ${this.tableName}:`, error);
      break;
    }

    allData = [...allData, ...(data || [])];

    if (!data || data.length < PAGE_SIZE) break;
    if (limit && allData.length >= limit) break;

    from += PAGE_SIZE;
  }

  return limit ? allData.slice(0, limit) : allData;
}

  async list(sortField = null, limit = 2000) {
    return this.filter({}, sortField, limit);
  }

  async get(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching ${this.tableName} ${id}:`, error);
      return null;
    }
    return data;
  }

  async create(data) {
    const newItem = {
      id: `${this.tableName}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      workspace_id: 'local',
      ...data,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase
      .from(this.tableName)
      .insert([newItem])
      .select()
      .single();

    if (error) {
      console.error(`Error creating ${this.tableName}:`, error);
      throw error;
    }
    return inserted;
  }

  async update(id, data) {
    const updateData = {
      ...data,
      updated_date: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating ${this.tableName} ${id}:`, error);
      throw error;
    }
    return updated;
  }

  async delete(id) {
    const { data: deleted, error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error deleting ${this.tableName} ${id}:`, error);
      throw error;
    }
    return deleted;
  }

  async getAll() {
    return this.list();
  }
}

// ─── Crear proxies para todas las entidades ──────────────────────────────────

const createEntityProxy = (tableName) => {
  const store = new SupabaseDataStore(tableName);
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

// ─── Usuario mock (reemplazar con auth real después) ───────────────────────────

const LOCAL_USER = {
  id: 'admin',
  full_name: 'EMAT Admin',
  email: 'admin@ematcelulosa.com',
  role: 'admin',
  canEditContacts: true,
  canSendMessages: true,
  canViewReports: true,
};

// ─── Exportar base44 compatible ───────────────────────────────────────────────

export const base44 = {
  auth: {
    me: async () => LOCAL_USER,
    logout: () => {
      localStorage.clear();
      window.location.href = '/';
    },
    redirectToLogin: () => {
      window.location.href = '/login';
    },
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

export default supabase;
