/* ui.js */
// Handles all user interface interactions and updates the DOM.

// Import necessary functions from game-state.js and stockfish-manager.js
import { getJogoInstance, moverPeca, getGameState, voltarJogada as goBackMove, avancarJogada as goForwardMove, continuarAPartirDaqui as resumeGame, getCapturedPieces, fazerJogadaIA, iniciarNovoJogo } from './game-state.js';
import {
    sugerirJogadas,
    getCurrentScore,
    getAvaliacaoEmoji,
    setAvaliacaoTimeout,
    clearAvaliacaoTimeout,
    getLevelName,
    getSugestoesIA,
    getCurrentLevel,
    setCurrentLevel 
} from './stockfish-manager.js';
// Importação crítica para o funcionamento da lista de treinos
import { atualizarListaProblemas, salvarPosicaoAtual, carregarProblema } from './pos_salvas.js'; 

// DOM elements 
let mainTitleEl = null; 
let tabuleiroEl = null; 
let infoEl = null; 
let estadoJogoEl = null; 
let avaliacaoEl = null; 
let sugestoesEl = null; 
let sugestoesLinhaEl = null; 
let xequeLabel = null; 
let tempMessageAreaEl = null; 
let manualEl = null; 
let gerenciarTreinosEl = null; 
let capturasEl = null; 
let topControlsContainerEl = null; 
let boardContainerEl = null; 
let btnConfirmarEl = null; 

// Variable to store the currently selected square for making a move (UI state)
let casaSelecionada = null;

// Variável de controle para pausar a interface enquanto aguarda confirmação
let aguardandoConfirmacao = false;

// --- VARIÁVEIS DE PERFORMANCE (Arremesso de Peso) ---
let performanceBrancas = 0; // Total acumulado Brancas (em centi-peões)
let performancePretas = 0;  // Total acumulado Pretas (em centi-peões)
let notaUltimaBrancas = 0;  // Nota definitiva da última jogada
let notaUltimaPretas = 0;   // Nota definitiva da última jogada

let scoreEstavelAnterior = 30; // O "ponto de queda" do arremesso anterior (Base). Começa com ~0.3 (vantagem branca inicial padrão)
let timerEstabilizacao = null; // O cronômetro para o Debounce
let ultimoScoreRecebido = null; // Armazena o valor bruto mais recente

// Constante para o tempo de espera (em milissegundos)
const TEMPO_ESTABILIZACAO = 2500; 


/**
 * Initializes UI elements by getting references from the DOM.
 */
function initializeUIElements() {
    tabuleiroEl = document.getElementById("tabuleiro");
    estadoJogoEl = document.getElementById("estado-jogo");
    infoEl = document.getElementById("info");
    capturasEl = document.getElementById("capturas");
    tempMessageAreaEl = document.getElementById("temp-message-area");
    btnConfirmarEl = document.getElementById("btn-confirmar");

    // Validação focada exclusivamente no componente crítico do sistema
    if (!tabuleiroEl) {
        console.warn("Aviso: O elemento do tabuleiro não foi encontrado no HTML.");
    } 
}

/**
 * Creates or updates the visual representation of the chessboard in the DOM.
 */
function criarTabuleiro() {
    const tabuleiro = document.getElementById("tabuleiro");

    if (!tabuleiro) {
        console.error("Elemento #tabuleiro não encontrado para criar o tabuleiro.");
        return;
    }

    // 1. Apaga a imagem do cavalo
    tabuleiro.innerHTML = "";

    // 2. Remove o estilo temporário para o tabuleiro de xadrez assumir o tamanho padrão
    tabuleiro.removeAttribute("style");

    // 3. Obtém a instância do jogo
    const jogo = (typeof getJogoInstance === 'function') ? getJogoInstance() : null; 

    if (!jogo) {
        console.warn("Instância de jogo não disponível ao tentar criar tabuleiro.");
        return;
    }

    const gameState = getGameState(); 

    // Reset de variáveis se for um jogo novo
    if (gameState.historicoJogadas.length === 0) {
        performanceBrancas = 0;
        performancePretas = 0;
        notaUltimaBrancas = 0;
        notaUltimaPretas = 0;
        scoreEstavelAnterior = 30;
        if (timerEstabilizacao) clearTimeout(timerEstabilizacao);
    }

    tabuleiroEl.innerHTML = ''; 

    // ========================================================
    // BLOCO DE LIBERAÇÃO VISUAL E REMOÇÃO DO BOTÃO
    // ========================================================
    tabuleiroEl.classList.remove("bloqueado");

    if (btnConfirmarEl) {
        btnConfirmarEl.style.display = "none";
    }
    // ========================================================

    const perspective = gameState.corUsuario === 'w' ? 'white' : 'black';
    // ... segue o restante da sua função original normalmente ...
    const files = perspective === 'white' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
    const ranks = perspective === 'white' ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const posicao = files[j] + ranks[i]; 
            const casa = document.createElement("div"); 
            casa.className = `casa ${(i + j) % 2 === 0 ? 'branca' : 'preta'}`; 
            casa.dataset.posicao = posicao; 

            const peça = jogo.get(posicao); 
            if (peça) {
                casa.innerHTML = peçaUnicode(peça); 
                casa.dataset.pecaColor = peça.color;
                casa.dataset.pecaType = peça.type;
            }

            if (getCasaSelecionada() === posicao) {
                casa.classList.add("selecionada");
            }

            if (gameState.ultimaCasaIA === posicao) {
                const indicador = document.createElement("div");
                indicador.className = "indicador-mov"; 
                casa.appendChild(indicador);
            }

            if (gameState.origemCasaIA === posicao) {
                const indicador = document.createElement("div");
                indicador.className = "indicador-origem"; 
                casa.appendChild(indicador);
            }

            if (!aguardandoConfirmacao && !jogo.game_over() && (gameState.modoJogo === "humano-humano" || (gameState.modoJogo === "humano-ia" && jogo.turn() === gameState.corUsuario))) {
                const peçaAtual = jogo.get(posicao);
                
                if (peçaAtual && peçaAtual.color === jogo.turn()) {
                    casa.classList.add("clicavel");
                    casa.onclick = () => handleSquareClick(posicao); 
                }

                const movimentosPossiveis = getCasaSelecionada() ? jogo.moves({ square: getCasaSelecionada(), verbose: true }) : [];
                const movimentoParaCasa = movimentosPossiveis.find(m => m.to === posicao);
                if (movimentoParaCasa) {
                    casa.classList.add("clicavel"); 
                    const indicador = document.createElement("div");
                    indicador.className = "indicador-mov"; 
                    casa.appendChild(indicador);
                    casa.onclick = () => handleSquareClick(posicao); 
                }
            }

            tabuleiroEl.appendChild(casa); 
        }
    }
    updateCapturesDisplay(); 
}

/**
 * Handles a click event on a square of the chessboard.
 */
function handleSquareClick(posicao) {
    if (aguardandoConfirmacao) return;

    const jogo = getJogoInstance(); 
    const casaSelecionada = getCasaSelecionada(); 
    const gameState = getGameState();

    if (casaSelecionada === null) {
        const peça = jogo.get(posicao);
        if (peça && peça.color === jogo.turn()) {
            setCasaSelecionada(posicao); 
        }
    } else {
        const movimentosPossiveis = jogo.moves({ square: casaSelecionada, verbose: true });
        const movimentoParaCasa = movimentosPossiveis.find(m => m.to === posicao);

        if (movimentoParaCasa) {
            moverPeca(casaSelecionada, posicao, movimentoParaCasa.promotion); 
            setCasaSelecionada(null); 
            
            // Dispara a IA automaticamente sem travar a tela nem pedir o botão
            if (gameState.modoJogo === "humano-ia" && jogo.turn() !== gameState.corUsuario && !jogo.game_over()) {
                if (typeof fazerJogadaIA === 'function') {
                    fazerJogadaIA();
                }
            }

        } else {
            const peça = jogo.get(posicao);
            if (peça && peça.color === jogo.turn()) {
                setCasaSelecionada(posicao); 
            } else {
                setCasaSelecionada(null); 
            }
        }
    }
    criarTabuleiro();
}

/**
 * Pausa o fluxo do jogo e exibe o botão de confirmação.
 */
function pausarParaConfirmacao() {
    aguardandoConfirmacao = false; 
    criarTabuleiro(); 
}

/**
 * Executa a ação de confirmar a jogada.
 */
function processarConfirmacao() {
    if (!aguardandoConfirmacao) return;
    
    let iaChamada = false;
    try {
        if (typeof fazerJogadaIA === 'function') {
            fazerJogadaIA(); 
            iaChamada = true;
        } else {
            console.error("Função fazerJogadaIA não encontrada ou não importada corretamente.");
            mostrarMensagemTemporaria("Erro: IA não respondeu.", 3000);
        }
    } catch (e) {
        console.error("Erro ao chamar fazerJogadaIA:", e);
        mostrarMensagemTemporaria("Erro interno ao processar jogada da IA.", 3000);
    }

    aguardandoConfirmacao = false; 
    criarTabuleiro();
}


/**
 * Gets the currently selected square.
 */
function getCasaSelecionada() {
    return casaSelecionada;
}

/**
 * Sets the currently selected square.
 */
function setCasaSelecionada(posicao) {
    casaSelecionada = posicao;
}


/**
 * Retorna o elemento de imagem para a peça do jogo (mantido para compatibilidade).
 */
/**
 * Retorna o caractere Unicode para o objeto da peça de xadrez.
 */
function peçaUnicode(peça) {
    if (!peça) return '';

    const unicodePeças = {
        'p': { 'w': '♙', 'b': '♟' },
        'r': { 'w': '♖', 'b': '♜' },
        'n': { 'w': '♘', 'b': '♞' },
        'b': { 'w': '♗', 'b': '♝' },
        'q': { 'w': '♕', 'b': '♛' },
        'k': { 'w': '♔', 'b': '♚' }
    };

    return unicodePeças[peça.type][peça.color];
}
/**
 * Updates the display of captured pieces.
 * USA SOMENTE O MÉTODO DE DIFERENÇA MATERIAL para garantir precisão.
 */
function updateCapturesDisplay() {
    if (!capturasEl) return;

    const jogo = getJogoInstance();
    const captured = { w: {}, b: {} }; 
    const board = jogo.board();
    const currentCounts = { w: { p:0, n:0, b:0, r:0, q:0 }, b: { p:0, n:0, b:0, r:0, q:0 } };
    
    board.forEach(row => {
        row.forEach(piece => {
            if (piece && piece.type !== 'k') { 
                currentCounts[piece.color][piece.type]++;
            }
        });
    });

    const startCounts = { p:8, n:2, b:2, r:2, q:1 };

    ['p', 'n', 'b', 'r', 'q'].forEach(type => {
        let missingW = startCounts[type] - currentCounts.w[type];
        if (missingW > 0) captured.w[type] = missingW;

        let missingB = startCounts[type] - currentCounts.b[type];
        if (missingB > 0) captured.b[type] = missingB;
    });

    let whiteCapturesHTML = 'Brancas capturaram: ';
    const piecesCapturedByWhite = Object.keys(captured.b).sort(); 
    
    if (piecesCapturedByWhite.length > 0) {
        whiteCapturesHTML += piecesCapturedByWhite.map(pieceType => {
            const piece = { type: pieceType, color: 'b' }; 
            const count = captured.b[pieceType]; 
            return `${peçaUnicode(piece)} x${count}`; 
        }).join(', ');
    } else {
        whiteCapturesHTML += 'Nenhuma';
    }
    
    let blackCapturesHTML = 'Pretas capturaram: ';
    const piecesCapturedByBlack = Object.keys(captured.w).sort(); 
     if (piecesCapturedByBlack.length > 0) {
        blackCapturesHTML += piecesCapturedByBlack.map(pieceType => {
            const piece = { type: pieceType, color: 'w' }; 
            const count = captured.w[pieceType];
            return `${peçaUnicode(piece)} x${count}`;
        }).join(', ');
    } else {
        blackCapturesHTML += 'Nenhuma';
    }

    capturasEl.innerHTML = `${whiteCapturesHTML}<br>${blackCapturesHTML}`;
}


/**
 * Returns the display name for a given color ('w' for white, 'b' for black).
 */
function mostrarCor(letra) {
    return letra === 'w' ? 'Brancas' : 'Pretas';
}

/**
 * Displays a temporary message to the user in a designated area.
 */
function mostrarMensagemTemporaria(mensagem, duracao = 2000) {
    if (!tempMessageAreaEl) return;

    const tempSpan = document.createElement("span");
    tempSpan.innerHTML = `<strong style="color: red;">${mensagem}</strong>`;

    tempMessageAreaEl.innerHTML = '';
    tempMessageAreaEl.appendChild(tempSpan);

    setTimeout(() => {
        if (tempSpan && tempSpan.parentElement) {
            tempSpan.parentElement.removeChild(tempSpan);
        }
    }, duracao);
}

/**
 * Helper para formatar pontuação de centi-peões para peões (dividir por 100).
 * Ex: 35 -> +0.35, -120 -> -1.20
 */
function formatarParaPeoes(valorCentipeoes) {
    if (valorCentipeoes === null || valorCentipeoes === undefined) return "0.00";
    const valor = valorCentipeoes / 100;
    const sinal = valor > 0 ? '+' : ''; // Adiciona + para positivos; negativos já têm o sinal
    return `${sinal}${valor.toFixed(2)}`;
}

// ========================================================
// ATUALIZAÇÃO DA AVALIAÇÃO E PERFORMANCE
// ========================================================
function atualizarAvaliacao() {
    const gameState = getGameState();
    const jogo = getJogoInstance();

    const el = document.getElementById("avaliacao") || avaliacaoEl;
    if (!el) return;
    el.style.display = "";

    if (gameState.modoJogo !== "humano-ia") {
        el.innerHTML = "Nota do lance: -.";
        return;
    }

    const score = getCurrentScore();
    if (score === null || score === undefined) return;

    // Se o score retornado for idêntico ao anterior, ignora a atualização para não zerar o delta
    if (score === scoreEstavelAnterior && gameState.partidaIniciada) {
        renderizarPlacar(score, true);
        return;
    }

    // Identifica de quem foi o LANCE QUE GEROU essa nova avaliação:
    // Se agora é a vez das Pretas ('b'), as Brancas acabaram de jogar.
    // Se agora é a vez das Brancas ('w'), a IA (Pretas) acabou de jogar.
    const quemAcabouDeJogar = (jogo && jogo.turn() === 'b') ? 'w' : 'b';

    // Cancela o temporizador anterior para aplicar a nova medição
    if (timerEstabilizacao) clearTimeout(timerEstabilizacao);

    timerEstabilizacao = setTimeout(() => {
        const scoreDefinitivo = score;
        const delta = scoreDefinitivo - scoreEstavelAnterior;

        if (quemAcabouDeJogar === 'w') {
            notaUltimaBrancas = delta;
            performanceBrancas += delta;
        } else {
            // Para as pretas, ganho de posição significa queda no score das brancas
            const pontosPretas = delta * -1;
            notaUltimaPretas = pontosPretas;
            performancePretas += pontosPretas;
        }

        scoreEstavelAnterior = scoreDefinitivo;
        renderizarPlacar(scoreDefinitivo, true);

    }, TEMPO_ESTABILIZACAO);
}

function renderizarPlacar(currentScore, estavel) {
    const el = document.getElementById("avaliacao") || avaliacaoEl;
    if (!el) return;
    el.style.display = "";

    const jogo = getJogoInstance();
    const totalLances = jogo ? jogo.history().length : 0;
    const numeroJogadas = Math.floor(totalLances / 2);

    // 1. Traduz o número do Stockfish para linguagem humana
    let textoSituacao = "Jogo equilibrado";
    const peoes = Math.abs(currentScore / 100).toFixed(1);

    if (currentScore > 50) {
        textoSituacao = `Brancas estão melhores (+${peoes} peões)`;
    } else if (currentScore < -50) {
        textoSituacao = `Pretas estão melhores (+${peoes} peões)`;
    }

    // 2. Indicador de processamento da IA
    const estadoProcessamento = estavel ? "" : " ⏳ (analisando...)";

    // 3. Montagem de um painel limpo para o usuário
    el.innerHTML = `
        <div style="font-size: 1.05em; margin-bottom: 4px;">
            <strong>Situação:</strong> ${textoSituacao}${estadoProcessamento}
        </div>
        <div style="font-size: 0.9em; color: #555;">
            <strong>A jogar:</strong> ${(jogo && jogo.turn() === 'w') ? 'Sua vez (Brancas)' : 'Vez da IA (Pretas)'} | 
            <strong>Jogada nº:</strong> ${numeroJogadas}
        </div>
    `;
}

/**
 * Displays an emoji evaluation on the board near the human's last move based on the score.
 */
function mostrarEmojiAvaliacao(score) {
    const gameState = getGameState();

    if (gameState.modoJogo !== "humano-ia") return;

    document.querySelectorAll(".emoji-avaliacao").forEach(el => el.remove());
    clearAvaliacaoTimeout();

    if (score !== null && gameState.ultimaCasaHumano && gameState.indiceAtual === gameState.historicoJogadas.length) {
        let emoji;
        if (score >= 300) emoji = '🤩'; 
        else if (score >= 100) emoji = '👍'; 
        else if (score <= -300) emoji = '😭'; 
        else if (score <= -100) emoji = '👎'; 
        else if (score >= -50 && score <= 50) emoji = '🤔'; 
        else emoji = '😐'; 

        const casaAlvo = document.querySelector(`[data-posicao="${gameState.ultimaCasaHumano}"]`);
        let bolha = null;
        if (casaAlvo) {
            bolha = document.createElement("div");
            bolha.className = "emoji-avaliacao";
            bolha.innerText = emoji;
            bolha.style.position = "absolute";
            bolha.style.top = "50%";
            bolha.style.left = "50%";
            bolha.style.transform = "translate(-50%, -50%)";
            bolha.style.fontSize = "2rem";
            bolha.style.zIndex = "10";
            bolha.style.pointerEvents = "none";
            casaAlvo.appendChild(bolha);

            const timeoutId = setTimeout(() => {
                if (bolha && bolha.parentElement) {
                    bolha.parentElement.removeChild(bolha);
                }
            }, 3000);
            setAvaliacaoTimeout(timeoutId);
        }
    } else {
        document.querySelectorAll(".emoji-avaliacao").forEach(el => el.remove());
        clearAvaliacaoTimeout();
    }
}

/**
 * Checks if the current position is in check and displays a "XEQUE!" label if so.
 */
function verificarXeque() {
    if (!infoEl) return;

    const jogo = getJogoInstance();

    if (!jogo) {
        if (xequeLabel) {
            xequeLabel.remove();
            xequeLabel = null;
        }
        return;
    }

    if (xequeLabel) {
        xequeLabel.remove();
        xequeLabel = null;
    }

    if (jogo && jogo.in_check()) {
        xequeLabel = document.createElement("div");
        xequeLabel.id = "xeque-label";
        xequeLabel.innerText = "XEQUE!";
        xequeLabel.style.backgroundColor = "red";
        xequeLabel.style.color = "white";
        xequeLabel.style.padding = "5px 10px";
        xequeLabel.style.fontWeight = "bold";
        xequeLabel.style.borderRadius = "5px";
        xequeLabel.style.marginLeft = "10px";
        xequeLabel.style.display = "inline-block";

        const sugestoesContainer = document.querySelector("#sugestoes .sugestoes-container") || infoEl;
        if (sugestoesContainer) {
            sugestoesContainer.appendChild(xequeLabel);
        }
    }
}

/**
 * Returns to the main game screen from the manual or training screens.
 */
function voltarAoJogo() {
  // 1. Desliga todas as telas secundárias acionadas pela alternarTela()
  const telasSecundarias = [
    "manual", 
    "gerenciar-treinos", 
    "modal-editor-posicao", 
    "estudos", 
    "posicoes-salvas"
  ];
  
  telasSecundarias.forEach(id => {
    const tela = document.getElementById(id);
    if (tela) tela.style.display = "none";
  });

  // 2. Reativa todos os blocos do jogo ocultados pela alternarTela()
  const blocosJogo = [
    "painel-controles-topo", 
    "tabuleiro", 
    "estado-jogo", 
    "mouse-coord", 
    "capturas", 
    "sugestoes", 
    "sugestoes-linha", 
    "avaliacao", 
    "info", 
    "temp-message-area"
  ];

  blocosJogo.forEach(id => {
    const bloco = document.getElementById(id);
    if (bloco) bloco.style.display = ""; // Restaura a exibição padrão do CSS
  });

  // 3. Reajusta a geometria do tabuleiro
  if (window.board && typeof window.board.resize === "function") {
    window.board.resize();
  }
}
// Garante a exposição global
window.voltarAoJogo = voltarAoJogo;

// Garante a conexão direta no barramento global
if (typeof window !== 'undefined') {
    window.voltarAoJogo = voltarAoJogo;
}

/**
 * Updates the main info area (turn, player names, move count).
 */
function atualizarInfo() {
    if (!infoEl) return;
    const jogo = getJogoInstance();

    if (!jogo) {
        infoEl.innerHTML = '<strong>Aguardando Iniciar Partida...</strong>';
        return;
    }

    const gameState = getGameState();
    const totalHalfMoves = jogo ? jogo.history().length : 0;
    const jogadasCompletas = Math.floor(totalHalfMoves / 2);

    let texto;
    if (gameState.modoJogo === "humano-humano") {
        texto = `Suas peças: ${mostrarCor(gameState.corUsuario)} | A jogar: ${mostrarCor(jogo.turn())}`;
        infoEl.innerHTML = `<strong>${texto} | Jogadas: ${jogadasCompletas}</strong>`;
    } else {
        const jogadorAtual = jogo && jogo.turn() === 'w' ? gameState.nomeJogador1 || "Jogador 1" : gameState.nomeJogador2 || "Jogador 2";
        const corAtual = jogo && jogo.turn() === 'w' ? 'Br' : 'Pr';
        texto = `A jogar: ${jogadorAtual} (${corAtual})`;
        infoEl.innerHTML = `<strong>${texto} | Jogadas: ${jogadasCompletas}</strong>`;
        if (sugestoesLinhaEl) sugestoesLinhaEl.innerHTML = "<span>Sugestões apenas no modo IA</span>";
        if (avaliacaoEl) avaliacaoEl.innerHTML = "Nota do lance: -.";
    }
    verificarXeque();
}

/**
 * Updates the game state display (mode, players, AI level).
 */
function atualizarEstadoJogo(modeFromConfig) {
    // Busca o elemento diretamente pelo ID para evitar travamento por variável nula
    const el = document.getElementById("estado-jogo") || estadoJogoEl;
    if (!el) return;

    // Garante a visibilidade do mostrador
    el.style.display = "";

    const jogo = getJogoInstance();
    const gameState = getGameState();
    const currentLevel = getCurrentLevel();

    const currentMode = modeFromConfig || gameState.modoJogo;

    if (gameState.partidaIniciada && jogo && !jogo.game_over()) {
        if (currentMode === "humano-humano") {
            el.innerHTML = `Partida Humano vs Humano: ${gameState.nomeJogador1 || "Jogador 1"} (Br) vs ${gameState.nomeJogador2 || "Jogador 2"} (Pr).`;
        } else {
            const nivelEl = document.getElementById("profundidade");
            const nivelTexto = nivelEl ? nivelEl.options[nivelEl.selectedIndex].text : getLevelName(currentLevel);
            el.innerHTML = `Você (${mostrarCor(gameState.corUsuario)}) vs IA (${mostrarCor(gameState.corUsuario === 'w' ? 'b' : 'w')}).`;
        }
    } else if (gameState.partidaIniciada && jogo && jogo.game_over()) {
        let resultado = "Fim de Jogo";
        if (jogo.in_checkmate()) resultado = "Xeque-mate";
        else if (jogo.in_draw()) resultado = "Empate";

        if (currentMode === "humano-humano") {
            el.innerHTML = `${resultado}! Partida entre ${gameState.nomeJogador1 || "Jogador 1"} e ${gameState.nomeJogador2 || "Jogador 2"}.`;
        } else {
            const nivelEl = document.getElementById("profundidade");
            const nivelTexto = nivelEl ? nivelEl.options[nivelEl.selectedIndex].text : getLevelName(currentLevel);
            el.innerHTML = `${resultado}! Você (${mostrarCor(gameState.corUsuario)}) e IA (${mostrarCor(gameState.corUsuario === 'w' ? 'b' : 'w')}).`;
        }
    } else {
        if (currentMode === "humano-humano") {
            el.innerHTML = "Pronto para Humano vs Humano. Preencha os nomes e clique em Iniciar.";
        } else {
            const nivelEl = document.getElementById("profundidade");
            const nivelTexto = nivelEl ? nivelEl.options[nivelEl.selectedIndex].text : getLevelName(currentLevel);
            el.innerHTML = `Escolha a cor e clique em Iniciar.`;
        }
    }
}

/**
 * Displays the AI's move suggestions in the designated UI area.
 */
function mostrarSugestoes(suggestions) {
    // Busca direta do elemento na tela para evitar dependência de variáveis nulas
    const el = document.getElementById("sugestoes-linha") || sugestoesLinhaEl;
    if (!el) return;

    // Garante que o painel de dicas fique visível
    el.style.display = "";

    if (suggestions && suggestions.length > 0) {
        const sugestoesTexto = suggestions.slice(0, 3)
            .map(s => `${s.slice(0, 2)} → ${s.slice(2, 4)}`)
            .join(", ");
        el.innerHTML = `<span>Sugestões: ${sugestoesTexto}</span>`;
    } else {
        el.innerHTML = "<span>Sem sugestões disponíveis no momento.</span>";
    }
}
/**
 * Sends a temporary absence message. (Placeholder)
 */
function enviarMensagemAusencia() {
    mostrarMensagemTemporaria("Função de Ausência não implementada.");
}


// --- Funções de Configuração e Início ---

/**
 * Lida com o início do jogo, lendo as configurações da UI.
 */
function handleStartGame() {
    // Leitura dos elementos ativos no painel
    const corEl = document.getElementById("cor");
    const nivelEl = document.getElementById("nivel-ia");

    // Definições seguras dos parâmetros de jogo
    const corUsuario = corEl ? corEl.value : "w";
    const modoJogo = "humano-ia";
    const nomeJogador1 = "Você";
    const nomeJogador2 = "Stockfish";

    // Dispara o reset e a preparação do tabuleiro
    if (typeof iniciarNovoJogo === 'function') {
        iniciarNovoJogo(modoJogo, corUsuario, nomeJogador1, nomeJogador2);
    }

    // Inicializa o motor de xadrez Stockfish
    if (typeof inicializarStockfish === 'function') {
        inicializarStockfish().catch((error) => {
            console.error("Falha ao inicializar Stockfish:", error);
        });
    }
}

/**
 * Lida com a mudança de modo (IA vs Humano) para mostrar/esconder as configurações de nome.
 */
function handleModeChange() {
    const modo = document.getElementById("modo-jogo").value;
    const configIA = document.getElementById("config-humano-ia");
    const configHumano = document.getElementById("config-humano-humano");
    const sugestoesSection = document.getElementById("sugestoes");
    const avaliacaoSection = document.getElementById("avaliacao");

    const modoEl = document.getElementById("modo-jogo"); // Ou o ID utilizado no seu código
    if (!modoEl) {
        console.warn("DEBUG: Seletor de modo não encontrado no HTML. Ignorando alteração visual.");
        return; // Interrompe a função com segurança sem travar o restante do programa
    }

    if (modo === "humano-ia") {
        configIA.style.display = 'flex';
        configHumano.style.display = 'none';
        if (sugestoesSection) sugestoesSection.style.display = 'block';
        if (avaliacaoSection) avaliacaoSection.style.display = 'block';
    } else {
        configIA.style.display = 'none';
        configHumano.style.display = 'flex';
        if (sugestoesSection) sugestoesSection.style.display = 'none';
        if (avaliacaoSection) avaliacaoSection.style.display = 'none';
    }
    
    // Atualiza o texto do estado do jogo imediatamente após a mudança de modo
    atualizarEstadoJogo(modo);
}


/**
 * Binds event listeners to various UI elements after the DOM is loaded.
 */
function bindUIEvents() {
    initializeUIElements();

    // --- EVENTOS DE CONTROLE ---
    const voltarBtn = document.getElementById("btn-voltar");
    if (voltarBtn) voltarBtn.addEventListener('click', goBackMove);

    const avancarBtn = document.getElementById("btn-avancar");
    if (avancarBtn) avancarBtn.addEventListener('click', goForwardMove);

    const retomarBtn = document.getElementById("btn-retomar");
    if (retomarBtn) retomarBtn.addEventListener('click', resumeGame);

    const manualBtn = document.getElementById("btn-manual");
    if (manualBtn) manualBtn.addEventListener('click', mostrarManual);

    // Adiciona log para verificar se o botão de treinos é encontrado
    const treinosBtn = document.getElementById("btn-estudos");
    if (treinosBtn) {
        treinosBtn.addEventListener('click', mostrarGerenciarTreinos);
    } else {
        console.error("DEBUG: Botão #btn-estudos NÃO ENCONTRADO no DOM.");
    }
    
    // LIGAÇÃO DO NOVO BOTÃO DE CONFIRMAÇÃO
    const btnConfirmar = document.getElementById("btn-confirmar");
    if (btnConfirmar) btnConfirmar.addEventListener('click', processarConfirmacao);


    // --- EVENTOS DE CONFIGURAÇÃO ---
    const iniciarBtn = document.getElementById("btn-iniciar"); 
    if (iniciarBtn) iniciarBtn.addEventListener('click', handleStartGame);
    
    const modoJogoEl = document.getElementById("modo-jogo");
    if (modoJogoEl) {
        modoJogoEl.addEventListener('change', handleModeChange);
        handleModeChange(); // Chama na inicialização para configurar o display inicial
    }


    // --- LIGAÇÃO DOS BOTÕES SECUNDÁRIOS ---
    
    const dicasBtn = document.getElementById("botao-dicas");
    if (dicasBtn) dicasBtn.addEventListener('click', sugerirJogadas);

    const voltarDoManualBtn = manualEl ? manualEl.querySelector("button") : null;
    if (voltarDoManualBtn) voltarDoManualBtn.addEventListener('click', voltarAoJogo);

    const voltarDosTreinosBtn = gerenciarTreinosEl ? gerenciarTreinosEl.querySelector("button:last-child") : null;
    if (voltarDosTreinosBtn) voltarDosTreinosBtn.addEventListener('click', voltarAoJogo);

    const salvarPosicaoBtn = gerenciarTreinosEl ? gerenciarTreinosEl.querySelector("button:nth-of-type(1)") : null;
    if (salvarPosicaoBtn) salvarPosicaoBtn.addEventListener('click', salvarPosicaoAtual);
}

// Garante que os eventos sejam ligados após o DOM ser carregado
document.addEventListener('DOMContentLoaded', bindUIEvents);



// Exibe o banner permanente de Fim de Jogo (Fundo vermelho, texto branco maiúsculo)
function exibirBannerFimDeJogo(texto) {
    const estadoEl = document.getElementById("estado-jogo");
    if (!estadoEl) return;

    estadoEl.style.backgroundColor = "#d9534f"; // Vermelho
    estadoEl.style.color = "#ffffff";           // Texto branco
    estadoEl.style.fontWeight = "bold";
    estadoEl.style.padding = "10px";
    estadoEl.style.borderRadius = "5px";
    estadoEl.style.textAlign = "center";
    estadoEl.style.textTransform = "uppercase";
    estadoEl.innerHTML = texto.toUpperCase();
}

// Restaura o painel ao estado normal quando um novo jogo/lance for iniciado
function limparBannerFimDeJogo() {
    const estadoEl = document.getElementById("estado-jogo");
    if (!estadoEl) return;

    estadoEl.style.backgroundColor = "";
    estadoEl.style.color = "";
    estadoEl.style.padding = "";
}

function sortearNivelRandomico() {
    // Sortear um número entre 1 e 12
    const nivelSorteado = Math.floor(Math.random() * 12) + 1;
    const inputNivel = document.getElementById("nivel-ia");
    
    if (inputNivel) {
        inputNivel.value = nivelSorteado;
    }
    
if (typeof window.mostrarMensagemTemporaria === 'function') {
        window.mostrarMensagemTemporaria(`Nível sorteado: Profundidade ${nivelSorteado}`, 2000);
    }
}

// --- CHAVEAMENTO DE TELAS ---
// --- CHAVEAMENTO GERAL DE TELAS ---
function alternarTela(idPainelDesejado) {
    // Lista completa de todos os blocos do jogo e painéis que devem ser ocultados
    const paineisParaOcultar = [
        "painel-controles-topo", 
        "tabuleiro", 
        "estado-jogo", 
        "mouse-coord", 
        "capturas", 
        "sugestoes", 
        "sugestoes-linha", 
        "avaliacao", 
        "info", 
        "temp-message-area", 
        "manual", 
        "gerenciar-treinos", 
        "modal-editor-posicao"
    ];

    paineisParaOcultar.forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });

    // Liga exclusivamente o painel solicitado
    const telaDesejada = document.getElementById(idPainelDesejado);
    if (telaDesejada) {
        telaDesejada.style.display = "block";
        window.scrollTo(0, 0);
    }
}

function mostrarManual() {
    alternarTela("manual");
}

function mostrarGerenciarTreinos() {
    alternarTela("gerenciar-treinos");
    
    // Assegura que o contêiner interno esteja visível
    const elLista = document.getElementById("lista-problemas");
    if (elLista) elLista.style.display = "block";

    // Envia o pulso elétrico para ler o localStorage e desenhar os cards
    if (typeof window.atualizarListaProblemas === 'function') {
        window.atualizarListaProblemas();
    }
}

// ========================================================
// 1. BARRAMENTO GLOBAL (Conexão com os botões do HTML)
// ========================================================
if (typeof window !== 'undefined') {
    window.exibirBannerFimDeJogo = exibirBannerFimDeJogo;
    window.limparBannerFimDeJogo = limparBannerFimDeJogo;
    window.sortearNivelRandomico = sortearNivelRandomico;
    window.voltarAoJogo = voltarAoJogo;
    window.mostrarMensagemTemporaria = mostrarMensagemTemporaria;
    window.criarTabuleiro = criarTabuleiro;
    window.getJogoInstance = getJogoInstance; 
    window.atualizarInfo = atualizarInfo;
    window.atualizarEstadoJogo = atualizarEstadoJogo;
    window.mostrarManual = mostrarManual;
    window.mostrarGerenciarTreinos = mostrarGerenciarTreinos;
    window.mostrarSugestoes = mostrarSugestoes;
}

// ========================================================
// 2. RÉGUA ÚNICA DE EXPORTAÇÃO (Módulo ES6)
// ========================================================
export {
    criarTabuleiro,
    getCasaSelecionada,
    setCasaSelecionada,
    updateCapturesDisplay,
    mostrarCor,
    mostrarMensagemTemporaria,
    atualizarAvaliacao,
    mostrarEmojiAvaliacao,
    verificarXeque,
    mostrarManual,
    mostrarGerenciarTreinos,
    voltarAoJogo,
    atualizarInfo,
    atualizarEstadoJogo,
    mostrarSugestoes,
    bindUIEvents
};

console.log("MENSAGEM DE TESTE: As funções de painel e o barramento foram registrados no ui.js.");