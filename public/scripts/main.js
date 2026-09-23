import { UIManager } from './ui-manager.js';
import { SocketManager } from './socket-manager.js';
import { GameManager } from './game-manager.js';

$(document).ready(function () {
    const uiManager = new UIManager();
    const socketManager = new SocketManager('ws://localhost:3000');
    const gameManager = new GameManager(socketManager, uiManager);

    socketManager.onMessage = (data) => {
        gameManager.handleServerMessage(data);
    };

    uiManager.setEventHandlers({
        onCreateGame: (name) => socketManager.createGame(name),
        onJoinGame: (name, gameId) => socketManager.joinGame(name, gameId),
        onReady: () => socketManager.sendReady(),
        onCompleteWordSelection: () => gameManager.completeWordSelection(),
        onSubmitPrompt: (prompt) => gameManager.submitPrompt(prompt),
        onSelectImage: (index) => gameManager.selectImage(index),
        onSubmitGuess: (guessedWords) => gameManager.submitGuess(guessedWords)
    });

    socketManager.connect();
});