import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Save, Search, Trash2, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { getExerciseMedia } from "../animationMedia";
import { useI18n } from "../i18n";
import type { Exercise, SetEntry, User } from "../types";
import { ExerciseAnimation } from "./ExerciseAnimation";

type DraftEntry = {
  exercise: Exercise;
  sets: SetEntry[];
  notes: string;
  personalRecord: boolean;
};

type WorkoutSessionFormProps = {
  user: User;
  exercises: Exercise[];
  categories: string[];
  initialExerciseId?: number;
  onSaved?: (result: { workoutId: number; totalPoints: number; totalCalories: number; personalRecordCount: number }) => void;
};

function defaultReps(exercise: Exercise) {
  const match = exercise.recommendedReps.match(/\d+/);
  return match ? Number(match[0]) : 10;
}

function createDraft(exercise: Exercise): DraftEntry {
  return {
    exercise,
    notes: "",
    personalRecord: false,
    sets: Array.from({ length: Math.min(Math.max(exercise.recommendedSets, 1), 5) }, () => ({
      weight: 0,
      reps: defaultReps(exercise),
      completed: false
    }))
  };
}

export function WorkoutSessionForm({ user, exercises, categories, initialExerciseId, onSaved }: WorkoutSessionFormProps) {
  const { t } = useI18n();
  const [selectedGroup, setSelectedGroup] = useState("All");
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<DraftEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!initialExerciseId) {
      return;
    }

    const exercise = exercises.find((item) => item.id === initialExerciseId);
    if (!exercise) {
      return;
    }

    setEntries((current) => (current.some((entry) => entry.exercise.id === exercise.id) ? current : [...current, createDraft(exercise)]));
  }, [exercises, initialExerciseId]);

  const filteredExercises = useMemo(() => {
    return exercises.filter((exercise) => {
      const matchesGroup = selectedGroup === "All" || exercise.muscleGroup === selectedGroup;
      const matchesSearch = exercise.name.toLowerCase().includes(search.toLowerCase());
      return matchesGroup && matchesSearch;
    });
  }, [exercises, search, selectedGroup]);

  const selectedIds = new Set(entries.map((entry) => entry.exercise.id));

  function addExercise(exercise: Exercise) {
    if (selectedIds.has(exercise.id)) {
      return;
    }

    setEntries((current) => [...current, createDraft(exercise)]);
  }

  function updateSet(entryIndex: number, setIndex: number, patch: Partial<SetEntry>) {
    setEntries((current) =>
      current.map((entry, currentEntryIndex) =>
        currentEntryIndex !== entryIndex
          ? entry
          : {
              ...entry,
              sets: entry.sets.map((set, currentSetIndex) => (currentSetIndex === setIndex ? { ...set, ...patch } : set))
            }
      )
    );
  }

  function addSet(entryIndex: number) {
    setEntries((current) =>
      current.map((entry, currentEntryIndex) =>
        currentEntryIndex === entryIndex
          ? {
              ...entry,
              sets: [...entry.sets, { weight: 0, reps: defaultReps(entry.exercise), completed: false }]
            }
          : entry
      )
    );
  }

  function removeEntry(entryIndex: number) {
    setEntries((current) => current.filter((_, index) => index !== entryIndex));
  }

  async function saveWorkout() {
    setMessage(null);
    setSaving(true);

    try {
      const result = await api.saveWorkout({
        userId: user.id,
        notes,
        exercises: entries.map((entry) => ({
          exerciseId: entry.exercise.id,
          notes: entry.notes,
          personalRecord: entry.personalRecord,
          sets: entry.sets
        }))
      });

      setEntries([]);
      setNotes("");
      setMessage(t("Workout saved: +{points} points, {calories} estimated calories.", {
        points: result.totalPoints,
        calories: result.totalCalories
      }));
      onSaved?.(result);
    } catch (error) {
      setMessage(error instanceof Error ? t(error.message) : t("Workout could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
      <section className="surface-panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-500" />
            <input
              className="field pl-10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("Search exercises")}
            />
          </label>
          <select className="field sm:max-w-48" value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)}>
            <option value="All">{t("All")}</option>
            {categories.map((category) => (
              <option key={category} value={category}>{t(category)}</option>
            ))}
          </select>
        </div>
        <div className="mt-5 max-h-[620px] space-y-3 overflow-y-auto pr-1">
          {filteredExercises.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              disabled={selectedIds.has(exercise.id)}
              onClick={() => addExercise(exercise)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-rival-green/30 hover:bg-white/[0.065] disabled:opacity-55"
            >
              <div className="min-w-0">
                <div className="font-bold text-white">{exercise.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {t(exercise.muscleGroup)} - {exercise.recommendedSets} x {exercise.recommendedReps}
                </div>
              </div>
              <span className="icon-button h-9 w-9">
                {selectedIds.has(exercise.id) ? <Check className="h-4 w-4 text-rival-green" /> : <Plus className="h-4 w-4" />}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="surface-panel p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">{t("Workout Session")}</h2>
              <p className="mt-1 text-sm text-slate-500">{entries.length} {t("Selected exercises")}</p>
            </div>
            <button className="neon-button" type="button" onClick={saveWorkout} disabled={saving || entries.length === 0}>
              <Save className="h-4 w-4" />
              {saving ? t("Saving") : t("Save Workout")}
            </button>
          </div>
          <textarea
            className="field mt-4 min-h-24 resize-y"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t("Workout notes")}
          />
          {message ? (
            <div className="mt-4 rounded-lg border border-rival-cyan/30 bg-rival-cyan/10 px-4 py-3 text-sm font-semibold text-rival-cyan">
              {message}
            </div>
          ) : null}
        </div>

        <AnimatePresence initial={false}>
          {entries.map((entry, entryIndex) => (
            <motion.article
              key={entry.exercise.id}
              layout
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              className="surface-panel overflow-hidden"
            >
              <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="hidden lg:block">
                  <ExerciseAnimation
                    exerciseName={entry.exercise.name}
                    muscleGroup={entry.exercise.muscleGroup}
                    animationType={entry.exercise.animationType}
                    media={getExerciseMedia(entry.exercise)}
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-white">{entry.exercise.name}</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="chip">{t(entry.exercise.muscleGroup)}</span>
                        <span className="chip">{t(entry.exercise.difficulty)}</span>
                        <span className="chip">{entry.exercise.equipment}</span>
                      </div>
                    </div>
                    <button className="icon-button" type="button" onClick={() => removeEntry(entryIndex)} aria-label={t("Remove exercise")}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {entry.sets.map((set, setIndex) => (
                      <div key={setIndex} className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 rounded-lg border border-white/10 bg-ink-950/50 p-3 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <label className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045]">
                          <input
                            type="checkbox"
                            checked={set.completed}
                            onChange={(event) => updateSet(entryIndex, setIndex, { completed: event.target.checked })}
                            className="h-4 w-4 accent-rival-green"
                          />
                        </label>
                        <label className="min-w-0">
                          <span className="mb-1 block text-xs font-bold text-slate-500">{t("Weight kg")}</span>
                          <input
                            className="field"
                            type="number"
                            min="0"
                            value={set.weight}
                            onChange={(event) => updateSet(entryIndex, setIndex, { weight: Number(event.target.value) })}
                          />
                        </label>
                        <label className="min-w-0">
                          <span className="mb-1 block text-xs font-bold text-slate-500">{t("Reps")}</span>
                          <input
                            className="field"
                            type="number"
                            min="0"
                            value={set.reps}
                            onChange={(event) => updateSet(entryIndex, setIndex, { reps: Number(event.target.value) })}
                          />
                        </label>
                        <span className="hidden text-sm font-bold text-slate-500 sm:block">{t("Set")} {setIndex + 1}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button className="ghost-button" type="button" onClick={() => addSet(entryIndex)}>
                      <Plus className="h-4 w-4" />
                      {t("Add Set")}
                    </button>
                    <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rival-amber/25 bg-rival-amber/10 px-4 text-sm font-bold text-rival-amber">
                      <input
                        type="checkbox"
                        checked={entry.personalRecord}
                        onChange={(event) =>
                          setEntries((current) =>
                            current.map((item, index) =>
                              index === entryIndex ? { ...item, personalRecord: event.target.checked } : item
                            )
                          )
                        }
                        className="h-4 w-4 accent-rival-amber"
                      />
                      <Trophy className="h-4 w-4" />
                      {t("Personal record")}
                    </label>
                  </div>
                  <textarea
                    className="field mt-4 min-h-20 resize-y"
                    value={entry.notes}
                    onChange={(event) =>
                      setEntries((current) =>
                        current.map((item, index) => (index === entryIndex ? { ...item, notes: event.target.value } : item))
                      )
                    }
                    placeholder={t("Exercise notes")}
                  />
                </div>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>

        {entries.length === 0 ? (
          <div className="surface-panel flex min-h-64 items-center justify-center p-8 text-center">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-rival-green/15 text-rival-green">
                <Plus className="h-6 w-6" />
              </div>
              <div className="mt-4 text-lg font-black text-white">{t("No exercises selected")}</div>
              <div className="mt-2 text-sm text-slate-500">{t("Pick exercises from the list to build this session.")}</div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
