const express = require('express');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const { OpenAI } = require('openai');
const http = require('http');

// Sınıflar ve modüller
class Game {
    constructor(hostId) {
        this.id = uuidv4();
        this.host = hostId;
        this.clients = [hostId];
        this.readyCount = 0;
        this.countdownStarted = false;
    }

    addClient(clientId) {
        this.clients.push(clientId);
    }

    removeClient(clientId) {
        const index = this.clients.indexOf(clientId);
        if (index !== -1) {
            this.clients.splice(index, 1);
        }
    }

    incrementReadyCount() {
        this.readyCount++;
    }

    decrementReadyCount() {
        this.readyCount--;
    }

    isEveryoneReady() {
        return this.readyCount === this.clients.length && !this.countdownStarted;
    }

    startCountdown() {
        this.countdownStarted = true;
    }
}

class Client {
    constructor(ws) {
        this.id = uuidv4();
        this.ws = ws;
        this.name = '';
        this.ready = false;
        this.words = [];
        this.selectedWords = [];
        this.generatedImages = [];
        this.selectedImageIndex = undefined;
    }

    setName(name) {
        this.name = name;
    }

    setReady(ready) {
        this.ready = ready;
    }

    setWords(words) {
        this.words = words;
    }

    setSelectedWords(words) {
        this.selectedWords = words;
    }

    setGeneratedImages(images) {
        this.generatedImages = images;
    }

    setSelectedImageIndex(index) {
        this.selectedImageIndex = index;
    }
}

class GameManager {
    constructor(clientManager) {
        this.games = {};
        this.clientManager = clientManager;
    }

    createGame(hostId) {
        const game = new Game(hostId);
        this.games[game.id] = game;
        return game.id;
    }

    getGame(gameId) {
        return this.games[gameId];
    }

    removeGame(gameId) {
        delete this.games[gameId];
    }

    getGameByClientId(clientId) {
        for (const gameId in this.games) {
            if (this.games[gameId].clients.includes(clientId)) {
                return this.games[gameId];
            }
        }
        return null;
    }

    calculateScores(gameId) {
        const game = this.getGame(gameId);
        if (!game) return null;

        const scores = {};
        game.clients.forEach(clientId => {
            const client = this.clientManager.getClient(clientId);
            const opponent = game.clients.find(id => id !== clientId);
            const opponentClient = this.clientManager.getClient(opponent);

            let score = 0;
            client.guessedWords.forEach((word, index) => {
                if (opponentClient.selectedWords.includes(word)) {
                    score += 1;
                }
            });

            scores[clientId] = score;
        });

        return scores;
    }

}

class ClientManager {
    constructor() {
        this.clients = {};
    }

    addClient(ws) {
        const client = new Client(ws);
        this.clients[client.id] = client;
        return client;
    }

    getClient(clientId) {
        return this.clients[clientId];
    }

    removeClient(clientId) {
        delete this.clients[clientId];
    }
}

class WordGenerator {
    constructor(openai) {
        this.openai = openai;
    }

    async generateWords() {
        try {
            const completion = await this.openai.chat.completions.create({
                messages: [{ role: "system", content: "Birbirinden farklı 12 tane türkçe kelime ver. Verdiğin cevapta sadece kelimeler olsun, Sıralama yapma. Sadece boşluklarla ayır. Bu kelimelerle görsel üreteceğim ona göre kelimeler ver." }],
                model: process.env.OPENAI_TEXT_MODEL || "gpt-4",
            });
            const generatedText = completion.choices[0].message.content.trim();
            return generatedText.split(/\s+/).slice(0, 12);
        } catch (error) {
            console.error("Error generating words:", error);
            return [];
        }
    }
}

class ImageGenerator {
    constructor(openai) {
        this.openai = openai;
        this.lastRequestTime = 0;
    }

    async generateImage(prompt) {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < 12000) {
            await new Promise(resolve => setTimeout(resolve, 12000 - timeSinceLastRequest));
        }

        try {
            const response = await this.openai.images.generate({
                model: process.env.OPENAI_IMAGE_MODEL || "dall-e-2",
                prompt: prompt,
                n: 1,
                size: "256x256"
            });
            this.lastRequestTime = Date.now();
            return response.data[0].url;
        } catch (error) {
            console.error("Error generating image:", error);
            return null;
        }
    }
}

class Application {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.clientManager = new ClientManager();
        this.gameManager = new GameManager(this.clientManager);
        this.wordGenerator = new WordGenerator(this.openai);
        this.imageGenerator = new ImageGenerator(this.openai);

        this.setupWebSocket();
        this.setupExpress();
    }

    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            const client = this.clientManager.addClient(ws);
            this.sendMessage(client.id, { type: 'connected', clientId: client.id });

            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);
                    await this.handleMessage(client.id, data);
                } catch (error) {
                    console.error("Error handling message:", error);
                    this.sendMessage(client.id, { type: 'error', message: 'Invalid message' });
                }
            });

            ws.on('close', () => this.handleDisconnect(client.id));
        });
    }

    setupExpress() {
        this.app.use(express.static('public'));
    }

    async handleMessage(clientId, data) {
        switch (data.type) {
            case 'create':
                this.handleCreateGame(clientId, data.name);
                break;
            case 'join':
                this.handleJoinGame(clientId, data.gameId, data.name);
                break;
            case 'ready':
                this.handleReady(clientId);
                break;
            case 'generate':
                await this.handleGenerate(clientId, data.prompt, data.selectedWords);
                break;
            case 'selectImage':
                this.handleImageSelection(clientId, data.selectedImageIndex);
                break;
            case 'guessWords':
                this.handleWordGuess(clientId, data.guessedWords);
                break;
        }
    }

    handleCreateGame(clientId, name) {
        const client = this.clientManager.getClient(clientId);
        client.setName(name);
        const gameId = this.gameManager.createGame(clientId);
        this.sendMessage(clientId, { type: 'gameCreated', gameId });
        this.broadcastGameUpdate(gameId);
    }

    handleJoinGame(clientId, gameId, name) {
        const game = this.gameManager.getGame(gameId);
        if (game) {
            const client = this.clientManager.getClient(clientId);
            client.setName(name);
            game.addClient(clientId);
            this.sendMessage(clientId, { type: 'gameJoined', gameId });
            this.broadcastGameUpdate(gameId);
        } else {
            this.sendMessage(clientId, { type: 'error', message: 'Game not found' });
        }
    }

    handleReady(clientId) {
        const client = this.clientManager.getClient(clientId);
        client.setReady(true);
        const game = this.gameManager.getGameByClientId(clientId);
        if (game) {
            game.incrementReadyCount();
            this.broadcastGameUpdate(game.id);

            if (game.isEveryoneReady()) {
                game.startCountdown();
                this.startCountdown(game.id);
            }
        }
    }

    handleDisconnect(clientId) {
        const client = this.clientManager.getClient(clientId);
        const game = this.gameManager.getGameByClientId(clientId);
        if (game) {
            game.removeClient(clientId);
            if (client.ready) {
                game.decrementReadyCount();
            }
            this.broadcastGameUpdate(game.id);
        }
        this.clientManager.removeClient(clientId);
    }

    broadcastGameUpdate(gameId) {
        const game = this.gameManager.getGame(gameId);
        if (!game) return;

        const clientsInGame = game.clients.map(id => {
            const client = this.clientManager.getClient(id);
            return {
                id,
                name: client.name,
                ready: client.ready
            };
        });

        this.broadcastToGame(gameId, {
            type: 'gameUpdate',
            gameId,
            clients: clientsInGame
        });
    }

    async startCountdown(gameId) {
        const words = await this.wordGenerator.generateWords();
        let count = 5;
        const countdownInterval = setInterval(() => {
            this.broadcastToGame(gameId, {
                type: 'countdown',
                gameId,
                count
            });
            if (count === 0) {
                clearInterval(countdownInterval);
                this.startGame(gameId, words);
            }
            count--;
        }, 1000);
    }

    startGame(gameId, words) {
        const game = this.gameManager.getGame(gameId);
        game.clients.forEach(clientId => {
            const client = this.clientManager.getClient(clientId);
            client.setWords(words);
            this.sendMessage(clientId, {
                type: 'gameStart',
                gameId,
                words
            });
        });
    }

    async handleGenerate(clientId, prompt, selectedWords) {
        const client = this.clientManager.getClient(clientId);
        client.setSelectedWords(selectedWords);
        const images = [];
        for (let i = 0; i < 3; i++) {
            const image = await this.imageGenerator.generateImage(prompt);
            if (image) {
                images.push(image);
            }
        }
        client.setGeneratedImages(images);
        this.sendMessage(clientId, {
            type: 'images',
            images: images
        });
    }

    handleImageSelection(clientId, selectedImageIndex) {
        const client = this.clientManager.getClient(clientId);
        client.setSelectedImageIndex(selectedImageIndex);
        const game = this.gameManager.getGameByClientId(clientId);
        if (game) {
            this.checkAllPlayersSelected(game.id);
        }
    }

    checkAllPlayersSelected(gameId) {
        const game = this.gameManager.getGame(gameId);
        const allSelected = game.clients.every(clientId =>
            this.clientManager.getClient(clientId).selectedImageIndex !== undefined
        );
        if (allSelected) {
            this.sendOpponentImages(gameId);
        }
    }

    sendOpponentImages(gameId) {
        const game = this.gameManager.getGame(gameId);
        const [client1Id, client2Id] = game.clients;
        const client1 = this.clientManager.getClient(client1Id);
        const client2 = this.clientManager.getClient(client2Id);

        this.sendMessage(client1Id, {
            type: 'opponentImage',
            image: client2.generatedImages[client2.selectedImageIndex],
            words: client2.words  // Rakibin kelimelerini gönderiyoruz
        });

        this.sendMessage(client2Id, {
            type: 'opponentImage',
            image: client1.generatedImages[client1.selectedImageIndex],
            words: client1.words  // Rakibin kelimelerini gönderiyoruz
        });
    }

    startImageRevealCountdown(gameId) {
        let count = 3;
        const countdownInterval = setInterval(() => {
            this.broadcastToGame(gameId, {
                type: 'imageRevealCountdown',
                count
            });
            if (count === 0) {
                clearInterval(countdownInterval);
                this.revealImages(gameId);
            }
            count--;
        }, 1000);
    }

    revealImages(gameId) {
        const game = this.gameManager.getGame(gameId);
        const gameData = game.clients.map(clientId => {
            const client = this.clientManager.getClient(clientId);
            return {
                clientId,
                selectedImage: client.generatedImages[client.selectedImageIndex],
                selectedWords: client.selectedWords
            };
        });
        this.broadcastToGame(gameId, {
            type: 'revealImages',
            gameData
        });
    }

    handleWordGuess(clientId, guessedWords) {
        const client = this.clientManager.getClient(clientId);
        client.guessedWords = guessedWords;

        const game = this.gameManager.getGameByClientId(clientId);
        if (game) {
            const opponentId = game.clients.find(id => id !== clientId);
            const opponent = this.clientManager.getClient(opponentId);
            const correctWords = opponent.selectedWords;

            const result = guessedWords.map(word => correctWords.includes(word));

            this.sendMessage(clientId, {
                type: 'guessResult',
                result: result
            });

            this.sendMessage(opponentId, {
                type: 'opponentGuessResult',
                result: result
            });

            if (opponent.guessedWords) {
                const scores = this.gameManager.calculateScores(game.id);
                this.endGame(game.id, scores);
            }
        }
    }

    endGame(gameId, scores) {
        const game = this.gameManager.getGame(gameId);
        if (game) {
            this.broadcastToGame(gameId, {
                type: 'gameEnd',
                scores: scores
            });
        }
    }

    // Genel mesaj gönderme fonksiyonu
    sendMessage(clientId, message) {
        const client = this.clientManager.getClient(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }

    // Oyuna özel mesaj yayınlama fonksiyonu
    broadcastToGame(gameId, message) {
        const game = this.gameManager.getGame(gameId);
        if (game) {
            game.clients.forEach(clientId => {
                this.sendMessage(clientId, message);
            });
        }
    }

    start(port) {
        this.server.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    }
}

const app = new Application();
app.start(process.env.PORT || 3000);