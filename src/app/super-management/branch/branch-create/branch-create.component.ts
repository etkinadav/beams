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
  branch: any;
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
      serial_name: new FormControl(null, {
        validators: [Validators.required, Validators.minLength(3)]
      }),
      // ADD EDIT BRANCH PROPERTIES HERE 1:
      close: new FormControl(false, {
        validators: [Validators.required]
      }),
      close_msg: new FormControl(null, {
        validators: [Validators.required]
      }),
      domain: new FormControl(null, {
        validators: [Validators.required]
      }),
      downgraded: new FormControl(false, {
        validators: [Validators.required]
      }),
      email: new FormControl(null, {
        validators: [Validators.required]
      }),
      hide: new FormControl(false, {
        validators: [Validators.required]
      }),
      hotjarID: new FormControl(null, {
      }),
      inform_slack_of_new_orders: new FormControl(false, {
        validators: [Validators.required]
      }),
      location: new FormControl(null, {
        validators: [Validators.required]
      }),
      name: new FormControl(null, {
        validators: [Validators.required]
      }),
      short_name: new FormControl(null, {
        validators: [Validators.required]
      }),
      slack_url: new FormControl(null, {
        validators: [Validators.required]
      }),
      sort: new FormControl(null, {
        validators: [Validators.required]
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
          console.log("branchData.printers[0].inputBins");
          console.log(branchData.printers[0].inputBins);
          const paperIds = branchData.printers[0].inputBins ? branchData.printers[0].inputBins.map(paper => paper.paperType._id) : [];
          console.log("paperIds: ---=============================---");
          console.log(paperIds);
          console.log("branchData: ---=============================---");
          console.log(branchData);
          this.branch = {
            id: branchData._id,
            serial_name: branchData.serial_name,
            // ADD EDIT BRANCH PROPERTIES HERE:
            close: branchData.close,
            close_msg: branchData.close_msg,
            domain: branchData.domain,
            downgraded: branchData.downgraded,
            email: branchData.email,
            hide: branchData.hide,
            hotjarID: branchData.hotjarID,
            inform_slack_of_new_orders: branchData.inform_slack_of_new_orders,
            location: branchData.location,
            name: branchData.name,
            short_name: branchData.short_name,
            slack_url: branchData.slack_url,
            sort: branchData.sort,
            papers: paperIds,
          };
          this.form.setValue({
            serial_name: this.branch.serial_name,
            // ADD EDIT BRANCH PROPERTIES HERE:
            close: this.branch.close,
            close_msg: this.branch.close_msg,
            domain: this.branch.domain,
            downgraded: this.branch.downgraded,
            email: this.branch.email,
            hide: this.branch.hide,
            hotjarID: this.branch.hotjarID !== undefined ? this.branch.hotjarID : null, // Check if undefined
            inform_slack_of_new_orders: this.branch.inform_slack_of_new_orders,
            location: this.branch.location,
            name: this.branch.name,
            short_name: this.branch.short_name,
            slack_url: this.branch.slack_url,
            sort: this.branch.sort,
            papers: paperIds,
          });
          // this.imagePreview = this.branch.branchLogo;
        });
      } else {
        this.mode = "create";
        this.isModeEdit = false;
        this.branchId = null;
      }
    });
  }

  // onImagePicked(event: Event) {
  //   const file = (event.target as HTMLInputElement).files[0];
  //   this.form.patchValue({ image: file });
  //   this.form.get("image").updateValueAndValidity();
  //   const reader = new FileReader();
  //   reader.onload = () => {
  //     this.imagePreview = reader.result as string;
  //   };
  //   reader.readAsDataURL(file);
  // }

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
        this.form.value.serial_name,
        // ADD EDIT BRANCH PROPERTIES HERE:
        this.form.value.close,
        this.form.value.close_msg,
        this.form.value.domain,
        this.form.value.downgraded,
        this.form.value.email,
        this.form.value.hide,
        this.form.value.hotjarID,
        this.form.value.inform_slack_of_new_orders,
        this.form.value.location,
        this.form.value.name,
        this.form.value.short_name,
        this.form.value.slack_url,
        this.form.value.sort,
        selectedPapers,
      );
    } else {
      this.branchesService.updateBranch(
        this.branchId,
        this.form.value.serial_name,
        // ADD EDIT BRANCH PROPERTIES HERE:
        this.form.value.close,
        this.form.value.close_msg,
        this.form.value.domain,
        this.form.value.downgraded,
        this.form.value.email,
        this.form.value.hide,
        this.form.value.hotjarID,
        this.form.value.inform_slack_of_new_orders,
        this.form.value.location,
        this.form.value.name,
        this.form.value.short_name,
        this.form.value.slack_url,
        this.form.value.sort,
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
