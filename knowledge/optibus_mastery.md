# Optibus — מסמך שליטה מקצועי

מקור: מרכז התיעוד הרשמי של Optibus (help.optibus.co) + Optibus Academy.
נכתב כסיכום לימוד מעמיק, בניסוח עצמאי. מונחים מקצועיים נשמרים באנגלית.
היקף: ~97 מאמרים מתוך ~488, כיסוי רעיוני מלא של כל 12 הקטגוריות, עומק מרבי ב-Scheduling. כולל נוהל "סוכן הרצת מפות" (פרק 18). ראו פרק 17.

---

## 0. מבנה מרכז התיעוד (488 מאמרים, 12 קטגוריות)

| קטגוריה | מס' מאמרים | תוכן |
|---|---|---|
| The New Support Hub | 3 | Support Agent, Help Center, Tickets Portal |
| What's New | 10 | גרסאות חדשות |
| Login | 4 | כניסה/יציאה למוצרי Optibus |
| P/S/R Platform | 17 | הפלטפורמה המשותפת: Planning, Scheduling, Rostering |
| Planning | 96 | מוצר התכנון |
| Scheduling | 153 | מוצר הסידור — הליבה התפעולית |
| Rostering | 37 | בניית מחזורי עבודה |
| Operations | 66 | תפעול יומי (Ops) |
| Driver App | 35 | אפליקציית הנהג |
| Control | 23 | בקרה בזמן אמת |
| Shuttles | 11 | מוצר ההסעות |
| Reports and protocols | 33 | דוחות ופרוטוקולים |

---

## 1. ארכיטקטורת המוצר

Optibus מורכבת משלושה מוצרי ליבה על פלטפורמה משותפת (P/S/R = Planning / Scheduling / Rostering), ומעליהם שכבת תפעול ובקרה:

- **Planning** — תכנון רשת, מסלולים, תחנות, לוחות זמנים (Timetables), זמני נסיעה.
- **Scheduling** — שיוך נסיעות לרכבים (Vehicle Schedule) ולנהגים (Crew Schedule), כולל אופטימיזציה.
- **Rostering** — הרכבת ה-Duties למחזורי עבודה תקופתיים לנהגים.
- **Operations (Ops)** — ניהול תפעולי יומי: שיבוץ בפועל, היעדרויות, החלפות, שכר.
- **Control** — מעקב בזמן אמת אחר ביצוע השירות.
- **Driver App** — ממשק הנהג: משמרות, בקשות, signing.
- **Shuttles** — מוצר ייעודי להסעות.

זרימת הנתונים: Planning → Scheduling → Rostering → Operations → Control.

---

## 2. Scheduling — סקירת המוצר

### 2.1 ה-Workflow הסטנדרטי (S-003)

הזרימה הטיפוסית בעבודה עם Scheduling:

1. **יצירת Schedule חדש** — יוצרים Dataset (מייצאים מ-Timeplan ב-Planning, או מייבאים Dataset עצמאי), פותחים אותו ולוחצים New Schedule.
2. **הגדרת Preferences בסיסיים** — חובה לאופטימיזציה: Cost, Depot Setup, Midday Park, Algorithm Parameters, Pre/Post Trip.
3. **הגדרת Preferences נוספים רלוונטיים** — לפי הצורך התפעולי: Route Groups, Trip Connections, Layovers, Split Break Definition, Duty Breaks, Stop Group, Preference Groups, Relief Point, Relief Timings, Limit Short Pieces, Custom Duty, Driver Base, Changeovers, Time Definitions, Break Preferences, Driver Signing, Time Limitations, Duty Types, Global Constraints.
4. **אופטימיזציה של רכבים ו-Duties.**
5. **עריכה ידנית** של הסידור לשיפור נוסף.
6. **שימוש בסידור** — ייצוא דוחות ופרוטוקולים, ומעבר ל-Rostering.

הערה חשובה: בניגוד לאופטימיזציית רכבים, באופטימיזציית Duties לא ניתן להריץ-ולנתח אחרי כל שינוי preference; יש ללחוץ Save Changes בחלון ה-preferences ואז להריץ.

### 2.2 Vehicle Schedule מול Crew Schedule (S-004, S-005)

Scheduling מחולק לשתי לשוניות:

- **Vehicle Schedule** — נסיעות משויכות לרכבים. כל שורה ב-Gantt = רכב, ומה שהוא מבצע במהלך היום (trips, deadheads, layovers).
- **Crew Schedule** — נסיעות משויכות ל-Duties. כל שורה = Duty (משמרת נהג), והאירועים שבה (trips, breaks, splits).

**שתי הלשוניות מקושרות** — שינוי באחת משפיע על השנייה. בכל לשונית: Gantt מרכזי, KPI dashboard למעלה, Validation panel מימין-למטה.

בורר Service ID מימין-למעלה בוחר איזה יום שירות מוצג (נקראים בד"כ ע"ש ימי השבוע).

לחיצה על אירוע ב-Gantt פותחת פרטים: מזהי Duty ו-Vehicle, סוג האירוע, Route, Pattern (ALT), Trip ID, Service ID, סוגי רכב כשירים, מ-/אל, זמני התחלה/סיום/משך/מרחק.

### 2.3 סוגי אירועים ב-Gantt

| אירוע | ייצוג ויזואלי | משמעות |
|---|---|---|
| Trip | מלבן צבעוני / חץ | נסיעת שירות. חץ ימינה = outbound, שמאלה = inbound; מכיל מספר קו |
| Deadhead | מלבן שחור | נסיעה ריקה. נקודה כתומה במרכז = נוצר אוטומטית ואינו בקטלוג |
| Pull-out / Pull-in | מלבן אפור | Deadhead שמתחיל/מסתיים בדיפו. בד"כ בתחילת/סוף יום או ב-midday park; גוון משתנה לפי דיפו |
| Sign-on / Sign-off | אייקון בצורת T | זמן התייצבות/סיום של הנהג |
| Pre/Post-trip | אייקון T | זמן לבדיקת הרכב |
| Relief | חצים אנכיים | חץ למטה = נהג מוחלף בהגעה; חץ למעלה = נהג עולה ביציאה |
| Break | שני קווים אופקיים + קיצור סוג ההפסקה | הפסקת נהג. נדרש להגדיר Break preferences ולבצע revise |
| Split | קו אופקי דרך המילה Split | משמרת מפוצלת |
| Layover | רווח ריק בין אירועים | שהייה |
| Travel | מלבן שחור במסגרת צהובה | מעבר נהג: P=תח"צ, W=הליכה, R=רכב relief |

עמודת ה-ID משמאל (Vehicle ID / Duty ID): לחיצה מציגה מידע ואזהרות/שגיאות. checkbox פותח סרגל לפעולות batch (נעילה, עריכה קבוצתית, יצירת IDs, unassign, הצמדה לראש הרשימה, מעבר ללשונית השנייה).

מעל ה-Gantt: **Stats** (עמודות מידע נוספות משמאל), **Layers** (שכבות מידע מעל ה-Gantt — מציגות duty/trip IDs, relief opportunities, משכי break/layover), **Filters** (סינון תצוגה לפי משך, preference group וכו').

---

## 3. אופטימיזציה — לב המערכת

### 3.1 מהי אופטימיזציה (S-069)

תהליך אוטומטי שמסדר ומשייך את ה-Duties ו/או הרכבים בסידור בצורה היעילה והחוקית ביותר לפי ה-preferences. לפני אופטימיזציה חובה להגדיר את ה-preferences (במיוחד אלו המסומנים כחובה).

### 3.2 הגדרות הרצה — Optimization Settings

נפתח דרך אייקון גלגל-השיניים ליד כפתור Optimize בפינה ימנית-עליונה.

**Optimization Output** (מה יעבור אופטימיזציה — toggles):
- Optimize duties
- Optimize vehicles
- Optimize relief vehicles

**Crew Algorithm** (איזה אלגוריתם ישמש):
- **Advanced fixed blocks** — ברירת המחדל, מומלץ לרוב המקרים.
- Vehicle adapter — *מיועד להוצאה משימוש, לא מומלץ*.
- Advanced vehicle adapter — *מיועד להוצאה משימוש, לא מומלץ*.
- Fixed blocks — *מיועד להוצאה משימוש, לא מומלץ*.

> ⚠️ ממצא קריטי: התיעוד הרשמי קובע מפורשות ש-Advanced Fixed blocks הוא ברירת המחדל ושיש להשתמש בו ברוב התרחישים, ושאר האלגוריתמים (כולל Advanced Vehicle adapter) מיועדים ל-deprecation ואינם מומלצים.

**Schedule parameters**: אפשרות לתת למנוע לא לכסות vehicle pieces שאינו מצליח לשבץ — מה שלא כוסה יישאר ב-stack. התיעוד ממליץ להשאיר את האפשרות הזו כבויה: אם המנוע לא מצליח לחתוך רכבים או לכסות את כל ה-pieces, האופטימיזציה תיעצר מוקדם ותציג שגיאה עם רשימת ה-pieces הבעייתיים.

אלגוריתמים ומשתנים נוספים מוגדרים דרך ה-preference **Algorithm Parameters**.

### 3.3 מודל אופטימיזציית ה-Duties: Pieces → Candidates → Filtering (S-170)

זהו התהליך המרכזי שהמנוע מבצע כדי לבחור את שילוב ה-Duties הטוב ביותר. שלושה שלבים:

**שלב 1 — Piece creation (יצירת חתיכות עבודה)**
- המנוע מפרק רכבים ל-"pieces" ניתנות לניהול.
- נקודת המוצא: preference ה-**Relief Point** — נקודה במסלול שבה נהג יכול לעלות/לרדת.
- "חותכים" את הרכב בנקודות ה-relief. **כל זוג נקודות relief מגדיר piece חדש** — ולכן נוצרות מספר חתיכות לכל trip (כל נקודה יכולה להזדווג עם כמה נקודות שאחריה).
- **Removing pieces**: לאחר היצירה, המנוע מסיר pieces שאינן יכולות להרכיב Duty מתאים או שמפרות כללים (למשל piece ארוכה מדי לעמידה בחוקי breaks, או קצרה מדי מכדי להיות יעילה). מה שנשאר = "piece pool" של חתיכות חוקיות.

**שלב 2 — Candidate creation (יצירת מועמדים)**
- משלבים pieces חוקיות ל-"duty candidates".
- piece בודדת = one-piece duty; זוג = two-piece duty; שלישייה = three-piece duty.
- **התפוצצות קומבינטורית**: עם 100 pieces יש ~10,000 מועמדי two-piece; עם three-piece — כ-1,000,000 (100×100×100). זו הסיבה לזמני ריצה ארוכים.
- התוצאה: "duty candidate pool".

**שלב 3 — Candidate filtering (סינון מועמדים)**
המנוע פוסל מועמדים לא-חוקיים (illegal candidates) בשלושה אזורים:
- **Fast rejects** — פסילה מהירה מבוססת-כללים על סמך vehicle pieces בלבד: split breaks החורגים מהמשך המותר, duties ארוכות מדי לכל Duty Type זמין, מרחקים גדולים מדי בין pieces (למשל >50 ק"מ/30 מייל), חפיפת vehicle pieces. ה-fast rejects מונעים זמני ריצה ארוכים, timeouts ובעיות scaling.
- **Enrichment** — הערכת מועמדים לאחר הוספת אירועי duty-only (travel, signing). מועמדים שהופכים ללא-חוקיים נפסלים (למשל אין split תקף, או זמני signing/travel חורגים).
- **Cost calculation** — חישוב "עלות" של כל Duty: עלות נהג קבועה יומית + שכר שעתי × paid time (מוגדר ב-Time Definitions ו-Costs) + penalties (מ-Duty Types, Preference Designer, Custom Duty Preferences). **"Cost" = ערך ה-penalties שהוגדרו, לא עלות כספית אמיתית.**

לבסוף המנוע בוחר את שילוב ה-Duties בעל ה-**crew algorithmic cost** הנמוך ביותר שמכסה את כל אירועי הרכב. זה המספר שהאופטימיזציה ממזערת (מופיע ב-KPIs).

### 3.4 Schedule Timetable Optimization — STO (S-176)

STO מתאים אוטומטית את שעות תחילת הנסיעות בתוך טווח גמישות מוגדר כדי לשפר יעילות. עובד יחד עם vehicle scheduling וחושף פתרונות טובים יותר מאשר עם לוח זמנים קשיח.

- **חלק מה-Strategic Planning Suite** — נדרש להפעיל מול ה-Customer Success manager.
- דרישות מקדימות: Algorithm Parameters עם VIP Version 3 (או EVIP לרכב חשמלי).
- preferences רלוונטיים תחת **Trips**: **Offset Range** (כמה דקות trip יכול לזוז) ו-**Optimize Timetable** (טמפלייט; פרמטרים: Linked Timeplan, Schedule Running — האם trip שזז שומר את ה-running time המקורי או מאמץ את של ה-timeband החדש).
- מריצים עם Optimize Vehicles ON; נסיעות שזזו מסומנות בנקודה שחורה; Sync מבצע backward sync ללוח המקושר.
- STO מגדיל את מורכבות האופטימיזציה ולכן מאריך זמני ריצה, במיוחד בטווחי offset גדולים.

### 3.5 Route Group Optimization (S-178)

משמש כשמספר קווים חולקים קטע מסדרון (corridor) ויש לבצע להם אופטימיזציה יחד.

- **חלק מה-Strategic Planning Suite.**
- שתי רמות של Headway preferences: **Route-level** (לכל קו בנפרד) ו-**Route group** (למסדרון המשותף).
- המנוע שוקל את שתי הרמות יחד — ולכן התוצאה שונה מאופטימיזציה של כל קו בנפרד; ייתכן שקו יקבל יותר/פחות נסיעות, או נסיעה אחרונה מוקדמת/מאוחרת יותר.
- **Headway end time**: מגדיר את חלון תחולת ה-headway; הוא **exclusive** — נסיעה שמסתיימת בדיוק ב-18:20 אינה נכללת בחלון שמסתיים ב-18:20 (יש להאריך ל-18:21).
- **Target headway מול maximum allowed headway**: ה-target הוא המרווח המועדף; ה-maximum הוא המרווח הרחב ביותר שעדיין קביל. זה נותן למנוע גמישות לאזן בין כיסוי מסדרון, מספר נסיעות ו-PVR.
- שינוי end time יכול לשנות PVR בכיוון לא-אינטואיטיבי (end time קצר יותר עלול לדרוש *יותר* רכבים בגלל תבנית פחות יעילה).

### 3.6 קיצור זמן אופטימיזציית Crew (S-093)

זמן ארוך נובע בד"כ מכמות עצומה של פתרונות אפשריים. שני פרמטרים מרכזיים:

- **Limit Short Pieces** (טמפלייט בתוך preference ה-Custom Duty) — מגדיר את משך הנהיגה המינימלי של piece:
  - *Minimum piece length* — משך נהיגה מינימלי ל-piece.
  - *Minimum joined piece length* — מינימום כש-piece מחוברת לאחרת.
  - מומלץ 60/90/120 דקות. pieces קצרות = יותר אפשרויות אבל איטי יותר; ארוכות = פחות אפשרויות, מהיר יותר. אם אין הגדרה — רכבים יכולים לקבל כל משך נהיגה.
  - חשוב להוסיף את preference ה-**Crew Relaxation** ולסמן בו "Limit short pieces", כדי שהאילוץ יוכל להתרכך כשהוא מקשה מדי על יצירת סידור.
- **Retention Ratio** (תחת Algorithm Parameters) — אחוז מועמדי ה-three-piece duty (שתי החלפות רכב) שייבחנו. ערך בין 0 ל-1; 1 = כל המועמדים, 0.5 = חצי. הקטנה מקצרת ריצה. רלוונטי רק אם מתירים יותר מ-changeover אחד ל-Duty.

---

### 3.7 Troubleshooting של אופטימיזציה

**Too Many Duty Candidates (S-111)** — סיבות נפוצות לכמות מועמדים מנופחת:
1. **Relief Points** — לוודא שה-preference מוגדר, אינו paused, ומוגדר עם ה-stops/places הנכונים.
2. **Exclude from optimization** — pref groups שאמורים להיות מוחרגים מאופטימיזציה; pref group ללא הגבלות מייצר המון מועמדים. לבדוק ב-Preference Groups את "Exclude from optimization".
3. **Relief Timing** — אם רכבים חייבים להיות מאוישים בזמן ההחלפה, לוודא שה-preference מוגדר נכון.
4. **Split Break Definition** — אם יש duties עם split breaks, לוודא הגדרה תקינה.
5. **Pref group route group** — לוודא שלכל pref group מוגדר route group, ושאינו מכיל קווים שלא צריכים להיות בו (תחת טמפלייטי Custom Duty).
6. **Duty Types** — הגדרה שגויה, לרוב מחמירה מדי. דוגמה: אם Straight AM מוגדר לעבוד 8–8.5 שעות, duties של 7 שעות (שהן קבילות) ייפסלו כלא-חוקיות.

**No Valid Duty Candidates (S-118)** — סיבות נפוצות לכך שאין אף מועמד תקף:
- **Pref group route group** — חסרים קווים בקבוצה.
- **Duty Types** — הגדרה מחמירה מדי (כנ"ל).
- **סתירות בין Duty Types ל-Work/Time Limitations** — הגבולות העליונים של work/paid/spread time לא יסתרו את ה-preferences "Work Limitation" ו-"Time Limitation".
- **Taxi Catalog** — קטלוג שגוי שאינו תואם stop/place IDs; או חוסר taxis שנדרשים ל-preference "Driver Base" — מה שהופך את כל ה-duties ללא-חוקיות.
- **Breaks** — "maximum time without a break" קצר מאוד (למשל הפסקה כל שעה).

**Optimization Timeout (S-148)** — אזורים לבדיקה כשהאופטימיזציה ארוכה מדי / נכשלת ב-timeout:
- **Limit Short Pieces** — להוסיף את ה-preference; אם קיים ומוגדר נמוך (מתחת 60/75 דק') — להעלות למינימום 90.
- לוודא ש-Relief Points/Timing מוגדרים נכון ואינם paused.
- לוודא ש-Breaks ו-Split Break Definition מוגדרים נכון.
- Preference Groups מרובים — לוודא שמוגבלים ל-route groups, ושאלו מוגדרים נכון.
- **Duty Types** — סיבה נפוצה: duty types ללא טווחי work/spread time, או מינימום 0:00. המנוע משתמש ב-spread ו-work time כ-fast rejects בשלב יצירת המועמדים — הגדרה ריקה מבטלת את הסינון המהיר ומפוצצת את ה-pool.
- אם הסידור משתמש בתחבורה ציבורית (Duty Travel) — לוודא שפרמטר "Maximum transfers" מוגדר ל-0 (ולא יותר מ-1).

## 4. נתונים, קטלוגים ו-Datasets

### 4.1 Deadhead Catalog (S-027)

Deadhead = מרחק שרכב הכנסה עושה בלי נוסעים (למשל מהדיפו לנסיעה הראשונה). ה-**Deadhead Catalog** מאחסן את זמני הנסיעה בין כל התחנות; בזמן אופטימיזציה הוא משמש לקביעת הדרך הטובה ביותר לקשר נסיעות.

צפייה/הורדה: דרך side panel → Catalogs, או דרך Preferences → MISC → Deadhead Catalog.

מבנה הקטלוג (עמודות):
- **Origin/Destination Stop Id** — מזהי התחנות.
- **Travel Time** — זמן נסיעה בדקות.
- **Distance** — מרחק.
- **Start/End Time Range** — טווח השעות שבו ה-deadhead חל; מאפשר מספר instances עם זמני נסיעה משתנים לאורך היום. ב-pull-out הטווח מוגדר ע"י זמן ההגעה; ב-pull-in ע"י זמן ההתחלה.
- **Origin/Destination Stop Name** — שמות התחנות.
- **Days Of Week** — ימי תחולה כמספרים (1=ראשון, 23456=שני-שישי, 7=שבת; ריק = כל הימים).
- **Direction / Purpose** — לא רלוונטיים.
- **Alignment** — האם ה-deadhead מתווסף מיד אחרי הנסיעה (earliest) או לכל המאוחר (latest).
- **Pre/Post-Layover Time** — זמן חיץ (דקות) לפני/אחרי ה-deadhead.

ניהול: **Update** (לשנות/להוסיף deadheads בלי למחוק קיימים) או **Replace** (החלפה מלאה כולל מחיקת תחנות). קובץ עם שורות כפולות → שגיאה.

### 4.2 יצירת Schedule מ-Dataset (S-146)

יוצרים project חדש → תפריט ראשי → Datasets → Import Dataset (קובץ Excel) → בוחרים service IDs וקווים → Import Data → New Schedule. נוצר סידור על בסיס הקווים והשירותים שנבחרו.

## 5. Scheduling Preferences — מנגנון החוקים

### 5.1 עקרונות יסוד (S-006)

תפריט ה-Preferences מגדיר חוקים קשיחים ורכים לאופן שיבוץ הרכבים וה-Duties. נפתח דרך אייקון Preferences בצד שמאל-עליון.

**4 קטגוריות**: Vehicles, Drivers, Depots, Misc (Misc מכיל preferences גם לרכבים וגם ל-duties).

**שתי תצוגות**:
- **Recommended View** — ברירת מחדל; מציגה את ה-preferences שהוגדרו כזמינים בקונפיגורציית הדומיין (בד"כ הנדרשים לסידורים). מופיעים ב-bold.
- **Expanded View** — חושפת את כל שאר ה-preferences (לא ב-bold).

**Template מול Non-template**: חלק מה-preferences פועלים עם טמפלייט מוכן (Load Template); אחרים בעלי UI מובנה (Add Preference).

**חוקים קשיחים ורכים** — קריטי:
- רוב ה-preferences הם **hard rules** כברירת מחדל: הפרה מוצגת כ-warning/issue ב-validation panel, ומנוע האופטימיזציה ינסה להימנע מהפרתם ככל הניתן.
- ניתן להפוך preference ל-**soft rule** ע"י הפעלת אפשרות ה-**Penalty**. ה-penalty שקול ל-cost; המערכת ממזערת את סכום ה-cost+penalty. נפוץ ב-Trip Connections וב-Layovers.
- כללי אצבע ל-penalty: <20 נמוך, 20–60 בינוני, >60 גבוה. עדיף לקבוע penalty ביחס לעלויות שהוגדרו; לרוב עניין של ניסוי וטעייה.

**Preferences בסיסיים (חובה לאופטימיזציה)**: Cost, Depot Setup, Midday Park, Algorithm Parameters, Pre/Post Trip.

### 5.2 סדר הגדרת Duty Preferences — צ'קליסט טרום-אופטימיזציה (S-036)

תנאי מקדים: יש להגדיר את ה-Vehicle Schedule לפני ה-Duties. הסדר המומלץ:
- **דרישות בסיס**: Depot Setup, Depot Vehicle Allocation, Costs, Algorithm Parameters, Pre/Post-trip, Deadhead Catalog.
- **Duty logistics**: Split Break Definition, Duty Break, Preference Groups, Travels, Travel Catalog.
- **Piece cutting**: Relief Points, Relief Timing, Custom Duty Preference, Limit Short Pieces + Crew Relaxation.
- **Duty characteristics**: Duty Work Content, Route Groups (ל-preference groups), Driver Base, Driver Changeover Vehicle, Time Definitions, Break Rules, Break Preference, Driver Signing, Time Limitations, Duty Types, Duty ID Generator, Preference Designer.
- **Result control**: Global Constraints (GC).

### 5.3 Duty Types (S-068)

מגדיר את מבנה ה-Duties. כל duty type: Name (ייחודי), Description, Changeover (מותר/לא), Split (מותר/לא), Allowed, Penalty, Start (טווח מוקדם–מאוחר), End, Paid (טווח paid time), Work (מינ'–מקס' שעות עבודה), Spread (מינ'–מקס' אורך משמרת).

נקודות קריטיות:
- duty type שאינו מוגדר → נחשב **"Other" (לא רצוי)**; גם duties שנוצרו ידנית. מייצר validation issues כברירת מחדל.
- כדי להחיל טווח (Start/Paid וכו') **חובה לסמן את ה-checkbox** ליד הפרמטר, אחרת הערכים לא יחולו.
- **הסדר חשוב** — duties מסווגים לפי הסדר ברשימה; type גבוה גובר. דוגמה: אם General (ללא הגבלות זמן) ראשון, כל ה-duties יסווגו General גם אם מתאימים ל-Early/Late.
- ב-Spread יש להגדיר את הגבול התחתון — מונע יצירת duties קצרות מדי באופטימיזציה.
- להגדיר duty types שמכסים את כל שעות היום כדי להימנע מ-duties לא רצויות.
- אין חפיפה בין Time Limitations ל-Duty Types — אם הגבלת time definition ב-Time Limitations, היא תגבר ואין צורך לחזור עליה כאן.
- ניהול מספר duties: עדיף להגביל כמות per type דרך Crew Preference Designer או Global Constraints (Total duty type count) במקום penalties כספיים. אפשר גם penalty אחיד לכל הסוגים (קשור ל-Hourly wage), או Driver daily fixed cost.

### 5.4 Relief Points & Relief Timing (S-045, S-049)

- **Relief Point** — המקום שבו נהג יכול לעלות/לרדת מרכב, כלומר נקודת חיתוך הרכב ל-duty work pieces. מוגדר על terminal stop או mid-route. ה-Relief Points ב-Route tab של ה-timeplan הם המקומות האפשריים.
- **Relief Timing** — duty preference השולט ב-layovers מאוישים/לא-מאוישים: האם ה-layover מאויש, ובאיזו שעה מתבצעת ההחלפה. הפרמטר המרכזי: relief time. שדות נוספים (Stops, Routes, Times Applied, Placement in Route, Preference Groups) הם פילטרים/תנאים. **ללא הגדרת relief timing — הכל unattended.** סדר ה-instances קובע עדיפות (instance ראשון גובר).

### 5.5 Trip Connections (S-025)

מגדיר תנאים לחיבור שתי נסיעות, ואיך קווים עושים interline. פועל עם טמפלייטים:
- **Route groups scheduling** — קווים בתוך route group יכולים לעשות interline ביניהם, אך לא עם קווים מחוץ לקבוצה.
- **No interlining within route group** — מונע interline בין קווי הקבוצה ובינם לבין אחרים (לתזמון עצמאי לחלוטין).
- **Layover Balance** — מעדיף layovers מאוזנים בין נסיעות (penalty גבוה יותר ל-layover ארוך).
- **Layover percentage** — אורך ה-layover תלוי במשך הנסיעות (למשל 10% מ-120 דק' = layover ≥12 דק').
- **Route Fixed Link** — שני קווים חייבים להתבצע ברצף, אך רק בתחנה ספציפית.

הסדר ברשימה קובע עדיפות (גבוה גובר).

### 5.6 Break Preferences ו-Duty Breaks (S-065, S-038)

**Break Preferences** — מגדיר סוגי הפסקות ותדירותן. טמפלייטים:
- **Fixed Break** — מספר מינימלי של הפסקה מסוג מסוים ב-duty (למשל Meal Break אחת בכל duty).
- **Continuous Break** — הנפוץ ביותר; מגדיר זמן מקסימלי ללא הפסקה מסוימת. נבחר Time Definition להערכת הזמן (לכן Time Definitions חייב להיות מוגדר קודם). דוגמה: עד 5:30 שעות workpiece ללא Meal Break, מבוסס Platform Time.
- **Pattern Break Rule** — רצף נדרש של הפסקות (למשל 15 דק' שאחריה 30 דק').

**Duty Breaks** — מגדיר איך הפסקות מזון מיושמות. טמפלייטים:
- **Without Break Locations** — Break Time Range (מינ'/מקס'), Break Name, Time before/after break, Max Fill Enrichment Duration (זמן מילוי custom event מקסימלי שמתווסף להפסקה — ברירת מחדל 0), Fill Enrichment Name.
- **With Break Locations** — מוסיף Break Stop Group (דורש Stop Groups מוגדר קודם).
- **In Limited Times Of The Day** — earliest/latest break start.

### 5.7 Custom Duty Preference (S-056)

אילוצים ייחודיים שאינם משתייכים לקטגוריה אחרת. טמפלייטים נפוצים:
- **Pref Group – Route Groups** — קישור preference group ל-route group (אילו pref groups מפעילות אילו קווים).
- **Pref Group – Must have routes** — מחייב pref group להפעיל קו מסוים.
- **Pref group – By depot** — pref groups לפי דיפו.
- **Limit short/long pieces** — הגבלת אורך pieces לשיפור זמן אופטימיזציה.
- **Disallow Interlining** — מונע שיבוץ קווים מקבוצה A ומקבוצה B באותו duty.
- **Penalize Idle Trips By Distance** — penalty על נסיעות idle לפי מרחק (Distance Cost לק"מ; אפשר לכלול deadheads/pulls).

### 5.8 Time Definitions (S-060)

preference מבוסס-טמפלייט המגדיר פרמטרי זמן של duties, המשמשים באופטימיזציה, ב-stats ובהגדרות מקושרות. הגדרות בסיס:
- **Spread/Stretch time** — הזמן הכולל בין תחילת האירוע הראשון לסוף האחרון ב-duty.
- **Driving time** — משך כל אירועי הנהיגה (depot pulls, deadheads, service trips); לא כולל layovers.
- **Work time** — אורך ה-duty, ללא split time.
- **Paid time** — כברירת מחדל = work time פחות unpaid break time; ניתן לשנות עם טמפלייט Paid Time.
- טמפלייטים: Marked Breaks Duration, Spread Time (החרגת אירועים מחישוב spread), Set Platform Time, Paid Time, Events Duration.

### 5.9 Cost Preferences (S-007)

**חישוב העלות נמצא בלב אלגוריתם האופטימיזציה** — חובה להגדיר Cost כדי לבצע אופטימיזציה/ניתוח.
- **Vehicle**: *Daily fixed cost* (עלויות עקיפות יומיות של רכב — מימון, ביטוח, פחת; ברירת מחדל גנרית 1,000), *Distance unit cost* (עלות לק"מ/מייל — דלק ובלאי; חייב >0), וניתן להגדיר עלויות שונות per vehicle type.
- **Driver**: *Driver daily fixed cost* (אופציונלי — עלויות עקיפות של נהג; גנרי ~3 שעות שכר), *Hourly wage* (עלות המעסיק לשעה — גבוהה ממה שהנהג מקבל; חשובה לאופטימיזציית רכבים להערכת עלות layovers מחוץ לדיפו).

### 5.10 Algorithm Parameters (S-010)

מגדיר איך מנוע האופטימיזציה רץ. חובה להוסיף טמפלייט algorithm לפני אופטימיזציה.
- **AFB (Advanced Fixed Blocks)** — אלגוריתם ברירת המחדל, לרוב המקרים. דורש Vehicles VIP version 2 או 3.
- **DEEP** — מאפשר שינוי רכבים יחד עם אופטימיזציית duties. דורש טמפלייט Pull reliefs ב-Trip Connections. בעת שימוש ב-DEEP יש לכבות relief car pairing.
- כאן גם מוגדר ה-Retention Ratio (ראו 3.6).

### 5.11 Depot Setup ו-Midday Park (S-008, S-009)

**Depot Setup** — מגדיר stops כדיפואים: Stop, Branch ID, Mid-day/End-of-day (האם בשימוש במהלך/בסוף היום), Minimum time at depot, Capacity (Total vehicles מינ'/מקס' — **המקסימום חובה**, אחרת אין מגבלת קיבולת; Per vehicle type — קיבולת לסוג רכב; כדי לחסום סוג רכב מדיפו, להגדיר לו max=0).

**Midday Park** — תנאי החזרת רכבים לדיפו במהלך היום: Minimal break length (הזמן המינימלי בין שתי נסיעות שממנו מותר midday park), Minimum park time, Parking allowed only in depots, Circular depot (חזרה לאותו דיפו), Constraint (האם חובה), Park cost.

### 5.12 Global Constraints (S-070)

כלי לשליטה ב**תוצאת** האופטימיזציה — *אילו* מבין ה-duties החוקיות ייבחרו (לא מה חוקי). שולט במספר ה-duties הכולל, מספר per group, average paid time.
- טבלה: lower/upper bounds, hard/soft (Restricted), penalty (ברירת מחדל 10,000).
- soft constraint = המערכת רשאית להפר אם אין פתרון, וגם מכמת את ה-algorithmic cost של ההפרה.
- דוגמאות: Total Duty Count, Split percentage, Total Deadhead Distance (תקף רק כשמותר לשנות את סידור הרכבים).
- **טיפ קריטי**: אין להשתמש ב-GC כדי לכוון לאפס duties מסוג מסוים — לשם כך משתמשים ב-Duty Types (שמסיר את המועמדים מהגרף). שימוש ב-GC למטרה זו משאיר את המועמדים ב-pool, מנפח את הבעיה, ומאריך מאוד את זמן האופטימיזציה עד אי-התכנסות.

### 5.13 Crew Preference Designer (S-140)

כלי ליצירת חוקי crew מותאמים במקום אחד. כל instance בנוי מרכיבים, **בסדר מלמעלה למטה (כל רכיב משפיע על הבא)**:
- **Context** — ההיבט שעליו ה-preference משפיע (Duty, Duty Piece, Sign-off וכו'); ניתן לסנן (Filter) לפי קריטריונים (למשל סוג רכב).
- **Property** — מאפיין של ה-context (duration, count, start/end time...).
- **Value** — סוג הערך (time range, Global Sum, Average, Integer...).
- **Penalty** — penalty על הפרה (Per Violation / linear / exponential), או **Restrict (None)** כדי להפוך את החוק לקשיח.

(ניתן גם להגדיר חוקי Designer באמצעות AI — Preference AI Generation.)

### 5.14 Limit Short Pieces + Crew Relaxation (S-053)

טמפלייט של Custom Duty Preference המגביל את אורך ה-piece המינימלי. **מומלץ תמיד להשתמש בו כשמתכננים אופטימיזציה** — מבטיח pieces תפעוליים ומפחית דרמטית את כמות ה-pieces וזמן האופטימיזציה. ערך אידיאלי 60–90 דק', לא מעל 120. קיים גם Limit Long Pieces.
**Crew Relaxation** — מאפשר לרכך אילוצים (כמו Limit short/long pieces) אם אין דרך אחרת לפתור; סדר ה-checkboxes = הסדר שבו הם ירוככו עד שהמנוע ימצא פתרון.

### 5.15 Electric Vehicles (S-155)

הפלטפורמה תומכת בצי מעורב (חשמלי + דלק) ובצי חשמלי מלא. רכב חשמלי מציג charging events (סמל ברק); אורך האירוע = משך הטעינה; לחיצה מציגה מיקום, משך ו-Energy (אחוז טעינה). שכבת **State of Charge (SoC)** ב-Vehicle Layers מציגה את מצב הסוללה (ירוק=גבוה → אדום=נמוך) בתחילת/סוף כל נסיעה. preferences של EV: קיבולת סוללה, נקודות טעינה, קצב טעינה/פריקה, Minimum SoC, End of Day charge, עלויות. KPI ייעודי: CO2 Emissions שנחסכו.

## 5א. Scheduling Preferences — העמקה (Drivers)

### Duty Work Content (S-054)
מגדיר את מאפייני ה-preference groups דרך שילוב של Preference Groups (שמות קבוצות נהגים), Route Groups (קבוצות קווים לפילטרים) ו-Custom Duty (קישור בין השניים).

### Driver Base (S-057)
preference (non-templated) המגדיר היכן נהג רשאי להתחיל/לסיים duty ו-split breaks. סוגים: Straight / Split / Straight or split. אפשרות **circularity** (start duty–end duty, start split–end split וכו'). Penalty למצב לא-אידיאלי. Filter לפי טווחי זמן וסוגי רכב. סדר הסוגים = עדיפות (גבוה גובר).

### Driver Signing (S-066)
מקצה זמן בתחילת/סוף duty להכנה/דיווח. טמפלייטים: sign-on/off ל-duty start/split, ל-duty piece שמתחיל ב-travel, או ב-pull-out. **סדר החוקים קריטי** — החוק המחמיר/ספציפי ביותר חייב להיות למעלה, אחרת חוק כללי שמעליו "ידרוס" אותו. כדי להחיל: Update schedule → Revise Events → לסמן Sign on/off → Modify Schedule.

### Split Break Definition (S-037)
Split = duty עם 2+ pieces המופרדות ב-break מעל שעה (בד"כ לא בתשלום, נהג off-duty). **חובה להגדיר גם אם אין splits** — זה מנגנון לפסילת duties עם breaks ארוכים מדי. אם אין splits — להגדיר Min split break כשווה ל-max meal break המותר.

### Time Limitations (S-067)
מגביל את משך/מבנה ה-duty. שני טמפלייטים: **Restriction** (הגבלה קשיחה — מומלץ, ברור יותר, פחות penalties) ו-**Flexible** (טווח עם penalty). חל על כל ה-duties; ניתן לשייך ל-preference group.

### Work Limitation (S-135)
לעמידה ברגולציה והסכמי עבודה. Maximum Work Time, Maximum Spread Time, Breaks (Required Every, Break Length), **Accumulation** (פיצול ה-break לכמה חלקים — Min Break, Min Continuous Break), **Long Breaks** (Min Duty Length, Required Break, Break Start Time range), **Flexibility** (התייחסות לזמן כהעדפה — מותר חריגה אם חוסכת מספיק), **Overlooks** (אילו אירועים לכלול/להחריג מהגדרת זמן העבודה).

### Break Rule Designer (S-167)
כלי גמיש לבניית חוקי breaks, חלופה ל-Break Preferences, עובד עם Duty Breaks. מבנה Context/Property/Value/Penalty. תומך ב-recurring breaks, grouping (Satisfy either/all), pattern breaks, accumulated breaks.

### Duty Travel (S-043)
מעבר נהג בין מיקומים באמצעי שאינו רכב התפעול שלו. ארבעה מצבים: **Relief Car, Walk, Public Transportation, Other**. כל מצב עם catalog משלו וחוקים.

### Changeover (S-058)
Changeover = נהג אחד יורד, אחר עולה. ב-preference "Driver Changeover Vehicle": Max Changeovers (ברירת מחדל 2), Changeover Time (זמן מינ' בין pieces), Penalty (גבוה יותר = פחות changeovers), Only During Split, Allow Vehicle Type Changeovers.

### Time Definition Designer / TDD (S-164)
כלי לבניית time definitions מותאמות (Context/Property/Value). שמות שמורים מופיעים ב-Stats, ב-exports וב-API. **שם קבוצה "paid_time" דורס את הגדרת ה-Paid Time הקיימת.** משמש ב-Duty Types, Time Limitations, Custom KPIs.

### Troubleshooting נוסף
- **Duty Types (S-100)**: "Duty Type Not Allowed" — אין type מתאים → מסומן Other (למשל duty ב-06:00 כשהמינימום 06:30). "Duty type Mismatch" — duty לא תואם להגדרת ה-type שנבחר; type כתום = שונה ידנית, ניתן Reset.
- **Relief Points/Timing (S-153)**: "Illegal relief point" — נקודת relief בשימוש שאינה ברשימת ה-Relief Point preference → להוסיף אותה. "Vehicle is unattended" / "Attendance not compatible" — לתקן דרך Revise Events → Attendance.

## 5ב. Scheduling Preferences — העמקה (Vehicles & Misc)

### Pre/Post Trip (S-011)
זמן לבדיקת/הכנת רכב. **Pre-trip** — לפני pull-out מהדיפו (vehicle event); **Post-trip** — אחרי pull-in. אפשר פעם ביום או בכל pull. טמפלייטים: General, Specific depot, By route group. פרמטר: זמן, והאם חל על mid-day parking.

### Layovers (S-026)
שולט בזמן בין נסיעות. טמפלייטים: layover אחרי קו / לפני קו / בתחנה מסוימת / לפי משך קו. Filter לפי טווחי זמן וסוגי רכב. ניתן להגדיר כ-constraint או soft.

### Deadhead Generator (S-030)
אם deadhead קיים בקטלוג — הוא ישמש; אם לא — הפלטפורמה **תייצר אותו** (מסומן בנקודה כתומה ב-Gantt). deadheads מיוצרים מבוססים על נוסחה שאינה בהכרח מדויקת — יש להתייחס אליהם כהמלצה הדורשת אישור מתכנן. מומלץ להשתמש ב-preference **Deadhead Filter** עם טמפלייט "Extra duration for generated deadheads" (אחוז זמן נוסף ל-deadheads מיוצרים, לזמנים ריאליים יותר).

### Vehicle Preference Designer (S-169)
כלי ליצירת חוקי רכב מותאמים, מבנה Context/Property/Value/Penalty (כמו Crew Preference Designer). דוגמאות: רק deadheads מתחת לשעה; מינימום 20 דק' בין נסיעות באותו כיוון; מינימום layover לקו ספציפי. Restrict (None) הופך לקשיח.

### Preference Groups (S-040)
preference (non-templated) המגדיר שמות קבוצות נהגים. מאפשר חוקים שונים לכל קבוצה (למשל כללי EU מול domestic), מיקומי התחלה/סיום שונים, קווים מותרים/אסורים (כמו קווי בית-ספר). פרמטרים: Penalty per group, **Exclude from optimization** (הקבוצה לא תושפע משינויי אופטימיזציה). הקבוצה הראשונה = ברירת מחדל (ניתן לשינוי). שיוך preferences לקבוצות דרך drop-down "Pref. groups".

### Route Groups (S-055)
קבוצת קווים; חלק מה-preferences דורשים route group כקלט. מגדירים אילו קווים בכל קבוצה, ואז משתמשים בקבוצה בהגדרת preferences (Layover, Trip Connections וכו'). ניתן לסנן את תצוגת ה-Gantt לפי route group.

## 5ג. ניווט, עריכה ידנית, Custom Events ו-Projection

### Scheduling Navigation (S-002)
מהפינה השמאלית-עליונה: side menu; אייקון folder (חזרה ל-Schedules); **כפתור Update schedule (חצים מעגליים)** — Analyze schedule, Revise events, Update trips (לא פעיל), **Clear duties** (מסיר את כל ה-trips מהסידור), Generate IDs; אייקון pencil (מצב עריכה ידנית); אייקון Preferences; שלוש נקודות (export/import, General Settings — התאמת KPIs, הפעלת/כיבוי עריכה ידנית); Undo/Redo/History. במרכז: שם הסידור, סטטוס נעילה, וסנכרון עם ה-timeplan (וי ירוק). מימין: בורר Service ID ובורר Vehicle/Crew schedule.

### Manual Schedule Editing (S-020)
עריכת IDs (שונה → כתום; ID כפול → מסגרת אדומה, לא ישתנה); Move לשורה אחרת; Pin לראש ה-Gantt; Duty comments; Table view (רשימת כל אירועי ה-duty/vehicle); נעילת vehicles/duties; **נעילת Schedule** (3 מצבים: editable רק על-ידך / read-only לכולם / editable לכולם). **Read-Only (Locked by roster)**: כשנוצר roster מבוסס duty schedule, ה-duty schedule ננעל; כדי להמשיך לעבוד עליו — Save As לסידור חדש. Layers, Undo/Redo (Ctrl+Z/Y), Schedule History.

### Custom Duty & Vehicle Events (S-071)
אירוע שמוסיפים ידנית (green roads, controller work, spares, משימות ועד). **קריטי: אופטימיזציה תמחק את האירוע אלא אם ה-duty שמכיל אותו נעול.** הוספה: pencil → ריחוף → סימן + → בחירת Type. אפשר אירוע בתוך duty קיים או כ-duty שלם חדש.

### Projection (S-031)
יצירת schedule חדש מבוסס schedule קיים — מייבא trips, שיוכי רכבים ו-preferences. גישה: New Schedule → ellipses → Import → Import a different schedule (חיפוש ידני או הדבקת URL). אפשרויות מפתח: Ignore vehicle types, Apply to unlocked rows only, Retain deleted duties, Include manually added trips, **Vehicles only**, Allow non-matching origin/destination, **Max start time difference**, Max overlap. תוצאות: trip שנוסף → ל-stack; trip ששונה — נשאר אם אותו נהג/רכב יכול, אחרת → stack (סימן כחול); trip שהוסר → רווח ריק. שימושי להשוואת תרחישים ול-baseline.

### EV Preferences (S-078)
סט preferences ייעודי בקטגוריית Electric Vehicles: **Batteries, Electric Vehicle Types, Charging Profiles, Charging Stations, Chargers**. אחרי אופטימיזציה — אפשר Manual Edit להוספת recharge events (אחוז הסוללה מתעדכן אוטומטית).

## 6. הערכה, ולידציה ובקרת איכות של הסידור

### 6.1 Analyze (S-092)

אחרי כל שינוי (אופטימיזציה או עריכה ידנית) יש ללחוץ על אייקון החצים המעגליים → **Analyze** — זה מעדכן את ה-KPIs ואת הוולידציות. מספר באדום ליד KPI = השינוי המספרי מאז ה-Save האחרון; נעלם אחרי Save.

### 6.2 Validation Panel (S-033)

ממוקם בפינה ימנית-תחתונה, מחולק לשני פאנלים: **global issues** ו-**vehicle issues**. אייקון קריאה אדום = יש בעיות, ומציין אם בסידור הרכבים או הנהגים.
- אחרי עריכה ידנית או שינוי preference (ואחרי Save) — לחיצה על כפתור הוולידציה בודקת אם הסידור עומד ב-preferences. שימושי לבדיקת "מה אם" (למשל אם הפסקת הצהריים תוארך מ-30 ל-40 דק' — כמה duties יפרו).
- **Dismiss Issues** — התעלמות מ-warning. **Filter Issues** — הצגת רק הרכבים/duties עם הבעיות; פריטים בעייתיים מסומנים במסגרת אדומה.

### 6.3 KPI Dashboard (S-034)

ממוקם בראש מסך ה-Scheduling. שורה ראשונה גלויה כברירת מחדל; חץ קטן פותח את השאר.

**KPIs של רכבים**: Blocks (מספר רכבים + PVR), Vehicle Efficiency (מרחק שירות / מרחק כולל), Total Cost (crew + vehicle), Driving Time, Platform Time (זמן מחוץ לדיפו — מנבא paid time), Vehicle Types.

**KPIs של duties**:
- **Crew Algorithmic Cost** — ה-KPI החשוב ביותר להשוואת סידורי duties; האופטימיזציה ממזערת אותו. = duty cost + penalties מ-preferences + penalties מ-Global Constraints. (duty cost = paid time × hourly wage + driver daily fixed cost × מספר duties).
- Total Cost — לחישוב חיסכון; לא כולל penalties של GC/Duty.
- Paid Time — Average Paid Time (להערכת איכות rostering) ו-Total Paid Time (להשוואת תרחישים דומים).
- **Duty Count** — מספר הנהגים הפעילים היומי הנדרש; **לא** סך הנהגים (זה נקבע ב-roster, בהתחשב בימי מנוחה, מנוחה בין ימים, roster groups, standby, מגבלה שבועית).
- Duty Types, Crew Efficiency, Spread Time, Split count, Changeover (מצב שבו נהג מחליף רכב), Work time, Standby time, Taxi time, Duties paid time, Duty preference groups.
- ניתן להגדיר Custom KPIs דרך ה-preferences; ולהציג/להסתיר KPIs דרך General Settings.

### 6.4 Vehicle Piece Validation Tool (S-134) — קריטי להבנת כשלי אופטימיזציה

**Piece cutting הוא השלב הראשון של האופטימיזציה** — קביעת כל ה-vehicle pieces הפוטנציאליים.
- **Vehicle piece** = רצף אירועי רכב שחוקי לנהג לבצע כיחידה. Duty מורכב בד"כ ממספר pieces.
- piece **צריך להתחיל ולהסתיים ב-relief point או בדיפו** (נקודה שבה הנהג יכול לרדת).
- piece לא-תקף נקרא **uncuttable** — לא ניתן לחתוך אותו באופטימיזציה. סיבות: רצף 5 שעות ללא break כשנדרש break כל 4; piece מקבוצת קווים שאינה מותרת ל-preference group.
- יש גם מקרה של piece תקף שאין duty שיכול לכסות אותו במלואו.
- **הכלי**: SHIFT+קליק על האירוע הראשון והאחרון ב-Gantt → popup → כפתור piece validation. אם משתמשים ב-preference groups — לבחור את הקבוצה הנכונה. תוצאה Valid/Invalid; חץ אדום מצביע על הסיבה. אם ה-piece מתחיל/מסתיים באמצע trip — לחתוך עם מקש 'U'.
- **שכבת Relief opportunities** — מציגה את ה-relief points כקווים אנכיים מקווקווים; יש לבצע Analyze אחרי עדכון relief points כדי שתתעדכן.
- **חיתוך pieces — AFB מול DEEP**: ב-**AFB** (הנפוץ, ללא שינוי רכבים) חיתוך רק ב-relief points ובדיפואים. ב-**DEEP** ניתן להוסיף depot pulls לתחנות קצה שאינן relief points ולחתוך pieces שאחרת לא ניתן היה. עם DEEP מגדירים Pull reliefs ב-Trip Connections.

## 7. הפלטפורמה — Projects, Calendar, Import (P/S/R)

### 7.1 פלטפורמה (CM-001)

Optibus היא פתרון ענן (ללא התקנה, דרך Chrome), עם מחזורי שחרור של שבועיים וללא versioning. ארבעת המוצרים והזרימה: **Planning → Scheduling → Rostering → Operations**. (Operations מנוהל בדומיין נפרד.)

### 7.2 Projects — היררכיית הקבצים (CM-002)

ה-file manager הוא המסך הראשון. **Project** = מכל של שינוי שירות מסוים, בד"כ שקול לתקופת sign-up אחת. כל פרויקט מכיל 3 לשוניות מוצר מקושרות ברצף.

ההיררכיה:
- **Timeplan (Tp)** — ב-Planning: קווים, route patterns, running times, timetables. אפשר כמה timeplans (תרחישים).
- **Scheduling Dataset (Ds)** — Timeplan מיוצא ל-Scheduling; מבט מסוים של ה-timeplan (קווים, service groups, trips).
- **Schedule (Sc)** — תרחיש הקצאת משאבים. תחת Dataset יכולים להיות כמה Schedules (תרחישים).
- **Roster Dataset** — נתוני duties להקצאה ב-Rostering.

תכונות פרויקט: Name, Created By/At, Description, Start/End date, **Status** (Pending / Operational / In Progress / Archived — לתיעוד בלבד, ללא השפעה תפעולית). Global Search למציאת כל קובץ/תיקייה. ניתן להעתיק פרויקט (קבצים קשורים מועתקים אוטומטית), להעביר, למחוק, ולקבץ בתיקיות.
**Project Configuration** — depot codes, holidays, serviced organizations וכו'; חל על כל ה-timeplans/schedules/rosters בפרויקט.

> הערה למפת אורי: "B_Diagnostic_Vehicle_Driver_Holon" הוא Schedule (Sc), על Dataset "חולון א-ה 28.12_v2". העותק והמקור הם שני Schedules נפרדים תחת אותו Dataset.

### 7.3 Calendar (CM-007)

מציג שירותים בתצוגה חודשית; משייכים services שהוגדרו ב-Planning/Scheduling לתאריכים. **השימוש ב-Calendar אינו משנה את השירותים** — רק מציין אילו ישמשו באילו תאריכים. תומך בשיוך למספר תאריכים (CTRL/SHIFT), recurring assignments (חזרה שבועית), מספר calendars, KPI dashboard, ו-Holiday Groups. הדרך הקלה לשייך שירות: הדבקת ה-URL של ה-schedule.

### 7.4 ייבוא נתונים (CM-017)

פורמטים נתמכים ל-Planning ו-Scheduling: **GTFS, OGTFS, TXC, VDV**, ופורמט **Optibus Dataset** (מבוסס Excel, דורש בניית גיליונות במבנה מוגדר).

## 8. Planning — מוצר התכנון

### 8.1 מבנה ה-Planning (P-001)

מוצר ה-Planning יוצר Timeplans. ארבע לשוניות, ברצף:
1. **Map tab** — יצירה ועריכה של קווים ותחנות, שליטה בצורת הקו.
2. **Route tab** — ניהול patterns ותכונות תחנות/קווים.
3. **Running Times tab** — הגדרת running times לכל segment של הקו, לפי שעות היום (peak/off-peak).
4. **Timetable tab** — הוספת trips ובניית לוח זמנים מלא.

תפריט עליון: חזרה לפרויקטים, יצירת trip IDs אוטומטית (לפי trip Start Time), ייצוא (timeplan ל-Excel/JSON, stop properties, trip properties, stop catalog), ייבוא, Preferences (חוקי ולידציה — control point, headway). Validation Panel בפינה ימנית-תחתונה, משותף לשלושת המוצרים.

### 8.2 Map Tab (P-002)

יצירה ושרטוט קווים, ניהול תחנות, ניתוח כיסוי. בורר Route, יצירת קו (+), service IDs, vehicle types, צבע קו, כיווני Outbound/Inbound, patterns. תפריט קו: Edit, Copy, Convert to route with/without main pattern, Swap directions, Delete, Download map. מבוסס Google Maps (Map/Satellite/Terrain/Street View).
**תחנות**: נקודות לבנות = תחנות רגילות; נקודות צבעוניות = **timepoints** (נקודות לשליטה במרווחי רכבים וב-runtimes).

### 8.3 Route Tab (P-003)

ניהול תכונות קווים/תחנות ויצירת patterns. סוגי תחנה: רגילה (נקודה לבנה), timepoint (נקודה מלאה צבעונית), **relief point** (אייקון שני חצים). מרחקים בין תחנות מוצגים ועריכים (ערך ששונה ידנית מסומן בכתום; אפשר +Factor). ניהול patterns בסרגל שמאלי — "−" הוא שם ברירת המחדל של ה-main pattern; שם עד 6 תווים; copy/delete/add.

### 8.4 Runtimes Tab (P-023)

**Runtime** = הזמן שלוקח לאוטובוס לעבור מתחנה לתחנה. מוגדר per segment, pattern, service ID, direction.
**Timebands** — פרקי זמן ביום שבהם חלים runtimes ספציפיים. ברירת מחדל: timeband יחיד 00:00–36:00 (מכסה trips עד 36 שעות). ניתן להוסיף timebands לשונות לאורך היום. אפשר Highlight trips למעקב אחר trip בודד בין ה-timebands.

### 8.5 Timetable Tab (P-005)

כל שורה = trip; כל תא = הזמן הצפוי בתחנה לפי ה-runtimes. תצוגות table/graph/vehicle. עמודות (Pattern, Vehicle Types, Start Headway, ועוד). Lock trips (מניעת שינוי בטעות ו-Timetable Optimization). Layers/Labels. כפתור Optimize ל-Timetable Optimization (אם בחבילה).

### 8.6 Strategic Planning (P-118)

חבילת כלים ל-PTAs ויועצים ליצירת שירות passenger-centric. שתי toolboxes:
- **Accessibility & Equity** (ב-Map tab) — תובנות נגישות/reachability, מידע ridership ותפוסה, שכבות מפה דמוגרפיות, Impact Analysis, Isochrone analysis, Ridership Insights.
- **Availability & Efficiency** (ב-Timetable tab) — יצירת timetable מאפס לפי frequency/headway, אופטימיזציית timetables (כולל EV) עם offset ranges ונתוני ביקוש, AI predictive runtimes, אופטימיזציית headway בין קווים בנקודה משותפת (Transfer Planning), Hub Management.

### 8.7 Create Schedule Dataset (P-045)

המעבר מ-timeplan ל-schedule. הקשר בין timeplan ל-schedule נקרא **Sync**. **Dataset** = מבט מסוים של timeplan לתזמון (כל הקווים/service IDs/trips או תת-קבוצה). תהליך: Export → Create schedule dataset → בחירת הנתונים → Create → לשונית Scheduling → NEW SCHEDULE. בחירת service IDs לפי service groups. **Depot Code** (= governing depot) — סימון איזה trip מתוזמן תחת דיפו מנהל מסוים; שימושי כשמספר דיפואים חולקים קווים.

## 8א. Planning — העמקה

### Route Patterns (P-017)
Pattern = וריאציה של קו (מעקפים / דילוג תחנות). **pattern אינו יכול לכלול תחנות שאינן בקו המקורי — רק להשמיט תחנות קיימות.** הוספה/עריכה/שכפול/מחיקה מלשוניות Route/Map. Pattern Source מגדיר מאיפה מועתקים רשימת התחנות וצורת הקו. ה-main pattern מסומן ב-dash.

### Services & Service Groups (P-019)
**Service** מגדיר את הימים שבהם קווים פעילים — אבני הבניין של הסידור היומי. **Service Group** מאחד מספר services. Service: Name, Routes, Days of week. יצירת Service Group דורשת מספר services עם ימים חופפים. שירותי חג — להשאיר את כל הימים לא-מסומנים.

### Set Runtimes (P-024)
runtime per segment בין תחנות. בד"כ קובעים runtimes ואז בונים timetable (אפשר גם הפוך — לחלץ runtimes מ-timetable). **Main pattern inheritance** — patterns יורשים runtimes מה-main (מסומן "Main" בתא); אפשר לדרוס ידנית. ניתן Clear runtimes, לייבא מ-service ID אחר, או להדביק מ-Excel. לבן = הוזן ידנית בין timepoints; כתום = דריסת ערך ברירת מחדל.

### Create & Edit Trips (P-075)
לכל Service ID timetable משלו. דרכי בנייה: trip בודד, טווח trips (headway קבוע), custom trips, ייבוא מ-Excel. בעת הוספת טווח: Headway (מרווח בין התחלות), Timepoint (התחנה שסביבה מתוזמן), Respect prior trips. ערכי זמן עד 35:59 (>23:59 = ממשיך ליום הבא). הזנת/הדבקת All Stops/Timepoints דורסת ומחשבת מחדש runtimes; הדבקת Trip start times בלבד שומרת runtimes.

### Trip Headways (P-026)
Headway = תדירות נסיעות. עריכה בעמודת Start Headway. שינוי headway באמצע ה-timetable מזיז את כל הנסיעות שאחריו; שינוי שעת ההתחלה של trip בודד אינו משפיע על אחרים. תכנון מסדרון רב-קווי דרך route group (לתיאום תחנות מעבר).

## 9. Rostering — מוצר מחזורי העבודה

### 9.1 מבנה ה-Rostering (R-002)

ה-Rostering מקצה את ה-Duties (שנוצרו ב-Scheduling) למחזורי עבודה שבועיים. בסביבת העבודה: **כל שורה = חבילת עבודה שבועית**, כל עמודה = יום בשבוע. תא = duty או day off (מוקצים אוטומטית באופטימיזציה או ידנית). תא duty מציג סוג, שעות התחלה-סיום, ו-PT (paid time). **Stack** מימין = duties לא משובצים. **Roster Groups** = קבוצת duties שמתוזמנת יחד. KPIs: Rosters, Paid Time, Overtime, Total Cost.

### 9.2 Rostering Preferences (R-007)

כמו בשאר המוצרים — אילוצים כ-preferences (hard/soft), נלקחים בחשבון באופטימיזציית ה-roster. נטענים דרך טמפלייטים; ניתן לשייך ל-roster groups ספציפיים.
**הבדל חשוב ב-Penalty**: בניגוד ל-Scheduling (penalty = cost), ב-Rostering **כל יחידת penalty = שעת עבודה/paid time**. penalty של 5 = 5 שעות. כלל אצבע: להימנע מ-penalties מעל 10. הפרה → מסגרת אדומה סביב ה-duty + שגיאה ב-validation panel.
preferences עיקריים: Rest Time, Days Off, Overtime, Roster Types, Homogeneity, Rostering Custom, Standby Types, Global Constraints, Roster Cost.

### 9.3 Roster Optimization (R-023, R-028)

- **Non-rotating roster** — כל נהג מבצע את אותו duty בכל שבוע, בד"כ ללא תבנית ימי-חופש קבועה. נדרש להגדיר מינ'/מקס' ימי חופש ב-Days Off, ולהחיל את כל החוקים (Overtime, Rest time, Roster groups, Roster types). אופטימיזציה מייצרת מחדש את ימי החופש (לא מבוססת על ההגדרה הקודמת) ומשבצת את כל ה-duties מה-stack.
- **Rotating rosters** — נהגים מסתובבים בין roster lines על בסיס שבועי (סיים line → השבוע הבא line הבא, עד חזרה לראשון). כל ה-preferences (rest time, days off) מאומתים **בין roster lines**, לא רק בתוך שורה. למשל rest time של 12 שעות נשמר בין ה-duty האחרון של line אחד ל-duty הראשון של הבא. מופעל ע"י toggle "rotating" ב-Roster Groups.

## 9א. Rostering — העמקה

### Rostering Navigation (R-001)
side menu, projects, כפתור חצים מעגליים (Analyze All Roster Groups — ולידציה + עדכון KPIs, generate IDs), Preferences, שלוש נקודות (export לקובץ/Analytics, import roster / import days off מ-roster אחר), שם ה-roster + נעילה, **Group drop-down** (roster groups). Optimize, Stats/Layers. אינדיקטורים: total assigned duties, total empty cells, validation panel.

### Set Roster Groups (R-006)
הדבר הראשון ביצירת roster. כל קבוצה: Group name, **Number of rosters** (טווח, ברירת מחדל 1-999), **Rotation toggle**, **allowed Duties** (All / Selected — לפי Routes, Duty types, Depots, Duty IDs, Preference groups). ההגדרה מסננת אוטומטית את ה-stack ומשתקפת ב-validation panel. roster ריק → קבוצת "Untitled" זמנית.

### Rostering KPIs (R-024)
Duty Types, Roster Types, Paid Time, Make-up Pay, Guaranteed Time, Overtime. **אין צורך בפרמטרי עלות** — הם כבר מה-duty schedule; ב-roster הכול נמדד בשעות paid time. המערכת ממזערת: מספר rosters, paid time, guaranteed time, overtime.

### Rest Time (R-008)
זמן מינימלי בין duties בשני ימים רצופים. אחיד או per roster group.

### Days Off (R-009)
מספר ימי חופש בשבוע. טמפלייטים: **Days Off Constraint** (Min/Max days off, Consecutive days off — חוק קשיח) ו-**Consecutive days off per days off count** (חוק רך עם Violation Penalty).

### Overtime (R-010)
סף שמעליו זמן עבודה נחשב overtime. Overtime start + Pay ratio. טמפלייט Daily overtime: Roster overtime start (שעות שבועיות), Roster work days, Duty overtime start (שעות ב-duty בודד), Roster full time start, Pay ratio (למשל 1.5 = 150%).

### Roster Types (R-011)
מקביל ל-Duty Types אך לרמת ה-roster. Name, Allowed, Paid time range, Number of work days, Number of days off, **Guarantee time** (paid time מובטח גם אם הוקצו פחות שעות), Workdays. **הסדר חשוב** — ה-type הראשון שמתאים נבחר; אין לאפשר חפיפה בין types. הגדרה מחמירה מדי מקשה על שיבוץ — כדאי לאפשר גמישות. type "Other" עם Allowed=No מונע יצירת types לא רצויים.

## 10. Operations — תפעול יומי (Ops)

### 10.1 סקירה (OP-001)

המעבר מתכנון/סידור לתפעול בזמן אמת. Optibus Operations מאפשר: **Resource Management** (נהגים ורכבים במקום אחד, יום-יום ושבוע-שבוע), **Real-Time Allocation** (שיבוץ נהגים/רכבים, התאמה בזמן אמת, sign-ons), **Timekeeping & Payroll** (מעקב שעות, שכר מדויק), **Compliance**. מסכים: Daily, Weekly, Daily Gantt, Plans, Drivers, Vehicles, Payroll. (Operations בדומיין נפרד.)

### 10.2 Daily Screen (OP-020)

ניהול יום בודד — כל ה-duties מכל ה-rosters של כל ה-plans הפעילים ליום, לדיפו/קבוצת נהגים. **Duty table / Block table** במרכז. **Clock** (Today; סטטוס: Running / Completed / Planned). שלושה פאנלים משמאל:
- **Issues** — אזהרות ל-duties/נהגים/blocks; קיבוץ לפי priority/type.
- **Drivers** — קטגוריות: Unassigned, Spare, Standby, Volunteer, Assigned, Not Working. מציג sign-on מתוכנן מול בפועל (איחור בסוגריים).
- **Vehicles** — Assigned, Unassigned, Downtime.
לחיצה על duty/block/driver/vehicle פותחת card מימין.

### 10.3 Weekly Screen (OP-080)

תצוגה שבועית — נהגי הדיפו והעבודה המשובצת להם לשבוע. **Stack** = duties מ-plans פעילים שטרם שובצו. כל **Daily cell** מחולק ל-Main section (שיבוץ פעיל) ו-Status section (הקשר day-level: issues, absences, days off, volunteer/spare, labels). Pinning עד 5 נהגים. רק duties של plans פעילים מוצגים. **פעולות ב-Weekly אינן משנות את ה-plans, אך משפיעות על ה-Daily.**

### 10.4 Allocation Optimization (OP-088)

מנוע ההתאמה של נהגים ל-duties. **Hard rules** (חובה — הפרה אסורה) מוערכים ראשונים; אז **Soft rules** (העדפות נהג ויעילות עלות) קובעים את ההתאמה הטובה ביותר. סוגי חוקים: General Time Limitations (מנוחה מינ', מקס' עבודה יומי/שבועי, איזון overtime, ימי חופש), Attribute-Based, Route Qualification (נהג מוקצה רק לקווים שהוסמך), Driver Duty Patterns (duty type / block patterns), Homogeneity (עקביות — אותו duty בימים רצופים, עקביות שעת התחלה). **No-Match**: אם duty לא ניתן לשיבוץ ללא הפרת hard rule — נשאר ב-unassigned stack, המערכת לא כופה שיבוץ לא-תקין.

## 10א. Operations — העמקה

### Daily Duties (OP-022)
מעבר בין duty view ל-block view. פילטרים: **Requires Action** (דורש טיפול), All, Upcoming, Running, Completed. סטטוסי duty: **Assigned** (יש נהג, טרם sign-on), **Unassigned**, **Ready** (מכוסה + נהג חתם), **Running**, **Completed**, **Canceled**, **At risk** (נהג לא חתם וזמן עד ההתחלה חורג מסף), **Late** (היה אמור להתחיל וחסר נהג/חתימה). סימון אדום משמאל = issues. ייצוא Daily Assignments ל-CSV.

### Create Custom Duties (OP-031)
משימות מותאמות לפעילויות שלא ב-roster (הדרכות, איסוף נהגים/רכבים). חישובי שכר מבוססי האירועים. אפשר Make a copy (משכפל רק את משימת ה-duty, לא קווים/blocks).

### Assign a Driver to a Duty (OP-025)
duty ללא נהג → "Missing Driver" + issue ב-validation panel. **מצב Assignment**: רשימת הנהגים מודגשת עם **כוכבי המלצה** (יותר כוכבים = המלצה חזקה יותר; אדום = שיבוץ שעלול לגרום issue, עדיין מותר). פעולות: Assign / Swap / Assign and Swap. נהג ביום חופש → "Assign on Day Off". Unassign (bin), Swap (חצים), ופעולות bulk ב-Weekly view.

### Daily Approval / Finalization (OP-086)
מאשר שתוכנית היום סופית. סטטוסים: **Planning** → **Running** → **Completed** → **Approved**. אישור (Approve) **נועל את היום** — אין עוד שינויים (תצוגה בלבד). Reverse פותח מחדש לעריכה.

### Plans (OP-012)
**Plan** = roster + roster group + טווח תאריכים + שיבוץ נהגים. ניתן לעריכה רק כשהוא deactivated ולא נעול. נשאר draft עד **Activate**. ניתן ליצור plan חדש מתוך ה-Validation Panel כשתוכנית פגה.

### Operations Preferences (OP-060)
**גלובליות** — חלות על כל הדיפואים. קטגוריות: Drivers, Driver Attributes, Duties, Plans, Calendar, General, Payroll, Driver App. soft/hard rules. **Prevent Action** — מנגנון 3 אזורים: **Safe zone** (מותר), **Warning zone** (אזהרה), **Prevent action zone** (חסום). hard rule חוסם פיזית את הפעולה; ב-recommendation engine — warning = כוכב עם מסגרת אדומה; hard violation = שם מוכהה, אפס כוכבים, חסום.

## 11. Control — בקרה בזמן אמת (C-015)

פלטפורמה לניהול תפעול אוטובוסים בזמן אמת; מחברת מערכות רכב, נהגים, מרכזי בקרה ונוסעים.
- **Data Control Box (DCB)** — מותקן בכל רכב; תומך בנהג, מאפשר מעקב מדויק, מפעיל מידע לנוסעים ואוסף נתונים תפעוליים. מחובר ל-Optibus SaaS Cloud בתקשורת מוצפנת 4G/Wi-Fi (דו-כיוונית, עם עמידות offline).
- **8 תחומי שירות מרכזיים**: (1) Driver communication & dispatch (VoIP, הודעות טקסט); (2) Real-time service compliance monitoring (מעקב רכב, punctuality, curtailments/reinforcements, התראות, ETA); (3) Incident Management (יצירת אירועים אוטומטית, black box, CCTV); (4) Mileage certification (מעקב CAN, מתוכנן מול בפועל, דוחות נסועה לרגולטור); (5) Driver & vehicle performance monitoring; (6) Passenger information (TTS רב-לשוני, GTFS/GTFS-RT/SIRI/NeTEx); (7) Safety & surveillance (panic button, CCTV); (8) Data feeds & integration (APIs, תקני EU).

## 12. Driver App — אפליקציית הנהג

אפליקציית הנהג של Optibus. כוללת: הגדרות Sign-on, יצירת חשבונות נהג, **Driver Kiosk** (עמדה ייעודית — Windows/iOS/Android, כולל RFID sign-on). **Dispatch**: הודעות לנהגים, **Roster Bidding** (pick cycles, hybrid bidding, lieu days), Driver notes. **Requests**: בקשות היעדרות, בקשות החלפה same-day. מסכים לנהג: Home, Schedule, Timesheets, Actions.

## 13. Reports & Protocols

**Reports** — דוחות תפעוליים: Title VI Report, Bus Graph & Crew Graph, Bus Board, Duty Sheet, Roster Statistics, Timetable report, Revenue Trip Summary, Miles and Hours, Vehicle Stats, Duty Stats, Duty summary, Crew Schedule Report, Roster Bid Sheet.

**Protocols** — פורמטי ייבוא/ייצוא מול מערכות חיצוניות ורשויות: GTFS (ייבוא/ייצוא + metadata ל-Trips/Calendar), OGTFS, TXC, VDV 452, BODS, EBSR, Grampian, Trapeze TSDE, Avail, EP Morris (EPM), Ticketer.

## ממצאים רלוונטיים להרצות הכושלות של אורי (מפת חולון)

### 14.1 מה ידוע

שתי הרצות על העותק SbDYvjTwaO נכשלו עם אותה שגיאה מדויקת:
`TypeError("'NoneType' object is not subscriptable (key slice(0, None, 2))")`,
תחת ההודעה הגנרית "Optimization could not be completed — please try again with a different configuration". ההרצה האחרונה (רכבים+נהגים, פרופיל Advanced Vehicle adapter) התקדמה דרך Creating vehicles → Creating pieces → Initializing duty creation, וקרסה ב-**Creating duties** (63%). ה-KPIs לא השתנו; הלוח נשאר על ה-Baseline.

### 14.2 אבחון מבוסס-תיעוד

1. **זו קריסת מנוע, לא אי-יכבילות מתועדת.** ל-Optibus יש הודעות ייעודיות ומובחנות לכשלי תכנון לגיטימיים: "Too Many Duty Candidates", "No Valid Duty Candidates", "Optimization Timeout" (S-111/S-118/S-148). ההרצות של אורי לא קיבלו אף אחת מאלו — הן קיבלו הודעה גנרית עם traceback של פייתון. **TypeError הוא חריגת קוד (exception) במנוע**, לא תוצאה של אילוץ מחמיר.

2. **הפרופיל שבו נעשה שימוש אינו הנתמך.** Run B רץ עם **Advanced Vehicle adapter**. התיעוד הרשמי (S-069 Schedule Optimization, S-010 Algorithm Parameters) קובע במפורש: **AFB (Advanced Fixed Blocks) הוא ברירת המחדל ויש להשתמש בו ברוב המקרים; Vehicle adapter / Advanced vehicle adapter / Fixed blocks מיועדים ל-deprecation ואינם מומלצים.** הרצה דרך נתיב אלגוריתם שאינו נתמך היא חשודה מובהקת לקריסה.

3. **מיקום הקריסה עקבי עם צד ה-Crew.** "Creating duties" הוא שלב יצירת/סינון מועמדי ה-Duties (S-170). ה-`slice(0, None, 2)` ("כל איבר שני") עקבי עם קוד שמזווג pieces/relief points. שלב הרכבים הושלם — הבעיה בצינור ה-Crew.

### 14.3 מסלול מומלץ (לפי סדר)

1. **להחליף את ה-Crew Algorithm ל-AFB** ולהריץ שוב (על העותק). זה השינוי בעל הערך הגבוה ביותר — מעבר מנתיב לא-נתמך לנתיב הנתמך. דורש ב-Algorithm Parameters טמפלייט AFB עם Vehicles VIP version 2/3.
2. לוודא שכל ה-preferences החובה מוגדרים ותקינים: **Cost, Depot Setup, Midday Park, Algorithm Parameters, Pre/Post Trip**.
3. לוודא ש-**Limit Short Pieces** מוגדר (60–90 דק') ושקיים **Crew Relaxation** עליו — מקטין דרמטית את ה-pool ואת הסיכון לקריסות scaling.
4. לוודא ש-**Relief Points** ו-**Relief Timing** מוגדרים ואינם paused; ש-**Duty Types** אינם מחמירים מדי / אינם ריקים מטווחי work/spread (S-148: טווחים ריקים מבטלים את ה-fast rejects); ש-**Split Break Definition** מוגדר.
5. אם גם AFB קורס — זו ככל הנראה תקלת מנוע של Optibus. לפתוח קריאה ב-**Tickets Portal** (דרך ה-Help Center) עם מחרוזת השגיאה המדויקת וה-Bug Report.

### 14.4 הערה על ה-Baseline

116 "Missing or illegal midday park" + Trip connection violations + Duty issues הם בעיות ולידציה **קיימות ב-Baseline עצמו**, נפרדות מהקריסה. הם מצביעים על נתוני קלט/preferences שדורשים ליטוש (Deadhead, Midday Park, Relief Points, Trip Connections) — אך אינם הגורם הישיר ל-TypeError.

---

## 15. מילון מונחים — Optibus

| מונח | הסבר |
|---|---|
| Project | מכל של שינוי שירות, ≈ תקופת sign-up. מכיל Planning/Scheduling/Rostering |
| Timeplan (Tp) | תכנון ב-Planning: קווים, patterns, runtimes, timetables |
| Dataset (Ds) | מבט מסוים של timeplan המיוצא ל-Scheduling/Rostering |
| Schedule (Sc) | תרחיש הקצאת משאבים תחת Dataset |
| Sync | הקשר/סנכרון בין timeplan ל-schedule |
| Service ID / Service Group | יום/סוג שירות; קבוצת service IDs |
| Route / Pattern | קו; וריאציית מסלול בתוך קו (מעקף/דילוג תחנות) |
| Timepoint | תחנה (נקודה צבעונית) לשליטה במרווחים וב-runtimes |
| Relief Point | נקודה שבה נהג עולה/יורד — נקודת חיתוך הרכב ל-pieces |
| Runtime | זמן נסיעה בין שתי תחנות |
| Timeband | פרק זמן ביום שבו חלים runtimes מסוימים (ברירת מחדל 00:00–36:00) |
| Trip | נסיעה בודדת בלוח הזמנים |
| Deadhead | נסיעה ריקה (ללא נוסעים) |
| Pull-out / Pull-in | deadhead מ-/אל דיפו |
| Layover | שהייה בין אירועים |
| Block | רצף משימות של רכב בודד |
| PVR | Peak Vehicle Requirement — מספר הרכבים בשיא |
| Duty / Run | רצף עבודה של נהג ביום |
| Piece | רצף אירועי רכב חוקי לנהג כיחידה; אבן בניין של Duty |
| Uncuttable piece | piece לא-תקף שלא ניתן לחתוך באופטימיזציה |
| Candidate | duty מועמד שנוצר משילוב pieces |
| Changeover | מעבר נהג בין רכבים |
| Split duty | משמרת מפוצלת עם פער משמעותי |
| Spread time | הזמן הכולל מתחילת האירוע הראשון לסוף האחרון ב-duty |
| Work time | אורך ה-duty ללא split time |
| Paid time | work time פחות unpaid break time (ניתן להגדרה) |
| Platform time | זמן הרכב מחוץ לדיפו |
| Duty Type | מבנה duty מותר (start/end/paid/work/spread) |
| Preference | חוק/הגדרה; hard (קשיח) או soft (penalty) |
| Penalty | משקל הפרת soft rule. ב-Scheduling = cost; ב-Rostering = שעת עבודה |
| Hard / Soft rule | אסור להפר / ניתן להפר במחיר penalty |
| Crew Algorithmic Cost | המספר שאופטימיזציית ה-duties ממזערת |
| AFB | Advanced Fixed Blocks — אלגוריתם ברירת המחדל המומלץ |
| DEEP | אלגוריתם המאפשר שינוי רכבים יחד עם אופטימיזציית duties |
| Global Constraints | אילוצים השולטים *בתוצאת* האופטימיזציה (אילו duties ייבחרו) |
| Preference Group | קבוצה לוגית של duties עם חוקים/העדפות |
| Route Group | קבוצת קווים, לרוב מסדרון משותף, ל-interlining/אופטימיזציה משותפת |
| Interlining | שיבוץ קווים שונים באותו block/duty |
| Roster / Rota | מחזור עבודה שבועי/תקופתי לנהגים |
| Rotating roster | נהגים מסתובבים בין roster lines שבועית |
| STO | Schedule Timetable Optimization — התאמת שעות trips בטווח גמישות |
| SoC | State of Charge — מצב טעינת סוללת רכב חשמלי |
| DCB | Data Control Box — יחידת הבקרה ברכב (מוצר Control) |
| Validation Panel | פאנל אזהרות/שגיאות (משותף לכל המוצרים) |
| KPI Dashboard | לוח מדדים בראש מסך הסידור |
| Stack | מאגר הפריטים הלא-משובצים (trips/duties) |

## 16. Playbook — איך להריץ, לבדוק ולשפר מפה

**זרימת עבודה תקנית (S-003, S-036):**
1. ליצור/לפתוח Schedule מתוך Dataset.
2. להגדיר preferences בסיסיים (חובה): Cost, Depot Setup, Midday Park, Algorithm Parameters (AFB), Pre/Post Trip.
3. להגדיר preferences נוספים לפי הצורך: Relief Points, Relief Timing, Trip Connections, Layovers, Duty Breaks, Split Break Definition, Duty Types, Limit Short Pieces + Crew Relaxation, Time Definitions, Global Constraints.
4. אופטימיזציית רכבים, ואז duties.
5. **Analyze** אחרי כל שינוי → לבדוק KPIs ו-Validation Panel.
6. עריכה ידנית לליטוש, ואז ייצוא/מעבר ל-Rostering.

**צ'קליסט טרום-הרצה:**
- כל ה-trips משויכים, תקופת שירות וימי פעילות מוגדרים.
- Deadhead Catalog שלם ומכסה את נקודות המפתח.
- Depots, pull-out/pull-in, Midday Park מוגדרים.
- Crew Algorithm = **AFB** (לא נתיב deprecated).
- Limit Short Pieces 60–90 דק' + Crew Relaxation.
- Duty Types מכסים את כל שעות היום, עם טווחי work/spread מסומנים (checkbox), לא מחמירים מדי.
- Relief Points / Relief Timing מוגדרים ואינם paused.
- אין סתירה בין Duty Types ל-Time/Work Limitations.
- קיים Baseline שמור להשוואה (Schedule נפרד).

**לקריאת תוצאה:** Crew Algorithmic Cost הוא מדד ההשוואה המרכזי ל-duties; Blocks/PVR ו-Vehicle Efficiency לרכבים; להשוות מול Baseline; לעבור על Validation Panel כצ'קליסט.

## 17. היקף הלימוד — גילוי נאות

מסמך זה מבוסס על קריאה מעמיקה של **~97 מאמרים** ממרכז התיעוד הרשמי help.optibus.co (מתוך ~488), בשלושה סבבי סריקה. הכיסוי הרעיוני של כל 12 הקטגוריות מלא, עם עומק נרחב ב-Scheduling: סקירות מוצר, workflows, מודל האופטימיזציה, **מערכת ה-Preferences כמעט בשלמותה** (Vehicles, Drivers, Depots, Misc, EV — כולל Designers), ולידציה ו-KPIs, עריכה ידנית, Projection, ומאמרי ה-troubleshooting המרכזיים. כן נקראו לעומק מבנה ה-Platform, ארבע לשוניות ה-Planning + פרטי patterns/services/runtimes/timetable, Rostering, ו-Operations.

המאמרים שלא נקראו (~391) הם ברובם המכריע מדריכי "איך לבצע פעולה X" פרטניים בממשק, ווריאציות per-template, ומאמרי ייצוא/פרוטוקול ספציפיים (TXC/VDV/BODS וכו'). **הערכה כנה**: השליטה הרעיונית — איך Optibus עובדת מקצה לקצה, הטרמינולוגיה, זרימות העבודה, לוגיקת האופטימיזציה והכשלים — גבוהה מאוד. המכניקה הפרטנית של כל מסך נסקרה ברובה אך לא ממוצתה. ניתן להעמיק נקודתית בכל תחום לפי בקשה.

---

## 18. נוהל "סוכן הרצת מפות" — Operating Procedure

נוהל מובנה שלפיו הסוכן מריץ, בודק ומשפר מפות Optibus בפקודת המשתמש. כל הרצה עוברת את ששת השלבים, עם נקודות עצירה לאישור.

### שלב 0 — Pre-flight (קריאה בלבד)
זיהוי: שם Schedule, Dataset, Version, Service ID, סטטוס נעילה וסנכרון. לוודא שעובדים על העותק/הגרסה הנכונה ולא על ייצור. סקירת מצב: trips משובצים, warnings/errors קיימים, תוצאות קודמות.

### שלב 1 — Baseline
תיעוד KPIs לפני כל שינוי: Blocks/PVR, Duties, Vehicle/Crew Efficiency, Service km, Deadhead km+%, Total/Crew/Vehicle Cost, Crew Algorithmic Cost, Vehicle Issues, Duty Issues + פירוט לפי סוג. שמירת Baseline כ-Schedule נפרד להשוואה (Save As / Projection).

### שלב 2 — הכנה (על עותק בלבד)
- לעבוד על Copy נפרד; המקור לא נגוע.
- צ'קליסט preferences (פרק 16): חובה — Cost, Depot Setup, Midday Park, Algorithm Parameters, Pre/Post Trip. מומלץ — Relief Points/Timing, Limit Short Pieces (60–90) + Crew Relaxation, Duty Types שמכסים את כל היום, Trip Connections, Layovers, Breaks, Split Break Definition.
- **Crew Algorithm = AFB** (Advanced Fixed Blocks) — לא נתיב deprecated.
- לא לשנות constraints/depots/deadhead/timetable ללא אישור מפורש.

### שלב 3 — מסך אישור Run
לפני הרצה להציג: שם העותק + ID; אישור שהמקור לא נגוע; כל פרמטר (מצב נוכחי → מוצע) ונימוק; מה צפוי/לא צפוי להשתנות; סיכונים; Baseline KPIs; תנאי הצלחה ותנאי כישלון מספריים. **לעצור ולהמתין לאישור מפורש.**

### שלב 4 — הרצה
לחיצת Optimize אחת. לא Save/Apply/Publish. המתנה לסיום. תיעוד הודעת מערכת/Bug Report אם מופיעים.

### שלב 5 — ניתוח תוצאה
השוואת KPIs מול Baseline; בדיקת תנאי הצלחה/כישלון; קריאת Validation Panel כצ'קליסט; זיהוי אילוצים שנשברו ומקומות שהמנוע "נכנע". התוצאה נקראת כ-*מידע*, לא רק עובר/נכשל. אימות 2–3 מספרים מול המסך בפועל.

### שלב 6 — איטרציה
שינוי פרמטר *אחד* בכל פעם להשוואה נקייה; או תיקון נתוני קלט (Deadhead, Relief, Midday, Trip Connections); או הסלמה לתמיכת Optibus אם זוהה באג מנוע.

### עץ אבחון כשלי אופטימיזציה
- **"Optimization could not be completed" + TypeError/traceback** → קריסת מנוע. לוודא Crew Algorithm = AFB; אם נמשך → קריאת תמיכה עם ה-Bug Report.
- **"Too Many Duty Candidates"** → Relief Points עודפים / Exclude from optimization חסר / Limit Short Pieces חסר → להוסיף Limit Short Pieces, לצמצם Relief Points, לבדוק Preference Groups.
- **"No Valid Duty Candidates"** → Duty Types מחמירים מדי / סתירה עם Time/Work Limitations / Breaks תכופים מדי / Driver Base/Taxi catalog שגוי.
- **"Optimization Timeout"** → להעלות Limit Short Pieces ל-≥90, להקטין Retention Ratio, לוודא Duty Types עם טווחי work/spread.
- **Trip connection violations / Illegal relief point / Midday park issues** → בעיות נתוני קלט/preferences ב-Baseline; לטפל בנפרד מהקריסה.

### עקרונות-על
לעבוד לאט, מסודר, בשקיפות; אף פעם לא לעבוד על גרסת ייצור; לעצור לפני Run/Save/Apply/Publish/Delete/יצירת Version ולדווח מה/למה/סיכון/הפיכות; כל מסקנה מבוססת על מה שנראה בפועל, הנחות מסומנות במפורש.
