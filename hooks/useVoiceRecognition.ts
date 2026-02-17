"use client";

import { useState, useRef, useCallback } from "react";

interface UseVoiceRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  timeoutMs?: number;
  onTranscript?: (transcript: string) => void;
}

interface UseVoiceRecognitionReturn {
  isListening: boolean;
  error: string | null;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

export function useVoiceRecognition(
  options: UseVoiceRecognitionOptions = {}
): UseVoiceRecognitionReturn {
  const {
    lang = "en-US",
    continuous = true,
    interimResults = true,
    timeoutMs = 30000,
    onTranscript,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getSpeechRecognitionAPI = useCallback(() => {
    if (typeof window === "undefined") return null;
    return (
      (window as typeof window & { SpeechRecognition?: new () => SpeechRecognition })
        .SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: new () => SpeechRecognition })
        .webkitSpeechRecognition ||
      null
    );
  }, []);

  const isSupported = typeof window !== "undefined" && !!getSpeechRecognitionAPI();

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimeoutRef();
    recognitionRef.current?.stop();
    setIsListening(false);
  }, [clearTimeoutRef]);

  const start = useCallback(() => {
    const SpeechRecognitionAPI = getSpeechRecognitionAPI();
    
    if (!SpeechRecognitionAPI) {
      setError("Voice recognition is not supported in this browser.");
      return;
    }

    setError(null);

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    const resetTimeout = () => {
      clearTimeoutRef();
      timeoutRef.current = setTimeout(() => stop(), timeoutMs);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      resetTimeout();
      let finalTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        }
      }
      
      if (finalTranscript && onTranscript) {
        onTranscript(finalTranscript.trim());
      }
    };

    recognition.onend = () => {
      clearTimeoutRef();
      setIsListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      clearTimeoutRef();
      if (event.error !== "aborted") {
        setError(`Voice error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
    resetTimeout();
  }, [
    getSpeechRecognitionAPI,
    continuous,
    interimResults,
    lang,
    timeoutMs,
    onTranscript,
    clearTimeoutRef,
    stop,
  ]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  return {
    isListening,
    error,
    isSupported,
    start,
    stop,
    toggle,
  };
}
