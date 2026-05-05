import { motion } from "framer-motion";
import { Dumbbell, LogIn, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { LanguageToggle } from "../components/LanguageToggle";
import { UserAvatar } from "../components/UserAvatar";
import { useI18n } from "../i18n";
import type { User } from "../types";

type Mode = "signup" | "signin" | "demo";

export function LoginPage() {
  const [mode, setMode] = useState<Mode>("signup");
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [groupName, setGroupName] = useState("");
  const { login, signup } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const inviteCode = new URLSearchParams(location.search).get("invite") ?? "";
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  useEffect(() => {
    api.users().then(setUsers).catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (inviteCode) {
      setMode("signup");
      setGroupName("Invited group");
    }
  }, [inviteCode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        await signup({ email, password, displayName, organizationName: groupName, inviteCode: inviteCode || undefined });
      } else {
        await login({ email, password });
      }
      await api.trackBetaEvent({ eventName: mode === "signup" ? "signup_form_completed" : "signin_completed" }).catch(() => null);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? t(err.message) : t("Login failed."));
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin(username: string) {
    setError(null);
    setDemoLoading(username);

    try {
      await login({ username });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? t(err.message) : t("Login failed."));
    } finally {
      setDemoLoading(null);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="fixed right-4 top-4 z-20">
        <LanguageToggle />
      </div>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <section>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-rival-green/25 bg-rival-green/10 px-4 py-2 text-sm font-bold text-rival-green">
              <Sparkles className="h-4 w-4" />
              {t("Private fitness groups, leaderboards, and challenges")}
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-6 max-w-3xl text-5xl font-black text-white sm:text-6xl">
              Gym Rival
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              {t("Create a group, invite members, run weekly challenges, and track beta readiness before selling subscriptions.")}
            </motion.p>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                { label: "Groups", icon: Users },
                { label: "Training", icon: Dumbbell },
                { label: "Admin", icon: ShieldCheck }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="surface-panel p-4 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-rival-green/10 text-rival-green">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-3 text-sm font-bold text-slate-200">{t(item.label)}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <motion.section initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="app-panel p-5 sm:p-6">
            <div className="mb-5 grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-1">
              {(["signup", "signin", "demo"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={`min-h-10 rounded-md text-sm font-black transition ${mode === item ? "bg-rival-green text-ink-950" : "text-slate-300 hover:bg-white/[0.055]"}`}
                >
                  {item === "signup" ? t("Sign up") : item === "signin" ? t("Sign in") : t("Demo")}
                </button>
              ))}
            </div>

            {mode === "demo" ? (
              <div className="grid gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white">{t("Demo arena")}</h2>
                  <p className="mt-2 text-sm text-slate-500">{t("Use this path to inspect the seeded rivalry data.")}</p>
                </div>
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleDemoLogin(user.username)}
                    disabled={Boolean(demoLoading)}
                    className="group flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.045] p-4 text-left transition hover:border-rival-green/40 hover:bg-white/[0.075] disabled:opacity-60"
                  >
                    <div className="flex items-center gap-4">
                      <UserAvatar avatar={user.avatar} name={user.username} size="lg" className="bg-rival-green/15 text-rival-green" />
                      <div>
                        <div className="text-lg font-black text-white">{user.username}</div>
                        <div className="mt-1 text-sm text-slate-500">{t(user.weightGoal)} - {t(user.favoriteMuscleGroup)}</div>
                      </div>
                    </div>
                    <LogIn className="h-5 w-5 text-rival-cyan" />
                  </button>
                ))}
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 className="text-2xl font-black text-white">{mode === "signup" ? t("Create your group") : t("Sign in")}</h2>
                {mode === "signup" && inviteCode ? (
                  <div className="mt-4 rounded-lg border border-rival-cyan/25 bg-rival-cyan/10 p-3 text-sm font-bold text-rival-cyan">
                    {t("Invite detected. Sign up with the email address that received it.")}
                  </div>
                ) : null}
                <div className="mt-5 grid gap-3">
                  {mode === "signup" ? (
                    <>
                      <input className="field" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={t("Your name")} required />
                      {!inviteCode ? (
                        <input className="field" value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder={t("Group or gym name")} required />
                      ) : null}
                    </>
                  ) : null}
                  <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" required />
                  <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t("Password")} minLength={8} required />
                </div>
                <button className="neon-button mt-5 w-full" type="submit" disabled={loading}>
                  <LogIn className="h-4 w-4" />
                  {loading ? t("Saving") : mode === "signup" ? t("Start trial") : t("Sign in")}
                </button>
              </form>
            )}

            {error ? <div className="mt-5 rounded-lg border border-rival-rose/30 bg-rival-rose/10 p-3 text-sm text-rival-rose">{error}</div> : null}
          </motion.section>
        </div>
      </div>
    </main>
  );
}
