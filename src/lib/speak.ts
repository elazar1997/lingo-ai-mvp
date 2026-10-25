// Spanish pronunciation with the browser's own speech synthesis: free, no server call.
// Prefers a Latin American voice, then any Spanish one.

const PREFERRED = ["es-MX", "es-US", "es-419", "es-CO", "es-AR", "es"];

function spanishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  for (const lang of PREFERRED) {
    const v = voices.find((x) => x.lang.replace("_", "-").toLowerCase().startsWith(lang.toLowerCase()));
    if (v) return v;
  }
  return undefined;
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakSpanish(text: string) {
  if (!canSpeak()) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = spanishVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? "es-MX";
    u.rate = 0.85;
    synth.speak(u);
  } catch {
    // Speech synthesis blocked or missing: the chip just does nothing.
  }
}

// Some browsers load voices late; warming up the list makes the first tap use the right one.
export function warmUpVoices() {
  if (canSpeak()) window.speechSynthesis.getVoices();
}
