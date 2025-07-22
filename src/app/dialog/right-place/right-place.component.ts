import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

import { DirectionService } from '../../direction.service';
import { UsersService } from 'src/app/super-management/user/users.service';
import { AuthService } from 'src/app/auth/auth.service';
import { DialogService } from 'src/app/dialog/dialog.service';

import { BranchesService } from 'src/app/super-management/branch/branches.service';
import { DataSharingService } from 'src/app/main-section/data-shering-service/data-sharing.service';
import { set } from 'lodash';

@Component({
  selector: 'app-right-place',
  templateUrl: './right-place.component.html',
  styleUrls: ['./right-place.component.css'],
  host: {
    class: 'fill-screen-modal-right-place'
  }
})
export class RightPlaceComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;

  userId: string;
  userIsAuthenticated = false;
  private authStatusSub: Subscription;
  myPrintingServicesList: string[];
  myBranchesList: string[];
  branches: any[] = [];
  public printingService: string = '';
  public branch: string = '';
  isLoading: boolean = false;
  realBranchesObjects: any[] = [];
  realBranchesObjectsSelected: any[] = [];

  constructor(
    private directionService: DirectionService,
    private usersService: UsersService,
    private authService: AuthService,
    private dialogService: DialogService,
    private branchesService: BranchesService,
    private dataSharingService: DataSharingService,
    private router: Router,
  ) { }

  async ngOnInit() {
    this.isLoading = true;
    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.userId = this.authService.getUserId();
    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.userIsAuthenticated = isAuthenticated;
        this.userId = this.authService.getUserId();
      });
    this.usersService.getUser(this.userId).subscribe((user) => {
      this.myPrintingServicesList = [...user.home_printingServices_list];
      this.myBranchesList = [...user.home_branches_list];
    })
    try {
      this.realBranchesObjects = await this.branchesService.getAllBranches().toPromise();
      if (this.myBranchesList.length > 0 && this.realBranchesObjects.length > 0) {
        for (let branchName of this.myBranchesList) {
          const selectedBranchIndex = this.realBranchesObjects.findIndex(
            (branch: any) => branch.name === branchName
          );
          this.realBranchesObjectsSelected.push(this.realBranchesObjects[selectedBranchIndex]);
        }
        this.isLoading = false;
      }
    } catch (error) {
      console.error('Error fetching and transforming branches:', error);
      throw error;
    }
  }

  closeRightPlaceDialog() {
    this.dialogService.onCloseRightPlaceDialog();
  }

  onChooseServiceAndBranch(printingService: string, branch: string) {
    this.printingService = printingService;
    this.branch = branch;
    this.onSetServiceAndBranch();
  }

  async onSetServiceAndBranch() {
    localStorage.setItem('printingService', this.printingService);
    localStorage.setItem('branch', this.branch);
    await this.dataSharingService.setPrintingService(this.printingService);
    await this.dataSharingService.setBranch(this.branch);
    if (this.userIsAuthenticated) {
      this.authService.updateAuthData(this.printingService, this.branch);
      this.usersService.updateUserPlace(
        this.printingService,
        this.branch
      ).subscribe(response => {
        this.closeRightPlaceDialog();
        this.router.navigate(['/print']);
      });
    }
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
    this.authStatusSub.unsubscribe();
  }

  goHome() {
    this.router.navigate(['/']);
    this.closeRightPlaceDialog();
  }

  // ===============
}
