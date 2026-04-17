import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { AiPlaceSearchRequest, AiPlaceSearchResponse } from "../models/ai-place-search.model";

@Injectable({ providedIn: "root" })
export class AiPlaceSearchService {
  private readonly url = `${environment.apiUrl}/ai-place-search`;

  constructor(private http: HttpClient) {}

  search(body: AiPlaceSearchRequest): Observable<AiPlaceSearchResponse> {
    return this.http.post<AiPlaceSearchResponse>(this.url, body);
  }
}
