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
const histogramBtn = document.getElementById("histogram");
const histogramEqBtn = document.getElementById("histogram-eq");
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
    histogramBtn.disabled = !enabled;
    histogramEqBtn.disabled = !enabled;
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

    else if (layer.type === "histogram-eq") {
        applyHistogramEqualization(jimpImg, layer);
    }

    else if (layer.type === "steganography") {
        hideMessage(jimpImg, layer);
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


// ------------------------------
// Histograma e equalização de histograma


// calcula os histogramas de R, G, B (256 posições cada, contagem de
// pixels por nível de intensidade) e o histograma de luminância (média
// dos três canais), usado como base tanto para a exibição quanto para
// a equalização

function computeHistograms(jimpImg) {
    const r = new Array(256).fill(0);
    const g = new Array(256).fill(0);
    const b = new Array(256).fill(0);
    const luminance = new Array(256).fill(0);

    jimpImg.scan(0, 0, jimpImg.bitmap.width, jimpImg.bitmap.height, function(x, y, idx) {
        const red = this.bitmap.data[idx + 0];
        const green = this.bitmap.data[idx + 1];
        const blue = this.bitmap.data[idx + 2];

        r[red]++;
        g[green]++;
        b[blue]++;
        luminance[Math.round((red + green + blue) / 3)]++;
    });

    return { r, g, b, luminance };
}




// constrói a LUT de equalização a partir de um histograma: acumula as
// contagens (CDF), normaliza para a faixa 0-255 e ignora o menor valor
// de CDF (cdfMin) para que o nível mais escuro da imagem continue em 0,
// como na equalização de histograma clássica

function buildEqualizationLut(histogram, totalPixels) {
    const lut = new Uint8ClampedArray(256);

    if (totalPixels === 0) {
        return lut;
    }

    const cdf = new Array(256).fill(0);
    let cumulative = 0;
    for (let i = 0; i < 256; i++) {
        cumulative += histogram[i];
        cdf[i] = cumulative;
    }

    // cdfMin é a menor contagem acumulada não-nula; se a imagem tiver
    // um único nível de intensidade, cdfMin === totalPixels e a divisão
    // abaixo daria zero no denominador, então esse caso é tratado à parte
    const cdfMin = cdf.find((value) => value > 0) ?? 0;

    if (cdfMin === totalPixels) {
        // imagem com um só nível de tom: não há o que equalizar,
        // mantém a identidade para não gerar ruído artificial
        for (let i = 0; i < 256; i++) lut[i] = i;
        return lut;
    }

    for (let i = 0; i < 256; i++) {
        lut[i] = Math.round(((cdf[i] - cdfMin) / (totalPixels - cdfMin)) * 255);
    }

    return lut;
}




// aplica a equalização de histograma. modo "luminance" (padrão) equaliza
// a média dos canais e aplica a mesma LUT aos três, preservando a matiz;
// modo "channels" equaliza R, G e B de forma independente, o que corrige
// mais contraste porém pode alterar as cores da imagem

async function applyHistogramEqualization(jimpImg, layer) {
    const mode = layer.mode || "luminance";
    const totalPixels = jimpImg.bitmap.width * jimpImg.bitmap.height;
    const { r, g, b, luminance } = computeHistograms(jimpImg);

    if (mode === "channels") {
        const lutR = buildEqualizationLut(r, totalPixels);
        const lutG = buildEqualizationLut(g, totalPixels);
        const lutB = buildEqualizationLut(b, totalPixels);

        jimpImg.scan(0, 0, jimpImg.bitmap.width, jimpImg.bitmap.height, function(x, y, idx) {
            this.bitmap.data[idx + 0] = lutR[this.bitmap.data[idx + 0]];
            this.bitmap.data[idx + 1] = lutG[this.bitmap.data[idx + 1]];
            this.bitmap.data[idx + 2] = lutB[this.bitmap.data[idx + 2]];
        });
    } else {
        const lutLuminance = buildEqualizationLut(luminance, totalPixels);

        jimpImg.scan(0, 0, jimpImg.bitmap.width, jimpImg.bitmap.height, function(x, y, idx) {
            const red = this.bitmap.data[idx + 0];
            const green = this.bitmap.data[idx + 1];
            const blue = this.bitmap.data[idx + 2];
            const level = Math.round((red + green + blue) / 3);
            const equalized = lutLuminance[level];

            // desloca cada canal pela mesma diferença aplicada à
            // luminância, preservando a proporção de cor original
            const delta = equalized - level;

            this.bitmap.data[idx + 0] = clamp(red + delta, 0, 255);
            this.bitmap.data[idx + 1] = clamp(green + delta, 0, 255);
            this.bitmap.data[idx + 2] = clamp(blue + delta, 0, 255);
        });
    }

    return jimpImg;
}




// desenha um histograma (um único canal de contagens) num canvas 2D,
// normalizando as barras pela maior contagem encontrada; usado tanto
// para o histograma "cru" quanto para o histograma pós-equalização

function drawHistogramBars(canvasEl, histogram, color) {
    const ctx = canvasEl.getContext("2d");
    const width = canvasEl.width;
    const height = canvasEl.height;

    ctx.clearRect(0, 0, width, height);

    const maxCount = Math.max(...histogram);
    if (maxCount === 0) return;

    const barWidth = width / 256;

    ctx.fillStyle = color;
    for (let i = 0; i < 256; i++) {
        const barHeight = (histogram[i] / maxCount) * height;
        ctx.fillRect(i * barWidth, height - barHeight, Math.max(barWidth, 1), barHeight);
    }
}




// ------------------------------
// Função de esteganografia (ocultar/revelar texto)


// converte um texto para uma sequência de bits (8 bits por caractere,
// UTF-8), seguida de um terminador de 16 bits em zero, que marca o
// fim da mensagem na hora de revelar

function textToBits(text) {
    const bytes = new TextEncoder().encode(text);
    const bits = [];

    bytes.forEach((byte) => {
        for (let i = 7; i >= 0; i--) {
            bits.push((byte >> i) & 1);
        }
    });

    // terminador: 16 zeros seguidos, que não ocorrem no meio de um
    // texto UTF-8 válido, pois todo byte de texto tem ao menos um bit 1
    for (let i = 0; i < 16; i++) {
        bits.push(0);
    }

    return bits;
}




// embute os bits de um texto no bit menos significativo do canal
// azul de cada pixel, em ordem de varredura; a imagem precisa ter
// pixels suficientes para conter a mensagem inteira

async function hideMessage(jimpImg, layer) {
    const bits = textToBits(layer.value);
    const totalPixels = jimpImg.bitmap.width * jimpImg.bitmap.height;

    if (bits.length > totalPixels) {
        throw new Error("Mensagem longa demais para esta imagem.");
    }

    let bitIndex = 0;

    jimpImg.scan(0, 0, jimpImg.bitmap.width, jimpImg.bitmap.height, function(x, y, idx) {
        if (bitIndex >= bits.length) return;

        const blue = this.bitmap.data[idx + 2];
        this.bitmap.data[idx + 2] = (blue & 0xfe) | bits[bitIndex];
        bitIndex++;
    });

    return jimpImg;
}




// lê o bit menos significativo do canal azul de cada pixel, em ordem
// de varredura, até encontrar o terminador (16 zeros seguidos) ou
// esgotar a imagem, e decodifica os bits lidos de volta para texto

function revealMessage(jimpImg) {
    const bits = [];
    let zeroStreak = 0;

    jimpImg.scan(0, 0, jimpImg.bitmap.width, jimpImg.bitmap.height, function(x, y, idx) {
        if (zeroStreak >= 16) return;

        const bit = this.bitmap.data[idx + 2] & 1;
        bits.push(bit);
        zeroStreak = bit === 0 ? zeroStreak + 1 : 0;
    });

    // remove o terminador de 16 zeros antes de decodificar
    const messageBits = zeroStreak >= 16 ? bits.slice(0, bits.length - 16) : bits;

    const byteCount = Math.floor(messageBits.length / 8);
    const bytes = new Uint8Array(byteCount);

    for (let i = 0; i < byteCount; i++) {
        let byte = 0;
        for (let b = 0; b < 8; b++) {
            byte = (byte << 1) | messageBits[i * 8 + b];
        }
        bytes[i] = byte;
    }

    return new TextDecoder().decode(bytes);
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




// centraliza a janela na tela, usando suas dimensões reais (offsetWidth/
// offsetHeight); precisa ser chamada com a janela já inserida no DOM, e
// deve ser chamada de novo sempre que o tamanho da janela mudar (ex: ao
// virar fw-wide), pois a centralização inicial fica desatualizada

function centerWindow(win) {
    const width = win.offsetWidth;
    const height = win.offsetHeight;
    win.style.left = `${Math.max(0, (window.innerWidth - width) / 2)}px`;
    win.style.top = `${Math.max(0, (window.innerHeight - height) / 2)}px`;
}




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
    centerWindow(win);

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

    centerWindow(win);

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

        // clique em área vazia da curva: cria um novo ponto de controle
        const { x, y } = toImageXY(px, py);
        const newPoint = { x, y };
        currentPoints().push(newPoint);
        newPoint.x = clampPointX(newPoint, x);
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


histogramBtn.addEventListener("click", () => {
    const win = createFilterWindow("Histograma");

    // esta janela é só de visualização: não mostra a imagem (ela já está
    // visível na área de trabalho principal) nem gera camada nenhuma,
    // então tanto a preview quanto o botão "Aplicar" (herdados do layout
    // padrão) são removidos
    win.querySelector(".fw-preview").remove();
    win.querySelector(".fw-apply").remove();

    const controls = win.querySelector(".fw-controls");
    controls.innerHTML = `
    <div class="fw-control">
        <div class="fw-control-header">
            <label>Canal</label>
        </div>
        <div class="fw-channel-tabs">
            <button type="button" class="fw-channel-tab active" data-channel="luminance">Luminância</button>
            <button type="button" class="fw-channel-tab" data-channel="r">R</button>
            <button type="button" class="fw-channel-tab" data-channel="g">G</button>
            <button type="button" class="fw-channel-tab" data-channel="b">B</button>
        </div>
    </div>
    <div class="fw-histogram-canvas-wrap">
        <canvas class="fw-histogram-canvas" width="400" height="160"></canvas>
    </div>
    `;

    const channelTabs = [...controls.querySelectorAll(".fw-channel-tab")];
    const histCanvas = controls.querySelector(".fw-histogram-canvas");

    const CHANNEL_COLORS = { luminance: "#e0e0e0", r: "#e05a4a", g: "#4ac26a", b: "#4a8ce0" };

    let activeChannel = "luminance";

    // imagem com as camadas já aplicadas: o histograma exibido reflete
    // o resultado atual, não a imagem original sem edições
    const current = originalImg.clone();
    layers.forEach((layer) => applyFilter(current, layer));
    const histograms = computeHistograms(current);

    function redrawHistogram() {
        drawHistogramBars(histCanvas, histograms[activeChannel], CHANNEL_COLORS[activeChannel]);
    }

    channelTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            channelTabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            activeChannel = tab.dataset.channel;
            redrawHistogram();
        });
    });

    // a remoção da preview muda a altura da janela; recentraliza com
    // o tamanho final já estabilizado
    centerWindow(win);
    redrawHistogram();
});




// ================================================================================


histogramEqBtn.addEventListener("click", () => {
    const win = createFilterWindow("Equalização de histograma");
    win.classList.add("fw-wide");

    // reorganiza o layout padrão (uma coluna) em duas colunas: dados de
    // equalização (modo + histograma resultante) à esquerda, imagem à
    // direita — mesmo esquema de fw-col-main / fw-col-curve usado no
    // gráfico de tons, mas com a coluna direita mostrando a imagem
    // em vez de uma curva
    const body = win.querySelector(".fw-body");
    body.classList.add("fw-body-split");

    const preview = win.querySelector(".fw-preview");
    const controls = win.querySelector(".fw-controls");
    const applyBtn = win.querySelector(".fw-apply");

    const dataColumn = document.createElement("div");
    dataColumn.className = "fw-col-main";
    dataColumn.appendChild(controls);
    dataColumn.appendChild(applyBtn);

    const imageColumn = document.createElement("div");
    imageColumn.className = "fw-col-image";
    imageColumn.appendChild(preview);

    body.appendChild(dataColumn);
    body.appendChild(imageColumn);

    controls.innerHTML = `
    <div class="fw-control">
        <div class="fw-control-header">
            <label>Modo</label>
        </div>
        <div class="fw-channel-tabs">
            <button type="button" class="fw-channel-tab active" data-mode="luminance">Luminância</button>
            <button type="button" class="fw-channel-tab" data-mode="channels">Canais (R, G, B)</button>
        </div>
    </div>
    <div class="fw-histogram-canvas-wrap">
        <canvas class="fw-histogram-canvas fw-histogram-canvas-compact" width="400" height="160"></canvas>
    </div>
    `;

    const modeTabs = [...controls.querySelectorAll(".fw-channel-tab")];
    const histCanvas = controls.querySelector(".fw-histogram-canvas");

    let mode = "luminance";

    function updateHistogramEqPreview() {
        const previewImg = originalImg.clone();
        layers.forEach((layer) => applyFilter(previewImg, layer));
        applyFilter(previewImg, { type: "histogram-eq", mode });
        showPreview(win, previewImg);

        // recalcula o histograma sobre o resultado já equalizado, para
        // mostrar o efeito da equalização (distribuição mais uniforme)
        const { luminance } = computeHistograms(previewImg);
        drawHistogramBars(histCanvas, luminance, "#e0e0e0");
    }

    modeTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            modeTabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            mode = tab.dataset.mode;
            updateHistogramEqPreview();
        });
    });

    // o layout de duas colunas muda as dimensões da janela (fw-wide);
    // recentraliza com o tamanho final já estabilizado
    centerWindow(win);
    updateHistogramEqPreview();

    applyBtn.addEventListener("click", () => {
        const label = mode === "channels" ? "Equalização (canais)" : "Equalização (luminância)";
        layers.push({ label, type: "histogram-eq", mode });
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
    <div class="fw-control">
        <div class="fw-control-header">
            <label>Texto a ocultar</label>
        </div>
        <textarea class="fw-textarea" rows="4" placeholder="Digite a mensagem.."></textarea>
        <div class="fw-stego-capacity"></div>
    </div>
    <div class="fw-control">
        <button type="button" class="fw-reveal-btn">Revelar texto desta imagem</button>
        <div class="fw-stego-revealed"></div>
    </div>
    `;

    const textarea = controls.querySelector(".fw-textarea");
    const capacityLabel = controls.querySelector(".fw-stego-capacity");
    const revealBtn = controls.querySelector(".fw-reveal-btn");
    const revealedBox = controls.querySelector(".fw-stego-revealed");

    // capacidade máxima de bits é um por pixel; cada byte de texto usa 8
    // bits mais 16 bits fixos do terminador; caracteres acentuados ou
    // especiais podem ocupar mais de um byte em UTF-8
    const maxBytes = Math.floor((originalImg.bitmap.width * originalImg.bitmap.height - 16) / 8);
    capacityLabel.textContent = `Capacidade aproximada: ${maxBytes} caracteres (menos se houver acentos ou símbolos)`;




    // mostra a imagem já com as camadas atuais aplicadas, sem nenhuma
    // mudança nova; a esteganografia não tem efeito visível, então o
    // preview serve só para confirmar que a imagem está correta

    function updateStegoPreview() {
        const preview = originalImg.clone();
        layers.forEach((layer) => applyFilter(preview, layer));
        showPreview(win, preview);
    }

    updateStegoPreview();




    revealBtn.addEventListener("click", async () => {
        revealedBox.textContent = "Lendo..";

        try {
            const current = originalImg.clone();
            layers.forEach((layer) => applyFilter(current, layer));
            const message = revealMessage(current);

            revealedBox.textContent = message
                ? `Mensagem encontrada: "${message}"`
                : "Nenhuma mensagem encontrada nesta imagem.";
        } catch (err) {
            console.error(err);
            revealedBox.textContent = "Não foi possível ler uma mensagem desta imagem.";
        }
    });

    win.querySelector(".fw-apply").addEventListener("click", async () => {
        const text = textarea.value;

        if (!text) {
            alert("Digite um texto para ocultar.");
            return;
        }

        const byteLength = new TextEncoder().encode(text).length;
        if (byteLength > maxBytes) {
            alert("Texto longo demais para esta imagem.");
            return;
        }

        const newLayer = { label: "Esteganografia", type: "steganography", value: text };

        try {
            // valida a camada isoladamente antes de adicioná-la à lista,
            // para não deixar uma camada inválida na interface em caso de erro
            await applyFilter(originalImg.clone(), newLayer);
        } catch (err) {
            console.error(err);
            alert(err.message);
            return;
        }

        layers.push(newLayer);
        updateLayersPanel();
        rebuildImageFromLayers();
        win.remove();
    });
});
