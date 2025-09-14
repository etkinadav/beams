import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subscription } from 'rxjs';
import { Router } from "@angular/router";

import { BranchesService } from "../branches.service";
import { PageEvent } from "@angular/material/paginator";
import { AuthService } from "src/app/auth/auth.service";
import { DirectionService } from "../../../direction.service";

import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: "app-branch-list",
  templateUrl: "./branch-list.component.html",
  styleUrls: ["./branch-list.component.css"],
  host: {
    class: 'fill-screen'
  }
})
export class BranchListComponent implements OnInit, OnDestroy {
  isDarkMode: boolean = false;
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  private authStatusSub: Subscription;
  branches: any[] = [];
  isLoading = false;
  totalBranches = 0;
  branchesPerPage = 25;
  currentPage = 1;
  pageSizeOptions = [1, 5, 10, 25];
  userIsAuthenticated = false;
  userId: string;
  private branchesSub: Subscription;
  nimlengthUnit: number = 15;

  constructor(
    public branchesService: BranchesService,
    private authService: AuthService,
    private router: Router,
    private directionService: DirectionService,
    private _snackBar: MatSnackBar,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.isLoading = true;

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.branchesService.getBranches(this.branchesPerPage, this.currentPage);
    this.userId = this.authService.getUserId();
    this.branchesSub = this.branchesService
      .getBranchUpdateListener()
      .subscribe((branchData: { branches: any[], branchCount: number }) => {
        this.totalBranches = branchData.branchCount;
        this.branches = branchData.branches;
        this.isLoading = false;
      });
  }

  onChangedPage(pageData: PageEvent) {
    this.isLoading = true;
    this.currentPage = pageData.pageIndex + 1;
    this.branchesPerPage = pageData.pageSize;
    this.branchesService.getBranches(this.branchesPerPage, this.currentPage);
  }

  onDeleteConfirm(branchId: string) {
    this.isLoading = true;
    this.branchesService.deleteBranch(branchId).subscribe(() => {
      this.branchesService.getBranches(this.branchesPerPage, this.currentPage);
    }, () => {
      this.isLoading = false;
    });
  }

  ngOnDestroy() {
    this.branchesSub.unsubscribe();
    this.directionSubscription.unsubscribe();
  }

  toBranchesCreate() {
    this.router.navigate(["/branchcreate"]);
  }

  copyToClipboard(value: string, valueType: string) {
    if (valueType === 'phone') {
      navigator.clipboard.writeText(value).then(() => {
        this.translate.get('su-management.branches_copy-success-phone').subscribe((res: string) => {
          this._snackBar.open(res, '', {
            duration: 1500,
            panelClass: ['auto-width', 'center-text'].filter(Boolean)
          });
        });
      });
    } else if (valueType === 'email') {
      navigator.clipboard.writeText(value).then(() => {
        this.translate.get('su-management.branches_copy-success-email').subscribe((res: string) => {
          this._snackBar.open(res, '', {
            duration: 1500,
            panelClass: ['auto-width', 'center-text'].filter(Boolean)
          });
        });
      });
    }
  }
}
