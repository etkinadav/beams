import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { BranchesService } from "../../super-management/branch/branches.service";

@Injectable({
  providedIn: 'root',
})
export class DataSharingService {
  branches: any[] = []; // Array to store fetched branches
  private printingServiceSubject: BehaviorSubject<string> = new BehaviorSubject<string>('');
  private branchSubject: BehaviorSubject<string> = new BehaviorSubject<string>('');
  private productSubject: BehaviorSubject<string> = new BehaviorSubject<string>('');

  constructor(
    private branchesService: BranchesService,
  ) { }

  setPrintingService(value: string): void {
    this.printingServiceSubject.next(value);
  }

  getPrintingService(): Observable<string> {
    return this.printingServiceSubject.asObservable();
  }

  setBranch(value: string): void {
    this.branchSubject.next(value);
  }

  getBranch(): Observable<string> {
    return this.branchSubject.asObservable();
  }

  setProduct(value: string): void {
    this.productSubject.next(value);
  }

  getProduct(): Observable<string> {
    return this.productSubject.asObservable();
  }

  async fetchAndTransformBranches(): Promise<{ name: string; systems: string[] }[]> {
    try {
      const pretransformedBranches = await this.branchesService.getAllBranches().toPromise();

      if (!pretransformedBranches || !Array.isArray(pretransformedBranches)) {
        return [];
      }

      const transformedBranches = pretransformedBranches.map(branch => {
        const systems: string[] = [];
        if (branch.isExpress) {
          systems.push('express');
        }
        if (branch.isPlotter) {
          systems.push('plotter');
        }
        // if (branch.isPh) {
        //   systems.push('ph');
        // }
        return { name: branch.name, systems };
      });
      return transformedBranches;
    } catch (error) {
      console.error('Error fetching and transforming branches:', error);
      throw error;
    }
  }

  getPrintingServices(): { name: string }[] {
    return [
      { name: 'express' },
      { name: 'plotter' },
      { name: 'ph' }
    ];
  }
}
