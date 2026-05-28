export interface GroundingSource {
  title: string;
  url: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  imageBase64?: string; // Optional user-uploaded image for multimodal chat
  audioBase64?: string; // Optional TTS audio for text responses
  isImageResult?: boolean; // If true, content is a generated base64 image URL
  imageConfig?: {
    aspectRatio: string;
    style: string;
    size: string;
  };
  groundingSources?: GroundingSource[];
  isGeneratingAudio?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  systemPromptId: string;
}

export interface SystemPrompt {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  prompt: string;
}

export interface ImageGeneration {
  id: string;
  prompt: string;
  url: string;
  timestamp: string;
  aspectRatio: string;
  style: string;
}
