export class UIManager {
    constructor() {
        this.currentPage = 'login';
        this.pages = {
            login: $('#login-page'),
            lobby: $('#lobby-page'),
            game: $('#game-page')
        };
    }

    setEventHandlers(handlers) {
        $('#create-game').click(() => handlers.onCreateGame($('#name-input').val()));
        $('#join-game').click(() => handlers.onJoinGame($('#name-input').val(), $('#game-id-input').val()));
        $('#ready-button').click(() => handlers.onReady());
        $('#complete-button').click(() => handlers.onCompleteWordSelection());
        $('#submit-prompt').click(() => handlers.onSubmitPrompt($('#prompt-input').val()));
    }

    showPage(pageName) {
        Object.values(this.pages).forEach(page => page.hide());
        this.pages[pageName].show();
        this.currentPage = pageName;
    }

    updatePlayerList(players) {
        const $playerList = $('#player-list');
        $playerList.empty();
        players.forEach(player => {
            $playerList.append(`<li>${player.name} ${player.ready ? '(Hazır)' : ''}</li>`);
        });
    }

    displayWords(words) {
        const $wordList = $('#word-list');
        $wordList.empty().show();
        words.forEach(word => {
            const $button = $('<button>')
                .text(word)
                .addClass('word-button')
                .click(() => this.toggleWordSelection($button, word));
            $wordList.append($button);
        });
        $('#complete-button').show();
    }

    toggleWordSelection($button, word) {
        $button.toggleClass('selected');
    }

    displayImages(images) {
        const $imageContainer = $('#image-container');
        $imageContainer.empty().show();
        images.forEach((imageUrl, index) => {
            const $wrapper = $('<div>')
                .addClass('image-wrapper')
                .click(() => this.selectImage($wrapper, index));
            const $image = $('<img>')
                .attr('src', imageUrl)
                .attr('alt', `Generated Image ${index + 1}`);
            $wrapper.append($image);
            $imageContainer.append($wrapper);
        });
    }

    selectImage($wrapper, index) {
        $('.image-wrapper').removeClass('selected');
        $wrapper.addClass('selected');
    }

    showPromptInput() {
        $('#input-container').show();
        $('#complete-button').hide();
    }

    showCountdown(count) {
        $('#countdown').text(`Oyun başlıyor: ${count}`).show();
    }

    hideCountdown() {
        $('#countdown').hide();
    }

    displayOpponentImage(imageUrl) {
        const $opponentImageContainer = $('#opponent-image-container');
        $opponentImageContainer.empty().show();
        const $image = $('<img>')
            .attr('src', imageUrl)
            .attr('alt', 'Opponent\'s Image');
        $opponentImageContainer.append($image);
    }

    showGuessInputs() {
        const $guessContainer = $('#guess-container');
        $guessContainer.empty();
        for (let i = 0; i < 3; i++) {
            $guessContainer.append($('<input>').attr('type', 'text').addClass('guess-input'));
        }
        $guessContainer.append($('<button>').text('Tahmin Et').click(() => {
            const guessedWords = $('.guess-input').map(function () {
                return $(this).val();
            }).get();
            this.handlers.onSubmitGuess(guessedWords);
        }));
    }

    showImageRevealCountdown(count) {
        $('#countdown').text(`Görseller gösteriliyor: ${count}`).show();
    }

    revealImages(gameData) {
        $('#countdown').hide();
        const $revealContainer = $('<div>').attr('id', 'reveal-container');
        gameData.forEach(data => {
            const $playerReveal = $('<div>').addClass('player-reveal');
            $playerReveal.append($('<img>').attr('src', data.selectedImage));
            $revealContainer.append($playerReveal);
        });
        $('#game-container').append($revealContainer);
    }

    showGuessResult(correctCount) {
        $('#guess-container').append($('<p>').text(`Doğru tahmin sayısı: ${correctCount}`));
    }
}