import { Component, OnInit, OnDestroy, Renderer2, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { DirectionService } from '../../direction.service';
import { DataSharingService } from '../data-shering-service/data-sharing.service';
import { DialogService } from '../../dialog/dialog.service';
import { AuthService } from "../../auth/auth.service";

import { UsersService } from 'src/app/super-management/user/users.service';
import { BranchesService } from 'src/app/super-management/branch/branches.service';
import { Subject } from 'rxjs';
import { set } from 'lodash';

@Component({
  selector: 'app-choose-branch',
  templateUrl: './choose-branch.component.html',
  styleUrls: ['./choose-branch.component.scss'],
  host: {
    class: 'fill-screen'
  }
})

export class ChooseBranchComponent implements OnInit, OnDestroy {
  @ViewChildren('mapBranchItem') mapBranchItems: QueryList<ElementRef>;

  isRTL: boolean = true;
  isDarkMode: boolean = false;
  isLoading: boolean = false;
  private directionSubscription: Subscription;
  public printingService: string = '';
  public branch: string = '';
  public branches: any[] = [];
  public filteredBranches: { name: string, systems: string[] }[] = [];
  private dataServiceSubscription: Subscription;
  private branchSubscription: Subscription;
  public nonExistingBranch: string = '';
  public nonExistingBranchMessage: string = '';
  public nonExistingBranchIndex: number = undefined;
  continueToServiceText: string = '';
  userIsAuthenticated = false;
  private authListenerSubs: Subscription;
  allBranches: any;
  private destroy$ = new Subject<void>();
  @ViewChildren('branchElement') branchElements: QueryList<ElementRef>;
  isInitialized: boolean = true;
  isBranchSet: boolean = false;

  mapContainerWidth: number = 0;
  mapContainerHeight: number = 0;
  branchesMapLocationsList: any[] = [
    { name: "technion", location: { x: 0.45, y: 0.09 } },
    { name: "hadarion", location: { x: 0.41, y: 0.16 } },
    { name: "rupin", location: { x: 0.39, y: 0.23 } },
    { name: "tau", location: { x: 0.32, y: 0.3 } },
    { name: "shenkar", location: { x: 0.3, y: 0.37 } },
    { name: "minhal", location: { x: 0.24, y: 0.44 } },
    { name: "bezalel", location: { x: 0.68, y: 0.35 } },
    { name: "emuna", location: { x: 0.80, y: 0.5 } },
    { name: "ort", location: { x: 0.53, y: 0.52 } },
    { name: "shluha", location: { x: 0.79, y: 0.42 } },
    { name: "nocturno", location: { x: 0.52, y: 0.45 } },
    { name: "nocturno_pics", location: { x: 0.53, y: 0.38 } },
    { name: "nocturno_docs", location: { x: 0.53, y: 0.45 } },
    { name: "sami", location: { x: 0.48, y: 0.62 } },
    { name: "51pic", location: { x: 0.26, y: 0.40 } },
    { name: "51doc", location: { x: 0.26, y: 0.47 } },
    { name: "shivuk", location: { x: 0.60, y: 0.30 } },
    { name: "yooletta", location: { x: 0.26, y: 0.33 } },
  ];
  resizeObserver: any;
  isLoadingbranch: boolean = false;
  isAnimateBranchBtn: boolean = false;

  constructor(
    public directionService: DirectionService,
    private dataSharingService: DataSharingService,
    private router: Router,
    private dialogService: DialogService,
    private translateService: TranslateService,
    private authService: AuthService,
    private usersService: UsersService,
    private branchesService: BranchesService,
    private renderer: Renderer2,
  ) {
    this.translateService.onLangChange.subscribe(() => {
      this.updateNonExistingBranchText();
      this.updateTooltipContent();
    });
  }

  async ngOnInit() {
    this.isLoading = true;
    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authListenerSubs = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.userIsAuthenticated = isAuthenticated;
      });

    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });
    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    try {
      this.branches = await this.branchesService.getAllBranches().toPromise();
      console.log('branches:', this.branches);
      this.isLoading = false;
    } catch (error) {
      console.error('Error fetching and transforming branches:', error);
    }

    this.dataServiceSubscription = this.dataSharingService.getPrintingService()
      .subscribe((value) => {
        if (this.printingService !== value) {
          this.isInitialized = true;
        }
        this.printingService = value;
        this.branchSubscription = this.dataSharingService.getBranch()
          .subscribe((value) => {
            this.branch = value;
            this.filterBranchesByService();
            this.showActionBtn();
          });
        this.updateTooltipContent();
        this.resizeObserver = this.renderer.listen('window', 'resize', (event) => {
          setTimeout(() => { this.updateMap(); }, 0);
        });
      });
  }

  showActionBtn() {
    setTimeout(() => {
      if (this.branch && this.branch !== '') {
        this.isBranchSet = true;
      } else {
        this.isBranchSet = false;
      }
    }, 120);
  }

  sortBranches() {
    if (this.isInitialized) {
      this.filteredBranches.sort((a, b) => {
        if (a.name === this.branch) return -1;
        if (b.name === this.branch) return 1;
        return 0;
      });
    }
    this.isInitialized = false;
  }

  filterBranchesByService() {
    this.nonExistingBranch = '';
    this.filteredBranches = [];
    for (let branch of this.branches) {
      if (this.printingService === "plotter" && branch.plotter) {
        this.filteredBranches.push(branch);
      } else if (this.printingService === "express" && branch.express) {
        this.filteredBranches.push(branch);
      }
      if (branch.name === this.branch) {
        if (
          (this.printingService === "plotter" && !branch.plotter) ||
          (this.printingService === "express" && !branch.express)
        ) {
          this.nonExistingBranch = this.branch;
          this.branch = '';
        } else {
          this.nonExistingBranch = '';
        }
      }
    }
    console.log('filteredBranches:', this.filteredBranches);
    this.updateNonExistingBranchText();
    if (this.printingService !== 'plotter' && this.printingService !== 'express') {
      this.router.navigate(['/']);
    }
    setTimeout(() => { this.updateMap(); }, 0);
    this.sortBranches();
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
    this.authListenerSubs.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
    if (this.resizeObserver) {
      this.resizeObserver();
    }
  }

  onChooseBranch(value: string) {
    const branch = this.filteredBranches.find(branch => branch.name === value);
    if (branch) {
      if (!this.branch || this.branch === '') {
        this.isLoadingbranch = true;
      }
      this.isLoading = true;
      this.branch = value;
      this.onSetBranch();
    }
  }

  async onSetBranch() {
    if (this.filteredBranches.find(branch => branch.name === this.branch)) {
      this.dataSharingService.setBranch(this.branch);
      if (this.userIsAuthenticated) {
        await this.dataSharingService.setPrintingService(this.printingService);
        await this.dataSharingService.setBranch(this.branch);
        this.authService.updateAuthData(this.printingService, this.branch);
        this.usersService.updateUserPlace(
          this.printingService,
          this.branch
        ).subscribe(response => {
          this.isLoadingbranch = false;
          this.router.navigate(['/print']);
        });
      } else {
        this.isLoading = false;
        this.openLoginDialog();
      }
    }
  }

  openLoginDialog() {
    this.dialogService.onOpenLoginDialog(this.printingService, this.branch);
  }

  updateNonExistingBranchText() {
    this.nonExistingBranchMessage =
      this.translateService.instant('choose-branch.non-existing-branch.text-1') +
      ' ' +
      this.translateService.instant('choose-system.title-' + this.printingService) +
      ' ' +
      this.translateService.instant('choose-branch.non-existing-branch.text-2') +
      ' ' +
      this.translateService.instant('choose-branch.naming.' + this.nonExistingBranch) +
      ' (' +
      this.translateService.instant('choose-branch.city.' + this.nonExistingBranch) +
      ')' +
      this.translateService.instant('choose-branch.non-existing-branch.text-3') +
      '.';
  }

  updateTooltipContent() {
    this.continueToServiceText =
      this.translateService.instant('choose-system.continue-to-branch') +
      this.translateService.instant('choose-branch.naming.' + this.branch)
  }

  updateMap() {
    const mapContainer = document.getElementById('map-branch-container');
    if (mapContainer) {
      this.mapContainerWidth = mapContainer.offsetWidth;
      this.mapContainerHeight = mapContainer.offsetHeight;
    }
    this.filteredBranches.forEach((branch, index) => {
      const location = this.branchesMapLocationsList.find(item => item.name === branch.name)?.location;
      if (location) {
        const branchElement = this.mapBranchItems.toArray()[index];
        // Check if branchElement is defined
        if (branchElement && branchElement.nativeElement) {
          // Set the 'left' and 'top' CSS properties of the branch element
          this.renderer.setStyle(branchElement.nativeElement, 'left', `${location.x * this.mapContainerWidth}px`);
          this.renderer.setStyle(branchElement.nativeElement, 'top', `${location.y * this.mapContainerHeight}px`);
        } else {
          console.log('branchElement is not found');
        }
      } else {
        console.log('Location is not found for branch:', branch.name);
      }
    });
  }

  animateOut() {
    setTimeout(() => {
      this.isAnimateBranchBtn = true;
      setTimeout(() => {
        this.isAnimateBranchBtn = false;
      }, 400);
    }, 10);
  }

  // ================== 
}
