let imgElement1 = document.createElement('img');
let imgElement2 = document.createElement('img');

let canvasInput1 = document.getElementById('canvasInput1');
let canvasInput2 = document.getElementById('canvasInput2');

let trackbar = document.getElementById('trackbar');
let weightValue = document.getElementById('weightValue');

let src1Loaded = false;
let src2Loaded = false;

document.getElementById('fileInput1').addEventListener('change', (e) => {
    imgElement1.src = URL.createObjectURL(e.target.files[0]);
});

imgElement1.onload = function() {
    canvasInput1.width = imgElement1.width;
    canvasInput1.height = imgElement1.height;
    let ctx = canvasInput1.getContext('2d');
    ctx.drawImage(imgElement1, 0, 0);
    src1Loaded = true;
    if (src2Loaded) updateBlend();
};


document.getElementById('fileInput2').addEventListener('change', (e) => {
    imgElement2.src = URL.createObjectURL(e.target.files[0]);
});

imgElement2.onload = function() {
    canvasInput2.width = imgElement2.width;
    canvasInput2.height = imgElement2.height;
    let ctx = canvasInput2.getContext('2d');
    ctx.drawImage(imgElement2, 0, 0);
    src2Loaded = true;
    if (src1Loaded) updateBlend();
};


function updateBlend() {
    if (!src1Loaded || !src2Loaded) return;

    
    weightValue.value = trackbar.value;

    let alpha = trackbar.value / trackbar.max;
    let beta = 1.0 - alpha;

   
    let src1 = cv.imread('canvasInput1');
    let src2 = cv.imread('canvasInput2');

    if (src1.rows !== src2.rows || src1.cols !== src2.cols) {
        let dsize = new cv.Size(src1.cols, src1.rows);
        cv.resize(src2, src2, dsize, 0, 0, cv.INTER_LINEAR);
    }

  
    let dst = new cv.Mat();
    cv.addWeighted(src1, alpha, src2, beta, 0.0, dst);

    cv.imshow('canvasOutput', dst);

   
    src1.delete();
    src2.delete();
    dst.delete();
}
