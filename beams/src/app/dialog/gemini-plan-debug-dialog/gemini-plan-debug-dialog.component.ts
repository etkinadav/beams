import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";

export interface GeminiPlanDebugDialogData {
  plan: Record<string, unknown>;
}

/**
 * TEMPORARY: shows Gemini sanitized plan as JSON for debugging.
 */
@Component({
  selector: "app-gemini-plan-debug-dialog",
  templateUrl: "./gemini-plan-debug-dialog.component.html",
  styleUrls: ["./gemini-plan-debug-dialog.component.scss"],
})
export class GeminiPlanDebugDialogComponent {
  readonly json: string;

  constructor(@Inject(MAT_DIALOG_DATA) data: GeminiPlanDebugDialogData) {
    this.json = JSON.stringify(data.plan ?? {}, null, 2);
  }
}
