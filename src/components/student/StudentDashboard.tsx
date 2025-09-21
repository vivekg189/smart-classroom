import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Clock, 
  Play,
  Star,
  TrendingUp,
  Download,
  FileText,
  Presentation,
  Music,
  Video,
  File
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FileUploadService } from '@/lib/fileUpload';

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

interface StudentStats {
  available_lectures: number;
  completed_notes: number;
  recent_lectures: Lecture[];
  recommended_lectures: Lecture[];
}

interface StudentDashboardProps {
  onNavigate: (page: string, lectureId?: string) => void;
}

export const StudentDashboard = ({ onNavigate }: StudentDashboardProps) => {
  const [stats, setStats] = useState<StudentStats>({
    available_lectures: 0,
    completed_notes: 0,
    recent_lectures: [],
    recommended_lectures: []
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      // Fetch published lectures with files
      const { data: lectures, error: lecturesError } = await supabase
        .from('lectures')
        .select(`
          *,
          lecture_files (*)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (lecturesError) throw lecturesError;

      // Process lectures and their files
      const lecturesWithFiles = await Promise.all(
        (lectures || []).map(async (lecture) => {
          const files = await Promise.all(
            (lecture.lecture_files || []).map(async (file: any) => ({
              ...file,
              url: await FileUploadService.getFileUrl(file.file_path)
            }))
          );
          return { ...lecture, files };
        })
      );

      // Fetch student notes
      const { data: notes, error: notesError } = await supabase
        .from('student_notes')
        .select('*')
        .eq('student_id', user?.id);

      if (notesError) throw notesError;

      setStats({
        available_lectures: lecturesWithFiles.length,
        completed_notes: notes?.length || 0,
        recent_lectures: lecturesWithFiles.slice(0, 5),
        recommended_lectures: lecturesWithFiles.slice(0, 3)
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'audio':
        return <Music className="h-3 w-3" />;
      case 'pdf':
        return <FileText className="h-3 w-3" />;
      case 'presentation':
        return <Presentation className="h-3 w-3" />;
      case 'video':
        return <Video className="h-3 w-3" />;
      default:
        return <File className="h-3 w-3" />;
    }
  };

  const handleFileDownload = async (file: LectureFile) => {
    try {
      await FileUploadService.downloadFile(file.file_path, file.file_name);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const statCards = [
    {
      title: 'Available Lectures',
      value: stats.available_lectures,
      description: 'Ready to study',
      icon: BookOpen,
      color: 'text-blue-600'
    },
    {
      title: 'My Notes',
      value: stats.completed_notes,
      description: 'Lectures with notes',
      icon: Star,
      color: 'text-yellow-600'
    }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2].map(i => (
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
          <h1 className="text-3xl font-bold">Student Dashboard</h1>
          <p className="text-muted-foreground">
            Access your lectures and manage your study materials
          </p>
        </div>
        <Button onClick={() => onNavigate('lectures')} className="gap-2">
          <BookOpen className="h-4 w-4" />
          Browse Lectures
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Access</CardTitle>
          <CardDescription>
            Jump into your study materials
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Button 
            variant="outline" 
            className="justify-start gap-2 h-auto p-4"
            onClick={() => onNavigate('lectures')}
          >
            <BookOpen className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Browse All Lectures</div>
              <div className="text-sm text-muted-foreground">
                Find lectures to study
              </div>
            </div>
          </Button>
          
          <Button 
            variant="outline" 
            className="justify-start gap-2 h-auto p-4"
            onClick={() => onNavigate('notes')}
          >
            <Star className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">My Study Notes</div>
              <div className="text-sm text-muted-foreground">
                Review your saved notes
              </div>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Lectures */}
      {stats.recent_lectures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Added Lectures</CardTitle>
            <CardDescription>
              Latest content from your teachers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recent_lectures.map((lecture) => (
                <div 
                  key={lecture.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => onNavigate('lecture', lecture.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{lecture.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {lecture.description || 'No description available'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          Added {new Date(lecture.created_at).toLocaleDateString()}
                        </p>
                        {lecture.files && lecture.files.length > 0 && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <div className="flex items-center gap-1">
                              {lecture.files.slice(0, 3).map((file) => (
                                <div key={file.id} className="flex items-center gap-1 text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {getFileIcon(file.file_type)}
                                </div>
                              ))}
                              {lecture.files.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{lecture.files.length - 3}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lecture.files && lecture.files.length > 0 && (
                      <>
                        {lecture.files.some(f => f.transcript && f.transcript_status === 'completed') && (
                          <Badge variant="secondary" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            Transcript
                          </Badge>
                        )}
                        <Button 
                          variant="ghost" 
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
                          variant="ghost" 
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
                    <Button variant="ghost" size="sm">
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.available_lectures === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No lectures available yet</h3>
            <p className="text-muted-foreground text-center">
              Your teachers haven't published any lectures yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};