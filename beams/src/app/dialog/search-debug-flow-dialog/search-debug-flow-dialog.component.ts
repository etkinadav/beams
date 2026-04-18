import { ChangeDetectorRef, Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";

export interface SearchDebugFlowDialogData {
  debugFlow: Record<string, unknown>;
}

@Component({
  selector: "app-search-debug-flow-dialog",
  templateUrl: "./search-debug-flow-dialog.component.html",
  styleUrls: ["search-debug-flow-dialog.component.scss"],
})
export class SearchDebugFlowDialogComponent {
  readonly flow: Record<string, unknown>;
  copyDone = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) data: SearchDebugFlowDialogData,
    private cdr: ChangeDetectorRef
  ) {
    this.flow = data.debugFlow && typeof data.debugFlow === "object" ? data.debugFlow : {};
  }

  jsonKey(key: string): string {
    const v = (this.flow as Record<string, unknown>)[key];
    return JSON.stringify(v ?? null, null, 2);
  }

  /** Planner source, fallback, and stage counts (single JSON block). */
  pipelineStagesJson(): string {
    const keys = [
      "plannerSource",
      "fallbackReason",
      "googleResultsRawCount",
      "afterNormalizationCount",
      "afterDistanceFilterCount",
      "afterStrictFilterCount",
      "afterScoringCount",
      "finalResultsCount",
    ];
    const o: Record<string, unknown> = {};
    for (const k of keys) {
      o[k] = (this.flow as Record<string, unknown>)[k];
    }
    return JSON.stringify(o, null, 2);
  }

  copyFullDebug(): void {
    const debugText = JSON.stringify(this.flow, null, 2);
    navigator.clipboard.writeText(debugText).then(
      () => {
        this.copyDone = true;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.copyDone = false;
          this.cdr.markForCheck();
        }, 2000);
      },
      () => {
        console.warn("Clipboard write failed");
      }
    );
  }
}
