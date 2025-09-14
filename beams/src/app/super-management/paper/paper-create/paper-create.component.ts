import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { ActivatedRoute, ParamMap } from "@angular/router";
import { Router } from "@angular/router";

import { PapersService } from "../papers.service";
import { Paper } from "../paper.model";
import { Subscription } from "rxjs";
import { AuthService } from "src/app/auth/auth.service";

@Component({
  selector: "app-paper-create",
  templateUrl: "./paper-create.component.html",
  styleUrls: ["./paper-create.component.css"],
  host: {
    class: 'fill-screen'
  }
})

export class PaperCreateComponent implements OnInit, OnDestroy {
  @ViewChild('hiddenSubmitBtn') hiddenSubmitBtn: ElementRef;
  enteredTitle = "";
  enteredContent = "";
  paper: Paper;
  isLoading = false;
  form: FormGroup;
  imagePreview: string;
  private mode = "create";
  isModeEdit = false;
  private paperId: string;
  private authStatusSub: Subscription;

  constructor(
    public papersService: PapersService,
    public route: ActivatedRoute,
    private router: Router,
    private authService: AuthService

  ) { }

  ngOnInit() {
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe(
        authStatus => {
          this.isLoading = false;
        }
      );
    this.form = new FormGroup({
      paperName: new FormControl(null, {
        validators: [Validators.required, Validators.minLength(3)]
      }),
      paperWidth: new FormControl(null, {
        validators: [Validators.required]
      }),
      paperHeight: new FormControl(null, {
        validators: [Validators.required]
      }),
      paperWeight: new FormControl(null, {
        validators: [Validators.required]
      }),
      paperPrinterCode: new FormControl(null, {
        validators: [Validators.required]
      }),
      paperPrinterQuality: new FormControl(null, {
        validators: [Validators.required]
      }),
      isExpress: new FormControl(false, {
        validators: [Validators.required]
      }),
      isPlotter: new FormControl(false, {
        validators: [Validators.required]
      }),
      isPh: new FormControl(false, {
        validators: [Validators.required]
      }),
    });
    this.route.paramMap.subscribe((paramMap: ParamMap) => {
      if (paramMap.has("paperId")) {
        this.mode = "edit";
        this.isModeEdit = true;
        this.paperId = paramMap.get("paperId");
        this.isLoading = true;

        this.papersService.getPaper(this.paperId).subscribe(paperData => {
          this.isLoading = false;
          this.paper = {
            id: paperData._id,
            paperName: paperData.paperName,
            paperWidth: paperData.paperWidth,
            paperHeight: paperData.paperHeight,
            paperWeight: paperData.paperWeight,
            paperPrinterCode: paperData.paperPrinterCode,
            paperPrinterQuality: paperData.paperPrinterQuality,
            isExpress: paperData.isExpress,
            isPlotter: paperData.isPlotter,
            isPh: paperData.isPh,
          };
          this.form.setValue({
            paperName: this.paper.paperName,
            paperWidth: this.paper.paperWidth,
            paperHeight: this.paper.paperHeight,
            paperWeight: this.paper.paperWeight,
            paperPrinterCode: this.paper.paperPrinterCode,
            paperPrinterQuality: this.paper.paperPrinterQuality,
            isExpress: this.paper.isExpress || false,
            isPlotter: this.paper.isPlotter || false,
            isPh: this.paper.isPh || false,
          });
        });
      } else {
        this.mode = "create";
        this.isModeEdit = false;
        this.paperId = null;
      }
    });
  }

  onSavePaper() {
    if (this.form.invalid) {
      console.log("form is invalid!");
      return;
    }
    this.isLoading = true;
    console.log(this.form.value.paperName,
      this.form.value.paperWidth,
      this.form.value.paperHeight,
      this.form.value.paperWeight,
      this.form.value.paperPrinterCode,
      this.form.value.paperPrinterQuality,
      this.form.value.isExpress,
      this.form.value.isPlotter,
      this.form.value.isPh,
    )
    if (this.mode === "create") {
      this.papersService.addPaper(
        this.form.value.paperName,
        this.form.value.paperWidth,
        this.form.value.paperHeight,
        this.form.value.paperWeight,
        this.form.value.paperPrinterCode,
        this.form.value.paperPrinterQuality,
        this.form.value.isExpress,
        this.form.value.isPlotter,
        this.form.value.isPh,
      );
    } else {
      this.papersService.updatePaper(
        this.paperId,
        this.form.value.paperName,
        this.form.value.paperWidth,
        this.form.value.paperHeight,
        this.form.value.paperWeight,
        this.form.value.paperPrinterCode,
        this.form.value.paperPrinterQuality,
        this.form.value.isExpress,
        this.form.value.isPlotter,
        this.form.value.isPh,
      );
    }
    this.form.reset();
  }

  backToPapers() {
    this.router.navigate(['/paperlist']);
  }

  ngOnDestroy() {
    this.authStatusSub.unsubscribe();
  }

  toPapersList() {
    this.router.navigate(["/paperlist"]);
  }

  // Trigger click on the hidden submit button
  submitForm() {
    if (this.hiddenSubmitBtn) {
      (this.hiddenSubmitBtn.nativeElement as HTMLButtonElement).click();
    }
  }
}
