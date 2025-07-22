import { Injectable } from "@angular/core";
import { HttpClient, HttpParams, HttpErrorResponse } from "@angular/common/http";
import { Subject, Observable, of } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { Router } from "@angular/router";

import { environment } from "src/environments/environment";

const BACKEND_URL = environment.apiUrl + "/products/";

@Injectable({
  providedIn: "root"
})

export class ProductsService {
  private products: any[] = [];
  private productsUpdated = new Subject<{ products: any[], productCount: number }>();

  constructor(private http: HttpClient, private router: Router) { }

  getProducts(productsPerPage: number, currentPage: number) {
    const queryParams = `?pagesize=${productsPerPage}&page=${currentPage}`;
    this.http
      .get<{ message: string; products: any, maxProducts: number }>(BACKEND_URL + queryParams)
      .pipe(
        map(productData => {
          return {
            products: productData.products.map(product => {
              return {
                id: product._id,
                products: product,
              };
            }),
            maxProducts: productData.maxProducts
          };
        })
      )
      .subscribe(transformedProductData => {
        this.products = transformedProductData.products;
        this.productsUpdated.next({
          products: [...this.products],
          productCount: transformedProductData.maxProducts
        });
      });
  }

  getAllProducts(): Observable<any[]> {
    return this.http
      .get<{ message: string; products: any[] }>(BACKEND_URL + '/allproducts')
      .pipe(
        map(productData => {
          return [...productData.products];
        })
      );
  }

  // getQueData(printingService: string, productIdArray: string[]) {
  //   return this.http.get<{
  //     message: string,
  //     fetchedProducts: any,
  //   }>(BACKEND_URL + '/quedata/' + printingService + '/' + productIdArray)
  //     .pipe(
  //       catchError((error: HttpErrorResponse) => {
  //         if (error.status === 0 && error.statusText === 'Unknown Error') {
  //           console.error('Ignored error:', error);
  //           return of(null); // return an Observable of null if you want to ignore the error
  //         }
  //         console.error("error thrown:", error);
  //         throw error; // rethrow the error if it's not the one you want to ignore
  //       })
  //     );
  // }

  getProductUpdateListener() {
    return this.productsUpdated.asObservable();
  }

  getProductById(product: string): Observable<any> {
    return this.http
      .get<any>(BACKEND_URL + '/productbyid/' + product)
      .pipe(
        catchError(error => {
          console.error('Error fetching product:', error);
          throw error;
        })
      );
  }

  getProductByName(product: string): Observable<any> {
    return this.http
      .get<any>(BACKEND_URL + '/productbyname/' + product)
      .pipe(
        catchError(error => {
          console.error('Error fetching product:', error);
          throw error;
        })
      );
  }

  getProduct(id: string) {
    return this.http.get<{
      _id: string,
      name: string,
    }>(
      BACKEND_URL + id
    );
  }

  // onCheckProductStatus(service: string, product: string) {
  //   return this.http.get<{
  //     status: any,
  //   }>(
  //     BACKEND_URL + '/checkproductstatus/' + service + '/' + product
  //   );
  // }

  addProduct(
    name: string,
  ) {
    const productData = new FormData();
    productData.append("name", name);
    this.http
      .post<{ message: string; product: any }>(
        BACKEND_URL,
        productData
      )
      .subscribe(responseData => {
        this.router.navigate(["/productlist"]);
      });
  }

  updateProduct(
    id: string,
    name: string,
  ) {
    let productData: any | FormData;
    // if (typeof image === "object") {
    productData = new FormData();
    productData.append("id", id);
    productData.append("name", name);
    this.http
      .put(BACKEND_URL + id, productData)
      .subscribe(response => {
        this.router.navigate(["/productlist"]);
      });
  }

  deleteProduct(productId: string) {
    return this.http
      .delete(BACKEND_URL + productId)
  }

  // =======================================
}


