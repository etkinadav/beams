import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { environment } from "../../environments/environment";

const BACKEND_URL = environment.apiUrl + "/landbot/";

export interface LandbotMessageRequest {
  userId: string;
  staticField?: string;
  message: string;
}

export interface LandbotMessageResponse {
  requestId?: string;
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  details?: any;
  hint?: string;
}

@Injectable({
  providedIn: "root"
})
export class LandbotService {
  constructor(private http: HttpClient) { }

  sendMessage(request: LandbotMessageRequest): Observable<LandbotMessageResponse> {
    const url = BACKEND_URL + "send";
    
    // Note: withCredentials is NOT needed because backend uses JWT tokens via Authorization header,
    // not cookie-based sessions. If backend switches to cookies, add: { withCredentials: true }
    return this.http.post<LandbotMessageResponse>(url, request).pipe(
      catchError((error: HttpErrorResponse) => {
        const debugObject = {
          timestamp: new Date().toISOString(),
          environment: {
            origin: window.location.origin,
            userAgent: navigator.userAgent
          },
          request: {
            method: 'POST',
            url: url,
            bodyKeys: Object.keys(request || {}),
            bodySize: JSON.stringify(request).length
          },
          response: {
            status: error.status,
            statusText: error.statusText,
            errorBody: error.error,
            headers: error.headers ? Object.fromEntries(
              Object.entries(error.headers).filter(([key]) => 
                !key.toLowerCase().includes('authorization') && !key.toLowerCase().includes('token')
              )
            ) : null
          },
          error: {
            message: error.message,
            name: error.name
          },
          requestId: error.error?.requestId || null
        };
        
        console.log("FULL-LOG", JSON.stringify(debugObject, null, 2));
        return throwError(() => error);
      })
    );
  }
}

