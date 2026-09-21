
// ================================================================================================================
// Variáveis
// ================================================================================================================

const mainImage = document.getElementById("main-img");
const canvas = document.getElementById("canvas");
const emptyCanvas = document.getElementById("empty-canvas");
const imgInput = document.getElementById("img-input");
const saveBtn = document.getElementById("save-btn");
const negativeBtn = document.getElementById("negative");
const thresholdBtn = document.getElementById("threshold");
const brightnessBtn = document.getElementById("brightness");

const layersList = document.getElementById("layers-list");
const layersEmpty = document.querySelector(".layers-empty");


let originalImg = null;
let imgName = "";
let layers = [];


// ================================================================================================================
// Funções auxiliares de interface
// ================================================================================================================


// Ativa ou desativa botões que precisam de uma imagem caregada
function setControlEnable(enabled) {
    saveBtn.disabled = !enabled;
    negativeBtn.disabled = !enabled;
    thresholdBtn.disabled = !enabled;
    brightnessBtn.disabled = !enabled;
}




// Reordena a seção de camadas de acordo com o array layers
// É chamada sempre que uma camada é adicionada, removida ou deslocada

function updateLayersPanel() {
    layersList.innerHTML = "";

    if (layers.length == 0) {
        layersEmpty.style.display = "block"
        return;
    }

    layersEmpty.style.display = "none";

    layers.forEach((layer, index) => {
        const row = createLayerRow(layer, index);
        layersList.appendChild(row);
    });
}




// Cria o element HTMl de uma linha da lista de camadas

function createLayerRow(layer, index) {
    const row = document.createElement("div");
    row.className = "layer-row";
    row.draggable = true;

    const num = document.createElement("span");
    num.className = "num";
    num.textContent = `${index + 1}`;

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = layer.label;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "x";
    removeBtn.title = "Remover camada";
    removeBtn.addEventListener("click", () => {
        layers.splice(index, 1);
        updateLayersPanel();
        rebuildImageFromLayers();
    });

    enableDragEvent(row, index);

    row.appendChild(num);
    row.appendChild(name);
    row.appendChild(removeBtn);
    return row;
}




// Habilita o evento de arrasto para as camadas

function enableDragEvent(row, index) {
    row.addEventListener("dragstart", () => {
        row.classList.add("dragging");
        row.dataset.fromIndex = index;
    });


    row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
    });

    
    row.addEventListener("dragover", (event) => {
        event.preventDefault();
        row.classList.add("drag-over");
    });

    
    row.addEventListener("dragleave", () => {
        row.classList.remove("drag-over");
    });


    row.addEventListener("drop", (event) => {
        event.preventDefault();
        row.classList.remove("drag-over");

        const movedRow = document.querySelector(".dragging");
        const fromIndex = Number(movedRow.dataset.fromIndex);

        const [movedLayer] = layers.splice(fromIndex, 1);
        layers.splice(index, 0, movedLayer);

        updateLayersPanel();
        rebuildImageFromLayers();
    });
}




// ================================================================================================================
// Efeitos
// ================================================================================================================


// aplica um filtro por vez na imagem de acordo com a ordem das camadas

function applyFilter(jimpImg, layer) {

    if (layer.type === "negative") {
        applyInversion(jimpImg);
    }

    else if (layer.type === "threshold") {
        applyThreshold(jimpImg, layer);
    }

    else if (layer.type === "brightness") {
        changeBrightness(jimpImg, layer);
    }

    else if (layer.type === "gamma") {
        gamaCorrection(jimpImg);
    }


    return jimpImg;
}


// refaz a imagem do zer0, aplicando os efeitos na ordem que
// estão no array layers

async function rebuildImageFromLayers() {
    const working = originalImg.clone();
    layers.forEach((layer) => applyFilter(working, layer));

    const base64 = await working.getBase64Async(Jimp.MIME_PNG);
    mainImage.src = base64;
}


// ------------------------------
// Função de inversão (Negativo)

async function applyInversion(jimpImg) {
    jimpImg.scan(0, 0, jimpImg.bitmap.width, jimpImg.bitmap.height, function(x, y, idx) {
        this.bitmap.data[idx + 0] = 255 - this.bitmap.data[idx + 0]; // o zero é so pra deixar bonito
        this.bitmap.data[idx + 1] = 255 - this.bitmap.data[idx + 1];
        this.bitmap.data[idx + 2] = 255 - this.bitmap.data[idx + 2];
    });
    return jimpImg;
}


// ------------------------------
// Função de limiarização

async function applyThreshold(jimpImg, layer) {
    const limit = layer.value;

    jimpImg.scan(0, 0, jimpImg.bitmap.width, jimpImg.bitmap.height, function(x, y, idx) {
        const R = this.bitmap.data[idx + 0];
        const G = this.bitmap.data[idx + 1];
        const B = this.bitmap.data[idx + 2];
        const mean = (R + G + B) / 3;

        const output = mean >= limit ? 255 : 0;

        this.bitmap.data[idx + 0] = output;
        this.bitmap.data[idx + 1] = output;
        this.bitmap.data[idx + 2] = output;
    });
    return jimpImg;
}


// ------------------------------
// Função de brilho

async function changeBrightness(jimpImg, layer) {
    const toAdd = layer.value;

    jimpImg.scan(0, 0, jimpImg.bitmap.width, jimpImg.bitmap.height, function(x, y, idx) {
        const R = this.bitmap.data[idx + 0] + toAdd;
        const G = this.bitmap.data[idx + 1] + toAdd;
        const B = this.bitmap.data[idx + 2] + toAdd;

        this.bitmap.data[idx + 0] = Math.min(255, Math.max(0, R));
        this.bitmap.data[idx + 1] = Math.min(255, Math.max(0, G));
        this.bitmap.data[idx + 2] = Math.min(255, Math.max(0, B));
    });
    return jimpImg;
}


// ------------------------------
// Função de correção de gama

async function gamaCorrection(jimpImg, layer) {
    const invGamma = 1 / gamma;

    // lookup table para facilitar o cálculo
    const lut = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
        const normalized = i / 255;
        const corrected = Math.pow(normalized, invGamma);
        lut[i] = Math.round(corrected * 255);
    }

    jimpImg.scan(0, 0, jimpImg.bitmap.width, jimpImg.bitmap.height, function(x, y, idx) {
        this.bitmap.data[idx + 0] = 255 - lut[bitmap.data[idx + 0]]; 
        this.bitmap.data[idx + 1] = 255 - lut[bitmap.data[idx + 1]];
        this.bitmap.data[idx + 2] = 255 - lut[bitmap.data[idx + 2]];
    });
    return jimpImg; 
}

// ================================================================================================================
// Abrir e salvar imagens
// ================================================================================================================


// abrir

imgInput.addEventListener("change", async (event) => {
    const [img] = event.target.files;
    if (!img) return;

    if (!img.type.startsWith("image/")) {
        alert("Selecione uma imagem.");
        return;
    }

    const fileName = img.name;
    imgName = fileName;

    try {
        const content = await img.arrayBuffer();
        originalImg = await Jimp.read(content);
        layers = [];

        updateLayersPanel();
        setControlEnable(true);

        emptyCanvas.style.display = "none";
        canvas.style.display = "block";

        await rebuildImageFromLayers();
    } catch (err) {
        console.error(err);
        alert("Não foi possível abrir a imagem.")
    }
});



// salvar

saveBtn.addEventListener("click", async () => {
    const working = originalImg.clone();
    layers.forEach((layer) => applyFilter(working, layer));

    const base64 = await working.getBase64Async(Jimp.MIME_PNG);

    const link = document.createElement("a");
    link.href = base64;
    link.download = `${imgName}-editada.png`;
    link.click();
});




// ================================================================================================================
// Janela flutuante de preview
// ================================================================================================================

// centraliza a janela na posição (x, y) do mouse
function placeAtCursor(win, x, y) {
    const width = win.offsetWidth;
    win.style.left = `${x - width/2}px`;
    win.style.top = `${y}px`;
}



// ativa a funcionalidade de arrasto da janela

function enableDragging(win, head) {
    head.addEventListener("mousedown", (event) => {


        // fw-close representa o botão fechar da janela
        // de preview que será criada depois

        if (event.target.closest(".fw-close")) return;

        event.preventDefault();
        placeAtCursor(win, event.clientX, event.clientY);

        const onMove = (moveEvent) => {
            placeAtCursor(win, moveEvent.clientX, moveEvent.clientY);
        };

        const onUp = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        }

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    });
}


// criação da estrutura HTML da janela de preview de filtros
// note que fw = filter window

function createFilterWindow(title) {
    const win = document.createElement("div");
    win.className = "filter-window";
    win.style.left = "50%";
    win.style.top = "120px";

    win.innerHTML = `
        <div class="fw-head">
            <span>${title}</span>
            <button class="fw-close">x</button>
        </div>
        <div class="fw-body">
            <div class="fw-preview"><span class="loading">Gerando pré-visualização..</span></div>
            <div class="fw-controls"></div>
            <button class="fw-apply">Aplicar</button>
        </div>
    `;

    document.body.appendChild(win);

    const head = win.querySelector(".fw-head");
    enableDragging(win, head);

    win.querySelector(".fw-close").addEventListener("click", () => {
        win.remove();
    });

    return win;
}


// gera a imagem adaptada para preview

async function showPreview(win, jimpImg) {
    const base64 = await jimpImg.getBase64Async(Jimp.MIME_PNG);

    const preview = win.querySelector(".fw-preview");
    preview.innerHTML = "";

    const img = document.createElement("img");
    img.src = base64;
    preview.appendChild(img);
}


// ================================================================================================================
// Botões de filtro
// ================================================================================================================

negativeBtn.addEventListener("click", () => {
    const win = createFilterWindow("Negativo");


    // aplica todos os filtros já aplicados
    // e depois aplica o efeito para visualização
    const preview = originalImg.clone();
    layers.forEach((layer) => applyFilter(preview, layer));
    applyFilter(preview, { type: "negative"});
    showPreview(win, preview);

    win.querySelector(".fw-apply").addEventListener("click", () => {
        layers.push({ label: "Negativo", type: "negative"});
        updateLayersPanel();
        rebuildImageFromLayers();
        win.remove();
    });
});

// ================================================================================

thresholdBtn.addEventListener("click", () => {
    const win = createFilterWindow("Limiarização");
    const controls = win.querySelector(".fw-controls");

    controls.innerHTML = `
    <div class="fw-control">
        <div class="fw-control-header">
            <label> Limiarização </label>
            <input class="fw-value" type="number" min="0" max="255" value="128">
        </div>
        <input type="range" min="0" max="255" value="128">
    </div>
    `;

    const range = controls.querySelector('input[type="range"]');
    const valueInput = controls.querySelector('input[type="number"]');

    function updateThresholdPreview() {
        const thresholdValue = Number(range.value);
        valueInput.value = thresholdValue;

        const preview = originalImg.clone();
        layers.forEach((layer) => applyFilter(preview, layer));
        applyFilter(preview, { type: "threshold", value: thresholdValue});
        showPreview(win, preview);
    }

    range.addEventListener("input", updateThresholdPreview);

    valueInput.addEventListener("input", () => {
        let typed = Number(valueInput.value);

        typed = Math.min(255, Math.max(0, typed));
        range.value = typed;
        updateThresholdPreview();
    });

    updateThresholdPreview();

    win.querySelector(".fw-apply").addEventListener("click", () => {
        const thresholdValue = Number(range.value);
        layers.push({ label: `Limiarização (${thresholdValue})`, type: "threshold", value: thresholdValue });
        updateLayersPanel();
        rebuildImageFromLayers();
        win.remove();
    });
});

// ================================================================================

brightnessBtn.addEventListener("click", () => {
    const win = createFilterWindow("Brilho");
    const controls = win.querySelector(".fw-controls");

    controls.innerHTML = `
    <div class="fw-control">
        <div class="fw-control-header">
            <label> Brilho </label>
            <input class="fw-value" type="number" min="-255" max="255" value="0">
        </div>
        <input type="range" min="-255" max="255" value="0">
    </div>
    `;

    const range = controls.querySelector('input[type="range"]');
    const valueInput = controls.querySelector('input[type="number"]');

    function updateBrightnessPreview() {
        const brightnessValue = Number(range.value);
        valueInput.value = brightnessValue;

        const preview = originalImg.clone();
        layers.forEach((layer) => applyFilter(preview, layer));
        applyFilter(preview, { type: "brightness", value: brightnessValue});
        showPreview(win, preview);
    }

    range.addEventListener("input", updateBrightnessPreview);

    valueInput.addEventListener("input", () => {
        let typed = Number(valueInput.value);

        typed = Math.min(255, Math.max(-255, typed));
        range.value = typed;
        updateBrightnessPreview();
    });

    updateBrightnessPreview();

    win.querySelector(".fw-apply").addEventListener("click", () => {
        const brightnessValue = Number(range.value);
        layers.push({ label: "Brilho", type: "brightness", value: brightnessValue });
        updateLayersPanel();
        rebuildImageFromLayers();
        win.remove();
    });
});
