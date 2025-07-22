import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataSharingService } from '../../../main-section/data-shering-service/data-sharing.service';
import { Subscription } from 'rxjs';
import { Router } from "@angular/router";
import { DirectionService } from '../../../direction.service';
import { AuthService } from 'src/app/auth/auth.service';
import { UsersService } from 'src/app/super-management/user/users.service';
import { BranchesService } from 'src/app/super-management/branch/branches.service';

@Component({
  selector: 'app-navigation-from-printer-manigment',
  templateUrl: './navigation-from-printer-manigment.component.html',
  styleUrls: ['./navigation-from-printer-manigment.component.css']
})
export class NavigationFromPrinterManigmentComponent implements OnInit, OnDestroy {
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

  constructor(
    private dataSharingService: DataSharingService,
    private router: Router,
    private directionService: DirectionService,
    private authService: AuthService,
    private usersService: UsersService,
    private branchesService: BranchesService,
  ) { }

  async ngOnInit() {
    this.isLoading = true;
    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    this.printingServices = this.dataSharingService.getPrintingServices();
    console.log("this.printingServices 1 ", this.printingServices);

    this.dataServiceSubscription = this.dataSharingService.getPrintingService().subscribe((value) => {
      this.printingService = value;
      console.log("this.printingServices 2 ", this.printingServices);
    });

    this.userId = this.authService.getUserId();
    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.userIsAuthenticated = isAuthenticated;
        this.userId = this.authService.getUserId();
      });

    if (this.userId) {
      this.usersService.getUser(this.userId).subscribe((user) => {
        this.myPrintingServicesList = [...user.home_printingServices_list];
        this.myBranchesList = [...user.home_branches_list];
      })

      try {
        this.realBranchesObjects = await this.branchesService.getAllBranches().toPromise();
        console.log("this.realBranchesObjects 1 ", this.realBranchesObjects);
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

  async chaingePrintingServiceAndBranch(selectedService, selectedBranch) {
    const url = window.location.href;
    const urlObj = new URL(url);
    const tab = urlObj.searchParams.get('q');
    try {
      localStorage.setItem('printingService', selectedService);
      localStorage.setItem('branch', selectedBranch);
      await this.dataSharingService.setPrintingService(selectedService);
      await this.dataSharingService.setBranch(selectedBranch);
      this.closeMainNav();
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
      console.log("this.realBranchesObjectsSelected ", selectedService, selectedBranch);
      let branchId = '';
      if (selectedService === 'plotter') {
        branchId = this.realBranchesObjects.find(branch => branch.name === selectedBranch).plotter._id;
      } else if (selectedService === 'express') {
        branchId = this.realBranchesObjects.find(branch => branch.name === selectedBranch).express._id;
      }
      console.log("branchId ", branchId);
      const route = '/printer/' + selectedService + '/' + branchId;
      console.log("route ", route);
      this.router.navigate([route], { queryParams: { q: tab ? tab : 'printer' } });
    }
    catch (error) {
      console.error('Error fetching and transforming branches:', error);
      throw error;
    }
  }

  async goToPrintingTable() {
    const service = localStorage.getItem('printingService');
    const branch = localStorage.getItem('branch');
    await this.dataSharingService.setPrintingService(service);
    await this.dataSharingService.setBranch(branch);
    this.router.navigate(['/print']);
  }

  toggleMainNav() {
    if (localStorage.getItem('roles').includes('su')) {
      this.isNavOpen = !this.isNavOpen;
    } else {
      this.goToPrintingTable();
    }
  }

  closeMainNav() {
    this.isNavOpen = false;
  }

  goToPrintingQueue() {
    const branchUnique = this.realBranchesObjectsSelected[0]?.plotter?.unique ? this.realBranchesObjectsSelected[0].plotter.unique : '';
    this.router.navigate(['/queue/' + branchUnique]);
  }
}
