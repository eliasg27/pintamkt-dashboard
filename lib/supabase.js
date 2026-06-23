import { createClient } from '@supabase/supabase-js';

const URL = 'https://tjpwiwtwapxspdtmvjbo.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcHdpd3R3YXB4c3BkdG12amJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDU5NjksImV4cCI6MjA5MzMyMTk2OX0.AtlQgeRcEPxjxg-epFkG-pd_BSttJEtbQE-cOy3LBxY';

export const sb = createClient(URL, KEY);
