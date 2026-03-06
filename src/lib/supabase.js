import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wqdguvlmtuxehvahuplm.supabase.co'
const supabaseKey = 'sb_publishable_27b947sgK-t1aZJe0IxTyg_btoz3FSU'

export const supabase = createClient(supabaseUrl, supabaseKey)