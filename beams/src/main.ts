/// <reference types="@angular/localize" />

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

import { registerLocaleData } from '@angular/common';
// import localeHe from '@angular/common/locales/he';

// platformBrowserDynamic().bootstrapModule(AppModule)
//   .catch(err => console.error(err));

// registerLocaleData(localeHe);

// --- trying to fixing the language issue - NOT NEEDED! ---
import localeHe from '@angular/common/locales/he';
import localeEn from '@angular/common/locales/en';
import localeAr from '@angular/common/locales/ar';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err =>
    console.error(err)
  );

if (localStorage.getItem('language') === 'en') {
  registerLocaleData(localeEn);
} else if (localStorage.getItem('language') === 'ar') {
  registerLocaleData(localeAr);
} else {
  registerLocaleData(localeHe);
}
// console.log("selected---Lang---uage: 4" + localStorage.getItem('language'))

