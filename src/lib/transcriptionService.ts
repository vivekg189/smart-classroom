// Transcription service using Web Speech API and fallback to external service
export class TranscriptionService {
  private static readonly SUPPORTED_LANGUAGES = ['en-US', 'en-GB', 'en-AU'];
  
  // Check if browser supports speech recognition
  static isSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  // Transcribe audio file using Web Speech API
  static async transcribeAudio(audioFile: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Speech recognition not supported in this browser'));
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      let transcript = '';
      
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
      };
      
      recognition.onend = () => {
        resolve(transcript.trim());
      };
      
      recognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };
      
      // Create audio context and play the file for recognition
      this.playAudioForRecognition(audioFile, recognition);
    });
  }

  // Play audio file for speech recognition
  private static async playAudioForRecognition(audioFile: File, recognition: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(audioFile);
      
      audio.src = url;
      audio.controls = false;
      audio.volume = 0.5; // Lower volume for better recognition
      
      audio.onloadeddata = () => {
        recognition.start();
        audio.play();
      };
      
      audio.onended = () => {
        setTimeout(() => {
          recognition.stop();
          URL.revokeObjectURL(url);
          resolve();
        }, 1000); // Give recognition time to process
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load audio file'));
      };
    });
  }

  // Alternative transcription using external service (mock implementation)
  static async transcribeWithExternalService(audioFile: File): Promise<string> {
    console.log('Using external transcription service for:', audioFile.name);
    
    // This is a mock implementation
    // In a real app, you would integrate with services like:
    // - Google Cloud Speech-to-Text
    // - Azure Speech Services
    // - AWS Transcribe
    // - AssemblyAI
    // - Rev.ai
    
    return new Promise((resolve) => {
      // Simulate processing time
      setTimeout(() => {
        const mockTranscript = `This is a mock transcription of the audio file "${audioFile.name}". 
        In a real implementation, this would be replaced with actual speech-to-text conversion 
        using an external service. The audio content would be processed and converted to text 
        with high accuracy, including punctuation and proper formatting.`;
        console.log('Mock transcription completed:', mockTranscript);
        resolve(mockTranscript);
      }, 2000);
    });
  }

  // Main transcription method with fallback
  static async transcribe(audioFile: File, useExternal: boolean = false): Promise<string> {
    try {
      if (useExternal || !this.isSupported()) {
        return await this.transcribeWithExternalService(audioFile);
      } else {
        return await this.transcribeAudio(audioFile);
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      // Fallback to external service if Web Speech API fails
      if (this.isSupported()) {
        return await this.transcribeWithExternalService(audioFile);
      }
      throw error;
    }
  }

  // Format transcript with proper punctuation and capitalization
  static formatTranscript(transcript: string): string {
    if (!transcript) return '';
    
    // Basic formatting
    let formatted = transcript
      .replace(/\s+/g, ' ') // Remove extra spaces
      .trim();
    
    // Add period at the end if missing
    if (formatted && !formatted.match(/[.!?]$/)) {
      formatted += '.';
    }
    
    // Capitalize first letter
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    
    return formatted;
  }

  // Generate a summary from transcript
  static generateSummary(transcript: string, maxLength: number = 200): string {
    if (!transcript) return '';
    
    if (transcript.length <= maxLength) {
      return transcript;
    }
    
    // Find the last complete sentence within the limit
    const truncated = transcript.substring(0, maxLength);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );
    
    if (lastSentenceEnd > maxLength * 0.7) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }
    
    return truncated + '...';
  }
}
