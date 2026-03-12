import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function BulkEnrichmentToolbar({
  selectedCount,
  onClear,
  onEnrich,
  isEnriching,
  enrichmentProgress,
}) {
  return (
    <div className="fixed bottom-24 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 shadow-lg z-40">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-slate-900 text-white text-lg px-3 py-1">
              {selectedCount} selected
            </Badge>
            {enrichmentProgress && (
              <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                {enrichmentProgress.completed}/{enrichmentProgress.total} enriched
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              disabled={isEnriching}
              className="rounded-lg"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
            <Button
              onClick={onEnrich}
              disabled={isEnriching || selectedCount === 0}
              className="bg-slate-900 hover:bg-slate-800 rounded-lg"
            >
              {isEnriching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enriching...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enrich {selectedCount}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}