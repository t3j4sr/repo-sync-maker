
export { supabase } from '@/integrations/supabase/client'

export type Customer = {
  id: string
  name: string
  phone: string
  created_at: string
  user_id: string
}

export type Purchase = {
  id: string
  customer_id: string
  amount: number
  created_at: string
  user_id: string
}

export type CustomerWithPurchases = Customer & {
  total_purchases: number
}

export type ActivityLog = {
  id: string
  user_id: string
  action_type: string
  entity_type: string
  entity_id: string
  description: string
  metadata: any
  created_at: string
}
