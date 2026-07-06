const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase.storage.from('site-media').list();
  if (error) {
    console.error("Error listing bucket:", error);
  } else {
    console.log("Bucket Files:", data);
  }
}

main();
