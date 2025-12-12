# Beams Monorepo Setup - סיכום

## קבצים שנוספו/שונו

### קבצים חדשים:
- `server/index.js` - שרת Express עם API endpoints
- `server/package.json` - תלותים וסקריפטים של השרת
- `server/uploads/.gitkeep` - תיקייה לאחסון קבצים (מעקבת ב-git, הקבצים עצמם לא)

### קבצים שעודכנו:
- `package.json` (שורש) - נוספו סקריפטים: `dev`, `dev:server`, `dev:client`, `start`, `heroku-postbuild`, נוסף `concurrently` ל-devDependencies
- `angular.json` - עודכן ה-serve configuration לשימוש ב-proxy על פורט 4200
- `.gitignore` - נוספו כללים ל-`server/uploads` ו-`server/node_modules`

### קבצים קיימים שלא שונו (אבל משמשים):
- `proxy.conf.json` - כבר קיים ומכוון נכון ל-`http://localhost:3000`

## הוראות הרצה לוקאלית

### התקנת תלותים:
```bash
# התקנת תלותים של Angular (שורש)
npm install

# התקנת תלותים של השרת
npm install --prefix server
```

### הרצה בפיתוח:
```bash
# הרצת Angular + Server במקביל
npm run dev
```

זה יריץ:
- **Angular** על `http://localhost:4200` עם proxy ל-API
- **Server** על `http://localhost:3000`

### הרצה נפרדת:
```bash
# רק השרת
npm run dev:server

# רק Angular
npm run dev:client
```

## בדיקה שהכל עובד

### 1. בדיקת Angular:
פתח בדפדפן: `http://localhost:4200`

### 2. בדיקת Health Endpoint:
```bash
curl http://localhost:3000/api/health
```
צפוי תגובה: `{"ok":true}`

או בדפדפן: `http://localhost:3000/api/health`

### 3. העלאת קובץ:
```bash
curl -X POST -F "file=@path/to/your/file.txt" http://localhost:3000/api/upload
```

או באמצעות Postman/Insomnia:
- Method: POST
- URL: `http://localhost:3000/api/upload`
- Body: form-data
- Key: `file` (type: File)
- Value: בחר קובץ

### 4. רשימת קבצים:
```bash
curl http://localhost:3000/api/files
```

### 5. הורדת קובץ:
```bash
curl http://localhost:3000/api/files/<filename>
```

## API Endpoints

### GET /api/health
מחזיר: `{ "ok": true }`

### POST /api/upload
- Content-Type: `multipart/form-data`
- Field name: `file`
- מחזיר:
```json
{
  "success": true,
  "filename": "1234567890-uuid-originalname.txt",
  "originalName": "originalname.txt",
  "size": 1234,
  "path": "/api/files/1234567890-uuid-originalname.txt"
}
```

### GET /api/files
מחזיר רשימת כל הקבצים:
```json
{
  "files": [
    {
      "filename": "1234567890-uuid-originalname.txt",
      "size": 1234,
      "uploadedAt": "2024-01-01T12:00:00.000Z",
      "url": "/api/files/1234567890-uuid-originalname.txt"
    }
  ]
}
```

### GET /api/files/:name
מחזיר את הקובץ עצמו (download).

## Deploy ל-Heroku

### הכנה:
1. ודא שיש לך Git repository
2. ודא שכל הקבצים commit-ים

### Deploy דרך GitHub:

1. **חיבור Heroku ל-GitHub:**
   - היכנס ל-Heroku Dashboard
   - בחר את האפליקציה (או צור חדשה)
   - לך ל-tab "Deploy"
   - בחר "GitHub" כ-Deployment method
   - חבר את ה-repository

2. **בחירת Branch:**
   - בחר את ה-branch שבו אתה רוצה לעשות deploy (בדרך כלל `main` או `master`)
   - ודא שה-branch מכיל את כל השינויים

3. **Deploy:**
   - לחץ על "Deploy Branch"
   - Heroku יבצע אוטומטית:
     - `npm install` (התקנת תלותים)
     - `npm run heroku-postbuild` (בניית Angular)
     - `npm start` (הרצת השרת)

4. **Config Vars (אם צריך):**
   - אם יש משתני סביבה, הוסף אותם ב-Settings → Config Vars
   - לדוגמה: `NODE_ENV=production` (מוגדר אוטומטית)

### Deploy דרך Heroku CLI:
```bash
# Login
heroku login

# Create app (אם עדיין לא)
heroku create your-app-name

# Deploy
git push heroku main
```

## Procfile - למה לא השתמשתי?

**לא צריך Procfile** כי:
- Heroku מזהה אוטומטית את הסקריפט `start` ב-`package.json`
- זה הסטנדרט ל-Node.js apps ב-Heroku
- הסקריפט `heroku-postbuild` רץ אוטומטית לפני ה-`start`

אם בכל זאת תרצה Procfile (לשליטה מלאה), תוכל ליצור:
```
web: node server/index.js
```

אבל זה מיותר במקרה שלנו.

## מבנה Production

כאשר `NODE_ENV=production`:
- השרת מחפש את ה-Angular build ב-`dist/mean-corse-01` (או `dist/mean-corse-01/browser` אם קיים)
- כל route שלא מתחיל ב-`/api` מחזיר את `index.html` (SPA fallback)
- השרת משתמש ב-`process.env.PORT` (Heroku מגדיר את זה אוטומטית)

## הערות חשובות

1. **אחסון קבצים**: 
   - `server/uploads/` הוא MVP דמו בלבד
   - ב-Heroku ה-filesystem הוא **לא persistent** (נמחק בכל restart)
   - הקוד כתוב בצורה שקל להחליף ל-S3/R2 בעתיד (רק לשנות את ה-storage configuration)

2. **Proxy בפיתוח**:
   - Angular משתמש ב-`proxy.conf.json` כדי לשלוח `/api/*` ל-`http://localhost:3000`
   - אין צורך ב-CORS בפיתוח

3. **Ports**:
   - Development: Angular על 4200, Server על 3000
   - Production: רק Server על PORT (Heroku קובע)

## פתרון בעיות

### השרת לא מתחיל:
- ודא ש-`npm install --prefix server` בוצע
- בדוק שאין process אחר על פורט 3000

### Angular לא מתחבר ל-API:
- ודא שה-proxy מוגדר נכון ב-`proxy.conf.json`
- ודא שהשרת רץ על פורט 3000

### Build נכשל ב-Heroku:
- בדוק שה-`angular.json` תקין
- ודא שכל ה-dependencies מותקנים
- בדוק את ה-logs: `heroku logs --tail`

