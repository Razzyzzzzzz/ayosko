import 'dotenv/config';

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

// AI: sinusuportahan ang Gemini at Claude. Napipili ang provider ayon sa pangalan ng model
// (gemini-* = Gemini, kung hindi = Claude), o i-set ang AI_PROVIDER=gemini|anthropic.
// Kinukuha ang key sa AI_API_KEY, GEMINI_API_KEY, o ANTHROPIC_API_KEY (alinman ang meron).
const explicit = (process.env.AI_PROVIDER || '').trim().toLowerCase();
const rawModel = (process.env.AI_MODEL || '').trim().split(/\s+/)[0]; // putulin kung may aksidenteng text sa dulo ng linya
const aiModel = rawModel || (explicit === 'anthropic' ? 'claude-haiku-5-5' : 'gemini-2.5-flash');
const aiProvider = explicit || (aiModel.startsWith('gemini') ? 'gemini' : 'anthropic');
// Pangalawang model kapag busy o wala na ang pangunahin (Gemini lang). I-set ang AI_FALLBACK_MODEL para palitan.
const aiFallbackModel = (process.env.AI_FALLBACK_MODEL || '').trim().split(/\s+/)[0] || (aiProvider === 'gemini' ? 'gemini-3.5-flash' : '');

export const env = {
  port: Number(process.env.PORT) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  aiKey: (process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY || '').trim(),
  aiModel,
  aiProvider,
  aiFallbackModel,
};