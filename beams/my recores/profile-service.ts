import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Subject } from "rxjs";
import { Router } from "@angular/router";

import { environment } from "src/environments/environment";

const BACKEND_URL = environment.apiUrl + "/orders/";

@Injectable({ providedIn: "root" })
export class ProfileService {
  constructor() { }
}
