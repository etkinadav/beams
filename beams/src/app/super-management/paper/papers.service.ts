import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Subject } from "rxjs";
import { map } from "rxjs/operators";
import { Router } from "@angular/router";

import { environment } from "src/environments/environment";
import { Paper } from "./paper.model";
import { Observable } from 'rxjs';

const BACKEND_URL = environment.apiUrl + "/papers/";

@Injectable({
  providedIn: "root"
})

export class PapersService {
  private papers: Paper[] = [];
  private papersUpdated = new Subject<{ papers: Paper[], paperCount: number }>();

  constructor(private http: HttpClient, private router: Router) { }

  getPapers(papersPerPage: number, currentPage: number) {
    const queryParams = `?pagesize=${papersPerPage}&page=${currentPage}`;
    this.http
      .get<{ message: string; papers: any, maxPapers: number }>(BACKEND_URL + queryParams)
      .pipe(
        map(paperData => {
          return {
            papers: paperData.papers.map(paper => {
              return {
                id: paper._id,
                paperName: paper.paperName,
                paperWidth: paper.paperWidth,
                paperHeight: paper.paperHeight,
                paperWeight: paper.paperWeight,
                paperPrinterCode: paper.paperPrinterCode,
                paperPrinterQuality: paper.paperPrinterQuality,
                isExpress: paper.isExpress,
                isPlotter: paper.isPlotter,
                isPh: paper.isPh,
              };
            }),
            maxPapers: paperData.maxPapers
          };
        })
      )
      .subscribe(transformedPaperData => {
        this.papers = transformedPaperData.papers;
        this.papersUpdated.next({
          papers: [...this.papers],
          paperCount: transformedPaperData.maxPapers
        });
      });
  }

  getAllPapers(): Observable<any[]> {
    return this.http.get<{ message: string; papers: any[] }>(BACKEND_URL + '/allpapers')
      .pipe(
        map(paperData => {
          return paperData.papers.map(paper => ({
            id: paper._id,
            paper: paper,
          }));
        })
      );
  }

  getPaperUpdateListener() {
    return this.papersUpdated.asObservable();
  }

  getPaper(id: string) {
    return this.http.get<{
      _id: string,
      paperName: string,
      paperWidth: number,
      paperHeight: number,
      paperWeight: number,
      paperPrinterCode: string,
      paperPrinterQuality: number,
      isExpress: boolean,
      isPlotter: boolean,
      isPh: boolean,
    }>(
      BACKEND_URL + id
    );
  }

  addPaper(
    paperName: string,
    paperWidth: Number,
    paperHeight: Number,
    paperWeight: Number,
    paperPrinterCode: string,
    paperPrinterQuality: Number,
    isExpress: boolean,
    isPlotter: boolean,
    isPh: boolean,
  ) {
    const paperData = {
      paperName: paperName,
      paperWidth: paperWidth,
      paperHeight: paperHeight,
      paperWeight: paperWeight,
      paperPrinterCode: paperPrinterCode,
      paperPrinterQuality: paperPrinterQuality,
      isExpress: isExpress,
      isPlotter: isPlotter,
      isPh: isPh,
    };
    console.log("paperData!!!");
    console.log(paperData);
    this.http
      .post<{ message: string; paper: Paper }>(
        BACKEND_URL,
        paperData
      )
      .subscribe(responseData => {
        this.router.navigate(["/paperlist"]);
      });
  }

  updatePaper(
    id: string,
    paperName: string,
    paperWidth: Number,
    paperHeight: Number,
    paperWeight: Number,
    paperPrinterCode: string,
    paperPrinterQuality: Number,
    isExpress: boolean,
    isPlotter: boolean,
    isPh: boolean,
  ) {
    const paperData = {
      id: id,
      paperName: paperName,
      paperWidth: paperWidth,
      paperHeight: paperHeight,
      paperWeight: paperWeight,
      paperPrinterCode: paperPrinterCode,
      paperPrinterQuality: paperPrinterQuality,
      isExpress: isExpress,
      isPlotter: isPlotter,
      isPh: isPh,
    };
    this.http
      .put(BACKEND_URL + id, paperData)
      .subscribe(response => {
        this.router.navigate(["/paperlist"]);
      });
  }

  deletePaper(paperId: string) {
    return this.http
      .delete(BACKEND_URL + paperId)
  }
}