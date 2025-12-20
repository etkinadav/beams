import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
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
    console.log('📤 [Landbot Service] Request data:', request);
    
    return this.http.post<LandbotMessageResponse>(url, request);
  }
}

