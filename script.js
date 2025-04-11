let jogo = new Chess();
let historicoJogadas = [];
let indiceAtual = 0;
let corUsuario;
let casaSelecionada = null;
let stockfish;
let avaliacaoEmoji = null;
let timeoutAvaliacao = null;
let ultimaCasaIA = null;
let origemCasaIA = null;
let sugestoesIA = [];

function atualizarInfo(texto) {
  const info = document.getElementById("info");
  const jogadasUsuario = Math.floor((indiceAtual - 1) / 2);
  info.innerText = `${texto} | Jogadas: ${jogadasUsuario}` + (avaliacaoEmoji ? ` | Avaliação: ${avaliacaoEmoji}` : "");
  mostrarSugestoes();
}

function mostrarSugestoes() {
  const area = document.getElementById("sugestoes-linha");
  if (!area) return;
  area.innerHTML = "";
  sugestoesIA.slice(0, 3).forEach(jogada => {
    const span = document.createElement("span");
    span.textContent = jogada;
    area.appendChild(span);
  });
}

function sugerirJogadas() {
  sugestoesIA = [];
  const fen = jogo.fen();
  stockfish.postMessage("position fen " + fen);
  stockfish.postMessage("setoption name MultiPV value 3");
  stockfish.postMessage("go depth 12");

  let recebidas = 0;
  stockfish.onmessage = function (e) {
    if (e.data.startsWith("info") && e.data.includes(" pv ")) {
      const match = e.data.match(/ pv ([a-h][1-8][a-h][1-8])/);
      if (match && match[1] && !sugestoesIA.includes(match[1])) {
        sugestoesIA.push(match[1]);
        recebidas++;
      }
    } else if (e.data.startsWith("bestmove") || recebidas >= 3) {
      atualizarInfo(`Cor do usuário: ${corUsuario} | Turno atual: ${jogo.turn()}`);
    }
  };
}

function avaliarJogadaAtual() {
  const fen = jogo.fen();
  stockfish.postMessage("position fen " + fen);
  stockfish.postMessage("go depth 8");
  stockfish.onmessage = function (e) {
    if (e.data.includes("score cp")) {
      const partes = e.data.split("score cp ");
      if (partes[1]) {
        const valor = parseInt(partes[1].split(" ")[0]);
        mostrarEmojiAvaliacao(valor);
      }
    } else if (e.data.includes("score mate")) {
      const partes = e.data.split("score mate ");
      const valor = parseInt(partes[1].split(" ")[0]) > 0 ? 1000 : -1000;
      mostrarEmojiAvaliacao(valor);
    }
  };
}

function jogadaIA() {
  sugestoesIA = [];
  atualizarInfo(`Cor do usuário: ${corUsuario} | Turno atual: ${jogo.turn()}`);
  stockfish.postMessage("uci");
  stockfish.postMessage("ucinewgame");
  stockfish.postMessage("isready");
  stockfish.onmessage = function (e) {
    if (e.data === "readyok") {
      stockfish.postMessage("position fen " + jogo.fen());
      stockfish.postMessage("go depth " + document.getElementById("profundidade").value);
    } else if (e.data.startsWith("bestmove")) {
      const [_, movimento] = e.data.split(" ");
      const from = movimento.slice(0, 2);
      const to = movimento.slice(2, 4);
      origemCasaIA = from;
      ultimaCasaIA = to;
      jogo.move({ from, to, promotion: 'q' });
      historicoJogadas.push(jogo.fen());
      indiceAtual = historicoJogadas.length;
      criarTabuleiro();
      avaliarJogadaAtual();
      if (jogo.in_checkmate()) alert("Xeque-mate!");
      else if (jogo.in_draw()) alert("Empate!");
    }
  };
}

function iniciarPartida() {
  corUsuario = document.getElementById("cor").value;
  jogo = new Chess();
  if (stockfish) stockfish.terminate();
  stockfish = new Worker("stockfish-16.1-lite-single.js");
  stockfish.onerror = function (e) {
    console.error("Erro no Stockfish:", e);
    alert("Erro ao carregar o Stockfish. Verifique os arquivos .js e .wasm.");
  };
  historicoJogadas = [jogo.fen()];
  indiceAtual = 1;
  sugestoesIA = [];
  criarTabuleiro();
  if (corUsuario === 'b') setTimeout(() => jogadaIA(), 500);
}

function criarTabuleiro() {
  mostrarCapturas();
  const tabuleiro = document.getElementById("tabuleiro");
  tabuleiro.innerHTML = "";
  const posicoes = jogo.board();
  atualizarInfo(`Cor do usuário: ${corUsuario} | Turno atual: ${jogo.turn()}`);
  for (let i = 0; i < 8; i++) {
    const linhaVisual = 7 - i;
    const linhaReal = i;
    for (let j = 0; j < 8; j++) {
      const coluna = j;
      const posicao = `${String.fromCharCode(97 + coluna)}${linhaVisual + 1}`;
      const casa = document.createElement("div");
      casa.className = "casa " + ((linhaVisual + coluna) % 2 === 0 ? "branca" : "preta");
      const peca = posicoes[linhaReal][coluna];
      if (peca) {
        const letras = { p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" };
        casa.textContent = peca.color === 'w' ? letras[peca.type] : letras[peca.type].toLowerCase();
        casa.dataset.peca = peca.color === 'w' ? "branca" : "preta";
        if (peca.color === corUsuario && jogo.turn() === corUsuario) {
          casa.classList.add("clicavel");
        }
      }
      if (ultimaCasaIA === posicao || origemCasaIA === posicao) {
        const marcador = document.createElement("div");
        marcador.className = "indicador-mov";
        marcador.style.background = origemCasaIA === posicao ? "white" : "black";
        marcador.style.top = "4px";
        marcador.style.right = "4px";
        marcador.style.width = "10px";
        marcador.style.height = "10px";
        marcador.style.position = "absolute";
        marcador.style.borderRadius = "50%";
        casa.appendChild(marcador);
      }
      casa.dataset.posicao = posicao;
      casa.addEventListener("click", () => clicarCasa(posicao));
      tabuleiro.appendChild(casa);
    }
  }
}

function clicarCasa(posicao) {
  const peca = jogo.get(posicao);
  if (!casaSelecionada) {
    if (peca && peca.color === corUsuario && jogo.turn() === corUsuario) {
      casaSelecionada = posicao;
      document.querySelector(`[data-posicao="${posicao}"]`).classList.add("selecionada");
    }
  } else {
    const destino = posicao;
    const jogada = jogo.move({ from: casaSelecionada, to: destino, promotion: 'q' });
    document.querySelector(`[data-posicao="${casaSelecionada}"]`).classList.remove("selecionada");
    casaSelecionada = null;
    if (jogada) {
      origemCasaIA = null;
      ultimaCasaIA = null;
      sugestoesIA = [];
      historicoJogadas = historicoJogadas.slice(0, indiceAtual);
      historicoJogadas.push(jogo.fen());
      indiceAtual = historicoJogadas.length;
      criarTabuleiro();
      avaliarJogadaAtual();
      if (jogo.in_checkmate()) alert("Xeque-mate!");
      else if (jogo.in_draw()) alert("Empate!");
      else if (!jogo.game_over()) setTimeout(() => jogadaIA(), 500);
    } else {
      alert("Jogada inválida! Tente novamente.");
    }
  }
}

function mostrarEmojiAvaliacao(score) {
  if (timeoutAvaliacao) clearTimeout(timeoutAvaliacao);
  if (score !== null) {
    if (score >= 40) avaliacaoEmoji = '👍';
    else if (score <= -40) avaliacaoEmoji = '👎';
    else avaliacaoEmoji = '🤔';
    atualizarInfo(`Cor do usuário: ${corUsuario} | Turno atual: ${jogo.turn()}`);
    timeoutAvaliacao = setTimeout(() => {
      avaliacaoEmoji = null;
      atualizarInfo(`Cor do usuário: ${corUsuario} | Turno atual: ${jogo.turn()}`);
    }, 2000);
  }
}

function mostrarCapturas() {
  const capturadasBrancas = [];
  const capturadasPretas = [];
  const historico = jogo.history({ verbose: true });

  historico.forEach(mov => {
    if (mov.captured) {
      const simbolo = mov.captured;
      if (mov.color === 'w') capturadasPretas.push(simbolo);
      else capturadasBrancas.push(simbolo);
    }
  });

  const mapa = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛' };
  const convert = arr => arr.map(p => mapa[p] || p).join(' ');

  let area = document.getElementById("capturas");
  if (!area) {
    area = document.createElement("div");
    area.id = "capturas";
    area.style.marginTop = "10px";
    area.style.fontSize = "1.2rem";
    document.body.insertBefore(area, document.getElementById("info"));
  }

  area.innerHTML = `Peças capturadas:<br> Brancas: ${convert(capturadasBrancas)}<br> Pretas: ${convert(capturadasPretas)}`;
}

function reconstruirPosicao(fen) {
  jogo = new Chess();
  jogo.load(fen);
  origemCasaIA = null;
  ultimaCasaIA = null;
  sugestoesIA = [];
  criarTabuleiro();
  avaliarJogadaAtual();
}

function voltarJogada() {
  if (indiceAtual > 1) {
    indiceAtual--;
    reconstruirPosicao(historicoJogadas[indiceAtual - 1]);
  }
}

function avancarJogada() {
  if (indiceAtual < historicoJogadas.length) {
    indiceAtual++;
    reconstruirPosicao(historicoJogadas[indiceAtual - 1]);
  }
}

function continuarAPartirDaqui() {
  historicoJogadas = historicoJogadas.slice(0, indiceAtual);
  stockfish.postMessage("ucinewgame");
  criarTabuleiro();
}