// Content script for Pluralsight Auto Copy v1.3.4
// SOLO funciona con clic manual - NO hay detección automática

(function() {
    'use strict';
    
    // LIMPIAR TODAS LAS INSTANCIAS ANTERIORES
    console.log('🧹 Limpiando instancias anteriores...');
    
    // Limpiar variables globales de versiones anteriores
    delete window.pluralsightAutoCopyLoaded;
    delete window.pluralsightAutoCopyObserver;
    delete window.pluralsightAutoCopyText;
    delete window.pluralsightAutoCopyTimestamp;
    delete window.pluralsightAutoCopyActive;
    
    // Marcar como activo de manera única
    if (window.pluralsightAutoCopy_v130) {
        console.log('✅ Content script v1.3.4 ya está cargado');
        return;
    }
    
    window.pluralsightAutoCopy_v130 = true;
    console.log('🚀 Pluralsight Auto Copy v1.3.4 iniciado');
    
    // Variables para el modo automático
    let autoModeEnabled = false;
    let lastQuestionTitle = '';
    let questionObserver = null;

    // Función auxiliar para extraer texto de un elemento incluyendo código
    function extractTextWithCode(element) {
        if (!element) return '';
        
        let result = '';
        
        // Iterar sobre todos los nodos del elemento
        for (let node of element.childNodes) {
            if (node.nodeType === 3) { // Nodo de texto
                result += node.textContent;
            } else if (node.nodeType === 1) { // Nodo elemento
                if (node.tagName === 'PRE' || node.tagName === 'CODE') {
                    // Extraer código con saltos de línea preservados
                    const codeText = node.textContent.trim();
                    result += '\n```\n' + codeText + '\n```\n';
                } else if (node.tagName === 'BR') {
                    result += '\n';
                } else {
                    // Recursivamente extraer de elementos internos
                    result += extractTextWithCode(node);
                }
            }
        }
        
        return result.trim();
    }

    // FUNCIÓN ÚNICA: Extraer pregunta cuando se solicite desde el popup
    function extractQuestionData() {
        try {
            console.log('🔍 Extrayendo pregunta por solicitud del popup...');
            
            // Buscar la pregunta
            const questionElement = document.getElementById('question-stem');
            if (!questionElement) {
                console.log('❌ No se encontró elemento #question-stem');
                return null;
            }
            
            // Extraer texto de la pregunta (incluyendo código)
            const stemElement = questionElement.querySelector('.stem');
            if (!stemElement) {
                console.log('❌ No se encontró elemento .stem');
                return null;
            }
            
            // Extraer la pregunta con código embebido
            let questionText = '';
            
            // Buscar párrafos principales
            const pElements = stemElement.querySelectorAll('p');
            if (pElements.length > 0) {
                questionText = Array.from(pElements).map(p => extractTextWithCode(p)).filter(t => t).join('\n');
            }
            
            // También buscar elementos <pre> directos en .stem que no estén en <p>
            const preElements = stemElement.querySelectorAll('pre');
            if (preElements.length > 0) {
                Array.from(preElements).forEach(pre => {
                    const codeText = pre.textContent.trim();
                    if (codeText && !questionText.includes(codeText)) {
                        questionText += '\n```\n' + codeText + '\n```\n';
                    }
                });
            }
            
            questionText = questionText.trim();
            
            if (!questionText) {
                console.log('❌ No se pudo extraer el texto de la pregunta');
                return null;
            }
            
            console.log('📝 Pregunta encontrada:', questionText.substring(0, 50) + '...');
            
            // Extraer respuestas
            const answersContainer = document.querySelector('ul.answers');
            if (!answersContainer) {
                console.log('❌ No se encontró contenedor de respuestas');
                return null;
            }
            
            // Buscar tanto elementos <p> como <pre> para capturar respuestas de texto y código
            const answerButtons = answersContainer.querySelectorAll('.answer');
            const answers = Array.from(answerButtons).map(button => {
                let answerText = '';
                
                // Primero buscar elementos <pre> (código)
                const preElements = button.querySelectorAll('pre');
                if (preElements.length > 0) {
                    const codeLines = Array.from(preElements).map(pre => {
                        return pre.innerHTML
                            .replace(/<br>/g, '\n')
                            .replace(/<br \/>/g, '\n')
                            .replace(/&nbsp;/g, ' ')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&amp;/g, '&')
                            .trim();
                    }).filter(line => line.length > 0);
                    
                    answerText = codeLines.join('\n');
                } else {
                    // Si no hay <pre>, buscar elementos <p> y otros elementos de texto
                    const pElements = button.querySelectorAll('p');
                    if (pElements.length > 0) {
                        answerText = Array.from(pElements).map(p => p.textContent.trim()).filter(t => t).join('\n');
                    } else {
                        // Extraer todo el texto disponible, excluyendo elementos de control
                        const tempDiv = document.createElement('div');
                        // Clonar el contenido para no afectar el DOM original
                        for (let child of button.childNodes) {
                            if (child.nodeType === 3 || (child.nodeType === 1 && !['INPUT', 'BUTTON', 'LABEL'].includes(child.tagName))) {
                                tempDiv.appendChild(child.cloneNode(true));
                            }
                        }
                        answerText = tempDiv.textContent.trim();
                    }
                }
                
                return answerText;
            }).filter(text => text.length > 0);
            
            console.log('📋 Respuestas encontradas:', answers.length);
            
            if (questionText && answers.length > 0) {
                return {
                    question: questionText,
                    answers: answers
                };
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error extrayendo datos:', error);
            return null;
        }
    }

    // Función para extraer solo el título de la pregunta (para comparación)
    function getQuestionTitle() {
        try {
            const questionElement = document.getElementById('question-stem');
            if (!questionElement) return '';
            
            const stemElement = questionElement.querySelector('.stem');
            if (!stemElement) return '';
            
            // Obtener el primer párrafo como referencia de cambio
            const firstPElement = stemElement.querySelector('p');
            if (firstPElement) {
                return firstPElement.textContent.trim();
            }
            
            // Fallback: obtener todo el texto del stem
            return stemElement.textContent.trim().substring(0, 100);
        } catch (error) {
            return '';
        }
    }

    // Función para iniciar el modo automático
    function startAutoMode() {
        console.log('🤖 Iniciando modo automático...');
        
        // Obtener título inicial
        lastQuestionTitle = getQuestionTitle();
        
        // Configurar observer solo para el título de la pregunta
        const questionStemElement = document.getElementById('question-stem');
        if (!questionStemElement) {
            console.log('❌ No se encontró elemento para observar');
            return;
        }
        
        questionObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Solo procesar cambios en texto, no en atributos
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    const currentTitle = getQuestionTitle();
                    
                    // Solo actuar si el título cambió realmente
                    if (currentTitle && currentTitle !== lastQuestionTitle && currentTitle.length > 10) {
                        console.log('🔍 Nueva pregunta detectada automáticamente:', currentTitle.substring(0, 50) + '...');
                        lastQuestionTitle = currentTitle;
                        
                        // Esperar un poco para que el DOM se estabilice
                        setTimeout(() => {
                            const data = extractQuestionData();
                            if (data) {
                                const formattedText = `Question:\n${data.question}\n\n Option Answers:\n${data.answers.map((answer, index) => `${index + 1}. ${answer}`).join('\n')} 
            \n\n Answer only correct option, dont give me explications`;
                                
                                // Copiar automáticamente al portapapeles usando la API
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                    navigator.clipboard.writeText(formattedText).then(() => {
                                        console.log('✅ Pregunta copiada automáticamente');
                                    }).catch((error) => {
                                        console.log('⚠️ No se pudo copiar automáticamente, usar botón manual');
                                    });
                                }
                            }
                        }, 1000);
                    }
                }
            });
        });
        
        // Observar solo el contenedor de la pregunta
        questionObserver.observe(questionStemElement, {
            childList: true,
            subtree: true,
            characterData: true
        });
        
        console.log('👀 Modo automático activado - observando cambios en preguntas');
    }

    // Función para detener el modo automático
    function stopAutoMode() {
        console.log('🛑 Deteniendo modo automático...');
        
        if (questionObserver) {
            questionObserver.disconnect();
            questionObserver = null;
        }
        
        lastQuestionTitle = '';
        console.log('✅ Modo automático desactivado');
    }

    // LISTENERS: Responder a solicitudes del popup y modo automático
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('📨 Mensaje recibido:', message);
        
        if (message.action === 'getQuestionText') {
            const data = extractQuestionData();
            
            if (!data) {
                console.log('❌ No se pudo extraer la pregunta');
                sendResponse({
                    success: false,
                    text: '',
                    message: 'No se encontró pregunta válida en esta página'
                });
                return;
            }
            
            const formattedText = `Question:\n${data.question}\n\n Option Answers:\n${data.answers.map((answer, index) => `${index + 1}. ${answer}`).join('\n')} 
            \n\n Answer only correct option, dont give me explications`;
            
            console.log('✅ Pregunta extraída exitosamente');
            console.log('📄 Contenido formateado:', formattedText.substring(0, 100) + '...');
            
            sendResponse({
                success: true,
                text: formattedText,
                timestamp: Date.now()
            });
        } else if (message.action === 'toggleAutoMode') {
            console.log('🔄 Cambiando modo automático:', message.enabled);
            
            if (message.enabled) {
                startAutoMode();
            } else {
                stopAutoMode();
            }
            
            sendResponse({ success: true });
        }
        
        return true; // Mantener canal abierto para respuesta asíncrona
    });
    
    console.log('👂 Listener configurado - esperando solicitudes del popup');
    
    // Inicializar estado del modo automático al cargar la página
    chrome.storage.sync.get(['autoModeEnabled'], (result) => {
        if (result.autoModeEnabled) {
            console.log('🚀 Restaurando modo automático desde storage');
            setTimeout(() => {
                startAutoMode();
            }, 2000); // Esperar a que la página cargue completamente
        }
    });
    
})();
