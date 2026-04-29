import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { ExerciseCard } from "../components/ExerciseCard";
import { ErrorState, LoadingState } from "../components/PageState";
import { useI18n } from "../i18n";
import type { Exercise, MetaData } from "../types";

export function ExerciseLibraryPage() {
  const { t } = useI18n();
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("All");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.meta().then(setMeta).catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .exercises({ group: selectedGroup === "All" ? undefined : selectedGroup, search: search || undefined })
      .then(setExercises)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search, selectedGroup]);

  if (error) return <ErrorState message={t(error)} />;

  return (
    <div className="space-y-6">
      <section className="app-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">{t("Exercise Library")}</h1>
            <p className="mt-2 text-sm text-slate-400">{t("Browse exercises by muscle group, equipment, and difficulty.")}</p>
          </div>
          <label className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-500" />
            <input className="field pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search exercises")} />
          </label>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {["All", ...(meta?.categories ?? [])].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedGroup(category)}
              className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition ${
                selectedGroup === category
                  ? "border-rival-green/40 bg-rival-green/15 text-rival-green"
                  : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-rival-cyan/35"
              }`}
            >
              {t(category)}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <LoadingState label={t("Loading exercises")} />
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {exercises.map((exercise) => (
            <ExerciseCard key={exercise.id} exercise={exercise} />
          ))}
        </section>
      )}
    </div>
  );
}
