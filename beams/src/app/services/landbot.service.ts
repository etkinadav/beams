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
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  details?: any;
}

@Injectable({
  providedIn: "root"
})
export class LandbotService {
  constructor(private http: HttpClient) { }

  sendMessage(request: LandbotMessageRequest): Observable<LandbotMessageResponse> {
    const url = BACKEND_URL + "send";
    console.log('🔵 [Landbot Service] POST request:', url);
    console.log('📤 [Landbot Service] Request data:', {
      userId: request.userId,
      staticField: request.staticField ? '[REDACTED]' : undefined,
      message: request.message
    });
    
    return this.http.post<LandbotMessageResponse>(url, request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('❌ [Landbot Service] HTTP Error:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error
        });
        console.error('❌ [Landbot Service] Full error response:', error.error);
        return throwError(() => error);
      })
    );
  }
}

