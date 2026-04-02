# Plan: Mejora Sistema de Sugerencias y Autocorrección

## Estado de Implementacion (2026-04-01)

- Fase 0: Implementada (base tecnica)
  - Se elevo el limite de diccionario a `300_000` palabras en `CustomKeyboard.kt`.
  - Se agrego soporte de carga preferente para archivos `en.dict` y `es.dict` con fallback a `.txt`.
- Fase 1: Implementada
  - Se agregaron `LanguageDetector.kt` y `DynamicLanguageSwitcher.kt`.
  - `AutocompleteMode.BOTH` ahora actua como modo dinamico con deteccion y cambio de idioma activo.
  - Se agrego badge visual del idioma activo en la barra de sugerencias.
- Fase 2: Implementada
  - Se agregaron `TrigramModel` y `PhrasePredictionEngine.kt`.
  - El pipeline de sugerencias mezcla bigramas + frases de 2 palabras usando contexto.
- Fase 3: Implementada
  - Se agregaron `EmojiPredictorEngine.kt`, `GestureDetector.kt` y `SwipePatterns.kt`.
  - Se integraron sugerencias contextuales de emoji y patron por gesto/idioma dentro del ranking.
- Fase 4: Implementada (reglas base)
  - Se agregaron `POSTagging.kt` y `GrammarCorrector.kt`.
  - Se integraron sugerencias gramaticales con umbral de confianza (`>= 0.8`) en sugerencias.
  - Se incorporo historial POS acotado a 10 tokens en memoria.

## Nota de alcance

- La arquitectura modular ya quedo cableada en el teclado nativo para EN/ES y preparada para escalar.
- Los modelos/corpus pesados (`.dict` y trigramas extensos) quedaron con soporte de carga; su calidad final depende de poblar los assets de produccion.

**TL;DR**: Transformar el keyboard de la app a nivel Gboard/SwiftKey con detección dinámica de idioma, predicción de frases, emojis inteligentes, gestos de swipe y corrección gramatical. Arquitectura modular preparada para soportar 10+ idiomas. Timeline: 5-6 semanas, 4 fases iterativas.

---

## FASES DE IMPLEMENTACIÓN

### FASE 0 (Paralelo): Diccionarios Mejorados — 1 semana

- Compilar diccionarios de 300k palabras (vs 150k actual) por idioma
- Fuentes: SCOWL (EN), DRAE (ES)
- Comprimir a binario Trie optimizado: `en.dict` (~5-8MB), `es.dict` (~5-8MB)
- **Archivos**: `app/native/autocomplete/`, `types/typesTranslations.d.ts`

### FASE 1: Arquitectura Multiidioma + Detección Dinámica — 2 semanas _(Critical)_

- Refactorizar `AutocompleteMode` (EN|ES|BOTH) → mapa dinámico `languageConfigs`
- Crear `LanguageDetector.kt`: análisis de n-gramas para detectar idioma en tiempo real
  - Detección basada en distribuciones de caracteres y patrones por idioma
  - Ventana deslizante de 50-100 caracteres, umbral de confianza 70%+
- Crear `DynamicLanguageSwitcher.kt`: cambia diccionarios automáticamente cuando idioma detectado ≠ idioma actual
- Agregar badge visual en teclado para mostrar idioma activo
- **Archivos**:
  - Modificar: `CustomKeyboard.kt`, `KeyboardSuggestions.kt`, `InputProcessor.kt`
  - Crear: `LanguageDetector.kt`, `DynamicLanguageSwitcher.kt`

### FASE 2: Predicción de Frases + Trigramas — 1.5 semanas

- Extender BigramModel → TrigramModel (3 palabras de contexto)
- Crear `PhrasePredictionEngine.kt`: sugiere frases de 2-3 palabras, no solo palabras individuales
- Compilar trigramas offline: top 50k trigramas por idioma de corpus públicos
- Cambiar lógica de renderizado: cuando usuario presiona espacio, mostrar frases en lugar de palabras aisladas
- **Archivos**:
  - Crear: `PhrasePredictionEngine.kt`
  - Modificar: `KeyboardSuggestions.kt`, `CustomKeyboard.kt`

### FASE 3: Emojis Inteligentes + Gestos de Swipe — 1 semana

- Crear `EmojiPredictorEngine.kt`: mapeo palabra/frase → emojis contextuales
  - Ej: "happy" → 😊, "love" → ❤️, "hungry" → 🍔
  - Aprende frecuencia de emojis que usa cada usuario
- Crear `GestureDetector.kt` + `SwipePatterns.kt`: gestos idioma-específicos
  - Swipe derecha = agregar patrón común (ej: "ing" en EN, "ción" en ES)
  - Swipe arriba = mayúscula, abajo = número, izquierda = borrar
- Agregar tab visual "emoji frecuentes + contextuales"
- **Archivos**:
  - Crear: `EmojiPredictorEngine.kt`, `GestureDetector.kt`, `SwipePatterns.kt`
  - Modificar: `CustomKeyboard.kt`

### FASE 4: Corrección Gramatical — 1.5 semanas

- Crear `GrammarCorrector.kt` + `POSTagging.kt`: análisis Part-of-Speech (POS)
  - Detecta errores: conjugaciones ("I goes" → "I go"), acuerdos genero/número ("el niña" → "la niña")
  - Aplicar reglas por idioma (EN: subject-verb, articulos; ES: gender/number, acentuación)
- Mantener historial de últimas 10 palabras con POS-tags
- Mostrar sugerencias solo si confianza > 80% (no invasivo)
- Ejecutar async en thread separado para no bloquear escritura
- **Archivos**:
  - Crear: `GrammarCorrector.kt`, `POSTagging.kt`
  - Modificar: `CustomKeyboard.kt`
  - Tipos: agregar `GrammarSuggestion` en `types/`

---

## ARQUITECTURA MODULAR (Extensible)

```
LanguageConfig (plugin base)
├── ENLanguageConfig
│   ├── diccionario (300k palabras)
│   ├── characterProfile (para detección)
│   ├── commonPatterns (swipes: "ing", "tion")
│   └── grammarRules (verb conjugations)
├── ESLanguageConfig
│   ├── diccionario (300k palabras)
│   ├── characterProfile
│   ├── commonPatterns (swipes: "ción", "mente")
│   └── grammarRules (gender/number)
└── Future: PT, FR, DE, etc. (same structure)
```

Cada idioma es plugin independiente → agregar idioma nuevo = crear clase `LanguageConfig` sin cambiar código existente.

---

## FLUJO DE DATOS MEJORADO

```
Usuario escribe: "Hola, I love 😊"
    ↓
LanguageDetector.detect() → [ES: 65%, EN: 35%]
    ↓
Detecta cambio a ES → DynamicLanguageSwitcher.switchToLanguage(ES)
    ↓
Carga diccionario ES (300k palabras) + trigramas ES
    ↓
updateSuggestions("love")
    ↓
PhrasePredictionEngine → "love you", "love this" (contexto EN original)
EmojiPredictorEngine → ❤️, 💕, 😍 (palabra "love")
GrammarCorrector → (revisar si hay error)
    ↓
renderSuggestions():
  - Palabra: "love"
  - Frases: "love you", "love this"
  - Emoji: ❤️ (contextual)
  - Swipe patterns: "ing" (patrón común EN)
```

---

## VERIFICACIÓN POR FASE

| Fase            | Pruebas                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| **0**           | Diccionarios cargan correctamente; no excedem memoria limit                                           |
| **1**           | Detecta: "Hello world" → EN, "Hola mundo" → ES; cambia dinámicamente; badge visual correcto           |
| **2**           | Trigrama "I love" sugiere "I love you", "I love this"; frases cambian según idioma                    |
| **3**           | "happy" → 😊; "love" → ❤️; swipe en "a" → sugiere "ar"; emojis frecuentes aparecen primero            |
| **4**           | "I goes" → sugiere "I go"; "el niña" → "la niña"; grammar checks async sin bloquear                   |
| **Integration** | Mezcla de idiomas durante escritura; sugerencias multi-fuente (palabra+frase+emoji); sin memory leaks |

---

## DECISIONES & SCOPE

✅ **Incluido**: Multi-idioma modular, detección dinámica, frases, emojis, gestos, gramática, diccionarios 300k

❌ **Excluido**: ML avanzado (TensorFlow), sincronización servidor, corrección de estilo, traducciones automáticas, analytics

---

## RIESGOS

| Riesgo                  | Mitigation                       |
| ----------------------- | -------------------------------- |
| Idiomas ambiguos ("OK") | Threshold 70%+ + override manual |
| Memoria limitada        | Lazy-load, compression, prune    |
| Gestos interfieren      | Configurable sensitivity, toggle |
| Grammar checking lento  | Async + debounce agresivo        |
