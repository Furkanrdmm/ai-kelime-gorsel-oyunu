const UI = {
    updateConnectionStatus: (status) => {
        $('#connection-status').text(status);
    },

    showGameControls: () => {
        $('#game-controls').show();
    },

    updateGameInfo: (gameId) => {
        $('#current-game-id').text(gameId);
        $('#game-info').show();
        $('#game-controls').hide();
    },

    updatePlayerList: (players) => {
        const $playerList = $('#player-list');
        $playerList.empty();
        players.forEach(player => {
            $playerList.append(`<li>${player.name} ${player.ready ? '(Hazır)' : ''}</li>`);
        });
    },

    showCountdown: (count) => {
        $('#countdown').text(`Oyun başlıyor: ${count}`).show();
    },

    hideCountdown: () => {
        $('#countdown').hide();
    },

    displayWordList: (words, onWordSelect) => {
        const $wordList = $('#word-list');
        $wordList.empty().show();
        words.forEach(word => {
            const $button = $('<button>')
                .text(word)
                .addClass('word-button')
                .click(function () { onWordSelect($(this), word); });
            $wordList.append($button);
        });
        $('#complete-button').show();
    },

    showInputContainer: () => {
        $('#input-container').show();
        $('#complete-button').hide();
    },

    hideInputContainer: () => {
        $('#input-container').hide();
        $('#prompt-input').val('');
    },

    displayImages: (images, onImageSelect, onCompleteSelection) => {
        const $imageContainer = $('#image-container');
        $imageContainer.empty().show();
        images.forEach((imageUrl, index) => {
            const $wrapper = $('<div>')
                .addClass('image-wrapper')
                .click(function () { onImageSelect($(this), index); });
            const $image = $('<img>')
                .attr('src', imageUrl)
                .attr('alt', `Generated Image ${index + 1}`);
            $wrapper.append($image);
            $imageContainer.append($wrapper);
        });
        $('<button>')
            .text('Seçimi Tamamla')
            .click(onCompleteSelection)
            .appendTo($imageContainer);
    },

    displayOpponentImage: (imageUrl) => {
        const $opponentImageContainer = $('#opponent-image-container');
        $opponentImageContainer.empty().show();
        const $image = $('<img>')
            .attr('src', imageUrl)
            .attr('alt', 'Opponent\'s Image');
        $opponentImageContainer.append($image);
    },

    showGuessInputs: (onSubmitGuess) => {
        const $guessContainer = $('#guess-container');
        $guessContainer.empty().show();
        for (let i = 0; i < 3; i++) {
            $guessContainer.append($('<input>').attr('type', 'text').addClass('guess-input'));
        }
        $guessContainer.append($('<button>').text('Tahmin Et').click(onSubmitGuess));
    },

    showImageRevealCountdown: (count) => {
        $('#countdown').text(`Görseller gösteriliyor: ${count}`).show();
    },

    revealImages: (gameData) => {
        $('#countdown').hide();
        const $revealContainer = $('<div>').attr('id', 'reveal-container');
        gameData.forEach(data => {
            const $playerReveal = $('<div>').addClass('player-reveal');
            $playerReveal.append($('<img>').attr('src', data.selectedImage));
            $revealContainer.append($playerReveal);
        });
        $('#game-container').append($revealContainer);
    },

    showGuessResult: (correctCount) => {
        $('#guess-container').append($('<p>').text(`Doğru tahmin sayısı: ${correctCount}`));
    }
};