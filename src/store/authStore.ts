import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

let authListenerAttached = false;

export const MEMBER_COLORS = [
  '#34d399',
  '#60a5fa',
  '#c084fc',
  '#fb923c',
  '#f472b6',
] as const;

export interface TeamProfile {
  id: string;
  displayName: string;
  color: string;
}

export interface TeamWorkspace {
  id: string;
  name: string;
  joinCode: string;
  role: 'owner' | 'member';
}

interface AuthState {
  initialized: boolean;
  busy: boolean;
  session: Session | null;
  user: User | null;
  profile: TeamProfile | null;
  team: TeamWorkspace | null;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, displayName: string, color: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  createTeam: (name: string) => Promise<boolean>;
  joinTeam: (code: string) => Promise<boolean>;
  updateProfile: (displayName: string, color: string) => Promise<boolean>;
  clearError: () => void;
}

async function loadIdentity(
  user: User
): Promise<{ profile: TeamProfile | null; team: TeamWorkspace | null }> {
  if (!supabase) return { profile: null, team: null };

  const [{ data: profileRow }, { data: membership }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, color').eq('id', user.id).maybeSingle(),
    supabase
      .from('team_members')
      .select('role, teams(id, name, join_code)')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle(),
  ]);

  const teamRow = membership?.teams as unknown as
    | { id: string; name: string; join_code: string }
    | null;

  return {
    profile: profileRow
      ? {
          id: profileRow.id,
          displayName: profileRow.display_name,
          color: profileRow.color,
        }
      : null,
    team: teamRow
      ? {
          id: teamRow.id,
          name: teamRow.name,
          joinCode: teamRow.join_code,
          role: membership?.role === 'owner' ? 'owner' : 'member',
        }
      : null,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initialized: false,
  busy: false,
  session: null,
  user: null,
  profile: null,
  team: null,
  error: null,

  initialize: async () => {
    if (!supabase) {
      set({ initialized: true });
      return;
    }

    const { data } = await supabase.auth.getSession();
    const session = data.session;
    const identity = session?.user
      ? await loadIdentity(session.user)
      : { profile: null, team: null };
    set({
      initialized: true,
      session,
      user: session?.user ?? null,
      ...identity,
    });

    if (!authListenerAttached) {
      authListenerAttached = true;
      supabase.auth.onAuthStateChange((_event, nextSession) => {
        queueMicrotask(async () => {
          const nextIdentity = nextSession?.user
            ? await loadIdentity(nextSession.user)
            : { profile: null, team: null };
          set({
            session: nextSession,
            user: nextSession?.user ?? null,
            ...nextIdentity,
            initialized: true,
          });
        });
      });
    }
  },

  signIn: async (email, password) => {
    if (!supabase) return false;
    set({ busy: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ busy: false, error: error.message });
      return false;
    }
    const identity = data.user
      ? await loadIdentity(data.user)
      : { profile: null, team: null };
    set({ busy: false, session: data.session, user: data.user, ...identity });
    return true;
  },

  signUp: async (email, password, displayName, color) => {
    if (!supabase) return false;
    set({ busy: true, error: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName, color },
      },
    });
    if (error) {
      set({ busy: false, error: error.message });
      return false;
    }
    set({
      busy: false,
      session: data.session,
      user: data.user,
      error: data.session ? null : 'Check your email to confirm your account, then sign in.',
    });
    return true;
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, team: null });
  },

  createTeam: async (name) => {
    if (!supabase || !get().user) return false;
    set({ busy: true, error: null });
    const { data, error } = await supabase.rpc('create_team', { team_name: name });
    if (error) {
      set({ busy: false, error: error.message });
      return false;
    }
    const identity = await loadIdentity(get().user!);
    set({ busy: false, ...identity });
    return Boolean(data);
  },

  joinTeam: async (code) => {
    if (!supabase || !get().user) return false;
    set({ busy: true, error: null });
    const { error } = await supabase.rpc('join_team_by_code', {
      requested_code: code.trim().toUpperCase(),
    });
    if (error) {
      set({ busy: false, error: error.message });
      return false;
    }
    const identity = await loadIdentity(get().user!);
    set({ busy: false, ...identity });
    return true;
  },

  updateProfile: async (displayName, color) => {
    if (!supabase || !get().user) return false;
    set({ busy: true, error: null });
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, color })
      .eq('id', get().user!.id);
    if (error) {
      set({ busy: false, error: error.message });
      return false;
    }
    set({
      busy: false,
      profile: { id: get().user!.id, displayName, color },
    });
    return true;
  },

  clearError: () => set({ error: null }),
}));
