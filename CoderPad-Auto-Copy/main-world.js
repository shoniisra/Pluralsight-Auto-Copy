// Se ejecuta en el mundo MAIN de la página (world: "MAIN" en el manifest),
// donde sí existe el objeto global `monaco`. El content script (mundo aislado)
// no puede verlo, así que este puente expone los modelos de Monaco a través
// del DOM compartido: recibe una solicitud vía CustomEvent y deja el resultado
// serializado en un atributo de <html>, que ambos mundos pueden leer.

(function() {
    'use strict';

    window.addEventListener('__coderpadMonacoRequest', () => {
        let payload = '[]';

        try {
            if (typeof monaco !== 'undefined' && monaco.editor) {
                payload = JSON.stringify(monaco.editor.getModels().map(model => ({
                    uri: model.uri.toString(),
                    content: model.getValue()
                })));
            }
        } catch (error) {
            // Sin acceso a Monaco: se devuelve la lista vacía
        }

        document.documentElement.setAttribute('data-coderpad-monaco', payload);
    });
})();
