import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import UsersList from '@/components/users/UsersList';
import TeamActivity from '@/components/users/TeamActivity';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/context/auth-context';
import ProfileEditModal from '@/components/profile/ProfileEditModal';

interface UserProfile {
  id: number;
  username: string;
  fullName: string;
  initials: string;
  email: string;
  role: string;
  avatarColor?: string;
}

export default function TeamPage() {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { user } = useAuth();

  // Get current user info
  const { data: currentUser } = useQuery<UserProfile>({
    queryKey: ["/api/auth/me"],
    enabled: !!user,
  });

  return (
    <AppLayout>
      <div className="container py-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Collaboration</h1>
            <p className="text-muted-foreground">
              View team members and collaborate on investment opportunities
            </p>
          </div>

          <div className="mt-4 sm:mt-0">
            <Button onClick={() => setIsProfileModalOpen(true)} variant="outline">
              Edit Your Profile
            </Button>
          </div>
        </div>

        <Tabs defaultValue="team" className="mt-6">
          <TabsList className="mb-4">
            <TabsTrigger value="team">Team Members</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <UsersList />
          </TabsContent>

          <TabsContent value="activity">
            <div className="space-y-4">
              <TeamActivity />
            </div>
          </TabsContent>
        </Tabs>

        {/* Profile Edit Modal */}
        {currentUser && (
          <ProfileEditModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            currentName={currentUser.fullName || ''}
            currentRole={currentUser.role || 'analyst'}
          />
        )}
      </div>
    </AppLayout>
  );
}
