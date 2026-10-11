/**
 * Configuración global del gráfico de barras 3D y la escena Three.js.
 * Todos los parámetros visuales, colores, intensidades y bordes se pueden modificar aquí.
 */
export const config = {
  // Dimensiones y espaciado de las columnas
  bar: {
    width: 1.2,           // Ancho de cada barra (eje X)
    depth: 1.2,           // Profundidad de cada barra (eje Z)
    maxHeight: 9.0,       // Altura máxima cuando el valor de la época es 1.0
    minHeight: 0.15,      // Altura mínima para mantener visibilidad si el valor es 0.0
    spacing: 0.6,         // Espacio entre barras contiguas
  },

  // Paleta de colores Neón y acabado translúcido
  colors: {
    background: 0x060913, // Fondo oscuro profundo para máximo contraste del neón
    ground: 0x0a101d,     // Base de la plataforma
    grid: 0x162238,       // Rejilla de soporte

    // Colores Neón del cuerpo de la columna
    neonGreen: 0x00ff66,          // Verde neón eléctrico fuerte
    neonGreenEmissive: 0x00ee55,  // Emisión verde vibrante

    neonYellow: 0xffea00,         // Amarillo neón eléctrico fuerte
    neonYellowEmissive: 0xffd700, // Emisión amarilla intensa para el ganador

    // Propiedades del material translúcido
    opacity: 0.72,                // Nivel de translucidez del cuerpo
    roughness: 0.12,              // Superficie pulida y cristalina
    metalness: 0.15,              // Metálico sutil
    emissiveIntensity: 0.85,      // Resplandor neón base
    winnerEmissiveIntensity: 1.6, // Resplandor súper reforzado para la barra ganadora
  },

  // Configuración de los bordes de las columnas
  edges: {
    enabled: true,
    opacity: 1.0,
    greenColor: 0x39ff14,
    yellowColor: 0xffff33,
  },

  // Acentos visuales y luces de realce neón
  effects: {
    topCapGlow: true,
    topCapOpacity: 0.95,
    baseGlowRing: true,
    winnerSpotlight: true,
    winnerSpotlightIntensity: 4.5,
  },

  // Parámetros de animación y transiciones
  animation: {
    epochDuration: 0.1,   // Duración en segundos por época (ritmo suave y visible)
    lerpFactor: 0.35,     // Suavizado ágil por cuadro para alta velocidad
    loop: false,          // Detener automáticamente al llegar al último shot
    autoPlay: true,       // Iniciar la animación al cargar
  },

  // Parámetros de la cámara
  camera: {
    fov: 45,
    near: 0.1,
    far: 1000,
    initialPosition: { x: 14, y: 15, z: 24 },
    target: { x: 0, y: 4, z: 0 },
  },

  // Configuración de iluminación de la escena
  lighting: {
    ambientColor: 0xffffff,
    ambientIntensity: 0.45,
    directionalColor: 0xffffff,
    directionalIntensity: 1.3,
    directionalPosition: { x: 15, y: 25, z: 15 },
    rimLightColor: 0x00ff88,
    rimLightIntensity: 0.9,
    rimLightPosition: { x: -15, y: 15, z: -15 },
    accentLightColor: 0x00ffaa,
    accentLightIntensity: 0.6,
  }
};
