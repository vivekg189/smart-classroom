import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Upload, 
  Mic, 
  Square, 
  Play, 
  Pause,
  File,
  CheckCircle,
  X,
  FileText,
  Presentation,
  Music,
  Video,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FileUploadService } from '@/lib/fileUpload';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  duration?: number;
  isPrimary: boolean;
}

export const LectureUpload = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [enableTranscription, setEnableTranscription] = useState(true);
  const [lectureId, setLectureId] = useState<string | null>(null);
  const [transcriptionText, setTranscriptionText] = useState<string>('');
  const [transcriptionStatus, setTranscriptionStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Transcribe audio locally for preview
  const transcribeAudioPreview = async (audioBlob: Blob) => {
    if (!enableTranscription) return;
    
    setTranscriptionStatus('processing');
    try {
      const audioFile = {
        ...audioBlob,
        name: 'recording.webm',
        type: 'audio/webm',
        lastModified: Date.now()
      } as File;
      const transcript = await FileUploadService.transcribeAudio(audioFile);
      setTranscriptionText(transcript);
      setTranscriptionStatus('completed');
      console.log('Preview transcription completed:', transcript);
    } catch (error) {
      console.error('Preview transcription failed:', error);
      setTranscriptionStatus('failed');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 2,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        console.log('Recording stopped, created audio URL:', audioUrl);
        setAudioBlob(blob);
        setAudioUrl(audioUrl);
        
        // Start transcription preview
        transcribeAudioPreview(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      
      toast({
        title: 'Recording started',
        description: 'Speak clearly into your microphone'
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Recording failed',
        description: 'Please check your microphone permissions',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      toast({
        title: 'Recording stopped',
        description: 'You can now review your recording'
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const validation = FileUploadService.validateFile(file);
        if (validation.valid) {
          if (file.type.startsWith('audio/')) {
            const audioUrl = URL.createObjectURL(file);
            console.log('Audio file selected, created URL:', audioUrl);
            setAudioFile(file);
            setAudioUrl(audioUrl);
            setAudioBlob(null);
          } else {
            // Store non-audio files for later upload
            setPendingFiles(prev => [...prev, file]);
          }
          
          toast({
            title: 'File selected',
            description: `Selected: ${file.name}`
          });
        } else {
          toast({
            title: 'Invalid file type',
            description: validation.error || 'Please select a valid file',
            variant: 'destructive'
          });
        }
      });
    }
  };

  const uploadFile = async (file: File, isPrimary: boolean = false, updateState: boolean = true, targetLectureId?: string) => {
    const targetId = targetLectureId || lectureId;
    
    if (!targetId) {
      toast({
        title: 'Error',
        description: 'Please create lecture first',
        variant: 'destructive'
      });
      return;
    }

    try {
      const result = await FileUploadService.uploadFile(
        file, 
        targetId, 
        isPrimary, 
        undefined, 
        enableTranscription && file.type.startsWith('audio/')
      );
      
      if (result.success && result.fileId) {
        const newFile: UploadedFile = {
          id: result.fileId,
          name: file.name,
          type: FileUploadService.getFileType(file.type) || 'unknown',
          size: file.size,
          url: await FileUploadService.getFileUrl(result.filePath!),
          isPrimary
        };
        
        if (updateState) {
          setUploadedFiles(prev => [...prev, newFile]);
        }
        
        if (updateState) {
          toast({
            title: 'File uploaded successfully',
            description: `${file.name} has been uploaded`
          });
        }
        
        return newFile;
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (updateState) {
        toast({
          title: 'Upload failed',
          description: error instanceof Error ? error.message : 'Failed to upload file',
          variant: 'destructive'
        });
      }
      throw error;
    }
  };

  const removeFile = async (fileId: string) => {
    try {
      const success = await FileUploadService.deleteFile(fileId);
      if (success) {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        toast({
          title: 'File removed',
          description: 'File has been deleted'
        });
      } else {
        throw new Error('Failed to delete file');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete file',
        variant: 'destructive'
      });
    }
  };

  const setPrimaryFile = async (fileId: string) => {
    try {
      // Update all files to not be primary
      await supabase
        .from('lecture_files')
        .update({ is_primary: false })
        .eq('lecture_id', lectureId);

      // Set selected file as primary
      const { error } = await supabase
        .from('lecture_files')
        .update({ is_primary: true })
        .eq('id', fileId);

      if (error) throw error;

      // Update local state
      setUploadedFiles(prev => 
        prev.map(f => ({ ...f, isPrimary: f.id === fileId }))
      );

      toast({
        title: 'Primary file updated',
        description: 'Primary file has been changed'
      });
    } catch (error) {
      console.error('Error setting primary file:', error);
      toast({
        title: 'Error',
        description: 'Failed to update primary file',
        variant: 'destructive'
      });
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'audio':
        return <Music className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'presentation':
        return <Presentation className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your lecture',
        variant: 'destructive'
      });
      return;
    }

    if (!lectureId && !audioFile && !audioBlob && pendingFiles.length === 0) {
      toast({
        title: 'Content required',
        description: 'Please record, upload audio, or add files to your lecture',
        variant: 'destructive'
      });
      return;
    }

    // Refresh Supabase session to avoid auth errors
    try {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Session refresh failed:', refreshError);
      }
    } catch (error) {
      console.warn('Session refresh error:', error);
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      let currentLectureId = lectureId;

      // Create lecture record if not exists
      if (!currentLectureId) {
        const { data: lecture, error: lectureError } = await supabase
          .from('lectures')
          .insert({
            teacher_id: user?.id,
            title: title.trim(),
            description: description.trim() || null,
            status: 'draft'
          })
          .select()
          .single();

        if (lectureError) throw lectureError;
        currentLectureId = lecture.id;
        setLectureId(lecture.id);
      } else {
        // Update existing lecture
        const { error: updateError } = await supabase
          .from('lectures')
          .update({
            title: title.trim(),
            description: description.trim() || null
          })
          .eq('id', currentLectureId);

        if (updateError) throw updateError;
      }

      setUploadProgress(30);

      // Upload audio file if exists
      let audioFileUrl = null;
      if (audioFile) {
        console.log('Uploading audio file:', audioFile.name);
        const result = await uploadFile(audioFile, true, false, currentLectureId); // Set as primary, don't update state
        console.log('Audio file upload result:', result);
        if (result.success) {
          audioFileUrl = await FileUploadService.getFileUrl(result.filePath || '');
          console.log('Generated audio URL:', audioFileUrl);
        }
      } else if (audioBlob) {
        console.log('Uploading audio blob');
        // Convert blob to file using a different approach
        const audioFileFromBlob = {
          ...audioBlob,
          name: 'recording.webm',
          type: 'audio/webm',
          lastModified: Date.now()
        } as File;
        const result = await uploadFile(audioFileFromBlob, true, false, currentLectureId); // Set as primary, don't update state
        console.log('Audio blob upload result:', result);
        if (result.success) {
          audioFileUrl = await FileUploadService.getFileUrl(result.filePath || '');
          console.log('Generated audio URL:', audioFileUrl);
        }
      }

      // Update lecture with audio URL if we have one
      if (audioFileUrl) {
        console.log('Updating lecture with audio URL:', audioFileUrl);
        const { error: updateError } = await supabase
          .from('lectures')
          .update({ audio_url: audioFileUrl })
          .eq('id', currentLectureId);
        
        if (updateError) {
          console.error('Failed to update lecture with audio URL:', updateError);
        }
      }

      setUploadProgress(50);

      // Upload pending files
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        const isPrimary = (audioFile || audioBlob) ? false : i === 0; // First file is primary if no audio
        await uploadFile(file, isPrimary, false, currentLectureId);
        setUploadProgress(50 + (i + 1) / pendingFiles.length * 30);
      }

      setUploadProgress(80);

      // Check if we have any files to upload
      const hasAudioFiles = audioFile || audioBlob;
      const hasPendingFiles = pendingFiles.length > 0;
      
      if (!hasAudioFiles && !hasPendingFiles) {
        toast({
          title: 'No files to upload',
          description: 'Please add files before submitting'
        });
        return;
      }

      setUploadProgress(100);

      toast({
        title: 'Lecture created successfully!',
        description: 'Your lecture has been saved as a draft. You can edit and publish it later.'
      });

      // Reset form
      setTitle('');
      setDescription('');
      setAudioFile(null);
      setAudioBlob(null);
      setAudioUrl(null);
      setUploadedFiles([]);
      setPendingFiles([]);
      setLectureId(null);
      setTranscriptionText('');
      setTranscriptionStatus('idle');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Error uploading lecture:', error);
      
      // Handle specific error types
      let errorMessage = 'Failed to upload lecture';
      if (error instanceof Error) {
        if (error.message.includes('Invalid Refresh Token')) {
          errorMessage = 'Authentication expired. Please refresh the page and try again.';
        } else if (error.message.includes('Cannot set property type')) {
          errorMessage = 'Audio recording error. Please try recording again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Upload New Lecture</h1>
        <p className="text-muted-foreground">
          Record or upload audio to create AI-powered lecture notes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Lecture Details */}
        <Card>
          <CardHeader>
            <CardTitle>Lecture Details</CardTitle>
            <CardDescription>
              Basic information about your lecture
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter lecture title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the lecture content"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="transcription"
                checked={enableTranscription}
                onCheckedChange={setEnableTranscription}
              />
              <Label htmlFor="transcription" className="text-sm">
                Enable automatic transcription for audio files
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Lecture Content</CardTitle>
            <CardDescription>
              Record audio, upload files, or add documents to your lecture
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recording Controls */}
            <div className="flex gap-4 flex-wrap">
              <Button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "destructive" : "default"}
                className="gap-2"
              >
                {isRecording ? (
                  <>
                    <Square className="h-4 w-4" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    Start Recording
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Files
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Audio Preview */}
            {audioUrl && (
              <div className="space-y-2">
                <Label>Audio Preview</Label>
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <Music className="h-8 w-8 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">
                      {audioFile ? audioFile.name : 'Recorded Audio'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Audio URL: {audioUrl.substring(0, 50)}...
                    </p>
                    <audio controls className="w-full mt-2">
                      <source src={audioUrl} type="audio/webm" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAudioUrl(null);
                      setAudioBlob(null);
                      setAudioFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Transcription Preview */}
            {enableTranscription && (audioBlob || audioFile) && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Live Transcription Preview
                  {transcriptionStatus === 'processing' && (
                    <Badge variant="secondary" className="text-xs">
                      Processing...
                    </Badge>
                  )}
                  {transcriptionStatus === 'completed' && (
                    <Badge variant="default" className="text-xs">
                      Completed
                    </Badge>
                  )}
                  {transcriptionStatus === 'failed' && (
                    <Badge variant="destructive" className="text-xs">
                      Failed
                    </Badge>
                  )}
                </Label>
                
                {transcriptionStatus === 'processing' && (
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      <span className="text-sm text-blue-700">Converting audio to text...</span>
                    </div>
                  </div>
                )}
                
                {transcriptionStatus === 'completed' && transcriptionText && (
                  <div className="p-4 border rounded-lg bg-green-50">
                    <p className="text-sm text-green-800 font-medium mb-2">Transcription Result:</p>
                    <div className="bg-white p-3 rounded border max-h-40 overflow-y-auto">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {transcriptionText}
                      </p>
                    </div>
                  </div>
                )}
                
                {transcriptionStatus === 'failed' && (
                  <div className="p-4 border rounded-lg bg-red-50">
                    <p className="text-sm text-red-800">
                      Transcription failed. The audio will still be uploaded, but without automatic transcription.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Debug Info */}
            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
              Debug: audioUrl={audioUrl ? 'exists' : 'null'}, audioBlob={audioBlob ? 'exists' : 'null'}, audioFile={audioFile ? 'exists' : 'null'}
            </div>
            
            {/* Fallback Audio Preview for debugging */}
            {(audioBlob || audioFile) && !audioUrl && (
              <div className="space-y-2 p-4 border border-orange-200 rounded-lg bg-orange-50">
                <Label className="text-orange-800">Audio Available but No Preview URL</Label>
                <p className="text-sm text-orange-700">
                  Audio blob/file exists but audioUrl is null. This might be a state issue.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (audioBlob) {
                      const url = URL.createObjectURL(audioBlob);
                      console.log('Manually creating URL from blob:', url);
                      setAudioUrl(url);
                    } else if (audioFile) {
                      const url = URL.createObjectURL(audioFile);
                      console.log('Manually creating URL from file:', url);
                      setAudioUrl(url);
                    }
                  }}
                >
                  Create Preview URL
                </Button>
              </div>
            )}

            {/* Pending Files */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files (will be uploaded)</Label>
                <div className="space-y-2">
                  {pendingFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        {getFileIcon(FileUploadService.getFileType(file.type) || 'unknown')}
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatFileSize(file.size)}</span>
                            {index === 0 && !audioFile && !audioBlob && (
                              <Badge variant="secondary" className="text-xs">Will be Primary</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== index))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Files</Label>
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.type)}
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatFileSize(file.size)}</span>
                            {file.duration && (
                              <span>• {Math.floor(file.duration / 60)}:{(file.duration % 60).toString().padStart(2, '0')}</span>
                            )}
                            {file.isPrimary && (
                              <Badge variant="secondary" className="text-xs">Primary</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!file.isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPrimaryFile(file.id)}
                          >
                            Set Primary
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isRecording && (
              <Alert>
                <Mic className="h-4 w-4" />
                <AlertDescription>
                  Recording in progress... Speak clearly into your microphone.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {uploading && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Upload Progress</Label>
                  <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full" 
          disabled={uploading || (!audioFile && !audioBlob && pendingFiles.length === 0)}
        >
          {uploading ? (
            'Processing Lecture...'
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {lectureId ? 'Update Lecture' : 'Create Lecture'}
            </>
          )}
        </Button>
      </form>
    </div>
  );
};