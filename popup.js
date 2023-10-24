chrome.runtime.onMessage.addListener(function (msg, sender) {
    console.log("Message from popup:", msg, { sender });
    if (msg.hasOwnProperty('action')) {
        if (msg.action === 'continue' || msg.action === 'ready') {
            document.getElementById('toggleButton').textContent = 'Pause';
        } else if (msg.action === 'pause') {
            document.getElementById('toggleButton').textContent = 'Continue';
        }
    }
});

document.getElementById('toggleButton').addEventListener('click', function () {
    if (this.textContent === 'Waiting') {
        chrome.runtime.sendMessage({ action: 'ready' });
        this.textContent = 'Pause';
    } else {
        var buttonText = this.textContent;
        var newState = (buttonText === 'Continue') ? 'Pause' : 'Continue';
        this.textContent = newState;
        chrome.runtime.sendMessage({ action: buttonText.toLowerCase() });
    }
});
