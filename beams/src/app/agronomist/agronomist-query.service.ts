import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import {
  AgronomistQueryCreateResponse,
  AgronomistQueryGetResponse,
  AgronomistQueryPayload,
} from "./models/agronomist-query.model";

const BASE = `${environment.apiUrl}/agronomist-query`;

@Injectable({
  providedIn: "root",
})
export class AgronomistQueryService {
  constructor(private http: HttpClient) {}

  create(payload: AgronomistQueryPayload): Observable<AgronomistQueryCreateResponse> {
    return this.http.post<AgronomistQueryCreateResponse>(BASE + "/", payload);
  }

  getById(id: string): Observable<AgronomistQueryGetResponse> {
    return this.http.get<AgronomistQueryGetResponse>(`${BASE}/${id}`);
  }
}
