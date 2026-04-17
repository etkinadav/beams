// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

//get current host
const host = window.location.host;

export const environment = {
  production: false,
  apiUrl: '/api',
  /** MapTiler: החלף את הריק במפתח (בין המרכאות). סימון: {{putkeyhere}} */
  maptilerApiKey: 'vcb9jeTslt2RyaGbzwU8',
  /** מזהה סגנון מ-MapTiler; אופציונלי — {{putkeyhere}} או השאר ריק ל־streets-v2 */
  maptilerMapId: '019d9956-ca88-7f2f-b4c7-28e76a5eb49c',
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
