/**
 * ide.js - Configuración adicional o plugins que puedas necesitar para el editor
 * Por ejemplo, integraciones de autocompletado para lenguaje declarativo tipo MiniZinc
 */

// Si usaras Monaco Editor o CodeMirror en el futuro, se inicializaría aquí.
// Por ahora usamos un textarea sencillo en index.html.

function getProblemContext() {
    // Función auxiliar extraída de main.js si quieres parseos locales
    return document.getElementById('code-editor').value;
}
