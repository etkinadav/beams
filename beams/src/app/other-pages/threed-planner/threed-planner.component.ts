import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { DirectionService } from '../../direction.service';
import { ThreedPlannerService, BaseFile } from '../../services/threedplanner.service';

@Component({
  selector: 'app-threed-planner',
  templateUrl: './threed-planner.component.html',
  styleUrls: ['./threed-planner.component.css'],
  host: {
    class: 'fill-screen'
  }
})
export class ThreedPlannerComponent implements OnInit, OnDestroy {
  isRTL: boolean = true;
  isDarkMode: boolean = false;
  isAdminMode: boolean = false;
  private directionSubscription: Subscription;

  // File upload related
  selectedFile: File | null = null;
  baseFile: BaseFile | null = null;
  isUploading: boolean = false;
  uploadProgress: number = 0;
  uploadError: string | null = null;
  uploadSuccess: boolean = false;

  constructor(
    private directionService: DirectionService,
    private threedPlannerService: ThreedPlannerService
  ) { }

  ngOnInit() {
    this.directionSubscription = this.directionService.direction$.subscribe(direction => {
      this.isRTL = direction === 'rtl';
    });

    this.directionService.isDarkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });

    // Load existing base file if in admin mode
    if (this.isAdminMode) {
      this.loadBaseFile();
    }
  }

  ngOnDestroy() {
    if (this.directionSubscription) {
      this.directionSubscription.unsubscribe();
    }
  }

  toggleMode() {
    this.isAdminMode = !this.isAdminMode;
    if (this.isAdminMode) {
      this.loadBaseFile();
    }
  }

  loadBaseFile() {
    this.threedPlannerService.getBaseFile().subscribe({
      next: (response) => {
        if (response.success) {
          this.baseFile = response.baseFile;
        }
      },
      error: (error) => {
        console.error('Error loading base file:', error);
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedExtensions = ['.obj', '.fbx', '.gltf', '.glb', '.dae', '.3ds', '.blend', '.stl', '.ply'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!allowedExtensions.includes(fileExtension)) {
        this.uploadError = 'סוג קובץ לא נתמך. אנא העלה קובץ תלת מימד (obj, fbx, gltf, glb, dae, 3ds, blend, stl, ply)';
        this.selectedFile = null;
        return;
      }

      // Validate file size (100MB)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        this.uploadError = 'הקובץ גדול מדי. גודל מקסימלי: 100MB';
        this.selectedFile = null;
        return;
      }

      this.selectedFile = file;
      this.uploadError = null;
      this.uploadSuccess = false;
    }
  }

  uploadFile() {
    if (!this.selectedFile) {
      this.uploadError = 'אנא בחר קובץ להעלאה';
      return;
    }

    this.isUploading = true;
    this.uploadError = null;
    this.uploadSuccess = false;
    this.uploadProgress = 0;

    this.threedPlannerService.uploadBaseFile(this.selectedFile).subscribe({
      next: (response) => {
        if (response.success) {
          this.baseFile = response.baseFile;
          this.uploadSuccess = true;
          this.selectedFile = null;
          // Reset file input
          const fileInput = document.getElementById('baseFileInput') as HTMLInputElement;
          if (fileInput) {
            fileInput.value = '';
          }
          setTimeout(() => {
            this.uploadSuccess = false;
          }, 3000);
        }
        this.isUploading = false;
      },
      error: (error) => {
        console.error('Error uploading file:', error);
        this.uploadError = error.error?.error || 'שגיאה בהעלאת הקובץ. אנא נסה שוב.';
        this.isUploading = false;
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

