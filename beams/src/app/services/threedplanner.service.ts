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

export interface Machine {
  id: string;
  filename: string;
  originalName: string;
  fileType: string;
  name: string;
  machineNumber: number;
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

  getMachines(): Observable<{ success: boolean; machines: Machine[] }> {
    const url = BACKEND_URL + "machines";
    console.log('🔵 [3D Planner Service] GET request:', url);
    return this.http.get<{ success: boolean; machines: Machine[] }>(url);
  }

  uploadMachine(file: File, name: string): Observable<{ success: boolean; message: string; machine: Machine }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    const url = BACKEND_URL + "machines";
    
    console.log('🔵 [3D Planner Service] POST request:', url);
    console.log('📤 [3D Planner Service] Machine upload:', {
      name: name,
      fileName: file.name,
      size: file.size,
      type: file.type
    });
    
    return this.http.post<{ success: boolean; message: string; machine: Machine }>(
      url,
      formData
    );
  }

  deleteMachine(machineId: string): Observable<{ success: boolean; message: string }> {
    const url = BACKEND_URL + "machines/" + machineId;
    console.log('🔵 [3D Planner Service] DELETE request:', url);
    return this.http.delete<{ success: boolean; message: string }>(url);
  }

  addMachineConfig(machineId: string, pointX: number, pointY: number, pointZ: number, corner: number): Observable<{ success: boolean; message: string; config: any }> {
    const url = BACKEND_URL + "machine-config";
    const body = {
      machineId: machineId,
      pointX: pointX,
      pointY: pointY,
      pointZ: pointZ,
      corner: corner
    };
    
    console.log('🔵 [3D Planner Service] POST request:', url);
    console.log('📤 [3D Planner Service] Machine config:', body);
    
    return this.http.post<{ success: boolean; message: string; config: any }>(url, body);
  }

  getMachineConfigs(): Observable<{ success: boolean; configs: any[] }> {
    const url = BACKEND_URL + "machine-config";
    console.log('🔵 [3D Planner Service] GET request:', url);
    return this.http.get<{ success: boolean; configs: any[] }>(url);
  }

  deleteMachineConfig(configId: string): Observable<{ success: boolean; message: string }> {
    const url = BACKEND_URL + "machine-config/" + configId;
    console.log('🔵 [3D Planner Service] DELETE request:', url);
    return this.http.delete<{ success: boolean; message: string }>(url);
  }
}

