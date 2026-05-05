import { Shield } from "lucide-react";
import { useI18n } from "../i18n";
import type { Rank } from "../types";
import { ProgressBar } from "./ProgressBar";

type RankBadgeProps = {
  rank: Rank;
  compact?: boolean;
  totalPoints?: number;
};

export function RankBadge({ rank, compact = false, totalPoints }: RankBadgeProps) {
  const { t } = useI18n();

  return (
    <div className={compact ? "inline-flex items-center gap-2" : "surface-panel p-4"}>
      <div
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10"
        style={{ backgroundColor: `${rank.color}22`, color: rank.color }}
      >
        <Shield className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-white">{t(rank.name)}</div>
        {typeof totalPoints === "number" ? <div className="mt-0.5 text-xs font-semibold text-slate-400">{totalPoints} {t("pts")}</div> : null}
        {!compact ? (
          <>
            <div className="mt-1 text-xs text-slate-400">
              {rank.pointsToNext > 0
                ? t("{points} points to {rank}", { points: rank.pointsToNext, rank: t(rank.nextRank) })
                : t("Top rank reached")}
            </div>
            <div className="mt-3">
              <ProgressBar value={rank.progress} color="cyan" />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
