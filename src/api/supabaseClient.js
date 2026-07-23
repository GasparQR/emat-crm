import { createClient } from '@supabase/supabase-js';
import { normalizeRole } from '@/lib/permissions';

// Supabase configuration — prefer env vars; fall back to hardcoded values
// so existing Vercel deployments continue working until the env var is added.
// To migrate: add VITE_SUPABASE_URL to your .env.local and Vercel project settings.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://ywbgeqjqjfnhldqqqklj.supabase.co';

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_ANON_KEY no está configurada en .env.local');
}
if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn('⚠️  VITE_SUPABASE_URL no está configurada — usando URL hardcodeada. Agregá esta variable a .env.local y a Vercel.');
}

// Cliente Supabase (sesión persistente en localStorage)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ─── Wrapper de acceso a datos ────────────────────────────────────────────────

const ROW_NOT_FOUND_MESSAGE =
  'No tenés permiso para modificar este registro, o fue actualizado por otro usuario. Recargá la página.';

function finishSingleRowMutation({ error, data, id, tableName, action }) {
  if (error && error.code !== 'PGRST116') {
    console.error(`Error ${action} ${tableName} ${id}:`, error);
    throw error;
  }
  if (!data) {
    console.error(`Error ${action} ${tableName} ${id}:`, error ?? '0 rows returned');
    const err = new Error(ROW_NOT_FOUND_MESSAGE);
    err.code = 'PGRST116';
    throw err;
  }
  return data;
}

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
      .maybeSingle();

    return finishSingleRowMutation({
      error,
      data: updated,
      id,
      tableName: this.tableName,
      action: 'updating',
    });
  }

  async delete(id) {
    const { data: deleted, error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle();

    return finishSingleRowMutation({
      error,
      data: deleted,
      id,
      tableName: this.tableName,
      action: 'deleting',
    });
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

// Legacy escape hatch: configurable via env var, not hardcoded.
// Set VITE_ADMIN_BYPASS_EMAIL in .env.local to keep the bypass active.
// Leave it empty (or unset) to disable it for new deployments.
const ADMIN_BYPASS_EMAIL = (import.meta.env.VITE_ADMIN_BYPASS_EMAIL ?? '').trim().toLowerCase();

/** Resolves a role, applying the bypass-email override when configured. */
function resolveRoleWithBypass(role, email) {
  if (ADMIN_BYPASS_EMAIL && (email ?? '').toLowerCase() === ADMIN_BYPASS_EMAIL) return 'ADMIN';
  return normalizeRole(role);
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
  
  // Solo app_metadata: user_metadata lo escribe el propio usuario (auth.updateUser),
  // así que confiar en él permitiría auto-asignarse ADMIN.
  const metaRole = authUser?.app_metadata?.role;
  const normalizedRole = resolveRoleWithBypass(metaRole, authUser.email);
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
    role: resolveRoleWithBypass(profile?.role, authUser?.email),
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
    // Log the full error so it's visible in Supabase logs and browser devtools
    console.error('[auth] usuario upsert failed — returning auth-only profile:', error.message, error);
    // Return the auth-derived profile as a fallback so login still works,
    // but the caller should be aware this profile lacks admin-managed fields.
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
      pdf_footer_instagram:
        fields.pdf_footer_instagram
        ?? existing?.pdf_footer_instagram
        ?? '',
      pdf_footer_website:
        fields.pdf_footer_website
        ?? existing?.pdf_footer_website
        ?? '',
      pdf_footer_linkedin:
        fields.pdf_footer_linkedin
        ?? existing?.pdf_footer_linkedin
        ?? '',
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
    const { data, error } = await supabase
      .from('workspace_settings')
      .upsert({ workspace_id: workspaceId, view_layout_config: viewLayoutConfig, updated_date: new Date().toISOString() }, { onConflict: 'workspace_id' })
      .select()
      .single();
    if (error) { console.error('Error saving view_layout_config:', error); throw error; }
    return data;
  },

  async saveFrequentCities(workspaceId, frequentCities) {
    const { data, error } = await supabase
      .from('workspace_settings')
      .upsert({ workspace_id: workspaceId, frequent_cities: frequentCities, updated_date: new Date().toISOString() }, { onConflict: 'workspace_id' })
      .select()
      .single();
    if (error) { console.error('Error saving frequent_cities:', error); throw error; }
    return data;
  },
};

// ─── App config global (PK = id, fila única id = 1) ───────────────────────────
//
// Fuente de verdad del Modo Mantenimiento y futuras banderas globales. Solo lectura
// desde la app: la fila la cambia únicamente el equipo dev desde el dashboard de
// Supabase (RLS bloquea toda escritura). Ver migración 20260723140000_app_config.sql.

/**
 * @typedef {Object} AppConfigRow
 * @property {number} id
 * @property {boolean} maintenance_mode
 * @property {string} maintenance_message
 * @property {string} updated_at
 */

export const APP_CONFIG_ID = 1;

export const appConfigApi = {
  /**
   * Lee la fila única de configuración global.
   * @returns {Promise<AppConfigRow | null>}
   */
  async get() {
    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', APP_CONFIG_ID)
      .maybeSingle();
    if (error) {
      console.error('Error fetching app_config:', error);
      return null;
    }
    return data;
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
  EnvioWhatsApp: createEntityProxy('enviowhatsapp'),
  Mensaje: createEntityProxy('mensaje'),
  ListaWhatsApp: createEntityProxy('listawhatsapp'),
  VariablePlantilla: createEntityProxy('variableplantilla'),
  CatalogoProducto: createEntityProxy('catalogo_producto'),
  Usuario: createEntityProxy('usuario'),
};
