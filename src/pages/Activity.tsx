
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface ActivityLog {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  description: string;
  metadata: any;
  created_at: string;
  user_id: string;
}

interface Profile {
  shopkeeper_name: string;
  shop_name: string;
}

interface ActivityLogWithProfile extends ActivityLog {
  profile?: Profile;
}

const Activity = () => {
  const [activities, setActivities] = useState<ActivityLogWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchActivities = async () => {
    try {
      console.log('Fetching all activities from all users');
      
      // Fetch ALL activities from ALL users (not filtered by current user)
      const { data: activityData, error: activityError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Increased limit to show more activities

      if (activityError) {
        console.error('Error fetching activities:', activityError);
        throw activityError;
      }

      console.log('Activities fetched:', activityData);

      // Fetch all profiles to match with activities
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, shopkeeper_name, shop_name');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Create a map of user_id to profile
      const profileMap = profilesData?.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, Profile>) || {};

      const activitiesWithProfiles = activityData?.map(activity => ({
        ...activity,
        profile: profileMap[activity.user_id]
      })) || [];

      setActivities(activitiesWithProfiles);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Set up real-time subscription for activity updates from ALL users
    const channel = supabase
      .channel('all-activity-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          console.log('New activity detected from any user, refreshing...', payload);
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionType = (actionType: string) => {
    switch (actionType) {
      case 'customer_created':
        return 'Customer Added';
      case 'purchase_added':
        return 'Purchase Added';
      case 'customer_updated':
        return 'Customer Updated';
      default:
        return 'Activity';
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'customer_created':
        return 'bg-green-100 text-green-800';
      case 'purchase_added':
        return 'bg-blue-100 text-blue-800';
      case 'customer_updated':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleNavigateToProfile = () => {
    navigate('/profile');
  };

  const handleToggleActivityLog = () => {
    navigate('/activity');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800">
        <Header 
          onToggleActivityLog={handleToggleActivityLog}
          onNavigateToProfile={handleNavigateToProfile}
          showActivityLog={false}
        />
        <div className="flex-1 bg-white rounded-t-3xl min-h-[calc(100vh-80px)] p-6">
          <div className="text-center py-8 text-gray-500">Loading activities...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800">
      <Header 
        onToggleActivityLog={handleToggleActivityLog}
        onNavigateToProfile={handleNavigateToProfile}
        showActivityLog={false}
      />
      
      <div className="flex-1 bg-white rounded-t-3xl min-h-[calc(100vh-80px)] p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Recent Activity</h2>
          <p className="text-gray-600">Live activity feed from all users on the platform</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Platform Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg font-medium">No activities yet</p>
                <p className="text-sm">Activities will appear here as users interact with the app</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-purple-100 text-purple-600">
                          {activity.profile?.shopkeeper_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">
                            {activity.profile?.shopkeeper_name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {activity.profile?.shop_name || 'Unknown Shop'}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(activity.action_type)}`}>
                          {getActionType(activity.action_type)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{activity.description}</p>
                      <p className="text-xs text-gray-500">{formatDate(activity.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Activity;
