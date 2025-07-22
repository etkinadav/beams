import { Component, OnInit, OnDestroy } from "@angular/core";
import { NgForm } from "@angular/forms";
import { Subscription } from "rxjs";

import { AuthService } from "../auth.service";
import { DirectionService } from '../../direction.service';
import { MatDialog } from '@angular/material/dialog';

@Component({
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    host: {
        class: 'fill-screen'
    }
})
export class LoginComponent implements OnInit, OnDestroy {
    isLoading = false;
    private authStatusSub: Subscription;
    isDarkMode: boolean = false;

    constructor(
        public authService: AuthService,
        private directionService: DirectionService,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.authStatusSub = this.authService.getAuthStatusListener().subscribe(
            authStatus => {
                this.isLoading = false;
            }
        );

        this.directionService.isDarkMode$.subscribe(isDarkMode => {
            this.isDarkMode = isDarkMode;
        });

        // this.openDialog();
    }

    // openDialog(): void {
    //     const isMobile = window.innerWidth < 768; // Adjust this breakpoint as needed for your mobile view
    //     const dialogRef = this.dialog.open(PreloginComponent, {
    //         width: isMobile ? '95%' : '1015px',
    //         height: isMobile ? '70vh' : '490px',
    //         panelClass: 'custom-dialog-class', // Add a custom class for further styling
    //         position: isMobile ? { bottom: '0' } : undefined // Position from bottom for mobile view
    //     });
    // }

    onLogin(form: NgForm) {
        if (form.invalid) {
            return;
        }
        this.isLoading = true;
        this.authService.login(form.value.email, form.value.password);
    }

    ngOnDestroy() {
        this.authStatusSub.unsubscribe();
    }
}