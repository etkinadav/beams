import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subscription } from 'rxjs';
import { DirectionService } from '../../direction.service';

import { AuthService } from "src/app/auth/auth.service";
import { UsersService } from 'src/app/super-management/user/users.service';

import { Router } from "@angular/router";
import { DialogService } from 'src/app/dialog/dialog.service';


@Component({
  selector: "app-order-list",
  templateUrl: "./my-profile.component.html",
  styleUrls: ["./my-profile.component.css"],
  host: {
    class: 'fill-screen'
  }
})

export class NewThingComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;
  isLoading = false;

  userId: string;
  userIsAuthenticated = false;
  private authStatusSub: Subscription;

  constructor(
    private authService: AuthService,
    private directionService: DirectionService,
    private usersService: UsersService,
    private router: Router,
    private dialogService: DialogService,
  ) { }

  ngOnInit() {
    this.isLoading = true;

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.userIsAuthenticated = isAuthenticated;
        this.userId = this.authService.getUserId();
      });

    this.isLoading = false;
  }

  ngOnDestroy() {
    this.authStatusSub.unsubscribe();
    this.directionSubscription.unsubscribe();
  }
}
