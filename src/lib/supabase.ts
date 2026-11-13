import { createClient } from '@supabase/supabase-js';

// Si faltan las variables en el build (por ejemplo un APK compilado sin .env),
// createClient lanzaría un error al importar y la app quedaría en blanco.
// Con valores de relleno la app abre y solo falla el modo online, con un mensaje de error.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(url, anonKey);
