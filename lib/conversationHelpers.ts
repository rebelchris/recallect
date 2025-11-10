// Shared utilities for conversation management

// Extend Window interface to include SpeechRecognition
interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: typeof SpeechRecognition;
  webkitSpeechRecognition?: typeof SpeechRecognition;
}

/**
 * Quick reminder time presets (in days)
 */
export const REMINDER_PRESETS = {
  ONE_WEEK: 7,
  TWO_WEEKS: 14,
  THREE_WEEKS: 21,
  ONE_MONTH: 30,
} as const;

/**
 * Character limit constants
 */
export const CHARACTER_LIMITS = {
  PREVIEW_SHORT: 60,
  PREVIEW_LONG: 80,
  REMINDER_PREVIEW: 100,
} as const;

/**
 * Calculate a quick reminder date
 * @param days - Number of days from now
 * @returns ISO string formatted for datetime-local input (YYYY-MM-DDTHH:MM)
 */
export function calculateQuickReminderDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 16);
}

/**
 * Start speech recognition for conversation input
 * @param onTranscript - Callback to handle transcript updates
 * @param onEnd - Callback when recognition ends
 * @param onError - Callback when recognition errors
 * @returns SpeechRecognition instance or null if not supported
 */
export function startSpeechRecognition(
  onTranscript: (transcript: string) => void,
  onEnd: () => void,
  onError: () => void
): SpeechRecognition | null {
  const windowWithSpeech = window as unknown as WindowWithSpeechRecognition;
  const SpeechRecognition =
    windowWithSpeech.SpeechRecognition ||
    windowWithSpeech.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn("Speech recognition not supported in this browser");
    return null;
  }

  const recognition: SpeechRecognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onresult = (e: SpeechRecognitionEvent) => {
    let transcript = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    onTranscript(transcript.trim());
  };

  recognition.onend = onEnd;
  recognition.onerror = onError;
  recognition.start();

  return recognition;
}
