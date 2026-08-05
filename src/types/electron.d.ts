export {};

declare global {
  interface Window {
    modalWebSocket?: WebSocket;
    currentVolume?: number;
    currentAvatarTalking?: boolean;
    electron?: {
      
      pressKey: (key: string) => Promise<void>;
      
      minimize: () => Promise<void>;
      
      maximize: () => Promise<void>;
      
      close: () => Promise<void>;
      
      getVoices: (language: string) => Promise<string[]>;
      
      speakMessage: (text: string, language: string, voice: string) => Promise<string>;
      
      stopSpeaking: () => Promise<void>;
      saveAvatarImage: (
        fileName: string,
        dataUrl: string,
      ) => Promise<{ url: string; fileName: string }>;
      saveAvatarSettings: (settings: unknown) => Promise<void>;
      saveOverlayAsset: (
        fileName: string,
        dataUrl: string,
      ) => Promise<{ url: string; fileName: string }>;
      getAvatarSettings: () => Promise<unknown | null>;
      saveObsComponent: (componentCode: string) => Promise<void>;
      getObsComponent: () => Promise<string | null>;
      openExternal: (url: string) => Promise<void>;

      getDiagnostics: () => Promise<{ isElectron: true; version: string }>;
      
      checkForUpdates: () => Promise<{ success: boolean; message?: string }>;
      
      downloadUpdate: () => Promise<{ success: boolean; message?: string }>;
      
      installUpdate: () => Promise<{ success: boolean; message?: string }>;
      
      onUpdateStatus: (callback: (status: string, data?: unknown) => void) => () => void;
      
      isElectron: boolean;
    };
    electronAPI: {
      getThreshold: () => Promise<number>;
      setThreshold: (value: number) => void;
      onThresholdChanged: (callback: (value: number) => void) => void;
      removeThresholdListener: () => void;
    };
  }
}
