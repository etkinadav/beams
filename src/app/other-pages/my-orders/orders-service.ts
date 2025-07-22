import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Subject, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Router } from "@angular/router";

import { environment } from "src/environments/environment";
import { set } from "mongoose";

const BACKEND_URL = environment.apiUrl + "/orders/";

@Injectable({ providedIn: "root" })
export class OrdersService {
  orders: any[] = [];
  private ordersUpdated = new Subject<{ orders: any[], orderCount: number }>();
  numOfPendingOrders: number = 0;
  private numOfPendingOrdersUpdated = new Subject<{ numOfPendingOrders: number }>();
  private orderDeleted = new Subject<void>();
  private reportUpdated = new Subject<{ data: any }>();

  constructor(private http: HttpClient, private router: Router) { }

  getOrders(ordersPerPage: number, currentPage: number, userId: string = null) {
    let id;
    if (userId) {
      id = userId;
    } else {
      id = localStorage.getItem('userId');
    }
    const queryParams = `?pagesize=${ordersPerPage}&page=${currentPage}`;
    this.http
      .get<{ message: string; orders: any, maxOrders: number }>(`${BACKEND_URL}/ordersforuser/${id}` + queryParams)
      .subscribe(orderData => {
        if (!orderData.orders) {
          return;
        }
        this.orders = orderData.orders;
        this.ordersUpdated.next({
          orders: [...this.orders],
          orderCount: orderData.maxOrders
        });
      });
  }

  getNumOfPendingOrders() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      return;
    }
    this.http
      .get<{ message: string; numOfPendingOrders: number }>(`${BACKEND_URL}/numofpendingorders/${userId}`)
      .subscribe(orderData => {
        if (!orderData.numOfPendingOrders) {
          return;
        }
        this.numOfPendingOrders = orderData.numOfPendingOrders;
        this.numOfPendingOrdersUpdated.next({
          numOfPendingOrders: this.numOfPendingOrders,
        });
      });
  }

  getPendingOrder(service: string, orderId: string):
    Observable<{
      message: string;
      orderData: any;
    }> {
    console.log('getPendingOrder is called with:', service, orderId);
    let serviceName;
    if (service === 'p') {
      serviceName = 'plotter';
    } else if (service === 'e') {
      serviceName = 'express';
    }
    return this.http.get<{
      message: string;
      orderData: any;
    }>(`${BACKEND_URL}/pendingorder/${serviceName}/${orderId}`);
  }

  getOrderUpdateListener() {
    return this.ordersUpdated.asObservable();
  }

  getNumOfPendingOrdersUpdateListener() {
    return this.numOfPendingOrdersUpdated.asObservable();
  }

  notifyOrderUpdated() {
    this.orderDeleted.next();
  }

  getOrderDeletedListener() {
    return this.orderDeleted.asObservable();
  }

  deleteOrder(
    service: string,
    userId: string,
    orderId: string,
    isSu: boolean = false
  ): Observable<any> {
    if (!isSu) {
      // user
      return this.http
        .put(`${BACKEND_URL}/deleteorder/${service}/${orderId}`, userId);
    } else {
      // su
      return this.http
        .put(`${BACKEND_URL}/deleteordersu/${service}/${orderId}`, userId);
    }
  }

  getOrdersForManager(service: string, branchId: string, ordersPerPage: number, currentPage: number) {
    const requestBody = { service, branchId, ordersPerPage, currentPage };
    this.http.post<{ message: string; orders: any, maxOrders: number }>(`${BACKEND_URL}/ordersformanager/${service}/${branchId}`, requestBody)
      .subscribe(orderData => {
        console.log('Response from server:', orderData);
        if (!orderData.orders) {
          return;
        }
        this.orders = orderData.orders;
        console.log('orders:', this.orders);
        this.ordersUpdated.next({
          orders: [...this.orders],
          orderCount: orderData.maxOrders
        });
      });
  }

  getReportData(service: string, branchId: string, month: number, year: number) {
    const requestBody = { service, branchId, month, year };
    this.http.post<{ message: string, reportData: any }>(`${BACKEND_URL}/reportdata/${service}/${branchId}/${month}/${year}`, requestBody)
      .subscribe((response) => {
        this.reportUpdated.next({ data: response.reportData });
      });
  }

  getReportDataUpdateListener(): Observable<{ data: any }> {
    return this.reportUpdated.asObservable();
  }

  // ====================
}
