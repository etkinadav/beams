import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from "@angular/core";
import { FormArray, FormGroup, FormControl, Validators } from "@angular/forms";
import { ActivatedRoute, ParamMap } from "@angular/router";
import { Router } from "@angular/router";

import { UsersService } from "../users.service";
import { User } from "../user.model";
import { Subscription } from "rxjs";
import { AuthService } from "src/app/auth/auth.service";
import { DataSharingService } from '../../../main-section/data-shering-service/data-sharing.service';

@Component({
  selector: "app-user-edit",
  templateUrl: "./user-edit.component.html",
  styleUrls: ["./user-edit.component.css"],
  host: {
    class: 'fill-screen'
  }
})

export class UserEditComponent implements OnInit, OnDestroy {
  @ViewChild('hiddenSubmitBtn') hiddenSubmitBtn: ElementRef;
  enteredTitle = "";
  enteredContent = "";
  user: User;
  isLoading = false;
  form: FormGroup;
  imagePreview: string;
  private userId: string;
  private authStatusSub: Subscription;
  public branchesNames: string[] = [];
  public branches: { name: string; systems: string[] }[] = [];

  constructor(
    public usersService: UsersService,
    public route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private dataSharingService: DataSharingService
  ) { }

  async ngOnInit() {
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe(
        authStatus => {
          this.isLoading = false;
        }
      );

    this.form = new FormGroup({
      email: new FormControl(null,
        [Validators.required, Validators.minLength(3)]
      ),
      provider: new FormControl(null,
        [Validators.required]
      ),
      language: new FormControl(null,
        [Validators.required]
      ),
      home_printingServices_list: new FormControl(
        []
      ),
      home_branches_list: new FormControl(
        []
      ),
    });

    this.route.paramMap.subscribe((paramMap: ParamMap) => {
      if (paramMap.has("userId")) {
        this.userId = paramMap.get("userId");
        this.isLoading = true;
        this.usersService.getUser(this.userId).subscribe(userData => {
          this.isLoading = false;
          this.user = {
            id: userData._id,
            email: userData.email,
            printingService: userData.printingService,
            branch: userData.branch,
            provider: userData.provider,
            language: userData.language,
            // isBMBranches: userData.isBMBranches ? userData.isBMBranches : [],
            // isSU: userData.isSU ? userData.isSU : false,
            home_printingServices_list: userData.home_printingServices_list,
            home_branches_list: userData.home_branches_list,

          };
          this.form.patchValue({
            email: this.user.email,
            provider: this.user.provider,
            language: this.user.language,
            // isBMBranches: userData.isBMBranches ? userData.isBMBranches : [],
            // isSU: userData.isSU,
          });
        });
      } else {
        this.userId = null;
      }
    });

    try {
      this.branches = await this.dataSharingService.fetchAndTransformBranches();
      console.log(this.branches, this.branchesNames);
      this.branchesNames = this.branches.map(branch => branch.name);
      console.log(this.branchesNames); // Check the extracted names
    } catch (error) {
      console.error('Error fetching and transforming branches:', error);
    }

  }

  onSaveUser() {
    if (this.form.invalid) {
      console.log("form is invalid!");
      return;
    }
    this.isLoading = true;
    const selectedBranches = this.form.value.isBMBranches;

    this.usersService.updateUserManagement(
      this.userId,
      this.form.value.email,
      this.form.value.provider,
      this.form.value.language,
      selectedBranches,
      this.form.value.isSU
    );
    this.form.reset();
  }

  backToUsers() {
    this.router.navigate(['/userlist']);
  }

  ngOnDestroy() {
    this.authStatusSub.unsubscribe();
  }

  toUsersList() {
    this.router.navigate(["/userlist"]);
  }

  // Trigger click on the hidden submit button
  submitForm() {
    if (this.hiddenSubmitBtn) {
      (this.hiddenSubmitBtn.nativeElement as HTMLButtonElement).click();
    }
  }
}
