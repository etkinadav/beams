import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core'; // Import TranslateService

@Injectable({
    providedIn: 'root',
})
export class DirectionService {
    private directionSubject = new BehaviorSubject<'ltr' | 'rtl'>('rtl');
    direction$ = this.directionSubject.asObservable();
    private currentLanguageSubject = new BehaviorSubject<string>('he');
    currentLanguage$ = this.currentLanguageSubject.asObservable();
    private currenLanguage: string = 'he';
    private LTRLanguages = ['en'];
    private RTLLanguages = ['he', 'ar'];
    private translations: any = {}; // Store translations here

    private isDarkModeSubject = new BehaviorSubject<boolean>(false);
    isDarkMode$: Observable<boolean> = this.isDarkModeSubject.asObservable();

    constructor(private translateService: TranslateService) {
        this.currentLanguage$.subscribe((lang) => {
            // console.log("selected---Lang---uage: 3" + lang)
            if (this.RTLLanguages.includes(lang)) {
                this.setDirection('rtl');
            } else {
                this.setDirection('ltr');
            }
        });
    }

    setDirection(dir: 'ltr' | 'rtl') {
        document.documentElement.setAttribute('dir', dir);
        this.directionSubject.next(dir);
    }

    toLanguageDirection(lang: string) {
        this.currentLanguageSubject.next(lang); // Emit language change
        this.translateService.use(lang); // Change language in TranslateService
        document.documentElement.setAttribute('lang', lang);
        // console.log("selected---Lang---uage: 5" + lang)
    }

    setDarkMode(isDarkMode: boolean) {
        this.isDarkModeSubject.next(isDarkMode);
    }
}