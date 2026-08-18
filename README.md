# Image-Processing
A project required for the university's Image Processing course. WIP

# [Nome do Projeto]

## 📌 Sobre o Projeto
**[Nome do Projeto]** é uma aplicação desenvolvida como método de avaliação para a disciplina de **Processamento de Imagens**. O objetivo principal deste aplicativo é aplicar, na prática, conceitos teóricos da área de processamento digital de imagens, oferecendo uma suíte de transformações e manipulações.

O projeto está sendo construído em **JavaScript**, utilizando o módulo **[Jimp](https://www.npmjs.com/package/jimp)** (JavaScript Image Manipulation Program) para a leitura, manipulação e salvamento das imagens.

---

## 🚀 Funcionalidades

Atualmente, o projeto tem como objetivo contemplar as implementações exigidas para o **Trabalho 1**, que englobam operações pontuais e técnicas de ocultação de dados:

- ✅ **Limiarização (Thresholding):** Binarização da imagem com base em um valor de limiar (threshold) definido, separando o plano de fundo dos objetos de interesse.
- ✅ **Negativo:** Inversão dos níveis de intensidade (ou cores) dos pixels da imagem.
- ✅ **Brilho:** Adição ou subtração de valores constantes aos pixels para clarear ou escurecer a imagem.
- ✅ **Potência (Correção de Gama):** Transformação não-linear que permite ajustar o contraste da imagem, mapeando os pixels a partir de uma curva de potência.
- ✅ **Linear Definida por Partes:** Transformações segmentadas (como o alargamento de contraste) que aplicam diferentes funções lineares em intervalos distintos de intensidade.
- ✅ **Esteganografia:** Técnica de ocultação de informações (textos ou outras imagens) nos bits menos significativos (LSB) dos pixels da imagem original.

---

## 🛠️ Tecnologias Utilizadas

- **[Node.js](https://nodejs.org/)**: Ambiente de execução JavaScript.
- **[JavaScript](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)**: Linguagem principal da aplicação.
- **[Jimp](https://www.npmjs.com/package/jimp)**: Biblioteca para o processamento nativo das imagens.

---

## ⚙️ Como Executar o Projeto

### Pré-requisitos
Antes de começar, você precisará ter o [Node.js](https://nodejs.org/) instalado em sua máquina.

### Instalação
1. Clone este repositório:
   ```bash
   git clone https://github.com/ab-caio/nome-do-repositorio.git
