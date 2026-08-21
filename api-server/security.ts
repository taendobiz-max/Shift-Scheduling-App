import type { NextFunction, Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

export type AppRole = 1 | 2 | 3;

export interface AuthContext {
  userId: string;
  email: string | null;
  role: AppRole;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}

function parseRole(value: unknown): AppRole | null {
  const role = Number(value);
  return role === 1 || role === 2 || role === 3 ? role : null;
}

export function requireAuth(supabase: SupabaseClient) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    const authorization = req.header('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authData.user) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Authorization profile lookup failed:', profileError.message);
        return res.status(503).json({ error: 'Authorization service unavailable' });
      }

      const role = parseRole(profile?.role ?? authData.user.app_metadata?.role ?? authData.user.user_metadata?.role);
      if (!role) {
        return res.status(403).json({ error: 'User role is not configured' });
      }

      authReq.auth = {
        userId: authData.user.id,
        email: authData.user.email ?? null,
        role
      };
      next();
    } catch (error) {
      console.error('Authentication middleware failed:', error);
      return res.status(500).json({ error: 'Authentication check failed' });
    }
  };
}

export function requireRole(minimumRole: AppRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.auth) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (authReq.auth.role < minimumRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export async function writeAuditLog(
  supabase: SupabaseClient,
  req: AuthenticatedRequest,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  if (!req.auth) return;

  const { error } = await supabase.from('audit_logs').insert({
    actor_user_id: req.auth.userId,
    actor_email: req.auth.email,
    actor_role: req.auth.role,
    action,
    // 旧監査スキーマの必須列とP0で追加した拡張列を両方満たす。
    resource_type: entityType,
    resource_id: entityId,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
    request_method: req.method,
    request_path: req.path
  });

  if (error) {
    // 監査テーブルが未導入の場合でも、主要業務を停止させずサーバーログで検知する。
    console.error('Audit log write failed:', error.message);
  }
}

export function validateString(value: unknown, field: string, maxLength = 255): string | null {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    return null;
  }
  return value.trim();
}

export function validateDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : value;
}
