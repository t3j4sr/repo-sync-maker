
export interface ScratchCard {
  id: string;
  discount_type: string;
  discount_value: number;
  created_at: string;
  scratched_at: string | null;
  expires_at: string | null;
  is_scratched: boolean;
  shop_name: string;
}

export interface CustomerScratchCards {
  customer_id: string;
  customer_name: string;
  scratch_cards: ScratchCard[];
}
