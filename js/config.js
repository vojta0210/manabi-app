// ==============================================
// CONFIG — Supabase client setup + name/email helpers (slugify/emailFor).
// Load order: FIRST (after the Supabase CDN script). Nothing here depends on other app files.
// ==============================================

// ==============================================
// HOMEWORK MANAGER - FULL FEATURED
// ==============================================

// ==============================================
// SUPABASE — real backend (Postgres + Auth) replacing localStorage.
// URL and publishable key are meant to be embedded in client code (that is
// what the "publishable" key is for) — real access control lives server-side
// in Postgres Row Level Security policies, not in this file.
// ==============================================
const SUPABASE_URL = 'https://vciqhfnktngakidaxnzn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_XK4ihQQ0T871Ei-OVfELTg_l94nKxjl';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Login/register still only ever ask for a name, never a real email — this
// turns a name+role into a stable synthetic address so Supabase Auth (which
// needs an email) has something unique to key off of. Nobody's real email is
// ever collected or stored.
function slugify(str) {
  return (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user';
}
function emailFor(name, role) { return `${slugify(name)}-${role}@manabi.local`; }

// ==============================================
// SCHEDULE (rozvrh) — the fixed weekly bell schedule, 0. (nultá) through 11. hodina,
// 7:45–18:25 (the later periods are for odpolední kroužky). `period` below is the
// 0-based index into this array, stored as-is in schedule_slots.period (see schema.sql
// section 12 / patch_schedule.sql). Days are 1=Monday..5=Friday, matching ISO weekday
// numbering, stored in schedule_slots.day_of_week.
// ==============================================
const LESSON_PERIODS = [
  { label: '0.',  start: '7:45',  end: '8:30'  },
  { label: '1.',  start: '8:40',  end: '9:25'  },
  { label: '2.',  start: '9:35',  end: '10:20' },
  { label: '3.',  start: '10:30', end: '11:15' },
  { label: '4.',  start: '11:25', end: '12:10' },
  { label: '5.',  start: '12:20', end: '13:05' },
  { label: '6.',  start: '13:15', end: '14:00' },
  { label: '7.',  start: '14:10', end: '14:55' },
  { label: '8.',  start: '15:05', end: '15:50' },
  { label: '9.',  start: '16:00', end: '16:45' },
  { label: '10.', start: '16:55', end: '17:40' },
  { label: '11.', start: '17:50', end: '18:25' },
];
const SCHEDULE_DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
];
