import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { GraduationCap, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const RoleSelection = () => {
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student'>('student');
  const [loading, setLoading] = useState(false);
  const { updateProfile } = useAuth();
  const { toast } = useToast();

  const handleRoleSubmit = async () => {
    setLoading(true);
    
    const { error } = await updateProfile({ role: selectedRole });
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to set your role. Please try again.',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Welcome to SmartClassroom!',
        description: `You've been set up as a ${selectedRole}.`
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Choose Your Role</CardTitle>
          <CardDescription>
            Select whether you're a teacher or student to customize your experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup 
            value={selectedRole} 
            onValueChange={(value) => setSelectedRole(value as 'teacher' | 'student')}
            className="space-y-4"
          >
            <div
              className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent ${selectedRole === 'teacher' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedRole('teacher')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedRole('teacher'); }}
            >
              <RadioGroupItem value="teacher" id="teacher" />
              <GraduationCap className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <Label htmlFor="teacher" className="font-medium cursor-pointer">
                  Teacher
                </Label>
                <p className="text-sm text-muted-foreground">
                  Upload lectures, create AI-powered notes and flashcards
                </p>
              </div>
            </div>
            
            <div
              className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent ${selectedRole === 'student' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedRole('student')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedRole('student'); }}
            >
              <RadioGroupItem value="student" id="student" />
              <Users className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <Label htmlFor="student" className="font-medium cursor-pointer">
                  Student
                </Label>
                <p className="text-sm text-muted-foreground">
                  Access lectures, take notes, and study with AI assistance
                </p>
              </div>
            </div>
          </RadioGroup>
          
          <Button 
            onClick={handleRoleSubmit} 
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Setting up...' : 'Continue'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};