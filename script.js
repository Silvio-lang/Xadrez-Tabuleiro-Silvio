// Este é o NOVO conteúdo completo para o seu arquivo 'script.js'
// Ele atua como o ponto de entrada (maestro) do seu aplicativo modular.

// Importa as funções necessárias dos seus módulos
import { bindUIEvents, atualizarEstadoJogo, mostrarMensagemTemporaria } from './ui.js';
import { inicializarStockfish } from './stockfish-manager.js';
import { iniciarNovoJogo } from './game-state.js';

/**
 * Função que controla o 'Iniciar Partida'.
 * Ela lê a configuração da UI e chama a lógica de estado do jogo.
 * Esta função SÓ é chamada quando o botão "btn-iniciar" é clicado.
 */
function iniciarPartida() {
    console.log("Iniciando partida...");
    if (typeof gtag === 'function') {
        gtag('event', 'iniciar_partida', {
            'event_category': 'Jogo',
            'event_label': 'Botão Iniciar Partida Clicado'
        });
    }

    // 1. Obter valores da UI
    const modoJogo = document.getElementById("modo-jogo").value;
    const corUsuario = document.getElementById("cor").value;
    const nomeJogador1 = document.getElementById("nome-jogador1").value || "Jogador 1";
    const nomeJogador2 = document.getElementById("nome-jogador2").value || "Jogador 2";
    
    // 2. Chamar a lógica de estado do jogo (do game-state.js)
    // Isso irá resetar o tabuleiro, o histórico e chamar a IA se necessário
    iniciarNovoJogo(modoJogo, corUsuario, nomeJogador1, nomeJogador2);

    // 3. Inicializar o Stockfish (se for modo IA)
    if (modoJogo === "humano-ia") {
        inicializarStockfish().catch((error) => {
            console.error("Falha ao inicializar Stockfish:", error);
            // Usamos 5000ms aqui de propósito, pois é um erro crítico
            mostrarMensagemTemporaria("Erro ao iniciar IA: " + error.message, 5000); 
        });
    }
}

/**
 * Liga os eventos de configuração que não estão no ui.js
 * (Botão Iniciar e seletor de Modo de Jogo).
 */
function bindConfigEvents() {
    console.log("Ligando eventos de configuração (Iniciar, Modo Jogo)...");
    
    const iniciarBtn = document.getElementById("btn-iniciar");
    if (iniciarBtn) {
        iniciarBtn.addEventListener('click', iniciarPartida);
    } else {
        console.error("Botão 'btn-iniciar' não encontrado!");
    }

    // Lógica para alternar a UI quando o modo de jogo muda
    const modoJogoEl = document.getElementById("modo-jogo");
    if (modoJogoEl) {
        modoJogoEl.addEventListener('change', (e) => {
            const configHumanoIA = document.getElementById("config-humano-ia");
            const configHumanoHumano = document.getElementById("config-humano-humano");
            
            if (e.target.value === "humano-ia") {
                configHumanoIA.style.display = "flex";
                configHumanoHumano.style.display = "none";
            } else {
                configHumanoIA.style.display = "none";
                configHumanoHumano.style.display = "flex";
            }
            // Atualiza o texto de 'estado-jogo' para refletir a seleção
            atualizarEstadoJogo(e.target.value); 
        });
    }
}

// PONTO DE ENTRADA PRINCIPAL
// Ouve o evento que sinaliza que o HTML está pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM pronto. Ligando eventos...");
    
    // 1. Diz ao ui.js para ligar seus botões (Voltar, Avançar, Manual, etc.)
    bindUIEvents(); 
    
    // 2. Liga os botões de configuração (Iniciar, Modo Jogo)
    bindConfigEvents(); 

    // 3. Chama 'atualizarEstadoJogo' uma vez no início para definir o texto inicial
    const modoInicial = document.getElementById("modo-jogo") ? document.getElementById("modo-jogo").value : "humano-ia";
    atualizarEstadoJogo(modoInicial);

    console.log("Eventos ligados. Aplicação pronta.");
});

// ========================================================
// INJEÇÃO DE POSIÇÕES (TREINOS E PROBLEMAS)
// ========================================================
window.carregarEstadoDeJogo = function(fen) {
    console.log("DEBUG: Injetando nova posição FEN no motor...", fen);
    
    let motorDaPartida = null;

    // 1. Scanner: Tenta localizar o motor do xadrez por todos os caminhos possíveis
    if (typeof window.getJogoInstance === 'function') {
        motorDaPartida = window.getJogoInstance();
    } else if (typeof getJogoInstance === 'function') {
        motorDaPartida = getJogoInstance();
    } else if (typeof window.game !== 'undefined') {
        motorDaPartida = window.game;
    } else if (typeof game !== 'undefined') {
        motorDaPartida = game;
    }

    // 2. Acopla a FEN ao motor
    if (motorDaPartida && typeof motorDaPartida.load === 'function') {
        motorDaPartida.load(fen);
        console.log("SUCESSO: Motor carregou a FEN perfeitamente!");
    } else {
        console.error("FALHA: Motor do xadrez não foi localizado no barramento.");
        return;
    }

    // 3. Redesenha a tela do tabuleiro com a nova posição
    if (typeof window.criarTabuleiro === 'function') {
        window.criarTabuleiro();
    } else if (typeof criarTabuleiro === 'function') {
        criarTabuleiro();
    } else {
        console.error("FALHA: Função criarTabuleiro não foi localizada.");
    }

    // 4. Retorna para a tela principal
    if (typeof window.voltarAoJogo === 'function') {
        window.voltarAoJogo();
    }
};