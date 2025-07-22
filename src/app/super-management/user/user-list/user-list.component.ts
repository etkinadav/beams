import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subscription } from 'rxjs';
import { Router } from "@angular/router";

import { User } from "../../user/user.model";
import { UsersService } from "../users.service";
import { PageEvent } from "@angular/material/paginator";
import { AuthService } from "src/app/auth/auth.service";

@Component({
  selector: "app-user-list",
  templateUrl: "./user-list.component.html",
  styleUrls: ["./user-list.component.css"],
  host: {
    class: 'fill-screen'
  }
})
export class UserListComponent implements OnInit, OnDestroy {
  users: User[] = [];
  isLoading = false;
  totalUsers = 0;
  usersPerPage = 10;
  currentPage = 1;
  pageSizeOptions = [1, 5, 10, 25];
  userIsAuthenticated = false;
  userId: string;
  private usersSub: Subscription;
  private authStatusSub: Subscription;

  constructor(
    public usersService: UsersService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.isLoading = true;
    this.usersService.getUsers(this.usersPerPage, this.currentPage);
    this.userId = this.authService.getUserId();
    this.usersSub = this.usersService
      .getUserUpdateListener()
      .subscribe((userData: { users: User[], userCount: number }) => {
        this.isLoading = false;
        this.totalUsers = userData.userCount;
        this.users = userData.users;
      });
  }

  onChangedPage(pageData: PageEvent) {
    this.isLoading = true;
    this.currentPage = pageData.pageIndex + 1;
    this.usersPerPage = pageData.pageSize;
    this.usersService.getUsers(this.usersPerPage, this.currentPage);
  }

  onDelete(userId: string) {
    this.isLoading = true;
    this.usersService.deleteUser(userId).subscribe(() => {
      this.usersService.getUsers(this.usersPerPage, this.currentPage);
    }), () => {
      this.isLoading = false;
    };
  }

  ngOnDestroy() {
    this.usersSub.unsubscribe();
  }
}
