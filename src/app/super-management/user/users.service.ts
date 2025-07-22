import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { EMPTY, Observable, Subject, of, throwError } from "rxjs";
import { map } from "rxjs/operators";
import { Router } from "@angular/router";

import { environment } from "src/environments/environment";
import { User } from "./user.model";
import { DirectionService } from "src/app/direction.service";

const BACKEND_URL = environment.apiUrl + "/user/";

@Injectable({
  providedIn: "root"
})

export class UsersService {
  private users: User[] = [];
  private usersUpdated = new Subject<{ users: User[], userCount: number }>();
  phoneUpdated = new Subject<number>();
  phone: number;

  private usersUpdatedSource = new Subject<void>();
  usersUpdated$ = this.usersUpdatedSource.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private directionService: DirectionService
  ) { }

  getUsers(usersPerPage: number, currentPage: number) {
    const queryParams = `?pagesize=${usersPerPage}&page=${currentPage}`;
    this.http
      .get<{ message: string; users: any, maxUsers: number }>(BACKEND_URL + queryParams)
      .pipe(
        map(userData => {
          return {
            users: userData.users.map(user => {
              return {
                id: user._id,
                email: user.email,
                printingService: user.printingService,
                branch: user.branch,
                provider: user.provider,
                language: user.language,
                home_printingServices_list: user.home_printingServices_list,
                home_branches_list: user.home_branches_list
              };
            }),
            maxUsers: userData.maxUsers
          };
        })
      )
      .subscribe(transformedUserData => {
        this.users = transformedUserData.users;
        this.usersUpdated.next({
          users: [...this.users],
          userCount: transformedUserData.maxUsers
        });
      });
  }

  getUsersForManager(usersPerPage: number, currentPage: number, searchValue: string) {
    console.log("searchValue: ", searchValue);
    const queryParams = `?pagesize=${usersPerPage}&page=${currentPage}&search=${searchValue}`;
    this.http
      .get<{ message: string; users: any, maxUsers: number }>(BACKEND_URL + queryParams)
      .pipe(
        map(userData => {
          return {
            users: userData.users.map(user => {
              return {
                user
              };
            }),
            maxUsers: userData.maxUsers
          };
        })
      )
      .subscribe(transformedUserData => {
        this.users = transformedUserData.users;
        this.usersUpdated.next({
          users: [...this.users],
          userCount: transformedUserData.maxUsers
        });
      });
  }

  getUserUpdateListener() {
    return this.usersUpdated.asObservable();
  }

  getUser(id: string) {
    return this.http.get<{
      _id: string,
      email: string,
      printingService: string,
      branch: string[],
      provider: string[],
      language: string,
      home_printingServices_list: string[],
      home_branches_list: string[],
    }>(
      BACKEND_URL + id
    );
  }

  updateUserPlace(printingService: string, branch: string): Observable<{ message: string; home_printingServices_list: any[]; home_branches_list: any[] }> {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      return throwError('User ID not found in localStorage');
    }
    const userData = {
      id: userId,
      printingService: String(printingService),
      branch: String(branch)
    };
    return this.http.put<{ message: string; home_printingServices_list: any[]; home_branches_list: any[] }>(BACKEND_URL + userId, userData);
  }

  updateUserPlaceAsync(printingService: string, branch: string): Observable<any> {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      return EMPTY;
    }
    const userData = {
      id: userId,
      printingService: String(printingService),
      branch: String(branch)
    };
    return this.http.put(BACKEND_URL + userId, userData);
  }

  updateUserLanguage(language: string) {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      return;
    }
    localStorage.removeItem("language");
    localStorage.setItem("language", language);
    const userData = {
      id: userId,
      language: String(language),
    };
    this.http
      .put(BACKEND_URL + "language/" + userId, userData)
      .subscribe(response => {
      });
  }

  updateUserManagement(id: string, email: string, provider: string, language: string, isBMBranches: string[], isSU: boolean) {
    const userData = {
      id: id,
      email: email,
      provider: provider,
      language: language,
      isBMBranches: isBMBranches,
      isSU: isSU
    };
    this.http
      .put(BACKEND_URL + "usermanagement/" + id, userData)
      .subscribe(response => {
        this.router.navigate(["/userlist"]);
      });
  }

  updateUserProfile(
    id: string,
    displayName: string,
    email: string,
    phone: string
  ): Observable<any> {
    const userData = {
      id: id,
      displayName: displayName,
      email: email,
      phone: phone,
    };
    return this.http.put(BACKEND_URL + "userprofile/" + id, userData);
  }

  updateUserProfileManiger(
    id: string,
    displayName: string,
    email: string,
    phone: string,
    discount: number,
    roles: string[],
  ): Observable<any> {
    const userData = {
      id: id,
      displayName: displayName,
      email: email,
      phone: phone,
      discount: discount,
      roles: roles,
    };
    return this.http.put(BACKEND_URL + "userprofilemaniger/" + id, userData);
  }

  updateUserPhone(
    id: string,
    phone: string
  ): Observable<any> {
    const userData = {
      id: id,
      phone: phone,
    };
    return this.http.put(BACKEND_URL + "userphone/" + id, userData);
  }

  updateUserCC(
    id: string,
    cc: object
  ): Observable<any> {
    const userData = {
      id: id,
      cc: cc,
    };
    return this.http.put(BACKEND_URL + "usercc/" + id, userData);
  }

  deleteUserCC(
    id: string,
    cc: object,
  ): Observable<any> {
    const userData = {
      id: id,
      cc: cc,
    };
    return this.http.put(BACKEND_URL + "usercc/delete/" + id, userData);
  }

  deleteUserCCManiger(
    id: string,
  ): Observable<any> {
    const userData = {
      id: id,
    };
    return this.http.put(BACKEND_URL + "deleteuserccmaniger/" + id, userData);
  }

  updatePhone(phone: number) {
    this.phone = phone;
    this.phoneUpdated.next(this.phone);
  }

  deleteUser(userId: string) {
    return this.http
      .delete(BACKEND_URL + userId)
  }

  onAddUserPoints(userId: string, action: string, points: number): Observable<any> {
    console.log("onAddUserPoints: ", userId, action, points);
    const url = BACKEND_URL + "update-points/" + userId;
    return this.http.post(url, { action, points });
  }

  emitusersUpdated() {
    this.usersUpdatedSource.next();
    console.log("emitusersUpdated");
  }
  // ===========
}
