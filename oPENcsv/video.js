let video = document.getElementById('videoInput');
let canvas = document.getElementById('canvasOutput');
let ctx = canvas.getContext('2d');

let cap;
let roiHist;
let trackWindow;
let termCrit;

// Variables para selección de ROI con mouse
let isSelecting = false;
let roiStart = {x:0, y:0};
let roiRect = {x:0, y:0, w:0, h:0};
let trackingInitialized = false;

// Inicializamos webcam
navigator.mediaDevices.getUserMedia({ video: true, audio: false })
.then(function(stream) {
    video.srcObject = stream;
    video.play();
})
.catch(function(err) {
    console.error("Error accessing webcam: " + err);
});

// Esperamos a que OpenCV.js esté listo
var Module = {
    onRuntimeInitialized() {
        document.getElementById('status').innerHTML = 'OpenCV.js is ready.';
        cap = new cv.VideoCapture(video);
        requestAnimationFrame(processVideo);
    }
};

// Eventos del mouse para seleccionar ROI
canvas.addEventListener('mousedown', (e) => {
    isSelecting = true;
    roiStart.x = e.offsetX;
    roiStart.y = e.offsetY;
});

canvas.addEventListener('mousemove', (e) => {
    if (isSelecting) {
        roiRect.x = Math.min(roiStart.x, e.offsetX);
        roiRect.y = Math.min(roiStart.y, e.offsetY);
        roiRect.w = Math.abs(e.offsetX - roiStart.x);
        roiRect.h = Math.abs(e.offsetY - roiStart.y);
        drawSelection();
    }
});

canvas.addEventListener('mouseup', (e) => {
    isSelecting = false;
    trackWindow = new cv.Rect(roiRect.x, roiRect.y, roiRect.w, roiRect.h);
    initTracking();
});

// Dibujar rectángulo mientras se selecciona
function drawSelection() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.strokeRect(roiRect.x, roiRect.y, roiRect.w, roiRect.h);
}

// Inicializar tracking con histograma del ROI
function initTracking() {
    let frame = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    cap.read(frame);

    let roi = frame.roi(trackWindow);
    let hsvRoi = new cv.Mat();
    cv.cvtColor(roi, hsvRoi, cv.COLOR_RGBA2RGB);
    cv.cvtColor(hsvRoi, hsvRoi, cv.COLOR_RGB2HSV);

    let mask = new cv.Mat();
    let lowScalar = new cv.Scalar(0, 60, 32);
    let highScalar = new cv.Scalar(180, 255, 255);
    cv.inRange(hsvRoi, lowScalar, highScalar, mask);

    let hsvPlanes = new cv.MatVector();
    cv.split(hsvRoi, hsvPlanes);

    roiHist = new cv.Mat();
    let channels = [0]; // Hue channel
    let histSize = [180];
    let ranges = [0, 180];
    cv.calcHist(hsvPlanes, channels, mask, roiHist, histSize, ranges);
    cv.normalize(roiHist, roiHist, 0, 255, cv.NORM_MINMAX);

    roi.delete(); hsvRoi.delete(); mask.delete(); hsvPlanes.delete();
    termCrit = new cv.TermCriteria(cv.TermCriteria_EPS | cv.TermCriteria_COUNT, 10, 1);

    trackingInitialized = true;
    frame.delete();
}

// Procesamiento de video frame a frame
function processVideo() {
    let frame = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    cap.read(frame);

    if (trackingInitialized) {
        // Convertir a HSV
        let hsv = new cv.Mat();
        cv.cvtColor(frame, hsv, cv.COLOR_RGBA2RGB);
        cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);

        // Backprojection
        let dst = new cv.Mat();
        let channels = [0];
        let ranges = [0, 180];
        cv.calcBackProject([hsv], channels, roiHist, dst, ranges, 1);

        // CamShift
        let rotatedRect = cv.CamShift(dst, trackWindow, termCrit);
        trackWindow = rotatedRect[1];

        // Dibujar rectángulo rotado
        let points = cv.RotatedRect.points(rotatedRect[0]);
        for (let i = 0; i < 4; i++) {
            cv.line(frame, points[i], points[(i+1)%4], [255,0,0,255], 2);
        }

        hsv.delete(); dst.delete();
    }

    cv.imshow('canvasOutput', frame);
    frame.delete();

    requestAnimationFrame(processVideo);
}
