import { Component, OnInit, OnDestroy } from '@angular/core';
// import { DirectionService } from '../../direction.service';
// import { Subscription } from 'rxjs';
// import { DialogService } from 'src/app/dialog/dialog.service';
import { Router } from '@angular/router';
import { ActivatedRoute } from "@angular/router";

// import { NgForm } from "@angular/forms";
// import { FacebookLoginProvider, GoogleLoginProvider } from "@abacritt/angularx-social-login";

import { AuthService } from "../auth.service";

@Component({
  selector: 'app-social',
  templateUrl: './social.component.html',
  styleUrls: ['./social.component.css'],
  host: {
    class: 'fill-screen-modal'
  }
})

export class SocialComponent implements OnInit, OnDestroy {
  isLoading: boolean = false;
  isDarkMode: boolean = false;
  isRTL: boolean = true;
  email: string = '';
  provider: string = '';
  hasPassword: boolean = false;
  private queryParamsObject: { [p: string]: any };

  printingService: string = '';
  lastPrintService: string = '';
  branch: string = '';
  lastBranch: string = '';
  isfromSocial: string = '';

  constructor(
    private router: Router,
    public authService: AuthService,
    private activatedRoute: ActivatedRoute
  ) {

  };

  ngOnInit() {
    // get all vars from the url
    this.activatedRoute.queryParams.subscribe(params => {
      // params is already an object that contains the query parameters
      this.queryParamsObject = { ...params };
      console.log('Query Parameters:', this.queryParamsObject);
      const now = new Date();
      this.lastPrintService = this.queryParamsObject['home_printingServices_list'].split(",")[0];
      this.printingService = this.lastPrintService;
      this.lastBranch = this.queryParamsObject['home_branches_list'].split(",")[0];
      this.branch = this.lastBranch;
      this.setNewServiceAndBranch();
      this.authService.saveAuthData(
        this.queryParamsObject['token'],
        new Date(now.getTime() + this.queryParamsObject['expiresIn'] * 1000),
        this.queryParamsObject['userId'],
        this.printingService,
        this.branch,
        this.queryParamsObject['language'],
        this.queryParamsObject['roles'],
        this.queryParamsObject['userName'],
        this.queryParamsObject['email'],
      );
      this.authService.autoAuthUser();
      if (this.printingService && this.printingService !== '' && this.branch && this.branch !== '') {
        this.router.navigate(["/print"]);
      } else {
        this.router.navigate(["/"]);
      }
    });

  }

  ngOnDestroy(): void {
  }

  setNewServiceAndBranch() {
    this.isfromSocial = localStorage.getItem("isfromSocial");
    if (this.isfromSocial === 'true') {
      if (this.lastPrintService !== this.printingService || this.lastBranch !== this.branch) {
        localStorage.setItem("isfromSocial", "new");
      }
      this.printingService = localStorage.getItem("printingService");
      this.branch = localStorage.getItem("branch");
    }
  }
}
