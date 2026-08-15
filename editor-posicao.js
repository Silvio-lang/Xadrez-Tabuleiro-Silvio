// ========================================================
// MÓDULO INDEPENDENTE: EDITOR E MONTADOR DE POSIÇÕES (FEN)
// ========================================================

// Matriz local 8x8 para edição (linhas 0-7, colunas 0-7)
let tabuleiroEditor = Array(8).fill(null).map(() => Array(8).fill(null));
let pecaSelecionadaPaleta = { cor: 'w', tipo: 'p' }; // Padrão inicial: Peão Branco
let turnoEditor = 'w';

// Tabela de caracteres Unicode para as peças
const unicodePecas = {
    'p': { 'w': '♙', 'b': '♟' },
    'r': { 'w': '♖', 'b': '♜' },
    'n': { 'w': '♘', 'b': '♞' },
    'b': { 'w': '♗', 'b': '♝' },
    'q': { 'w': '♕', 'b': '♛' },
    'k': { 'w': '♔', 'b': '♚' }
};

/**
 * Abre a janela modal do editor de posições.
 */
function abrirEditorPosicao() {
    const modal = document.getElementById("modal-editor-posicao");
    if (modal) {
        modal.style.display = "flex";
        // Por padrão, inicia carregando a posição do jogo atual
        carregarPosicaoAtualNoEditor();
    }
}

/**
 * Fecha a janela modal do editor.
 */
function fecharEditorPosicao() {
    const modal = document.getElementById("modal-editor-posicao");
    if (modal) {
        modal.style.display = "none";
    }
}

/**
 * Seleciona a peça ativa na paleta de ferramentas (ou borrachinha para remover).
 */
function selecionarPecaPaleta(cor, tipo) {
    pecaSelecionadaPaleta = (cor && tipo) ? { cor, tipo } : null;
    
    // Destaque visual na paleta
    document.querySelectorAll("#paleta-pecas span").forEach(el => el.style.border = "none");
    if (event && event.target) {
        event.target.style.border = "2px solid #007bff";
        event.target.style.borderRadius = "4px";
    }
}

/**
 * Carrega a FEN do jogo que está em andamento para a matriz de edição.
 */
function carregarPosicaoAtualNoEditor() {
    if (typeof window.getJogoInstance === 'function') {
        const jogo = window.getJogoInstance();
        if (jogo) {
            carregarFENnoEditor(jogo.fen());
            return;
        }
    }
    // Caso não haja jogo ativo, carrega a posição inicial padrão
    carregarFENnoEditor('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
}

/**
 * Converte uma string FEN e preenche a matriz de edição.
 */
function carregarFENnoEditor(fenInput) {
    tabuleiroEditor = Array(8).fill(null).map(() => Array(8).fill(null));
    const partes = fenInput.split(' ');
    const posicoes = partes[0].split('/');
    turnoEditor = partes[1] || 'w';

    for (let i = 0; i < 8; i++) {
        let col = 0;
        for (let char of posicoes[i]) {
            if (!isNaN(char)) {
                col += parseInt(char);
            } else {
                const cor = (char === char.toUpperCase()) ? 'w' : 'b';
                const tipo = char.toLowerCase();
                tabuleiroEditor[i][col] = { cor, tipo };
                col++;
            }
        }
    }
    renderizarTabuleiroEditor();
}

/**
 * Renderiza o mini-tabuleiro visual dentro da janela modal.
 */
function renderizarTabuleiroEditor() {
    const container = document.getElementById("tabuleiro-editor");
    if (!container) return;

    container.innerHTML = '';

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const casa = document.createElement("div");
            casa.style.width = "40px";
            casa.style.height = "40px";
            casa.style.display = "flex";
            casa.style.justifyContent = "center";
            casa.style.alignItems = "center";
            casa.style.fontSize = "1.8rem";
            casa.style.cursor = "pointer";
            casa.style.backgroundColor = (i + j) % 2 === 0 ? "#f0d9b5" : "#b58863";

            const peca = tabuleiroEditor[i][j];
            if (peca) {
                casa.innerText = unicodePecas[peca.tipo][peca.cor];
            }

            // Clique na casa: coloca ou remove a peça selecionada na paleta
            casa.onclick = () => {
                tabuleiroEditor[i][j] = pecaSelecionadaPaleta ? { ...pecaSelecionadaPaleta } : null;
                renderizarTabuleiroEditor();
            };

            container.appendChild(casa);
        }
    }
    atualizarDisplayFEN();
}

/**
 * Lê a matriz 8x8 do editor e constrói a string FEN correspondente.
 */
function gerarFEN() {
    let fen = '';

    for (let i = 0; i < 8; i++) {
        let casasVazias = 0;

        for (let j = 0; j < 8; j++) {
            const peca = tabuleiroEditor[i][j];

            if (peca === null) {
                casasVazias++;
            } else {
                if (casasVazias > 0) {
                    fen += casasVazias;
                    casasVazias = 0;
                }
                const letra = peca.tipo.toUpperCase();
                fen += (peca.cor === 'w') ? letra : letra.toLowerCase();
            }
        }

        if (casasVazias > 0) {
            fen += casasVazias;
        }

        if (i < 7) fen += '/';
    }

    fen += ` ${turnoEditor} KQkq - 0 1`;
    return fen;
}

/**
 * Atualiza o campo de texto da FEN na janela.
 */
function atualizarDisplayFEN() {
    const campoFEN = document.getElementById("fen-resultado");
    if (campoFEN) {
        campoFEN.value = gerarFEN();
    }
}

/**
 * Aplica a FEN montada diretamente no jogo principal para iniciar a partida.
 */
/**
 * Aplica a FEN montada no motor de xadrez e rearma a interface para jogar.
 */
/**
 * Aplica a FEN montada no motor de xadrez e rearma o jogo completamente.
 */
function aplicarPosicaoMontadaNoJogo() {
    const fenGerada = gerarFEN();
    
    const jogo = (typeof window.getJogoInstance === 'function') ? window.getJogoInstance() : null;
    const gameState = (typeof window.getGameState === 'function') ? window.getGameState() : null;

    if (!jogo || !gameState) {
        if (typeof window.mostrarMensagemTemporaria === 'function') {
            window.mostrarMensagemTemporaria("Erro: Instância do jogo não encontrada.", 3000);
        }
        return;
    }

    // 1. Injeta a posição no motor
    const carregouComSucesso = jogo.load(fenGerada);

    if (!carregouComSucesso) {
        if (typeof window.mostrarMensagemTemporaria === 'function') {
            window.mostrarMensagemTemporaria("Posição FEN inválida! Verifique se os dois reis estão presentes.", 3000);
        }
        return;
    }

    // 2. Rearma as chaves de estado para destravar o movimento
    gameState.partidaIniciada = true;
    gameState.casaSelecionada = null;
    gameState.movimentosPossiveis = [];
    gameState.historicoJogadas = [];
    gameState.ultimaCasaHumano = null;
    gameState.ultimaCasaIA = null;

    // Align a cor do turno ativo da FEN com a cor atribuída ao jogador
    const turnoAtual = jogo.turn(); // 'w' para brancas, 'b' para pretas
    gameState.corUsuario = turnoAtual; 

    // 3. Fecha o editor e retorna a tela principal do jogo
    fecharEditorPosicao();
    if (typeof window.voltarAoJogo === 'function') {
        window.voltarAoJogo();
    }

    // 4. Redesenha a tela e reativa os conectores visuais
    if (typeof window.criarTabuleiro === 'function') window.criarTabuleiro();
    if (typeof window.atualizarInfo === 'function') window.atualizarInfo();
    if (typeof window.atualizarEstadoJogo === 'function') window.atualizarEstadoJogo();

    if (typeof window.mostrarMensagemTemporaria === 'function') {
        window.mostrarMensagemTemporaria("Posição pronta! É a sua vez de jogar.", 2500);
    }
}

// Exposição das funções para o barramento global
if (typeof window !== 'undefined') {
    window.abrirEditorPosicao = abrirEditorPosicao;
    window.fecharEditorPosicao = fecharEditorPosicao;
    window.selecionarPecaPaleta = selecionarPecaPaleta;
    window.carregarFENnoEditor = carregarFENnoEditor;
    window.carregarPosicaoAtualNoEditor = carregarPosicaoAtualNoEditor;
    window.aplicarPosicaoMontadaNoJogo = aplicarPosicaoMontadaNoJogo;
}