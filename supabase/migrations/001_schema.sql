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
