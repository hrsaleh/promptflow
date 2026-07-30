import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, Copy, LogIn, Users } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { MEMBER_COLORS, useAuthStore } from '../store/authStore';

export function AuthGate({ children }: { children: ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized);
  const session = useAuthStore((s) => s.session);
  const team = useAuthStore((s) => s.team);
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isSupabaseConfigured) return <ConnectionSetup />;
  if (!initialized) return <CenteredMessage>Connecting to PromptFlow…</CenteredMessage>;
  if (!session) return <AuthForm />;
  if (!team) return <TeamSetup />;
  return children;
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <div className="h-full w-full bg-zinc-950 flex items-center justify-center text-zinc-400 text-sm">
      {children}
    </div>
  );
}

function ConnectionSetup() {
  return (
    <div className="h-full w-full bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-7 shadow-2xl">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5">
          <Users size={20} />
        </div>
        <h1 className="text-xl font-semibold text-white">Connect your team workspace</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          PromptFlow’s collaboration features are installed. Add your Supabase project keys to
          activate team sign-in and shared prompts.
        </p>
        <div className="mt-5 rounded-lg bg-zinc-950 border border-zinc-800 p-4 font-mono text-xs text-zinc-400 space-y-2">
          <div>VITE_SUPABASE_URL=…</div>
          <div>VITE_SUPABASE_ANON_KEY=…</div>
        </div>
        <p className="text-xs text-zinc-600 mt-4">
          Copy <span className="text-zinc-400">.env.example</span> to{' '}
          <span className="text-zinc-400">.env.local</span>, add the keys, then restart the site.
        </p>
      </div>
    </div>
  );
}

function AuthForm() {
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(MEMBER_COLORS[0]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'signin') await signIn(email, password);
    else await signUp(email, password, name.trim(), color);
  };

  return (
    <div className="h-full w-full bg-zinc-950 flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-7 shadow-2xl">
        <div className="text-emerald-400 font-semibold tracking-wide">PromptFlow</div>
        <h1 className="text-xl font-semibold text-white mt-5">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {mode === 'signin' ? 'Sign in to your shared prompt workspace.' : 'Each teammate gets their own name and color.'}
        </p>

        <div className="space-y-3 mt-6">
          {mode === 'signup' && (
            <>
              <Field label="Display name" value={name} onChange={setName} placeholder="Your name" />
              <div>
                <label className="text-xs text-zinc-400 block mb-2">Your color</label>
                <div className="flex gap-2">
                  {MEMBER_COLORS.map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setColor(choice)}
                      className="w-8 h-8 rounded-full transition-transform"
                      style={{
                        backgroundColor: choice,
                        transform: color === choice ? 'scale(1.12)' : undefined,
                        boxShadow: color === choice ? `0 0 0 3px #18181b, 0 0 0 5px ${choice}` : undefined,
                      }}
                      aria-label={`Choose ${choice}`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
          <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@company.com" />
          <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="At least 8 characters" />
        </div>

        {error && <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-300">{error}</div>}

        <button
          disabled={busy || !email || password.length < 8 || (mode === 'signup' && !name.trim())}
          className="mt-5 w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-semibold text-sm py-2.5 flex items-center justify-center gap-2 transition-colors"
        >
          {mode === 'signin' ? <LogIn size={15} /> : <ArrowRight size={15} />}
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); clearError(); }}
          className="mt-4 w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {mode === 'signin' ? 'New teammate? Create an account' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-zinc-400 block mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg bg-zinc-950 border border-zinc-700 focus:border-emerald-500 outline-none px-3 py-2.5 text-sm text-white transition-colors"
      />
    </label>
  );
}

function TeamSetup() {
  const createTeam = useAuthStore((s) => s.createTeam);
  const joinTeam = useAuthStore((s) => s.joinTeam);
  const signOut = useAuthStore((s) => s.signOut);
  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  return (
    <div className="h-full w-full bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-7 shadow-2xl">
        <h1 className="text-xl font-semibold text-white">Join your team</h1>
        <p className="text-sm text-zinc-500 mt-1">The first teammate creates the workspace. Everyone else joins with its code.</p>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="rounded-xl border border-zinc-800 p-4">
            <h2 className="text-sm font-medium text-white">Create workspace</h2>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name"
              className="mt-3 w-full rounded-lg bg-zinc-950 border border-zinc-700 focus:border-emerald-500 outline-none px-3 py-2 text-sm text-white"
            />
            <button
              onClick={() => createTeam(teamName.trim())}
              disabled={busy || !teamName.trim()}
              className="mt-3 w-full rounded-lg bg-emerald-500 text-zinc-950 disabled:opacity-40 font-semibold text-sm py-2"
            >
              Create
            </button>
          </div>
          <div className="rounded-xl border border-zinc-800 p-4">
            <h2 className="text-sm font-medium text-white">Join workspace</h2>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="TEAM CODE"
              maxLength={8}
              className="mt-3 w-full rounded-lg bg-zinc-950 border border-zinc-700 focus:border-emerald-500 outline-none px-3 py-2 text-sm text-white uppercase tracking-widest"
            />
            <button
              onClick={() => joinTeam(joinCode)}
              disabled={busy || joinCode.trim().length < 6}
              className="mt-3 w-full rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white disabled:opacity-40 font-medium text-sm py-2"
            >
              Join
            </button>
          </div>
        </div>

        {error && <div className="mt-4 text-xs text-red-300">{error}</div>}
        <button onClick={signOut} className="mt-5 text-xs text-zinc-600 hover:text-zinc-400">Sign out</button>
      </div>
    </div>
  );
}

export function TeamIdentity() {
  const profile = useAuthStore((s) => s.profile);
  const team = useAuthStore((s) => s.team);
  const signOut = useAuthStore((s) => s.signOut);
  const [copied, setCopied] = useState(false);

  if (!profile || !team) return null;

  const copyCode = async () => {
    await navigator.clipboard.writeText(team.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="ml-auto flex items-center gap-3">
      <button onClick={copyCode} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300" title="Copy team join code">
        <Copy size={11} />
        {copied ? 'Copied' : `${team.name} · ${team.joinCode}`}
      </button>
      <div className="h-4 w-px bg-zinc-800" />
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: profile.color }} />
        <span className="text-xs text-zinc-300">{profile.displayName}</span>
      </div>
      <button onClick={signOut} className="text-xs text-zinc-600 hover:text-zinc-300">Sign out</button>
    </div>
  );
}
