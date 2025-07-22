import { HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { AuthService } from "./auth.service";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private authService: AuthService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler) {
        const authToken = this.authService.getToken();
        const printingService = localStorage.getItem('printingService');
        const branch = localStorage.getItem('branch');
        let headers = req.headers.set('Authorization', "Bearer " + authToken);

        // if (printingService && printingService !== "" && printingService !== null) {
        //     headers = headers.set('printingservice', printingService);
        // }

        // if (branch && branch !== "" && branch !== null) {
        //     headers = headers.set('branch', branch);
        // }

        // const authRequest = req.clone({ headers });
        let body = req.body;

        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
            body = {
                ...body,
                printingservice: printingService,
                branch: branch
            };
        }

        const authRequest = req.clone({ headers, body });

        return next.handle(authRequest);
    }
}

// OLD - before adding printingService and branch to the headers
// @Injectable()
// export class AuthInterceptor implements HttpInterceptor {
//     constructor(private authService: AuthService) { }

//     intercept(req: HttpRequest<any>, next: HttpHandler) {
//         const authToken = this.authService.getToken();
//         const authRequest = req.clone({
//             headers: req.headers.set('Authorization', "Bearer " + authToken)
//         });
//         return next.handle(authRequest);
//     }
// }