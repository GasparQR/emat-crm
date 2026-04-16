import { createClient } from '@supabase/supabase-js';

// Configuración Supabase
const PROJECT_ID = 'ywbgeqjqjfnhldqqqklj';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_ANON_KEY no está configurada en .env');
}

// Cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Wrapper de acceso a datos ─────────────────────────────────────────────────

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

// ─── Usuario local (reemplazar con Supabase Auth cuando corresponda) ──────────

const LOCAL_USER = {
  id: 'admin',
  full_name: 'EMAT Admin',
  email: 'admin@ematcelulosa.com',
  role: 'admin',
  canEditContacts: true,
  canSendMessages: true,
  canViewReports: true,
  consulta_follow_up_days: 3,
  consulta_default_condiciones_comerciales: "",
  consulta_default_observaciones: "",
  consulta_firmas_asesor: {},
};

// ─── Autenticación ─────────────────────────────────────────────────────────────

export const auth = {
  me: async () => {
    try {
      const { data, error } = await supabase
        .from('usuario')
        .select('*')
        .eq('id', LOCAL_USER.id)
        .single();

      if (error) {
        // If row doesn't exist yet (or schema missing), fallback to in-memory user.
        return LOCAL_USER;
      }

      const merged = {
        ...LOCAL_USER,
        ...data,
        consulta_firmas_asesor:
          data?.consulta_firmas_asesor && typeof data.consulta_firmas_asesor === 'object'
            ? data.consulta_firmas_asesor
            : {},
      };
      Object.assign(LOCAL_USER, merged);
      return merged;
    } catch {
      return LOCAL_USER;
    }
  },
  updateMe: async (data) => {
    const nextUser = {
      ...LOCAL_USER,
      ...data,
      consulta_firmas_asesor:
        data?.consulta_firmas_asesor && typeof data.consulta_firmas_asesor === 'object'
          ? data.consulta_firmas_asesor
          : (LOCAL_USER.consulta_firmas_asesor || {}),
    };
    Object.assign(LOCAL_USER, nextUser);

    try {
      const payload = {
        id: LOCAL_USER.id,
        workspace_id: 'local',
        full_name: nextUser.full_name,
        email: nextUser.email,
        role: nextUser.role,
        consulta_follow_up_days: nextUser.consulta_follow_up_days,
        consulta_default_condiciones_comerciales: nextUser.consulta_default_condiciones_comerciales,
        consulta_default_observaciones: nextUser.consulta_default_observaciones,
        consulta_firmas_asesor: nextUser.consulta_firmas_asesor,
        updated_date: new Date().toISOString(),
      };

      const { data: upserted, error } = await supabase
        .from('usuario')
        .upsert([payload], { onConflict: 'id' })
        .select()
        .single();

      if (!error && upserted) {
        Object.assign(LOCAL_USER, upserted);
      }
    } catch {
      // Keep local fallback to avoid blocking UI if schema is not ready yet.
    }

    return LOCAL_USER;
  },
  logout: () => {
    localStorage.clear();
    window.location.href = '/';
  },
  redirectToLogin: () => {
    window.location.href = '/login';
  },
};

// ─── Gestión de usuarios ───────────────────────────────────────────────────────

export const users = {
  inviteUser: async (email, role) => {
    console.warn('inviteUser: funcionalidad no disponible sin Supabase Auth configurado', { email, role });
    return Promise.resolve();
  },
};

// ─── Entidades ─────────────────────────────────────────────────────────────────

export const entities = {
  Workspace: createEntityProxy('workspace'),
  WorkspaceMember: createEntityProxy('workspacemember'),
  Asesor: createEntityProxy('asesor'),
  Consulta: createEntityProxy('consulta'),
  Contacto: createEntityProxy('contacto'),
  Proveedor: createEntityProxy('proveedor'),
  PipelineStage: createEntityProxy('pipelinestage'),
  HistorialEnvios: createEntityProxy('historialesenvios'),
  Cliente: createEntityProxy('cliente'),
  Presupuesto: createEntityProxy('presupuesto'),
  PlantillaWhatsApp: createEntityProxy('plantillawhatsapp'),
  EnvioWhatsApp: createEntityProxy('enviowatsapp'),
  Mensaje: createEntityProxy('mensaje'),
  ListaWhatsApp: createEntityProxy('listawhatsapp'),
  VariablePlantilla: createEntityProxy('variableplantilla'),
  Usuario: createEntityProxy('usuario'),
};

export default supabase;
