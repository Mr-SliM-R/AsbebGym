import { useEffect, useState } from "react";
import { api } from "../api";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { ErrorState, LoadingState } from "../components/PageState";
import type { LeaderboardEntry } from "../types";

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .leaderboard()
      .then(setEntries)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (loading) return <LoadingState label="Loading leaderboard" />;

  return (
    <div className="space-y-6">
      <section className="app-panel p-5 sm:p-6">
        <h1 className="text-3xl font-black text-white">Leaderboard</h1>
        <p className="mt-2 text-sm text-slate-400">Total points decide the current rivalry order.</p>
      </section>
      <LeaderboardTable entries={entries} />
    </div>
  );
}
