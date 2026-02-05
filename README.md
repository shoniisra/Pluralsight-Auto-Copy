# Pluralsight Auto Copy

## Versión 1.3.4 - Soporte Mejorado para Bloques de Código

### Cambios Realizados

#### ✨ Mejoras principales:

1. **Nueva función auxiliar `extractTextWithCode()`**
   - Extrae texto de elementos incluyendo bloques de código
   - Maneja elementos `<pre>` y `<code>` correctamente
   - Preserva saltos de línea del código
   - Formatea código entre triple backticks (```markdown)

2. **Mejorada función `extractQuestionData()`**
   - Ahora busca código tanto en la pregunta como en las respuestas
   - Detecta elementos `<pre>` directos en `.stem`
   - Maneja múltiples elementos `<pre>` en una respuesta
   - Decodifica entidades HTML: `&lt;`, `&gt;`, `&nbsp;`, `&amp;`
   - Maneja líneas con `<br>` y `<br />` correctamente

3. **Mejorada función `getQuestionTitle()`**
   - Funciona correctamente con preguntas que contienen código
   - Detecta cambios en preguntas más confiablemente
   - Fallback a texto general si no encuentra párrafos

### Casos de uso soportados:

✅ Preguntas con bloques de código inline  
✅ Respuestas con bloques de código  
✅ Código con HTML escapado (`&lt;`, `&gt;`)  
✅ Código con espacios especiales (`&nbsp;`)  
✅ Código con saltos de línea (`<br>`)  
✅ Múltiples bloques de código en la misma pregunta/respuesta  

### Formato de salida:

```
Question:
[Texto de la pregunta con código embebido entre ```]

Option Answers:
1. [Respuesta 1]
2. [Respuesta 2]
3. [Respuesta 3]
...

Answer only correct option, dont give me explications
```

### Cómo usar:

1. Haz clic en el botón "📋 Copiar Pregunta Actual" para copiar la pregunta y respuestas
2. O habilita "Modo automático" para copiar cada nueva pregunta automáticamente
3. La pregunta se copia con todos los bloques de código formateados correctamente
