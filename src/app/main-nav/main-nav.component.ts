import { Component, OnInit, OnDestroy, Inject, Renderer2, ChangeDetectorRef, HostListener, ElementRef } from '@angular/core';
import { TranslateService } from "@ngx-translate/core";
import { Subscription, of } from "rxjs";

import { DOCUMENT } from '@angular/common';
import { DirectionService } from '../direction.service';
import { AuthService } from "../auth/auth.service";
import { Router, NavigationEnd } from "@angular/router";
import { DialogService } from '../dialog/dialog.service';

import { UsersService } from '../super-management/user/users.service';
import { OrdersService } from "../other-pages/my-orders/orders-service";

import { delay, switchMap, filter } from 'rxjs/operators';
import { BranchesService } from 'src/app/super-management/branch/branches.service';

@Component({
  selector: 'app-main-nav',
  templateUrl: './main-nav.component.html',
  styleUrls: ['./main-nav.component.scss'],
  host: {
    class: 'fill-screen'
  }
})

export class MainNavComponent implements OnInit, OnDestroy {
  isDarkMode: boolean = false;
  userIsAuthenticated = false;
  private authListenerSubs: Subscription;
  isDrawerOpen: boolean = false;
  isProManuOpen: boolean = false;
  isRTL: boolean = true;
  selectedLanguage: string = 'he';
  public selectedTheme: string = 'light';
  public isDarkTheme: boolean = false;
  private directionSubscription: Subscription;
  tooltipContentMode: string = '';
  tooltipContentLanguage: string = '';
  roles: string[] = [];
  private rolesSubscription: Subscription;
  userId: string;
  isSU: boolean = false;
  userName = '';
  private userNameSubscription: Subscription;
  greeting = '';
  private numOfOrdersSub: Subscription;
  numOfPendingOrders: number = 0;
  private intervalId: any;
  user: any = {};
  userProfileImg: string;
  isRootScreen = false;
  private defaultProfileUrl = "../../assets/images/profile-default.svg";
  isLoggedOutLoading: boolean = false;

  constructor(
    public translateService: TranslateService,
    private directionService: DirectionService,
    @Inject(DOCUMENT) private document: Document,
    private authService: AuthService,
    private router: Router,
    private render: Renderer2,
    private usersService: UsersService,
    private dialogService: DialogService,
    private cd: ChangeDetectorRef,
    private ordersService: OrdersService,
    private elementRef: ElementRef,
    private branchesService: BranchesService,
  ) {
    this.translateService.onLangChange.subscribe(() => {
      this.updateTranslation();
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.isRootScreen = event.urlAfterRedirects.startsWith('/screen');
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.closeProfileManu();
    }
  }

  ngOnInit() {
    // localStorage.removeItem("printingService");
    // localStorage.removeItem("branch");
    this.userIsAuthenticated = this.authService.getIsAuth();
    if (this.userIsAuthenticated) {
      this.getOrders();
    } else {
      const now = new Date().getTime();
      const expiration = localStorage.getItem('expiration');
      if (expiration) {
        const expirationTime = new Date(expiration).getTime();
        if (now > expirationTime) {
          this.authService.logout();
          this.dialogService.onOpenLoginDialog();
        }
      }
    }
    this.authListenerSubs = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.userIsAuthenticated = isAuthenticated;
        this.userId = this.authService.getUserId();
        if (this.userIsAuthenticated) {
          this.getOrders();
        } else {
          this.numOfPendingOrders = 0;
          if (this.intervalId) {
            clearInterval(this.intervalId);
          }
        }
        this.updateUser();
      });

    // Subscribe to the authCompleted event
    this.authService.getAuthCompletedListener().subscribe(() => {
      this.getOrders();
    });

    this.authService.userUpdated$.subscribe(user => {
      this.user = user;
      this.userProfileImg = this.getUserProfileImg(user);
    });

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.directionService.currentLanguage$.subscribe((lang) => {
      // console.log("selected---Lang---uage: 6" + lang, this.selectedLanguage)
      if (lang !== this.selectedLanguage) {
        this.selectedLanguage = lang;
      }
    });

    this.rolesSubscription = this.authService.roles$.subscribe(roles => {
      this.roles = roles;
      if (this.roles.includes('su')) {
        this.isSU = true;
      } else {
        this.isSU = false;
      }
      this.cd.detectChanges();
    });

    this.userNameSubscription = this.authService.userName$.subscribe(userName => {
      this.userName = userName;
      this.cd.detectChanges();
    });

    this.updateGreeting();
    setInterval(() => {
      this.updateGreeting();
    }, 60000);

    this.updateUser();

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        if (event.urlAfterRedirects === '/home' && this.isIphone()) {
          this.render.addClass(this.elementRef.nativeElement, 'fill-screen-home');
        } else {
          this.render.removeClass(this.elementRef.nativeElement, 'fill-screen-home');
        }
      });
  }

  // update user
  updateUser() {
    if (localStorage.getItem('userId')) {
      this.usersService.getUser(localStorage.getItem('userId')).subscribe((user) => {
        if (user) {
          this.user = user;
          // console.log('this.user:', this.user);
        }
      });
    };
  }

  getOrders() {
    // get orders [init]
    this.ordersService.getNumOfPendingOrders();
    this.numOfOrdersSub = this.ordersService
      .getNumOfPendingOrdersUpdateListener()
      .subscribe((orderData: { numOfPendingOrders: number }) => {
        this.numOfPendingOrders = orderData.numOfPendingOrders;
      });
    // get orders [interval]
    this.intervalId = setInterval(() => {
      this.ordersService.getNumOfPendingOrders();
    }, 30000);
  }

  onLogout() {
    this.isProManuOpen = false;
    this.isLoggedOutLoading = true;
    this.authService.logout().then(() => {
      // ... after logging out finished
      this.isLoggedOutLoading = false;
    });
  }

  ngOnDestroy() {
    this.authListenerSubs.unsubscribe();
    this.directionSubscription.unsubscribe();
    this.rolesSubscription.unsubscribe();
  }

  // Drawer
  toggleDrawer() {
    this.isDrawerOpen = !this.isDrawerOpen;
  }

  openDrawer() {
    this.isDrawerOpen = true;
  }

  closeDrawer() {
    this.isDrawerOpen = false;
  }

  // Profile Manu
  toggleProfileManu() {
    this.isProManuOpen = !this.isProManuOpen;
  }

  closeProfileManu() {
    this.isProManuOpen = false;
  }

  // settings
  changeTheme(themeValue: string) {
    if (themeValue !== this.selectedTheme) {
      this.selectedTheme = themeValue;
      this.render.removeClass(this.document.body, 'lightTheme');
      this.render.removeClass(this.document.body, 'darkTheme');
      this.render.addClass(this.document.body, themeValue + 'Theme');
      if (this.isDarkTheme) {
        this.closeProfileManu();
        this.isDarkTheme = false;
        this.toggleDarkMode(false);
      } else {
        this.closeProfileManu();
        this.isDarkTheme = true;
        this.toggleDarkMode(true);
      }
    }
  }

  goToLanguage(lang) {
    if (lang !== this.selectedLanguage) {
      this.directionService.toLanguageDirection(lang);
      if (this.userIsAuthenticated) {
        this.usersService.updateUserLanguage(lang);
        this.closeProfileManu();
      }
    }
  }

  toggleDarkMode(isDarkMode: boolean) {
    this.directionService.setDarkMode(isDarkMode);
    this.closeProfileManu();
  }

  goToHome() {
    this.closeDrawer();
    this.closeProfileManu();
    this.router.navigate(['/']);
  }

  updateTranslation() {
    this.tooltipContentMode = this.translateService.instant('main-nav.tooltip-mode');
    this.tooltipContentLanguage = this.translateService.instant('main-nav.tooltip-language');
  }

  openLoginDialog() {
    this.closeDrawer();
    this.closeProfileManu();
    this.dialogService.onOpenLoginDialog('', '');
  }

  goToTandC() {
    this.closeDrawer();
    this.closeProfileManu();
    this.router.navigate(["/tandc"]);
  }

  goToPP() {
    this.closeDrawer();
    this.closeProfileManu();
    this.router.navigate(["/pp"]);
  }

  goToBranchList() {
    this.closeDrawer();
    this.closeProfileManu();
    this.router.navigate(["/branchlist"]);
  }

  goToUserList() {
    this.closeDrawer();
    this.closeProfileManu();
    this.router.navigate(["/userlist"]);
  }

  goToPaperList() {
    this.closeDrawer();
    this.closeProfileManu();
    this.router.navigate(["/paperlist"]);
  }

  openWhatsApp() {
    const phoneNumber = '97233746962';
    const message = encodeURIComponent('Hi Eazix, I need some help printing :)');
    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(url, '_blank');
    this.closeDrawer();
    this.closeProfileManu();
  }

  goToNewOrder() {
    this.closeDrawer();
    this.closeProfileManu();
    const printingService = localStorage.getItem('printingService');
    const branch = localStorage.getItem('branch');
    if (printingService && printingService !== 'null' && printingService !== '' &&
      branch && branch !== 'null' && branch !== '') {
      this.dialogService.onOpenRightPlaceDialog();
    } else if (branch && branch !== 'null' && branch !== '') {
      this.router.navigate(["/branch"]);
    } else {
      this.router.navigate(["/"]);
    }
  }

  goToMyOrders() {
    this.closeDrawer();
    this.closeProfileManu();
    this.router.navigate([`/myorders/${localStorage.getItem('userId')}`]);
  }

  goToMyProfile() {
    this.closeDrawer();
    this.closeProfileManu();
    this.router.navigate([`/myprofile/${localStorage.getItem('userId')}`]);
  }

  goToMyProfileCreditMode() {
    this.closeDrawer();
    this.closeProfileManu();
    this.router.navigate([`/myprofile/${localStorage.getItem('userId')}/credit`]);
  }

  goToQAndA() {
    this.closeDrawer();
    this.closeProfileManu();
    this.router.navigate(["/qanda"]);
  }

  openByPrinterNumberDialog() {
    this.closeDrawer();
    this.closeProfileManu();
    this.dialogService.onOpenPrinterNumberDialog();
  }

  updateGreeting() {
    const currentHour = new Date().getHours();
    if (currentHour >= 6 && currentHour < 12) {
      this.greeting = 'morning';
    } else if (currentHour >= 12 && currentHour < 16) {
      this.greeting = 'noon';
    } else if (currentHour >= 16 && currentHour < 19) {
      this.greeting = 'afternoon';
    } else if (currentHour >= 19 && currentHour < 21) {
      this.greeting = 'evening';
    } else {
      this.greeting = 'night';
    }
  }

  getUserProfileImg(user: any) {
    // update your method to use the user parameter
    if (user && user.provider) {
      if (user.provider === 'facebook') {
        return user.providerData?.id ? 'https://graph.facebook.com/' + user.providerData.id + '/picture?type=large' : this.defaultProfileUrl;
      } else if (user.provider === 'google') {
        return user.providerData?.picture ? user.providerData.picture : this.defaultProfileUrl;
      } else {
        return this.defaultProfileUrl;
      }
    } else {
      return this.defaultProfileUrl;
    }
  }

  isHomePage(): boolean {
    return this.router.url === '/home';
  }

  async goToManagementPage(page: string) {
    const service = localStorage.getItem('printingService');
    const branch = localStorage.getItem('branch');
    if (!service || !branch) {
      return;
    }
    this.closeDrawer();
    this.closeProfileManu();
    let branchId = '';
    await this.branchesService.getBranchByName(service, branch).pipe(
      switchMap((branchData: any) => {
        branchId = branchData._id;
        return of(branchData);
      })
    ).subscribe(() => {
      if (branchId && branchId !== '') {
        this.router.navigate(['/printer/' + service + "/" + branchId], { queryParams: { q: page } })
      }
    });
  }

  isIphone(): boolean {
    return /iPhone/.test(navigator.userAgent);
  }
  // ====================
}