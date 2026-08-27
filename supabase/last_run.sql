-- Vani — VOICE library schema
-- Run this in the Supabase SQL editor (or via supabase db push).

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'copy_status') then
    create type public.copy_status as enum ('AVAILABLE', 'BORROWED', 'LOST', 'DAMAGED');
  end if;
end
$$;

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  description text,
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint books_title_not_empty check (length(trim(title)) > 0),
  constraint books_author_not_empty check (length(trim(author)) > 0)
);

create unique index if not exists books_title_author_unique
  on public.books (lower(trim(title)), lower(trim(author)));

create table if not exists public.book_copies (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete restrict,
  copy_code text not null,
  status public.copy_status not null default 'AVAILABLE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint book_copies_code_not_empty check (length(trim(copy_code)) > 0)
);

create unique index if not exists book_copies_copy_code_unique
  on public.book_copies (copy_code);

create index if not exists book_copies_book_id_idx
  on public.book_copies (book_id);

create table if not exists public.borrowers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint borrowers_name_not_empty check (length(trim(name)) > 0)
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  copy_id uuid not null references public.book_copies (id) on delete restrict,
  borrower_id uuid not null references public.borrowers (id) on delete restrict,
  borrowed_at timestamptz not null default now(),
  due_date date,
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  constraint loans_return_after_borrow check (
    returned_at is null or returned_at >= borrowed_at
  )
);

create unique index if not exists loans_one_active_per_copy
  on public.loans (copy_id)
  where returned_at is null;

create index if not exists loans_borrower_id_idx
  on public.loans (borrower_id);

create index if not exists loans_active_idx
  on public.loans (returned_at)
  where returned_at is null;

create table if not exists public.library_settings (
  id uuid primary key default gen_random_uuid(),
  library_name text not null default 'Vani',
  default_loan_days integer not null default 14,
  due_dates_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint library_settings_days_positive check (default_loan_days > 0)
);

insert into public.library_settings (library_name)
select 'Vani'
where not exists (select 1 from public.library_settings);

update public.library_settings
set library_name = 'Vani'
where library_name in ('Folio', 'folio');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at
before update on public.books
for each row execute function public.set_updated_at();

drop trigger if exists book_copies_set_updated_at on public.book_copies;
create trigger book_copies_set_updated_at
before update on public.book_copies
for each row execute function public.set_updated_at();

drop trigger if exists borrowers_set_updated_at on public.borrowers;
create trigger borrowers_set_updated_at
before update on public.borrowers
for each row execute function public.set_updated_at();

drop trigger if exists library_settings_set_updated_at on public.library_settings;
create trigger library_settings_set_updated_at
before update on public.library_settings
for each row execute function public.set_updated_at();

create or replace function public.issue_book(
  p_book_id uuid,
  p_borrower_id uuid,
  p_due_date date default null,
  p_copy_id uuid default null
)
returns public.loans
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_copy public.book_copies;
  v_loan public.loans;
begin
  if p_copy_id is not null then
    select * into v_copy
    from public.book_copies
    where id = p_copy_id
      and book_id = p_book_id
    for update;

    if v_copy.id is null then
      raise exception 'Copy not found for this book.';
    end if;

    if v_copy.status <> 'AVAILABLE' then
      raise exception 'This copy is not available to issue.';
    end if;
  else
    select * into v_copy
    from public.book_copies
    where book_id = p_book_id
      and status = 'AVAILABLE'
    order by copy_code
    for update skip locked
    limit 1;

    if v_copy.id is null then
      raise exception 'Cannot issue this book. No copies are currently available.';
    end if;
  end if;

  insert into public.loans (copy_id, borrower_id, borrowed_at, due_date)
  values (v_copy.id, p_borrower_id, now(), p_due_date)
  returning * into v_loan;

  update public.book_copies
  set status = 'BORROWED'
  where id = v_copy.id;

  return v_loan;
end;
$$;

create or replace function public.return_book(p_loan_id uuid)
returns public.loans
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_loan public.loans;
begin
  select * into v_loan
  from public.loans
  where id = p_loan_id
  for update;

  if v_loan.id is null then
    raise exception 'Loan not found.';
  end if;

  if v_loan.returned_at is not null then
    raise exception 'This book has already been returned.';
  end if;

  update public.loans
  set returned_at = now()
  where id = v_loan.id
  returning * into v_loan;

  update public.book_copies
  set status = 'AVAILABLE'
  where id = v_loan.copy_id
    and status = 'BORROWED';

  return v_loan;
end;
$$;

alter table public.books enable row level security;
alter table public.book_copies enable row level security;
alter table public.borrowers enable row level security;
alter table public.loans enable row level security;
alter table public.library_settings enable row level security;

drop policy if exists "authenticated_all_books" on public.books;
create policy "authenticated_all_books"
  on public.books
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated_all_book_copies" on public.book_copies;
create policy "authenticated_all_book_copies"
  on public.book_copies
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated_all_borrowers" on public.borrowers;
create policy "authenticated_all_borrowers"
  on public.borrowers
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated_all_loans" on public.loans;
create policy "authenticated_all_loans"
  on public.loans
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated_all_settings" on public.library_settings;
create policy "authenticated_all_settings"
  on public.library_settings
  for all
  to authenticated
  using (true)
  with check (true);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.books to authenticated;
grant select, insert, update, delete on public.book_copies to authenticated;
grant select, insert, update, delete on public.borrowers to authenticated;
grant select, insert, update, delete on public.loans to authenticated;
grant select, insert, update, delete on public.library_settings to authenticated;
grant execute on function public.issue_book(uuid, uuid, date, uuid) to authenticated;
grant execute on function public.return_book(uuid) to authenticated;




-- Vani — VOICE library seed
-- Catalog: https://www.srilaprabhupada.co.in/catalog-of-srila-prabhupadas-books
-- Re-runnable. Clears books, copies, borrowers, and loans, then loads the Prabhupada catalog
-- and VOICE students.

truncate public.loans, public.book_copies, public.borrowers, public.books restart identity cascade;

update public.library_settings
set library_name = 'Vani',
    default_loan_days = 14,
    due_dates_enabled = true;

insert into public.books (title, author, description, cover_url, created_at)
values
  (
    'Bhagavad-gita As It Is',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The complete Gita with Sanskrit, word-for-word meanings, translation, and commentary — the foundational text for VOICE students.',
    'https://covers.openlibrary.org/b/isbn/9780892131239-L.jpg',
    now() - interval '40 days'
  ),
  (
    'Srimad Bhagavatam - Canto 1',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  (
    'Srimad Bhagavatam - Canto 2',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  (
    'Srimad Bhagavatam - Canto 3 - Volume 1',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  (
    'Srimad Bhagavatam - Canto 3 - Volume 2',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  (
    'Srimad Bhagavatam - Canto 4 - Volume 1',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  (
    'Srimad Bhagavatam - Canto 4 - Volume 2',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  (
    'Srimad Bhagavatam - Canto 5',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  (
    'Srimad Bhagavatam - Canto 6',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  (
    'Srimad Bhagavatam - Canto 7',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  (
    'Srimad Bhagavatam - Canto 8',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  (
    'Srimad Bhagavatam - Canto 9',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  (
    'Srimad Bhagavatam - Canto 10 - Volume 1',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  (
    'Srimad Bhagavatam - Canto 10 - Volume 2',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  (
    'Srimad Bhagavatam - Canto 10 - Volume 3',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  (
    'Srimad Bhagavatam - Canto 10 - Volume 4',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  (
    'Srimad Bhagavatam - Canto 11 - Volume 1',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  (
    'Srimad Bhagavatam - Canto 11 - Volume 2',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  (
    'Srimad Bhagavatam - Canto 12',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The ripened fruit of Vedic knowledge: Krishna''s pastimes, the nature of the self, and the path of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892132756-L.jpg',
    now() - interval '39 days'
  ),
  
  (
    'Sri Chaitanya Charitamrita Adi-lila - Volume 1',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The life and teachings of Sri Chaitanya Mahaprabhu, the golden avatara of the sankirtana movement.',
    'https://covers.openlibrary.org/b/isbn/9780892131437-L.jpg',
    now() - interval '38 days'
  ),
  (
    'Sri Chaitanya Charitamrita Adi-lila - Volume 2',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The life and teachings of Sri Chaitanya Mahaprabhu, the golden avatara of the sankirtana movement.',
    'https://covers.openlibrary.org/b/isbn/9780892131437-L.jpg',
    now() - interval '38 days'
  ),
  (
    'Sri Chaitanya Charitamrita Madhya-lila - Volume 1',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The life and teachings of Sri Chaitanya Mahaprabhu, the golden avatara of the sankirtana movement.',
    'https://covers.openlibrary.org/b/isbn/9780892131437-L.jpg',
    now() - interval '38 days'
  ),
  (
    'Sri Chaitanya Charitamrita Madhya-lila - Volume 2',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The life and teachings of Sri Chaitanya Mahaprabhu, the golden avatara of the sankirtana movement.',
    'https://covers.openlibrary.org/b/isbn/9780892131437-L.jpg',
    now() - interval '38 days'
  ),
  (

    'Sri Chaitanya Charitamrita Madhya-lila - Volume 3',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The life and teachings of Sri Chaitanya Mahaprabhu, the golden avatara of the sankirtana movement.',
    'https://covers.openlibrary.org/b/isbn/9780892131437-L.jpg',
    now() - interval '38 days'
  ),
  (

    'Sri Chaitanya Charitamrita Madhya-lila - Volume 4',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The life and teachings of Sri Chaitanya Mahaprabhu, the golden avatara of the sankirtana movement.',
    'https://covers.openlibrary.org/b/isbn/9780892131437-L.jpg',
    now() - interval '38 days'
  ),
  (

    'Sri Chaitanya Charitamrita Madhya-lila - Volume 5',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The life and teachings of Sri Chaitanya Mahaprabhu, the golden avatara of the sankirtana movement.',
    'https://covers.openlibrary.org/b/isbn/9780892131437-L.jpg',
    now() - interval '38 days'
  ),
  (

    'Sri Chaitanya Charitamrita Antya-lila - Volume 1',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The life and teachings of Sri Chaitanya Mahaprabhu, the golden avatara of the sankirtana movement.',
    'https://covers.openlibrary.org/b/isbn/9780892131437-L.jpg',
    now() - interval '38 days'
  ),
  (

    'Sri Chaitanya Charitamrita Antya-lila - Volume 2',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The life and teachings of Sri Chaitanya Mahaprabhu, the golden avatara of the sankirtana movement.',
    'https://covers.openlibrary.org/b/isbn/9780892131437-L.jpg',
    now() - interval '38 days'
  ),
  (
    'The Nectar of Devotion',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'A summary study of Bhakti-rasamrita-sindhu — the science of loving service to Krishna.',
    'https://covers.openlibrary.org/b/isbn/9780892131024-L.jpg',
    now() - interval '37 days'
  ),
  (
    'The Nectar of Instruction',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'Eleven essential verses of Rupa Gosvami on how to practice bhakti in the association of devotees.',
    'https://covers.openlibrary.org/b/isbn/9780892132787-L.jpg',
    now() - interval '36 days'
  ),
  (
    'Sri Isopanisad',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'Eighteen mantras on the relationship between the living being, the world, and the Supreme Person.',
    'https://covers.openlibrary.org/b/isbn/9780892132809-L.jpg',
    now() - interval '35 days'
  ),
  (
    'Easy Journey to Other Planets',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'A short introduction to antimaterial travel — the soul''s journey beyond the material universe.',
    'https://covers.openlibrary.org/b/isbn/9780892131079-L.jpg',
    now() - interval '34 days'
  ),
  (
    'Teachings of Lord Chaitanya',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'A summary study of Sri Chaitanya-charitamrita, presenting Mahaprabhu''s conversations and philosophy.',
    'https://covers.openlibrary.org/b/isbn/9780892130003-L.jpg',
    now() - interval '33 days'
  ),
  (
    'Message of Godhead',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'An early essay on karma, jnana, and bhakti, written before Srila Prabhupada left India.',
    null,
    now() - interval '32 days'
  ),
  (
    'Beyond Birth and Death',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'A concise look at reincarnation, the eternal self, and how to become free from the cycle of birth and death.',
    'https://covers.openlibrary.org/b/isbn/9780892131307-L.jpg',
    now() - interval '31 days'
  ),
  (
    'Raja Vidya – The King of Knowledge',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'Commentaries on the ninth chapter of the Gita — the most confidential knowledge of Krishna.',
    'https://covers.openlibrary.org/b/isbn/9780892131321-L.jpg',
    now() - interval '30 days'
  ),
  (
    'The Path of Perfection',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'Talks on the sixth chapter of the Gita, explaining yoga as it is meant to be practiced.',
    'https://covers.openlibrary.org/b/isbn/9780892131031-L.jpg',
    now() - interval '29 days'
  ),
  (
    'The Perfection of Yoga',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'A brief, clear introduction to yoga culminating in bhakti — loving service to Krishna.',
    'https://covers.openlibrary.org/b/isbn/9780892131376-L.jpg',
    now() - interval '28 days'
  ),
  (
    'Krishna Consciousness – The Topmost Yoga System',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'Why chanting the holy names is the yoga for this age, above all other systems.',
    'https://covers.openlibrary.org/b/isbn/9780892131451-L.jpg',
    now() - interval '27 days'
  ),
  (
    'Krishna Consciousness – The Matchless Gift',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'Lectures on the unmatched gift of Krishna consciousness, offered freely to everyone.',
    null,
    now() - interval '26 days'
  ),
  (
    'Elevation to Krishna Consciousness',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'How ordinary life can be lifted into spiritual practice through hearing, chanting, and service.',
    null,
    now() - interval '25 days'
  ),
  (
    'On the Way to Krishna',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'A short guidebook for anyone beginning the journey back to Godhead.',
    null,
    now() - interval '24 days'
  ),
  (
    'Teachings of Lord Kapila',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'Kapila''s instructions to Devahuti on Sankhya, the soul, and the process of devotion.',
    'https://covers.openlibrary.org/b/isbn/9780892131123-L.jpg',
    now() - interval '23 days'
  ),
  (
    'Teachings of Queen Kunti',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'Queen Kunti''s prayers from the Bhagavatam, showing how a devotee sees Krishna in every circumstance.',
    null,
    now() - interval '22 days'
  ),
  (
    'Transcendental Teachings of Prahlada Maharaja',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'Prahlada''s teachings to his schoolmates — how even a child can become a pure devotee.',
    null,
    now() - interval '21 days'
  ),
  (
    'A Second Chance',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'The story of Ajamila, and the power of the holy name at the moment of death.',
    'https://covers.openlibrary.org/b/isbn/9780892132732-L.jpg',
    now() - interval '20 days'
  ),
  (
    'Dharma – The Way of Transcendence',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'What dharma actually is, and how it leads beyond temporary duty to eternal service.',
    null,
    now() - interval '19 days'
  ),
  (
    'The Science of Self-Realization',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'Collected conversations and essays introducing Krishna consciousness to the modern world.',
    'https://covers.openlibrary.org/b/isbn/9780892131017-L.jpg',
    now() - interval '18 days'
  ),
  (
    'The Journey of Self-Discovery',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'Further conversations on the self, society, and the search for lasting happiness.',
    'https://covers.openlibrary.org/b/isbn/9780892132717-L.jpg',
    now() - interval '17 days'
  ),
  (
    'The Quest for Enlightenment',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'Selected talks answering the oldest human questions with the Vedic conclusion.',
    null,
    now() - interval '16 days'
  ),
  (
    'Renunciation Through Wisdom',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'Bengali essays from the 1940s on true renunciation, duty, and devotion.',
    null,
    now() - interval '15 days'
  ),
  (
    'Perfect Questions Perfect Answers',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'A young seeker''s conversations with Srila Prabhupada in the jungles of India.',
    'https://covers.openlibrary.org/b/isbn/9780892132700-L.jpg',
    now() - interval '14 days'
  ),
  (
    'Civilization and Transcendence',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'A conversation on what makes a civilization advanced, and what it means to go beyond it.',
    null,
    now() - interval '13 days'
  ),
  (
    'Beyond Illusion and Doubt',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'Clear replies to philosophical doubts about God, the soul, and the material world.',
    null,
    now() - interval '12 days'
  ),
  (
    'Life Comes from Life',
    'A.C. Bhaktivedanta Swami Prabhupada',
    'Morning-walk conversations with scientists on the origin of life and consciousness.',
    'https://covers.openlibrary.org/b/isbn/9780892131000-L.jpg',
    now() - interval '11 days'
  ),
  (
    'Srila Prabhupada Lilamrita',
    'Satsvarupa dasa Goswami',
    'The authorized biography of His Divine Grace A.C. Bhaktivedanta Swami Prabhupada.',
    null,
    now() - interval '10 days'
  );

insert into public.book_copies (book_id, copy_code, status, created_at)
select
  b.id,
  p.prefix || '-' || lpad(gs.n::text, 3, '0'),
  'AVAILABLE',
  b.created_at
from public.books b
join (
  values
    ('Bhagavad-gita As It Is', 'BG', 2),
    ('Srimad Bhagavatam - Canto 1', 'SB_1', 1),
    ('Srimad Bhagavatam - Canto 2', 'SB_2', 1),
    ('Srimad Bhagavatam - Canto 3 - Volume 1', 'SB_3.1', 1),
    ('Srimad Bhagavatam - Canto 3 - Volume 2', 'SB_3.2', 1),
    ('Srimad Bhagavatam - Canto 4 - Volume 1', 'SB_4.1', 1),
    ('Srimad Bhagavatam - Canto 4 - Volume 2', 'SB_4.2', 1),
    ('Srimad Bhagavatam - Canto 5', 'SB_5', 3),
    ('Srimad Bhagavatam - Canto 6', 'SB_6', 1),
    ('Srimad Bhagavatam - Canto 7', 'SB_7', 1),
    ('Srimad Bhagavatam - Canto 8', 'SB_8', 1),
    ('Srimad Bhagavatam - Canto 9', 'SB_9', 1),
    ('Srimad Bhagavatam - Canto 10 - Volume 1', 'SB_10.1', 1),
    ('Srimad Bhagavatam - Canto 10 - Volume 2', 'SB_10.2', 1),
    ('Srimad Bhagavatam - Canto 10 - Volume 3', 'SB_10.3', 1),
    ('Srimad Bhagavatam - Canto 10 - Volume 4', 'SB_10.4', 1),
    ('Srimad Bhagavatam - Canto 11 - Volume 1', 'SB_11.1', 1),
    ('Srimad Bhagavatam - Canto 11 - Volume 2', 'SB_11.2', 1),
    ('Srimad Bhagavatam - Canto 12', 'SB_12', 1),
    ('Sri Chaitanya Charitamrita Adi-lila - Volume 1', 'CC_AL_1', 1),
    ('Sri Chaitanya Charitamrita Adi-lila - Volume 2', 'CC_AL_2', 1),
    ('Sri Chaitanya Charitamrita Madhya-lila - Volume 1', 'CC_ML_1', 1),
    ('Sri Chaitanya Charitamrita Madhya-lila - Volume 2', 'CC_ML_2', 1),
    ('Sri Chaitanya Charitamrita Madhya-lila - Volume 3', 'CC_ML_3', 1),
    ('Sri Chaitanya Charitamrita Madhya-lila - Volume 4', 'CC_ML_4', 1),
    ('Sri Chaitanya Charitamrita Madhya-lila - Volume 5', 'CC_ML_5', 1),
    ('Sri Chaitanya Charitamrita Antya-lila - Volume 1', 'CC_ML_6', 1),
    ('Sri Chaitanya Charitamrita Antya-lila - Volume 2', 'CC_ML_7', 1),
    ('The Nectar of Devotion', 'ND', 1),
    ('The Nectar of Instruction', 'NOI', 1),
    ('Sri Isopanisad', 'SI', 1),
    ('Easy Journey to Other Planets', 'EJP', 1),
    ('Teachings of Lord Chaitanya', 'TLC', 1),
    ('Message of Godhead', 'MOG', 1),
    ('Beyond Birth and Death', 'BBD', 1),
    ('Raja Vidya – The King of Knowledge', 'RV', 1),
    ('The Path of Perfection', 'POP', 1),
    ('The Perfection of Yoga', 'POY', 1),
    ('Krishna Consciousness – The Topmost Yoga System', 'TYS', 1),
    ('Krishna Consciousness – The Matchless Gift', 'TMG', 1),
    ('Elevation to Krishna Consciousness', 'EKC', 1),
    ('On the Way to Krishna', 'OWK', 1),
    ('Teachings of Lord Kapila', 'TLK', 1),
    ('Teachings of Queen Kunti', 'TQK', 1),
    ('Transcendental Teachings of Prahlada Maharaja', 'TTP', 1),
    ('A Second Chance', 'ASC', 1),
    ('Dharma – The Way of Transcendence', 'DWT', 1),
    ('The Science of Self-Realization', 'SSR', 1),
    ('The Journey of Self-Discovery', 'JSD', 1),
    ('The Quest for Enlightenment', 'QFE', 1),
    ('Renunciation Through Wisdom', 'RTW', 1),
    ('Perfect Questions Perfect Answers', 'PQPA', 1),
    ('Civilization and Transcendence', 'CAT', 1),
    ('Beyond Illusion and Doubt', 'BID', 1),
    ('Life Comes from Life', 'LCFL', 1),
    ('Srila Prabhupada Lilamrita', 'SPL',1)
) as p(title, prefix, copies) on p.title = b.title
cross join lateral generate_series(1, p.copies) as gs(n);

insert into public.borrowers (name, email, created_at)
values
  ('Arun', 'arun@voice.local', now() - interval '45 days'),
  ('Varrun', 'varrun@voice.local', now() - interval '44 days'),
  ('Sahil', 'sahil@voice.local', now() - interval '43 days'),
  ('Shashank', 'shashank@voice.local', now() - interval '42 days'),
  ('Vishal', 'vishal@voice.local', now() - interval '41 days'),
  ('Sumit', 'sumit@voice.local', now() - interval '40 days'),
  ('Anirudh', 'anirudh@voice.local', now() - interval '38 days'),
  ('Prince', 'prince@voice.local', now() - interval '36 days'),
  ('Manjunath', 'manjunath@voice.local', now() - interval '34 days'),
  ('Uday', 'uday@voice.local', now() - interval '30 days');

-- -- Active loans
-- insert into public.loans (copy_id, borrower_id, borrowed_at, due_date, returned_at, created_at)
-- select c.id, b.id, now() - interval '6 days', (now() + interval '8 days')::date, null, now() - interval '6 days'
-- from public.book_copies c
-- join public.borrowers b on b.name = 'Prince'
-- where c.copy_code = 'BG-002';

-- insert into public.loans (copy_id, borrower_id, borrowed_at, due_date, returned_at, created_at)
-- select c.id, b.id, now() - interval '4 days', (now() + interval '10 days')::date, null, now() - interval '4 days'
-- from public.book_copies c
-- join public.borrowers b on b.name = 'Arun'
-- where c.copy_code = 'SI-001';

-- insert into public.loans (copy_id, borrower_id, borrowed_at, due_date, returned_at, created_at)
-- select c.id, b.id, now() - interval '3 days', (now() + interval '11 days')::date, null, now() - interval '3 days'
-- from public.book_copies c
-- join public.borrowers b on b.name = 'Sahil'
-- where c.copy_code = 'SSR-002';

-- insert into public.loans (copy_id, borrower_id, borrowed_at, due_date, returned_at, created_at)
-- select c.id, b.id, now() - interval '18 days', (now() - interval '4 days')::date, null, now() - interval '18 days'
-- from public.book_copies c
-- join public.borrowers b on b.name = 'Vishal'
-- where c.copy_code = 'NOI-001';

-- insert into public.loans (copy_id, borrower_id, borrowed_at, due_date, returned_at, created_at)
-- select c.id, b.id, now() - interval '2 days', (now() + interval '12 days')::date, null, now() - interval '2 days'
-- from public.book_copies c
-- join public.borrowers b on b.name = 'Anirudh'
-- where c.copy_code = 'TLC-001';

-- insert into public.loans (copy_id, borrower_id, borrowed_at, due_date, returned_at, created_at)
-- select c.id, b.id, now() - interval '1 day', (now() + interval '13 days')::date, null, now() - interval '1 day'
-- from public.book_copies c
-- join public.borrowers b on b.name = 'Sumit'
-- where c.copy_code = 'RV-001';

-- -- Returned history
-- insert into public.loans (copy_id, borrower_id, borrowed_at, due_date, returned_at, created_at)
-- select c.id, b.id, now() - interval '20 days', (now() - interval '6 days')::date, now() - interval '8 days', now() - interval '20 days'
-- from public.book_copies c
-- join public.borrowers b on b.name = 'Shashank'
-- where c.copy_code = 'PQPA-001';

-- insert into public.loans (copy_id, borrower_id, borrowed_at, due_date, returned_at, created_at)
-- select c.id, b.id, now() - interval '16 days', (now() - interval '2 days')::date, now() - interval '3 days', now() - interval '16 days'
-- from public.book_copies c
-- join public.borrowers b on b.name = 'Manjunath'
-- where c.copy_code = 'EJP-001';

-- insert into public.loans (copy_id, borrower_id, borrowed_at, due_date, returned_at, created_at)
-- select c.id, b.id, now() - interval '12 days', (now() + interval '2 days')::date, now() - interval '2 days', now() - interval '12 days'
-- from public.book_copies c
-- join public.borrowers b on b.name = 'Uday'
-- where c.copy_code = 'BBD-001';

-- insert into public.loans (copy_id, borrower_id, borrowed_at, due_date, returned_at, created_at)
-- select c.id, b.id, now() - interval '10 days', (now() + interval '4 days')::date, now() - interval '1 day', now() - interval '10 days'
-- from public.book_copies c
-- join public.borrowers b on b.name = 'Varrun'
-- where c.copy_code = 'ND-001';

-- update public.book_copies
-- set status = 'BORROWED'
-- where copy_code in ('BG-002', 'SI-001', 'SSR-002', 'NOI-001', 'TLC-001', 'RV-001');
