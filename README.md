# Vani

The library of **VOICE** — Vedic Oasis of Culture and Ethics.

Vani (वाणी) means sacred speech. The collection is Srila Prabhupada’s books, kept for students who borrow, read, and return them.

Catalog source: [Srila Prabhupada’s books](https://www.srilaprabhupada.co.in/catalog-of-srila-prabhupadas-books)

## Stack

- Vite, React, TypeScript
- Tailwind CSS, shadcn/ui, Lucide
- Supabase (PostgreSQL, Auth, Row Level Security)

## Setup

1. Create a Supabase project.
2. In the SQL editor, run `supabase/migrations/001_schema.sql`.
3. Run `supabase/seed.sql` to load the Prabhupada catalog and VOICE students (Arun, Varrun, Sahil, Shashank, Vishal, Sumit, Anirudh, Prince, Manjunath, Uday).
4. Copy `.env.example` to `.env` and add:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Use only the anon/public key. Never put the service-role key in the frontend.

5. Enable Email authentication. For local use you can disable “Confirm email”.
6. Install and start:

```
npm install
npm run dev
```

If the database is already live, re-run `supabase/seed.sql` to replace the sample data with this catalog.

## How it works

Availability is never stored as a handwritten number:

`available copies = copies with AVAILABLE status`

Issuing a book runs a Postgres transaction (`issue_book`). Returning a book (`return_book`) keeps the loan in history. Copy codes follow the title (`Bhagavad-gita As It Is` → `BG-001`).
