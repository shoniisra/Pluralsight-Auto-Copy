// Offscreen document: único contexto de la extensión que puede escribir al
// portapapeles sin que la pestaña ni la ventana tengan foco (usa execCommand).

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== 'offscreen' || message.action !== 'copyToClipboard') {
        return;
    }

    try {
        const textarea = document.getElementById('clipboard-helper');
        textarea.value = message.text;
        textarea.select();
        const ok = document.execCommand('copy');
        textarea.value = '';
        sendResponse({ success: ok, error: ok ? undefined : 'execCommand copy failed' });
    } catch (err) {
        sendResponse({ success: false, error: err.message });
    }
});
