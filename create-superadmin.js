import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://utoqufzwbspbvdfyozkf.supabase.co';
const supabaseKey = 'sb_publishable_ecVuaoZhmSxI25qYRfK5yw_PocDZGkV';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = 'admin@kontenpro.com';
  const password = '1Y8%4C3w%.jI';

  console.log('Signing up Super Admin...');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Super Admin',
        role: 'superadmin'
      }
    }
  });

  if (error) {
    console.error('Sign up error:', error.message);
    return;
  }

  console.log('User created:', data.user?.id);
}

main();
