export class GameManager {
    constructor(socketManager, uiManager) {
        this.socketManager = socketManager;
        this.uiManager = uiManager;
        this.selectedWords = [];
        this.selectedImageIndex = -1;
        this.currentStage = 'login';
    }

    handleServerMessage(data) {
        switch (data.type) {
            case 'connected':
                this.socketManager.clientId = data.clientId;
                break;
            case 'gameCreated':
                console.log("+++")
                this.socketManager.gameId = data.gameId;
                this.uiManager.showPage('lobby');
                this.currentStage = 'lobby';
            case 'gameJoined':
                this.socketManager.gameId = data.gameId;
                this.uiManager.showPage('lobby');
                this.currentStage = 'lobby';
                break;
            case 'gameUpdate':
                this.uiManager.updatePlayerList(data.clients);
                break;
            case 'countdown':
                this.uiManager.showCountdown(data.count);
                break;
            case 'gameStart':
                this.startGame(data.words);
                break;
            case 'selectionUpdate':
                // Implement if needed
                break;
            case 'images':
                this.displayImages(data.images);
                break;
            case 'opponentImage':
                this.displayOpponentImage(data.image);
                break;
            case 'imageRevealCountdown':
                this.uiManager.showImageRevealCountdown(data.count);
                break;
            case 'revealImages':
                this.revealImages(data.gameData);
                break;
            case 'guessResult':
                this.showGuessResult(data.correctCount);
                break;
        }
    }

    startGame(words) {
        this.uiManager.showPage('game');
        this.currentStage = 'word-selection';
        this.uiManager.displayWords(words);
    }

    completeWordSelection() {
        if (this.selectedWords.length === 3) {
            this.uiManager.showPromptInput();
            this.currentStage = 'prompt-input';
        } else {
            alert('Lütfen 3 kelime seçin.');
        }
    }

    submitPrompt(prompt) {
        if (prompt) {
            this.socketManager.sendGenerate(prompt, this.selectedWords);
            this.currentStage = 'waiting-for-images';
        }
    }

    displayImages(images) {
        this.uiManager.displayImages(images);
        this.currentStage = 'image-selection';
    }

    selectImage(index) {
        this.selectedImageIndex = index;
        this.socketManager.sendSelectImage(index);
        this.currentStage = 'waiting-for-opponent';
    }

    displayOpponentImage(imageUrl) {
        this.uiManager.displayOpponentImage(imageUrl);
        this.uiManager.showGuessInputs();
        this.currentStage = 'guessing';
    }

    revealImages(gameData) {
        this.uiManager.revealImages(gameData);
        this.uiManager.showGuessInputs();
        this.currentStage = 'guessing';
    }

    submitGuess(guessedWords) {
        this.socketManager.sendGuessWords(guessedWords);
        this.currentStage = 'waiting-for-results';
    }

    showGuessResult(correctCount) {
        this.uiManager.showGuessResult(correctCount);
        this.currentStage = 'game-end';
    }
}