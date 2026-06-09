import { createClient } from '@supabase/supabase-js';

// Configuración Supabase
const PROJECT_ID = 'ywbgeqjqjfnhldqqqklj';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_ANON_KEY no está configurada en .env');
}

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

function normalizeRole(role, email) {
  // Si es admin@emat.com, siempre es ADMIN
  if (email === 'admin@emat.com') return 'ADMIN';
  
  // Si no, normaliza el role que viene de metadata
  const value = String(role ?? '').toUpperCase();
  if (value === 'ADMIN') return 'ADMIN';
  if (value === 'ASESOR') return 'ASESOR';
  if (value === 'LOGISTICA') return 'LOGISTICA';
  
  // Default
  return 'ASESOR';
}

const DEFAULT_PROFILE = {
  workspace_id: 'local',
  role: 'ASESOR',
  active: true,
  can_view_other_advisors: false,
  asesor_codigo: null,
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
  const normalizedRole = normalizeRole(metaRole, authUser.email);
  const defaultAsesorCode = normalizedRole === 'ASESOR'
    ? (authUser.user_metadata?.asesor_codigo ?? authUser.user_metadata?.asesorCode ?? null)
    : null;
  return {
    ...DEFAULT_PROFILE,
    id: authUser.id,
    full_name:
      authUser.user_metadata?.full_name ??
      authUser.user_metadata?.name ??
      authUser.email?.split('@')[0] ??
      'Usuario',
    email: authUser.email ?? '',
    role: normalizedRole,
    asesor_codigo: defaultAsesorCode ? String(defaultAsesorCode).toUpperCase() : null,
    
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

function applyAuthRoleOverrides(profile, authUser) {
  return {
    ...profile,
    role: normalizeRole(profile?.role, authUser?.email),
    active: profile?.active !== false,
  };
}

async function fetchUsuarioByAuthUser(authUser) {
  const base = profileFromAuthUser(authUser);

  const byId = await supabase.from('usuario').select('*').eq('id', authUser.id).maybeSingle();
  if (byId.data) {
    return applyAuthRoleOverrides(mergeUsuarioRow(byId.data, base), authUser);
  }

  if (authUser.email) {
    const byEmail = await supabase.from('usuario').select('*').eq('email', authUser.email).maybeSingle();
    if (byEmail.data) {
      return applyAuthRoleOverrides(
        mergeUsuarioRow(byEmail.data, { ...base, id: byEmail.data.id ?? authUser.id }),
        authUser,
      );
    }
  }

  return applyAuthRoleOverrides(base, authUser);
}

async function upsertUsuarioFromAuth(authUser) {
  // 1. Construir perfil base desde auth metadata
  const base = profileFromAuthUser(authUser);
  
  // 2. Leer el perfil existente para preservar los campos gestionados por el
  //    admin (active, role, permisos, asesor_codigo). Estos NO deben re-derivarse
  //    desde los metadatos de Auth en cada login: si lo hicieran, una cuenta
  //    desactivada desde el panel se reactivaría al iniciar sesión y se perderían
  //    el rol y los permisos asignados por el admin.
  const { data: existing } = await supabase
    .from('usuario')
    .select(
      'role, active, can_view_other_advisors, asesor_codigo, consulta_default_condiciones_comerciales, consulta_default_observaciones, consulta_follow_up_days, consulta_firmas_asesor',
    )
    .eq('id', authUser.id)
    .maybeSingle();

  // 3. Construir payload preservando el estado de BD cuando el perfil ya existe.
  const payload = {
    id: authUser.id,
    workspace_id: 'local',
    full_name: base.full_name,
    email: base.email,
    role: existing?.role ?? base.role,
    active: existing?.active ?? true,
    can_view_other_advisors:
      existing?.can_view_other_advisors ?? base.can_view_other_advisors ?? false,
    asesor_codigo:
      existing?.asesor_codigo ??
      (base.role === 'ASESOR' ? (base.asesor_codigo ?? null) : null),
    consulta_follow_up_days:
      existing?.consulta_follow_up_days ?? base.consulta_follow_up_days,
    consulta_default_condiciones_comerciales:
      existing?.consulta_default_condiciones_comerciales ??
      base.consulta_default_condiciones_comerciales,
    consulta_default_observaciones:
      existing?.consulta_default_observaciones ?? base.consulta_default_observaciones,
    consulta_firmas_asesor:
      existing?.consulta_firmas_asesor &&
      typeof existing.consulta_firmas_asesor === 'object'
        ? existing.consulta_firmas_asesor
        : base.consulta_firmas_asesor,
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

  ensureUsuarioProfile: async (authUser) => {
    const { data: row } = await supabase
      .from('usuario')
      .select('id, email, full_name')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!row) {
      return upsertUsuarioFromAuth(authUser);
    }

    const needsPersist =
      !row.email || (row.full_name === 'Usuario' && authUser.email);

    if (needsPersist) {
      return upsertUsuarioFromAuth(authUser);
    }

    return fetchUsuarioByAuthUser(authUser);
  },

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
      active: nextUser.active ?? true,
      can_view_other_advisors: nextUser.can_view_other_advisors ?? false,
      asesor_codigo: nextUser.role === 'ASESOR' ? (nextUser.asesor_codigo ?? null) : null,
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

  listUsuarios: async () => {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .order('created_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  setLastSignIn: async () => {
    const authUser = await auth.getAuthUser();
    if (!authUser) return;
    await supabase
      .from('usuario')
      .update({ last_sign_in_at: new Date().toISOString(), updated_date: new Date().toISOString() })
      .eq('id', authUser.id);
  },
};

// ─── Gestión de usuarios ───────────────────────────────────────────────────────

export const users = {
  inviteUser: async () => {
    throw new Error('inviteUser reemplazado por adminUsersApi.createUser');
  },
};

// ─── Workspace settings (PK = workspace_id) ───────────────────────────────────

export const workspaceSettingsApi = {
  async get(workspaceId = 'local') {
    const { data, error } = await supabase
      .from('workspace_settings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (error) {
      console.error('Error fetching workspace_settings:', error);
      return null;
    }
    return data;
  },

  async upsert(workspaceId, fields) {
    const existing = await this.get(workspaceId);
    const row = {
      workspace_id: workspaceId,
      consulta_default_condiciones_comerciales:
        fields.consulta_default_condiciones_comerciales
        ?? existing?.consulta_default_condiciones_comerciales
        ?? '',
      consulta_default_observaciones:
        fields.consulta_default_observaciones
        ?? existing?.consulta_default_observaciones
        ?? '',
      consulta_default_iva:
        fields.consulta_default_iva
        ?? existing?.consulta_default_iva
        ?? 21,
      view_layout_config:
        fields.view_layout_config
        ?? existing?.view_layout_config
        ?? {},
      frequent_cities:
        fields.frequent_cities
        ?? existing?.frequent_cities
        ?? [],
      updated_date: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('workspace_settings')
      .upsert(row, { onConflict: 'workspace_id' })
      .select()
      .single();
    if (error) {
      console.error('Error upserting workspace_settings:', error);
      throw error;
    }
    return data;
  },

  async saveViewLayout(workspaceId, viewLayoutConfig) {
    const existing = await this.get(workspaceId);
    return this.upsert(workspaceId, {
      consulta_default_condiciones_comerciales: existing?.consulta_default_condiciones_comerciales,
      consulta_default_observaciones: existing?.consulta_default_observaciones,
      consulta_default_iva: existing?.consulta_default_iva,
      view_layout_config: viewLayoutConfig,
      frequent_cities: existing?.frequent_cities,
    });
  },

  async saveFrequentCities(workspaceId, frequentCities) {
    const existing = await this.get(workspaceId);
    return this.upsert(workspaceId, {
      consulta_default_condiciones_comerciales: existing?.consulta_default_condiciones_comerciales,
      consulta_default_observaciones: existing?.consulta_default_observaciones,
      consulta_default_iva: existing?.consulta_default_iva,
      view_layout_config: existing?.view_layout_config,
      frequent_cities: frequentCities,
    });
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
  CatalogoProducto: createEntityProxy('catalogo_producto'),
  Usuario: createEntityProxy('usuario'),
};
