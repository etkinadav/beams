import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs/operators";

import { environment } from "src/environments/environment";
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const BACKEND_URL = environment.apiUrl + "/files/";

@Injectable({
    providedIn: "root"
})

export class FilesService {
    private files: any[] = [];

    constructor(
        private http: HttpClient,
    ) { }

    // [plotter]
    getUserFiles(
        userId: string,
        printerId: string
    ): Observable<any[]> {
        return this.http
            .get<{ message: string; files: any[] }>(`${BACKEND_URL}/filesforuser/${printerId}/${userId}`)
            .pipe(
                map(filesData => {
                    return [...filesData.files];
                })
            );
    }

    // [express]
    getUserFilesExpress(
        userId: string,
    ): Observable<any[]> {
        return this.http
            .get<{ message: string; files: any[] }>(`${BACKEND_URL}/filesforuserexpress/${userId}`)
            .pipe(
                map(filesData => {
                    return [...filesData.files];
                })
            );
    }

    // [plotter]
    updateFileSettings(
        fileId: string,
        imageId: number,
        newPrintSettings: object
    ): Observable<any> {
        const url = `${BACKEND_URL}/updatefilesettings/${fileId}`;
        const body = { printSettings: newPrintSettings, imageId: imageId };
        return this.http.put(url, body);
    }

    // [express]
    updateFileSettingsExpress(
        fileId: string,
        newPrintSettings: object,
        printerID: string,
    ): Observable<any> {
        const url = `${BACKEND_URL}/updatefilesettingsexpress/${fileId}`;
        const body = { printSettings: newPrintSettings, printerID: printerID };
        return this.http.put(url, body);
    }

    // [express]
    clearFileSettingsExpress(
        userId: string,
    ): Observable<any> {
        const url = `${BACKEND_URL}/clearfilesettingsexpress/${userId}`;
        const body = {};
        return this.http.put(url, body);
    }

    // [plotter]
    deleteFile(currentFile: any, serverAddress: string) {
        const url = serverAddress + `/api/files/delete/${currentFile._id}`;
        return this.http.delete(url);
    }
    // [express]
    deleteFileExpress(currentFile: any, serverAddress: string) {
        const url = serverAddress + `/api/files/delete/${currentFile._id}`;
        return this.http.delete(url);
    }

    // [plotter]
    deleteImage(currentFile: any, currentImage: any, serverAddress: string) {
        const url = serverAddress + `/api/files/delete/${currentFile._id}/${currentImage._id}`;
        return this.http.delete(url);
    }
    // [express]
    deleteImageExpress(currentFile: any, currentImage: any, serverAddress: string) {
        const url = serverAddress + `/api/files/delete/${currentFile._id}/${currentImage._id}`;
        return this.http.delete(url);
    }

    // [plotter]
    deleteAllFiles(userId: string, serverAddress: string) {
        const url = `${BACKEND_URL}/deleteallfiles/${userId}`;
        return this.http.delete(url);
    }
    // [express]
    deleteAllFilesExpress(userId: string, serverAddress: string) {
        const url = `${BACKEND_URL}/deleteallfilesexpress/${userId}`;
        return this.http.delete(url);
    }

    // [plotter]
    applyToAll(
        printerId: string,
        newPrintSettings: object
    ): Observable<any> {
        const userId = localStorage.getItem("userId");
        const body = { printSettings: newPrintSettings };
        const url = `${BACKEND_URL}/applytoall/${userId}/${printerId}`;
        return this.http.put(url, body).pipe(
            tap(updatedFiles => {
                // Assuming this.files is your local state that holds the files
                this.files = updatedFiles;
            })
        );
    }
    // [express]
    applyToAllExpress(
        newPrintSettings: object,
        printerID: string,
    ): Observable<any> {
        const userId = localStorage.getItem("userId");
        const body = { printSettings: newPrintSettings, printerID: printerID };
        const url = `${BACKEND_URL}/applytoallexpress/${userId}`;
        return this.http.put(url, body).pipe(
            tap(updatedFiles => {
                this.files = updatedFiles;
            })
        );
    }
}
