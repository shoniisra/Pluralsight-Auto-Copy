// Popup script para manejar la interfaz de usuario
document.addEventListener('DOMContentLoaded', function() {
    const copyButton = document.getElementById('copyButton');
    const status = document.getElementById('status');
    const permissionStatus = document.getElementById('permissionStatus');
    const autoModeCheckbox = document.getElementById('autoModeCheckbox');
    
    // Función para mostrar estado
    function showStatus(message, type = 'info') {
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }
    
    // Función para mostrar/ocultar elementos según permisos
    function toggleElementsVisibility(hasPermission) {
        const elementsToHide = document.querySelectorAll('.hidden-when-no-permission');
        
        if (hasPermission) {
            elementsToHide.forEach(element => {
                element.classList.add('show');
            });
        } else {
            elementsToHide.forEach(element => {
                element.classList.remove('show');
            });
        }
    }
    
    // Función para actualizar el estado de permisos
    async function updatePermissionStatus() {
        try {
            const hasPermission = await chrome.permissions.contains({
                permissions: ['clipboardWrite']
            });
            
            if (hasPermission) {
                permissionStatus.textContent = '✅ Permisos de portapapeles concedidos';
                permissionStatus.className = 'permission-status granted';
                copyButton.disabled = false;
                toggleElementsVisibility(true);
            } else {
                permissionStatus.innerHTML = '⚠️ Se necesitan permisos de portapapeles<br><button id="requestPermBtn" class="permission-request-btn">🔐 Conceder Permisos</button>';
                permissionStatus.className = 'permission-status denied';
                copyButton.disabled = true;
                copyButton.textContent = '🔒 Permisos requeridos';
                toggleElementsVisibility(false);
                
                // Añadir event listener al botón de solicitar permisos
                const requestBtn = document.getElementById('requestPermBtn');
                requestBtn.addEventListener('click', requestPermissions);
            }
        } catch (error) {
            console.error('Error checking permissions:', error);
            permissionStatus.textContent = '❌ Error verificando permisos';
            permissionStatus.className = 'permission-status denied';
            toggleElementsVisibility(false);
        }
    }
    
    // Función para cargar el estado del modo automático
    async function loadAutoModeState() {
        try {
            const result = await chrome.storage.local.get(['autoModeEnabled']);
            const isEnabled = result.autoModeEnabled || false;
            autoModeCheckbox.checked = isEnabled;
            updateButtonVisibility(isEnabled);
        } catch (error) {
            console.error('Error loading auto mode state:', error);
        }
    }
    
    // Función para actualizar la visibilidad del botón
    function updateButtonVisibility(autoModeEnabled) {
        if (autoModeEnabled) {
            copyButton.style.display = 'none';
        } else {
            copyButton.style.display = 'block';
        }
    }
    
    // Función para manejar el cambio del checkbox
    async function handleAutoModeToggle() {
        const isEnabled = autoModeCheckbox.checked;
        
        try {
            // Guardar el estado
            await chrome.storage.local.set({ autoModeEnabled: isEnabled });
            
            // Actualizar visibilidad del botón
            updateButtonVisibility(isEnabled);
            
            // Enviar mensaje al content script para activar/desactivar modo automático
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const activeTab = tabs[0];
            
            if (activeTab.url.includes('pluralsight.com')) {
                await chrome.tabs.sendMessage(activeTab.id, {
                    action: 'toggleAutoMode',
                    enabled: isEnabled
                });
                
                if (isEnabled) {
                    showStatus('✅ Modo automático activado', 'success');
                } else {
                    showStatus('⚠️ Modo automático desactivado', 'info');
                }
            }
        } catch (error) {
            console.error('Error toggling auto mode:', error);
            showStatus('❌ Error al cambiar modo automático', 'error');
        }
    }
    
    // Función para solicitar permisos
    async function requestPermissions() {
        try {
            const granted = await chrome.permissions.request({
                permissions: ['clipboardWrite']
            });
            
            if (granted) {
                showStatus('✅ Permisos concedidos correctamente', 'success');
                updatePermissionStatus();
            } else {
                showStatus('❌ Permisos denegados', 'error');
            }
        } catch (error) {
            console.error('Error requesting permissions:', error);
            showStatus('❌ Error solicitando permisos', 'error');
        }
    }
    
    // Manejar click del botón
    copyButton.addEventListener('click', async function() {
        // Verificar permisos primero
        const hasPermission = await chrome.permissions.contains({
            permissions: ['clipboardWrite']
        });
        
        if (!hasPermission) {
            showStatus('⚠️ Se necesitan permisos de portapapeles', 'error');
            return;
        }
        
        copyButton.disabled = true;
        copyButton.textContent = '⏳ Copiando...';
        
        try {
            // Obtener la pestaña activa
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Verificar si estamos en Pluralsight
            if (!tab.url.includes('pluralsight.com')) {
                showStatus('⚠️ Esta extensión solo funciona en Pluralsight', 'error');
                return;
            }
            
            // Primero inyectar el content script si no está presente
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
            } catch (injectError) {
                // Content script ya podría estar inyectado, continuar
                console.log('Content script ya presente o error al inyectar:', injectError.message);
            }
            
            // Esperar un poco para que el content script se inicialice
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Enviar mensaje al content script para extraer el texto
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'getQuestionText'
            });
            
            console.log('Response from content script:', response);
            
            if (response && response.success && response.text) {
                // El popup tiene acceso completo al portapapeles, copiar aquí
                try {
                    await navigator.clipboard.writeText(response.text);
                    showStatus('✅ Pregunta copiada al portapapeles', 'success');
                    console.log('✅ Texto copiado desde popup:', response.text.substring(0, 100) + '...');
                    
                    // Verificar que realmente se copió
                    try {
                        const clipboardText = await navigator.clipboard.readText();
                        console.log('Clipboard content verified:', clipboardText.substring(0, 100) + '...');
                    } catch (readError) {
                        console.log('Cannot read clipboard for verification (normal in some contexts)');
                    }
                } catch (clipboardError) {
                    console.error('Error copying in popup:', clipboardError);
                    showStatus('❌ Error al copiar al portapapeles', 'error');
                }
            } else {
                showStatus(response?.message || '❌ No se encontró pregunta', 'error');
            }
            
        } catch (error) {
            console.error('Error:', error);
            if (error.message.includes('Receiving end does not exist')) {
                showStatus('❌ Recarga la página de Pluralsight e intenta de nuevo', 'error');
            } else {
                showStatus('❌ Error: ' + error.message, 'error');
            }
        } finally {
            copyButton.disabled = false;
            copyButton.textContent = '📋 Copiar Pregunta Actual';
        }
    });
    
    // Event listener para el checkbox de modo automático
    autoModeCheckbox.addEventListener('change', handleAutoModeToggle);
    
    // Verificar permisos y estado de la página al abrir el popup
    updatePermissionStatus();
    loadAutoModeState();
    
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentTab = tabs[0];
        if (!currentTab.url.includes('pluralsight.com')) {
            showStatus('Navega a una página de test de Pluralsight para usar la extensión', 'info');
        } else {
            showStatus('💡 Si no funciona, recarga la página de Pluralsight primero', 'info');
        }
    });
});