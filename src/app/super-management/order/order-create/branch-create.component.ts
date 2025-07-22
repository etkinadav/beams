import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { ActivatedRoute, ParamMap } from "@angular/router";
import { Router } from "@angular/router";

import { BranchesService } from "../branches.service";
import { Branch } from "../branch.model";
import { mimeType } from "./mime-type.validator";
import { Subscription } from "rxjs";
import { AuthService } from "src/app/auth/auth.service";

import { PapersService } from "../../paper/papers.service";

@Component({
  selector: "app-branch-create",
  templateUrl: "./branch-create.component.html",
  styleUrls: ["./branch-create.component.css"],
  host: {
    class: 'fill-screen'
  }
})

export class BranchCreateComponent implements OnInit, OnDestroy {
  @ViewChild('hiddenSubmitBtn') hiddenSubmitBtn: ElementRef;
  enteredTitle = "";
  enteredContent = "";
  branch: Branch;
  isLoading = false;
  form: FormGroup;
  imagePreview: string;
  private mode = "create";
  isModeEdit = false;
  private branchId: string;
  private authStatusSub: Subscription;
  availablePaperTypes: any[];

  constructor(
    public branchesService: BranchesService,
    public route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private papersService: PapersService,
  ) { }

  ngOnInit() {
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe(
        authStatus => {
          this.isLoading = false;
        }
      );
    this.papersService.getAllPapers()
      .subscribe((papers: any[]) => {
        this.availablePaperTypes = papers;
      });
    this.form = new FormGroup({
      name: new FormControl(null, {
        validators: [Validators.required, Validators.minLength(3)]
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
      image: new FormControl(null, {
        validators: [Validators.required],
        asyncValidators: [mimeType]
      }),
      papers: new FormControl(
        []
      ),
    });
    this.route.paramMap.subscribe((paramMap: ParamMap) => {
      if (paramMap.has("branchId")) {
        this.mode = "edit";
        this.isModeEdit = true;
        this.branchId = paramMap.get("branchId");
        this.isLoading = true;
        this.branchesService.getBranch(this.branchId).subscribe(branchData => {
          this.isLoading = false;
          const paperIds = branchData.papers ? branchData.papers.map(paper => paper._id) : [];
          this.branch = {
            id: branchData._id,
            name: branchData.name,
            isExpress: branchData.isExpress,
            isPlotter: branchData.isPlotter,
            isPh: branchData.isPh,
            branchLogo: branchData.branchLogo,
            papers: paperIds,
          };
          this.form.setValue({
            name: this.branch.name,
            isExpress: this.branch.isExpress,
            isPlotter: this.branch.isPlotter,
            isPh: this.branch.isPh,
            image: this.branch.branchLogo,
            papers: paperIds,
          });
          this.imagePreview = this.branch.branchLogo;
        });
      } else {
        this.mode = "create";
        this.isModeEdit = false;
        this.branchId = null;
      }
    });
  }

  onImagePicked(event: Event) {
    const file = (event.target as HTMLInputElement).files[0];
    this.form.patchValue({ image: file });
    this.form.get("image").updateValueAndValidity();
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onSaveBranch() {
    if (this.form.invalid) {
      console.log("form is invalid!");
      return;
    }
    this.isLoading = true;
    const selectedPapers = this.form.value.papers;
    console.log("selectedPapers");
    console.log(selectedPapers);
    if (this.mode === "create") {
      this.branchesService.addBranch(
        this.form.value.name,
        this.form.value.isExpress,
        this.form.value.isPlotter,
        this.form.value.isPh,
        this.form.value.image,
        selectedPapers,
      );
    } else {
      this.branchesService.updateBranch(
        this.branchId,
        this.form.value.name,
        this.form.value.isExpress,
        this.form.value.isPlotter,
        this.form.value.isPh,
        this.form.value.image,
        selectedPapers,
      );
    }
    this.form.reset();
  }

  backToBranches() {
    this.router.navigate(['/branchlist']);
  }

  ngOnDestroy() {
    this.authStatusSub.unsubscribe();
  }

  toBranchesList() {
    this.router.navigate(["/branchlist"]);
  }

  // Trigger click on the hidden submit button
  submitForm() {
    if (this.hiddenSubmitBtn) {
      (this.hiddenSubmitBtn.nativeElement as HTMLButtonElement).click();
    }
  }
}
