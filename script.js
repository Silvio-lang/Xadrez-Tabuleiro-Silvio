// Script.js completo para o jogo Xadrez (usando versão lite do Stockfish)
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

function atualizarInfo(texto) {
  const info = document.getElementById("info");
  info.innerText = texto + (avaliacaoEmoji ? ` | Avaliação: ${avaliacaoEmoji}` : "");
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

function avaliarJogadaAtual() {
  const fen = jogo.fen();
  stockfish.postMessage("position fen " + fen);
  stockfish.postMessage("eval");
  stockfish.onmessage = function (e) {
    if (e.data.includes("score cp")) {
      const partes = e.data.split("score cp ");
      if (partes[1]) {
        const valor = parseInt(partes[1]);
        mostrarEmojiAvaliacao(valor);
      }
    } else if (e.data.includes("score mate")) {
      mostrarEmojiAvaliacao(1000);
    }
  };
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
        casa.style.color = peca.color === 'w' ? "white" : "black";
        if (peca.color === corUsuario && jogo.turn() === corUsuario) {
          casa.classList.add("clicavel");
        }
      }
      if (ultimaCasaIA === posicao) {
        const marcador = document.createElement("div");
        marcador.className = "indicador-mov";
        casa.appendChild(marcador);
      }
      if (origemCasaIA === posicao) {
        const marcadorBranco = document.createElement("div");
        marcadorBranco.className = "indicador-origem";
        casa.appendChild(marcadorBranco);
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

function iniciarPartida() {
  corUsuario = document.getElementById("cor").value;
  jogo = new Chess();
  stockfish = new Worker("stockfish-16.1-lite.js");
  historicoJogadas = [jogo.fen()];
  indiceAtual = 1;
  criarTabuleiro();
  if (corUsuario === 'b') setTimeout(() => jogadaIA(), 500);
}

function jogadaIA() {
  stockfish.postMessage("uci");
  stockfish.postMessage("ucinewgame");
  stockfish.postMessage("isready");
  stockfish.postMessage("position fen " + jogo.fen());
  stockfish.postMessage("go depth " + document.getElementById("profundidade").value);
  stockfish.onmessage = function (e) {
    if (e.data.startsWith("bestmove")) {
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

function desfazerJogada() {
  const jogadaDesfeita = jogo.undo();
  if (jogadaDesfeita) {
    origemCasaIA = null;
    ultimaCasaIA = null;
    historicoJogadas.pop();
    indiceAtual = historicoJogadas.length;
    criarTabuleiro();
    avaliarJogadaAtual();
  } else alert("Nenhuma jogada para desfazer.");
}

function reconstruirPosicao(fen) {
  jogo = new Chess();
  jogo.load(fen);
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
  stockfish = new Worker("stockfish-16.1-lite.js");
  criarTabuleiro();
}
