import { supabase } from '@/integrations/supabase/client';
import { TranscriptionService } from './transcriptionService';

export interface FileUploadResult {
  success: boolean;
  filePath?: string;
  error?: string;
  fileId?: string;
}

export interface FileMetadata {
  name: string;
  type: string;
  size: number;
  mimeType: string;
  duration?: number; // for audio/video files
}

export class FileUploadService {
  private static readonly BUCKET_NAME = 'lecture-files';
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly ALLOWED_TYPES = {
    audio: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/webm', 'audio/ogg'],
    pdf: ['application/pdf'],
    presentation: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    document: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    video: ['video/mp4', 'video/webm', 'video/ogg']
  };

  static validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: 'File size must be less than 100MB' };
    }

    // Check file type
    const fileType = this.getFileType(file.type);
    if (!fileType) {
      return { valid: false, error: 'Unsupported file type. Please upload audio, PDF, PowerPoint, or Word documents.' };
    }

    return { valid: true };
  }

  static getFileType(mimeType: string): string | null {
    for (const [type, mimeTypes] of Object.entries(this.ALLOWED_TYPES)) {
      if (mimeTypes.includes(mimeType)) {
        return type;
      }
    }
    return null;
  }

  static generateFilePath(lectureId: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `lectures/${lectureId}/${timestamp}_${sanitizedFileName}`;
  }

  static async uploadFile(
    file: File, 
    lectureId: string, 
    isPrimary: boolean = false,
    onProgress?: (progress: number) => void,
    enableTranscription: boolean = false
  ): Promise<FileUploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Generate file path
      const filePath = this.generateFilePath(lectureId, file.name);
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        return { success: false, error: error.message };
      }

      // Get file metadata
      const fileType = this.getFileType(file.type);
      const metadata: FileMetadata = {
        name: file.name,
        type: fileType || 'unknown',
        size: file.size,
        mimeType: file.type
      };

      // Get duration for audio/video files
      if (fileType === 'audio' || fileType === 'video') {
        try {
          const duration = await this.getMediaDuration(file);
          metadata.duration = duration;
        } catch (err) {
          console.warn('Could not get media duration:', err);
        }
      }

      // Handle transcription for audio files
      let transcript = null;
      let transcriptStatus = 'pending';
      
      if (enableTranscription && fileType === 'audio') {
        console.log('Starting transcription for audio file:', file.name, 'Type:', file.type);
        try {
          transcriptStatus = 'processing';
          transcript = await TranscriptionService.transcribe(file);
          transcript = TranscriptionService.formatTranscript(transcript);
          transcriptStatus = 'completed';
          console.log('Transcription completed successfully:', transcript);
        } catch (error) {
          console.error('Transcription failed:', error);
          transcriptStatus = 'failed';
        }
      } else {
        console.log('Transcription skipped - enableTranscription:', enableTranscription, 'fileType:', fileType);
      }

      // Save file metadata to database
      console.log('Inserting file record with transcript:', {
        lecture_id: lectureId,
        file_name: file.name,
        file_type: fileType || 'unknown',
        transcript: transcript,
        transcript_status: transcriptStatus
      });
      
      const { data: fileRecord, error: dbError } = await supabase
        .from('lecture_files')
        .insert({
          lecture_id: lectureId,
          file_name: file.name,
          file_type: fileType || 'unknown',
          file_size: file.size,
          file_path: filePath,
          mime_type: file.type,
          duration: metadata.duration,
          is_primary: isPrimary,
          transcript: transcript,
          transcript_status: transcriptStatus
        })
        .select()
        .single();
        
      console.log('Database insert result:', { fileRecord, dbError });

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from(this.BUCKET_NAME).remove([filePath]);
        return { success: false, error: dbError.message };
      }

      console.log('File upload successful:', { filePath, fileId: fileRecord.id });
      return {
        success: true,
        filePath: filePath,
        fileId: fileRecord.id
      };

    } catch (error) {
      console.error('File upload error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  static async getMediaDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(Math.floor(audio.duration));
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not load media file'));
      });
      
      audio.src = url;
    });
  }

  static async getFileUrl(filePath: string): Promise<string> {
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  static async downloadFile(filePath: string, fileName: string): Promise<void> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .download(filePath);

      if (error) {
        throw error;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  static async deleteFile(fileId: string): Promise<boolean> {
    try {
      // Get file record
      const { data: fileRecord, error: fetchError } = await supabase
        .from('lecture_files')
        .select('file_path')
        .eq('id', fileId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fileRecord.file_path]);

      if (storageError) {
        console.warn('Storage deletion failed:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('lecture_files')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        throw dbError;
      }

      return true;
    } catch (error) {
      console.error('File deletion error:', error);
      return false;
    }
  }

  static async getLectureFiles(lectureId: string) {
    try {
      const { data, error } = await supabase
        .from('lecture_files')
        .select('*')
        .eq('lecture_id', lectureId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get public URLs for each file
      const filesWithUrls = await Promise.all(
        (data || []).map(async (file) => ({
          ...file,
          url: await this.getFileUrl(file.file_path)
        }))
      );

      return filesWithUrls;
    } catch (error) {
      console.error('Error fetching lecture files:', error);
      return [];
    }
  }

  // Transcribe audio for preview (without saving to database)
  static async transcribeAudio(audioFile: File): Promise<string> {
    try {
      const transcript = await TranscriptionService.transcribe(audioFile);
      return TranscriptionService.formatTranscript(transcript);
    } catch (error) {
      console.error('Audio transcription failed:', error);
      throw error;
    }
  }
}
