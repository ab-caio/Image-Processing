// --------------------------------------------------------------- #
// Global scope variables

const file = document.getElementById("input");
const preview = document.getElementById("output");
const saveBtn = document.getElementById("save");
const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");
const showOgBtn = document.getElementById("showOg");
const optionsDiv = document.querySelector("#options");
const inverseBtn = document.getElementById("inverse");
const rangeThreshold = document.getElementById("threshold");
const thresholdToggle = document.getElementById("thresholdToggle");
const maxHistory = 5;

let originalImg = null;
let currentImg = null;
let previewImg = null;
let inverted = false;
let valueThreshold = null;
let history = [];
let undoTimes = 0;
let currentIdx = 0;




// --------------------------------------------------------------- #
// History array that stores the last 5 editions made

function push_toHistory(imgInstance) {
    _clone = imgInstance.clone();
    history.push(_clone);

    if (history.lenght > maxHistory) {
        history.shift();
    }
}


// -------------------------------------------------------------- #
// Shows the original image temporarily


showOgBtn.addEventListener("mousedown", async function() {
    await displayImg(originalImg);
});

showOgBtn.addEventListener("mouseup", async function() {
    await displayImg(previewImg);
});


// -------------------------------------------------------------- #
// Undo image edits function.


function undo() {

    if (undoTicks < 5) {
    currentIdx = history.length - 1 - undoTimes;
    previewImg = history[currentIdx];
    undoTicks++
    } else if (false) {
        previewImg = history[0];
    }
}

undoBtn.addEventListener("click", async function() {
    await displayImg(previewImg);
    undoTimes++;
    if (undoTimes > 5) {
        undoTimes = 5;
    }
});


// -------------------------------------------------------------- #
// Redo image edits function.


function redo() {
    if (undoTimes <= 0) {
        undoTimes = 0;
        redoBtn.style.opacity = "50%";
    } else if (undoTimes < history.length - 1) {
       previewImg = history[currentIdx + 1];
        undoTimes -= 1;
    }
}


// -------------------------------------------------------------- #
// Save image function. Enables filter stacking

async function save(Image) {
    if (!Image) return;

    push_toHistory(Image);
    await displayImg(Image);
    currentImg = previewImg;
}

saveBtn.addEventListener("click", function() {
    try {
        save(previewImg);
        console.log("Image saved succesfully");
    } catch (err) {
        console.error("Error during image saving: ", err);
    }
});

// --------------------------------------------------------------- #
// Picks image from the <input id="input" type="file" ...> in the document

file.addEventListener("change", async (event) => {
const img = event.target.files[0];
if (!img) return;

try {
    const array = await img.arrayBuffer();
    originalImg = await Jimp.read(array);
    currentImg = originalImg.clone();
    console.log("Image loaded succesfully");

    await displayImg(currentImg);
    optionsDiv.style.display = "flex";

} catch (err) {
    console.error("Error during iamge loading:", err);
}
});


// --------------------------------------------------------------- #
// Displays the image at the <img id="output" ...>

async function displayImg(jimpImage) {
    try {
        const base64 = await jimpImage.getBase64Async(Jimp.MIME_PNG);
        preview.src = base64;
        preview.style.display = "block";
        console.log("Image displayed succesfully: ", currentImg);

    } catch (err) {
        console.error("Error during image display:\n<<<  ", err, "  >>");
    }
}


// --------------------------------------------------------------- #
// Implement the negative effect to an image

async function applyNegative(jimpImage) {
    jimpImage.scan(0, 0, jimpImage.bitmap.width, jimpImage.bitmap.height, function(x, y, idx) {

        this.bitmap.data[idx]     = 255 - this.bitmap.data[idx];     // R
        this.bitmap.data[idx + 1] = 255 - this.bitmap.data[idx + 1]; // G
        this.bitmap.data[idx + 2] = 255 - this.bitmap.data[idx + 2]; // B
    });
    return jimpImage;
}


inverseBtn.addEventListener("click", async () => {
    if (!originalImg) return;

    if (!inverted) {
        previewImg = currentImg.clone();
        applyNegative(previewImg);
        inverseBtn.innerHTML = "Go back";
        inverted = true;

    } else {
        previewImg = currentImg.clone();
        inverseBtn.innerHTML = "Negative";
        inverted = false;
    }
    await displayImg(previewImg);
    console.log("Image negated succesfully")
});




// --------------------------------------------------------------- #
// Apply the threshold (limiarização) effect

async function applyThreshold(jimpImage, thresholdRange) {
    // We should calculate the luminance of every pixel first. The simple
    // would be a simple average between the R, G annd B values. But human
    // eyes do not perceive colors the same way. So, we'll be using a weighted
    // mean used by industries instead.

    // luminance = (0.299 * R) + (0.587 * G) + (0.114 * B)

    // Curiosity: human eyes perceive more green than blue
    // - Caio

    jimpImage.scan(0, 0, jimpImage.bitmap.width, jimpImage.bitmap.height, function(x, y, idx) {
        let r = this.bitmap.data[idx];
        let g = this.bitmap.data[idx + 1];
        let b = this.bitmap.data[idx + 2];

        const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);
        const value = luminance >= thresholdRange ? 255 : 0;

        this.bitmap.data[idx]     = value;
        this.bitmap.data[idx + 1] = value;
        this.bitmap.data[idx + 2] = value;
    });
    return jimpImage
}


// --------------------------------------------------------------- #
// Threshold range input toggle

thresholdToggle.addEventListener("click", function() {
    previewImg = currentImg.clone()

    if (rangeThreshold.style.display == "none") {
        rangeThreshold.style.display = "block";
        applyThreshold(previewImg, rangeThreshold.value);
        displayImg(previewImg);
    } else {
        rangeThreshold.style.display = "none";
        previewImg = currentImg;
        displayImg(previewImg);
    }
});


// --------------------------------------------------------------- #
// Threshold range input

rangeThreshold.addEventListener("change", async function() {
    if (!currentImg) return;

    previewImgThre = currentImg.clone();
    let valueThreshold = (rangeThreshold.value / 100) * 255;
    await applyThreshold(previewImgThre, valueThreshold);

    await displayImg(previewImgThre);
    console.log("Image thresholded succesfully to", valueThreshold);

});
