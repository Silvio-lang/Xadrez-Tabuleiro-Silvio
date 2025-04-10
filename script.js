<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Xadrez Silencioso - Protocolo Silvio</title>
  <style>
    #tabuleiro {
      display: grid;
      grid-template-columns: repeat(8, 50px);
      grid-template-rows: repeat(8, 50px);
      width: 402px;
      border: 2px solid black;
    }
    .casa {
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
    }
    .branca {
      background-color: #f0f0f0;
    }
    .preta {
      background-color: #3399ff;
    }
    .clicavel {
      cursor: pointer;
    }
    .selecionada {
      outline: 3px solid red;
    }
    .indicador-mov {
      width: 10px;
      height: 10px;
      background-color: black;
      border-radius: 50%;
      position: absolute;
      transform: translate(15px, 15px);
    }
    .indicador-origem {
      width: 10px;
      height: 10px;
      background-color: white;
      border-radius: 50%;
      position: absolute;
      transform: translate(15px, 15px);
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.13.4/chess.min.js"></script>
</head>
<body>
  <h2>Modo Silencioso - Protocolo Silvio</h2>

  <label for="cor">Cor das Peças:</label>
  <select id="cor">
    <option value="w">Brancas</option>
    <option value="b">Pretas</option>
  </select>

  <label for="profundidade">Profundidade da IA:</label>
  <select id="profundidade">
    <option value="5">Rápido</option>
    <option value="10">Médio</option>
    <option value="15">Profundo</option>
  </select>

  <div>
    <button onclick="iniciarPartida()">Iniciar Partida</button>
    <button onclick="desfazerJogada()">⏪ Desfazer Jogada</button>
    <button onclick="voltarJogada()">◀ Anterior</button>
    <button onclick="avancarJogada()">▶ Próxima</button>
    <button onclick="continuarAPartirDaqui()">✔️ Continuar daqui</button>
  </div>

  <div id="tabuleiro"></div>
  <div id="info"></div>

  <!-- Inclui apenas 1x o script -->
  <script src="script.js"></script>
</body>
</html>

