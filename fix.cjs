const fs = require('fs');
let sql = fs.readFileSync('supabase_schema.sql', 'utf8');
// For any create policy, prefix it with a drop policy
sql = sql.replace(/^create policy "([^"]+)" on ([a-zA-Z0-9_]+)/gm, 'drop policy if exists "$1" on $2;\ncreate policy "$1" on $2');
fs.writeFileSync('supabase_schema.sql', sql);
console.log('Fixed supabase_schema.sql');
