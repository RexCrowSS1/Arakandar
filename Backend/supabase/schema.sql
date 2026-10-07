-- Bootstrap for a NEW Supabase project. The connected project already has these
-- tables; the application uses them without requiring a destructive migration.
begin;

create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),
    email varchar(255) not null unique,
    name varchar(100),
    created_at timestamptz default now()
);

create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id),
    title varchar(255) default 'New Conversation',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id),
    role varchar(20) not null check (role in ('user', 'assistant', 'system')),
    content text not null,
    tokens_used integer default 0,
    created_at timestamptz default now()
);

create table if not exists public.agent_logs (
    id uuid primary key default gen_random_uuid(),
    message_id uuid references public.messages(id),
    tool_name varchar(100) not null,
    input_payload jsonb,
    output_payload jsonb,
    execution_time_ms integer,
    created_at timestamptz default now()
);

create index if not exists conversations_user_updated_idx
    on public.conversations (user_id, updated_at desc, id desc);
create index if not exists messages_conversation_created_idx
    on public.messages (conversation_id, created_at, id);
create index if not exists agent_logs_message_idx on public.agent_logs (message_id);

-- Only the backend accesses these tables. No browser-side Supabase credentials.
alter table public.users enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.agent_logs enable row level security;
revoke all on public.users, public.conversations, public.messages, public.agent_logs
    from anon, authenticated;
grant select, insert, update, delete
    on public.users, public.conversations, public.messages, public.agent_logs to service_role;

insert into public.users (id, email, name)
values ('7da1eb14-f6de-5a34-b61d-a4b8156acc84', 'admin@bandarpasar.local', 'Admin')
on conflict (id) do nothing;

commit;
