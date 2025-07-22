import { Component, OnInit, OnDestroy, ViewChild, ViewChildren, ElementRef, AfterViewInit, ChangeDetectorRef } from "@angular/core";
import { Subscription, combineLatest } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DirectionService } from '../../direction.service';

import { AuthService } from "src/app/auth/auth.service";
import { UsersService } from 'src/app/super-management/user/users.service';

import { Router, ActivatedRoute } from "@angular/router";
import { DialogService } from 'src/app/dialog/dialog.service';
import { BranchesService } from "../branch/branches.service";
import { OrdersService } from "../../other-pages/my-orders/orders-service";

import { DataSharingService } from "src/app/main-section/data-shering-service/data-sharing.service";
import { MatTabChangeEvent, MatTabGroup } from '@angular/material/tabs';
import * as _ from 'lodash';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MatExpansionPanel } from '@angular/material/expansion';
import { PageEvent } from "@angular/material/paginator";
import { TranslateService } from '@ngx-translate/core';
import * as e from "express";

@Component({
  selector: "app-printer",
  templateUrl: "./printer.component.html",
  styleUrls: ["./printer.component.css"],
  host: {
    class: 'fill-screen'
  }
})

export class PrinterComponent implements OnInit, OnDestroy, AfterViewInit {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;
  isLoading = false;

  userId: string;
  userIsAuthenticated = false;
  private authStatusSub: Subscription;

  printingService: string;
  branchId: string;
  branch: any = {};
  subPage: string = 'printer';

  isLoadingOpenOrCloseQueue: boolean = false;
  isLoadingOpenOrCloseSlack: boolean = false;
  isLoadingReleaseQueue: boolean = false;
  isLoadingRestartServer: boolean = false;

  private branchIntervalId: any;

  private rolesSubscription: Subscription;
  roles: string[] = [];
  isSU: boolean = false;

  isBigSizeScreen: boolean = false;

  lastUpdated: Date;
  rangeOfUpdating: number = 30000;

  // orders
  orders: any[] = [];
  isLoadOrders: boolean = true;
  private ordersSub: Subscription;
  totalOrders = 0;
  ordersPerPage = 10;
  currentPageOrders = 1;
  pageSizeOptions = [5, 10, 20, 30, 50];
  private ordersIntervalId: any;
  plotterImageErrors: boolean[] = [];
  expressImageErrors1: boolean[] = [];
  expressImageErrors2: boolean[] = [];
  @ViewChild(MatTabGroup, { static: false }) tabGroupOrders: MatTabGroup;
  @ViewChildren(MatExpansionPanel) expansionPanelsOrders;
  @ViewChild('scrollContainerOrders') scrollContainerOrders: ElementRef;
  expandedPanelIdOrders: string | number;
  isAllImagesShowen: Boolean = false;

  // users
  users: any[] = [];
  isLoadUsers: boolean = false;
  private usersSub: Subscription;
  totalUsers = 0;
  usersPerPage = 10;
  currentPageUsers = 1;
  private usersIntervalId: any;
  @ViewChild(MatTabGroup, { static: false }) tabGroupUsers: MatTabGroup;
  @ViewChildren(MatExpansionPanel) expansionPanelsUsers;
  @ViewChild('scrollContainerUsers') scrollContainerUsers: ElementRef;
  expandedPanelIdUsers: string | number;
  userSearchText: string = '';
  usersSearchPlaceholder: string = '';
  private translateSub: Subscription;
  private usersUpdatedSubscription: Subscription;

  // Inventory
  currentInventory: any = {};
  isInventoryUpdating: boolean = false;
  isLoadingInventory: boolean = false;

  // permissions
  isLoadingPermitions: boolean = false;
  isReplacingBmMode: boolean = false;

  // report
  isLoadReport: boolean = false;
  private reportSub: Subscription;
  reportData: any = { totalCost: 0 };
  private reportIntervalId: any;
  reportMonth: number;
  reportYear: number;
  vat: number = 0.17;

  constructor(
    private authService: AuthService,
    private directionService: DirectionService,
    private usersService: UsersService,
    private router: Router,
    private route: ActivatedRoute,
    private dialogService: DialogService,
    private branchesService: BranchesService,
    private dataSharingService: DataSharingService,
    private ordersService: OrdersService,
    private cd: ChangeDetectorRef,
    private _snackBar: MatSnackBar,
    private translate: TranslateService,
  ) {
    this.setSearchPlaceholder();
  }

  ngOnInit() {
    this.isLoading = true;
    this.isLoadOrders = true;

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.translateSub = this.translate.onLangChange.subscribe(() => {
      this.setSearchPlaceholder();
    });

    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.userIsAuthenticated = isAuthenticated;
      });

    this.userId = this.authService.getUserId();

    this.rolesSubscription = this.authService.roles$.subscribe(roles => {
      this.roles = roles;
      console.log('this.roles:', this.roles);
      if (this.roles.includes('su')) {
        this.isSU = true;
      } else {
        this.isSU = false;
      }
      this.cd.detectChanges();
    });

    this.route.params.subscribe(params => {
      this.printingService = params['service'];
      this.branchId = params['branch'];
    });

    this.usersUpdatedSubscription = this.usersService.usersUpdated$.subscribe(() => {
      this.usersService.getUsersForManager(this.ordersPerPage, this.currentPageUsers, this.userSearchText);
    });

    combineLatest([this.route.params, this.route.queryParams]).subscribe(([params, queryParams]) => {
      this.printingService = params['service'];
      this.branchId = params['branch'];
      this.subPage = queryParams['q'];

      if (this.printingService === 'plotter' || this.printingService === 'express') {

        //  ======================== printer ========================
        // get printer 1st time
        this.updatePrinter();
        // update printer interval
        this.branchIntervalId = setInterval(() => {
          this.updatePrinter();
        }, 7000);
        //  // ======================== printer ========================

        // ======================== orders ========================
        if (this.subPage === 'orders') {
          this.isLoadOrders = true;
          this.ordersService.getOrdersForManager(this.printingService, this.branchId, this.ordersPerPage, this.currentPageOrders);
          this.ordersSub = this.ordersService
            .getOrderUpdateListener()
            .subscribe((orderData: { orders: any[], orderCount: number }) => {
              let oldOrders = this.orders;
              let newOrders = orderData.orders;
              if (oldOrders?.length > 0) {
                oldOrders = oldOrders.map(order => _.omit(order, ['userID', 'printerID', 'branchID']));
              }
              if (newOrders?.length > 0) {
                newOrders = newOrders.map(order => _.omit(order, ['userID', 'printerID', 'branchID']));
              }
              const isEqual = _.isEqual(oldOrders, newOrders);
              if (!isEqual || this.isLoadOrders) {
                this.totalOrders = orderData.orderCount;
                this.orders = orderData.orders;
                this.plotterImageErrors = this.orders.map(order =>
                  order.files.map(file =>
                    new Array(file.images.length).fill(false)
                  )
                );
                this.expressImageErrors1 = this.orders.map(order =>
                  order.files.map(file =>
                    new Array(file.images.length).fill(false)
                  )
                );
                this.expressImageErrors2 = this.orders.map(order =>
                  order.files.map(file =>
                    new Array(file.images.length).fill(false)
                  )
                );
                this.isAllImagesShowen = false;
              }
              this.isLoadOrders = false;
              this.isLoading = false;
            });
          // get orders [interval]
          this.ordersIntervalId = setInterval(() => {
            this.ordersService.getOrdersForManager(this.printingService, this.branchId, this.ordersPerPage, this.currentPageOrders);
          }, 10000);
        } else {
          // else: clear orders interval
          if (this.ordersIntervalId) {
            clearInterval(this.ordersIntervalId);
          }
        }
        // // ======================== orders ========================

        // ======================== users ========================
        if (this.subPage === 'users' || this.subPage === 'branch') {
          this.isLoadUsers = true;
          this.usersService.getUsersForManager(this.ordersPerPage, this.currentPageUsers, this.userSearchText);
          this.usersSub = this.usersService
            .getUserUpdateListener()
            .subscribe((userData: { users: any[], userCount: number }) => {
              let oldUsers = this.users;
              let newUsers = userData.users;
              const isEqual = _.isEqual(oldUsers, newUsers);
              if (!isEqual || this.isLoadUsers) {
                this.totalUsers = userData.userCount;
                this.users = userData.users;
                this.expandedPanelIdUsers = null;
              }
              this.isLoadUsers = false;
              this.isLoading = false;
            });
          // get users [interval]
          this.usersIntervalId = setInterval(() => {
            this.usersService.getUsersForManager(this.ordersPerPage, this.currentPageUsers, this.userSearchText);
          }, 10000);
        } else {
          // Clear the interval if not on the 'users' subPage
          if (this.usersIntervalId) {
            clearInterval(this.usersIntervalId);
          }
        }
        // // ======================== users ========================

        // ======================== report ========================
        if (this.subPage === 'report') {
          this.isLoadReport = true;
          const now = new Date();
          this.reportMonth = now.getMonth() + 1;
          this.reportYear = now.getFullYear();
          this.fetchReportData();
          // get report [interval]
          this.reportIntervalId = setInterval(() => {
            this.fetchReportData();
          }, 60000);
        } else {
          // Clear the interval if not on the 'report' subPage
          if (this.reportIntervalId) {
            clearInterval(this.reportIntervalId);
          }
        }
        // // ======================== report ========================

      } else {
        this.router.navigate(['/print']);
      }
    });
  }

  ngAfterViewInit() {
    this.route.queryParams.subscribe(params => {
      const q = params['q'];
      const tabIndex = this.getTabIndex(q);

      const ordersIntervalId = setInterval(() => {
        if (this.tabGroupOrders) {
          this.tabGroupOrders.selectedIndex = tabIndex;
          clearInterval(ordersIntervalId);
        }
      }, 100);

      const usersIntervalId = setInterval(() => {
        if (this.tabGroupUsers) {
          this.tabGroupUsers.selectedIndex = tabIndex;
          clearInterval(usersIntervalId);
        }
      }, 100);
    });
  }

  ngOnDestroy() {
    if (this.branchIntervalId) {
      clearInterval(this.branchIntervalId);
    }
    this.authStatusSub.unsubscribe();
    this.directionSubscription.unsubscribe();
    // orders
    if (this.ordersIntervalId) {
      clearInterval(this.ordersIntervalId);
    }
    if (this.subPage === 'orders' && this.ordersSub) {
      this.ordersSub.unsubscribe();
    }
    // users
    if (this.usersIntervalId) {
      clearInterval(this.usersIntervalId);
    }
    if (this.subPage === 'users') {
      this.usersSub.unsubscribe();
    }
    if (this.usersUpdatedSubscription) {
      this.usersUpdatedSubscription.unsubscribe();
    }
    if (this.reportIntervalId) {
      clearInterval(this.reportIntervalId);
    }
    if (this.reportSub) {
      this.reportSub.unsubscribe();
    }
  }

  private updatePrinter() {
    this.branchesService.getBranchById(this.printingService, this.branchId).subscribe(
      branch => {
        if (branch) {
          this.branch = branch;
          this.lastUpdated = new Date();
          if (!this.isInventoryUpdating && this.branch?.stockCurrent) {
            this.currentInventory = JSON.parse(JSON.stringify(this.branch.stockCurrent));
          }
          this.isLoading = false;
          this.isLoadingPermitions = false;
        }
      },
      error => {
        console.error('Error fetching branch:', error);
      }
    );
  }

  private setSearchPlaceholder() {
    this.translate.get('su-management.users.search-users').subscribe((res: string) => {
      this.usersSearchPlaceholder = res;
    });
  }

  onTabChange(event: MatTabChangeEvent) {
    const page = event.tab.textLabel;
    this.expandedPanelIdUsers = null;
    this.expandedPanelIdOrders = null;
    this.isReplacingBmMode = false;
    this.userSearchText = '';
    const url = "/printer/" + this.printingService + "/" + this.branchId;
    this.isInventoryUpdating = false;
    this.router.navigate([url], { queryParams: { q: page } });
  }

  getTabIndex(queryParam: string): number {
    switch (queryParam) {
      case 'print':
        return 0;
      case 'orders':
        return 1;
      case 'users':
        return 2;
      case 'inventory':
        return 3;
      case 'branch':
        return 4;
      case 'report':
        return 5;
      default:
        return 0; // default tab index if queryParam doesn't match any case
    }
  }

  isManiger() {
    if (this.roles && this.roles.includes('su') ||
      (this.roles && this.roles.includes('bm') &&
        (this.printingService === 'plotter' && this.branch?.bm?._id === this.userId) ||
        (this.printingService === 'express' && this.branch?.bm?._id === this.userId))) {
      return true;
    }
    return false;
  }

  goToNewOrder() {
    this.authService.updateAuthData(this.printingService, this.branch.serial_name);
    this.dataSharingService.setPrintingService(this.printingService);
    this.dataSharingService.setBranch(this.branch.serial_name);
    this.router.navigate(["/print"]);
  }

  goToPrintingQueue() {
    const branchUnique = this.branch.unique ? this.branch.unique : '';
    this.router.navigate(['/queue/' + branchUnique]);
  }

  printingCode(printerNum: number, randomDigits: number) {
    let code = "00000";
    if (printerNum && randomDigits) {
      code =
        printerNum.toString().charAt(0) +
        randomDigits.toString().charAt(0) +
        printerNum.toString().charAt(1) +
        randomDigits.toString().charAt(1) +
        printerNum.toString().charAt(2);
    }
    return code;
  }

  isVeryUpdated() {
    const now = new Date();
    if (this.lastUpdated) {
      const diff = Math.abs(now.getTime() - this.lastUpdated.getTime());
      return diff < this.rangeOfUpdating;
    }
    return false;
  }






















  // PRINTER -------- PRINTER -------- PRINTER -------- PRINTER -------- PRINTER -------- PRINTER -------- PRINTER -------- PRINTER

  getPrinterStatus() {
    let printerStatus = 'Error';
    if (this.printingService === 'plotter') {
      if (this.branch?.printers && this.branch?.printers[0]?.status) {
        printerStatus = this.branch.printers[0].status;
      }
    } else if (this.printingService === 'express') {
      if (this.branch?.status?.status) {
        printerStatus = this.branch.status.status;
      }
    }
    return printerStatus;
  }

  getPrinterErrorsArray() {
    let printerStatusErrors = [];
    if (this.printingService === 'plotter') {
      if (this.branch.printers && this.branch.printers[0]?.status_details) {
        printerStatusErrors = this.branch.printers[0].status_details.filter((error) => {
          return error !== "1500";
        });
      }
    } else if (this.printingService === 'express') {
      if (this.branch.status?.err_reasons) {
        printerStatusErrors = this.branch.status.err_reasons;
      }
    }
    return printerStatusErrors;
  }

  // Last Online At

  getLastOnlineAtDate() {
    let lastOnlineAt = 'Error';
    if (this.printingService === 'plotter') {
      if (this.branch.printers && this.branch.printers[0]?.lastOnlineAt) {
        const date = new Date(this.branch.printers[0].lastOnlineAt);
        lastOnlineAt = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
      }
    } else if (this.printingService === 'express') {
      if (this.branch.status?.lastOnlineAt) {
        const date = new Date(this.branch.status.lastOnlineAt);
        lastOnlineAt = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
      }
    }
    return lastOnlineAt;
  }

  getLastOnlineAtTime() {
    let lastOnlineAt = 'Error';
    if (this.printingService === 'plotter') {
      if (this.branch.printers && this.branch.printers[0]?.lastOnlineAt) {
        const date = new Date(this.branch.printers[0].lastOnlineAt);
        lastOnlineAt = `${date.getHours()}:${date.getMinutes()}`;
      }
    } else if (this.printingService === 'express') {
      if (this.branch.status?.lastOnlineAt) {
        const date = new Date(this.branch.status.lastOnlineAt);
        lastOnlineAt = `${date.getHours()}:${date.getMinutes()}`;
      }
    }
    return lastOnlineAt;
  }

  getIsLastOnlineIsVeryUpdated() {
    let isVeryUpdated = false;
    if (this.printingService === 'plotter') {
      if (this.branch.printers && this.branch.printers[0]?.lastOnlineAt) {
        let date = new Date(this.branch.printers[0].lastOnlineAt);
        let now = new Date();
        let diff = now.getTime() - date.getTime();
        let diffInMinutes = Math.round(diff / 60000);
        if (diffInMinutes < 5) {
          isVeryUpdated = true;
        } else {
          isVeryUpdated = false;
        }
      }
    } else if (this.printingService === 'express') {
      if (this.branch.status?.lastOnlineAt) {
        let date = new Date(this.branch.status.lastOnlineAt);
        let now = new Date();
        let diff = now.getTime() - date.getTime();
        let diffInMinutes = Math.round(diff / 60000);
        if (diffInMinutes < 5) {
          isVeryUpdated = true;
        } else {
          isVeryUpdated = false;
        }
      }
    }
    return isVeryUpdated;
  }

  // Last Printed At

  getLastPrintedAtDate() {
    let lastPrinterAt = 'Error';
    if (this.printingService === 'plotter') {
      if (this.branch.printers && this.branch.printers[0]?.lastPrintedAt) {
        const date = new Date(this.branch.printers[0].lastPrintedAt);
        lastPrinterAt = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
      }
    } else if (this.printingService === 'express') {
      if (this.branch.status?.lastPrintedAt) {
        const date = new Date(this.branch.status.lastPrintedAt);
        lastPrinterAt = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
      }
    }
    return lastPrinterAt;
  }

  getLastPrintedAtTime() {
    let lastPrinterAt = 'Error';
    if (this.printingService === 'plotter') {
      if (this.branch.printers && this.branch.printers[0]?.lastPrintedAt) {
        const date = new Date(this.branch.printers[0].lastPrintedAt);
        lastPrinterAt = `${date.getHours()}:${date.getMinutes()}`;
      }
    } else if (this.printingService === 'express') {
      if (this.branch.status?.lastPrintedAt) {
        const date = new Date(this.branch.status.lastPrintedAt);
        lastPrinterAt = `${date.getHours()}:${date.getMinutes()}`;
      }
    }
    return lastPrinterAt;
  }

  // QUEUE

  getIsQueueEmpty() {
    let isQueueEmpty = false;
    if (this.printingService === 'plotter') {
      if (this.branch.printers && (this.branch.printers[0]?.printerQueue && this.branch.printers[0]?.printerQueue.length > 0) ||
        (this.branch.printers && this.branch.printers[0]?.queue && this.branch.printers[0]?.queue.length > 0)) {
        isQueueEmpty = true;
      }
    } else if (this.printingService === 'express') {
      if (this.branch.queue?.printerQueue && this.branch.queue?.printerQueue.length > 0) {
        isQueueEmpty = true;
      }
    }
    return isQueueEmpty;
  }

  // [plotter]
  getQueueLength() {
    let numOfOrders = 0;
    if (this.printingService === 'plotter') {
      if (this.branch.printers[0].queue.length > 0) {
        numOfOrders = numOfOrders + this.branch.printers[0].queue.length;
      }
      if (this.branch.printers[0].printerQueue.length > 0) {
        numOfOrders = numOfOrders + this.branch.printers[0].printerQueue.length;
      }
    }
    return numOfOrders;
  }

  // [plotter]
  getQueueAmountOfFiles() {
    let totalAmountOfFiles = 0;
    if (this.printingService === 'plotter') {
      if (this.branch.printers[0].queue.length > 0) {
        for (let order of this.branch.printers[0].queue) {
          if (order.files.length > 0) {
            totalAmountOfFiles = totalAmountOfFiles + order.files.length;
          }
        }
      }
      if (this.branch.printers[0].printerQueue.length > 0) {
        for (let order of this.branch.printers[0].printerQueue) {
          if (order.files.length > 0) {
            totalAmountOfFiles = totalAmountOfFiles + order.files.length;
          }
        }
      }
    }
    return totalAmountOfFiles;
  }

  // [plotter]
  getQueueAmountOfMinutes() {
    let totalAmountOfMinutes = 0;
    if (this.printingService === 'plotter') {
      if (this.branch.printers[0].queue.length > 0) {
        for (let order of this.branch.printers[0].queue) {
          if (order.totalOrderDurationInMinutes && order.totalOrderDurationInMinutes > 0) {
            totalAmountOfMinutes = totalAmountOfMinutes + order.totalOrderDurationInMinutes;
          }
        }
      }
      if (this.branch.printers[0].printerQueue.length > 0) {
        for (let order of this.branch.printers[0].printerQueue) {
          if (order.totalOrderDurationInMinutes && order.totalOrderDurationInMinutes > 0) {
            totalAmountOfMinutes = totalAmountOfMinutes + order.totalOrderDurationInMinutes;
          }
        }
      }
    }
    return Math.round(totalAmountOfMinutes * 100) / 100;
  }

  // [express]
  getQueueCurrentUser() {
    let userName = '';
    if (this.printingService === 'express') {
      if (this.branch.queue?.printerQueue && this.branch.queue.printerQueue.length > 0) {
        userName = this.branch.queue.printerQueue[0].user;
      }
    }
    return userName;
  }

  // [express]
  getQueueCurrentOrderAmountOfFiles() {
    let totalAmounyOfOrders = 0;
    if (this.printingService === 'express') {
      if (this.branch.queue?.printerQueue && this.branch.queue.printerQueue.length > 0) {
        totalAmounyOfOrders = this.branch.queue.printerQueue.length;
      }
    }
    return totalAmounyOfOrders;
  }

  // [express]
  getQueueCurrentOrderAmountOfPages() {
    let totalAmounyOfOrders = 0;
    if (this.printingService === 'express') {
      if (this.branch.queue?.printerQueue && this.branch.queue.printerQueue.length > 0) {
        for (let order of this.branch.queue.printerQueue) {
          if (order.files.length > 0) {
            for (let file of order.files) {
              let copies = 1;
              if (file.printSettings.numOfCopies) {
                copies = file.printSettings.numOfCopies;
              }
              totalAmounyOfOrders = totalAmounyOfOrders + (file.images.length * copies);
            }
          }
        }
        totalAmounyOfOrders = this.branch.queue.printerQueue.length;
      }
    }
    return totalAmounyOfOrders;
  }

  // QUEUE ======================================= QUEUE

  // [plotter]
  getIsQueueStopped() {
    let isQueueStopped = false;
    if (!this.isLoading) {
      if (this.printingService === 'plotter') {
        if (this.branch.printers && this.branch.printers[0]?.queueStatus && this.branch.printers[0].queueStatus === 'manual') {
          isQueueStopped = true;
        }
      }
    }
    return isQueueStopped;
  }

  // [plotter]
  openOrCloseQueue() {
    if (!this.isLoading) {
      if (this.printingService === 'plotter') {
        if (this.branch.printers && this.branch.printers[0]?.queueStatus && this.branch.printers[0].queueStatus === 'manual') {
          this.openQueue();
        } else {
          this.closeQueue();
        }
      }
    }
  }

  openQueue() {
    this.isLoadingOpenOrCloseQueue = true;
    this.branchesService.onOpenOrCloseQueue(this.branchId, true).subscribe(
      (response: any) => {
        if (response.printer) {
          let newBranch = this.branch;
          newBranch.printers[0] = response.printer;
          this.branch = newBranch;
        }
        this.isLoadingOpenOrCloseQueue = false;
      },
      error => {
        console.error('Error closing queue:', error);
      }
    );
  }

  closeQueue() {
    this.isLoadingOpenOrCloseQueue = true;
    this.branchesService.onOpenOrCloseQueue(this.branchId, false).subscribe(
      (response: any) => {
        if (response.printer) {
          let newBranch = this.branch;
          newBranch.printers[0] = response.printer;
          this.branch = newBranch;
        }
        this.isLoadingOpenOrCloseQueue = false;
      },
      error => {
        console.error('Error closing queue:', error);
      }
    );
  }

  // SLACK ======================================= SLACK

  // [plotter]
  getisSlackOn() {
    let isSlackOn = false;
    if (!this.isLoading) {
      if (this.printingService === 'plotter') {
        if (this.branch.inform_slack_of_new_orders) {
          isSlackOn = true;
        }
      }
    }
    return isSlackOn;
  }

  // [plotter]
  openOrCloseSlack() {
    if (!this.isLoading) {
      if (this.printingService === 'plotter') {
        if (this.branch.inform_slack_of_new_orders) {
          this.openSlack();
        } else {
          this.closeSlack();
        }
      }
    }
  }

  openSlack() {
    this.isLoadingOpenOrCloseSlack = true;
    this.branchesService.onOpenOrCloseSlack(this.branchId, true).subscribe(
      (response: any) => {
        if (response.branch) {
          this.branch = response.branch;
        }
        this.isLoadingOpenOrCloseSlack = false;
      },
      error => {
        console.error('Error closing Slack:', error);
      }
    );
  }

  closeSlack() {
    this.isLoadingOpenOrCloseSlack = true;
    this.branchesService.onOpenOrCloseSlack(this.branchId, false).subscribe(
      (response: any) => {
        if (response.branch) {
          this.branch = response.branch;
        }
        this.isLoadingOpenOrCloseSlack = false;
      },
      error => {
        console.error('Error closing Slack:', error);
      }
    );
  }

  releaseQueue() {
    this.isLoadingReleaseQueue = true;
    // DOR NEW TASK!
    console.log('DOR NEW TASK! | RELEASE PRINTER QUEUE ON EXPRESS!');
    console.log('DOR (1) | plz release printer queue for express printer:', this.branch);
    console.log('DOR (2) | and then do the action in the following setTimeOut:');
    setTimeout(() => {
      this.isLoadingReleaseQueue = false;
      this._snackBar.open(this.translate.instant('su-management.release-queue.success'), '', {
        duration: 5000,
        verticalPosition: 'top'
      });
    }, 2000);
  }

  restartServer() {
    this.isLoadingRestartServer = true;
    // DOR NEW TASK!
    console.log('DOR NEW TASK! | RESTART SERVER!');
    console.log('DOR (1) | plz restart the server for express printer:', this.branch);
    console.log('DOR (2) | and then do the action in the following setTimeOut:');
    setTimeout(() => {
      this.isLoadingRestartServer = false;
      this._snackBar.open(this.translate.instant('su-management.restart-server.success'), '', {
        duration: 5000,
        verticalPosition: 'top'
      });
    }, 2000);
  }

  getPrinterModel() {
    let printerModel = '';
    if (this.printingService === 'plotter') {
      if (this.branch.printers && this.branch.printers[0]?.model) {
        printerModel = this.branch.printers[0].model;
      }
    } else if (this.printingService === 'express') {
      if (this.branch.properties?.model) {
        printerModel = this.branch.properties.model;
      }
    }
    return printerModel;
  }

  // GENETAL

  roundDownTowDecimal(num: number) {
    return Math.floor(num * 100) / 10000;
  }

  roundDownFourDecimal(num: number) {
    return Math.floor(num / 10) / 10000;
  }

  roundDownTowDecimalCeil(num: number): number {
    return Math.ceil(num * 100) / 100;
  }

  // PAPERS AND INK (consumables)

  getConsumables(type: string) {
    let consumables = [];
    if (type === 'paper') {
      if (this.printingService === 'plotter') {
        if (this.branch.printers && this.branch?.printers[0]?.inputBins && this.branch.printers[0].inputBins.length > 0) {
          consumables.push(...this.branch.printers[0].inputBins);
        } else {
          return consumables;
        }
      } else if (this.printingService === 'express') {
        if (this.branch?.consumables?.papers && this.branch.consumables.papers.length > 0) {
          consumables.push(...this.branch.consumables.papers);
        } else {
          return consumables;
        }
      }
    } else if (type === 'ink') {
      if (this.printingService === 'plotter') {
        if (this.branch.printers && this.branch?.printers[0]?.inkStatus && this.branch.printers[0].inkStatus.length > 0) {
          consumables.push(...this.branch.printers[0].inkStatus);
        } else {
          return consumables;
        }
      } else if (this.printingService === 'express') {
        if (this.branch?.consumables?.ink && this.branch.consumables.ink.length > 0) {
          consumables.push(...this.branch.consumables.ink);
        } else {
          return consumables;
        }
      }
    }
    return consumables;
  }

  getPaperStatus(paper: any) {
    let isPaperDetected = false;
    if (this.printingService === 'plotter') {
      if (paper.status?.detection) {
        isPaperDetected = true;
      }
    } else if (this.printingService === 'express') {
      if (paper.available) {
        return true
      }
    }
    return isPaperDetected;
  }

  getPhisicalInputBinNumber(paper: any) {
    let phisicalInputBinNumber = '';
    if (this.printingService === 'plotter') {
      if (paper.physicalInputBin) {
        phisicalInputBinNumber = "su-management.phisical-input-bin." + paper.physicalInputBin;
      }
    } else if (this.printingService === 'express') {
      if (paper.bin) {
        phisicalInputBinNumber = "su-management.phisical-input-bin." + paper.bin;
      }
    }
    return phisicalInputBinNumber;
  }

  getIsConsumableNeedsToReplase(type: string, consumable: any) {
    let isConsumableNeedsToReplase;
    if (type === 'paper') {
      if (this.printingService === 'plotter') {
        isConsumableNeedsToReplase = false;
        if (consumable.status?.enableReplace) {
          isConsumableNeedsToReplase = true;
        }
      }
    } else if (type === 'ink') {
      if (this.printingService === 'plotter') {
        isConsumableNeedsToReplase = 0;
        if (!consumable.level || consumable.level === 0) {
          isConsumableNeedsToReplase = 1;
        }
        if (consumable.icon && consumable.icon === "error") {
          isConsumableNeedsToReplase = 2;
        }
      }
    }
    return isConsumableNeedsToReplase;
  }

  getCurrentStock(type: string, consumable: any) {
    let stockCurrent = 0;
    if (type === 'paper') {
      if (this.printingService === 'plotter') {
        if (this.branch.stockCurrent?.paper && consumable.paperType?.paperType) {
          let paperType = consumable.paperType.paperType;
          stockCurrent = this.branch.stockCurrent.paper[paperType];
        }
      }
    } else if (type === 'ink') {
      if (this.printingService === 'plotter') {
        if (this.branch.stockCurrent?.ink && consumable.color) {
          let inkType = consumable.color;
          stockCurrent = this.branch.stockCurrent.ink[inkType];
        }
      }
    } else if (type === 'wastetanck' && this.printingService === 'plotter') {
      if (this.branch.stockCurrent.ink.waste) {
        stockCurrent = this.branch.stockCurrent.ink.waste;
      }
    }
    return stockCurrent;
  }

  onReplaceConsumable(type: string, consumable: any) {
    this.isLoading = true;
    this.branchesService.onReplaceConsumable(
      this.printingService,
      this.branchId,
      type,
      consumable).subscribe(
        (response: any) => {
          if (response.branch) {
            this.branch = response.branch;
          }
          this.updatePrinter();
          const message1 = this.translate.instant('su-management.release-queue.success');
          const message2 = this.translate.instant('su-management.replace-consumble.success');
          const message = message1 + ' ' + '.' + message2;
          this._snackBar.open(message, '', {
            duration: 5000,
            verticalPosition: 'top'
          });
        },
        error => {
          console.error('Error replacing consumable:', error);
        }
      );
  }

  // EXPRESS FUNCTIONS
  getPaperProperties(property: string, paper: any) {
    let newPaper = {
      paperWidth: 0,
      paperHeight: 0,
      paperWeight: 0,
      serialName: ''
    }
    if (paper.serial_name === 'A4') {
      newPaper.paperWidth = 21;
      newPaper.paperHeight = 29.7;
      newPaper.paperWeight = 100;
    } else if (paper.serial_name === 'A3') {
      newPaper.paperWidth = 29.7;
      newPaper.paperHeight = 42;
      newPaper.paperWeight = 100;
    } else if (paper.serial_name === 'A4160') {
      newPaper.paperWidth = 21;
      newPaper.paperHeight = 29.7;
      newPaper.paperWeight = 160;
    } else if (paper.serial_name === 'A3160') {
      newPaper.paperWidth = 29.7;
      newPaper.paperHeight = 42;
      newPaper.paperWeight = 160;
    } else if (paper.serial_name === 'A4Recycled') {
      newPaper.paperWidth = 21;
      newPaper.paperHeight = 29.7;
      newPaper.paperWeight = 120;
    } else if (paper.serial_name === 'SM') {
      newPaper.paperWidth = 15.24;
      newPaper.paperHeight = 10.16;
      newPaper.paperWeight = 260;
    } else if (paper.serial_name === 'MD') {
      newPaper.paperWidth = 17.78;
      newPaper.paperHeight = 12.7;
      newPaper.paperWeight = 260;
    } else if (paper.serial_name === 'LG') {
      newPaper.paperWidth = 20.32;
      newPaper.paperHeight = 15.24;
      newPaper.paperWeight = 260;
    }
    if (property === 'width') {
      return newPaper.paperWidth;
    } else if (property === 'height') {
      return newPaper.paperHeight;
    } else if (property === 'weight') {
      return newPaper.paperWeight;
    }
    return 'error';
  }

  getScreenImageUrl() {
    let imageUrl = '';
    if (this.printingService === 'plotter') {
      if (this.branch.printers && this.branch.printers[0]?.ip) {
        imageUrl = "https://www.eazix.co.il/img.php?i=http://" + this.branch.printers[0].ip + ":5000/screen";
      }
    } else if (this.printingService === 'express') {
      if (this.branch.status?.image) {
        imageUrl = this.branch.status.image;
      }
    }
    return imageUrl;
  }

  toggleScreenImageSize() {
    this.isBigSizeScreen = !this.isBigSizeScreen;
  }

  getAnydesk() {
    let anydesk = '';
    if (this.printingService === 'plotter') {
      if (this.branch?.printers && this.branch?.printers[0]?.anydesk) {
        anydesk = this.branch.printers[0].anydesk;
      }
    } else if (this.printingService === 'express') {
      if (this.branch?.properties?.anydesk) {
        anydesk = this.branch.properties.anydesk;
      }
    }
    return 'anydesk://' + anydesk;
  }

  isBranchClose() {
    if (this.printingService === 'plotter') {
      return this.branch.close ? this.branch.close : false;
    } else if (this.printingService === 'express') {
      return this.branch.properties?.close ? this.branch.properties.close : false;
    } else {
      return false;
    }
  }

  // close branch
  openSuCloseBranchDialog() {
    let msg = "";
    if (this.printingService === 'plotter') {
      msg = this.branch.close_msg ? this.branch.close_msg : "";
    } else if (this.printingService === 'express') {
      msg = this.branch.properties?.close_msg ? this.branch.properties.close_msg : "";
    }
    console.log("openSuCloseBranchDialog", this.branch);
    this.dialogService.onOpenSuCloseBranchDialog(
      this.isBranchClose(),
      this.printingService,
      this.branch.serial_name,
      msg
    );
  }

  // // PRINTER -------- PRINTER -------- PRINTER -------- PRINTER -------- PRINTER -------- PRINTER -------- PRINTER -------- PRINTER





























  // ORDERS -------- ORDERS -------- ORDERS -------- ORDERS -------- ORDERS -------- ORDERS -------- ORDERS -------- ORDERS

  togglePanelOrders(order: any): void {
    // Find the index of the order that is being opened
    const index = this.orders.findIndex(o => o._id === order._id);

    // Get the panel and the container
    const panel = this.expansionPanelsOrders.toArray()[index];
    const container = this.scrollContainerOrders;

    // Ensure that both the panel and the container are defined
    if (panel && container && container.nativeElement) {
      // Expand or collapse the MatExpansionPanel
      if (this.expandedPanelIdOrders === order._id) {
        panel.close();
        this.expandedPanelIdOrders = null;
      } else {
        panel.open();
        this.expandedPanelIdOrders = order._id;

        // Listen for the afterExpand event of the MatExpansionPanel
        const subscription = panel.afterExpand.subscribe(() => {
          // Scroll the container down by 50px
          container.nativeElement.scrollBy({
            top: 5,
            behavior: 'smooth'
          });

          // Unsubscribe from the afterExpand event to avoid memory leaks
          subscription.unsubscribe();
        });
      }
    }
  }

  getPaperSerialNameOrders(paperCode: string, inputBins: any[]): string {
    if (!paperCode || !inputBins || inputBins.length === 0) {
      return null;
    }
    if (inputBins.find(paper => paper?.paperType?.paperPrinterCode === paperCode)?.paperType?.paperType) {
      const paperSerialName = inputBins.find(paper => paper.paperType.paperPrinterCode === paperCode).paperType.paperType;
      return paperSerialName;
    } else {
      return null;
    }
  }

  getPaperSerialNameOrdersExpress(paperType: string, papers: any[]): string {
    if (!paperType || !papers || papers.length === 0) {
      return null;
    }
    if (papers.find(paper => paper.paperName === paperType)) {
      const paper = papers.find(paper => paper.paperName === paperType);
      return paper.serial_name;
    } else {
      return null;
    }
  }

  async onChangedPageOrders(pageData: PageEvent) {
    this.isLoadOrders = true;
    this.currentPageOrders = pageData.pageIndex + 1;
    this.ordersPerPage = pageData.pageSize;
    const preSortedOrders = await this.ordersService.getOrdersForManager(this.printingService, this.branchId, this.ordersPerPage, this.currentPageOrders);
    this.sortAndSaveOrders(preSortedOrders);
  }

  async onSerchUsersOrders(userID: string) {
    console.log("onSerchUsersOrders", userID);
    const id = userID;
    localStorage.setItem('searchedService', this.printingService);
    localStorage.setItem('searchedBranchId', this.branchId);
    this.router.navigate([`/myorders/${id}`]);
  }

  sortAndSaveOrders(preSortedOrders) {
    this.orders = preSortedOrders;
    this.isLoadOrders = false;
  }

  isAllFilesHavePaperSet(order) {
    let isOrderAllFilesHavePaperSet = true;
    if (!order.branchID.is_express) {
      // [plotter]
      // console.log("---- plotter");
      for (let file of order.files) {
        for (let image of file.images) {
          let paperCode = image.printSettings.paperType;
          let paperExists = order.printerID.inputBins.find(paper => paper.paperType.paperPrinterCode === paperCode);
          // console.log("paperExists", paperExists)
          if (!paperExists) {
            isOrderAllFilesHavePaperSet = false;
            break;
          }
        }
        if (!isOrderAllFilesHavePaperSet) {
          break;
        }
      }
    } else {
      // [express]
      // console.log("---- express");
      for (let file of order.files) {
        let paperType = file.printSettings.paperType;
        if (order.printerID?.consumables?.papers) {
          let paperExists = order.printerID.consumables.papers.find(paper => paper.paperName === paperType);
          // console.log("paperExists", paperExists)
          if (!paperExists) {
            isOrderAllFilesHavePaperSet = false;
            break;
          }
        }
      }
    }
    // console.log("isOrderAllFilesHavePaperSet", isOrderAllFilesHavePaperSet)
    return isOrderAllFilesHavePaperSet;
  }

  showMoreImages() {
    this.isAllImagesShowen = true;
  }

  hideMoreImages() {
    this.isAllImagesShowen = false;
  }

  addSecondsToDate(sentDate: string, numOfFiles: number): Date {
    // Convert sentDate string to Date object
    let date = new Date(sentDate);
    // Convert numOfFiles to milliseconds (since 1 second = 1000 milliseconds)
    let additionalTime = numOfFiles * 25 * 1000;
    // Create a new Date object from sentDate
    let newDate = new Date(date.getTime());
    // Add the additional time to the new date
    newDate.setTime(newDate.getTime() + additionalTime);
    return newDate;
  }

  getExpressDimensions(direction: string, imageWidth: number, imageHeight: number, printSettings: any, branchPapers: any[], dpi: number) {
    let imageWidthInCm = imageWidth / dpi * 2.54;
    let imageHeightInCm = imageHeight / dpi * 2.54;
    let imageScaleFactor = 1;
    if (printSettings.fit) {
      let paperWidth = 0;
      let paperHeight = 0;

      // Get paper width
      if (branchPapers.find(paper => paper.paperName === printSettings.paperType)?.serial_name) {
        const paperCode = branchPapers.find(paper => paper.paperName === printSettings.paperType).serial_name;
        if (paperCode === 'A4') {
          paperWidth = 21;
          paperHeight = 29.7;
        } else if (paperCode === 'A3') {
          paperWidth = 29.7;
          paperHeight = 42;
        } else if (paperCode === 'A4160') {
          paperWidth = 21;
          paperHeight = 29.7;
        } else if (paperCode === 'A3160') {
          paperWidth = 29.7;
          paperHeight = 42;
        } else if (paperCode === 'A4Recycled') {
          paperWidth = 21;
          paperHeight = 29.7;
        } else if (paperCode === 'SM') {
          paperWidth = 10.16;
          paperHeight = 15.24;
        } else if (paperCode === 'MD') {
          paperWidth = 12.7;
          paperHeight = 17.78;
        } else if (paperCode === 'LG') {
          paperWidth = 15.24;
          paperHeight = 20.32;
        }
      }

      let factorIfNotRotater;
      let factorIfRotater;
      if (imageWidthInCm / paperWidth > imageHeightInCm / paperHeight) {
        factorIfNotRotater = imageWidthInCm / paperWidth;
        // console.log("factorIfNotRotater 01", factorIfNotRotater);
      } else {
        factorIfNotRotater = imageHeightInCm / paperHeight;
        // console.log("factorIfNotRotater 02", factorIfNotRotater);
      }
      if (imageWidthInCm / paperHeight > imageHeightInCm / paperWidth) {
        factorIfRotater = imageWidthInCm / paperHeight;
        // console.log("factorIfRotater 03", factorIfRotater);
      } else {
        factorIfRotater = imageHeightInCm / paperWidth;
        // console.log("factorIfRotater 04", factorIfRotater);
      }
      if (factorIfRotater < factorIfNotRotater) {
        imageScaleFactor = factorIfRotater;
      } else {
        imageScaleFactor = factorIfNotRotater;
      }
    }
    if (direction === 'h') {
      return this.roundDownTowDecimalCeil(imageHeightInCm / imageScaleFactor);
    } else if (direction === 'w') {
      return this.roundDownTowDecimalCeil(imageWidthInCm / imageScaleFactor);
    }
    return null;
  }

  copyOrderDetails(order: any): void {
    const details = `*EAZIX ORDER*: User: *${order.user}* ,Printer *${order.branchID.is_express ? 'express' : 'plotter'}*, *${order.branchID.is_express ? order.printerID.serial_name : order.branchID.serial_name}*, Status: *${order.status}*, Files: *${order.totalOrderLength}*, Created: *${order.created}*, Paid: Card: *${order.totalCost}* NIS + Eazix Points: *${order.pointsCost}*`;
    navigator.clipboard.writeText(details).then(() => {
      console.log('Order details copied to clipboard');
      this.translate.get('su-management.branches_copy-success-order').subscribe((res: string) => {
        this._snackBar.open(res, '', {
          duration: 1500,
          panelClass: ['auto-width', 'center-text'].filter(Boolean)
        });
      });
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  }

  resendOrder(order: any): void {
    // DOR NEW TASK!
    console.log('DOR NEW TASK! | RESEND ORDER TO PRINT!');
    console.log('DOR (1) | plz resend to print the following order:', order);
    console.log('DOR (2) | and then do the action in the following setTimeOut:');
    setTimeout(() => {
      this.isLoadingReleaseQueue = false;
      this._snackBar.open(this.translate.instant('su-management.resend-order.success'), '', {
        duration: 5000,
        verticalPosition: 'top'
      });
    }, 2000);
  }

  stopEvent(event: Event): void {
    event.stopPropagation();
  }

  openOrderSummaryDialog(event: Event, order: any): void {
    console.log('order: ', order);
  }

  getImgExpress(order, thumbnail) {

    // === OLD & NEW ===
    const isNewThumbnail = thumbnail.startsWith("/home/ubuntu/IMG-Express");
    let newThumbnail = '';
    if (isNewThumbnail) {
      newThumbnail = thumbnail.replace('/home/ubuntu/IMG-Express', 'https://img-express.eazix.io');
    } else {
      if (order.status === 'PENDING' ||
        order.status === 'QR' ||
        order.status === 'NOT_PAID') {
        newThumbnail = 'https://' + order.branchID.serial_name + '.eazix.io/uploads/' + order.user + '/' + thumbnail.split('\\').pop();
      } else {
        newThumbnail = thumbnail;
      }
    }
    return newThumbnail;
  }

  openDeleteOrderDialog(event: Event, order: any): void {
    if (this.isSU) {
      event.stopPropagation();
      this.dialogService.onOpenDeleteOrderDialog(order, true);
    }
  }

  onDownloadOriginalFile(service: string, imgIndex: number, file: any, order: any) {
    let path = '';
    if (service === 'plotter') {
      // DOR NEW TASK!
      console.log('DOR NEW TASK! | FILL PLOTTER ORIGINAL FILE PACH!');
      console.log('DOR (1) | plz fill the pach on image index:', imgIndex, "of file:", file);
      path = "https://" + order.branchID?.serial_name + ".eazix.io/uploads/" + file.user + "/" + file.fileName;
    } else if (service === 'express') {
      path = file.pdfPath;
    }
    if (path) {
      const link = document.createElement('a');
      link.href = path;
      link.download = path.split('/').pop();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
  // // ORDERS -------- ORDERS -------- ORDERS -------- ORDERS -------- ORDERS -------- ORDERS -------- ORDERS -------- ORDERS





























  // USERS -------- USERS -------- USERS -------- USERS -------- USERS -------- USERS -------- USERS -------- USERS

  togglePanelUsers(user: any): void {
    // Find the index of the order that is being opened
    const index = this.users.findIndex(o => o.user._id === user._id);

    // Get the panel and the container
    const panel = this.expansionPanelsUsers.toArray()[index];
    const container = this.scrollContainerUsers;

    // Ensure that both the panel and the container are defined
    if (panel && container && container.nativeElement) {
      // Expand or collapse the MatExpansionPanel
      if (this.expandedPanelIdUsers === user._id) {
        panel.close();
        this.expandedPanelIdUsers = null;
      } else {
        panel.open();
        this.expandedPanelIdUsers = user._id;

        // Listen for the afterExpand event of the MatExpansionPanel
        const subscription = panel.afterExpand.subscribe(() => {
          // Scroll the container down by 50px
          container.nativeElement.scrollBy({
            top: 5,
            behavior: 'smooth'
          });

          // Unsubscribe from the afterExpand event to avoid memory leaks
          subscription.unsubscribe();
        });
      }
    }
  }

  async onChangedPageUsers(pageData: PageEvent, searchValue: string = '') {
    this.isLoadUsers = true;
    this.currentPageUsers = pageData.pageIndex + 1;
    this.usersPerPage = pageData.pageSize;
    const preSortedUsers = await this.usersService.getUsersForManager(
      this.usersPerPage,
      this.currentPageUsers,
      this.userSearchText
    );
  }

  formatPhone(phone: string) {
    let phoneStr = "0" + phone;
    return phoneStr.slice(0, 3) + "-" + phoneStr.slice(3);
  }

  filterUsers(): void {
    if (this.userSearchText && this.userSearchText.length > 2) {
      console.log("filterUsers", this.ordersPerPage, 1, this.userSearchText);
      this.isLoadUsers = true;
      this.usersService.getUsersForManager(this.ordersPerPage, 1, this.userSearchText);
    } else {
      this.usersService.getUsersForManager(this.ordersPerPage, 1, '');
    }
    console.log("users", this.users);
  }

  openAddPointsDialog(user) {
    console.log("openAddPointsDialog", user);
    this.dialogService.onOpenAddPointsDialog(user);
  }

  openDeleteUserDialog(user) {
    this.dialogService.onOpenDeleteUserDialog(user);
  }

  showUsersOrders(userOrOrder, isFromOrders: boolean = false) {
    let userId;
    if (isFromOrders) {
      userId = userOrOrder.userID;
    } else {
      userId = userOrOrder._id;
    }
    const page = "orders";
    const url = "/printer/" + this.printingService + "/" + this.branchId;
    this.router.navigate([url], { queryParams: { q: page } });
    this.onSerchUsersOrders(userId);
  }

  editUserManiger(user) {
    if (user) {
      this.dialogService.onOpenSuEditUserDialog(user);
    }
  }

  showUser(order: any) {
    console.log("showUsers", order.user);
    const url = "/printer/" + this.printingService + "/" + this.branchId;
    this.isInventoryUpdating = false;
    this.router.navigate([url], { queryParams: { q: "users" } });
    this.userSearchText = order.user;
  }
  // // USERS -------- USERS -------- USERS -------- USERS -------- USERS -------- USERS -------- USERS -------- USERS





























  // INVENTORY -------- INVENTORY -------- INVENTORY -------- INVENTORY -------- INVENTORY -------- INVENTORY -------- INVENTORY -------- INVENTORY

  getNumOfInventory(type: string, item: any): number {
    if (type === 'paper') {
      return this.currentInventory[type][item.paperType.paperType];
    } else if (type === 'ink') {
      return this.currentInventory[type][item.color];
    } else if (type === 'waste') {
      return this.currentInventory.ink.waste;
    } else {
      return 0;
    }
  }

  setNumOfInventory(type: string, item: any, value: number): void {
    if (type === 'paper') {
      this.currentInventory[type][item.paperType.paperType] = value;
    } else if (type === 'ink') {
      this.currentInventory[type][item.color] = value;
    } else if (type === 'waste') {
      this.currentInventory.ink.waste = value;
    }
  }

  changeNumberOfInventory(action: string, type: string, item: any): void {
    this.isInventoryUpdating = true;
    if (action === 'add') {
      // add
      if (type === 'paper') {
        this.currentInventory[type][item.paperType.paperType]++;
      } else if (type === 'ink') {
        this.currentInventory[type][item.color]++;
      } else if (type === 'waste') {
        this.currentInventory.ink.waste++;
      }
      // remove
    } else if (action === 'remove') {
      if (type === 'paper') {
        if (this.currentInventory[type][item.paperType.paperType] > 0) {
          this.currentInventory[type][item.paperType.paperType]--;
        }
      } else if (type === 'ink') {
        if (this.currentInventory[type][item.color] > 0) {
          this.currentInventory[type][item.color]--;
        }
      } else if (type === 'waste') {
        if (this.currentInventory.ink.waste > 0) {
          this.currentInventory.ink.waste--;
        }
      }
    }
  }

  onSaveInventory() {
    this.isInventoryUpdating = true;
    this.isLoadingInventory = true;
    const updatedInventory = this.currentInventory;
    this.branchesService.onUpdateInventory(this.branchId, updatedInventory).subscribe(
      (response: any) => {
        this.isLoadingInventory = false;
        if (response.branch) {
          this.isInventoryUpdating = false;
          this.branch.stockCurrent = response.inventory;
          this.currentInventory = response.inventory;
        }
        this.updatePrinter();
      },
      error => {
        console.error('Error updating inventory:', error);
      }
    );
  }

  // // INVENTORY -------- INVENTORY -------- INVENTORY -------- INVENTORY -------- INVENTORY -------- INVENTORY -------- INVENTORY -------- INVENTORY





























  // PERMISSIONS -------- PERMISSIONS -------- PERMISSIONS -------- PERMISSIONS -------- PERMISSIONS -------- PERMISSIONS -------- PERMISSIONS -------- PERMISSIONS

  toReplaceBmMode() {
    this.isReplacingBmMode = !this.isReplacingBmMode;
  }

  replaceBm(userId: string) {
    this.isReplacingBmMode = false;
    this.isLoadingPermitions = true;
    this.branchesService.onReplaceBm(this.printingService, this.branchId, userId).subscribe(
      (response: any) => {
        if (response.branch) {
          this.branch = response.branch;
          this.updatePrinter();
          this.userSearchText = '';
        }
      },
      error => {
        console.error('Error replacing BM:', error);
      }
    );
  }

  removeSt(userId: string) {
    this.isReplacingBmMode = false;
    this.isLoadingPermitions = true;
    this.branchesService.onRemoveSt(this.printingService, this.branchId, userId).subscribe(
      (response: any) => {
        if (response.branch) {
          this.branch = response.branch;
          this.updatePrinter();
          this.userSearchText = '';
        }
      },
      error => {
        console.error('Error replacing BM:', error);
      }
    );
  }

  addSt(userId: string) {
    this.isReplacingBmMode = false;
    this.isLoadingPermitions = true;
    this.branchesService.onAddSt(this.printingService, this.branchId, userId).subscribe(
      (response: any) => {
        if (response.branch) {
          this.branch = response.branch;
          this.updatePrinter();
          this.userSearchText = '';
        }
      },
      error => {
        console.error('Error replacing BM:', error);
      }
    );
  }

  // // PERMISSIONS -------- PERMISSIONS -------- PERMISSIONS -------- PERMISSIONS -------- PERMISSIONS -------- PERMISSIONS -------- PERMISSIONS -------- PERMISSIONS





























  // REPORT -------- REPORT -------- REPORT -------- REPORT -------- REPORT -------- REPORT -------- REPORT -------- REPORT

  fetchReportData(): void {
    this.isLoadReport = true;
    this.ordersService.getReportData(this.printingService, this.branchId, this.reportMonth, this.reportYear);
    this.reportSub = this.ordersService
      .getReportDataUpdateListener()
      .subscribe((reportData: { data: any }) => {
        let oldReportData = this.reportData;
        let newReportData = reportData.data;
        const isEqual = _.isEqual(oldReportData, newReportData);
        if (!isEqual || this.isLoadReport) {
          this.reportData = reportData.data;
        }
        this.isLoadReport = false;
        this.isLoading = false;
      });
  }

  // month 
  changeMonth(action: string): void {
    if (action === 'add') {
      this.reportMonth = this.reportMonth === 12 ? 1 : this.reportMonth + 1;
    } else if (action === 'remove') {
      this.reportMonth = this.reportMonth === 1 ? 12 : this.reportMonth - 1;
    }
    this.fetchReportData();
  }

  getMonth(): number {
    return this.reportMonth;
  }

  setMonth(value: number): void {
    if (value >= 1 && value <= 12) {
      this.reportMonth = value;
    }
  }

  // year 
  changeYear(action: string): void {
    if (action === 'add') {
      this.reportYear++;
    } else if (action === 'remove') {
      this.reportYear--;
    }
    this.fetchReportData();
  }

  getYear(): number {
    return this.reportYear;
  }

  setYear(value: number): void {
    if (value >= 2000 && value <= 2100) {
      this.reportYear = value;
    }
  }

  // PRICES
  getPaperPriceExpress(paperType: string, xFactor: string, sides: string, color: string): number {
    let paper;
    if (xFactor === 'first') {
      paper = this.branch.pricing?.prices_x?.[paperType.toLowerCase()];
    } else if (xFactor === 'more') {
      paper = this.branch.pricing?.prices?.[paperType.toLowerCase()];
    }
    let category;
    if (sides === 'single')
      category = paper.single;
    else if (sides === 'double') {
      category = paper.double;
    }
    let price = 0;
    if (color === 'color')
      price = category.color;
    else if (color === 'bw') {
      price = category.bw;
    }
    return price;
  }
  // REPORT -------- REPORT -------- REPORT -------- REPORT -------- REPORT -------- REPORT -------- REPORT -------- REPORT


  // ======================
}

















