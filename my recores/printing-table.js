// DEV --------------------------------------------------------------------------------------

let isDev = false;

function DEV() {
    if (isDev === false) {
        $("#dev-manu").show();
        isDev = true;
    } else {
        $("#dev-manu").hide();
        isDev = false;
    }
}
$("#dev-manu").hide();


// ROW DATA --------------------------------------------------------------------------------------

// SYSTEM --------------------------------------------------------------------------------------

// BOOTSTRAP TOOLTIP

const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

// SCREENTEST FOR TOOLTIP

function screenTest(e) {
    if (e.matches) {
        /* TO MOBILE (if the viewport is 576px wide or less) */
        $('[data-bs-toggle="tooltip"]').tooltip('disable');
    } else {
        /* TO DESKTOP (if the viewport is more than 576px wide) */
        $('[data-bs-toggle="tooltip"]').tooltip('enable');
    }
}

const mediaQueryList = window.matchMedia("(max-width: 576px)");
mediaQueryList.addListener(screenTest);
const e = window.matchMedia("(max-width: 576px)");

$(document).ready(function () {
    screenTest(e);
});

// NEW FUNCTIONS --------------------------------------------------------------------------------------

// ADD REMOVE PANDING ORDERS 

function fAddPendingOrders() {
    $(".f-add-pending-orders-show").toggleClass("d-none");
    $(".f-add-pending-orders-show").toggleClass("d-flex");
    $(".f-add-pending-orders-pink-bold").toggleClass("text-pink");
    $(".f-add-pending-orders-pink-bold").toggleClass("fw-bold");
}

// LOG IN OUT

function fLogInOut() {
    $(".f-log-in-show").toggleClass("d-none");
    $(".f-log-in-show").toggleClass("d-flex");
}

// OPEN CLOSE MY PROFILE MANU

function fMyProfilManu() {
    $(".f-my-prifile-manu").toggleClass("d-none");
    $(".f-my-prifile-manu").toggleClass("d-flex");
}
// TOOLTOPS WITH HTML => BRANCH DATA

// NOT WORKING

// $(".i-explain-branch-data").attr("title", $("i-explain-html-branch-data").html());
// $(".i-explain-branch-data").attr("data-bs-toggle", "tooltip");

// SHOW HTML

// branch data tooltip
function FIExplainHtmlBranchData() {
    $(".i-explain-html-branch-data").toggleClass("d-sm-flex");
}

// paper data tooltip
function FIExplainHtmlPaperData() {
    $(".i-explain-html-paper-data").toggleClass("d-sm-flex");
}

// PLOTTER OR EXPRESS

$(".f-express-show").addClass("d-flex");
$(".f-plotter-show").addClass("d-none");

function fPlotterOrExpress() {
    $(".f-express-show").toggleClass("d-none");
    $(".f-express-show").toggleClass("d-flex");

    $(".f-plotter-show").toggleClass("d-none");
    $(".f-plotter-show").toggleClass("d-flex");
}

// ADD REMOVE LAST LOCATIONS 

function fAddRemoveLastPlaces() {
    $(".f-add-remove-last-places-show").toggleClass("d-none");
    $(".f-add-remove-last-places-show").toggleClass("d-flex");
    $(".f-add-remove-last-places-hide").toggleClass("d-none");
    $(".f-add-remove-last-places-hide").toggleClass("d-flex");
}

// ADD REMOVE FIELD ERRORS

function fFieldsErrors() {
    $(".f-field-error-show").toggleClass("d-none");
    $(".f-field-error-show").toggleClass("d-flex");
    $(".f-field-error-red").toggleClass("red-field");
}

// MAIN DROP DOWN MANU OPEN CLOSE

function mainDropDownDesktop() {
    $(".f-main-drop-down-desktop-show").toggleClass("d-none");
    $(".f-main-drop-down-desktop-show").toggleClass("d-flex");
}

// COPY AND SCAN

function fCopyAndScan() {
    $(".f-copy-and-scan").toggleClass("d-none");
    $(".f-copy-and-scan").toggleClass("d-flex");
}

// THREE DOTS MANU - file options for mobile

function threeDotsManu() {
    $(".f-three-dots-file-manu").toggleClass("d-none");
    $(".f-three-dots-file-manu").toggleClass("d-flex");

    $(".f-three-dots-file-btn").toggleClass("bg-gray-v-light");
}

// CHAINGE THAMB NAIL

function fChaingeThambNail() {
    $(".f-thamb-nail").attr("src", "thamb-nail-2.jpg");
}

// ADD REMOVE PHONE NUMBER

function fAddRemovePhoneNumber() {
    $(".f-phone-show").toggleClass("d-none");
    $(".f-phone-show").toggleClass("d-flex");
}

// OFFCANVAS PRINTING SETTINGS

// size
function iExplainPSettingsSize() {
    $(".f-offcanvas-title-p-system-data").html("גודל");
    $(".f-offcanvas-body-p-system-data").html("במידה ותחבר ב”מקורי” הקובץ יודפס במידותיו המקוריות, ובמידה ותבחר ב”מקסימלי” נתאים את מידות ההדפסה לגודל המקדימלי בהתאם למגבלות גודל הנייר שבחרת. במידה והקובץ גדול יותר מהנייר, נקטין אותו כך שיכנס במידות של סוג הנייר שבחרת.");
}
// resize
function iExplainPSettingsResize() {
    $(".f-offcanvas-title-p-system-data").html("שינוי גודל");
    $(".f-offcanvas-body-p-system-data").html("בלחיצה על כפתור זה תוכל לשנות את מידות ההדפסה - להגדיל או להקטין את ההדפסה שלך לגודל שונה מהמידות המקוריות של הקובץ. יש לשים לב לרזולוציה המוצגת בזמן שמשנים את גודל ההדפסה, ומומלץ להשאר בתווך הירוק בו הרזולוציה הינה 300.");
}
// margen
function iExplainPSettingsMargen() {
    $(".f-offcanvas-title-p-system-data").html("שוליים");
    $(".f-offcanvas-body-p-system-data").html("המדפסות שלנו לא מדפיסות את 5 המ”מ הסמוכים לכל 4 קצוות הגיליון. בחירת “שוליים” תוסיף תוספת (בשפה המקצועית - “בליד”) של 1 ס”מ של נייר לבן בתחילת ובסוף הגיליון שלך ובכך תמנע חיתוך של 2 צדדים אלה מההדפסה שלך.");
}
// center
function iExplainPSettingsCenter() {
    $(".f-offcanvas-title-p-system-data").html("מירכוז");
    $(".f-offcanvas-body-p-system-data").html("המדפסות שלנו לא מדפיסות את 5 המ”מ הסמוכים לכל 4 קצוות הגיליון. כפתור זה ימרכז את ההדפסה שלך לרוחב הגיליון ובכך ימנע חיתוך של 2 צדדים אלה מההדפסה שלך.");
}

// PRINTING SETTINGS CANT CHAINGE

function fSettingsCantChainge() {
    $(".f-settings-btn-unavalble").removeClass("d-none");
    $(".f-settings-btn-unavalble").addClass("d-flex");
    $(".f-settings-btn-hide-unavalble").addClass("d-none");
    $(".f-settings-btn-hide-unavalble").removeClass("d-flex");
}


// PRINTING TABLE STAGE (empty upload process choose print) --------------------------------------------------------------------------------------

// HIDE ALL

function hideAllfPtb() {
    // 1-empty
    $(".f-pt-1-empty").addClass("d-none");
    $(".f-pt-1-empty").removeClass("d-flex");
    $(".f-pt-1-empty").removeClass("d-lg-none");
    $(".f-pt-1-empty").removeClass("d-lg-flex");

    $(".f-pt-1-empty-lg-none").addClass("d-none");
    $(".f-pt-1-empty-lg-none").removeClass("d-flex");
    $(".f-pt-1-empty-lg-none").removeClass("d-lg-none");
    $(".f-pt-1-empty-lg-none").removeClass("d-lg-flex");

    $(".f-pt-1-empty-none-lg-flex").addClass("d-none");
    $(".f-pt-1-empty-none-lg-flex").removeClass("d-flex");
    $(".f-pt-1-empty-none-lg-flex").removeClass("d-lg-none");
    $(".f-pt-1-empty-none-lg-flex").removeClass("d-lg-flex");

    // 2-upload
    $(".f-pt-2-upload").addClass("d-none");
    $(".f-pt-2-upload").removeClass("d-flex");
    $(".f-pt-2-upload").removeClass("d-lg-none");
    $(".f-pt-2-upload").removeClass("d-lg-flex");

    $(".f-pt-2-upload-lg-none").addClass("d-none");
    $(".f-pt-2-upload-lg-none").removeClass("d-flex");
    $(".f-pt-2-upload-lg-none").removeClass("d-lg-none");
    $(".f-pt-2-upload-lg-none").removeClass("d-lg-flex");

    $(".f-pt-2-upload-none-lg-flex").addClass("d-none");
    $(".f-pt-2-upload-none-lg-flex").removeClass("d-flex");
    $(".f-pt-2-upload-none-lg-flex").removeClass("d-lg-none");
    $(".f-pt-2-upload-none-lg-flex").removeClass("d-lg-flex");

    // 3-process
    $(".f-pt-3-process").addClass("d-none");
    $(".f-pt-3-process").removeClass("d-flex");
    $(".f-pt-3-process").removeClass("d-lg-none");
    $(".f-pt-3-process").removeClass("d-lg-flex");

    $(".f-pt-3-process-lg-none").addClass("d-none");
    $(".f-pt-3-process-lg-none").removeClass("d-flex");
    $(".f-pt-3-process-lg-none").removeClass("d-lg-none");
    $(".f-pt-3-process-lg-none").removeClass("d-lg-flex");

    $(".f-pt-3-process-none-lg-flex").addClass("d-none");
    $(".f-pt-3-process-none-lg-flex").removeClass("d-flex");
    $(".f-pt-3-process-none-lg-flex").removeClass("d-lg-none");
    $(".f-pt-3-process-none-lg-flex").removeClass("d-lg-flex");

    // 4-choose
    $(".f-pt-4-choose").addClass("d-none");
    $(".f-pt-4-choose").removeClass("d-flex");
    $(".f-pt-4-choose").removeClass("d-lg-none");
    $(".f-pt-4-choose").removeClass("d-lg-flex");

    $(".f-pt-4-choose-lg-none").addClass("d-none");
    $(".f-pt-4-choose-lg-none").removeClass("d-flex");
    $(".f-pt-4-choose-lg-none").removeClass("d-lg-none");
    $(".f-pt-4-choose-lg-none").removeClass("d-lg-flex");

    $(".f-pt-4-choose-none-lg-flex").addClass("d-none");
    $(".f-pt-4-choose-none-lg-flex").removeClass("d-flex");
    $(".f-pt-4-choose-none-lg-flex").removeClass("d-lg-none");
    $(".f-pt-4-choose-none-lg-flex").removeClass("d-lg-flex");

    // 5-print
    $(".f-pt-5-print").addClass("d-none");
    $(".f-pt-5-print").removeClass("d-flex");
    $(".f-pt-5-print").removeClass("d-lg-none");
    $(".f-pt-5-print").removeClass("d-lg-flex");

    $(".f-pt-5-print-lg-none").addClass("d-none");
    $(".f-pt-5-print-lg-none").removeClass("d-flex");
    $(".f-pt-5-print-lg-none").removeClass("d-lg-none");
    $(".f-pt-5-print-lg-none").removeClass("d-lg-flex");

    $(".f-pt-5-print-none-lg-flex").addClass("d-none");
    $(".f-pt-5-print-none-lg-flex").removeClass("d-flex");
    $(".f-pt-5-print-none-lg-flex").removeClass("d-lg-none");
    $(".f-pt-5-print-none-lg-flex").removeClass("d-lg-flex");
}

// STAGES:

let fPtCurrentValue;

// 1-empty
function fPt1Empty() {
    hideAllfPtb();

    $(".f-pt-1-empty").removeClass("d-none");
    $(".f-pt-1-empty").addClass("d-flex");

    $(".f-pt-1-empty-lg-none").removeClass("d-none");
    $(".f-pt-1-empty-lg-none").addClass("d-flex");
    $(".f-pt-1-empty-lg-none").addClass("d-lg-none");

    $(".f-pt-1-empty-none-lg-flex").addClass("d-none");
    $(".f-pt-1-empty-none-lg-flex").addClass("d-lg-flex");

    $(".f-pt-main-canvas").addClass("bg-hover-green-shadow");

    $(".f-pt-main-btn").addClass("btn-unavalble");
    $(".f-pt-main-btn").removeClass("btn-avalble");
    $(".f-pt-main-btn").addClass("d-flex");
    $(".f-pt-main-btn").removeClass("d-none");
    $(".f-pt-main-btn").removeClass("d-lg-flex");
    $(".f-pt-main-btn").html("שלח הזמנה להדפסה");
    $(".f-pt-main-btn").attr("data-bs-original-title", "בכדי להדפיס יש להעלות לפחות קובץ אחד.");
    $(".f-pt-main-btn-mobile").addClass("d-none");
    $(".f-pt-main-btn-mobile").removeClass("d-flex");
    $(".f-pt-main-btn-mobile").removeClass("d-lg-none");

    fPtCurrentValue = "empty";
}

// 2-upload
function fPt2Upload() {
    hideAllfPtb();

    $(".f-pt-2-upload").removeClass("d-none");
    $(".f-pt-2-upload").addClass("d-flex");

    $(".f-pt-2-upload-lg-none").removeClass("d-none");
    $(".f-pt-2-upload-lg-none").addClass("d-flex");
    $(".f-pt-2-upload-lg-none").addClass("d-lg-none");

    $(".f-pt-2-upload-none-lg-flex").addClass("d-none");
    $(".f-pt-2-upload-none-lg-flex").addClass("d-lg-flex");

    $(".f-pt-main-btn").addClass("btn-unavalble");
    $(".f-pt-main-btn").removeClass("btn-avalble");
    $(".f-pt-main-btn").addClass("d-flex");
    $(".f-pt-main-btn").removeClass("d-none");
    $(".f-pt-main-btn").removeClass("d-lg-flex");
    $(".f-pt-main-btn").html("שלח הזמנה להדפסה");
    $(".f-pt-main-btn").attr("data-bs-original-title", "אנא המתן, הקבצים שלך עולים לשרת. משך תהליך זה תלוי באיכות חיבור האינטרנט שלך בלבד.");
    $(".f-pt-main-btn-mobile").addClass("d-none");
    $(".f-pt-main-btn-mobile").removeClass("d-flex");
    $(".f-pt-main-btn-mobile").removeClass("d-lg-none");

    $(".f-pt-main-canvas").removeClass("bg-hover-green-shadow");

    fPtCurrentValue = "upload";
}

// 3-process
function fPt3Process() {
    hideAllfPtb();

    $(".f-pt-3-process").removeClass("d-none");
    $(".f-pt-3-process").addClass("d-flex");

    $(".f-pt-3-process-lg-none").removeClass("d-none");
    $(".f-pt-3-process-lg-none").addClass("d-flex");
    $(".f-pt-3-process-lg-none").addClass("d-lg-none");

    $(".f-pt-3-process-none-lg-flex").addClass("d-none");
    $(".f-pt-3-process-none-lg-flex").addClass("d-lg-flex");

    $(".f-pt-main-btn").addClass("btn-unavalble");
    $(".f-pt-main-btn").removeClass("btn-avalble");
    $(".f-pt-main-btn").addClass("d-flex");
    $(".f-pt-main-btn").removeClass("d-none");
    $(".f-pt-main-btn").removeClass("d-lg-flex");
    $(".f-pt-main-btn").html("שלח הזמנה להדפסה");
    $(".f-pt-main-btn").attr("data-bs-original-title", "אנא המתן, המערכת מעבדת את הקבצים שלך להדפסה. אם הפעולה נמשכת מעל 3 דקות נשמח לעזור לך בווצאפ, המספר 03-3746962.");
    $(".f-pt-main-btn-mobile").addClass("d-none");
    $(".f-pt-main-btn-mobile").removeClass("d-flex");
    $(".f-pt-main-btn-mobile").removeClass("d-lg-none");

    $(".f-pt-main-canvas").removeClass("bg-hover-green-shadow");

    fPtCurrentValue = "process";
}

// 4-choose
function fPt4Choose() {
    hideAllfPtb();

    $(".f-pt-4-choose").removeClass("d-none");
    $(".f-pt-4-choose").addClass("d-flex");

    $(".f-pt-4-choose-lg-none").removeClass("d-none");
    $(".f-pt-4-choose-lg-none").addClass("d-flex");
    $(".f-pt-4-choose-lg-none").addClass("d-lg-none");

    $(".f-pt-4-choose-none-lg-flex").addClass("d-none");
    $(".f-pt-4-choose-none-lg-flex").addClass("d-lg-flex");

    $(".f-settings-btn-choose").addClass("d-lg-flex");

    $(".f-pt-main-btn").removeClass("btn-unavalble");
    $(".f-pt-main-btn").addClass("btn-avalble");
    $(".f-pt-main-btn").removeClass("d-flex");
    $(".f-pt-main-btn").addClass("d-none");
    $(".f-pt-main-btn").addClass("d-lg-flex");
    $(".f-pt-main-btn").html("שלח הזמנה להדפסה");
    $(".f-pt-main-btn").attr("data-bs-original-title", "בכדי להדפיס יש להגדיר סוג נייר לכלל הקבצים שלך. לחץ כאן למעבר לקובץ הבא שטרם הגדרת לו סוג נייר");
    $(".f-pt-main-btn-mobile").removeClass("d-none");
    $(".f-pt-main-btn-mobile").addClass("d-flex");
    $(".f-pt-main-btn-mobile").addClass("d-lg-none");

    fPtCurrentValue = "choose";
}

// 5-print
function fPt5Print() {
    hideAllfPtb();

    $(".f-pt-5-print").removeClass("d-none");
    $(".f-pt-5-print").addClass("d-flex");

    $(".f-pt-5-print-lg-none").removeClass("d-none");
    $(".f-pt-5-print-lg-none").addClass("d-flex");
    $(".f-pt-5-print-lg-none").addClass("d-lg-none");

    $(".f-pt-5-print-none-lg-flex").addClass("d-none");
    $(".f-pt-5-print-none-lg-flex").addClass("d-lg-flex");

    $(".f-pt-main-btn").removeClass("btn-unavalble");
    $(".f-pt-main-btn").addClass("btn-avalble");
    $(".f-pt-main-btn").removeClass("d-flex");
    $(".f-pt-main-btn").addClass("d-none");
    $(".f-pt-main-btn").addClass("d-lg-flex");
    $(".f-pt-main-btn").html("שלח הזמנה להדפסה");
    $(".f-pt-main-btn").attr("data-bs-original-title", "ניתן להדפיס מיידית או לשמור את ההזמנה למועד מאוחר יותר ללא חיוב מיידי.");
    $(".f-pt-main-btn-mobile").removeClass("d-none");
    $(".f-pt-main-btn-mobile").addClass("d-flex");
    $(".f-pt-main-btn-mobile").addClass("d-lg-none");

    $(".f-settings-btn-container").removeClass("opacity-50");
    $(".f-settings-btn-on").addClass("text-green");
    $(".f-settings-btn-on").addClass("fw-bold");
    $(".f-settings-btn-on").addClass("bg-green-vivid-v-v-light");
    $(".f-settings-btn-off").addClass("c-pointer");
    $(".f-settings-btn-off").addClass("bg-hover-green-shadow");
    $(".f-settings-btn-opp-25").addClass("opacity-25");
    $(".f-settings-btn-c-pointer").addClass("c-pointer");
    $(".f-settings-btn-c-text").addClass("c-text");

    $(".f-main-price-container").removeClass("opacity-50");
    $(".f-main-price-num").html("122.7 ₪");
    $(".f-file-price-num").html("15.4 ₪");
    $(".f-num-documents-title").html("15 מסמכים להדפסה");

    updatePreviewDesktop();

    fPtCurrentValue = "print";
}

// STARTING STAGE:

fPt1Empty();

// CHAING WITH SCREEN TEXT

function reportWindowSize() {
    if (fPtCurrentValue === "empty") {
        if (window.innerWidth > 992) {
            $(".f-pt-main-btn").addClass("btn-unavalble");
            $(".f-pt-main-btn").removeClass("btn-avalble");
            $(".f-pt-main-btn").html("שלח הזמנה להדפסה")
        } else {
            $(".f-pt-main-btn").removeClass("btn-unavalble");
            $(".f-pt-main-btn").addClass("btn-avalble");
            $(".f-pt-main-btn").html("העלה קובץ להדפסה")
        }
    }
}
reportWindowSize();

window.onresize = reportWindowSize;

// IMAGE PREVIEW --------------------------------------------------------------------------------------

// file real dimmantion:

// round function:
function roundDimm(numInMm) {
    return ((Math.ceil(numInMm)) / 10);
}

// params

// FILE 1:
// let paperWidth = 914.4;
// let paperHeight = 655.5;
// let imgWidth = 655.5;
// let imgHeight = 655.5;
// let isCenter = false;

// FILE 2:
let paperWidth = 914;
let paperHeight = 2000;
let imgWidth = 700;
let imgHeight = 2000;
let isCenter = true;

// SYSTEM PARAMS:
let paperMargin = 5;
let dimmTolerance = 1.2;
// empty params:
let canvasWidth;
let canvasHeight;
let paperWidthPre;
let paperHeightPre;
let imgWidthPre;
let imgHeightPre;
let paperMarginPre;

// DESKTOP FILE PREVIEW

function updatePreviewDesktop() {

    // clean values:
    document.getElementById("paper-preview").style.width = ("0px");
    document.getElementById("paper-preview").style.height = ("0px");
    document.getElementById("img-preview-container").style.width = ("0px");
    document.getElementById("img-preview-container").style.height = ("0px");
    document.getElementById("paper-margin-container").style.padding = ("0px");
    document.getElementById("paper-margin-border").style.border = ("0px solid #ffffffa5");
    document.getElementById("dimm-top-2").style.width = ("0px");
    document.getElementById("dimm-left-2").style.height = ("0px");

    // get canvas size in px:
    canvasWidth = document.getElementById('preview-canvas').offsetWidth;
    canvasHeight = document.getElementById('preview-canvas').offsetHeight;

    // calculate paper preview size
    if (paperWidth / canvasWidth < paperHeight / canvasHeight) {
        paperHeightPre = canvasHeight;
        paperWidthPre = paperWidth * canvasHeight / paperHeight;
    } else {
        paperWidthPre = canvasWidth;
        paperHeightPre = paperHeight * canvasWidth / paperWidth;
    }

    // create paper:
    document.getElementById("paper-preview").style.width = (paperWidthPre + "px");
    document.getElementById("paper-preview").style.height = (paperHeightPre + "px");

    // center?:
    if (isCenter === false) {
        $("#paper-preview").removeClass("justify-content-center");
        $("#paper-preview").addClass("justify-content-start");
    }

    // calculate image preview size 

    imgWidthPre = imgWidth / paperWidth * paperWidthPre;
    imgHeightPre = imgHeight / paperHeight * paperHeightPre;

    // create img:
    document.getElementById("img-preview-container").style.width = (imgWidthPre + "px");
    document.getElementById("img-preview-container").style.height = (imgHeightPre + "px");
    $("#img-preview-img").removeClass("d-none");

    // calculate image preview margin
    paperMarginPre = paperWidthPre * paperMargin / paperWidth;

    // create margin:
    document.getElementById("paper-margin-container").style.padding = (paperMarginPre + "px");
    document.getElementById("paper-margin-border").style.border = (paperMarginPre + "px solid #ffffffa5");

    // DIMM
    // dimmantions - top
    if (Math.abs(paperWidth - imgWidth) > dimmTolerance) {
        $("#dimm-top-2").removeClass("d-none");
        document.getElementById("dimm-top-2").style.width = (imgWidthPre + "px");
        $("#dimm-top-2-num").html(roundDimm(imgWidth));
        if (isCenter === true) {
            $("#dimm-top-1").removeClass("d-none");
            $("#dimm-top-1-num").html(roundDimm((paperWidth - imgWidth) / 2));
            $("#dimm-top-3-num").html(roundDimm((paperWidth - imgWidth) / 2));
        } else {
            $("#dimm-top-3-num").html(roundDimm(paperWidth - imgWidth));
        }
    } else {
        $("#dimm-top-3-num").html(roundDimm(imgWidth));
    }

    // dimmantions - left
    if (Math.abs(paperHeight - imgHeight) > dimmTolerance) {
        $("#dimm-left-1").removeClass("d-none");
        $("#dimm-left-1").addClass("d-flex");
        $("#dimm-left-3").removeClass("d-none");
        $("#dimm-left-3").addClass("d-flex");
        $("#dimm-left-2").removeClass("flex-grow-1");
        document.getElementById("dimm-left-2").style.height = (imgHeightPre + "px");
        $("#dimm-left-1-num").html(roundDimm((paperHeight - imgHeight) / 2));
        $("#dimm-left-3-num").html(roundDimm((paperHeight - imgHeight) / 2));
    }
    $("#dimm-left-2-num").html(roundDimm(paperHeight));
}

addEventListener("resize", (event) => { updatePreviewDesktop() });

// MOBILE + FULLSCREEN FILE PREVIEW

function updatePreviewMobile() {
    // clean values:
    document.getElementById("paper-preview-m").style.width = ("0px");
    document.getElementById("paper-preview-m").style.height = ("0px");
    document.getElementById("img-preview-container-m").style.width = ("0px");
    document.getElementById("img-preview-container-m").style.height = ("0px");
    document.getElementById("paper-margin-container-m").style.padding = ("0px");
    document.getElementById("paper-margin-border-m").style.border = ("0px solid #ffffffa5");
    document.getElementById("dimm-top-2-m").style.width = ("0px");
    document.getElementById("dimm-left-2-m").style.height = ("0px");

    // get canvas size in px:
    canvasWidth = document.getElementById('preview-canvas-m').offsetWidth;
    canvasHeight = document.getElementById('preview-canvas-m').offsetHeight;

    // calculate paper preview size
    if (paperWidth / canvasWidth < paperHeight / canvasHeight) {
        paperHeightPre = canvasHeight;
        paperWidthPre = paperWidth * canvasHeight / paperHeight;
    } else {
        paperWidthPre = canvasWidth;
        paperHeightPre = paperHeight * canvasWidth / paperWidth;
    }

    // create paper:
    document.getElementById("paper-preview-m").style.width = (paperWidthPre + "px");
    document.getElementById("paper-preview-m").style.height = (paperHeightPre + "px");

    // center?:
    if (isCenter === false) {
        $("#paper-preview-m").removeClass("justify-content-center");
        $("#paper-preview-m").addClass("justify-content-start");
    }

    // calculate image preview size 

    imgWidthPre = imgWidth / paperWidth * paperWidthPre;
    imgHeightPre = imgHeight / paperHeight * paperHeightPre;

    // create img:
    document.getElementById("img-preview-container-m").style.width = (imgWidthPre + "px");
    document.getElementById("img-preview-container-m").style.height = (imgHeightPre + "px");
    $("#img-preview-img-m").removeClass("d-none");

    // calculate image preview margin
    paperMarginPre = paperWidthPre * paperMargin / paperWidth;

    // create margin:
    document.getElementById("paper-margin-container-m").style.padding = (paperMarginPre + "px");
    document.getElementById("paper-margin-border-m").style.border = (paperMarginPre + "px solid #ffffffa5");

    // DIMM
    // dimmantions - top
    if (Math.abs(paperWidth - imgWidth) > dimmTolerance) {
        $("#dimm-top-2-m").removeClass("d-none");
        document.getElementById("dimm-top-2-m").style.width = (imgWidthPre + "px");
        $("#dimm-top-2-num-m").html(roundDimm(imgWidth));
        if (isCenter === true) {
            $("#dimm-top-1-m").removeClass("d-none");
            $("#dimm-top-1-num-m").html(roundDimm((paperWidth - imgWidth) / 2));
            $("#dimm-top-3-num-m").html(roundDimm((paperWidth - imgWidth) / 2));
        } else {
            $("#dimm-top-3-num-m").html(roundDimm(paperWidth - imgWidth));
        }
    } else {
        $("#dimm-top-3-num-m").html(roundDimm(imgWidth));
    }

    // dimmantions - left
    if (Math.abs(paperHeight - imgHeight) > dimmTolerance) {
        $("#dimm-left-1-m").removeClass("d-none");
        $("#dimm-left-1-m").addClass("d-flex");
        $("#dimm-left-3-m").removeClass("d-none");
        $("#dimm-left-3-m").addClass("d-flex");
        $("#dimm-left-2-m").removeClass("flex-grow-1");
        document.getElementById("dimm-left-2-m").style.height = (imgHeightPre + "px");
        $("#dimm-left-1-num-m").html(roundDimm((paperHeight - imgHeight) / 2));
        $("#dimm-left-3-num-m").html(roundDimm((paperHeight - imgHeight) / 2));
    }
    $("#dimm-left-2-num-m").html(roundDimm(paperHeight));
}

addEventListener("resize", (event) => { updatePreviewMobile() });

function updatePreviewMobileTimeOut() {
    setTimeout(updatePreviewMobile, 300)
}


