/* game-state.js */
// Manages the central game state, including the Chess.js instance and game history.

import { criarTabuleiro, atualizarInfo, atualizarEstadoJogo, mostrarMensagemTemporaria, setCasaSelecionada, atualizarAvaliacao, mostrarCor } from './ui.js';
import { jogadaIA, avaliarJogadaAtual } from './stockfish-manager.js';

let jogo = new window.Chess();
let historicoJogadas = [];
let indiceAtual = 0;
let corUsuario = 'w';
let modoJogo = "humano-ia";
let nomeJogador1 = "";
let nomeJogador2 = "";
let partidaIniciada = false;

let ultimaCasaIA = null;
let origemCasaIA = null;
let ultimaCasaHumano = null;
let scoreAtual = 0;

let capturedPieces = { w: {}, b: {} };

function fazerJogadaIA() {
    const gameState = getGameState();
    
    // Valida se o jogo está ativo e se é o turno da IA
    if (gameState.modoJogo === "humano-ia" && !jogo.game_over() && jogo.turn() !== gameState.corUsuario) {
        
        // Exibe o aviso no painel cobrindo os 2 segundos de reflexão
        if (typeof window.mostrarMensagemTemporaria === 'function') {
            window.mostrarMensagemTemporaria(`IA (${mostrarCor(jogo.turn())}) pensando...`, 2000);
        }
        
        // Temporizador padrão de 2000 mSeg (2 segundos) para a jogada do Stockfish
        setTimeout(jogadaIA, 2000);
    }
}

function iniciarNovoJogo(modo, cor, nome1, nome2) {
    console.log(`iniciarNovoJogo() chamado. Modo: ${modo}, Cor: ${cor}`);

    if (typeof window.limparBannerFimDeJogo === 'function') {
        window.limparBannerFimDeJogo();
    }        
    try {
        jogo = new window.Chess();
    } catch (e) {
        console.error("iniciarNovoJogo(): Falha ao criar nova instância de Chess.js:", e);
        mostrarMensagemTemporaria("Erro interno ao iniciar jogo.");
        return;
    }

    historicoJogadas = [];
    indiceAtual = 0;
    corUsuario = cor;
    modoJogo = modo;
    nomeJogador1 = nome1 || "Jogador 1";
    nomeJogador2 = nome2 || "Jogador 2";
    partidaIniciada = true;
    ultimaCasaIA = null;
    origemCasaIA = null;
    ultimaCasaHumano = null;
    scoreAtual = 0;
    capturedPieces = { w: {}, b: {} };

    historicoJogadas.push({ fen: jogo.fen(), score: scoreAtual, captured: JSON.parse(JSON.stringify(capturedPieces)) });
    indiceAtual = 1;

    criarTabuleiro();
    atualizarInfo();
    atualizarEstadoJogo();
    atualizarAvaliacao();

    if (modo === "humano-ia" && jogo.turn() !== corUsuario) {
        mostrarMensagemTemporaria(`IA (${mostrarCor(jogo.turn())}) a jogar...`, 2000);
        setTimeout(jogadaIA, 500);
    } else if (modo === "humano-humano") {
        mostrarMensagemTemporaria(`Partida Humano vs Humano iniciada.`, 3000);
    } else {
        mostrarMensagemTemporaria(`Partida Humano vs IA iniciada.`, 3000);
    }

    if (typeof window.limparBannerFimDeJogo === 'function') {
        window.limparBannerFimDeJogo();
    }
}

function moverPeca(origem, destino) {
    const gameState = getGameState();
    const jogo = getJogoInstance();

    if (!gameState || !jogo) return false;

    if (!gameState.partidaIniciada || jogo.game_over()) {
        console.log("moverPeca(): Partida não iniciada ou já encerrada.");
        return false;
    }

    if (gameState.modoJogo === "humano-ia" && jogo.turn() !== gameState.corUsuario) {
        console.log("moverPeca(): Aguarde a jogada do oponente.");
        return false;
    }

    const movimento = jogo.move({
        from: origem,
        to: destino,
        promotion: 'q'
    });

    if (movimento === null) {
        console.log("moverPeca(): Movimento inválido.");
        setCasaSelecionada(null);
        criarTabuleiro();
        return false;
    }

    criarTabuleiro();

    if (typeof window.atualizarEstadoJogo === 'function') {
        window.atualizarEstadoJogo();
    }

    if (jogo.game_over()) {
        let textoResultado = "FIM DE JOGO!";
        if (jogo.in_checkmate()) {
            textoResultado = "XEQUE-MATE! VITÓRIA CONFIRMADA.";
        } else if (jogo.in_draw()) {
            textoResultado = "EMPATE!";
        }

        if (typeof window.exibirBannerFimDeJogo === 'function') {
            window.exibirBannerFimDeJogo(textoResultado);
        }

        return true;
    }

// Se o jogo continua e passa a ser a vez da IA
    if (gameState.modoJogo === "humano-ia" && jogo.turn() !== gameState.corUsuario) {
        if (typeof fazerJogadaIA === 'function') {
            fazerJogadaIA();
        }
    }

    return true;
}

function carregarPosicaoHistorico(position) {
    const loadResult = jogo.load(position.fen);
    if (loadResult === false) {
        console.error("Carregamento de FEN inválido no histórico:", position.fen);
        mostrarMensagemTemporaria("Erro: Histórico de jogo corrompido.", 5000);
        return false;
    }

    let newState = getGameState();
    newState.scoreAtual = position.score || 0;
    newState.capturedPieces = JSON.parse(JSON.stringify(position.captured || { w: {}, b: {} }));
    newState.indiceAtual = indiceAtual; 

    newState.ultimaCasaIA = null;
    newState.origemCasaIA = null;
    newState.ultimaCasaHumano = null;
    newState.casaSelecionada = null;
    setCasaSelecionada(null);

    setGameState(newState, true);
    return true;
}

function voltarJogada() {
    const gameState = getGameState();

    if (typeof window.limparBannerFimDeJogo === 'function') {
        window.limparBannerFimDeJogo();
    }
    if (gameState.indiceAtual > 1) {
        console.log("voltando jogada...");
        indiceAtual--;
        const previousPosition = historicoJogadas[indiceAtual - 1];

        if (carregarPosicaoHistorico(previousPosition)) {
            mostrarMensagemTemporaria(`Voltando para a jogada ${Math.floor((indiceAtual - 1) / 2)}.`, 1500);
        } else {
            indiceAtual++;
        }
    } else {
        console.log("voltando jogada: Já na primeira jogada.");
        mostrarMensagemTemporaria("Já na primeira jogada.", 1500);
    }
}

function avancarJogada() {
    const gameState = getGameState();

    if (indiceAtual < historicoJogadas.length) {
        console.log("avancando jogada...");
        indiceAtual++;
        const nextPosition = historicoJogadas[indiceAtual - 1];

        if (carregarPosicaoHistorico(nextPosition)) {
            mostrarMensagemTemporaria(`Avançando para a jogada ${Math.floor((indiceAtual - 1) / 2)}.`, 1500);
        } else {
            indiceAtual--;
        }
    } else {
        console.log("avancando jogada: Já na última jogada.");
        mostrarMensagemTemporaria("Já na última jogada.", 1500);
    }
}

function continuarAPartirDaqui() {
    const gameState = getGameState();
    const jogo = getJogoInstance();

    if (gameState.partidaIniciada && indiceAtual < historicoJogadas.length) {
        historicoJogadas = historicoJogadas.slice(0, indiceAtual);
        indiceAtual = historicoJogadas.length;

        ultimaCasaIA = null;
        origemCasaIA = null;
        ultimaCasaHumano = null;

        const newState = getGameState();
        setGameState(newState);
        mostrarMensagemTemporaria("Continuando a partir desta posição.", 2000);

        if (gameState.modoJogo === "humano-ia" && jogo.turn() !== gameState.corUsuario && !jogo.game_over()) {
            mostrarMensagemTemporaria(`IA (${mostrarCor(jogo.turn())}) a jogar...`, 2000);
            setTimeout(jogadaIA, 500);
        }
    } else if (!gameState.partidaIniciada) {
        mostrarMensagemTemporaria("Nenhuma partida iniciada.", 2000);
    } else {
        mostrarMensagemTemporaria("Já na última jogada.", 2000);
    }
}

function getGameState() {
    return {
        jogo: jogo.fen(),
        historicoJogadas: historicoJogadas,
        indiceAtual: indiceAtual,
        corUsuario: corUsuario,
        modoJogo: modoJogo,
        nomeJogador1: nomeJogador1,
        nomeJogador2: nomeJogador2,
        partidaIniciada: partidaIniciada,
        ultimaCasaIA: ultimaCasaIA,
        origemCasaIA: origemCasaIA,
        ultimaCasaHumano: ultimaCasaHumano,
        scoreAtual: scoreAtual,
        capturedPieces: JSON.parse(JSON.stringify(capturedPieces))
    };
}

function setGameState(state, skipFenLoad = false) {
    console.log("setGameState() chamado:", state, "skipFenLoad:", skipFenLoad);

    if (!jogo) {
        try {
            jogo = new window.Chess(); 
        } catch (e) {
            mostrarMensagemTemporaria("Erro interno no tabuleiro.", 5000);
            return;
        }
    }

    if (!skipFenLoad && state && typeof state.jogo === 'string' && state.jogo !== '') {
        const loadResult = jogo.load(state.jogo);
        if (loadResult === false) {
            mostrarMensagemTemporaria("Erro: Posição inválida.", 5000);
        }
    }

    historicoJogadas = Array.isArray(state.historicoJogadas) ? state.historicoJogadas : [];
    indiceAtual = typeof state.indiceAtual === 'number' ? state.indiceAtual : 0;
    corUsuario = typeof state.corUsuario === 'string' ? state.corUsuario : 'w';
    modoJogo = typeof state.modoJogo === 'string' ? state.modoJogo : "humano-ia";
    nomeJogador1 = typeof state.nomeJogador1 === 'string' ? state.nomeJogador1 : "";
    nomeJogador2 = typeof state.nomeJogador2 === 'string' ? state.nomeJogador2 : "";
    partidaIniciada = typeof state.partidaIniciada === 'boolean' ? state.partidaIniciada : false;

    ultimaCasaIA = typeof state.ultimaCasaIA === 'string' || state.ultimaCasaIA === null ? state.ultimaCasaIA : null;
    origemCasaIA = typeof state.origemCasaIA === 'string' || state.origemCasaIA === null ? state.origemCasaIA : null;
    ultimaCasaHumano = typeof state.ultimaCasaHumano === 'string' || state.ultimaCasaHumano === null ? state.ultimaCasaHumano : null;

    scoreAtual = typeof state.scoreAtual === 'number' ? state.scoreAtual : 0;
    capturedPieces = (state.capturedPieces && typeof state.capturedPieces === 'object' && state.capturedPieces !== null)
        ? JSON.parse(JSON.stringify(state.capturedPieces))
        : { w: {}, b: {} };

    if (jogo) {
        criarTabuleiro();
        atualizarInfo(); 
        atualizarEstadoJogo(); 
        atualizarAvaliacao(); 
    }
}

function getJogoInstance() {
    return jogo;
}

function setScoreAtual(score) {
    scoreAtual = score;
}

function getCapturedPieces() {
    return capturedPieces;
}

// ========================================================
// BARRAMENTO GLOBAL (WINDOW) E EXPORTAÇÕES ES6
// ========================================================
if (typeof window !== 'undefined') {
    window.fazerJogadaIA = fazerJogadaIA;
    window.iniciarNovoJogo = iniciarNovoJogo;
    window.moverPeca = moverPeca;
    window.voltarJogada = voltarJogada;
    window.avancarJogada = avancarJogada;
    window.continuarAPartirDaqui = continuarAPartirDaqui;
    window.getGameState = getGameState;
    window.setGameState = setGameState;
    window.getJogoInstance = getJogoInstance;
    window.setScoreAtual = setScoreAtual;
    window.getCapturedPieces = getCapturedPieces;
}

// Régua de bornes para módulos que usam import
export {
    fazerJogadaIA,
    iniciarNovoJogo,
    moverPeca,
    voltarJogada,
    avancarJogada,
    continuarAPartirDaqui,
    getGameState,
    setGameState,
    getJogoInstance,
    setScoreAtual,
    getCapturedPieces
};