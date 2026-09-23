$(document).ready(function () {
    const modal = new bootstrap.Modal(document.getElementById('infoModal'));
    const countdownModal = new bootstrap.Modal(document.getElementById('countdownModal'));
    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${wsProtocol}//${location.host}`);
    let clientId, gameId;
    let selectedWords = [];
    let selectedImageIndex = -1;

    function showModal(title, body) {
        $('#modalTitle').text(title);
        $('#modalBody').text(body);
        modal.show();
    }

    function showContainer(containerId) {
        $('.game-card').hide();
        $(containerId).fadeIn(300);
    }

    socket.onopen = () => {
        $('#connection-status').text('Bağlantı kuruldu');
        $('#game-controls').show();
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received:', data);

        switch (data.type) {
            case 'connected':
                clientId = data.clientId;
                break;
            case 'gameCreated':
            case 'gameJoined':
                gameId = data.gameId;
                $('#game-id-display').text('Oyun ID: ' + gameId);
                showContainer('#lobby-container');
                break;
            case 'gameUpdate':
                updatePlayerList(data.clients);
                break;
            case 'countdown':
                $('#countdown').text(data.count);
                countdownModal.show();
                break;
            case 'gameStart':
                countdownModal.hide();
                showGameArea();
                startGame(data.words);
                break;
            case 'selectionUpdate':
                // Diğer oyuncuların seçimlerini göster
                break;
            case 'images':
                displayImages(data.images);
                break;

            case 'imageRevealCountdown':
                showImageRevealCountdown(data.count);
                break;
            case 'revealImages':
                revealImages(data.gameData);
                break;
            case 'guessResult':
                if (Array.isArray(data.result) && data.result.length === 3) {
                    showGuessResult(data.result);
                } else {
                    console.error('Invalid guess result received:', data.result);
                }
                break;
            case 'opponentImage':
                displayOpponentImage(data.image, data.words);
                break;

            case 'opponentGuessResult':
                showOpponentGuessResult(data.result);
                break;
            case 'gameEnd':
                showGameEnd(data.scores);
                break;
        }
    };

    let gameWords = [];

    // Giriş işlemi
    $('#login-button').click(function () {
        var username = $('#username').val();
        if (username) {
            showContainer('#game-container');
        } else {
            showModal('Hata', 'Lütfen bir kullanıcı adı girin.');
        }
    });

    // Oyun oluşturma
    $('#create-game').click(function () {
        var username = $('#username').val();
        socket.send(JSON.stringify({ type: 'create', name: username }));
    });

    // Oyuna katılma
    $('#join-game').click(function () {
        var gameId = $('#game-id').val();
        var username = $('#username').val();
        if (gameId) {
            socket.send(JSON.stringify({ type: 'join', name: username, gameId: gameId }));
        } else {
            showModal('Hata', 'Lütfen bir Oyun ID girin.');
        }
    });

    // Oyun ID'sini kopyalama
    $('#copy-game-id').click(function () {
        var gameId = $('#game-id-display').text().split(': ')[1];
        navigator.clipboard.writeText(gameId);
    });

    // Hazırım butonu
    $('#ready-button').click(function () {
        socket.send(JSON.stringify({ type: 'ready' }));
        $(this).prop('disabled', true);
    });

    // Buton animasyonları
    $('.btn').on('mouseenter', function () {
        $(this).addClass('pulse');
    }).on('mouseleave', function () {
        $(this).removeClass('pulse');
    });

    function showGameArea() {
        showContainer('#game-area');
    }

    function updatePlayerList(players) {
        const playerList = $('#player-list');
        playerList.empty();
        players.forEach(player => {
            playerList.append(`<li class="list-group-item" style="background-color:#ffffff00;border:none;">${player.name} ${player.ready ? '(Hazır)' : ''}</li>`);
        });
    }

    function startGame(words) {
        gameWords = words;  // Kelimeleri global değişkende saklayalım
        const wordList = $('#word-list');
        wordList.empty();
        words.forEach(word => {
            const $button = $('<div>')
                .addClass('word-item')
                .text(word)
                .click(function () { toggleWordSelection($(this), word); });
            wordList.append($button);
        });
    }

    function toggleWordSelection($button, word) {
        if (selectedWords.includes(word)) {
            selectedWords = selectedWords.filter(w => w !== word);
            $button.removeClass('selected');
        } else if (selectedWords.length < 3) {
            selectedWords.push(word);
            $button.addClass('selected');
        }
    }

    $('#select-words-button').click(function () {
        if (selectedWords.length === 3) {
            $('#game-area').hide();
            $('#image-generation-area').show();
            $('#selected-words').empty();
            selectedWords.forEach(word => {
                $('#selected-words').append(`<span class="selected-word-item">${word}</span>`);
            });
        } else {
            showModal('Hata', 'Lütfen tam olarak 3 kelime seçin.');
        }
    });

    $('#generate-image-button').click(function () {
        const prompt = $('#image-prompt').val();
        if (prompt) {
            $('#image-loading').show();
            $('#generated-images').hide();
            $('#select-image-button').hide();
            socket.send(JSON.stringify({
                type: 'generate',
                prompt: prompt,
                selectedWords: selectedWords
            }));
        } else {
            showModal('Hata', 'Lütfen görsel için bir açıklama girin.');
        }
    });

    function displayImages(images) {
        $('#image-loading').hide();
        const $imageContainer = $('#generated-images');
        $imageContainer.empty().show();
        images.forEach((imageUrl, index) => {
            const $image = $('<img>')
                .addClass('generated-image')
                .attr('src', imageUrl)
                .attr('alt', `Generated Image ${index + 1}`)
                .click(function () { selectImage($(this), index); });
            $imageContainer.append($image);
        });
        $('#select-image-button').show();
    }

    function selectImage($image, index) {
        $('.generated-image').removeClass('selected');
        $image.addClass('selected');
        selectedImageIndex = index;
    }

    $('#select-image-button').click(function () {
        if (selectedImageIndex !== -1) {
            socket.send(JSON.stringify({
                type: 'selectImage',
                selectedImageIndex,
                selectedWords: selectedWords
            }));
            showModal('Görsel Seçildi', 'Seçilen görsel kaydedildi.');
            $('#image-generation-area').hide();
        } else {
            showModal('Hata', 'Lütfen bir görsel seçin.');
        }
    });



    function showGuessInputs() {
        const $guessContainer = $('#guess-container');
        $guessContainer.empty().show();
        for (let i = 0; i < 3; i++) {
            $guessContainer.append($('<input>').attr('type', 'text').addClass('guess-input'));
        }
        $guessContainer.append($('<button>').text('Tahmin Et').click(submitGuess));
    }

    function showImageRevealCountdown(count) {
        $('#countdown').text(`Görseller gösteriliyor: ${count}`).show();
    }

    function revealImages(gameData) {
        $('#countdown').hide();
        const $revealContainer = $('<div>').attr('id', 'reveal-container');
        gameData.forEach(data => {
            const $playerReveal = $('<div>').addClass('player-reveal');
            $playerReveal.append($('<img>').attr('src', data.selectedImage));
            $revealContainer.append($playerReveal);
        });
        $('#game-container').append($revealContainer);
        showGuessInputs();
    }

    function submitGuess() {
        const guessedWords = $('#guess-word-list .selected').map(function () {
            return $(this).text();
        }).get();
    
        if (guessedWords.length !== 3) {
            showModal('Hata', 'Lütfen tam olarak 3 kelime seçin.');
            return;
        }
    
        socket.send(JSON.stringify({
            type: 'guessWords',
            guessedWords
        }));
    
        $('#submit-guess').prop('disabled', true);
        $('#guess-word-list .guess-word-item').prop('disabled', true);
    }


    /////qqq
    function displayOpponentImage(imageUrl, words) {
        $('#image-generation-area').hide();
        $('#guess-area').show();
    
        const $opponentImageContainer = $('#opponent-image-container');
        $opponentImageContainer.empty().show();
        const $image = $('<img>')
            .attr('src', imageUrl)
            .attr('alt', 'Opponent\'s Image')
            .addClass('img-fluid');
        $opponentImageContainer.append($image);
    
        const $wordList = $('#guess-word-list');
        $wordList.empty();
        if (words && words.length > 0) {
            words.forEach(word => {
                const $button = $('<div>')
                    .addClass('guess-word-item')
                    .text(word)
                    .click(function () { toggleWordGuess($(this)); });
                $wordList.append($button);
            });
        } else {
            $wordList.append('<p>Kelimeler yüklenemedi.</p>');
        }
    
        updateGuessCount();
        
        // Tahmin sonuç konteynerini temizle ve gizle
        $('#guess-result-container').empty().hide();
    }

    function toggleWordGuess($item) {
        $item.toggleClass('selected');
        updateGuessCount();
    }

    function updateGuessCount() {
        const selectedCount = $('#guess-word-list .selected').length;
        $('#guess-count').text(`${selectedCount} / 3 kelime seçildi`);
        $('#submit-guess').prop('disabled', selectedCount !== 3);
    }

    $('#submit-guess').click(function () {
        const guessedWords = $('#guess-word-list .selected').map(function () {
            return $(this).text();
        }).get();
        socket.send(JSON.stringify({
            type: 'guessWords',
            guessedWords
        }));
        $(this).prop('disabled', true);
    });

    function showGuessResult(result) {
        if (!result || !Array.isArray(result) || result.length === 0) {
            console.error('Invalid guess result:', result);
            return;
        }
    
        const $guessResultContainer = $('#guess-result-container');
        $guessResultContainer.empty(); // Önceki sonuçları temizle
    
        $guessResultContainer.append('<h4>Tahminleriniz:</h4>');
    
        const $guessedWords = $('#guess-word-list .selected');
        $guessedWords.each((index, element) => {
            const word = $(element).text();
            const isCorrect = result[index];
            const $guessItem = $('<div>')
                .addClass('guess-item')
                .addClass(isCorrect ? 'correct' : 'incorrect')
                .text(`${word}: ${isCorrect ? 'Doğru' : 'Yanlış'}`);
            $guessResultContainer.append($guessItem);
        });
    
        $guessResultContainer.show();
    }

    function showGameEnd(scores) {
        $('#guess-area').hide();
        const $endGameContainer = $('<div>').attr('id', 'end-game-container');
        $endGameContainer.append('<h2>Oyun Sona Erdi</h2>');

        for (const [clientId, score] of Object.entries(scores)) {
            const playerName = clientId === clientId ? 'Siz' : 'Rakip';
            $endGameContainer.append(`<p>${playerName}: ${score} puan</p>`);
        }

        const winner = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b)[0];
        const winnerText = winner === clientId ? 'Tebrikler, kazandınız!' : 'Maalesef kaybettiniz.';
        $endGameContainer.append(`<h3>${winnerText}</h3>`);

        $endGameContainer.append('<button id="play-again">Tekrar Oyna</button>');
        $('.container').append($endGameContainer);

        $('#play-again').click(function () {
            location.reload();
        });
    }

    function showOpponentGuessResult(result) {
        if (!result || !Array.isArray(result) || result.length === 0) {
            console.error('Invalid opponent guess result:', result);
            return;
        }

        const $opponentGuessResult = $('<div>').addClass('opponent-guess-result');
        $opponentGuessResult.append('<h4>Rakibinizin Tahmini:</h4>');

        result.forEach((isCorrect, index) => {
            const $guessItem = $('<div>')
                .addClass('guess-item')
                .addClass(isCorrect ? 'correct' : 'incorrect')
                .text(`Tahmin ${index + 1}: ${isCorrect ? 'Doğru' : 'Yanlış'}`);
            $opponentGuessResult.append($guessItem);
        });

        // Eğer daha önce bir sonuç gösterilmişse, onu kaldır
        $('#opponent-guess-result-container').remove();

        // Yeni sonucu ekle
        const $resultContainer = $('<div>').attr('id', 'opponent-guess-result-container');
        $resultContainer.append($opponentGuessResult);
        $('#guess-area').append($resultContainer);
    }


});