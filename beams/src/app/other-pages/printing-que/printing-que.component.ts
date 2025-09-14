import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { DirectionService } from '../../direction.service';

import { AuthService } from "src/app/auth/auth.service";
import { UsersService } from 'src/app/super-management/user/users.service';

import { Router, ActivatedRoute } from "@angular/router";
import { DialogService } from 'src/app/dialog/dialog.service';

import { BranchesService } from 'src/app/super-management/branch/branches.service';

import { DataSharingService } from 'src/app/main-section/data-shering-service/data-sharing.service';

import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: "app-printing-que",
  templateUrl: "./printing-que.component.html",
  styleUrls: ["./printing-que.component.css"],
  host: {
    class: 'fill-screen'
  }
})

export class PrintingQueComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;
  isLoading = false;

  userId: string;
  userIsAuthenticated = false;
  private authStatusSub: Subscription;

  branchUnique: string = '';
  branch: any;
  private branchUpdateSubscription: Subscription;

  private rolesSubscription: Subscription;
  roles: string[] = [];
  isSU: boolean = false;

  constructor(
    private authService: AuthService,
    private directionService: DirectionService,
    private usersService: UsersService,
    private router: Router,
    private dialogService: DialogService,
    private route: ActivatedRoute,
    private branchesService: BranchesService,
    private dataShearingService: DataSharingService,
    private _snackBar: MatSnackBar,
    private translate: TranslateService,
  ) { }

  async ngOnInit() {
    this.isLoading = true;

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.branchUnique = this.route.snapshot.paramMap.get('branch');

    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.userIsAuthenticated = isAuthenticated;
        this.userId = this.authService.getUserId();
      });

    this.rolesSubscription = this.authService.roles$.subscribe(roles => {
      this.roles = roles;
      if (this.roles.includes('su')) {
        this.isSU = true;
      } else {
        this.isSU = false;
      }
    });

    this.branchUpdateSubscription = interval(7000)
      .pipe(
        startWith(0),
        switchMap(() => this.branchesService.getBranchByUnique(this.branchUnique).toPromise())
      )
      .subscribe(
        branch => {
          this.branch = branch;
          this.isLoading = false;
        },
        error => {
          console.error('Error fetching and transforming branches:', error);
          throw error;
        }
      );
  }

  ngOnDestroy() {
    this.authStatusSub.unsubscribe();
    this.directionSubscription.unsubscribe();
    if (this.branchUpdateSubscription) {
      this.branchUpdateSubscription.unsubscribe();
    }
  }

  goToNewOrder() {
    this.authService.updateAuthData('plotter', this.branch.serial_name);
    this.dataShearingService.setPrintingService('plotter');
    this.dataShearingService.setBranch(this.branch.serial_name);
    this.router.navigate(["/print"]);
  }

  getUserNumOfOrders() {
    if (!this.branch) {
      return 0;
    }
    let totalOrders = 0;
    if (this.branch.printers[0]?.printerQueue && this.branch.printers[0].printerQueue.some(order => order.user._id === localStorage.getItem('userId'))) {
      totalOrders += 1;
    }
    if (this.branch.printers[0]?.queue && this.branch.printers[0].queue.some(order => order.user._id === localStorage.getItem('userId'))) {
      totalOrders += 1;
    }
    return totalOrders;
  }

  getOrderNumOfFiles(order: any) {
    let totalImages = 0;
    if (order && order.files) {
      order.files.forEach(file => {
        totalImages += 1;
      });
    }
    return totalImages;
  }

  getOrderTimeEstimation(branch: any, order: any, orderIndex: number, isInPrinter: boolean) {
    let totalOrdersListDurationInMinutes = 0;
    if (branch.printers[0]?.printerQueue && branch.printers[0]?.printerQueue.length > 0 && order?.totalOrderDurationInMinutes) {
      branch.printers[0]?.printerQueue.forEach((order, index) => {
        if (!isInPrinter || index < orderIndex) {
          totalOrdersListDurationInMinutes += order.totalOrderDurationInMinutes;
        }
      });
    }
    if ((branch.printers[0]?.queue && branch.printers[0]?.queue.length > 0 && order?.totalOrderDurationInMinutes) && !isInPrinter) {
      branch.printers[0]?.queue.forEach((order, index) => {
        if (index < orderIndex) {
          totalOrdersListDurationInMinutes += order.totalOrderDurationInMinutes;
        }
      });
    }
    return Math.ceil(totalOrdersListDurationInMinutes);
  }

  getTotalTimeEstimation(branch: any) {
    let totalBranchDurationInMinutes = 0;
    if (branch.printers[0]?.printerQueue && branch.printers[0]?.printerQueue.length > 0) {
      branch.printers[0]?.printerQueue.forEach((order, index) => {
        totalBranchDurationInMinutes += order.totalOrderDurationInMinutes;
      });
    }
    if (branch.printers[0]?.queue && branch.printers[0]?.queue.length > 0) {
      branch.printers[0]?.queue.forEach(order => {
        totalBranchDurationInMinutes += order.totalOrderDurationInMinutes;
      });
    }
    return Math.ceil(totalBranchDurationInMinutes);
  }

  getTotalNumOfOrders(branch: any) {
    let totalOrders = 0;
    if (branch.printers[0]?.printerQueue && branch.printers[0]?.printerQueue.length > 0) {
      totalOrders = branch.printers[0]?.printerQueue.length;
    }
    if (branch.printers[0]?.queue && branch.printers[0]?.queue.length > 0) {
      totalOrders += branch.printers[0]?.queue.length;
    }
    return totalOrders;
  }

  getUserNextOrderTimeEstimation() {
    if (!this.branch) {
      return false;
    }
    let nextOrder;
    if (this.branch.printers[0]?.printerQueue) {
      let index;
      nextOrder = this.branch.printers[0].printerQueue.find((order, i) => {
        if (order.user._id === localStorage.getItem('userId')) {
          index = i;
          return true;
        }
        return false;
      });
      if (nextOrder) {
        return this.getOrderTimeEstimation(this.branch, nextOrder, index, true);
      }
    }
    if (this.branch.printers[0]?.queue) {
      let index;
      nextOrder = this.branch.printers[0].queue.find((order, i) => {
        if (order.user._id === localStorage.getItem('userId')) {
          index = i;
          return true;
        }
        return false;
      });
      if (nextOrder) {
        return this.getOrderTimeEstimation(this.branch, nextOrder, index, false);
      }
    }
    return false;
  }

  cancelOrder(order: any) {
    // DOR NEW TASK!
    console.log('DOR NEW TASK! | CANCEL ORDER FROM QUEUE!');
    console.log('DOR (1) | plz cancel from queue the following order:', order);
    console.log('DOR (2) | and then, if successful (or not) - do the action in the following setTimeOut:');
    setTimeout(() => {
      const isSuccess = true;
      if (isSuccess) {
        this._snackBar.open(this.translate.instant('su-management.release-queue.success'), '', {
          duration: 5000,
          verticalPosition: 'top'
        });
      } else {
        this._snackBar.open(this.translate.instant('su-management.release-queue.failure'), '', {
          duration: 5000,
          verticalPosition: 'top'
        });
      }
    }, 2000);
  }

  // ========================
}
