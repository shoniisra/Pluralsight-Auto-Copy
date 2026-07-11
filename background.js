// Background script (Service Worker)
// Recibe solicitudes de copia del content script (modo automático) y las delega
// a un offscreen document, ya que navigator.clipboard no existe en service workers
// y el content script no puede escribir al portapapeles si la pestaña no tiene foco.

async function ensureOffscreenDocument() {
    const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (contexts.length > 0) {
        return;
    }

    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['CLIPBOARD'],
        justification: 'Escribir la pregunta extraída al portapapeles aunque la pestaña no tenga foco'
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Ignorar los mensajes dirigidos al offscreen document (evita procesar el reenvío propio)
    if (request.action === 'copyToClipboard' && request.target !== 'offscreen') {
        (async () => {
            try {
                const hasPermission = await chrome.permissions.contains({
                    permissions: ['clipboardWrite']
                });

                if (!hasPermission) {
                    sendResponse({ success: false, error: 'No clipboard permissions' });
                    return;
                }

                await ensureOffscreenDocument();

                const result = await chrome.runtime.sendMessage({
                    target: 'offscreen',
                    action: 'copyToClipboard',
                    text: request.text
                });

                sendResponse(result || { success: false, error: 'No response from offscreen document' });
            } catch (err) {
                sendResponse({ success: false, error: err.message });
            }
        })();

        return true; // Mantener el canal abierto para la respuesta asíncrona
    }
});
