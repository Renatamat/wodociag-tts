(function () {
'use strict';

function moveControlsToHeader() {
    var controls = document.querySelector('.wp-tts-reader-controls');
    if (!controls) return;

    var header = document.querySelector('.entry-header-inner');
    if (!header) return;

    var title = header.querySelector('.entry-title');
    if (!title) return;

    var meta = header.querySelector('.post-meta-wrapper.post-meta-single');

    if (meta) {
        header.insertBefore(controls, meta);
    } else {
        title.insertAdjacentElement('afterend', controls);
    }
}

// Brak wsparcia Web Speech API
if (typeof window === 'undefined' ||
    !('speechSynthesis' in window) ||
    typeof window.SpeechSynthesisUtterance === 'undefined') {

    document.addEventListener('DOMContentLoaded', function () {
        moveControlsToHeader();
        var buttons = document.querySelectorAll('.wp-tts-reader-toggle');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].setAttribute('disabled', 'disabled');
            buttons[i].classList.add('wp-tts-reader-disabled');
            var status = buttons[i].parentNode.querySelector('.wp-tts-reader-status');
            if (status && window.wpTtsReader && wpTtsReader.notSupportedMsg) {
                status.textContent = wpTtsReader.notSupportedMsg;
            }
        }
    });
    return;
}

var reading = false;
var currentButton = null;
var currentUtterance = null;
var cachedVoices = [];
var selectionButton = null;

function loadVoicesEarly() {
    if (!window.speechSynthesis) return;

    cachedVoices = window.speechSynthesis.getVoices() || [];

    if (cachedVoices.length) return;

    function handleVoicesChanged() {
        cachedVoices = window.speechSynthesis.getVoices() || [];
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    }

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
}

function createSelectionButton() {
    if (selectionButton) return selectionButton;

    selectionButton = document.createElement('button');
    selectionButton.type = 'button';
    selectionButton.className = 'wp-tts-reader-selection-toggle';
    selectionButton.textContent = (window.wpTtsReader && wpTtsReader.startButtonText) || 'CZYTAJ TEKST';
    selectionButton.setAttribute('aria-label', (window.wpTtsReader && wpTtsReader.startLabel) || 'Włącz czytanie tekstu');
    selectionButton.style.position = 'absolute';
    selectionButton.style.zIndex = '9999';
    selectionButton.style.display = 'none';

    document.body.appendChild(selectionButton);
    return selectionButton;
}

function hideSelectionButton() {
    if (!selectionButton) return;
    selectionButton.style.display = 'none';
    selectionButton.removeAttribute('data-wp-tts-id');
}

loadVoicesEarly();

function resetButton() {
    reading = false;
    if (!currentButton) return;

    currentButton.setAttribute('aria-pressed', 'false');
    currentButton.setAttribute('aria-label', (window.wpTtsReader && wpTtsReader.startLabel) || 'Włącz czytanie tekstu');

    var textSpan = currentButton.querySelector('.wp-tts-reader-text');
    if (textSpan) {
        textSpan.textContent = (window.wpTtsReader && wpTtsReader.startButtonText) || 'CZYTAJ TEKST';
    }

    var status = currentButton.parentNode.querySelector('.wp-tts-reader-status');
    if (status) {
        status.textContent = '';
    }

    currentButton = null;
    currentUtterance = null;
}

function stopReading() {
    if (window.speechSynthesis && reading) {
        window.speechSynthesis.cancel();
    }
    resetButton();
}

function getLang() {
//    if (window.wpTtsReader && wpTtsReader.lang) {
//        return wpTtsReader.lang;
//    }
//    if (document.documentElement && document.documentElement.lang) {
//        return document.documentElement.lang;
//    }
    return 'pl-PL';
}
function getBestPolishVoice() {
    var availableVoices = cachedVoices.length ? cachedVoices : speechSynthesis.getVoices();

    // Jeżeli głosy jeszcze nie gotowe — poczekaj:
    if (!availableVoices || availableVoices.length === 0) {
        return null;
    }

    // Twoja lista preferencji (kobieta, polski)
    var preferredByName = [
        'Google polski',
        'Google Deutsch (Polish)',
        'Microsoft Paulina - Polish (Poland)',
        'Microsoft Zofia - Polish (Poland)'
    ];

    for (var i = 0; i < preferredByName.length; i++) {
        var voice = availableVoices.find(v => v.name === preferredByName[i]);
        if (voice) return voice;
    }

    // Jeśli przeglądarka ma jakiś polski głos
    var plVoices = availableVoices.filter(v => v.lang && v.lang.startsWith('pl'));
    return plVoices.length ? plVoices[0] : null;
}


// Wybór najlepszego polskiego głosu spośród dostępnych
//function getBestPolishVoice() {
//    if (!window.speechSynthesis) return null;
//    
//        var preferredByName = [
//        'Google polski',              // Chrome na Windows / Android
//        'Google Deutsch (Polish)',    // czasem tak się dziwnie nazywa
//        'Microsoft Paulina - Polish (Poland)',
//        'Microsoft Zofia - Polish (Poland)'
//    ];
//    var availableVoices = window.speechSynthesis.getVoices() || [];
//    console.log(availableVoices );
//    var preferred = availableVoices.find(v => v.lang === "pl-PL");
//if (preferred) return preferred;
//    if (!availableVoices.length) {
//        return null;
//    }
//
//    var plVoices = [];
//    for (var i = 0; i < availableVoices.length; i++) {
//        var v = availableVoices[i];
//        if (v.lang && v.lang.toLowerCase().indexOf('pl') === 0) {
//            plVoices.push(v);
//        }
//    }
//
//    if (!plVoices.length) {
//        return null;
//    }
//
//    plVoices.sort(function (a, b) {
//        function score(v) {
//            var s = 0;
//            var name = (v.name || '').toLowerCase();
//            if (name.indexOf('google') !== -1) s += 3;
//            if (name.indexOf('microsoft') !== -1) s += 2;
//            if (name.indexOf('female') !== -1 || name.indexOf('woman') !== -1 || name.indexOf('polish') !== -1) s += 1;
//            return s;
//        }
//        return score(b) - score(a);
//    });
//
//    return plVoices[0];
//}

// Zwraca zaznaczony tekst, ale tylko jeśli zaznaczenie jest wewnątrz wrappera
function getSelectedTextWithinWrapper(wrapper) {
    if (!window.getSelection) return '';

    var selection = window.getSelection();
    if (!selection || !selection.rangeCount) return '';

    var text = selection.toString().trim();
    if (!text) return '';

    var range = selection.getRangeAt(0);
    var container = range.commonAncestorContainer;
    if (wrapper.contains(container) || container === wrapper) {
        return text;
    }

    return '';
}

function startReading(button, wrapper) {
    var text = '';
    var selected = getSelectedTextWithinWrapper(wrapper);

    if (selected) {
        text = selected;
    } else if (wrapper) {
        text = (wrapper.innerText || wrapper.textContent || '').trim();
    }

    if (!text) {
        var statusEmpty = button.parentNode.querySelector('.wp-tts-reader-status');
        if (statusEmpty) {
            statusEmpty.textContent = 'Brak treści do przeczytania.';
        }
        return;
    }

    if (window.speechSynthesis.speaking || window.speechSynthesis.paused) {
        window.speechSynthesis.cancel();
    }

    var utterance = new SpeechSynthesisUtterance(text);
    var bestVoice = getBestPolishVoice();
//    var bestVoice = null;
//console.log(utterance);
    if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang || getLang();
    } else {
        utterance.lang = getLang();
    }

    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onend = resetButton;
    utterance.onerror = resetButton;

    currentButton = button;
    currentUtterance = utterance;
    reading = true;

    button.setAttribute('aria-pressed', 'true');
    button.setAttribute('aria-label', (window.wpTtsReader && wpTtsReader.stopLabel) || 'Wyłącz czytanie tekstu');

    var textSpan = button.querySelector('.wp-tts-reader-text');
    if (textSpan) {
        textSpan.textContent = (window.wpTtsReader && wpTtsReader.stopButtonText) || 'ZATRZYMAJ CZYTANIE';
    }

    var status = button.parentNode.querySelector('.wp-tts-reader-status');
    if (status) {
        if (selected) {
            status.textContent = 'Rozpoczęto czytanie zaznaczonego tekstu.';
        } else {
            status.textContent = 'Rozpoczęto czytanie tekstu.';
        }
    }

    window.speechSynthesis.speak(utterance);

    hideSelectionButton();
}

function onToggleClick(e) {
    var button = e.currentTarget || e.target;

    if (reading && currentButton === button) {
        stopReading();
        return;
    }
    if (reading && currentButton && currentButton !== button) {
        stopReading();
    }

    var id = button.getAttribute('data-wp-tts-id');
    if (!id) return;

    var wrapper = document.querySelector('.wp-tts-reader-wrapper[data-wp-tts-id="' + id + '"]');
    if (!wrapper) return;

    handleReadRequest(button, wrapper);
}

function handleReadRequest(button, wrapper) {
    loadVoicesEarly();

    // Upewniamy się, że lista głosów jest już pobrana
    window.speechSynthesis.getVoices();
    startReading(button, wrapper);
}

function showSelectionButton(wrapper) {
    var selection = window.getSelection && window.getSelection();
    if (!selection || !selection.rangeCount) {
        hideSelectionButton();
        return;
    }

    var selectedText = getSelectedTextWithinWrapper(wrapper);
    if (!selectedText) {
        hideSelectionButton();
        return;
    }

    var range = selection.getRangeAt(0);
    var rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
        hideSelectionButton();
        return;
    }

    var button = createSelectionButton();
    var wrapperId = wrapper.getAttribute('data-wp-tts-id');
    if (!wrapperId) {
        hideSelectionButton();
        return;
    }

    button.setAttribute('data-wp-tts-id', wrapperId);

    var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    button.style.left = (rect.left + scrollLeft) + 'px';
    button.style.top = (rect.bottom + scrollTop + 8) + 'px';
    button.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', function () {
    moveControlsToHeader();
    var buttons = document.querySelectorAll('.wp-tts-reader-toggle');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', onToggleClick);
    }

    document.addEventListener('selectionchange', function () {
        var selection = window.getSelection && window.getSelection();
        if (!selection || !selection.rangeCount) {
            hideSelectionButton();
            return;
        }

        var range = selection.getRangeAt(0);
        var container = range.commonAncestorContainer;
        if (!container) {
            hideSelectionButton();
            return;
        }

        var wrapper = (container.nodeType === 1 ? container : container.parentNode);
        if (wrapper && wrapper.closest) {
            wrapper = wrapper.closest('.wp-tts-reader-wrapper');
        } else {
            while (wrapper && wrapper.parentNode && wrapper.className !== 'wp-tts-reader-wrapper') {
                wrapper = wrapper.parentNode;
            }
            if (wrapper && (!wrapper.classList || !wrapper.classList.contains('wp-tts-reader-wrapper'))) {
                wrapper = null;
            }
        }

        if (!wrapper) {
            hideSelectionButton();
            return;
        }

        showSelectionButton(wrapper);
    });

    document.addEventListener('click', function (event) {
        if (!selectionButton || event.target === selectionButton) {
            return;
        }

        if (selectionButton.style.display === 'block' && !selectionButton.contains(event.target)) {
            hideSelectionButton();
        }
    });

    createSelectionButton();
    selectionButton.addEventListener('click', function () {
        var wrapperId = selectionButton.getAttribute('data-wp-tts-id');
        if (!wrapperId) return;

        var wrapper = document.querySelector('.wp-tts-reader-wrapper[data-wp-tts-id="' + wrapperId + '"]');
        var button = document.querySelector('.wp-tts-reader-toggle[data-wp-tts-id="' + wrapperId + '"]');
        if (!wrapper || !button) return;

        if (reading && currentButton && currentButton !== button) {
            stopReading();
        }

        handleReadRequest(button, wrapper);
    });

    window.addEventListener('beforeunload', function () {
        stopReading();
    });
});
})();
