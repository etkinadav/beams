import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs/operators";

import { environment } from "src/environments/environment";
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const BACKEND_URL = environment.apiUrl + "/orders/";

@Injectable({
    providedIn: "root"
})

export class OrdersService {

    constructor(
        private http: HttpClient,
    ) { }

  // [express]
  createExpressOrder(
    files: any[],
    branchID: string,
    printerID: string,
  ): Observable<any> {
    const url = `${BACKEND_URL}/createexpress`;
    const body = { files: files, branchID: branchID, printerID: printerID };
    return this.http.post(url, body);
  }
}
