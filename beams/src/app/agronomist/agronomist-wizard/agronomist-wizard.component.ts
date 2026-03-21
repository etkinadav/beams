import { Component, OnDestroy, OnInit } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from "@angular/forms";
import { MatSnackBar } from "@angular/material/snack-bar";
import { TranslateService } from "@ngx-translate/core";
import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged, takeUntil } from "rxjs/operators";
import { AgronomistQueryService } from "../agronomist-query.service";
import {
  CLIMATE_TYPE_OPTIONS,
  COMPARISON_TYPE_OPTIONS,
  DRAINAGE_OPTIONS,
  EXPERIMENT_DURATION_UNIT_OPTIONS,
  FERTILIZATION_STRATEGY_OPTIONS,
  GROWING_METHOD_OPTIONS,
  GROWTH_STAGE_OPTIONS,
  IRRIGATION_METHOD_OPTIONS,
  PRIMARY_OBJECTIVE_OPTIONS,
  SOIL_TYPE_OPTIONS,
  SUCCESS_METRICS_OPTIONS,
  SUN_EXPOSURE_OPTIONS,
} from "../agronomist-options.constants";
import { AgronomistQueryPayload } from "../models/agronomist-query.model";

const DRAFT_KEY = "agronomist-query-draft";

export interface WizardStepKeyMeta {
  sectionKey: string;
  titleKey: string;
}

export const WIZARD_STEP_KEYS: WizardStepKeyMeta[] = [
  { sectionKey: "agronomist.section.goal", titleKey: "agronomist.title.primary_objective" },
  { sectionKey: "agronomist.section.goal", titleKey: "agronomist.title.comparison" },
  { sectionKey: "agronomist.section.goal", titleKey: "agronomist.title.success_metrics" },
  { sectionKey: "agronomist.section.crop", titleKey: "agronomist.title.crop_type" },
  { sectionKey: "agronomist.section.crop", titleKey: "agronomist.title.crop_details" },
  { sectionKey: "agronomist.section.environment", titleKey: "agronomist.title.growing_method" },
  { sectionKey: "agronomist.section.environment", titleKey: "agronomist.title.location_climate" },
  { sectionKey: "agronomist.section.environment", titleKey: "agronomist.title.structure_control" },
  { sectionKey: "agronomist.section.substrate", titleKey: "agronomist.title.soil_drainage" },
  { sectionKey: "agronomist.section.substrate", titleKey: "agronomist.title.ph_notes" },
  { sectionKey: "agronomist.section.irrigation", titleKey: "agronomist.title.irrigation_method" },
  { sectionKey: "agronomist.section.irrigation", titleKey: "agronomist.title.irrigation_schedule" },
  { sectionKey: "agronomist.section.irrigation", titleKey: "agronomist.title.water_quality" },
  { sectionKey: "agronomist.section.fertilization", titleKey: "agronomist.title.fertilization" },
  { sectionKey: "agronomist.section.fertilization", titleKey: "agronomist.title.nutrient_notes" },
  { sectionKey: "agronomist.section.lighting", titleKey: "agronomist.title.sun" },
  { sectionKey: "agronomist.section.lighting", titleKey: "agronomist.title.artificial_light" },
  { sectionKey: "agronomist.section.lighting", titleKey: "agronomist.title.temp_humidity" },
  { sectionKey: "agronomist.section.trial_design", titleKey: "agronomist.title.trial_groups" },
  { sectionKey: "agronomist.section.trial_design", titleKey: "agronomist.title.trial_duration" },
  { sectionKey: "agronomist.section.prior_knowledge", titleKey: "agronomist.title.prior_experience" },
  { sectionKey: "agronomist.section.prior_knowledge", titleKey: "agronomist.title.assumptions" },
  { sectionKey: "agronomist.section.additional", titleKey: "agronomist.title.free_notes" },
  { sectionKey: "agronomist.section.review", titleKey: "agronomist.title.review" },
];

@Component({
  selector: "app-agronomist-wizard",
  templateUrl: "./agronomist-wizard.component.html",
  styleUrls: ["./agronomist-wizard.component.scss"],
})
export class AgronomistWizardComponent implements OnInit, OnDestroy {
  readonly steps = WIZARD_STEP_KEYS;
  readonly totalSteps = WIZARD_STEP_KEYS.length;
  stepIndex = 0;
  submitting = false;

  form: FormGroup;

  readonly primaryObjectiveOptions = PRIMARY_OBJECTIVE_OPTIONS;
  readonly comparisonTypeOptions = COMPARISON_TYPE_OPTIONS;
  readonly successMetricsOptions = SUCCESS_METRICS_OPTIONS;
  readonly growthStageOptions = GROWTH_STAGE_OPTIONS;
  readonly growingMethodOptions = GROWING_METHOD_OPTIONS;
  readonly climateTypeOptions = CLIMATE_TYPE_OPTIONS;
  readonly soilTypeOptions = SOIL_TYPE_OPTIONS;
  readonly drainageOptions = DRAINAGE_OPTIONS;
  readonly irrigationMethodOptions = IRRIGATION_METHOD_OPTIONS;
  readonly fertilizationStrategyOptions = FERTILIZATION_STRATEGY_OPTIONS;
  readonly sunExposureOptions = SUN_EXPOSURE_OPTIONS;
  readonly durationUnitOptions = EXPERIMENT_DURATION_UNIT_OPTIONS;

  readonly boolSelectOptions: { value: boolean | null; labelKey: string }[] = [
    { value: null, labelKey: "agronomist.bool.not_specified" },
    { value: true, labelKey: "agronomist.bool.yes" },
    { value: false, labelKey: "agronomist.bool.no" },
  ];

  readonly sectionStartStep: Record<string, number> = {
    "agronomist.section.goal": 0,
    "agronomist.section.crop": 3,
    "agronomist.section.environment": 5,
    "agronomist.section.substrate": 8,
    "agronomist.section.irrigation": 10,
    "agronomist.section.fertilization": 13,
    "agronomist.section.lighting": 15,
    "agronomist.section.trial_design": 18,
    "agronomist.section.prior_knowledge": 20,
    "agronomist.section.additional": 22,
  };

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private agronomistQueryService: AgronomistQueryService,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {
    this.form = this.buildForm();
  }

  ngOnInit(): void {
    this.restoreDraft();
    this.form.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(
          (a, b) => JSON.stringify(a) === JSON.stringify(b)
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.persistDraft());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get progressPercent(): number {
    return ((this.stepIndex + 1) / this.totalSteps) * 100;
  }

  get goalGroup(): FormGroup {
    return this.form.get("goal") as FormGroup;
  }

  get cropGroup(): FormGroup {
    return this.form.get("crop") as FormGroup;
  }

  get environmentGroup(): FormGroup {
    return this.form.get("environment") as FormGroup;
  }

  get substrateGroup(): FormGroup {
    return this.form.get("substrate") as FormGroup;
  }

  get irrigationGroup(): FormGroup {
    return this.form.get("irrigation") as FormGroup;
  }

  get fertilizationGroup(): FormGroup {
    return this.form.get("fertilization") as FormGroup;
  }

  get lightingGroup(): FormGroup {
    return this.form.get("lighting") as FormGroup;
  }

  get trialDesignGroup(): FormGroup {
    return this.form.get("trialDesign") as FormGroup;
  }

  get priorKnowledgeGroup(): FormGroup {
    return this.form.get("priorKnowledge") as FormGroup;
  }

  get freeTextGroup(): FormGroup {
    return this.form.get("freeText") as FormGroup;
  }

  showPrimaryOther(): boolean {
    return this.goalGroup.get("primaryObjective")?.value === "other";
  }

  showComparisonOther(): boolean {
    const v: string[] = this.goalGroup.get("comparisonType")?.value || [];
    return v.includes("other");
  }

  showSuccessOther(): boolean {
    const v: string[] = this.goalGroup.get("successMetrics")?.value || [];
    return v.includes("other");
  }

  showGrowingOther(): boolean {
    return this.environmentGroup.get("growingMethod")?.value === "other";
  }

  showSoilOther(): boolean {
    return this.substrateGroup.get("soilType")?.value === "other";
  }

  showIrrigationOther(): boolean {
    return this.irrigationGroup.get("irrigationMethod")?.value === "other";
  }

  next(): void {
    if (!this.validateStep(this.stepIndex)) {
      return;
    }
    if (this.stepIndex < this.totalSteps - 1) {
      this.stepIndex++;
      this.persistDraft();
    }
  }

  back(): void {
    if (this.stepIndex > 0) {
      this.stepIndex--;
      this.persistDraft();
    }
  }

  goToStep(i: number): void {
    if (i < 0 || i >= this.totalSteps) {
      return;
    }
    const onReview = this.stepIndex === this.totalSteps - 1;
    if (!onReview && i > this.stepIndex) {
      return;
    }
    this.stepIndex = i;
    this.persistDraft();
  }

  submit(): void {
    this.form.markAllAsTouched();
    const dismiss = this.translate.instant("agronomist.btn.dismiss");
    if (!this.validateStep(0) || !this.validateStep(3) || !this.validateStep(5)) {
      this.snackBar.open(
        this.translate.instant("agronomist.snackbar.required_fields"),
        dismiss,
        { duration: 5000 }
      );
      return;
    }
    if (this.form.invalid) {
      this.snackBar.open(
        this.translate.instant("agronomist.snackbar.validation"),
        dismiss,
        { duration: 5000 }
      );
      return;
    }

    const payload = this.buildPayload();
    this.submitting = true;
    this.agronomistQueryService.create(payload).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res.success && res.id) {
          this.clearDraft();
          this.form.reset(this.emptyFormValue());
          this.stepIndex = 0;
          this.snackBar.open(
            this.translate.instant("agronomist.snackbar.saved", { id: res.id }),
            dismiss,
            { duration: 8000 }
          );
        } else {
          this.snackBar.open(
            res.error ||
              this.translate.instant("agronomist.snackbar.save_failed"),
            dismiss,
            { duration: 6000 }
          );
        }
      },
      error: () => {
        this.submitting = false;
        this.snackBar.open(
          this.translate.instant("agronomist.snackbar.save_failed"),
          dismiss,
          { duration: 6000 }
        );
      },
    });
  }

  reviewLines(): {
    sectionKey: string;
    labelKey: string;
    value: string;
  }[] {
    const v = this.form.getRawValue();
    const lines: { sectionKey: string; labelKey: string; value: string }[] = [];

    const add = (sectionKey: string, labelKey: string, val: unknown) => {
      lines.push({
        sectionKey,
        labelKey,
        value: this.formatReviewValue(val),
      });
    };

    add(
      "agronomist.section.goal",
      "agronomist.review.primary_objective",
      this.optLabel(v.goal?.primaryObjective)
    );
    if (this.showPrimaryOther()) {
      add(
        "agronomist.section.goal",
        "agronomist.review.primary_objective_other",
        v.goal?.primaryObjectiveOther
      );
    }
    add(
      "agronomist.section.goal",
      "agronomist.review.comparison_types",
      this.formatMulti(v.goal?.comparisonType)
    );
    if (this.showComparisonOther()) {
      add(
        "agronomist.section.goal",
        "agronomist.review.comparison_other",
        v.goal?.comparisonTypeOther
      );
    }
    add(
      "agronomist.section.goal",
      "agronomist.review.success_metrics",
      this.formatMulti(v.goal?.successMetrics)
    );
    if (this.showSuccessOther()) {
      add(
        "agronomist.section.goal",
        "agronomist.review.success_other",
        v.goal?.successMetricsOther
      );
    }

    add("agronomist.section.crop", "agronomist.review.crop_type", v.crop?.cropType);
    add("agronomist.section.crop", "agronomist.review.variety", v.crop?.cropVariety);
    add("agronomist.section.crop", "agronomist.review.seed_type", v.crop?.seedType);
    add(
      "agronomist.section.crop",
      "agronomist.review.growth_stage",
      this.optLabel(v.crop?.growthStage)
    );

    add(
      "agronomist.section.environment",
      "agronomist.review.growing_method",
      this.optLabel(v.environment?.growingMethod)
    );
    if (this.showGrowingOther()) {
      add(
        "agronomist.section.environment",
        "agronomist.review.growing_method_other",
        v.environment?.growingMethodOther
      );
    }
    add("agronomist.section.environment", "agronomist.review.country", v.environment?.country);
    add("agronomist.section.environment", "agronomist.review.region", v.environment?.region);
    add(
      "agronomist.section.environment",
      "agronomist.review.climate_type",
      this.optLabel(v.environment?.climateType)
    );
    add(
      "agronomist.section.environment",
      "agronomist.review.greenhouse",
      v.environment?.greenhouse
    );
    add(
      "agronomist.section.environment",
      "agronomist.review.controlled_environment",
      v.environment?.controlledEnvironment
    );

    add(
      "agronomist.section.substrate",
      "agronomist.review.soil_type",
      this.optLabel(v.substrate?.soilType)
    );
    if (this.showSoilOther()) {
      add(
        "agronomist.section.substrate",
        "agronomist.review.soil_type_other",
        v.substrate?.soilTypeOther
      );
    }
    add(
      "agronomist.section.substrate",
      "agronomist.review.drainage",
      this.optLabel(v.substrate?.drainage)
    );
    add("agronomist.section.substrate", "agronomist.review.soil_ph", v.substrate?.soilPh);
    add(
      "agronomist.section.substrate",
      "agronomist.review.substrate_notes",
      v.substrate?.substrateNotes
    );

    add(
      "agronomist.section.irrigation",
      "agronomist.review.irrigation_method",
      this.optLabel(v.irrigation?.irrigationMethod)
    );
    if (this.showIrrigationOther()) {
      add(
        "agronomist.section.irrigation",
        "agronomist.review.irrigation_method_other",
        v.irrigation?.irrigationMethodOther
      );
    }
    add(
      "agronomist.section.irrigation",
      "agronomist.review.irrigation_frequency",
      v.irrigation?.irrigationFrequency
    );
    add("agronomist.section.irrigation", "agronomist.review.water_type", v.irrigation?.waterType);
    add(
      "agronomist.section.irrigation",
      "agronomist.review.water_quality_notes",
      v.irrigation?.waterQualityNotes
    );

    add(
      "agronomist.section.fertilization",
      "agronomist.review.fert_strategy",
      this.optLabel(v.fertilization?.fertilizationStrategy)
    );
    add(
      "agronomist.section.fertilization",
      "agronomist.review.existing_protocol",
      v.fertilization?.existingFertilizationProtocol
    );
    add(
      "agronomist.section.fertilization",
      "agronomist.review.fertilizer_types",
      v.fertilization?.fertilizerTypes
    );
    add(
      "agronomist.section.fertilization",
      "agronomist.review.nutrient_notes",
      v.fertilization?.nutrientNotes
    );

    add(
      "agronomist.section.lighting",
      "agronomist.review.sun_exposure",
      this.optLabel(v.lighting?.sunExposure)
    );
    add(
      "agronomist.section.lighting",
      "agronomist.review.artificial_lighting",
      v.lighting?.artificialLighting
    );
    add(
      "agronomist.section.lighting",
      "agronomist.review.lighting_type",
      v.lighting?.lightingType
    );
    add(
      "agronomist.section.lighting",
      "agronomist.review.avg_temperature",
      v.lighting?.averageTemperature
    );
    add(
      "agronomist.section.lighting",
      "agronomist.review.humidity_notes",
      v.lighting?.humidityNotes
    );

    add(
      "agronomist.section.trial_design",
      "agronomist.review.control_group",
      v.trialDesign?.controlGroup
    );
    add(
      "agronomist.section.trial_design",
      "agronomist.review.num_groups",
      v.trialDesign?.numberOfGroups
    );
    add(
      "agronomist.section.trial_design",
      "agronomist.review.replications",
      v.trialDesign?.replications
    );
    add(
      "agronomist.section.trial_design",
      "agronomist.review.sample_size",
      v.trialDesign?.sampleSizePerGroup
    );
    add(
      "agronomist.section.trial_design",
      "agronomist.review.plot_size",
      v.trialDesign?.plotSize
    );
    add(
      "agronomist.section.trial_design",
      "agronomist.review.duration",
      this.formatDuration(
        v.trialDesign?.experimentDurationValue,
        v.trialDesign?.experimentDurationUnit
      )
    );
    add(
      "agronomist.section.trial_design",
      "agronomist.review.design_notes",
      v.trialDesign?.trialDesignNotes
    );

    add(
      "agronomist.section.prior_knowledge",
      "agronomist.review.prev_experience",
      v.priorKnowledge?.previousExperience
    );
    add(
      "agronomist.section.prior_knowledge",
      "agronomist.review.prev_attempts",
      v.priorKnowledge?.previousAttempts
    );
    add(
      "agronomist.section.prior_knowledge",
      "agronomist.review.assumptions",
      v.priorKnowledge?.assumptionsToTest
    );
    add(
      "agronomist.section.prior_knowledge",
      "agronomist.review.constraints",
      v.priorKnowledge?.knownConstraints
    );

    add(
      "agronomist.section.additional",
      "agronomist.review.additional_notes",
      v.freeText?.additionalNotes
    );

    return lines;
  }

  reviewSectionGroups(): {
    sectionKey: string;
    items: { labelKey: string; value: string }[];
  }[] {
    const lines = this.reviewLines();
    const order = [
      "agronomist.section.goal",
      "agronomist.section.crop",
      "agronomist.section.environment",
      "agronomist.section.substrate",
      "agronomist.section.irrigation",
      "agronomist.section.fertilization",
      "agronomist.section.lighting",
      "agronomist.section.trial_design",
      "agronomist.section.prior_knowledge",
      "agronomist.section.additional",
    ];
    const map = new Map<string, { labelKey: string; value: string }[]>();
    for (const line of lines) {
      if (!map.has(line.sectionKey)) {
        map.set(line.sectionKey, []);
      }
      map.get(line.sectionKey)!.push({
        labelKey: line.labelKey,
        value: line.value,
      });
    }
    return order
      .filter((s) => map.has(s))
      .map((sectionKey) => ({
        sectionKey,
        items: map.get(sectionKey)!,
      }));
  }

  private formatDuration(
    value: number | string | null | undefined,
    unit: string | null | undefined
  ): string {
    if (value === "" || value === null || value === undefined) {
      return "";
    }
    const u = unit ? this.translate.instant("agronomist.opt." + unit) : "";
    return u ? `${value} ${u}` : String(value);
  }

  private optLabel(value: string | null | undefined): string {
    if (value === null || value === undefined || value === "") {
      return "";
    }
    return this.translate.instant("agronomist.opt." + value);
  }

  private formatMulti(arr: string[] | null | undefined): string {
    if (!arr || !arr.length) {
      return "";
    }
    return arr
      .map((v) => this.optLabel(v))
      .filter(Boolean)
      .join(", ");
  }

  formatReviewValue(val: unknown): string {
    const ns = this.translate.instant("agronomist.review.not_specified");
    if (val === null || val === undefined) {
      return ns;
    }
    if (typeof val === "boolean") {
      return val
        ? this.translate.instant("agronomist.bool.yes")
        : this.translate.instant("agronomist.bool.no");
    }
    if (Array.isArray(val)) {
      return val.length ? val.join(", ") : ns;
    }
    const s = String(val).trim();
    return s.length ? s : ns;
  }

  private validateStep(index: number): boolean {
    switch (index) {
      case 0:
        return this.markValid(this.goalGroup.get("primaryObjective"));
      case 3:
        return this.markValid(this.cropGroup.get("cropType"));
      case 5:
        return this.markValid(this.environmentGroup.get("growingMethod"));
      default:
        return true;
    }
  }

  private markValid(control: AbstractControl | null): boolean {
    if (!control) {
      return true;
    }
    control.markAsTouched();
    return control.valid;
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      goal: this.fb.group({
        primaryObjective: ["", Validators.required],
        primaryObjectiveOther: [""],
        comparisonType: [[] as string[]],
        comparisonTypeOther: [""],
        successMetrics: [[] as string[]],
        successMetricsOther: [""],
      }),
      crop: this.fb.group({
        cropType: ["", Validators.required],
        cropVariety: [""],
        seedType: [""],
        growthStage: [""],
      }),
      environment: this.fb.group({
        growingMethod: ["", Validators.required],
        growingMethodOther: [""],
        country: [""],
        region: [""],
        climateType: [""],
        greenhouse: [null as boolean | null],
        controlledEnvironment: [null as boolean | null],
      }),
      substrate: this.fb.group({
        soilType: [""],
        soilTypeOther: [""],
        drainage: [""],
        soilPh: [null as number | null],
        substrateNotes: [""],
      }),
      irrigation: this.fb.group({
        irrigationMethod: [""],
        irrigationMethodOther: [""],
        irrigationFrequency: [""],
        waterType: [""],
        waterQualityNotes: [""],
      }),
      fertilization: this.fb.group({
        fertilizationStrategy: [""],
        existingFertilizationProtocol: [null as boolean | null],
        fertilizerTypes: [""],
        nutrientNotes: [""],
      }),
      lighting: this.fb.group({
        sunExposure: [""],
        artificialLighting: [null as boolean | null],
        lightingType: [""],
        averageTemperature: [null as number | null],
        humidityNotes: [""],
      }),
      trialDesign: this.fb.group({
        controlGroup: [null as boolean | null],
        numberOfGroups: [null as number | null],
        replications: [null as number | null],
        sampleSizePerGroup: [null as number | null],
        plotSize: [""],
        experimentDurationValue: [null as number | null],
        experimentDurationUnit: [""],
        trialDesignNotes: [""],
      }),
      priorKnowledge: this.fb.group({
        previousExperience: [null as boolean | null],
        previousAttempts: [""],
        assumptionsToTest: [""],
        knownConstraints: [""],
      }),
      freeText: this.fb.group({
        additionalNotes: [""],
      }),
    });
  }

  private emptyFormValue(): Record<string, unknown> {
    return {
      goal: {
        primaryObjective: "",
        primaryObjectiveOther: "",
        comparisonType: [],
        comparisonTypeOther: "",
        successMetrics: [],
        successMetricsOther: "",
      },
      crop: {
        cropType: "",
        cropVariety: "",
        seedType: "",
        growthStage: "",
      },
      environment: {
        growingMethod: "",
        growingMethodOther: "",
        country: "",
        region: "",
        climateType: "",
        greenhouse: null,
        controlledEnvironment: null,
      },
      substrate: {
        soilType: "",
        soilTypeOther: "",
        drainage: "",
        soilPh: null,
        substrateNotes: "",
      },
      irrigation: {
        irrigationMethod: "",
        irrigationMethodOther: "",
        irrigationFrequency: "",
        waterType: "",
        waterQualityNotes: "",
      },
      fertilization: {
        fertilizationStrategy: "",
        existingFertilizationProtocol: null,
        fertilizerTypes: "",
        nutrientNotes: "",
      },
      lighting: {
        sunExposure: "",
        artificialLighting: null,
        lightingType: "",
        averageTemperature: null,
        humidityNotes: "",
      },
      trialDesign: {
        controlGroup: null,
        numberOfGroups: null,
        replications: null,
        sampleSizePerGroup: null,
        plotSize: "",
        experimentDurationValue: null,
        experimentDurationUnit: "",
        trialDesignNotes: "",
      },
      priorKnowledge: {
        previousExperience: null,
        previousAttempts: "",
        assumptionsToTest: "",
        knownConstraints: "",
      },
      freeText: { additionalNotes: "" },
    };
  }

  private persistDraft(): void {
    try {
      const raw = this.form.getRawValue();
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ stepIndex: this.stepIndex, form: raw })
      );
    } catch {
      /* ignore quota */
    }
  }

  private restoreDraft(): void {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as {
        stepIndex?: number;
        form?: Record<string, unknown>;
      };
      if (parsed.form) {
        this.form.patchValue(parsed.form, { emitEvent: false });
      }
      if (
        typeof parsed.stepIndex === "number" &&
        parsed.stepIndex >= 0 &&
        parsed.stepIndex < this.totalSteps
      ) {
        this.stepIndex = parsed.stepIndex;
      }
    } catch {
      /* ignore */
    }
  }

  private clearDraft(): void {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }

  private buildPayload(): AgronomistQueryPayload {
    const v = this.form.getRawValue();
    return {
      source: "public-form",
      goal: {
        primaryObjective: String(v.goal.primaryObjective || "").trim(),
        primaryObjectiveOther: this.trimOrUndef(v.goal.primaryObjectiveOther),
        comparisonType: v.goal.comparisonType?.length
          ? v.goal.comparisonType
          : undefined,
        comparisonTypeOther: this.trimOrUndef(v.goal.comparisonTypeOther),
        successMetrics: v.goal.successMetrics?.length
          ? v.goal.successMetrics
          : undefined,
        successMetricsOther: this.trimOrUndef(v.goal.successMetricsOther),
      },
      crop: {
        cropType: String(v.crop.cropType || "").trim(),
        cropVariety: this.trimOrUndef(v.crop.cropVariety),
        seedType: this.trimOrUndef(v.crop.seedType),
        growthStage: this.trimOrUndef(v.crop.growthStage),
      },
      environment: {
        growingMethod: String(v.environment.growingMethod || "").trim(),
        growingMethodOther: this.trimOrUndef(v.environment.growingMethodOther),
        country: this.trimOrUndef(v.environment.country),
        region: this.trimOrUndef(v.environment.region),
        climateType: this.trimOrUndef(v.environment.climateType),
        greenhouse: v.environment.greenhouse,
        controlledEnvironment: v.environment.controlledEnvironment,
      },
      substrate: {
        soilType: this.trimOrUndef(v.substrate.soilType),
        soilTypeOther: this.trimOrUndef(v.substrate.soilTypeOther),
        drainage: this.trimOrUndef(v.substrate.drainage),
        soilPh: this.numOrUndef(v.substrate.soilPh),
        substrateNotes: this.trimOrUndef(v.substrate.substrateNotes),
      },
      irrigation: {
        irrigationMethod: this.trimOrUndef(v.irrigation.irrigationMethod),
        irrigationMethodOther: this.trimOrUndef(
          v.irrigation.irrigationMethodOther
        ),
        irrigationFrequency: this.trimOrUndef(v.irrigation.irrigationFrequency),
        waterType: this.trimOrUndef(v.irrigation.waterType),
        waterQualityNotes: this.trimOrUndef(v.irrigation.waterQualityNotes),
      },
      fertilization: {
        fertilizationStrategy: this.trimOrUndef(
          v.fertilization.fertilizationStrategy
        ),
        existingFertilizationProtocol:
          v.fertilization.existingFertilizationProtocol,
        fertilizerTypes: this.trimOrUndef(v.fertilization.fertilizerTypes),
        nutrientNotes: this.trimOrUndef(v.fertilization.nutrientNotes),
      },
      lighting: {
        sunExposure: this.trimOrUndef(v.lighting.sunExposure),
        artificialLighting: v.lighting.artificialLighting,
        lightingType: this.trimOrUndef(v.lighting.lightingType),
        averageTemperature: this.numOrUndef(v.lighting.averageTemperature),
        humidityNotes: this.trimOrUndef(v.lighting.humidityNotes),
      },
      trialDesign: {
        controlGroup: v.trialDesign.controlGroup,
        numberOfGroups: this.numOrUndef(v.trialDesign.numberOfGroups),
        replications: this.numOrUndef(v.trialDesign.replications),
        sampleSizePerGroup: this.numOrUndef(v.trialDesign.sampleSizePerGroup),
        plotSize: this.trimOrUndef(v.trialDesign.plotSize),
        experimentDurationValue: this.numOrUndef(
          v.trialDesign.experimentDurationValue
        ),
        experimentDurationUnit: this.trimOrUndef(
          v.trialDesign.experimentDurationUnit
        ),
        trialDesignNotes: this.trimOrUndef(v.trialDesign.trialDesignNotes),
      },
      priorKnowledge: {
        previousExperience: v.priorKnowledge.previousExperience,
        previousAttempts: this.trimOrUndef(v.priorKnowledge.previousAttempts),
        assumptionsToTest: this.trimOrUndef(v.priorKnowledge.assumptionsToTest),
        knownConstraints: this.trimOrUndef(v.priorKnowledge.knownConstraints),
      },
      freeText: {
        additionalNotes: this.trimOrUndef(v.freeText.additionalNotes),
      },
    };
  }

  private trimOrUndef(s: string | null | undefined): string | undefined {
    if (s === null || s === undefined) {
      return undefined;
    }
    const t = String(s).trim();
    return t.length ? t : undefined;
  }

  private numOrUndef(v: number | string | null | undefined): number | undefined {
    if (v === null || v === undefined || v === "") {
      return undefined;
    }
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
}
