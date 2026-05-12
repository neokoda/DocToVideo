/**
 * Delete documents by title pattern.
 * Run: node scripts/delete-docs.mjs [search term]
 * Example: node scripts/delete-docs.mjs "Data Structures"
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const searchTerm = process.argv[2];
if (!searchTerm || searchTerm.trim().length < 2) {
  console.error('Error: provide a search term of at least 2 characters to avoid deleting everything.');
  console.error('Usage: node scripts/delete-docs.mjs "search term"');
  process.exit(1);
}

const { data: docs, error } = await supabase
  .from('documents')
  .select('id, title, source_type, status')
  .ilike('title', `%${searchTerm}%`);

if (error) { console.error('Query failed:', error.message); process.exit(1); }
if (!docs.length) { console.log(`No documents found matching "${searchTerm}".`); process.exit(0); }

console.log(`Found ${docs.length} document(s) matching "${searchTerm}":`);
for (const doc of docs) {
  console.log(`  [${doc.status}] ${doc.title} — ${doc.id}`);
}

console.log('\nDeleting...');
for (const doc of docs) {
  // Delete storage file (best-effort)
  const storagePath = `${doc.id}/original.${doc.source_type}`;
  const { error: storageErr } = await supabase.storage.from('documents').remove([storagePath]);
  if (storageErr) console.warn(`  storage: ${storagePath} — ${storageErr.message}`);

  // Delete document row (cascade removes scenes, chunks, analytics, qa)
  const { error: delErr } = await supabase.from('documents').delete().eq('id', doc.id);
  if (delErr) {
    console.error(`  ✗ ${doc.title}: ${delErr.message}`);
  } else {
    console.log(`  ✓ deleted: ${doc.title}`);
  }
}
