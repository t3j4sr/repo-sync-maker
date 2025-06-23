
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export const useActivityLogger = () => {
  const { user } = useAuth();

  const logActivity = async (
    actionType: string,
    entityType: string,
    entityId: string,
    description: string,
    metadata?: any
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          action_type: actionType,
          entity_type: entityType,
          entity_id: entityId,
          description: description,
          metadata: metadata
        });

      if (error) {
        console.error('Error logging activity:', error);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  return { logActivity };
};
