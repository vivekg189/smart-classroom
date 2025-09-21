import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { RoleSelection } from '@/components/auth/RoleSelection';
import { AppLayout } from '@/components/layout/AppLayout';
import { TeacherDashboard } from '@/components/teacher/TeacherDashboard';
import { StudentDashboard } from '@/components/student/StudentDashboard';
import { LectureUpload } from '@/components/teacher/LectureUpload';
import { LectureManagement } from '@/components/teacher/LectureManagement';
import { LectureBrowser } from '@/components/student/LectureBrowser';
import { LectureDetail } from '@/components/student/LectureDetail';

const Index = () => {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth form if not authenticated
  if (!user) {
    return <AuthForm />;
  }

  // Show role selection if user hasn't selected a role yet
  if (!profile?.role) {
    return <RoleSelection />;
  }

  // Handle page navigation
  const handlePageChange = (page: string, lectureId?: string) => {
    setCurrentPage(page);
    // Handle lecture-specific navigation if needed
    if (lectureId) {
      setSelectedLectureId(lectureId);
      setCurrentPage('lecture-detail');
    }
  };

  // Handle going back from lecture detail
  const handleBackFromLecture = () => {
    setCurrentPage('lectures');
    setSelectedLectureId(null);
  };

  // Render page content based on current page and user role
  const renderPageContent = () => {
    if (profile.role === 'teacher') {
      switch (currentPage) {
        case 'upload':
          return <LectureUpload />;
        case 'lectures':
          return <LectureManagement />;
        case 'settings':
          return (
            <div className="p-6">
              <h1 className="text-3xl font-bold mb-4">Settings</h1>
              <p className="text-muted-foreground">Settings page coming soon...</p>
            </div>
          );
        default:
          return <TeacherDashboard onNavigate={handlePageChange} />;
      }
    } else {
      switch (currentPage) {
        case 'lectures':
          return <LectureBrowser onNavigate={handlePageChange} />;
        case 'lecture-detail':
          return selectedLectureId ? (
            <LectureDetail 
              lectureId={selectedLectureId} 
              onBack={handleBackFromLecture} 
            />
          ) : (
            <LectureBrowser />
          );
        case 'notes':
          return (
            <div className="p-6">
              <h1 className="text-3xl font-bold mb-4">My Notes</h1>
              <p className="text-muted-foreground">Notes management coming soon...</p>
            </div>
          );
        case 'settings':
          return (
            <div className="p-6">
              <h1 className="text-3xl font-bold mb-4">Settings</h1>
              <p className="text-muted-foreground">Settings page coming soon...</p>
            </div>
          );
        default:
          return <StudentDashboard onNavigate={handlePageChange} />;
      }
    }
  };

  return (
    <AppLayout 
      currentPage={currentPage === 'lecture-detail' ? 'lectures' : currentPage} 
      onPageChange={handlePageChange}
    >
      {renderPageContent()}
    </AppLayout>
  );
};

export default Index;
