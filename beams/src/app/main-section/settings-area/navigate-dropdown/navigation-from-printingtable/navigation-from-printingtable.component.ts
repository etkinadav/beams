import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { DataSharingService } from '../../../data-shering-service/data-sharing.service';
import { Subscription } from 'rxjs';
import { Router } from "@angular/router";
import { DirectionService } from '../../../../direction.service';
import { AuthService } from 'src/app/auth/auth.service';
import { UsersService } from 'src/app/super-management/user/users.service';
import { BranchesService } from 'src/app/super-management/branch/branches.service';

@Component({
  selector: 'app-navigation-from-printingtable',
  templateUrl: './navigation-from-printingtable.component.html',
  styleUrls: ['./navigation-from-printingtable.component.css']
})
export class NavigationFromPrintingTableComponent implements OnInit, OnDestroy {
  public printingService: string = '';
  public printingServices: { name: string }[] = [];
  private dataServiceSubscription: Subscription;
  isDarkMode: boolean = false;

  userId: string;
  userIsAuthenticated = false;
  private authStatusSub: Subscription;
  myPrintingServicesList: string[];
  myBranchesList: string[];
  branches: any[] = [];
  isLoading: boolean = false;
  realBranchesObjects: any[] = [];
  realBranchesObjectsSelected: any[] = [];
  isNavOpen: boolean = false;
  isRTL: boolean = true;

  private rolesSubscription: Subscription;
  roles: string[] = [];
  isSU: boolean = false;

  constructor(
    private dataSharingService: DataSharingService,
    private router: Router,
    private directionService: DirectionService,
    private authService: AuthService,
    private usersService: UsersService,
    private branchesService: BranchesService,
    private cd: ChangeDetectorRef,
  ) { }

  async ngOnInit() {
    this.isLoading = true;
    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.printingServices = this.dataSharingService.getPrintingServices();

    this.dataServiceSubscription = this.dataSharingService.getPrintingService().subscribe((value) => {
      this.printingService = value;
    });

    this.userId = this.authService.getUserId();
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
      this.cd.detectChanges();
    });

    if (this.userId) {
      this.usersService.getUser(this.userId).subscribe((user) => {
        this.myPrintingServicesList = [...user.home_printingServices_list];
        this.myBranchesList = [...user.home_branches_list];
        console.log('chaingePrintingServiceAndBranch ngOnInit:', this.myBranchesList, this.myPrintingServicesList);
      })

      try {
        this.realBranchesObjects = await this.branchesService.getAllBranches().toPromise();
        if (this.realBranchesObjects.length > 0) {
          for (let branchName of this.myBranchesList) {
            const selectedBranchIndex = this.realBranchesObjects.findIndex(
              (branch: any) => branch.name === branchName
            );
            this.realBranchesObjectsSelected.push(this.realBranchesObjects[selectedBranchIndex]);
          }
        }
        this.isLoading = false;
      } catch (error) {
        console.error('Error fetching and transforming branches:', error);
        throw error;
      }
    }
  }

  ngOnDestroy() {
    this.authStatusSub.unsubscribe();
    this.dataServiceSubscription.unsubscribe();
  }

  // async chaingePrintingServiceAndBranch(selectedService, selectedBranch) {
  //   console.log('chaingePrintingServiceAndBranch: BEFORE', this.myBranchesList, this.myPrintingServicesList);
  //   try {
  //     this.dataSharingService.setPrintingService(selectedService);
  //     this.dataSharingService.setBranch(selectedBranch);
  //     localStorage.setItem('printingService', selectedService);
  //     localStorage.setItem('branch', selectedBranch);
  //     this.closeMainNav();
  //     this.authService.updateAuthData(selectedService, selectedBranch);
  //     this.usersService.updateUserPlace(selectedService, selectedBranch);
  //     this.usersService.getUser(this.userId).subscribe((user) => {
  //       this.myPrintingServicesList = [...user.home_printingServices_list];
  //       this.myBranchesList = [...user.home_branches_list];
  //       console.log('chaingePrintingServiceAndBranch: AFTER', this.myBranchesList, this.myPrintingServicesList);

  //       this.realBranchesObjectsSelected = [];

  //       if (this.realBranchesObjects.length > 0) {
  //         for (let branchName of this.myBranchesList) {
  //           const selectedBranchIndex = this.realBranchesObjects.findIndex(
  //             (branch: any) => branch.name === branchName
  //           );
  //           this.realBranchesObjectsSelected.push(this.realBranchesObjects[selectedBranchIndex]);
  //         }
  //       }
  //     })
  //   }
  //   catch (error) {
  //     console.error('Error fetching and transforming branches:', error);
  //     throw error;
  //   }
  // }
  async chaingePrintingServiceAndBranch(selectedService: string, selectedBranch: string) {
    try {
      localStorage.setItem('lastPrintingService', selectedService);
      localStorage.setItem('lastBranch', selectedBranch);
      await this.dataSharingService.setPrintingService(selectedService);
      await this.dataSharingService.setBranch(selectedBranch);
      this.authService.updateAuthData(selectedService, selectedBranch);
      this.usersService.updateUserPlace(selectedService, selectedBranch).subscribe(response => {
        this.myPrintingServicesList = [...response.home_printingServices_list];
        this.myBranchesList = [...response.home_branches_list];
        this.closeMainNav();
        this.realBranchesObjectsSelected = [];
        if (this.realBranchesObjects.length > 0) {
          for (let branchName of this.myBranchesList) {
            const selectedBranchIndex = this.realBranchesObjects.findIndex(
              (branch: any) => branch.name === branchName
            );
            this.realBranchesObjectsSelected.push(this.realBranchesObjects[selectedBranchIndex]);
          }
        }
      });
    } catch (error) {
      console.error('Error changing printing service and branch:', error);
    }
  }

  goHome() {
    this.router.navigate(['/']);
  }

  toggleMainNav() {
    this.isNavOpen = !this.isNavOpen;
  }

  closeMainNav() {
    this.isNavOpen = false;
  }

  goToPrintingQueue() {
    const branchUnique = this.realBranchesObjectsSelected[0]?.plotter?.unique ? this.realBranchesObjectsSelected[0].plotter.unique : '';
    this.router.navigate(['/queue/' + branchUnique]);
  }
}
