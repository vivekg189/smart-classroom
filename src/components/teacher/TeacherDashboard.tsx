import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Upload, 
  BarChart3, 
  Clock,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LectureStats {
  total_lectures: number;
  published_lectures: number;
  draft_lectures: number;
  recent_lectures: any[];
}

interface TeacherDashboardProps {
  onNavigate: (page: string) => void;
}

export const TeacherDashboard = ({ onNavigate }: TeacherDashboardProps) => {
  const [stats, setStats] = useState<LectureStats>({
    total_lectures: 0,
    published_lectures: 0,
    draft_lectures: 0,
    recent_lectures: []
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
      const { data: lectures, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const stats = {
        total_lectures: lectures?.length || 0,
        published_lectures: lectures?.filter(l => l.status === 'published').length || 0,
        draft_lectures: lectures?.filter(l => l.status === 'draft').length || 0,
        recent_lectures: lectures?.slice(0, 5) || []
      };

      setStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Lectures',
      value: stats.total_lectures,
      description: 'All your lectures',
      icon: BookOpen,
      color: 'text-blue-600'
    },
    {
      title: 'Published',
      value: stats.published_lectures,
      description: 'Available to students',
      icon: BarChart3,
      color: 'text-green-600'
    },
    {
      title: 'Drafts',
      value: stats.draft_lectures,
      description: 'Work in progress',
      icon: Clock,
      color: 'text-yellow-600'
    }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-6 md:grid-cols-3">
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
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your lectures and track student engagement
          </p>
        </div>
        <Button onClick={() => onNavigate('upload')} className="gap-2">
          <Plus className="h-4 w-4" />
          New Lecture
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks to manage your lectures
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Button 
            variant="outline" 
            className="justify-start gap-2 h-auto p-4"
            onClick={() => onNavigate('upload')}
          >
            <Upload className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Upload New Lecture</div>
              <div className="text-sm text-muted-foreground">
                Record or upload audio files
              </div>
            </div>
          </Button>
          
          <Button 
            variant="outline" 
            className="justify-start gap-2 h-auto p-4"
            onClick={() => onNavigate('lectures')}
          >
            <BookOpen className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Manage Lectures</div>
              <div className="text-sm text-muted-foreground">
                Edit and publish your content
              </div>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Lectures */}
      {stats.recent_lectures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Lectures</CardTitle>
            <CardDescription>
              Your latest uploaded content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recent_lectures.map((lecture) => (
                <div 
                  key={lecture.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{lecture.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(lecture.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      lecture.status === 'published' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {lecture.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};