import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, 
  Play, 
  Search,
  Calendar,
  User,
  Clock,
  Download,
  FileText,
  Presentation,
  Music,
  Video,
  File
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileUploadService } from '@/lib/fileUpload';

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  teacher_id: string;
  files?: LectureFile[];
}

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

interface LectureBrowserProps {
  onNavigate?: (page: string, lectureId?: string) => void;
}

export const LectureBrowser = ({ onNavigate }: LectureBrowserProps) => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [filteredLectures, setFilteredLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchLectures();
  }, []);

  useEffect(() => {
    filterLectures();
  }, [lectures, searchTerm]);

  const fetchLectures = async () => {
    try {
      const { data, error } = await supabase
        .from('lectures')
        .select(`
          *,
          lecture_files (*)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process lectures and their files
      const lecturesWithFiles = await Promise.all(
        (data || []).map(async (lecture) => {
          const files = await Promise.all(
            (lecture.lecture_files || []).map(async (file: any) => ({
              ...file,
              url: await FileUploadService.getFileUrl(file.file_path)
            }))
          );
          return { ...lecture, files };
        })
      );

      setLectures(lecturesWithFiles);
    } catch (error) {
      console.error('Error fetching lectures:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lectures',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterLectures = () => {
    if (!searchTerm.trim()) {
      setFilteredLectures(lectures);
      return;
    }

    const filtered = lectures.filter(lecture =>
      lecture.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lecture.description && lecture.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredLectures(filtered);
  };

  const handleLectureClick = (lectureId: string) => {
    // Navigate to the lecture detail view
    console.log('Navigate to lecture:', lectureId);
    // This will be handled by the parent component's onNavigate prop
    if (onNavigate) {
      onNavigate('lecture', lectureId);
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

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Available Lectures</h1>
          <p className="text-muted-foreground">
            Browse and study from published lectures
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search lectures..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredLectures.length} lecture{filteredLectures.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Lectures Grid */}
      {filteredLectures.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchTerm ? 'No matching lectures found' : 'No lectures available yet'}
            </h3>
            <p className="text-muted-foreground text-center">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Your teachers haven\'t published any lectures yet. Check back soon!'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLectures.map((lecture) => (
            <Card 
              key={lecture.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleLectureClick(lecture.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{lecture.title}</CardTitle>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Play className="h-3 w-3 mr-1" />
                      Available
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {lecture.description && (
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {lecture.description}
                  </p>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    Published {new Date(lecture.created_at).toLocaleDateString()}
                  </div>
                  
                  {lecture.files && lecture.files.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">
                        {lecture.files.length} file{lecture.files.length !== 1 ? 's' : ''} available
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {lecture.files.slice(0, 3).map((file) => (
                          <div key={file.id} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                            {getFileIcon(file.file_type)}
                            <span className="truncate max-w-20">{file.file_name}</span>
                          </div>
                        ))}
                        {lecture.files.length > 3 && (
                          <div className="text-xs bg-muted px-2 py-1 rounded">
                            +{lecture.files.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button 
                    className="flex-1" 
                    size="sm"
                    onClick={() => handleLectureClick(lecture.id)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    View Lecture
                  </Button>
                  {lecture.files && lecture.files.length > 0 && (
                    <>
                      {lecture.files.some(f => f.transcript && f.transcript_status === 'completed') && (
                        <Badge variant="secondary" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          Transcript
                        </Badge>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const primaryFile = lecture.files?.find(f => f.is_primary);
                          if (primaryFile) {
                            window.open(primaryFile.url, '_blank');
                          }
                        }}
                        title="View file"
                      >
                        <File className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const primaryFile = lecture.files?.find(f => f.is_primary);
                          if (primaryFile) {
                            handleFileDownload(primaryFile);
                          }
                        }}
                        title="Download file"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};