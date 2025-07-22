import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Subject } from "rxjs";
import { environment } from "src/environments/environment";
import { Router, NavigationEnd } from '@angular/router';
import { Observable, Subscription, BehaviorSubject, ReplaySubject } from 'rxjs';

import { AuthData } from "./auth-data.model";
import { DialogService } from '../dialog/dialog.service';
import { DataSharingService } from '../main-section/data-shering-service/data-sharing.service';
import { DirectionService } from '../direction.service'
import { filter } from 'rxjs/operators';

import { UsersService } from '../super-management/user/users.service';
import { set } from "lodash";
// import { SocialAuthService } from "@abacritt/angularx-social-login";
// import { FacebookLoginProvider } from "@abacritt/angularx-social-login";
// import { GoogleLoginProvider } from "@abacritt/angularx-social-login";

const BACKEND_URL = environment.apiUrl + "/user/";

@Injectable({ providedIn: "root" })

export class AuthService {
    private isAuthenticated = false;
    private token: string;
    private tokenTimer: any;
    private userId: string;
    private authStatusListener = new Subject<boolean>();
    private branchSubscription: Subscription;
    private printServiceSubscription: Subscription;
    printingService: string = '';
    branch: string = '';
    private rolesSubject = new ReplaySubject<string[]>(1);
    public roles$ = this.rolesSubject.asObservable();
    private userNameSubject = new BehaviorSubject<string>('');
    public userName$ = this.userNameSubject.asObservable();
    private emailSubject = new BehaviorSubject<string>('');
    public email$ = this.emailSubject.asObservable();

    selectedLanguage: string = 'he';
    private authCompleted = new Subject<void>();
    isRightPlaceOpened: boolean = false;

    private user: any;
    private userUpdated = new Subject<any>();
    userUpdated$ = this.userUpdated.asObservable();

    constructor(
        private http: HttpClient,
        private dialogService: DialogService,
        private dataSharingService: DataSharingService,
        private router: Router,
        private directionService: DirectionService,
        private usersService: UsersService,
        // public socialService: SocialAuthService
    ) {
        this.branchSubscription = this.dataSharingService.getBranch().subscribe((value) => {
            this.branch = value;
        });

        this.printServiceSubscription = this.dataSharingService.getPrintingService().subscribe((value) => {
            this.printingService = value;
        });

        this.directionService.currentLanguage$.subscribe(lang => {
            this.selectedLanguage = lang;
            // console.log("selected---Lang---uage: 1" + this.selectedLanguage)
        });
    }

    getToken() {
        return this.token;
    }

    getIsAuth() {
        console.log("isAuthenticated: " + this.isAuthenticated)
        return this.isAuthenticated;
    }

    getUserId() {
        return this.userId;
    }

    getAuthStatusListener() {
        return this.authStatusListener.asObservable();
    }

    createUser(email: string, password: string, provider: string = 'local') {
        if (
            localStorage.getItem("printingService") &&
            localStorage.getItem("printingService") !== '' &&
            localStorage.getItem("branch") &&
            localStorage.getItem("branch") !== ''
        ) {
            this.printingService = localStorage.getItem("printingService");
            this.branch = localStorage.getItem("branch");
        }
        const authData: AuthData = {
            email: email,
            password: password,
            printingService: this.printingService,
            branch: this.branch,
            provider: provider,
            language: this.selectedLanguage
        };
        this.http
            .post<{
                token: string,
                expiresIn: number,
                userId: string,
                home_printingServices_list: string[],
                home_branches_list: string[],
                provider: string,
                language: string,
                roles: string[],
                userName: string,
                email: string,
            }>(BACKEND_URL + "/signup", authData).subscribe(response => {
                this.dialogService.onCloseLoginDialog();
                const token = response.token;
                this.token = token;
                if (token) {
                    const expiresInDuration = response.expiresIn;
                    this.setAuthTimer(expiresInDuration);
                    this.isAuthenticated = true;
                    this.userId = response.userId;
                    this.printingService = response.home_printingServices_list[0];
                    this.branch = response.home_branches_list[0];
                    this.authStatusListener.next(true);
                    const now = new Date();
                    const expirationDate = new Date(now.getTime() + expiresInDuration * 1000);
                    this.rolesSubject.next(response.roles);
                    this.saveAuthData(
                        token,
                        expirationDate,
                        response.userId,
                        response.home_printingServices_list[0],
                        response.home_branches_list[0],
                        response.language,
                        response.roles,
                        response.userName,
                        response.email,
                    );
                    this.dialogService.onCloseLoginDialog();
                }
                if (this.printingService && this.printingService !== '' && this.branch && this.branch !== '') {
                    this.dataSharingService.setPrintingService(this.printingService);
                    this.dataSharingService.setBranch(this.branch);
                    this.router.navigate(["/print"]);
                }
            }, error => {
                this.authStatusListener.next(false)
            });
    }

    checkEmail(email: string): Observable<any> {
        const enteredEmail = email;
        return this.http.post<boolean>(BACKEND_URL + "/checkemail", { email: enteredEmail });
    }

    facebookLogin() {
        this.setIsFromSocial();
        this.http.get(BACKEND_URL + "/auth/facebook").subscribe(response => {
            window.location.href = response['url'];
            this.triggerAuthComplete();
        })
    }

    googleLogin() {
        this.setIsFromSocial();
        this.http.get(BACKEND_URL + "/auth/google").subscribe(response => {
            window.location.href = response['url'];
            this.triggerAuthComplete();
        })
    }

    setIsFromSocial() {
        const service = localStorage.getItem("printingService");
        const branch = localStorage.getItem("branch");
        if (service && service !== '' && branch && branch !== '') {
            localStorage.setItem("isfromSocial", "true");
        } else {
            localStorage.setItem("isfromSocial", "false");
        }
    }

    login(email: string, password: string, provider: string = 'local') {
        let newPrintingService = '';
        let newBranch = '';
        if (
            localStorage.getItem("printingService") &&
            localStorage.getItem("printingService") !== '' &&
            localStorage.getItem("branch") &&
            localStorage.getItem("branch") !== ''
        ) {
            newPrintingService = localStorage.getItem("printingService");
            newBranch = localStorage.getItem("branch");
        }
        const authData: AuthData = {
            email: email,
            password: password,
            printingService: newPrintingService,
            branch: newBranch,
            provider: provider,
            language: '',
        };
        this.http
            .post<{
                token: string,
                expiresIn: number,
                userId: string,
                home_printingServices_list: string[],
                home_branches_list: string[],
                provider: string,
                language: string,
                roles: string[],
                userName: string,
                email: string,
            }>
            (BACKEND_URL + "/login", authData)
            .subscribe(response => {
                const token = response.token;
                this.token = token;
                if (token) {
                    const expiresInDuration = response.expiresIn;
                    this.setAuthTimer(expiresInDuration);
                    this.isAuthenticated = true;
                    this.userId = response.userId;
                    this.printingService = response.home_printingServices_list[0];
                    this.branch = response.home_branches_list[0];
                    if (
                        localStorage.getItem("printingService") &&
                        localStorage.getItem("printingService") !== '' &&
                        localStorage.getItem("branch") &&
                        localStorage.getItem("branch") !== ''
                    ) {
                        this.printingService = localStorage.getItem("printingService");
                        this.branch = localStorage.getItem("branch");
                    }
                    this.authStatusListener.next(true);
                    const now = new Date();
                    const expirationDate = new Date(now.getTime() + expiresInDuration * 1000);
                    this.rolesSubject.next(response.roles);
                    this.saveAuthData(
                        token,
                        expirationDate,
                        response.userId,
                        this.printingService,
                        this.branch,
                        response.language,
                        response.roles,
                        response.userName,
                        response.email,
                    );
                    if (response.language && response.language !== '') {
                        this.directionService.toLanguageDirection(response.language);
                    }
                    this.dialogService.onCloseLoginDialog();
                    if (newBranch !== '' && newPrintingService !== '') {
                        this.dataSharingService.setPrintingService(newPrintingService);
                        this.dataSharingService.setBranch(newBranch);
                        this.router.navigate(["/print"]);
                    } else {
                        if (this.printingService && this.printingService !== '' && this.branch && this.branch !== '') {
                            this.dataSharingService.setPrintingService(this.printingService);
                            this.dataSharingService.setBranch(this.branch);
                            this.dialogService.onOpenRightPlaceDialog();
                        }
                    }
                    this.triggerAuthComplete();
                    this.updateUser(null);
                }
            }, error => {
                this.authStatusListener.next(false);
            });
    }

    triggerAuthComplete() {
        this.authCompleted.next();
    }

    autoAuthUser() {
        const authInformation = this.getAuthData();
        if (!authInformation) {
            return;
        }
        const now = new Date();
        const expiresIn = authInformation.expirationDate.getTime() - now.getTime();
        if (expiresIn > 0) {
            this.token = authInformation.token;
            this.isAuthenticated = true;
            this.userId = authInformation.userId;
            this.setAuthTimer(expiresIn / 1000);
            this.authStatusListener.next(true);
            this.rolesSubject.next(authInformation.roles);
            if (authInformation.language || authInformation.language === '') {
                this.directionService.toLanguageDirection(authInformation.language);
                // console.log("selected---Lang---uage: 2" + authInformation.language);
                // setTimeout(() => {
                //     this.directionService.toLanguageDirection(authInformation.language);
                //     // console.log("selected---Lang---uage: 8" + authInformation.language);
                // }, 3000);
            }
            if (authInformation.printingService && authInformation.printingService !== '' &&
                authInformation.branch && authInformation.branch !== '') {
                this.router.events.pipe(
                    filter(event => event instanceof NavigationEnd)
                ).subscribe((event: NavigationEnd) => {
                    const isfromSocial = localStorage.getItem("isfromSocial");
                    if ((event.urlAfterRedirects === '/' ||
                        event.urlAfterRedirects === '/branch') &&
                        !this.isRightPlaceOpened) {
                        if (!isfromSocial || isfromSocial === '' || isfromSocial === "false") {
                            console.log("onOpenRightPlaceDialog1")
                            this.dialogService.onOpenRightPlaceDialog();
                        }
                    }
                    this.isRightPlaceOpened = true;
                    if (isfromSocial && isfromSocial !== '') {
                        this.printingService = localStorage.getItem("printingService");
                        this.branch = localStorage.getItem("branch");
                        if (this.printingService && this.printingService !== '' && this.printingService !== 'null'
                            && this.branch && this.branch !== '' && this.branch !== 'null') {
                            this.usersService.updateUserPlaceAsync(this.printingService, this.branch).subscribe(() => {
                                this.dataSharingService.setPrintingService(this.printingService);
                                this.dataSharingService.setBranch(this.branch);
                            });
                        }
                        localStorage.removeItem("isfromSocial");
                    }
                });
            }
            this.triggerAuthComplete();
        }
        this.userNameSubject.next(authInformation.userName);
        this.emailSubject.next(authInformation.email);
    }

    getAuthCompletedListener() {
        return this.authCompleted.asObservable();
    }

    logout(): Promise<void> {
        return new Promise((resolve) => {
            this.token = null;
            this.isAuthenticated = false;
            this.authStatusListener.next(false);
            this.userId = null;
            this.printingService = '';
            this.branch = '';
            clearTimeout(this.tokenTimer);
            this.clearAuthData();
            this.dataSharingService.setPrintingService('');
            this.dataSharingService.setBranch('');
            this.rolesSubject.next([]);
            this.userNameSubject.next('');
            this.user = null;
            this.userUpdated.next(this.user);
            this.updateUser(null);
            this.router.navigate(["/"]).then(() => {
                resolve();
            });
        });
    }

    private setAuthTimer(duration: number) {
        console.log("setting timer: " + duration)
        this.tokenTimer = setTimeout(() => {
            this.logout();
            this.dialogService.onCloseRightPlaceDialog();
            this.dialogService.onOpenLoginDialog('', '');
        }, duration * 1000)
    }

    saveAuthData(
        token: string,
        expirationDate: Date,
        userId: string,
        printingService: string,
        branch: string,
        language: string,
        roles: string[],
        userName: string,
        email: string,
    ) {
        localStorage.setItem("token", token);
        localStorage.setItem("expiration", expirationDate.toISOString());
        localStorage.setItem("userId", userId);
        localStorage.setItem("printingService", printingService);
        localStorage.setItem("branch", branch);
        localStorage.setItem("language", language);
        localStorage.setItem("roles", JSON.stringify(roles));
        localStorage.setItem("userName", userName);
        localStorage.setItem("email", email);

        this.userNameSubject.next(userName);
    }

    private clearAuthData() {
        localStorage.removeItem("token");
        localStorage.removeItem("expiration");
        localStorage.removeItem("userId");
        localStorage.removeItem("printingService");
        localStorage.removeItem("branch");
        localStorage.removeItem("language");
        localStorage.removeItem("roles");
        localStorage.removeItem("userName");
        localStorage.removeItem("email");
        localStorage.removeItem("isfromSocial");
        localStorage.removeItem("lastPrintingService");
        localStorage.removeItem("lastBranch");
    }

    updateAuthData(printingService: string, branch: string) {
        localStorage.removeItem("printingService");
        localStorage.removeItem("branch");
        localStorage.setItem("printingService", printingService);
        localStorage.setItem("branch", branch);
    }

    private getAuthData() {
        const token = localStorage.getItem("token");
        const expirationDate = localStorage.getItem("expiration");
        const userId = localStorage.getItem("userId");
        const printingService = localStorage.getItem("printingService");
        const branch = localStorage.getItem("branch");
        const language = localStorage.getItem("language");
        const roles = JSON.parse(localStorage.getItem("roles"));
        const userName = localStorage.getItem("userName");
        const email = localStorage.getItem("email");
        if (!token || !expirationDate) {
            return false;
        }
        return {
            token: token,
            expirationDate: new Date(expirationDate),
            userId: userId,
            printingService: printingService,
            branch: branch,
            language: language,
            roles: roles,
            userName: userName,
            email: email,
        }
    }

    updateUser(user: any) {
        this.user = user;
        this.userUpdated.next(this.user);
    }
}
