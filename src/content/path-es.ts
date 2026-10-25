import type { PersonaId } from "@/lib/personas";

// The Spanish learning path. Lesson ids are stored with the user's progress, so never
// rename or reuse one; reordering or adding lessons is safe. Prompt fields are English
// (they go to the voice model), everything shown to the learner is Hebrew.

export type TargetWord = {
  es: string;
  he: string;
  // Spellings that count as saying the word, written plainly (accents and punctuation are
  // ignored when matching). The first is usually `es` itself.
  forms: string[];
};

export type Lesson = {
  id: string;
  titleHe: string;
  // One sentence for the lesson card.
  goalHe: string;
  persona: PersonaId;
  // The scene in a few Hebrew words, for the lesson card.
  sceneHe: string;
  // Who the persona plays and where, for the prompt.
  roleplay: string;
  // What the learner has to do; the tutor checks this after the call.
  mission: string;
  // How the persona opens the scene.
  opening: string;
  words: TargetWord[];
  // Target words the learner must say to pass.
  need: number;
};

export type Unit = { id: string; titleHe: string; lessons: Lesson[] };

export const PATH_ES: Unit[] = [
  {
    id: "u1",
    titleHe: "היכרות בסיסית",
    lessons: [
      {
        id: "u1-hello",
        titleHe: "שלום, מה שמך?",
        goalHe: "להגיד שלום, להציג את עצמך ולהיפרד.",
        persona: "lucia",
        sceneHe: "פגישה ראשונה עם לוסיה לפני השיעור",
        roleplay: "You are yourself, Lucía, meeting a new student for the very first time before class.",
        mission: "The learner greets Lucía, says their name, says it is nice to meet her, asks her back, and says goodbye.",
        opening: 'Greet with "¡Hola! Me llamo Lucía." and ask "¿Cómo te llamas?"',
        words: [
          { es: "hola", he: "שלום", forms: ["hola"] },
          { es: "me llamo", he: "קוראים לי", forms: ["me llamo", "mi nombre es"] },
          { es: "mucho gusto", he: "נעים מאוד", forms: ["mucho gusto", "encantado", "encantada"] },
          { es: "¿y tú?", he: "ומה איתך?", forms: ["y tu", "y usted"] },
          { es: "adiós", he: "להתראות", forms: ["adios", "hasta luego", "chao", "chau"] },
        ],
        need: 4,
      },
      {
        id: "u1-from",
        titleHe: "מאיפה באת?",
        goalHe: "לספר מאיפה באת ואיפה גרים, ולשאול בחזרה.",
        persona: "lucia",
        sceneHe: "שיחת היכרות עם לוסיה",
        roleplay: "You are yourself, Lucía, chatting with a new student about where you both come from.",
        mission: "The learner says where they are from and which city they live in, and asks Lucía where she is from.",
        opening: 'Say "Yo soy de Colombia." and ask "¿Y tú? ¿De dónde eres?"',
        words: [
          { es: "soy de", he: "אני מ...", forms: ["soy de"] },
          { es: "Israel", he: "ישראל", forms: ["israel"] },
          { es: "vivo en", he: "אני גר / גרה ב...", forms: ["vivo en"] },
          { es: "ciudad", he: "עיר", forms: ["ciudad"] },
          { es: "¿de dónde eres?", he: "מאיפה באת?", forms: ["de donde eres", "de donde es"] },
        ],
        need: 4,
      },
      {
        id: "u1-how",
        titleHe: "מה שלומך?",
        goalHe: "לשאול מה שלום ולספר איך מרגישים היום.",
        persona: "vale",
        sceneHe: "פוגשים את ואלה בבית קפה",
        roleplay: "You are yourself, Vale, meeting a friend of a friend at a café and asking how their day is going.",
        mission: "The learner asks Vale how she is, says how they feel today (fine, tired, happy) and thanks her.",
        opening: 'Say "¡Hola! ¿Cómo estás?" with a big smile in your voice.',
        words: [
          { es: "¿cómo estás?", he: "מה שלומך?", forms: ["como estas", "como esta"] },
          { es: "bien", he: "טוב", forms: ["bien"] },
          { es: "cansado / cansada", he: "עייף / עייפה", forms: ["cansado", "cansada"] },
          { es: "feliz", he: "שמח / שמחה", forms: ["feliz", "contento", "contenta"] },
          { es: "gracias", he: "תודה", forms: ["gracias"] },
        ],
        need: 4,
      },
    ],
  },
  {
    id: "u2",
    titleHe: "קפה ומסעדה",
    lessons: [
      {
        id: "u2-coffee",
        titleHe: "להזמין קפה",
        goalHe: "להזמין קפה עם חלב, בנימוס.",
        persona: "vale",
        sceneHe: "ואלה המלצרית בבית קפה במקסיקו סיטי",
        roleplay: "You are Vale working a shift as a waitress at a small café in Mexico City. The learner is your customer.",
        mission: "The learner orders a coffee with milk politely and thanks Vale.",
        opening: 'Welcome the customer: "¡Hola! Bienvenido al café. ¿Qué quieres?"',
        words: [
          { es: "quiero", he: "אני רוצה", forms: ["quiero", "quisiera", "me da", "me das"] },
          { es: "café", he: "קפה", forms: ["cafe"] },
          { es: "con leche", he: "עם חלב", forms: ["con leche"] },
          { es: "por favor", he: "בבקשה", forms: ["por favor"] },
          { es: "gracias", he: "תודה", forms: ["gracias"] },
        ],
        need: 4,
      },
      {
        id: "u2-food",
        titleHe: "להזמין אוכל",
        goalHe: "להזמין מנה ושתייה, ולבקש בלי משהו.",
        persona: "vale",
        sceneHe: "ארוחת צהריים במסעדה משפחתית",
        roleplay: "You are Vale working as a waitress at a family restaurant in Mexico City. The learner is your customer at lunch.",
        mission: "The learner orders a dish and a drink, and asks for something without an ingredient (for example a salad without onion).",
        opening: 'Hand over the menu: "¡Hola! Aquí está el menú. ¿Qué quieres comer?"',
        words: [
          { es: "para mí", he: "בשבילי", forms: ["para mi"] },
          { es: "pollo", he: "עוף", forms: ["pollo"] },
          { es: "ensalada", he: "סלט", forms: ["ensalada"] },
          { es: "sin", he: "בלי", forms: ["sin"] },
          { es: "agua", he: "מים", forms: ["agua"] },
        ],
        need: 4,
      },
      {
        id: "u2-bill",
        titleHe: "החשבון, בבקשה",
        goalHe: "לבקש חשבון, לשאול כמה זה עולה ולשלם.",
        persona: "lucia",
        sceneHe: "סוף הארוחה במסעדה בבוגוטה",
        roleplay: "You are Lucía playing a waiter at a restaurant in Bogotá at the end of the meal. The learner is your customer.",
        mission: "The learner asks for the bill, asks how much it is, and says whether they pay by card or in cash.",
        opening: 'Ask kindly: "¿Todo bien con la comida? ¿Algo más?"',
        words: [
          { es: "la cuenta", he: "החשבון", forms: ["la cuenta"] },
          { es: "¿cuánto cuesta?", he: "כמה זה עולה?", forms: ["cuanto cuesta", "cuanto es"] },
          { es: "tarjeta", he: "כרטיס אשראי", forms: ["tarjeta"] },
          { es: "efectivo", he: "מזומן", forms: ["efectivo"] },
          { es: "propina", he: "טיפ", forms: ["propina"] },
        ],
        need: 4,
      },
    ],
  },
];

export const LESSONS: Lesson[] = PATH_ES.flatMap((u) => u.lessons);

export function findLesson(id: unknown): Lesson | undefined {
  return typeof id === "string" ? LESSONS.find((l) => l.id === id) : undefined;
}
