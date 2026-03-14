import { DEAL_STAGE_SEQUENCE, getLeadDealStageMeta } from "@/lib/dealStages";
import MobileSelect from "@/components/leads/MobileSelect";
import { Button } from "@/components/ui/button";

export default function DealStageRail({ lead, onStageOverride, onUseSuggestedStage, isUpdatingStage = false }) {
  const stageMeta = getLeadDealStageMeta(lead);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Deal Stage</p>
          <p className="text-sm font-semibold text-slate-900">{stageMeta.stage}</p>
          {stageMeta.stageSource === "manual" && (
            <p className="mt-0.5 text-[11px] font-medium text-amber-700">Manual override active</p>
          )}
          {stageMeta.stageUpdatedDate && (
            <p className="mt-0.5 text-[11px] text-slate-500">
              Updated {new Date(stageMeta.stageUpdatedDate).toLocaleDateString()}
            </p>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Step {stageMeta.index + 1} / {stageMeta.total}
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <MobileSelect
          value={stageMeta.stage}
          onValueChange={(value) => onStageOverride?.(value)}
          options={DEAL_STAGE_SEQUENCE}
          placeholder="Update Deal Stage"
          label="Deal Stage"
          triggerClassName="h-10 w-full rounded-lg"
          disabled={isUpdatingStage}
        />
        {stageMeta.hasManualOverride && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onUseSuggestedStage}
            disabled={isUpdatingStage}
            className="h-10 rounded-lg"
          >
            Use Suggested Stage
          </Button>
        )}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-slate-900 transition-all"
          style={{ width: `${((stageMeta.index + 1) / stageMeta.total) * 100}%` }}
        />
      </div>

      <div className="mt-3 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {DEAL_STAGE_SEQUENCE.map((stage, idx) => {
            const isCurrent = stage === stageMeta.stage;
            const isDone = idx < stageMeta.index;

            return (
              <span
                key={stage}
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  isCurrent
                    ? "bg-slate-900 text-white"
                    : isDone
                    ? "bg-slate-200 text-slate-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {stage}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-700"><span className="font-semibold">Do now:</span> {stageMeta.nextStep}</p>
        <p className="text-xs text-slate-600"><span className="font-semibold">Verify:</span> {stageMeta.verify}</p>
        <p className="text-xs text-slate-500"><span className="font-semibold">Avoid:</span> {stageMeta.commonMistake}</p>
      </div>
    </div>
  );
}
