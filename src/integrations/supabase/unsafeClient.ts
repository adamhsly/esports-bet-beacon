import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './client';

// Unsafe/untyped client wrapper to bypass missing generated Database types during build
export const supabaseUnsafe = supabase as unknown as SupabaseClient<any>;
