// Background script (Service Worker) para manejar el portapapeles
// En Manifest V3, solo los service workers pueden escribir al portapapeles de forma confiable

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'copyToClipboard') {
    console.log('📨 Background: Recibido mensaje de copia', request.text.substring(0, 50) + '...');
    
    // Función asíncrona para manejar la copia
    async function handleCopy() {
      try {
        // Verificar permisos primero
        const hasPermission = await chrome.permissions.contains({ permissions: ['clipboardWrite'] });
        console.log('🔐 Background: Permisos verificados:', hasPermission);
        
        if (!hasPermission) {
          console.error('❌ No hay permisos de portapapeles');
          sendResponse({ success: false, error: 'No clipboard permissions' });
          return;
        }
        
        // Verificar que navigator.clipboard esté disponible
        if (!navigator.clipboard) {
          console.error('❌ navigator.clipboard no disponible en el service worker');
          sendResponse({ success: false, error: 'Clipboard API not available' });
          return;
        }
        
        // Usar la API del portapapeles desde el service worker
        await navigator.clipboard.writeText(request.text);
        console.log('✅ Texto copiado al portapapeles desde background script');
        sendResponse({ success: true });
        
      } catch (err) {
        console.error('❌ Error al copiar al portapapeles:', err);
        sendResponse({ success: false, error: err.message });
      }
    }
    
    handleCopy();
    
    // Importante: retornar true para mantener el canal de respuesta abierto
    return true;
  }
});

console.log('🚀 Background script iniciado - CoderPad Auto Copy');
