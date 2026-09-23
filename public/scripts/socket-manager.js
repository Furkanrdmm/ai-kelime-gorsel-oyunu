export class SocketManager {
    constructor(url) {
        this.socket = new WebSocket(url);
        this.clientId = null;
        this.gameId = null;
    }

    connect() {
        this.socket.onopen = () => {
            $('#connection-status').text('Bağlantı kuruldu');
            $('#game-controls').show();
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received:', data);
            this.onMessage(data);
        };
    }

    createGame(name) {
        this.send({ type: 'create', name });
    }

    joinGame(name, gameId) {
        this.send({ type: 'join', name, gameId });
    }

    sendReady() {
        this.send({ type: 'ready' });
    }

    sendGenerate(prompt, selectedWords) {
        this.send({ type: 'generate', prompt, selectedWords });
    }

    sendSelectImage(selectedImageIndex) {
        this.send({ type: 'selectImage', selectedImageIndex });
    }

    sendGuessWords(guessedWords) {
        this.send({ type: 'guessWords', guessedWords });
    }

    send(data) {
        this.socket.send(JSON.stringify(data));
    }
}