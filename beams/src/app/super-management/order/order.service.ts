import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Subject } from "rxjs";
import { map } from "rxjs/operators";
import { Router } from "@angular/router";

import { environment } from "src/environments/environment";
import { Order } from "./order.model";
import { Paper } from "../paper/paper.model";
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';

const BACKEND_URL = environment.apiUrl + "/branches/";

@Injectable({
  providedIn: "root"
})

export class BranchesService {
  private orders: Order[] = [];
  private orderUpdated = new Subject<{ orders: Order[], orderCount: number }>();

  constructor(private http: HttpClient, private router: Router) { }

  getOrdersByUserAndPlace(userId: string, printingService: string, branch: string): Observable<any[]> {
    const params = new HttpParams()
      .set('userId', userId)
      .set('printingService', printingService)
      .set('branch', branch);
    console.log("params");
    console.log(params);
    return this.http.get<{ message: string; orders: any[] }>(`${BACKEND_URL}/ordersbyuserandplace`, { params })
      .pipe(
        map(ordersData => {
          return ordersData.orders.map(order => ({
            id: order._id,
            created: order.created,
            print_sent: order.print_sent,
            isPlotter: order.isPlotter,
            isPh: order.isPh,
            orderLogo: order.orderLogo,
            papers: order.papers,
          }));
        })
      );
  }
}