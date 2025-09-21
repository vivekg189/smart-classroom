import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Download,
  FileText,
  Presentation,
  Music,
  Video,
  File,
  Play,
  Clock,
  Calendar,
  User,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileUploadService } from '@/lib/fileUpload';
import { FilePreview } from './FilePreview';

interface LectureFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  mime_type: string;
  duration?: number;
  is_primary: boolean;
  transcript?: string;
  transcript_status?: string;
  url: string;
}

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  teacher_id: string;
  files: LectureFile[];
}

interface LectureDetailProps {
  lectureId: string;
  onBack: () => void;
}

export const LectureDetail = ({ lectureId, onBack }: LectureDetailProps) => {
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<LectureFile | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLecture();
  }, [lectureId]);

  const fetchLecture = async () => {
    try {
      const { data, error } = await supabase
        .from('lectures')
        .select(`
          *,
          lecture_files (*)
        `)
        .eq('id', lectureId)
        .eq('status', 'published')
        .single();

      if (error) throw error;

      // Process files with URLs
      const files = await Promise.all(
        (data.lecture_files || []).map(async (file: any) => ({
          ...file,
          url: await FileUploadService.getFileUrl(file.file_path)
        }))
      );

      setLecture({ ...data, files });
    } catch (error) {
      console.error('Error fetching lecture:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lecture',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileDownload = async (file: LectureFile) => {
    try {
      await FileUploadService.downloadFile(file.file_path, file.file_name);
      toast({
        title: 'Download started',
        description: `${file.file_name} is being downloaded`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download failed',
        description: 'Failed to download file',
        variant: 'destructive'
      });
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'audio':
        return <Music className="h-5 w-5" />;
      case 'pdf':
        return <FileText className="h-5 w-5" />;
      case 'presentation':
        return <Presentation className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const downloadAllFiles = async () => {
    if (!lecture?.files) return;

    for (const file of lecture.files) {
      try {
        await FileUploadService.downloadFile(file.file_path, file.file_name);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to download ${file.file_name}:`, error);
      }
    }

    toast({
      title: 'Downloads started',
      description: 'All files are being downloaded'
    });
  };

  const handlePreviewFile = (file: LectureFile) => {
    setPreviewFile(file);
    setShowPreview(true);
  };

  const handleDownloadFile = async (file: LectureFile) => {
    try {
      await FileUploadService.downloadFile(file.file_path, file.file_name);
      toast({
        title: 'Download started',
        description: `${file.file_name} is being downloaded`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download failed',
        description: 'Failed to download file',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Lecture not found</h3>
            <p className="text-muted-foreground text-center mb-4">
              This lecture may not exist or may not be published yet.
            </p>
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryFile = lecture.files.find(f => f.is_primary);
  const otherFiles = lecture.files.filter(f => !f.is_primary);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{lecture.title}</h1>
          <p className="text-muted-foreground">
            {lecture.description || 'No description available'}
          </p>
        </div>
        {lecture.files.length > 1 && (
          <Button onClick={downloadAllFiles} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>
        )}
      </div>

      {/* Lecture Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Published</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(lecture.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <File className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Files</p>
                <p className="text-sm text-muted-foreground">
                  {lecture.files.length} file{lecture.files.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {primaryFile?.duration && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Duration</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDuration(primaryFile.duration)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Primary File */}
      {primaryFile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getFileIcon(primaryFile.file_type)}
              Primary Content
              <Badge variant="secondary">Primary</Badge>
            </CardTitle>
            <CardDescription>
              Main content for this lecture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                {getFileIcon(primaryFile.file_type)}
                <div>
                  <p className="font-medium">{primaryFile.file_name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{formatFileSize(primaryFile.file_size)}</span>
                    {primaryFile.duration && (
                      <span>• {formatDuration(primaryFile.duration)}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {primaryFile.file_type === 'audio' && (
                  <audio controls className="mr-4">
                    <source src={primaryFile.url} type={primaryFile.mime_type} />
                    Your browser does not support the audio element.
                  </audio>
                )}
                <Button 
                  variant="outline"
                  onClick={() => handlePreviewFile(primaryFile)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.open(primaryFile.url, '_blank')}
                >
                  <File className="h-4 w-4 mr-2" />
                  Open
                </Button>
                <Button onClick={() => handleDownloadFile(primaryFile)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Files */}
      {otherFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Files</CardTitle>
            <CardDescription>
              Supplementary materials for this lecture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {otherFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {getFileIcon(file.file_type)}
                    <div>
                      <p className="font-medium">{file.file_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatFileSize(file.file_size)}</span>
                        {file.duration && (
                          <span>• {formatDuration(file.duration)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.file_type === 'audio' && (
                      <audio controls className="mr-4">
                        <source src={file.url} type={file.mime_type} />
                        Your browser does not support the audio element.
                      </audio>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => handlePreviewFile(file)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(file.url, '_blank')}
                    >
                      <File className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleDownloadFile(file)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcription Section */}
      {lecture.files && lecture.files.some(f => f.transcript && f.transcript_status === 'completed') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Lecture Transcription
            </CardTitle>
            <CardDescription>
              Automatic transcription of the audio content
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lecture.files
              .filter(f => f.transcript && f.transcript_status === 'completed')
              .map((file) => (
                <div key={file.id} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{file.file_name}</span>
                    {file.duration && (
                      <span>• {formatDuration(file.duration)}</span>
                    )}
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {file.transcript}
                    </p>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {lecture.files.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <File className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No files available</h3>
            <p className="text-muted-foreground text-center">
              This lecture doesn't have any files attached yet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          onDownload={() => handleDownloadFile(previewFile)}
          isOpen={showPreview}
          onClose={() => {
            setShowPreview(false);
            setPreviewFile(null);
          }}
        />
      )}
    </div>
  );
};
