import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

const BACKEND_URL = environment.apiUrl + "/threedplanner/";

export interface BaseFile {
  id: string;
  filename: string;
  originalName: string;
  fileType: string;
  size: number;
  mimeType?: string;
  uploadedAt: string;
  downloadUrl: string;
}

@Injectable({
  providedIn: "root"
})
export class ThreedPlannerService {
  constructor(private http: HttpClient) { }

  getBaseFile(): Observable<{ success: boolean; baseFile: BaseFile | null }> {
    const url = BACKEND_URL + "base-file";
    console.log('🔵 [3D Planner Service] GET request:', url);
    return this.http.get<{ success: boolean; baseFile: BaseFile | null }>(url);
  }

  uploadBaseFile(file: File): Observable<{ success: boolean; message: string; baseFile: BaseFile }> {
    const formData = new FormData();
    formData.append('file', file);
    const url = BACKEND_URL + "base-file";
    
    console.log('🔵 [3D Planner Service] POST request:', url);
    console.log('📤 [3D Planner Service] FormData file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    return this.http.post<{ success: boolean; message: string; baseFile: BaseFile }>(
      url,
      formData
    );
  }
}

