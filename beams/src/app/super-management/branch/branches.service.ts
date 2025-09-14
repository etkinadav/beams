import { Injectable } from "@angular/core";
import { HttpClient, HttpParams, HttpErrorResponse } from "@angular/common/http";
import { Subject, Observable, of } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { Router } from "@angular/router";

import { environment } from "src/environments/environment";

const BACKEND_URL = environment.apiUrl + "/branches/";

@Injectable({
  providedIn: "root"
})

export class BranchesService {
  private branches: any[] = [];
  private branchesUpdated = new Subject<{ branches: any[], branchCount: number }>();

  constructor(private http: HttpClient, private router: Router) { }

  getBranches(branchesPerPage: number, currentPage: number) {
    const queryParams = `?pagesize=${branchesPerPage}&page=${currentPage}`;
    this.http
      .get<{ message: string; branches: any, maxBranches: number }>(BACKEND_URL + queryParams)
      .pipe(
        map(branchData => {
          return {
            branches: branchData.branches.map(branch => {
              return {
                id: branch._id,
                branches: branch,
              };
            }),
            maxBranches: branchData.maxBranches
          };
        })
      )
      .subscribe(transformedBranchData => {
        this.branches = transformedBranchData.branches;
        this.branchesUpdated.next({
          branches: [...this.branches],
          branchCount: transformedBranchData.maxBranches
        });
      });
  }

  getAllBranches(): Observable<any[]> {
    return this.http
      .get<{ message: string; branches: any[] }>(BACKEND_URL + '/allbranches')
      .pipe(
        map(branchData => {
          return [...branchData.branches];
        })
      );
  }

  getBranchScanningStatus(
    printerId: string,
    userId: string
  ): Observable<any> {
    return this.http.get<{
      message: string,
      scanningStatus: string,
    }>(BACKEND_URL + '/branchscanningstatus/' + printerId + '/' + userId);
  }

  getQueData(printingService: string, branchIdArray: string[]) {
    return this.http.get<{
      message: string,
      fetchedBranches: any,
    }>(BACKEND_URL + '/quedata/' + printingService + '/' + branchIdArray)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 0 && error.statusText === 'Unknown Error') {
            console.error('Ignored error:', error);
            return of(null); // return an Observable of null if you want to ignore the error
          }
          console.error("error thrown:", error);
          throw error; // rethrow the error if it's not the one you want to ignore
        })
      );
  }

  getBranchUpdateListener() {
    return this.branchesUpdated.asObservable();
  }

  getBranchById(service: string, branch: string): Observable<any> {
    return this.http
      .get<any>(BACKEND_URL + '/branchbyid/' + service + "/" + branch)
      .pipe(
        catchError(error => {
          console.error('Error fetching branch:', error);
          throw error;
        })
      );
  }

  getBranchByName(service: string, branch: string): Observable<any> {
    return this.http
      .get<any>(BACKEND_URL + '/branchbyname/' + service + "/" + branch)
      .pipe(
        catchError(error => {
          console.error('Error fetching branch:', error);
          throw error;
        })
      );
  }

  getBranch(id: string) {
    return this.http.get<{
      _id: string,
      serial_name: string,
      // ADD EDIT BRANCH PROPERTIES HERE 1:
      close: boolean,
      close_msg: string,
      domain: string,
      downgraded: boolean,
      email: string,
      hide: boolean,
      hotjarID: string,
      inform_slack_of_new_orders: boolean,
      location: string,
      name: string,
      short_name: string,
      slack_url: string,
      sort: number,
      printers: any[],
    }>(
      BACKEND_URL + id
    );
  }

  onCheckBranchStatus(service: string, branch: string) {
    return this.http.get<{
      status: any,
    }>(
      BACKEND_URL + '/checkbranchstatus/' + service + '/' + branch
    );
  }

  getBranchByUnique(unique: string) {
    return this.http.get<{
      branch: any,
    }>(
      BACKEND_URL + '/unique/' + unique
    );
  }

  addBranch(
    serial_name: string,
    // ADD EDIT BRANCH PROPERTIES HERE:
    close: boolean,
    close_msg: string,
    domain: string,
    downgraded: boolean,
    email: string,
    hide: boolean,
    hotjarID: string,
    inform_slack_of_new_orders: boolean,
    location: string,
    name: string,
    short_name: string,
    slack_url: string,
    sort: number,
    papers: any[],
  ) {
    const branchData = new FormData();
    branchData.append("serial_name", serial_name);
    // ADD EDIT BRANCH PROPERTIES HERE:
    branchData.append("close", String(close));
    branchData.append("close_msg", close_msg);
    branchData.append("domain", domain);
    branchData.append("downgraded", String(downgraded));
    branchData.append("email", email);
    branchData.append("hide", String(hide));
    branchData.append("hotjarID", hotjarID);
    branchData.append("inform_slack_of_new_orders", String(inform_slack_of_new_orders));
    branchData.append("location", location);
    branchData.append("name", name);
    branchData.append("short_name", short_name);
    branchData.append("slack_url", slack_url);
    branchData.append("sort", String(sort));
    branchData.append("papers", JSON.stringify(papers));
    this.http
      .post<{ message: string; branch: any }>(
        BACKEND_URL,
        branchData
      )
      .subscribe(responseData => {
        this.router.navigate(["/branchlist"]);
      });
  }

  updateBranch(
    id: string,
    serial_name: string,
    // ADD EDIT BRANCH PROPERTIES HERE:
    close: boolean,
    close_msg: string,
    domain: string,
    downgraded: boolean,
    email: string,
    hide: boolean,
    hotjarID: string,
    inform_slack_of_new_orders: boolean,
    location: string,
    name: string,
    short_name: string,
    slack_url: string,
    sort: number,
    papers: any[],
  ) {
    let branchData: any | FormData;
    // if (typeof image === "object") {
    branchData = new FormData();
    branchData.append("id", id);
    branchData.append("serial_name", serial_name);
    // ADD EDIT BRANCH PROPERTIES HERE:
    branchData.append("close", String(close));
    branchData.append("close_msg", close_msg);
    branchData.append("domain", domain);
    branchData.append("downgraded", String(downgraded));
    branchData.append("email", email);
    branchData.append("hide", String(hide));
    branchData.append("hotjarID", hotjarID);
    branchData.append("inform_slack_of_new_orders", String(inform_slack_of_new_orders));
    branchData.append("location", location);
    branchData.append("name", name);
    branchData.append("short_name", short_name);
    branchData.append("slack_url", slack_url);
    branchData.append("sort", String(sort));
    branchData.append("papers", JSON.stringify(papers));
    this.http
      .put(BACKEND_URL + id, branchData)
      .subscribe(response => {
        this.router.navigate(["/branchlist"]);
      });
  }

  deleteBranch(branchId: string) {
    return this.http
      .delete(BACKEND_URL + branchId)
  }

  onOpenOrCloseQueue(id: string, isOpen: boolean) {
    const branchData = { isOpen: isOpen };
    return this.http.put(BACKEND_URL + '/openorclosequeue/' + id, branchData);
  }

  onOpenOrCloseSlack(id: string, isOn: boolean) {
    const branchData = { isOn: isOn };
    return this.http.put(BACKEND_URL + '/openorcloseslack/' + id, branchData);
  }

  closeBranch(
    serice: string,
    branch: string,
    close_msg: string
  ) {
    const branchData = { close_msg: close_msg };
    return this.http.put(BACKEND_URL + '/closebranch/' + serice + '/' + branch, branchData);
  }

  openBranch(
    serice: string,
    branch: string
  ) {
    return this.http.put(BACKEND_URL + '/openbranch/' + serice + '/' + branch, null);
  }

  onUpdateInventory(
    branchId: string,
    inventory: any
  ) {
    const branchData = { inventory: inventory };
    return this.http.put(BACKEND_URL + '/updateinventory/' + branchId, branchData);
  }

  onReplaceBm(
    printingService: string,
    branchId: string,
    userId: string
  ) {
    const branchData = { userId: userId };
    return this.http.put(BACKEND_URL + '/replacebm/' + printingService + '/' + branchId, branchData);
  }

  onRemoveSt(
    printingService: string,
    branchId: string,
    userId: string
  ) {
    const branchData = { userId: userId };
    return this.http.put(BACKEND_URL + '/removest/' + printingService + '/' + branchId, branchData);
  }

  onAddSt(
    printingService: string,
    branchId: string,
    userId: string
  ) {
    const branchData = { userId: userId };
    return this.http.put(BACKEND_URL + '/addst/' + printingService + '/' + branchId, branchData);
  }

  onReplaceConsumable(
    printingService: string,
    branchId: string,
    type: string,
    consumable: string
  ) {
    const branchData = {
      type: type,
      consumable: consumable
    };
    return this.http.put(BACKEND_URL + '/replaceconsumable/' + printingService + '/' + branchId, branchData);
  }

  // =======================================
}


