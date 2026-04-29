import { CheckCircle2, Flame, Target } from "lucide-react";
import { useI18n } from "../i18n";
import type { Challenge } from "../types";
import { ProgressBar } from "./ProgressBar";

type ChallengeCardProps = {
  challenge: Challenge;
};

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const { t } = useI18n();
  const color = challenge.completed ? "green" : challenge.metric === "calories" ? "rose" : "cyan";

  return (
    <article className="surface-panel p-5 transition hover:border-rival-green/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-rival-amber/15 text-rival-amber">
            {challenge.completed ? <CheckCircle2 className="h-5 w-5" /> : <Target className="h-5 w-5" />}
          </div>
          <h3 className="text-lg font-black text-white">{t(challenge.title)}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{t(challenge.description)}</p>
        </div>
        <span className="chip shrink-0">
          <Flame className="mr-1.5 h-3.5 w-3.5 text-rival-rose" />+{challenge.points}
        </span>
      </div>
      <div className="mt-5">
        <ProgressBar
          value={Math.min(challenge.progress, challenge.target)}
          max={challenge.target}
          color={color}
          label={`${challenge.progress}/${challenge.target}`}
        />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs font-bold">
        <span className={challenge.completed ? "text-rival-green" : "text-slate-500"}>
          {challenge.completed ? t("Completed") : t("In progress")}
        </span>
        <span className="text-slate-500">{t(challenge.muscleGroup ?? "All training")}</span>
      </div>
    </article>
  );
}
