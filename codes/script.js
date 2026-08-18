// --------------------------------------------------------------- #
// Global scope variables

const file = document.getElementById("input");
const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");
const saveBtn = document.getElementById("save");
const preview = document.getElementById("output"); 
const optionsDiv = document.getElementById("options");
const inverseBtn = document.getElementById("inverse");
const rangeThreshold = document.getElementById("threshold");
const thresholdToggle = document.getElementById("thresholdToggle");
const maxHistory = 5;

let valueThreshold = null;
let originalImg = null;
let currentImg = null;
let previewImg = null;
let inverted = false;
let historyIdx = null;
let undoTimes = 1;
let history = [];




// --------------------------------------------------------------- #
// History array that stores the last 5 editions made

function push_toHistory(imgInstance) {
    const _cloned = imgInstance.clone();
    history.push(_cloned);

    if (history.length > maxHistory) {
        history.shift();
    }
}

saveBtn.addEventListener("click", function() {
    push_toHistory(previewImg);
});

// --------------------------------------------------------------- #
// Undo edits

function undo() {
    historyIdx = history.length - 1 - undoTimes;
    if (historyIdx >= 0) {
        displayImg(history[history.Idx]);
        ++undoTimes;
    } else {
        historyIdx = 0;
        displayImg(history[historyIdx]);
    }
}

undoBtn.addEventListener("click", function() {
    undo();
});



// --------------------------------------------------------------- #
// Redo edits

function redo() {
    displayImg(history[historyIdx+1]);
}

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
    push_toHistory(currentImg);

    await displayImg(currentImg);
    optionsDiv.style.display = "flex";
    document.getElementsByTagName("hr").style.display = "block";

} catch (err) {
    console.error("Error during image loading:", err);
}
});


// --------------------------------------------------------------- #
// Displays the image at the <img id="output" ...>

async function displayImg(jimpImage) {
    try {
        const base64 = await jimpImage.getBase64Async(Jimp.MIME_PNG);
        preview.src = base64;
        preview.style.display = "block";
        console.log("Image displayed succesfully");

    } catch (err) {
        console.log("Error during image display:\n<<<  ", err, "  >>");
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
        applyNegative(currentImg);
        push_toHistory(currentImg);
        inverseBtn.innerHTML = "Restaurar";
        inverted = true;

    } else {
        push_toHistory(currentImg);
        inverseBtn.innerHTML = "Negativo";
        applyNegative(currentImg);
        push_toHistory(currentImg);
        inverted = false;
    }
    await displayImg(currentImg);
    console.log("Image negated succesfully");
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


{
    let thresImg = currentImg.clone();
    valueThreshold = (rangeThreshold.value / 100) * 255;

    // --------------------------------------------------------------- #
    // Threshold range input toggle

    thresholdToggle.addEventListener("click", async function() {
        if (rangeThreshold.style.display == "none") {
            rangeThreshold.style.display = "block";

            await applyThreshold(thresImg, valueThreshold);
            push_toHistory(thresImg);
            await displayImg(thresImg);

        } else {
            rangeThreshold.style.display = "none";
        }
    });

    // --------------------------------------------------------------- #
    // Threshold input range

    rangeThreshold.addEventListener("change", async function() {
        if (!originalImg) return;

        let valueThreshold = (rangeThreshold.value / 100) * 255;
        await applyThreshold(thresImg, valueThreshold);

        await displayImg(thresImg);
        console.log("Image thresholded succesfully to", valueThreshold);

    });
}
