import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, 
  Presentation, 
  Music, 
  Video, 
  File, 
  Download,
  X,
  ExternalLink
} from 'lucide-react';

interface FilePreviewProps {
  file: {
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    url: string;
    mime_type: string;
    duration?: number;
    transcript?: string;
    transcript_status?: string;
  };
  onDownload: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const FilePreview = ({ file, onDownload, isOpen, onClose }: FilePreviewProps) => {
  const [loading, setLoading] = useState(false);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'audio':
        return <Music className="h-8 w-8" />;
      case 'pdf':
        return <FileText className="h-8 w-8" />;
      case 'presentation':
        return <Presentation className="h-8 w-8" />;
      case 'video':
        return <Video className="h-8 w-8" />;
      default:
        return <File className="h-8 w-8" />;
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

  const handleDownload = async () => {
    setLoading(true);
    try {
      await onDownload();
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(file.url, '_blank');
  };

  const renderPreview = () => {
    switch (file.file_type) {
      case 'audio':
        return (
          <div className="space-y-4">
            <audio controls className="w-full">
              <source src={file.url} type={file.mime_type} />
              Your browser does not support the audio element.
            </audio>
            <p className="text-sm text-muted-foreground text-center">
              {file.duration && `Duration: ${formatDuration(file.duration)}`}
            </p>
          </div>
        );
      
      case 'pdf':
        return (
          <div className="space-y-4">
            <iframe
              src={file.url}
              className="w-full h-96 border rounded"
              title={file.file_name}
            />
            <p className="text-sm text-muted-foreground text-center">
              PDF Preview - Use the download button to save the file
            </p>
          </div>
        );
      
      case 'video':
        return (
          <div className="space-y-4">
            <video controls className="w-full max-h-96">
              <source src={file.url} type={file.mime_type} />
              Your browser does not support the video element.
            </video>
            <p className="text-sm text-muted-foreground text-center">
              {file.duration && `Duration: ${formatDuration(file.duration)}`}
            </p>
          </div>
        );
      
      default:
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            {getFileIcon(file.file_type)}
            <div className="text-center">
              <p className="text-lg font-medium">Preview not available</p>
              <p className="text-sm text-muted-foreground">
                This file type cannot be previewed in the browser
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Click "Open in New Tab" to view the file or download it
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getFileIcon(file.file_type)}
              <div>
                <DialogTitle className="text-left">{file.file_name}</DialogTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{formatFileSize(file.file_size)}</span>
                  {file.duration && (
                    <span>• {formatDuration(file.duration)}</span>
                  )}
                  <span>• {file.file_type.toUpperCase()}</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {renderPreview()}
          
          {/* Transcription Section */}
          {file.transcript && file.transcript_status === 'completed' && (
            <div className="space-y-2 pt-4 border-t">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Transcription
              </h4>
              <div className="bg-muted p-3 rounded-lg max-h-40 overflow-y-auto">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {file.transcript}
                </p>
              </div>
            </div>
          )}
          
          <div className="flex justify-center gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleOpenInNewTab}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </Button>
            <Button 
              onClick={handleDownload}
              disabled={loading}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {loading ? 'Downloading...' : 'Download'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
