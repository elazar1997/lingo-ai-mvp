// Visual placement quiz, Spanish. Five bands from first words to a short dialogue.
// The first option of each question is the right one; the quiz shuffles them.

export type QuizKind = "word-emoji" | "emoji-word" | "meaning" | "blank" | "dialogue";

export type QuizQuestion = {
  id: string;
  band: 1 | 2 | 3 | 4 | 5;
  kind: QuizKind;
  /** Spanish word, emoji, sentence (with ___ for a blank) or the question in Hebrew. */
  prompt: string;
  /** Hebrew hint under a fill-in-the-blank sentence. */
  hintHe?: string;
  /** Dialogue lines for the comprehension band. */
  dialogue?: string[];
  options: [string, string, string, string];
};

export const BAND_TITLE_HE: Record<QuizQuestion["band"], string> = {
  1: "מה המילה?",
  2: "איך אומרים בספרדית?",
  3: "מה פירוש המשפט?",
  4: "השלמת המשפט",
  5: "הבנת שיחה",
};

export const QUIZ_ES: QuizQuestion[] = [
  { id: "b1-perro", band: 1, kind: "word-emoji", prompt: "perro", options: ["🐶", "🐱", "🐟", "🐦"] },
  { id: "b1-agua", band: 1, kind: "word-emoji", prompt: "agua", options: ["💧", "🔥", "🍞", "🌙"] },
  { id: "b1-casa", band: 1, kind: "word-emoji", prompt: "casa", options: ["🏠", "🚗", "🌳", "📚"] },
  { id: "b1-sol", band: 1, kind: "word-emoji", prompt: "sol", options: ["☀️", "⭐", "☁️", "❄️"] },

  { id: "b2-manzana", band: 2, kind: "emoji-word", prompt: "🍎", options: ["manzana", "naranja", "pan", "leche"] },
  { id: "b2-libro", band: 2, kind: "emoji-word", prompt: "📖", options: ["libro", "mesa", "silla", "puerta"] },
  { id: "b2-cafe", band: 2, kind: "emoji-word", prompt: "☕", options: ["café", "queso", "jugo", "sopa"] },
  { id: "b2-playa", band: 2, kind: "emoji-word", prompt: "🏖️", options: ["playa", "montaña", "ciudad", "río"] },

  { id: "b3-bano", band: 3, kind: "meaning", prompt: "¿Dónde está el baño?", options: ["איפה השירותים?", "מה השעה?", "כמה זה עולה?", "איך קוראים לך?"] },
  { id: "b3-hambre", band: 3, kind: "meaning", prompt: "Tengo mucha hambre.", options: ["אני מאוד רעב או רעבה.", "יש לי הרבה זמן.", "אני מאוד עייף או עייפה.", "יש לי הרבה חברים."] },
  { id: "b3-trabajo", band: 3, kind: "meaning", prompt: "Mi hermana trabaja en un hospital.", options: ["אחותי עובדת בבית חולים.", "אחי לומד באוניברסיטה.", "אמא שלי גרה ליד בית חולים.", "אחותי מחפשת עבודה."] },
  { id: "b3-cuenta", band: 3, kind: "meaning", prompt: "¿Me trae la cuenta, por favor?", options: ["אפשר לקבל את החשבון, בבקשה?", "אפשר לקבל את התפריט, בבקשה?", "אפשר עוד מים, בבקשה?", "אפשר לשבת כאן, בבקשה?"] },

  { id: "b4-ayer", band: 4, kind: "blank", prompt: "Ayer yo ___ al cine con mis amigos.", hintHe: "אתמול הלכתי לקולנוע עם החברים שלי.", options: ["fui", "voy", "iré", "vas"] },
  { id: "b4-manana", band: 4, kind: "blank", prompt: "Mañana nosotros ___ la cena.", hintHe: "מחר אנחנו נכין את ארוחת הערב.", options: ["vamos a preparar", "preparamos ayer", "preparábamos", "hemos preparado"] },
  { id: "b4-gusta", band: 4, kind: "blank", prompt: "A mí me ___ mucho las películas.", hintHe: "אני מאוד אוהב או אוהבת סרטים.", options: ["gustan", "gusta", "gusto", "gustas"] },
  { id: "b4-estaba", band: 4, kind: "blank", prompt: "Cuando llegaste, yo ___ durmiendo.", hintHe: "כשהגעת, ישנתי.", options: ["estaba", "soy", "estaré", "era"] },

  {
    id: "b5-tren",
    band: 5,
    kind: "dialogue",
    dialogue: ["— ¿Ya compraste los boletos?", "— Todavía no. Si no los compro hoy, se van a acabar.", "— Pues cómpralos ahora, que el tren sale el viernes temprano."],
    prompt: "מה צריך לעשות היום?",
    options: ["לקנות כרטיסים לרכבת", "לעלות על הרכבת", "לבטל את הנסיעה", "לשנות את התאריך לשישי"],
  },
  {
    id: "b5-cena",
    band: 5,
    kind: "dialogue",
    dialogue: ["— Pensé que vendrías a la cena.", "— Quería ir, pero tuve que quedarme en la oficina hasta tarde.", "— No pasa nada, la próxima vez."],
    prompt: "למה הוא או היא לא הגיעו לארוחה?",
    options: ["נשארו לעבוד עד מאוחר", "לא רצו לבוא", "שכחו מהארוחה", "היו חולים"],
  },
  {
    id: "b5-depa",
    band: 5,
    kind: "dialogue",
    dialogue: ["— ¿Qué tal el departamento nuevo?", "— Me encanta la vista, aunque es más pequeño de lo que esperaba.", "— Bueno, lo importante es que estés a gusto."],
    prompt: "מה דעתו או דעתה על הדירה?",
    options: ["אוהבים את הנוף, אבל היא קטנה מהצפוי", "היא גדולה מדי", "אין בה נוף", "רוצים לעבור ממנה"],
  },
  {
    id: "b5-lluvia",
    band: 5,
    kind: "dialogue",
    dialogue: ["— Si hubiera sabido que iba a llover, habría traído el paraguas.", "— Yo tengo uno de sobra, te lo presto."],
    prompt: "מה קורה בשיחה?",
    options: ["אחד שכח מטריה, והשני משאיל לו", "שניהם שכחו מטריה", "אחד קונה מטריה חדשה", "הגשם כבר נגמר"],
  },
];
