import { createClient } from '@supabase/supabase-js';

// Configuración Supabase
const PROJECT_ID = 'ywbgeqjqjfnhldqqqklj';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_ANON_KEY no está configurada en .env');
}
// #region agent log
fetch('http://127.0.0.1:7743/ingest/2e0cd9a6-b014-4771-8137-8d54277ffe6b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'89faaa'},body:JSON.stringify({sessionId:'89faaa',location:'supabaseClient.js:boot',message:'supabase client init',data:{hasAnonKey:!!SUPABASE_ANON_KEY,urlSet:!!SUPABASE_URL},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
// #endregion

// Cliente Supabase (sesión persistente en localStorage)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

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

// ─── Perfil CRM por defecto ───────────────────────────────────────────────────

const DEFAULT_PROFILE = {
  workspace_id: 'local',
  role: 'admin',
  canEditContacts: true,
  canSendMessages: true,
  canViewReports: true,
  consulta_follow_up_days: 3,
  consulta_default_condiciones_comerciales: '',
  consulta_default_observaciones: '',
  consulta_firmas_asesor: {},
};

function profileFromAuthUser(authUser) {
  const metaRole = authUser?.app_metadata?.role ?? authUser?.user_metadata?.role;
  return {
    id: authUser.id,
    full_name:
      authUser.user_metadata?.full_name ??
      authUser.user_metadata?.name ??
      authUser.email?.split('@')[0] ??
      'Usuario',
    email: authUser.email ?? '',
    role: metaRole === 'logistica' ? 'logistica' : 'admin',
    ...DEFAULT_PROFILE,
  };
}

function mergeUsuarioRow(row, base) {
  return {
    ...base,
    ...row,
    consulta_firmas_asesor:
      row?.consulta_firmas_asesor && typeof row.consulta_firmas_asesor === 'object'
        ? row.consulta_firmas_asesor
        : {},
  };
}

async function fetchUsuarioByAuthUser(authUser) {
  const base = profileFromAuthUser(authUser);

  const byId = await supabase.from('usuario').select('*').eq('id', authUser.id).maybeSingle();
  if (byId.data) return mergeUsuarioRow(byId.data, base);

  if (authUser.email) {
    const byEmail = await supabase.from('usuario').select('*').eq('email', authUser.email).maybeSingle();
    if (byEmail.data) return mergeUsuarioRow(byEmail.data, { ...base, id: byEmail.data.id ?? authUser.id });
  }

  return base;
}

async function upsertUsuarioFromAuth(authUser) {
  const base = profileFromAuthUser(authUser);
  const payload = {
    id: authUser.id,
    workspace_id: 'local',
    full_name: base.full_name,
    email: base.email,
    role: base.role,
    consulta_follow_up_days: base.consulta_follow_up_days,
    consulta_default_condiciones_comerciales: base.consulta_default_condiciones_comerciales,
    consulta_default_observaciones: base.consulta_default_observaciones,
    consulta_firmas_asesor: base.consulta_firmas_asesor,
    updated_date: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('usuario')
    .upsert([payload], { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.warn('usuario upsert:', error.message);
    return base;
  }
  return mergeUsuarioRow(data, base);
}

// ─── Autenticación (Supabase Auth) ─────────────────────────────────────────────
// Solo login (signInWithPassword). No exportamos signUp: usuarios solo desde el panel Supabase.
// Desactivar "Enable Sign Up" en Authentication → Providers → Email (ver scripts/setup-auth-user.md).

export const auth = {
  getSession: () => supabase.auth.getSession(),

  getAuthUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  signInWithPassword: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  onAuthStateChange: (callback) => supabase.auth.onAuthStateChange(callback),

  ensureUsuarioProfile: async (authUser) => upsertUsuarioFromAuth(authUser),

  me: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      const err = new Error('Sesión requerida');
      err.code = 'AUTH_REQUIRED';
      throw err;
    }

    let profile = await fetchUsuarioByAuthUser(user);
    const needsPersist =
      !profile.email ||
      profile.id !== user.id ||
      (profile.full_name === 'Usuario' && user.email);

    if (needsPersist) {
      profile = await upsertUsuarioFromAuth(user);
    }

    return profile;
  },

  updateMe: async (data) => {
    const authUser = await auth.getAuthUser();
    if (!authUser) throw new Error('Sesión requerida');

    const current = await fetchUsuarioByAuthUser(authUser);
    const nextUser = {
      ...current,
      ...data,
      consulta_firmas_asesor:
        data?.consulta_firmas_asesor && typeof data.consulta_firmas_asesor === 'object'
          ? data.consulta_firmas_asesor
          : current.consulta_firmas_asesor || {},
    };

    const payload = {
      id: authUser.id,
      workspace_id: 'local',
      full_name: nextUser.full_name,
      email: nextUser.email ?? authUser.email,
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

    if (error) throw error;
    return mergeUsuarioRow(upserted, profileFromAuthUser(authUser));
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    localStorage.removeItem('emat_user');
    window.location.href = '/login';
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

