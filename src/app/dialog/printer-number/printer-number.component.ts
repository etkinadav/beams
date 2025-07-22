import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

import { DirectionService } from '../../direction.service';
import { AuthService } from 'src/app/auth/auth.service';
import { DialogService } from 'src/app/dialog/dialog.service';

import { FormGroup, FormControl, Validators } from "@angular/forms";
import { BranchesService } from 'src/app/super-management/branch/branches.service';

import { DataSharingService } from 'src/app/main-section/data-shering-service/data-sharing.service';
import { UsersService } from 'src/app/super-management/user/users.service';
import { includes } from 'lodash';

@Component({
  selector: 'app-printer-number',
  templateUrl: './printer-number.component.html',
  styleUrls: ['./printer-number.component.css'],
})

export class PrinterNumberComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  private directionSubscription: Subscription;
  isDarkMode: boolean = false;
  isLoading: boolean = false;
  isLoadingUpdates = false;

  userId: string;
  userIsAuthenticated = false;
  private authStatusSub: Subscription;

  form: FormGroup;
  public branches: any[] = [];
  filteredPlotterBranches: any[] = [];
  filteredExpressBranches: any[] = [];
  currentValue: string = '';

  constructor(
    private directionService: DirectionService,
    private authService: AuthService,
    private dialogService: DialogService,
    private branchesService: BranchesService,
    private dataSharingService: DataSharingService,
    private usersService: UsersService,
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

    this.form = new FormGroup({
      printerNum: new FormControl(null, {
        validators: [Validators.required, Validators.minLength(1), Validators.maxLength(3)]
      })
    });

    try {
      this.branches = await this.branchesService.getAllBranches().toPromise();
      this.updateBranches(this.currentValue);
      this.isLoading = false;
    } catch (error) {
      console.error('Error fetching and transforming branches:', error);
    }

    this.form.get('printerNum').valueChanges.subscribe(value => {
      this.currentValue = value;
      if (this.branches.length === 0 || value.length > 3) {
        return;
      }
      this.updateBranches(value);
    });

  }

  updateBranches(value: string) {
    this.filteredPlotterBranches = [];
    this.filteredExpressBranches = [];
    console.log('PRINTER NUMBER! START!!!!:');
    console.log('this.branches:', this.branches);
    for (let branch of this.branches) {
      const plotterSort = branch.plotter?.unique ? branch.plotter.unique.toString().padStart(3, '0') : '';
      const expressUnique = branch.express?.unique ? branch.express.unique.toString() : '';
      console.log('PRINTER NUMBER! updateBranches:', plotterSort);
      console.log('plotterSort:', plotterSort);
      console.log('expressUnique:', expressUnique);
      console.log('branch:', branch);
      if (plotterSort && plotterSort.includes(value)) {
        this.filteredPlotterBranches.push(branch);
      }
      if (expressUnique && expressUnique.includes(value)) {
        this.filteredExpressBranches.push(branch);
      }
    }
  }

  closePrinterNumberDialog() {
    this.dialogService.onClosePrinterNumberDialog();
  }

  ngOnDestroy() {
    this.directionSubscription.unsubscribe();
    this.authStatusSub.unsubscribe();
  }

  clearPrinterNumField() {
    this.form.patchValue({
      printerNum: ''
    });
  }

  async onChooseBranch(isExpress: boolean, branch: any) {
    let printingService;
    if (isExpress) {
      printingService = 'express';
    } else {
      printingService = 'plotter';
    }
    this.authService.updateAuthData(printingService, branch.name);
    if (this.userIsAuthenticated) {
      await this.dataSharingService.setPrintingService(printingService);
      await this.dataSharingService.setBranch(branch.name);
      if (this.userIsAuthenticated) {
        this.authService.updateAuthData(printingService, branch.name);
        this.usersService.updateUserPlace(
          printingService,
          branch.name
        ).subscribe(response => {
          this.router.navigate(['/print']);
          this.closePrinterNumberDialog();
        });
      }
    } else {
      this.dialogService.onOpenLoginDialog(printingService, branch.name);
      this.closePrinterNumberDialog();
    }
  }

  getPtinterNumber(printingService: string, branch: any) {
    let num = "000";
    if (branch) {
      if (printingService === 'plotter') {
        if (branch.plotter?.unique) {
          num = branch.plotter.unique.toString().padStart(3, '0');
        }
      } else if (printingService === 'express') {
        if (branch.express?.unique) {
          num = branch.express.unique.toString();
        }
      }
    }
    return num;
  }

  // ===============
}
