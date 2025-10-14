// Content script for Pluralsight Auto Copy v1.3.0
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
        console.log('✅ Content script v1.3.0 ya está cargado');
        return;
    }
    
    window.pluralsightAutoCopy_v130 = true;
    console.log('🚀 Pluralsight Auto Copy v1.3.0 iniciado - SOLO MANUAL');

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
            
            // Extraer texto de la pregunta
            const stemElement = questionElement.querySelector('.stem p');
            if (!stemElement) {
                console.log('❌ No se encontró elemento .stem p');
                return null;
            }
            
            const questionText = stemElement.textContent.trim();
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
                // Buscar TODOS los elementos <pre> (código puede estar en múltiples <pre>)
                const preElements = button.querySelectorAll('pre');
                if (preElements.length > 0) {
                    // Combinar todos los elementos <pre> en un solo bloque de código
                    const codeLines = Array.from(preElements).map(pre => {
                        return pre.innerHTML
                            .replace(/<br>/g, '\n')
                            .replace(/&nbsp;/g, ' ')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .trim();
                    }).filter(line => line.length > 0);
                    
                    return codeLines.join('\n');
                }
                
                // Si no hay <pre>, buscar elementos <p> (texto normal)
                const pElement = button.querySelector('p');
                if (pElement) {
                    return pElement.textContent.trim();
                }
                
                // Si no hay ni <pre> ni <p>, usar el texto del botón
                return button.textContent.trim();
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

    // ÚNICO LISTENER: Solo responder a solicitudes del popup
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
        }
    });
    
    console.log('👂 Listener configurado - esperando solicitudes del popup');
    
})();
