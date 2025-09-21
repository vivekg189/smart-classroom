import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Upload, 
  Library, 
  Settings, 
  LogOut, 
  Menu,
  GraduationCap,
  Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const AppLayout = ({ children, currentPage, onPageChange }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const teacherNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BookOpen },
    { id: 'upload', label: 'Upload Lecture', icon: Upload },
    { id: 'lectures', label: 'My Lectures', icon: Library },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const studentNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BookOpen },
    { id: 'lectures', label: 'Available Lectures', icon: Library },
    { id: 'notes', label: 'My Notes', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navItems = profile?.role === 'teacher' ? teacherNavItems : studentNavItems;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={cn(
        "bg-card border-r transition-all duration-300 flex flex-col",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                {profile?.role === 'teacher' ? (
                  <GraduationCap className="h-6 w-6 text-primary" />
                ) : (
                  <Users className="h-6 w-6 text-primary" />
                )}
                <h1 className="font-bold text-lg">SmartClassroom</h1>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
          {sidebarOpen && (
            <div className="mt-2 text-sm text-muted-foreground">
              {profile?.full_name} ({profile?.role})
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.id}>
                <Button
                  variant={currentPage === item.id ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    !sidebarOpen && "px-2"
                  )}
                  onClick={() => onPageChange(item.id)}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {sidebarOpen && item.label}
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-destructive hover:text-destructive",
              !sidebarOpen && "px-2"
            )}
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {sidebarOpen && 'Sign Out'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};