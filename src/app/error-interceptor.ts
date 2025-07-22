import {
  HttpErrorResponse,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from "@angular/common/http";
import { catchError } from "rxjs/operators";
import { throwError, of } from "rxjs";
import { Injectable } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ErrorComponent } from "./error/error.component";
import { AuthService } from "./auth/auth.service";
// import { TranslateService } from '@ngx-translate/core';


@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(
        private dialog: MatDialog,
        private authService: AuthService,
        // private translationService: TranslateService,
    ) { }

    intercept(req: HttpRequest<any>, next: HttpHandler) {
        return next.handle(req).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 0 && error.statusText === 'Unknown Error') {
                  console.error('Ignored error:', error);
                  return of(null); // Ignore the error and return null
                }

                let errorMessage = "unknowen_error"
                if (error.error.message) {
                    errorMessage = error.error.message;
                }
                if (errorMessage === 'Check_auth-Auth-Faild-token-incorrect-privite') {
                    this.authService.logout();
                } else {
                    this.dialog.open(
                        ErrorComponent,
                        {
                            data: { message: errorMessage },
                            panelClass: 'zx-login-dialog'
                        },
                    );
                }
                return throwError(error);
            })
        );
    }
}
