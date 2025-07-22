import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subscription } from 'rxjs';
import { Router } from "@angular/router";

import { Branch } from "../branch.model";
import { BranchesService } from "../branches.service";
import { PageEvent } from "@angular/material/paginator";
import { AuthService } from "src/app/auth/auth.service";

@Component({
  selector: "app-branch-list",
  templateUrl: "./branch-list.component.html",
  styleUrls: ["./branch-list.component.css"],
  host: {
    class: 'fill-screen'
  }
})
export class BranchListComponent implements OnInit, OnDestroy {
  branches: Branch[] = [];
  isLoading = false;
  totalBranches = 0;
  branchesPerPage = 25;
  currentPage = 1;
  pageSizeOptions = [1, 5, 10, 25];
  userIsAuthenticated = false;
  userId: string;
  private branchesSub: Subscription;
  private authStatusSub: Subscription;

  constructor(
    public branchesService: BranchesService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.isLoading = true;
    this.branchesService.getBranches(this.branchesPerPage, this.currentPage);
    this.userId = this.authService.getUserId();
    this.branchesSub = this.branchesService
      .getBranchUpdateListener()
      .subscribe((branchData: { branches: Branch[], branchCount: number }) => {
        this.isLoading = false;
        this.totalBranches = branchData.branchCount;
        this.branches = branchData.branches;
      });
  }

  onChangedPage(pageData: PageEvent) {
    this.isLoading = true;
    this.currentPage = pageData.pageIndex + 1;
    this.branchesPerPage = pageData.pageSize;
    this.branchesService.getBranches(this.branchesPerPage, this.currentPage);
  }

  onDelete(branchId: string) {
    this.isLoading = true;
    this.branchesService.deleteBranch(branchId).subscribe(() => {
      this.branchesService.getBranches(this.branchesPerPage, this.currentPage);
    }), () => {
      this.isLoading = false;
    };
  }

  ngOnDestroy() {
    this.branchesSub.unsubscribe();
  }

  toBranchesCreate() {
    this.router.navigate(["/branchcreate"]);
  }
}
