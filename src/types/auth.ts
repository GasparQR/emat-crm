export type UserRole = 'ADMIN' | 'ASESOR' | 'LOGISTICA';

export interface UsuarioProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  active: boolean;
  can_view_other_advisors: boolean;
  asesor_codigo: string | null;
  workspace_id: string;
  last_sign_in_at?: string | null;
}
