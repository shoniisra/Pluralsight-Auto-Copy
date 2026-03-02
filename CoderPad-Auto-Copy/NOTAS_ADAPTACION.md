# NOTAS DE ADAPTACIÓN - CoderPad Auto Copy

## Diferencias principales con el proyecto Pluralsight

### 1. **URL objetivo**
- **Pluralsight**: `https://*.pluralsight.com/*`
- **CoderPad**: `https://screen-ide.coderpad.io/*`

### 2. **Estructura de contenido**
- **Pluralsight**: Extrae preguntas de test con múltiples opciones
- **CoderPad**: Extrae ejercicios de programación con código

### 3. **Selectores DOM**

#### Pluralsight (específicos):
```javascript
- #question-stem (pregunta)
- .stem (texto de pregunta)
- ul.answers (opciones)
- .answer (respuesta individual)
```

#### CoderPad (genéricos/adaptativos):
```javascript
- .view-line, .monaco-editor .view-line (Monaco)
- .CodeMirror-line (CodeMirror)
- .ace_line (ACE Editor)
- h1, h2, .title (títulos)
- .problem-description, .instructions (descripciones)
```

### 4. **Método de extracción**

**Pluralsight:**
- Busca elementos específicos de su plataforma
- Extrae pregunta + respuestas de forma estructurada
- Maneja bloques de código en HTML escapado

**CoderPad:**
- Detecta automáticamente el tipo de editor web
- Extrae código directamente del editor
- Múltiples métodos de fallback
- Adaptativo a cambios en la UI

### 5. **Formato de salida**

**Pluralsight:**
```
Question:
[Texto de la pregunta]

Option Answers:
1. [Respuesta 1]
2. [Respuesta 2]
...

Answer only correct option, dont give me explications
```

**CoderPad:**
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

---

## Mejoras implementadas en la versión CoderPad

### 🎯 Detección multi-editor
La versión de CoderPad detecta automáticamente 5 tipos diferentes de editores web:
1. Monaco Editor (usado por VSCode, Azure DevOps)
2. CodeMirror (usado por JSFiddle, CodePen)
3. ACE Editor (usado por Cloud9, GitHub)
4. Elementos `<pre>` y `<code>` genéricos
5. Elementos `<textarea>` simple

### 🔧 Sistema de fallback robusto
Si un método de extracción falla, automáticamente prueba el siguiente.

### 🔍 Búsqueda adaptativa
En lugar de depender de selectores específicos, busca en múltiples lugares comunes.

### ⚡ Mejor detección de cambios
- Usa hash de contenido en lugar de solo el título
- Debounce de 500ms para evitar copias duplicadas
- Observa todo el `document.body` en lugar de un elemento específico

---

## 🛠️ Personalización para otras plataformas

Si quieres adaptar esta extensión para otra plataforma de coding:

### Paso 1: Actualizar manifest.json
```json
{
  "name": "TuPlataforma Auto Copy",
  "host_permissions": [
    "https://tudominio.com/*"
  ]
}
```

### Paso 2: Actualizar selectores en content.js

**Para instrucciones** (línea ~89):
```javascript
const selectors = [
    '.tu-selector-de-instrucciones',
    '[data-tu-atributo]',
    // etc...
];
```

**Para título** (línea ~113):
```javascript
const selectors = [
    '.tu-selector-de-titulo',
    // etc...
];
```

**Para código** (línea ~23):
Agrega tu método de extracción específico.

### Paso 3: Actualizar popup.js

Cambiar la validación de URL (línea ~125):
```javascript
if (!tab.url.includes('tudominio.com')) {
    showStatus('⚠️ Esta extensión solo funciona en TuPlataforma', 'error');
    return;
}
```

---

## 📊 Comparación de complejidad

| Aspecto | Pluralsight | CoderPad |
|---------|-------------|----------|
| Selectores específicos | ✅ Alto | ⚠️ Bajo |
| Adaptabilidad | ⚠️ Baja | ✅ Alta |
| Métodos de extracción | 1 | 5+ |
| Robustez ante cambios | ⚠️ Baja | ✅ Alta |
| Casos de uso | Tests únicamente | Múltiples editores |

---

## 🔮 Futuras mejoras posibles

1. **Detección de lenguaje de programación**
   - Identificar automáticamente el lenguaje del código
   - Incluirlo en el formato de salida

2. **Historial de copias**
   - Guardar últimas N copias en storage local
   - Permitir reacceder a ejercicios anteriores

3. **Exportación a archivo**
   - Opción de guardar como .md o .txt
   - Incluir marca de tiempo y URL

4. **Integración con IAs**
   - Botones directos para ChatGPT, Claude, etc.
   - Auto-pegar y enviar

5. **Configuración de formato**
   - Permitir al usuario personalizar el formato de salida
   - Templates guardados

---

## 🎓 Lecciones aprendidas

### ✅ Hacer:
- Usar múltiples métodos de detección
- Implementar fallbacks robustos
- No depender de selectores específicos
- Usar debounce para eventos frecuentes

### ❌ Evitar:
- Selectores CSS demasiado específicos
- Asumir una estructura HTML fija
- Copiar sin validación de contenido
- Observar demasiados elementos simultáneamente

---

**Última actualización**: Febrero 2026
