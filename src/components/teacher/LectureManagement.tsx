import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  MoreHorizontal,
  CheckCircle,
  Clock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export const LectureManagement = () => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchLectures();
    }
  }, [user]);

  const fetchLectures = async () => {
    try {
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLectures(data || []);
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

  const updateLectureStatus = async (lectureId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('lectures')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', lectureId);

      if (error) throw error;

      setLectures(prev => 
        prev.map(lecture => 
          lecture.id === lectureId 
            ? { ...lecture, status: newStatus, updated_at: new Date().toISOString() }
            : lecture
        )
      );

      toast({
        title: 'Success',
        description: `Lecture ${newStatus === 'published' ? 'published' : 'moved to draft'}`,
      });
    } catch (error) {
      console.error('Error updating lecture:', error);
      toast({
        title: 'Error',
        description: 'Failed to update lecture status',
        variant: 'destructive'
      });
    }
  };

  const deleteLecture = async (lectureId: string) => {
    if (!confirm('Are you sure you want to delete this lecture? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('lectures')
        .delete()
        .eq('id', lectureId);

      if (error) throw error;

      setLectures(prev => prev.filter(lecture => lecture.id !== lectureId));

      toast({
        title: 'Success',
        description: 'Lecture deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting lecture:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete lecture',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'published') {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="h-3 w-3 mr-1" />
          Published
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        <Clock className="h-3 w-3 mr-1" />
        Draft
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
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
          <h1 className="text-3xl font-bold">Manage Lectures</h1>
          <p className="text-muted-foreground">
            View, edit, and publish your lectures
          </p>
        </div>
      </div>

      {lectures.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No lectures yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start by uploading your first lecture to see it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lectures.map((lecture) => (
            <Card key={lecture.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{lecture.title}</h3>
                      {getStatusBadge(lecture.status)}
                    </div>
                    
                    {lecture.description && (
                      <p className="text-muted-foreground mb-3">
                        {lecture.description}
                      </p>
                    )}
                    
                    <div className="flex items-center text-sm text-muted-foreground gap-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Created: {new Date(lecture.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Updated: {new Date(lecture.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {lecture.status === 'draft' ? (
                      <Button
                        onClick={() => updateLectureStatus(lecture.id, 'published')}
                        size="sm"
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Publish
                      </Button>
                    ) : (
                      <Button
                        onClick={() => updateLectureStatus(lecture.id, 'draft')}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Clock className="h-4 w-4" />
                        Unpublish
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteLecture(lecture.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};