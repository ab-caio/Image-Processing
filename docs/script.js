(function () {
  "use strict";

  // ============================================================================================================
  // Variáveis
  // ============================================================================================================

  // Elementos da página que o código vai ler ou modificar.
  var mainImage    = document.getElementById("main-image");
  var stage        = document.getElementById("stage");
  var emptyState   = document.getElementById("empty-state");
  var fileInput    = document.getElementById("file-input");
  var saveBtn      = document.getElementById("save-btn");
  var btnNegativo  = document.getElementById("btn-negativo");
  var btnLimiar    = document.getElementById("btn-limiar");
  var layersList   = document.getElementById("layers-list");

  // "originalJimp" guarda a imagem exatamente como foi aberta pelo usuário.
  // Ela nunca é alterada diretamente — é sempre clonada antes de qualquer filtro.
  var originalJimp = null;

  // "layers" é a lista de filtros já aplicados, na ordem em que devem ser
  // recalculados. Cada item é um objeto simples, por exemplo:
  //   { label: "Negativo", type: "negativo" }
  //   { label: "Limiarização (128)", type: "limiar", value: 128 }
  var layers = [];

  // ============================================================================================================
  // Funções auxiliares de estado da tela
  // ============================================================================================================

  // Ativa ou desativa os botões que só fazem sentido quando existe uma imagem carregada.
  function setControlsEnabled(enabled) {
    saveBtn.disabled     = !enabled;
    btnNegativo.disabled = !enabled;
    btnLimiar.disabled   = !enabled;
  }

  // Redesenha a lista de camadas no painel direito, a partir do array "layers".
  // É chamada sempre que uma camada é adicionada, removida ou reordenada.
  function refreshLayersPanel() {
    layersList.innerHTML = "";

    if (layers.length === 0) {
      var empty = document.createElement("div");
      empty.className = "layers-empty";
      empty.textContent = "Nenhum filtro aplicado";
      layersList.appendChild(empty);
      return;
    }

    layers.forEach(function (layer, index) {
      var row = criarLinhaDeCamada(layer, index);
      layersList.appendChild(row);
    });
  }

  // Cria o elemento HTML de uma única linha da lista de camadas,
  // já com o número, o nome, o botão de remover e o arrastar-e-soltar.
  function criarLinhaDeCamada(layer, index) {
    var row = document.createElement("div");
    row.className = "layer-row";
    row.draggable = true;

    var num = document.createElement("span");
    num.className = "num";
    num.textContent = String(index + 1);

    var name = document.createElement("span");
    name.className = "name";
    name.textContent = layer.label;

    var removeBtn = document.createElement("button");
    removeBtn.textContent = "×";
    removeBtn.title = "Remover camada";
    removeBtn.addEventListener("click", function () {
      layers.splice(index, 1);
      refreshLayersPanel();
      rebuildImageFromLayers();
    });

    ligarEventosDeArrastar(row, index);

    row.appendChild(num);
    row.appendChild(name);
    row.appendChild(removeBtn);
    return row;
  }

  // ============================================================================================================
  // Arrastar e soltar camadas (reordenar os filtros)
  // ============================================================================================================

  // Liga os eventos nativos de "drag and drop" do navegador a uma linha da
  // lista de camadas, permitindo arrastá-la para cima ou para baixo.
  function ligarEventosDeArrastar(row, index) {

    // Início do arraste: guarda de onde a camada está saindo.
    row.addEventListener("dragstart", function () {
      row.classList.add("dragging");
      row.dataset.fromIndex = index;
    });

    // Fim do arraste (soltou ou cancelou): remove o destaque visual.
    row.addEventListener("dragend", function () {
      row.classList.remove("dragging");
    });

    // O navegador exige "preventDefault" aqui para permitir soltar o item.
    row.addEventListener("dragover", function (event) {
      event.preventDefault();
      row.classList.add("drag-over");
    });

    row.addEventListener("dragleave", function () {
      row.classList.remove("drag-over");
    });

    // Soltou a camada em cima desta linha: move no array para a nova posição.
    row.addEventListener("drop", function (event) {
      event.preventDefault();
      row.classList.remove("drag-over");

      var linhaArrastada = document.querySelector(".dragging");
      var fromIndex = Number(linhaArrastada.dataset.fromIndex);

      var camadaMovida = layers.splice(fromIndex, 1)[0];
      layers.splice(index, 0, camadaMovida);

      refreshLayersPanel();
      rebuildImageFromLayers();
    });
  }

  // ============================================================================================================
  // Efeitos
  // ============================================================================================================

  // Aplica um único filtro sobre uma imagem Jimp já aberta.
  // Esta função é o "motor" de todos os filtros: tanto a pré-visualização
  // quanto o resultado final passam por aqui.
  function applyFilterToJimp(jimpImage, layer) {

    // ----------------------------------------------------------------------------------------------------------
    // negativo
    // ----------------------------------------------------------------------------------------------------------

    if (layer.type === "negativo") {
      jimpImage.invert();
    }

    // ----------------------------------------------------------------------------------------------------------
    // limiarização
    // ----------------------------------------------------------------------------------------------------------

    else if (layer.type === "limiar") {
      var limite = layer.value;

      // "scan" percorre cada pixel da imagem. Para cada um, calculamos a
      // média dos canais vermelho, verde e azul e comparamos com o limite:
      // se for maior ou igual, o pixel vira branco; senão, vira preto.
      jimpImage.scan(0, 0, jimpImage.bitmap.width, jimpImage.bitmap.height, function (x, y, idx) {
        var vermelho = this.bitmap.data[idx];
        var verde    = this.bitmap.data[idx + 1];
        var azul     = this.bitmap.data[idx + 2];
        var media    = (vermelho + verde + azul) / 3;

        var saida = media >= limite ? 255 : 0;

        this.bitmap.data[idx]     = saida;
        this.bitmap.data[idx + 1] = saida;
        this.bitmap.data[idx + 2] = saida;
      });
    }

    return jimpImage;
  }

  // Recalcula a imagem exibida na tela, partindo sempre da imagem original
  // e aplicando, em ordem, cada camada da lista "layers".
  function rebuildImageFromLayers() {
    var working = originalJimp.clone();

    layers.forEach(function (layer) {
      applyFilterToJimp(working, layer);
    });

    working.getBase64(Jimp.MIME_PNG, function (err, base64) {
      if (err) return;
      mainImage.src = base64;
    });
  }

  // ============================================================================================================
  // Abrir e salvar arquivos
  // ============================================================================================================

  // ----------------------------------------------------------------------------------------------------------
  // abrir imagem
  // ----------------------------------------------------------------------------------------------------------

  fileInput.addEventListener("change", function (event) {
    var file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem.");
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      Jimp.read(reader.result).then(function (jimpImage) {
        originalJimp = jimpImage;
        layers = [];

        refreshLayersPanel();
        setControlsEnabled(true);

        emptyState.style.display = "none";
        stage.style.display = "block";

        rebuildImageFromLayers();
      }).catch(function () {
        alert("Não foi possível abrir esta imagem.");
      });
    };
    reader.readAsArrayBuffer(file);
  });

  // ----------------------------------------------------------------------------------------------------------
  // salvar imagem
  // ----------------------------------------------------------------------------------------------------------

  saveBtn.addEventListener("click", function () {
    var working = originalJimp.clone();

    layers.forEach(function (layer) {
      applyFilterToJimp(working, layer);
    });

    working.getBase64(Jimp.MIME_PNG, function (err, base64) {
      if (err) return;

      var link = document.createElement("a");
      link.href = base64;
      link.download = "imagem-editada.png";
      link.click();
    });
  });

  // ============================================================================================================
  // Janela flutuante de pré-visualização de filtro
  // ============================================================================================================

  // Move a janela para que fique centralizada na posição (x, y) do mouse.
  function posicionarNoCursor(win, x, y) {
    var largura = win.offsetWidth;
    win.style.left = (x - largura / 2) + "px";
    win.style.top = y + "px";
  }

  // Torna uma janela arrastável: ao pressionar o mouse no cabeçalho, a
  // janela salta para a posição do cursor e passa a segui-lo até soltar.
  function tornarArrastavel(win, head) {
    head.addEventListener("mousedown", function (event) {

      // Clicar no botão de fechar não deve mover a janela.
      if (event.target.closest(".fw-close")) return;

      event.preventDefault();
      posicionarNoCursor(win, event.clientX, event.clientY);

      function onMove(moveEvent) {
        posicionarNoCursor(win, moveEvent.clientX, moveEvent.clientY);
      }

      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  // Cria a estrutura HTML de uma janela de filtro vazia (cabeçalho + corpo)
  // e já liga o arrastar e o botão de fechar. Os controles específicos de
  // cada filtro são preenchidos depois, fora desta função.
  function criarJanelaFiltro(titulo) {
    var win = document.createElement("div");
    win.className = "filter-window";
    win.style.left = "50%";
    win.style.top = "120px";

    win.innerHTML =
      '<div class="fw-head">' +
        '<span>' + titulo + '</span>' +
        '<button class="fw-close">×</button>' +
      '</div>' +
      '<div class="fw-body">' +
        '<div class="fw-preview"><span class="loading">Gerando pré-visualização…</span></div>' +
        '<div class="fw-controls"></div>' +
        '<button class="fw-apply">Aplicar</button>' +
      '</div>';

    document.body.appendChild(win);

    var head = win.querySelector(".fw-head");
    tornarArrastavel(win, head);

    win.querySelector(".fw-close").addEventListener("click", function () {
      win.remove();
    });

    return win;
  }

  // Gera a imagem de pré-visualização (a partir de um Jimp já filtrado) e
  // a exibe dentro da janela de filtro.
  function mostrarPreview(win, jimpImage) {
    jimpImage.getBase64(Jimp.MIME_PNG, function (err, base64) {
      if (err) return;

      var preview = win.querySelector(".fw-preview");
      preview.innerHTML = "";

      var img = document.createElement("img");
      img.src = base64;
      preview.appendChild(img);
    });
  }

  // ============================================================================================================
  // Botões de filtro
  // ============================================================================================================

  // ----------------------------------------------------------------------------------------------------------
  // negativo
  // ----------------------------------------------------------------------------------------------------------

  btnNegativo.addEventListener("click", function () {
    var win = criarJanelaFiltro("Negativo");

    // Monta a pré-visualização: pega a imagem já com as camadas atuais e
    // acrescenta o negativo por cima, só para exibição.
    var preview = originalJimp.clone();
    layers.forEach(function (layer) {
      applyFilterToJimp(preview, layer);
    });
    applyFilterToJimp(preview, { type: "negativo" });
    mostrarPreview(win, preview);

    // Só quando o usuário clicar em "Aplicar" a camada entra de fato na lista.
    win.querySelector(".fw-apply").addEventListener("click", function () {
      layers.push({ label: "Negativo", type: "negativo" });
      refreshLayersPanel();
      rebuildImageFromLayers();
      win.remove();
    });
  });

  // ----------------------------------------------------------------------------------------------------------
  // limiarização
  // ----------------------------------------------------------------------------------------------------------

  btnLimiar.addEventListener("click", function () {
    var win = criarJanelaFiltro("Limiarização");
    var controls = win.querySelector(".fw-controls");

    // Controle deslizante (0 a 255) para escolher o limite de corte.
    controls.innerHTML =
      '<div class="fw-control">' +
        '<label>Limite <span class="fw-value">128</span></label>' +
        '<input type="range" min="0" max="255" value="128">' +
      '</div>';

    var range = controls.querySelector("input");
    var valueLabel = controls.querySelector(".fw-value");

    // Recalcula a pré-visualização toda vez que o usuário move o controle.
    function atualizarPreview() {
      var limite = Number(range.value);
      valueLabel.textContent = limite;

      var preview = originalJimp.clone();
      layers.forEach(function (layer) {
        applyFilterToJimp(preview, layer);
      });
      applyFilterToJimp(preview, { type: "limiar", value: limite });
      mostrarPreview(win, preview);
    }

    range.addEventListener("input", atualizarPreview);
    atualizarPreview();

    // Só quando o usuário clicar em "Aplicar" a camada entra de fato na lista.
    win.querySelector(".fw-apply").addEventListener("click", function () {
      var limite = Number(range.value);
      layers.push({ label: "Limiarização (" + limite + ")", type: "limiar", value: limite });
      refreshLayersPanel();
      rebuildImageFromLayers();
      win.remove();
    });
  });

})();
