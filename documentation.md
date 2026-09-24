Todos os efeitos seguem o mesmo formato: uma função recebe o objeto `jimpImg` (imagem Jimp) e o objeto `layer` (dados da camada), percorre os pixels com `jimpImg.scan(...)` e escreve os novos valores diretamente em `this.bitmap.data`, que é um array plano onde cada pixel ocupa 4 posições consecutivas (`idx+0` = R, `idx+1` = G, `idx+2` = B, `idx+3` = A).

---

## Negativo — `applyInversion(jimpImg)`

Para cada pixel, inverte os canais R, G e B calculando `255 - valor`. O canal alfa não é tocado.

```
R' = 255 - R
G' = 255 - G
B' = 255 - B
```

---

## Limiarização — `applyThreshold(jimpImg, layer)`

Usa `layer.value` como limiar (`limit`). Para cada pixel, calcula a média simples dos três canais (`mean = (R+G+B)/3`) e substitui os três canais por 255 se a média for maior ou igual ao limiar, ou por 0 caso contrário. O resultado é sempre um pixel puramente preto ou branco.

```
mean = (R + G + B) / 3
saída = mean >= limit ? 255 : 0
R' = G' = B' = saída
```

---

## Brilho — `changeBrightness(jimpImg, layer)`

Usa `layer.value` como quantidade (`amount`, pode ser negativa). Soma esse valor a cada canal e recorta (`clamp`) o resultado entre 0 e 255 para evitar estouro.

```
R' = clamp(R + amount, 0, 255)
G' = clamp(G + amount, 0, 255)
B' = clamp(B + amount, 0, 255)
```

---

## Correção de gama — `gamaCorrection(jimpImg, layer)`

Usa `layer.value` como o valor de gama. Antes de varrer os pixels, monta uma **LUT (lookup table)** de 256 posições: cada índice `i` (0–255) é normalizado para o intervalo [0,1], elevado ao expoente `1/gamma` e desnormalizado de volta para [0,255].

```
invGamma = 1 / gamma
para i de 0 a 255:
    normalized = i / 255
    corrected  = normalized ^ invGamma
    lut[i] = round(corrected * 255)
```

Depois, a varredura só faz a leitura da LUT para cada canal: `R' = lut[R]`, `G' = lut[G]`, `B' = lut[B]`.

---

## Função linear por partes — `applyPiecewiseLinear(jimpImg, layer)`

A camada guarda três listas de pontos de controle `{x, y}`, uma por canal: `layer.pointsR`, `layer.pointsG`, `layer.pointsB`. Cada ponto representa um valor de entrada (`x`, 0–255) mapeado para um valor de saída (`y`, 0–255).

A função auxiliar `buildPiecewiseLut(points)` constrói uma LUT de 256 posições a partir desses pontos:

1. Ordena os pontos por `x`.
2. Para cada índice `i` de 0 a 255, encontra o segmento `[start, end]` (dois pontos consecutivos) cujo intervalo de `x` contém `i`. Se `i` estiver fora de todos os segmentos, usa o primeiro ou o último ponto como extremidade.
3. Se `start.x === end.x` (segmento degenerado), usa `start.y` diretamente.
4. Caso contrário, interpola linearmente:

```
t = (i - start.x) / (end.x - start.x)
lut[i] = round(start.y + t * (end.y - start.y))
```

`applyPiecewiseLinear` constrói uma LUT para cada canal (`lutR`, `lutG`, `lutB`) chamando `buildPiecewiseLut` três vezes, e aplica cada uma ao seu respectivo canal na varredura — os três canais são independentes entre si.

---

## Equalização de histograma — `applyHistogramEqualization(jimpImg, layer)`

Depende de duas funções auxiliares:

### `computeHistograms(jimpImg)`
Varre a imagem e conta, em quatro arrays de 256 posições (`r`, `g`, `b`, `luminance`), quantos pixels têm cada nível de intensidade em cada canal. A luminância de cada pixel é `round((R+G+B)/3)`.

### `buildEqualizationLut(histogram, totalPixels)`
Constrói a LUT de equalização a partir de um histograma, usando a função de distribuição acumulada (CDF):

1. Acumula o histograma em `cdf[i] = soma de histogram[0..i]`.
2. Encontra `cdfMin`, o menor valor de `cdf` que seja maior que zero (o valor acumulado no primeiro nível de intensidade presente na imagem).
3. Caso `cdfMin === totalPixels` (imagem com um único nível de tom, sem o que equalizar), a LUT vira identidade: `lut[i] = i`.
4. Caso contrário, normaliza cada posição da CDF para a faixa 0–255:

```
lut[i] = round( (cdf[i] - cdfMin) / (totalPixels - cdfMin) * 255 )
```

### Aplicação, de acordo com `layer.mode`

- **`"channels"`**: constrói uma LUT independente para cada canal (`lutR` a partir do histograma `r`, `lutG` a partir de `g`, `lutB` a partir de `b`) e aplica cada uma ao seu canal: `R' = lutR[R]`, `G' = lutG[G]`, `B' = lutB[B]`.

- **`"luminance"`** (padrão): constrói uma única LUT a partir do histograma de luminância. Para cada pixel, calcula o nível de luminância (`level = round((R+G+B)/3)`), busca o valor equalizado (`equalized = lutLuminance[level]`) e obtém a diferença `delta = equalized - level`. Esse mesmo `delta` é somado aos três canais do pixel (com `clamp` entre 0 e 255), preservando a proporção de cor original em vez de equalizar cada canal separadamente.

```
level = round((R + G + B) / 3)
equalized = lutLuminance[level]
delta = equalized - level
R' = clamp(R + delta, 0, 255)
G' = clamp(G + delta, 0, 255)
B' = clamp(B + delta, 0, 255)
```

### Exibição do histograma — `drawHistogramBars(canvasEl, histogram, color)`

Não altera a imagem; apenas desenha. Encontra a maior contagem do histograma (`maxCount`) e desenha 256 barras num canvas 2D, cada uma com altura proporcional à contagem daquele nível em relação a `maxCount`:

```
barHeight = (histogram[i] / maxCount) * alturaDoCanvas
```

---

## Esteganografia — `hideMessage(jimpImg, layer)` e `revealMessage(jimpImg)`

Técnica de LSB (bit menos significativo) aplicada apenas ao canal azul.

### Ocultar — `textToBits(text)` + `hideMessage`

1. `textToBits` codifica o texto em UTF-8 (`TextEncoder`), converte cada byte em 8 bits (do mais significativo ao menos significativo) e acrescenta ao final um terminador de **16 bits zero**, que sinaliza o fim da mensagem.
2. `hideMessage` verifica se a quantidade de bits cabe na imagem (um bit por pixel); se não couber, lança um erro.
3. Varre a imagem pixel a pixel, e para cada bit da mensagem substitui o bit menos significativo do canal azul:

```
blue' = (blue & 0xFE) | bit
```

`0xFE` (`11111110` em binário) zera o último bit do valor original antes de o combinar com o bit da mensagem via OR.

### Revelar — `revealMessage`

1. Varre a imagem lendo o bit menos significativo do canal azul de cada pixel (`bit = blue & 1`), acumulando-os em uma lista.
2. Conta bits zero consecutivos (`zeroStreak`); ao atingir 16 zeros seguidos, considera esse o terminador e para de ler.
3. Remove os 16 bits do terminador da lista.
4. Agrupa os bits restantes em bytes (8 bits cada, do mais significativo ao menos significativo) e decodifica o resultado como texto UTF-8 (`TextDecoder`).
