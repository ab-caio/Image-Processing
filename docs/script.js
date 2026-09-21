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
const gammaBtn = document.getElementById("gama");
const linearBtn = document.getElementById("linear-func");
const steganographyBtn = document.getElementById("esteganography");

const layersList = document.getElementById("layers-list");
const layersEmpty = document.querySelector(".layers-empty");


let originalImg = null;
let imgName = "";
let layers = [];




// ================================================================================================================
// Funções utilitárias genéricas
// ================================================================================================================


// restringe value ao intervalo [min, max]

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}




// ================================================================================================================
// Funções auxiliares de interface
// ================================================================================================================




// ativa ou desativa os botões que exigem uma imagem carregada

function setControlEnable(enabled) {
    saveBtn.disabled = !enabled;
    negativeBtn.disabled = !enabled;
    thresholdBtn.disabled = !enabled;
    brightnessBtn.disabled = !enabled;
    gammaBtn.disabled = !enabled;
    linearBtn.disabled = !enabled;
    steganographyBtn.disabled = !enabled;
}




// reordena a seção de camadas de acordo com o array layers;
// é chamada sempre que uma camada é adicionada, removida ou deslocada

function updateLayersPanel() {
    layersList.innerHTML = "";

    if (layers.length === 0) {
        layersEmpty.style.display = "block";
        return;
    }

    layersEmpty.style.display = "none";

    layers.forEach((layer, index) => {
        const row = createLayerRow(layer, index);
        layersList.appendChild(row);
    });
}




// cria o elemento HTML de uma linha da lista de camadas

function createLayerRow(layer, index) {
    const row = document.createElement("div");
    row.className = "layer-row";
    row.draggable = true;

    const number = document.createElement("span");
    number.className = "num";
    number.textContent = `${index + 1}`;

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

    enableLayerDragAndDrop(row, index);

    row.appendChild(number);
    row.appendChild(name);
    row.appendChild(removeBtn);
    return row;
}




// habilita o arrasto de uma linha de camada para reordenar o array layers

function enableLayerDragAndDrop(row, index) {
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

        const draggedRow = document.querySelector(".dragging");
        if (!draggedRow) return;

        const fromIndex = Number(draggedRow.dataset.fromIndex);
        if (fromIndex === index) return;

        const [movedLayer] = layers.splice(fromIndex, 1);
        layers.splice(index, 0, movedLayer);

        updateLayersPanel();
        rebuildImageFromLayers();
    });
}




// ================================================================================================================
// Efeitos
// ================================================================================================================




// aplica um filtro por vez na imagem, de acordo com o tipo da camada

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
        gamaCorrection(jimpImg, layer);
    }

    else if (layer.type === "linear") {
        applyPiecewiseLinear(jimpImg, layer);
    }

    else if (layer.type === "steganography") {
        applySteganography(jimpImg, layer);
    }


    return jimpImg;
}




// refaz a imagem do zero, aplicando os efeitos na ordem em que
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
        this.bitmap.data[idx + 0] = 255 - this.bitmap.data[idx + 0];
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
        const red = this.bitmap.data[idx + 0];
        const green = this.bitmap.data[idx + 1];
        const blue = this.bitmap.data[idx + 2];
        const mean = (red + green + blue) / 3;

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
    const amount = layer.value;

    jimpImg.scan(0, 0, jimpImg.bitmap.width, jimpImg.bitmap.height, function(x, y, idx) {
        const red = this.bitmap.data[idx + 0] + amount;
        const green = this.bitmap.data[idx + 1] + amount;
        const blue = this.bitmap.data[idx + 2] + amount;

        this.bitmap.data[idx + 0] = clamp(red, 0, 255);
        this.bitmap.data[idx + 1] = clamp(green, 0, 255);
        this.bitmap.data[idx + 2] = clamp(blue, 0, 255);
    });
    return jimpImg;
}




// ------------------------------
// Função de correção de gama

async function gamaCorrection(jimpImg, layer) {
    const invGamma = 1 / layer.value;

    // lookup table para facilitar o cálculo
    const lut = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
        const normalized = i / 255;
        const corrected = Math.pow(normalized, invGamma);
        lut[i] = Math.round(corrected * 255);
    }

    jimpImg.scan(0, 0, jimpImg.bitmap.width, jimpImg.bitmap.height, function(x, y, idx) {
        this.bitmap.data[idx + 0] = lut[this.bitmap.data[idx + 0]];
        this.bitmap.data[idx + 1] = lut[this.bitmap.data[idx + 1]];
        this.bitmap.data[idx + 2] = lut[this.bitmap.data[idx + 2]];
    });
    return jimpImg;
}




// ------------------------------
// Função linear definida por partes


// constrói uma LUT de 256 posições a partir de uma lista de pontos
// de controle {x, y}, interpolando linearmente entre pontos vizinhos

function buildPiecewiseLut(points) {
    const sortedPoints = [...points].sort((a, b) => a.x - b.x);
    const lut = new Uint8ClampedArray(256);

    for (let i = 0; i < 256; i++) {
        // encontra o segmento [start, end] que contém i
        let start = sortedPoints[0];
        let end = sortedPoints[sortedPoints.length - 1];

        for (let j = 0; j < sortedPoints.length - 1; j++) {
            if (i >= sortedPoints[j].x && i <= sortedPoints[j + 1].x) {
                start = sortedPoints[j];
                end = sortedPoints[j + 1];
                break;
            }
        }

        if (end.x === start.x) {
            lut[i] = start.y;
        } else {
            const t = (i - start.x) / (end.x - start.x);
            lut[i] = Math.round(start.y + t * (end.y - start.y));
        }
    }

    return lut;
}


async function applyPiecewiseLinear(jimpImg, layer) {
    const lutR = buildPiecewiseLut(layer.pointsR);
    const lutG = buildPiecewiseLut(layer.pointsG);
    const lutB = buildPiecewiseLut(layer.pointsB);

    jimpImg.scan(0, 0, jimpImg.bitmap.width, jimpImg.bitmap.height, function(x, y, idx) {
        this.bitmap.data[idx + 0] = lutR[this.bitmap.data[idx + 0]];
        this.bitmap.data[idx + 1] = lutG[this.bitmap.data[idx + 1]];
        this.bitmap.data[idx + 2] = lutB[this.bitmap.data[idx + 2]];
    });
    return jimpImg;
}




// ================================================================================================================
// Esteganografia
// ================================================================================================================




// ------------------------------


// cabeçalho de 32 bits (4 bytes) no início do fluxo de bits guarda o
// comprimento da mensagem em bytes; cada canal de cor (R, G e B) esconde
// 1 bit no bit menos significativo, ou seja, 3 bits por pixel

const STEGO_HEADER_BITS = 32;




// quantos bits a imagem comporta (3 por pixel: R, G e B)

function stegoCapacityBits(jimpImg) {
    return jimpImg.bitmap.width * jimpImg.bitmap.height * 3;
}




// transforma a mensagem em bytes UTF-8 e calcula quantos bits ela
// ocupará na imagem (cabeçalho + 8 bits por byte)

function stegoMessageBits(message) {
    const bytes = new TextEncoder().encode(message);
    return { bytes, bits: STEGO_HEADER_BITS + bytes.length * 8 };
}




// esconde a mensagem nos bits menos significativos de R, G e B, na ordem
// dos pixels; o cabeçalho guarda o comprimento e a mensagem o segue bit a
// bit — a função supõe que a mensagem cabe (o controle de capacidade é
// feito na janela do filtro)

async function applySteganography(jimpImg, layer) {
    const { bytes, bits } = stegoMessageBits(layer.message);
    let bitIndex = 0;

    // devolve o bit i do pacote: os 32 primeiros bits são o comprimento
    // (big-endian) e os demais são os bytes da mensagem
    function bitOf(i) {
        if (i < STEGO_HEADER_BITS) {
            return (bytes.length >>> (STEGO_HEADER_BITS - 1 - i)) & 1;
        }
        const rest = i - STEGO_HEADER_BITS;
        return (bytes[rest >> 3] >>> (7 - (rest & 7))) & 1;
    }

    jimpImg.scan(0, 0, jimpImg.bitmap.width, jimpImg.bitmap.height, function(x, y, idx) {
        for (let channel = 0; channel < 3; channel++) {
            if (bitIndex >= bits) return false;
            const value = this.bitmap.data[idx + channel];
            this.bitmap.data[idx + channel] = (value & 0xFE) | bitOf(bitIndex);
            bitIndex++;
        }
    });
    return jimpImg;
}




// extrai a mensagem escondida lendo os bits menos significativos de R, G
// e B; devolve null quando não há mensagem válida (cabeçalho ausente,
// comprimento impossível para a imagem ou texto que não é UTF-8)

async function readSteganography(jimpImg) {
    const capacity = stegoCapacityBits(jimpImg);
    if (capacity < STEGO_HEADER_BITS) return null;

    // coleta `total` bits da imagem, pulando os `skip` primeiros (o
    // cabeçalho ocupa as primeiras 32 posições do fluxo)
    function collectBits(total, skip = 0) {
        const out = new Uint8Array(total);
        let collected = 0;

        jimpImg.scan(0, 0, jimpImg.bitmap.width, jimpImg.bitmap.height, function(x, y, idx) {
            for (let channel = 0; channel < 3; channel++) {
                if (collected >= total) return false;
                const bit = this.bitmap.data[idx + channel] & 1;
                if (skip > 0) { skip--; continue; }
                out[collected++] = bit;
            }
        });
        return out;
    }

    // lê o comprimento do cabeçalho (32 bits, big-endian)
    const header = collectBits(STEGO_HEADER_BITS);
    let length = 0;
    for (let i = 0; i < STEGO_HEADER_BITS; i++) {
        length = length * 2 + header[i];
    }

    // comprimento impossível para esta imagem: não há mensagem
    if (length <= 0 || STEGO_HEADER_BITS + length * 8 > capacity) {
        return null;
    }

    // reagrupa os bits do corpo em bytes e decodifica como UTF-8
    const body = collectBits(length * 8, STEGO_HEADER_BITS);
    const bytes = new Uint8Array(length);
    for (let b = 0; b < length; b++) {
        let value = 0;
        for (let k = 0; k < 8; k++) {
            value = value * 2 + body[b * 8 + k];
        }
        bytes[b] = value;
    }

    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch (err) {
        return null;
    }
}


// ================================================================================================================
// Abrir e salvar imagens
// ================================================================================================================




// carrega o arquivo escolhido pelo usuário como imagem de trabalho,
// reiniciando as camadas aplicadas

imgInput.addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Selecione uma imagem.");
        return;
    }

    imgName = file.name;
    imgInput.value = "";

    try {
        const content = await file.arrayBuffer();
        originalImg = await Jimp.read(content);
        layers = [];

        updateLayersPanel();
        setControlEnable(true);

        emptyCanvas.style.display = "none";
        canvas.style.display = "block";

        await rebuildImageFromLayers();
    } catch (err) {
        console.error(err);
        alert("Não foi possível abrir a imagem.");
    }
});




// aplica todas as camadas na imagem original e baixa o resultado como PNG

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




// centraliza a janela na posição (x, y) do cursor

function placeAtCursor(win, x, y) {
    const width = win.offsetWidth;
    win.style.left = `${x - width / 2}px`;
    win.style.top = `${y}px`;
}




// ativa a funcionalidade de arrasto da janela pela sua barra de título

function enableDragging(win, head) {
    head.addEventListener("mousedown", (event) => {
        // fw-close é o botão de fechar da janela; não deve iniciar o arrasto
        if (event.target.closest(".fw-close")) return;

        event.preventDefault();
        placeAtCursor(win, event.clientX, event.clientY);

        const onMove = (moveEvent) => {
            placeAtCursor(win, moveEvent.clientX, moveEvent.clientY);
        };

        const onUp = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    });
}




// cria a estrutura HTML da janela flutuante de preview de um filtro
// (fw = filter window)

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
        win.dispatchEvent(new Event("fw-closed"));
        win.remove();
    });

    return win;
}




// gera o base64 da imagem processada e o exibe na área de preview da janela

let previewToken = 0;

async function showPreview(win, jimpImg) {
    const token = ++previewToken;
    const base64 = await jimpImg.getBase64Async(Jimp.MIME_PNG);

    // ignora o resultado se outro preview foi solicitado enquanto
    // este ainda estava sendo gerado
    if (token !== previewToken) return;

    const preview = win.querySelector(".fw-preview");
    if (!preview) return;

    preview.innerHTML = "";

    const img = document.createElement("img");
    img.src = base64;
    preview.appendChild(img);
}




// ================================================================================================================
// Gráfico de curva de tons
// ================================================================================================================




// tamanho, em pixels, do canvas do gráfico (largura e altura são iguais)
const GRAPH_SIZE = 180;




// expande uma janela de filtro para o layout de duas colunas: preview e
// controles à esquerda (fw-col-main), gráfico à direita (fw-col-curve).
// aboveGraphHtml é inserido acima do gráfico (ex: abas de canal);
// insideGraphHtml é inserido dentro do .fw-curve, sobre o canvas
// (ex: um ponto arrastável, que precisa de position:absolute relativo a ela)

function createFilterGraph(win, aboveGraphHtml = "", insideGraphHtml = "") {
    win.classList.add("fw-wide");

    const body = win.querySelector(".fw-body");
    body.classList.add("fw-body-split");

    const mainColumn = document.createElement("div");
    mainColumn.className = "fw-col-main";
    mainColumn.appendChild(win.querySelector(".fw-preview"));
    mainColumn.appendChild(win.querySelector(".fw-controls"));
    mainColumn.appendChild(win.querySelector(".fw-apply"));

    const graphColumn = document.createElement("div");
    graphColumn.className = "fw-col-curve";
    graphColumn.innerHTML = `
        ${aboveGraphHtml}
        <div class="fw-curve">
            <canvas width="${GRAPH_SIZE}" height="${GRAPH_SIZE}"></canvas>
            ${insideGraphHtml}
        </div>
    `;

    body.appendChild(mainColumn);
    body.appendChild(graphColumn);

    const graphBox = graphColumn.querySelector(".fw-curve");
    const graphCanvas = graphColumn.querySelector("canvas");

    return {
        mainColumn,
        graphColumn,
        graphBox,
        graphCanvas,
        controls: mainColumn.querySelector(".fw-controls"),
        toCanvasXY,
        toImageXY,
    };
}




// converte um ponto em coordenadas de imagem (0-255) para pixels do canvas
// do gráfico; o eixo y é invertido, pois telas crescem para baixo e
// gráficos de tons crescem para cima

function toCanvasXY(point) {
    return {
        px: (point.x / 255) * GRAPH_SIZE,
        py: GRAPH_SIZE - (point.y / 255) * GRAPH_SIZE,
    };
}




// converte um ponto em pixels do canvas do gráfico para coordenadas
// de imagem (0-255), limitando o resultado à faixa válida

function toImageXY(px, py) {
    const x = Math.round(clamp(px / GRAPH_SIZE * 255, 0, 255));
    const y = Math.round(clamp(255 - py / GRAPH_SIZE * 255, 0, 255));
    return { x, y };
}




// desenha a diagonal pontilhada de referência (y = x, sem alteração
// nenhuma), usada como pano de fundo em todo gráfico de tons

function drawIdentityLine(ctx) {
    ctx.strokeStyle = "#333333";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, GRAPH_SIZE);
    ctx.lineTo(GRAPH_SIZE, 0);
    ctx.stroke();
    ctx.setLineDash([]);
}


// ================================================================================================================
// Botões de filtro
// ================================================================================================================




negativeBtn.addEventListener("click", () => {
    const win = createFilterWindow("Negativo");

    // aplica todos os filtros já em uso e, por cima, o efeito
    // sendo configurado, só para fins de visualização
    const preview = originalImg.clone();
    layers.forEach((layer) => applyFilter(preview, layer));
    applyFilter(preview, { type: "negative" });
    showPreview(win, preview);

    win.querySelector(".fw-apply").addEventListener("click", () => {
        layers.push({ label: "Negativo", type: "negative" });
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
        applyFilter(preview, { type: "threshold", value: thresholdValue });
        showPreview(win, preview);
    }

    range.addEventListener("input", updateThresholdPreview);

    valueInput.addEventListener("input", () => {
        const typed = clamp(Number(valueInput.value), 0, 255);
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
        applyFilter(preview, { type: "brightness", value: brightnessValue });
        showPreview(win, preview);
    }

    range.addEventListener("input", updateBrightnessPreview);

    valueInput.addEventListener("input", () => {
        const typed = clamp(Number(valueInput.value), -255, 255);
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




// ================================================================================


gammaBtn.addEventListener("click", () => {
    const win = createFilterWindow("Correção de gama");

    const { controls, graphBox, graphCanvas } = createFilterGraph(win, "", `<div class="fw-curve-handle"></div>`);
    const handle = graphBox.querySelector(".fw-curve-handle");

    controls.innerHTML = `
    <div class="fw-control">
        <div class="fw-control-header">
            <label> Gama <span class="fw-gamma-value">(γ = 1.00)</span></label>
            <input class="fw-value" type="number" min="-100" max="100" value="0">
        </div>
        <input type="range" min="-100" max="100" value="0">
    </div>
    `;

    const range = controls.querySelector('input[type="range"]');
    const valueInput = controls.querySelector('input[type="number"]');
    const gammaReadout = controls.querySelector(".fw-gamma-value");




    // converte o valor do slider (-100 a 100) em gama (0.5 a 2)

    function sliderToGamma(slider) {
        return Math.pow(2, slider / 100);
    }




    // converte um valor de gama (0.5 a 2) de volta para o slider (-100 a 100)

    function gammaToSlider(gamma) {
        return Math.round(100 * Math.log2(gamma));
    }




    // desenha a curva de tons y = x^(1/gama) sobre a diagonal de referência

    function drawGammaCurve(gamma) {
        const ctx = graphCanvas.getContext("2d");
        const invGamma = 1 / gamma;

        ctx.clearRect(0, 0, GRAPH_SIZE, GRAPH_SIZE);
        drawIdentityLine(ctx);

        ctx.strokeStyle = "#8b06e9";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let px = 0; px <= GRAPH_SIZE; px++) {
            const x = px / GRAPH_SIZE;
            const y = Math.pow(x, invGamma);
            const py = GRAPH_SIZE - y * GRAPH_SIZE;
            if (px === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }




    // posiciona o ponto arrastável no meio da curva

    function placeHandle(gamma) {
        const x = 0.5;
        const y = Math.pow(x, 1 / gamma);
        handle.style.left = `${x * 100}%`;
        handle.style.top = `${(1 - y) * 100}%`;
    }




    // recalcula a curva, o preview e a posição do ponto arrastável
    // a partir do valor atual do slider

    function updateGammaPreview() {
        const sliderValue = Number(range.value);
        const gamma = sliderToGamma(sliderValue);

        valueInput.value = sliderValue;
        gammaReadout.textContent = `(γ = ${gamma.toFixed(2)})`;

        drawGammaCurve(gamma);
        placeHandle(gamma);

        const preview = originalImg.clone();
        layers.forEach((layer) => applyFilter(preview, layer));
        applyFilter(preview, { type: "gamma", value: gamma });
        showPreview(win, preview);
    }

    range.addEventListener("input", updateGammaPreview);

    valueInput.addEventListener("input", () => {
        const typed = clamp(Number(valueInput.value), -100, 100);
        range.value = typed;
        updateGammaPreview();
    });




    // arrasto do ponto sobre a curva de tons: recalcula o gama a partir
    // da posição normalizada (0-1) do ponto dentro do gráfico

    handle.addEventListener("mousedown", (event) => {
        event.preventDefault();

        const onMove = (moveEvent) => {
            const rect = graphBox.getBoundingClientRect();

            let x = (moveEvent.clientX - rect.left) / rect.width;
            let y = 1 - (moveEvent.clientY - rect.top) / rect.height;

            x = clamp(x, 0.02, 0.98);
            y = clamp(y, 0.02, 0.98);

            // inverte y = x^(1/gama) para descobrir o gama do ponto arrastado
            const gamma = clamp(Math.log(x) / Math.log(y), 0.5, 2);

            range.value = gammaToSlider(gamma);
            updateGammaPreview();
        };

        const cleanup = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", cleanup);
            win.removeEventListener("fw-closed", cleanup);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", cleanup);
        win.addEventListener("fw-closed", cleanup);
    });

    updateGammaPreview();

    win.querySelector(".fw-apply").addEventListener("click", () => {
        const gamma = sliderToGamma(Number(range.value));
        layers.push({ label: `Gama (γ = ${gamma.toFixed(2)})`, type: "gamma", value: gamma });
        updateLayersPanel();
        rebuildImageFromLayers();
        win.remove();
    });
});

// ================================================================================

linearBtn.addEventListener("click", () => {
    const win = createFilterWindow("Função linear por partes");

    const channelTabsHtml = `
        <div class="fw-channel-tabs">
            <button type="button" class="fw-channel-tab active" data-channel="r">R</button>
            <button type="button" class="fw-channel-tab" data-channel="g">G</button>
            <button type="button" class="fw-channel-tab" data-channel="b">B</button>
        </div>
    `;

    const { controls, graphBox, graphCanvas, graphColumn } = createFilterGraph(win, channelTabsHtml);
    graphColumn.insertAdjacentHTML(
        "beforeend",
        `<div class="fw-curve-hint">Clique na curva para adicionar um ponto. Clique com o botão direito num ponto para removê-lo.</div>`
    );

    controls.innerHTML = `<div class="fw-point-fields"></div>`;
    const pointFields = controls.querySelector(".fw-point-fields");
    const channelTabs = [...graphColumn.querySelectorAll(".fw-channel-tab")];

    const CHANNEL_COLORS = { r: "#e05a4a", g: "#4ac26a", b: "#4a8ce0" };




    // cada canal começa com os dois pontos extremos (identidade: y = x)

    function defaultPoints() {
        return [{ x: 0, y: 0 }, { x: 255, y: 255 }];
    }

    const pointsByChannel = {
        r: defaultPoints(),
        g: defaultPoints(),
        b: defaultPoints(),
    };

    let activeChannel = "r";
    let draggingPoint = null;

    function currentPoints() {
        return pointsByChannel[activeChannel];
    }




    // limita o x de um ponto para não ultrapassar seus vizinhos imediatos
    // (impede segmentos de largura zero ou pontos fora de ordem)

    function clampPointX(point, desiredX) {
        const sorted = [...currentPoints()].sort((a, b) => a.x - b.x);
        const posIndex = sorted.indexOf(point);

        if (posIndex === 0 || posIndex === sorted.length - 1) {
            return point.x; // pontos extremos não mudam de x
        }

        const prevX = sorted[posIndex - 1].x;
        const nextX = sorted[posIndex + 1].x;

        if (nextX - prevX <= 2) {
            return point.x; // sem espaço entre os vizinhos, não move
        }

        return clamp(desiredX, prevX + 1, nextX - 1);
    }




    // desenha a curva do canal ativo (segmentos entre pontos) e seus
    // pontos de controle, sobre a diagonal de referência

    function drawChannelCurve() {
        const ctx = graphCanvas.getContext("2d");
        ctx.clearRect(0, 0, GRAPH_SIZE, GRAPH_SIZE);
        drawIdentityLine(ctx);

        const sorted = [...currentPoints()].sort((a, b) => a.x - b.x);
        const channelColor = CHANNEL_COLORS[activeChannel];

        ctx.strokeStyle = channelColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        sorted.forEach((point, i) => {
            const { px, py } = toCanvasXY(point);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();

        sorted.forEach((point) => {
            const { px, py } = toCanvasXY(point);
            ctx.fillStyle = channelColor;
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#080808";
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });
    }




    // cria a linha de campos numéricos (x, y) de um ponto de controle;
    // pontos extremos têm o campo x travado, pois seu x é fixo (0 ou 255)

    function createPointField(point, isEdge) {
        const row = document.createElement("div");
        row.className = "fw-control";

        row.innerHTML = `
        <div class="fw-control-header">
            <label>Ponto (x, y)</label>
        </div>
        <div class="fw-point-row">
            <input class="fw-value" type="number" min="0" max="255" value="${point.x}" ${isEdge ? "disabled" : ""}>
            <span class="fw-point-sep">,</span>
            <input class="fw-value" type="number" min="0" max="255" value="${point.y}">
            <button type="button" class="fw-point-remove" ${isEdge ? "disabled" : ""} title="Remover ponto">x</button>
        </div>
        `;

        const [xInput, yInput] = row.querySelectorAll("input");
        const removeBtn = row.querySelector(".fw-point-remove");

        xInput.addEventListener("input", () => {
            const desiredX = clamp(Number(xInput.value), 0, 255);
            point.x = clampPointX(point, desiredX);
            // mudar x pode reordenar os pontos, então os campos precisam
            // ser reconstruídos (perde o foco, mas evita lista desalinhada)
            refresh();
        });

        yInput.addEventListener("input", () => {
            point.y = clamp(Number(yInput.value), 0, 255);
            refreshCurveAndPreview();
        });

        removeBtn.addEventListener("click", () => {
            const points = currentPoints();
            const idx = points.indexOf(point);
            if (idx !== -1) points.splice(idx, 1);
            refresh();
        });

        return row;
    }




    // reconstrói toda a lista de campos numéricos a partir dos pontos
    // do canal ativo, ordenados por x

    function updatePointFields() {
        pointFields.innerHTML = "";
        const sorted = [...currentPoints()].sort((a, b) => a.x - b.x);
        sorted.forEach((point, i) => {
            const isEdge = i === 0 || i === sorted.length - 1;
            pointFields.appendChild(createPointField(point, isEdge));
        });
    }




    // aplica a função linear por partes dos três canais sobre a imagem
    // já processada pelas camadas existentes, só para fins de preview

    function updateLinearPreview() {
        const preview = originalImg.clone();
        layers.forEach((layer) => applyFilter(preview, layer));
        applyFilter(preview, {
            type: "linear",
            pointsR: pointsByChannel.r,
            pointsG: pointsByChannel.g,
            pointsB: pointsByChannel.b,
        });
        showPreview(win, preview);
    }




    // atualização completa: redesenha a curva, reconstrói os campos
    // numéricos e recalcula o preview

    function refresh() {
        drawChannelCurve();
        updatePointFields();
        updateLinearPreview();
    }




    // usado quando o valor de um ponto muda por um campo numérico:
    // não reconstrói os campos, para não roubar o foco de quem está digitando

    function refreshCurveAndPreview() {
        drawChannelCurve();
        updateLinearPreview();
    }

    channelTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            channelTabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            activeChannel = tab.dataset.channel;
            refresh();
        });
    });




    // encontra o ponto de controle mais próximo de (px, py), dentro de
    // um raio de tolerância; usado para decidir se um clique seleciona
    // um ponto existente ou cria um novo

    function findNearbyPoint(px, py) {
        let closestPoint = null;
        let closestDist = Infinity;

        currentPoints().forEach((point) => {
            const canvasPos = toCanvasXY(point);
            const dist = Math.hypot(canvasPos.px - px, canvasPos.py - py);
            if (dist < closestDist) {
                closestDist = dist;
                closestPoint = point;
            }
        });

        return closestDist <= 10 ? closestPoint : null;
    }




    graphCanvas.addEventListener("mousedown", (event) => {
        const rect = graphBox.getBoundingClientRect();
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;

        const existingPoint = findNearbyPoint(px, py);

        if (existingPoint) {
            draggingPoint = existingPoint;
            return;
        }

        // clique em área vazia da curva: cria um novo ponto de controle;
        // o x é limitado a [1, 254] para que o ponto criado nunca vire um
        // extremo (extremos têm x travado e não podem ser removidos)
        const { x, y } = toImageXY(px, py);
        const newPoint = { x: clamp(x, 1, 254), y };
        currentPoints().push(newPoint);
        newPoint.x = clampPointX(newPoint, newPoint.x);
        draggingPoint = newPoint;
        refresh();
    });

    graphCanvas.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        const rect = graphBox.getBoundingClientRect();
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;

        const points = currentPoints();
        const target = findNearbyPoint(px, py);
        if (!target) return;

        const sorted = [...points].sort((a, b) => a.x - b.x);
        const isEdge = target === sorted[0] || target === sorted[sorted.length - 1];
        if (isEdge) return;

        const idx = points.indexOf(target);
        if (idx !== -1) points.splice(idx, 1);
        refresh();
    });

    const onMove = (event) => {
        if (!draggingPoint) return;

        const rect = graphBox.getBoundingClientRect();
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        const { x, y } = toImageXY(px, py);

        draggingPoint.x = clampPointX(draggingPoint, x);
        draggingPoint.y = y;

        refresh();
    };

    const onUp = () => {
        draggingPoint = null;
    };

    const cleanup = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        win.removeEventListener("fw-closed", cleanup);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    win.addEventListener("fw-closed", cleanup);

    refresh();

    win.querySelector(".fw-apply").addEventListener("click", () => {
        layers.push({
            label: "Linear por partes",
            type: "linear",
            pointsR: pointsByChannel.r.map((p) => ({ ...p })),
            pointsG: pointsByChannel.g.map((p) => ({ ...p })),
            pointsB: pointsByChannel.b.map((p) => ({ ...p })),
        });
        updateLayersPanel();
        rebuildImageFromLayers();
        win.remove();
    });
});

// ================================================================================


steganographyBtn.addEventListener("click", () => {
    const win = createFilterWindow("Esteganografia");
    const controls = win.querySelector(".fw-controls");

    controls.innerHTML = `
    <div class="fw-channel-tabs">
        <button type="button" class="fw-channel-tab active" data-mode="write">Escrever</button>
        <button type="button" class="fw-channel-tab" data-mode="read">Ler</button>
    </div>
    <div class="fw-stego-write">
        <textarea class="fw-textarea" rows="5" placeholder="Digite a mensagem para esconder na imagem"></textarea>
        <div class="fw-capacity"></div>
        <div class="fw-curve-hint">Aplique este filtro por último: filtros aplicados depois dele podem corromper a mensagem.</div>
    </div>
    <div class="fw-stego-read" style="display: none">
        <button type="button" class="fw-read-btn">Ler mensagem</button>
        <textarea class="fw-textarea" rows="5" readonly placeholder="A mensagem encontrada aparecerá aqui"></textarea>
        <div class="fw-read-status"></div>
    </div>
    `;

    const tabs = [...controls.querySelectorAll(".fw-channel-tab")];
    const writeSection = controls.querySelector(".fw-stego-write");
    const readSection = controls.querySelector(".fw-stego-read");
    const textarea = writeSection.querySelector("textarea");
    const capacityInfo = controls.querySelector(".fw-capacity");
    const readBtn = controls.querySelector(".fw-read-btn");
    const readResult = readSection.querySelector("textarea");
    const readStatus = controls.querySelector(".fw-read-status");
    const applyBtn = win.querySelector(".fw-apply");




    // gera o preview da imagem como ela está (original + camadas aplicadas)

    function buildCurrentPreview() {
        const preview = originalImg.clone();
        layers.forEach((layer) => applyFilter(preview, layer));
        return preview;
    }




    // transforma o tamanho da mensagem em bits, compara com o espaço
    // disponível na imagem e atualiza o preview com a mensagem embutida

    function updateStegoPreview() {
        const message = textarea.value;
        const { bytes, bits } = stegoMessageBits(message);
        const capacity = stegoCapacityBits(originalImg);
        const maxBytes = Math.floor((capacity - STEGO_HEADER_BITS) / 8);
        const fits = bits <= capacity;

        capacityInfo.textContent = `Mensagem: ${bytes.length} bytes | Máximo para esta imagem: ${maxBytes} bytes`;
        capacityInfo.classList.toggle("over", !fits);
        applyBtn.disabled = !fits || message.length === 0;

        const preview = buildCurrentPreview();
        if (fits && message) {
            applyFilter(preview, { type: "steganography", message });
        }
        showPreview(win, preview);
    }




    // alterna entre escrever (cria uma camada) e ler (extrai da imagem
    // atual, sem criar camada)

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");

            const isWrite = tab.dataset.mode === "write";
            writeSection.style.display = isWrite ? "" : "none";
            readSection.style.display = isWrite ? "none" : "";
            applyBtn.style.display = isWrite ? "" : "none";

            if (isWrite) {
                updateStegoPreview();
            } else {
                showPreview(win, buildCurrentPreview());
            }
        });
    });




    // extrai a mensagem da imagem exibida (original + camadas) e mostra
    // o resultado; avisa quando não encontra nada válido

    readBtn.addEventListener("click", async () => {
        const message = await readSteganography(buildCurrentPreview());

        if (message === null) {
            readResult.value = "";
            readStatus.textContent = "Nenhuma mensagem válida encontrada nesta imagem.";
        } else {
            readResult.value = message;
            readStatus.textContent = "Mensagem recuperada com sucesso.";
        }
    });




    textarea.addEventListener("input", updateStegoPreview);

    updateStegoPreview();

    applyBtn.addEventListener("click", () => {
        const message = textarea.value;
        const { bytes } = stegoMessageBits(message);
        layers.push({ label: `Esteganografia (${bytes.length} bytes)`, type: "steganography", message });
        updateLayersPanel();
        rebuildImageFromLayers();
        win.remove();
    });
});
