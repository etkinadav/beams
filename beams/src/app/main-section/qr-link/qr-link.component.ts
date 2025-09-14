import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

import { DirectionService } from '../../direction.service';
import { DataSharingService } from '../data-shering-service/data-sharing.service';
import { DialogService } from '../../dialog/dialog.service';
import { AuthService } from "../../auth/auth.service";

import { UsersService } from 'src/app/super-management/user/users.service';

@Component({
  selector: 'app-qr-link',
  templateUrl: './qr-link.component.html',
  styleUrls: ['./qr-link.component.scss'],
  host: {
    class: 'fill-screen'
  }
})

export class QrLinkComponent implements OnInit {
  isRTL: boolean = true;
  isDarkMode: boolean = false;
  private directionSubscription: Subscription;
  public printingService: string = '';
  public branch: string = '';
  continueToServiceText: string = '';
  userIsAuthenticated = false;
  private authListenerSubs: Subscription;

  constructor(
    public directionService: DirectionService,
    private dataSharingService: DataSharingService,
    private router: Router,
    private dialogService: DialogService,
    private authService: AuthService,
    private usersService: UsersService,
  ) { }

  async ngOnInit() {
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

    const url = this.router.url.split('/');
    this.printingService = url[2];
    this.branch = url[3];
    if (this.printingService && this.printingService !== '' && this.branch && this.branch !== '') {
      await this.dataSharingService.setPrintingService(this.printingService);
      await this.dataSharingService.setBranch(this.branch);
      this.authService.updateAuthData(this.printingService, this.branch);
      if (!this.userIsAuthenticated) {
        this.dialogService.onOpenLoginDialog(this.printingService, this.branch);
        this.router.navigate(['/branch']);
      } else {
        this.usersService.updateUserPlace(
          this.printingService,
          this.branch
        ).subscribe(response => {
          this.router.navigate(['/print']);
        });
      }
    }
  }

  // ================== 
}
