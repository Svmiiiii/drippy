-- Email verification gate at checkout: a code is emailed to the address the
-- customer typed, and the order is only created once they type it back in.
-- Cuts down on invalid orders from typoed/fake emails filling the DB.
create table checkout_email_verifications (
  id           uuid primary key default uuid_generate_v4(),
  email        text not null,
  code         text not null,
  attempts     int not null default 0,
  verified     boolean not null default false,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now()
);

create index idx_checkout_email_verifications_email on checkout_email_verifications(lower(email));

-- Only ever touched via the service-role client from API routes.
alter table checkout_email_verifications enable row level security;
