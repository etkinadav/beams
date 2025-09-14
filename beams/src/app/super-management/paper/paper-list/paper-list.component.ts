import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subscription } from 'rxjs';
import { Router } from "@angular/router";

import { Paper } from "../paper.model";
import { PapersService } from "../papers.service";
import { PageEvent } from "@angular/material/paginator";
import { AuthService } from "src/app/auth/auth.service";

@Component({
  selector: "app-paper-list",
  templateUrl: "./paper-list.component.html",
  styleUrls: ["./paper-list.component.css"],
  host: {
    class: 'fill-screen'
  }
})
export class PaperListComponent implements OnInit, OnDestroy {
  papers: Paper[] = [];
  isLoading = false;
  totalPapers = 0;
  papersPerPage = 10;
  currentPage = 1;
  pageSizeOptions = [1, 5, 10, 25];
  userIsAuthenticated = false;
  userId: string;
  private papersSub: Subscription;
  private authStatusSub: Subscription;

  constructor(
    public papersService: PapersService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.isLoading = true;
    this.papersService.getPapers(this.papersPerPage, this.currentPage);
    this.userId = this.authService.getUserId();
    this.papersSub = this.papersService
      .getPaperUpdateListener()
      .subscribe((paperData: { papers: Paper[], paperCount: number }) => {
        this.isLoading = false;
        this.totalPapers = paperData.paperCount;
        this.papers = paperData.papers;
      });
  }

  onChangedPage(pageData: PageEvent) {
    this.isLoading = true;
    this.currentPage = pageData.pageIndex + 1;
    this.papersPerPage = pageData.pageSize;
    this.papersService.getPapers(this.papersPerPage, this.currentPage);
  }

  onDelete(PaperId: string) {
    this.isLoading = true;
    this.papersService.deletePaper(PaperId).subscribe(() => {
      this.papersService.getPapers(this.papersPerPage, this.currentPage);
    }), () => {
      this.isLoading = false;
    };
  }

  ngOnDestroy() {
    this.papersSub.unsubscribe();
  }

  toPapersCreate() {
    this.router.navigate(["/papercreate"]);
  }
}
