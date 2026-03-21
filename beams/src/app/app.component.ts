import { Component, OnInit, Inject, Renderer2 } from '@angular/core';
import { AuthService } from './auth/auth.service';
import { DOCUMENT } from '@angular/common';
import { DirectionService } from './direction.service';
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {

  isRTL: boolean = true;
  key: string;
  language: string = 'he';

  constructor(
    private translate: TranslateService,
    private directionService: DirectionService,
    private authService: AuthService,
    @Inject(DOCUMENT) private document: Document,
    private render: Renderer2) {
    const stored = localStorage.getItem('language');
    if (stored) {
      this.language = stored;
    }
    translate.setDefaultLang(this.language);
    translate.use(this.language);
  }

  ngOnInit() {
    this.authService.autoAuthUser();
    this.render.addClass(this.document.body, 'lightTheme');
    this.directionService.toLanguageDirection(this.language);
    this.directionService.direction$.subscribe((direction) => {
      this.isRTL = direction === 'rtl';
    });
    this.directionService.currentLanguage$.subscribe((lang) => {
      this.language = lang;
    });
  }

  // ==============
}