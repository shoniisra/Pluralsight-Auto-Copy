# CoderPad Auto Copy

## Versión 1.5.0 - Extensión para CoderPad

### 📋 Descripción

Extensión de Chrome que permite copiar automáticamente el contenido de ejercicios de CoderPad (https://screen-ide.coderpad.io) al portapapeles, incluyendo:

- **Título del ejercicio**
- **Instrucciones/descripción del problema**
- **Código del editor**

Esta es una variante del proyecto original [Pluralsight Auto Copy](../Pluralsight-Auto-Copy-master), adaptada específicamente para funcionar con CoderPad.

---

### ✨ Características

#### 🔍 Extracción inteligente de código
La extensión detecta y extrae código de múltiples tipos de editores web:
- **Monaco Editor** (usado por VSCode online)
- **CodeMirror**
- **ACE Editor**
- Elementos `<pre>`, `<code>` y `<textarea>`

#### 🤖 Modo automático
- Detecta automáticamente cuando cambia el contenido de la página
- Copia el nuevo contenido al portapapeles sin intervención manual
- Utiliza un sistema de debounce para evitar copias duplicadas

#### 📋 Copia manual
- Botón para copiar el contenido actual cuando lo necesites
- Indicadores visuales de estado

---

### 🚀 Instalación

1. **Descarga o clona este repositorio**

2. **Abre Chrome y navega a:**
   ```
   chrome://extensions/
   ```

3. **Activa el "Modo de desarrollador"** (esquina superior derecha)

4. **Haz clic en "Cargar extensión sin empaquetar"**

5. **Selecciona la carpeta** `CoderPad-Auto-Copy`

6. **¡Listo!** La extensión aparecerá en tu barra de herramientas

---

### 📖 Cómo usar

#### Primera vez:
1. Haz clic en el icono de la extensión
2. Haz clic en "🔐 Conceder Permisos" para permitir acceso al portapapeles
3. Los permisos se solicitarán solo una vez

#### Uso normal:

**Opción 1: Modo Manual**
1. Navega a un ejercicio en https://screen-ide.coderpad.io
2. Haz clic en el icono de la extensión
3. Haz clic en "📋 Copiar Contenido Actual"
4. El contenido se copia automáticamente al portapapeles

**Opción 2: Modo Automático**
1. Haz clic en el icono de la extensión
2. Activa "Habilitar Modo automático"
3. Cada vez que cambies de ejercicio o el contenido cambie, se copiará automáticamente

---

### 📄 Formato de salida

El contenido se copia con el siguiente formato:

```
Title:
[Nombre del ejercicio]

Instructions:
[Descripción del problema]

Code:
```
[Código del editor]
```

Please help me with this coding challenge. Explain the solution and provide the complete working code.
```

Este formato está optimizado para pegarse directamente en ChatGPT, Claude u otras IAs.

---

### 🛠️ Estructura del proyecto

```
CoderPad-Auto-Copy/
├── manifest.json      # Configuración de la extensión
├── background.js      # Service worker para portapapeles
├── content.js         # Script de extracción de contenido
├── popup.html         # Interfaz de usuario
├── popup.js           # Lógica de la interfaz
└── README.md          # Este archivo
```

---

### 🔧 Características técnicas

#### Arquitectura Manifest V3
- Utiliza Service Workers en lugar de páginas de fondo
- Permisos de portapapeles opcionales
- Content scripts inyectados dinámicamente

#### Extracción adaptativa
- Detecta múltiples tipos de editores de código web
- Sistema de fallback si no encuentra el editor esperado
- Extracción recursiva de elementos DOM

#### Detección de cambios
- MutationObserver para detectar cambios en el DOM
- Sistema de hash para evitar copias duplicadas
- Debounce de 500ms para estabilidad

---

### 🐛 Solución de problemas

**La extensión no copia nada:**
1. Recarga la página de CoderPad
2. Asegúrate de haber concedido permisos de portapapeles
3. Abre la consola del navegador (F12) y busca mensajes de error

**El código no se extrae correctamente:**
- CoderPad utiliza diferentes editores según la configuración
- La extensión intentará múltiples métodos de extracción
- Si falla, abre un issue con detalles del problema

**El modo automático no funciona:**
1. Desactiva y reactiva el modo automático
2. Recarga la página de CoderPad
3. Verifica en la consola que el observer esté activo

---

### 🔒 Permisos

La extensión solicita los siguientes permisos:

- **activeTab**: Para interactuar con la pestaña actual de CoderPad
- **tabs**: Para verificar URLs y gestionar pestañas
- **scripting**: Para inyectar el content script
- **clipboardWrite** (opcional): Para copiar al portapapeles
- **Host permissions**: Solo para `https://screen-ide.coderpad.io/*`

---

### 📝 Notas para desarrolladores

#### Modificar selectores:
Si CoderPad cambia su estructura HTML, puedes actualizar los selectores en `content.js`:

```javascript
// Buscar instrucciones (línea ~89)
const selectors = [
    '.problem-description',
    '.instructions',
    // Agrega tus selectores aquí
];

// Buscar título (línea ~113)
const selectors = [
    'h1',
    'h2',
    // Agrega tus selectores aquí
];
```

#### Agregar soporte para otros editores:
En la función `extractCodeFromEditor()` (línea ~23), agrega tu método de extracción:

```javascript
// Método N: Tu editor
const tuEditor = document.querySelector('.tu-selector');
if (tuEditor) {
    code = tuEditor.textContent;
    return code.trim();
}
```

---

### 📜 Licencia

Este proyecto es de código abierto y está disponible para uso personal y educativo.

---

### 🙏 Créditos

Basado en el proyecto original **Pluralsight Auto Copy** por [Johnny].

Adaptado para CoderPad con mejoras en:
- Detección multi-editor
- Extracción adaptativa de contenido
- Formato optimizado para IAs

---

### 📧 Soporte

Si encuentras algún problema o tienes sugerencias:
1. Abre un issue en el repositorio
2. Proporciona detalles sobre el problema
3. Incluye capturas de pantalla si es posible

---

### 🔄 Versiones

**v1.0.0** (Febrero 2026)
- Primera versión
- Soporte para múltiples editores web
- Modo automático y manual
- Formato optimizado para IAs
