// Content script for CoderPad Auto Copy v1.6.0
// Adaptado para capturar contenido de screen-ide.coderpad.io

(function() {
    'use strict';
    
    // LIMPIAR TODAS LAS INSTANCIAS ANTERIORES
    console.log('🧹 Limpiando instancias anteriores...');
    
    // Limpiar variables globales de versiones anteriores
    delete window.coderpadAutoCopyLoaded;
    delete window.coderpadAutoCopyObserver;
    delete window.coderpadAutoCopyText;
    delete window.coderpadAutoCopyTimestamp;
    delete window.coderpadAutoCopyActive;
    
    // Marcar como activo de manera única
    if (window.coderpadAutoCopy_v160) {
        console.log('✅ Content script v1.6.0 ya está cargado');
        return;
    }

    window.coderpadAutoCopy_v160 = true;
    console.log('🚀 CoderPad Auto Copy v1.6.0 iniciado');
    
    // Variables para el modo automático
    let autoModeEnabled = false;
    let lastContentHash = '';
    let contentObserver = null;

    // Función auxiliar para extraer código de elementos Monaco Editor o similares
    function extractCodeFromEditor() {
        let result = {
            answer: '',
            tests: '',
            combined: ''
        };
        
        // Intentar múltiples métodos de extracción comunes en editores web

        // Método 1A: Monaco Editor - puente con main-world.js (world: "MAIN")
        // El content script vive en un mundo aislado y no ve window.monaco;
        // main-world.js sí, y responde de forma síncrona vía un atributo del DOM.
        try {
            window.dispatchEvent(new CustomEvent('__coderpadMonacoRequest'));

            const raw = document.documentElement.getAttribute('data-coderpad-monaco');
            document.documentElement.removeAttribute('data-coderpad-monaco');

            if (raw) {
                const models = JSON.parse(raw);
                console.log(`📝 Encontrados ${models.length} modelos de Monaco Editor`);

                models.forEach(data => {
                    if (data.uri.includes('.test.')) {
                        result.tests = data.content;
                        console.log(`✅ Tests extraídos completamente (${data.content.length} chars)`);
                    } else if (data.uri.includes('answer')) {
                        result.answer = data.content;
                        console.log(`✅ Código de respuesta extraído completamente (${data.content.length} chars)`);
                    } else if (!result.combined) {
                        result.combined = data.content;
                        console.log(`✅ Código extraído completamente (${data.content.length} chars)`);
                    }
                });

                if (result.answer || result.tests || result.combined) {
                    return result;
                }
            }
        } catch (error) {
            console.log('⚠️ No se pudo extraer Monaco vía puente main-world:', error.message);
        }

        // Método 1B: Monaco Editor - Usar view-lines como fallback (puede estar incompleto)
        const monacoEditors = document.querySelectorAll('.monaco-editor[role="code"]');
        if (monacoEditors.length > 0) {
            console.log(`🔍 Intentando extracción por view-lines (método fallback)`);
            
            monacoEditors.forEach((editor) => {
                const dataUri = editor.getAttribute('data-uri') || '';
                const ariaLabel = editor.querySelector('[aria-label*="editor content"]')?.getAttribute('aria-label') || '';
                
                // Extraer todas las líneas de código de este editor específico
                const viewLines = editor.querySelectorAll('.view-line');
                if (viewLines.length > 0) {
                    const code = Array.from(viewLines).map(line => line.textContent).join('\n').trim();
                    
                    // Determinar si es código de respuesta o tests
                    if (dataUri.includes('.test.') || ariaLabel.toLowerCase().includes('test')) {
                        if (!result.tests) { // Solo si no lo obtuvimos del modelo
                            result.tests = code;
                            console.log(`📝 Tests extraídos por view-lines (${code.length} chars) - puede estar incompleto`);
                        }
                    } else if (dataUri.includes('answer') || ariaLabel.toLowerCase().includes('answer')) {
                        if (!result.answer) {
                            result.answer = code;
                            console.log(`📝 Código extraído por view-lines (${code.length} chars) - puede estar incompleto`);
                        }
                    } else if (!result.combined) {
                        result.combined = code;
                        console.log(`📝 Código extraído por view-lines (${code.length} chars) - puede estar incompleto`);
                    }
                }
            });
            
            if (result.answer || result.tests || result.combined) {
                return result;
            }
        }
        
        // Si no hay Monaco, intentar otros métodos y retornar como combinado
        
        // Método 2: CodeMirror (otro editor popular)
        const codeMirrorLines = document.querySelectorAll('.CodeMirror-line');
        if (codeMirrorLines.length > 0) {
            result.combined = Array.from(codeMirrorLines).map(line => line.textContent).join('\n').trim();
            console.log('📝 Código extraído de CodeMirror');
            return result;
        }
        
        // Método 3: ACE Editor
        const aceEditor = document.querySelector('.ace_editor');
        if (aceEditor) {
            const aceLines = aceEditor.querySelectorAll('.ace_line');
            if (aceLines.length > 0) {
                result.combined = Array.from(aceLines).map(line => line.textContent).join('\n').trim();
                console.log('📝 Código extraído de ACE Editor');
                return result;
            }
        }
        
        // Método 4: Buscar elementos <pre> o <code> genéricos
        const preElements = document.querySelectorAll('pre, code');
        if (preElements.length > 0) {
            // Obtener el elemento <pre> o <code> más largo (probablemente el editor principal)
            const longestPre = Array.from(preElements).reduce((longest, current) => {
                return current.textContent.length > longest.textContent.length ? current : longest;
            });
            result.combined = longestPre.textContent.trim();
            console.log('📝 Código extraído de elemento <pre>/<code>');
            return result;
        }
        
        // Método 5: Buscar textarea (editor simple)
        const textareas = document.querySelectorAll('textarea:not(.ime-text-area)');
        if (textareas.length > 0) {
            const longestTextarea = Array.from(textareas).reduce((longest, current) => {
                return current.value.length > longest.value.length ? current : longest;
            });
            result.combined = longestTextarea.value.trim();
            console.log('📝 Código extraído de textarea');
            return result;
        }
        
        console.log('⚠️ No se pudo encontrar código en ningún editor conocido');
        return result;
    }

    // Función para extraer instrucciones/descripción del problema
    function extractInstructions() {
        let instructions = '';
        
        // Buscar áreas comunes donde se encuentran las instrucciones
        const selectors = [
            '[data-test="QuestionInstructionsContent"]',  // CoderPad específico para ejercicios de código
            '[data-test="QuestionText"]',  // CoderPad específico para preguntas MCQ
            '[class*="QuestionInstructions"]',
            '[class*="QuestionText"]',
            '[class*="question"]',
            '.problem-description',
            '.instructions',
            '.task-description',
            '[class*="description"]',
            '[class*="instruction"]',
            '[class*="problem"]',
            '[class*="task"]',
            '[role="heading"] + div',  // Div después de encabezado
            'article',
            '.content',
            'main'
        ];
        
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                // Tomar el primer elemento que tenga contenido significativo
                for (const elem of elements) {
                    const text = elem.textContent.trim();
                    // Reducir la longitud mínima a 10 y ser menos restrictivo
                    // Solo filtrar si es claramente código puro (no texto con código en <code> tags)
                    const hasCodeTags = elem.querySelector('code') !== null;
                    const isPlainCode = !hasCodeTags && (
                        text.startsWith('function') || 
                        text.startsWith('const ') || 
                        text.startsWith('import ') ||
                        text.startsWith('class ') ||
                        text.startsWith('export ')
                    );
                    
                    if (text.length > 10 && !isPlainCode) {
                        instructions = text;
                        console.log(`📋 Instrucciones encontradas con selector: ${selector} (${text.length} caracteres)`);
                        break;
                    }
                }
                if (instructions) break;
            }
        }
        
        // Si aún no hay instrucciones, intentar buscar cualquier texto de párrafo
        if (!instructions) {
            const paragraphs = document.querySelectorAll('p, div[class*="text"]');
            for (const p of paragraphs) {
                const text = p.textContent.trim();
                if (text.length > 20 && !text.startsWith('function') && !text.startsWith('const')) {
                    instructions = text;
                    console.log(`📋 Instrucciones encontradas en párrafo (${text.length} caracteres)`);
                    break;
                }
            }
        }
        
        return instructions;
    }

    // Función para extraer título/nombre del ejercicio
    function extractTitle() {
        let title = '';
        
        // Buscar en elementos comunes de título
        const selectors = [
            'h1',
            'h2',
            '.title',
            '.problem-title',
            '.exercise-title',
            '[class*="title"]'
        ];
        
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                const text = elements[0].textContent.trim();
                if (text.length > 0 && text.length < 200) {
                    title = text;
                    console.log(`🏷️ Título encontrado con selector: ${selector}`);
                    break;
                }
            }
        }
        
        return title;
    }

    // Función para extraer opciones de respuesta (answer choices)
    function extractAnswerOptions() {
        let options = [];
        
        try {
            // Buscar opciones de respuesta en múltiples selectores
            const selectors = [
                '[data-test="AnswerMcqChoice"]',  // CoderPad específico
                'label.MuiFormControlLabel-root',
                '[class*="AnswerMcq"]',
                '[class*="answer"]',
                '[class*="option"]',
                '[class*="choice"]',
                'input[type="checkbox"] + label',
                'input[type="radio"] + label',
                '[role="radiogroup"] label',
                '[role="group"] label'
            ];
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                
                if (elements.length > 0) {
                    console.log(`🔍 Encontradas ${elements.length} opciones con selector: ${selector}`);
                    
                    elements.forEach((elem, index) => {
                        let optionText = '';
                        
                        // Intentar obtener el texto de diferentes formas
                        // 1. Buscar en spans con clase MuiFormControlLabel-label
                        const labelSpan = elem.querySelector('.MuiFormControlLabel-label');
                        if (labelSpan) {
                            optionText = labelSpan.textContent.trim();
                        }
                        
                        // 2. Buscar en todos los elementos span internos y tomar el más largo
                        if (!optionText) {
                            const spans = elem.querySelectorAll('span');
                            let longestSpan = '';
                            spans.forEach(span => {
                                const text = span.textContent.trim();
                                if (text.length > longestSpan.length && !text.includes('Mui')) {
                                    longestSpan = text;
                                }
                            });
                            if (longestSpan) optionText = longestSpan;
                        }
                        
                        // 3. Buscar en divs internos
                        if (!optionText) {
                            const divs = elem.querySelectorAll('div');
                            for (const div of divs) {
                                const text = div.textContent.trim();
                                if (text && text.length > 0 && !text.includes('Mui')) {
                                    optionText = text;
                                    break;
                                }
                            }
                        }
                        
                        // 4. Como último recurso, obtener todo el texto del elemento
                        if (!optionText) {
                            optionText = elem.textContent.trim();
                        }
                        
                        // Limpiar el texto de caracteres innecesarios
                        optionText = optionText.replace(/\s+/g, ' ').trim();
                        
                        // Cambiar el filtro para aceptar incluso opciones de 1 caracter
                        if (optionText && optionText.length >= 1) {
                            options.push({
                                index: index + 1,
                                text: optionText
                            });
                            console.log(`  ➜ Opción ${index + 1}: "${optionText.substring(0, 50)}${optionText.length > 50 ? '...' : ''}"`);
                        }
                    });
                    
                    if (options.length > 0) {
                        console.log(`✅ ${options.length} opciones de respuesta extraídas exitosamente`);
                        break;
                    }
                }
            }
            
            // Si no se encontraron opciones, loguear para debugging
            if (options.length === 0) {
                console.log('⚠️ No se encontraron opciones de respuesta (pregunta de texto libre)');
            }
        } catch (error) {
            console.error('❌ Error extrayendo opciones de respuesta:', error);
        }
        
        return options;
    }

    // FUNCIÓN ÚNICA: Extraer contenido cuando se solicite desde el popup
    function extractContentData() {
        try {
            console.log('🔍 Extrayendo contenido de CoderPad...');
            
            const title = extractTitle();
            const instructions = extractInstructions();
            const codeData = extractCodeFromEditor();
            const answerOptions = extractAnswerOptions();
            
            // Validar que al menos tengamos algo de contenido
            if (!codeData.answer && !codeData.tests && !codeData.combined && !instructions && answerOptions.length === 0) {
                console.log('❌ No se encontró contenido para copiar');
                return null;
            }
            
            console.log('✅ Contenido extraído:', {
                hasTitle: !!title,
                titleLength: title ? title.length : 0,
                hasInstructions: !!instructions,
                instructionsLength: instructions ? instructions.length : 0,
                hasAnswerCode: !!codeData.answer,
                answerCodeLength: codeData.answer ? codeData.answer.length : 0,
                hasTests: !!codeData.tests,
                testsLength: codeData.tests ? codeData.tests.length : 0,
                hasCombinedCode: !!codeData.combined,
                combinedCodeLength: codeData.combined ? codeData.combined.length : 0,
                answerOptionsCount: answerOptions.length
            });
            
            // Log más detallado para debugging
            if (instructions) {
                console.log(`📝 Pregunta/Instrucciones (primeros 100 chars): ${instructions.substring(0, 100)}...`);
            }
            if (answerOptions.length === 0 && !codeData.answer && !codeData.tests && !codeData.combined) {
                console.log('ℹ️ Sin opciones de respuesta ni código - probablemente pregunta de texto libre');
            }
            
            return {
                title: title,
                instructions: instructions,
                codeData: codeData,
                answerOptions: answerOptions
            };
            
        } catch (error) {
            console.error('❌ Error extrayendo datos:', error);
            return null;
        }
    }

    // Función para generar un hash simple del contenido (para detectar cambios)
    function getContentHash() {
        try {
            const title = extractTitle();
            const instructions = extractInstructions();
            const codeData = extractCodeFromEditor();
            
            // Crear un hash simple concatenando y tomando una muestra
            const code = codeData.answer || codeData.combined || '';
            const combined = `${title}|${instructions.substring(0, 100)}|${code.substring(0, 100)}`;
            return combined;
        } catch (error) {
            return '';
        }
    }

    // Función para iniciar el modo automático
    function startAutoMode() {
        console.log('🤖 Iniciando modo automático...');
        
        // Obtener contenido inicial
        lastContentHash = getContentHash();
        
        // Configurar observer para detectar cambios en el documento
        const targetNode = document.body;
        
        if (!targetNode) {
            console.log('❌ No se encontró elemento para observar');
            return;
        }
        
        contentObserver = new MutationObserver((mutations) => {
            // Debounce: no verificar en cada mutación individual
            clearTimeout(contentObserver.debounceTimer);
            contentObserver.debounceTimer = setTimeout(() => {
                const currentHash = getContentHash();
                
                // Solo actuar si el contenido cambió significativamente
                if (currentHash && currentHash !== lastContentHash && currentHash.length > 50) {
                    console.log('🔍 Nuevo contenido detectado automáticamente');
                    lastContentHash = currentHash;
                    
                    // Esperar un poco para que el DOM se estabilice
                    setTimeout(() => {
                        const data = extractContentData();
                        if (data) {
                            const formattedText = formatContent(data);
                            
                            // Delegar la copia al background (offscreen document):
                            // navigator.clipboard falla aquí si la pestaña no tiene foco
                            chrome.runtime.sendMessage({
                                action: 'copyToClipboard',
                                text: formattedText
                            }, (response) => {
                                if (response && response.success) {
                                    console.log('✅ Contenido copiado automáticamente');
                                } else {
                                    console.log('⚠️ No se pudo copiar automáticamente:', response?.error);
                                }
                            });
                        }
                    }, 1000);
                }
            }, 500); // Esperar 500ms después de la última mutación
        });
        
        // Observar cambios en todo el body
        contentObserver.observe(targetNode, {
            childList: true,
            subtree: true,
            characterData: true
        });
        
        console.log('👀 Modo automático activado - observando cambios en contenido');
    }

    // Función para detener el modo automático
    function stopAutoMode() {
        console.log('🛑 Deteniendo modo automático...');
        
        if (contentObserver) {
            clearTimeout(contentObserver.debounceTimer);
            contentObserver.disconnect();
            contentObserver = null;
        }
        
        lastContentHash = '';
        console.log('✅ Modo automático desactivado');
    }

    // Función para formatear el contenido extraído
    function formatContent(data) {
        let formatted = '';
        
        if (data.title) {
            formatted += `Title:\n${data.title}\n\n`;
        }
        
        if (data.instructions) {
            formatted += `Instructions:\n${data.instructions}\n\n`;
        }
        
        // Formatear código según lo que hayamos encontrado
        if (data.codeData) {
            // Si hay código de respuesta específico
            if (data.codeData.answer) {
                formatted += `Answer Code:\n\`\`\`\n${data.codeData.answer}\n\`\`\`\n\n`;
            }
            
            // Si hay tests específicos
            if (data.codeData.tests) {
                formatted += `Test Code:\n\`\`\`\n${data.codeData.tests}\n\`\`\`\n\n`;
            }
            
            // Si solo hay código combinado (no separado)
            if (data.codeData.combined && !data.codeData.answer && !data.codeData.tests) {
                formatted += `Code:\n\`\`\`\n${data.codeData.combined}\n\`\`\`\n\n`;
            }
        }
        
        // Agregar opciones de respuesta si existen
        if (data.answerOptions && data.answerOptions.length > 0) {
            formatted += `Answer Options:\n`;
            const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
            data.answerOptions.forEach((option, index) => {
                const letter = letters[index] || (index + 1).toString();
                formatted += `${letter}) ${option.text}\n`;
            });
            formatted += '\n';
        }
        
        // Agregar una instrucción de ayuda para IA
        formatted += 'Please help me with this coding challenge. Explain the solution and provide the complete working code.';
        
        return formatted;
    }

    // LISTENERS: Responder a solicitudes del popup y modo automático
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('📨 Mensaje recibido:', message);
        
        if (message.action === 'getQuestionText') {
            const data = extractContentData();
            
            if (!data) {
                console.log('❌ No se pudo extraer el contenido');
                sendResponse({
                    success: false,
                    text: '',
                    message: 'No se encontró contenido válido en esta página'
                });
                return;
            }
            
            const formattedText = formatContent(data);
            
            console.log('✅ Contenido extraído exitosamente');
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
    // (mismo storage que usa el popup: chrome.storage.local)
    chrome.storage.local.get(['autoModeEnabled'], (result) => {
        if (result.autoModeEnabled) {
            console.log('🚀 Restaurando modo automático desde storage');
            setTimeout(() => {
                startAutoMode();
            }, 2000); // Esperar a que la página cargue completamente
        }
    });
    
})();
