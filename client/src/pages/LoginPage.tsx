import { motion } from "framer-motion";
import { Dumbbell, Flame, LogIn, Swords, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import type { User } from "../types";

export function LoginPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  useEffect(() => {
    api
      .users()
      .then(setUsers)
      .catch((err: Error) => setError(err.message));
  }, []);

  async function handleLogin(username: string) {
    setError(null);
    setLoadingUser(username);

    try {
      await login(username);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoadingUser(null);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-rival-green/25 bg-rival-green/10 px-4 py-2 text-sm font-bold text-rival-green"
            >
              <Swords className="h-4 w-4" />
              Slim vs Friend
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.5 }}
              className="mt-6 max-w-3xl text-5xl font-black text-white sm:text-6xl"
            >
              Gym Rival
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.5 }}
              className="mt-5 max-w-xl text-lg leading-8 text-slate-300"
            >
              Track workouts, collect badges, chase ranks, and keep the friendly pressure on every week.
            </motion.p>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              {[
                { label: "Points", icon: Trophy, color: "text-rival-amber bg-rival-amber/10" },
                { label: "Streaks", icon: Flame, color: "text-rival-rose bg-rival-rose/10" },
                { label: "Training", icon: Dumbbell, color: "text-rival-cyan bg-rival-cyan/10" }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="surface-panel p-4 text-center">
                    <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-3 text-sm font-bold text-slate-200">{item.label}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <motion.section
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.45 }}
            className="app-panel p-5 sm:p-6"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white">Choose User</h2>
              <p className="mt-2 text-sm text-slate-500">Only the two fixed rivals can enter.</p>
            </div>
            <div className="grid gap-4">
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleLogin(user.username)}
                  disabled={Boolean(loadingUser)}
                  className="group flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.045] p-4 text-left transition hover:border-rival-green/40 hover:bg-white/[0.075] disabled:opacity-60"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-rival-green/15 text-xl font-black text-rival-green">
                      {user.avatar}
                    </div>
                    <div>
                      <div className="text-lg font-black text-white">{user.username}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {user.weightGoal} - {user.favoriteMuscleGroup}
                      </div>
                    </div>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-rival-cyan/10 text-rival-cyan transition group-hover:bg-rival-cyan/20">
                    <LogIn className="h-5 w-5" />
                  </span>
                </button>
              ))}
            </div>
            {error ? <div className="mt-5 rounded-lg border border-rival-rose/30 bg-rival-rose/10 p-3 text-sm text-rival-rose">{error}</div> : null}
          </motion.section>
        </div>
      </div>
    </main>
  );
}
