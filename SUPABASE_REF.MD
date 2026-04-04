| table_schema | table_name     | column_name             | data_type                | is_nullable | column_default    |
| ------------ | -------------- | ----------------------- | ------------------------ | ----------- | ----------------- |
| public       | achievements   | id                      | text                     | NO          | null              |
| public       | achievements   | name                    | text                     | NO          | null              |
| public       | achievements   | description             | text                     | NO          | null              |
| public       | achievements   | icon                    | text                     | NO          | null              |
| public       | achievements   | is_hidden               | boolean                  | YES         | false             |
| public       | achievements   | coin_reward             | integer                  | NO          | 0                 |
| public       | battle_lineups | id                      | uuid                     | NO          | gen_random_uuid() |
| public       | battle_lineups | user_id                 | uuid                     | NO          | null              |
| public       | battle_lineups | name                    | text                     | NO          | 'Lineup'::text    |
| public       | battle_lineups | slots                   | jsonb                    | NO          | '[]'::jsonb       |
| public       | battle_lineups | created_at              | timestamp with time zone | YES         | now()             |
| public       | binder_cards   | id                      | uuid                     | NO          | gen_random_uuid() |
| public       | binder_cards   | binder_id               | uuid                     | NO          | null              |
| public       | binder_cards   | user_card_id            | uuid                     | NO          | null              |
| public       | binder_cards   | position                | integer                  | NO          | 0                 |
| public       | binder_cards   | created_at              | timestamp with time zone | YES         | now()             |
| public       | binder_likes   | id                      | uuid                     | NO          | gen_random_uuid() |
| public       | binder_likes   | binder_id               | uuid                     | NO          | null              |
| public       | binder_likes   | user_id                 | uuid                     | NO          | null              |
| public       | binder_likes   | created_at              | timestamp with time zone | YES         | now()             |
| public       | binders        | id                      | uuid                     | NO          | gen_random_uuid() |
| public       | binders        | user_id                 | uuid                     | NO          | null              |
| public       | binders        | name                    | text                     | NO          | null              |
| public       | binders        | color                   | text                     | NO          | '#3b82f6'::text   |
| public       | binders        | include_slabs           | boolean                  | YES         | false             |
| public       | binders        | created_at              | timestamp with time zone | YES         | now()             |
| public       | binders        | updated_at              | timestamp with time zone | YES         | now()             |
| public       | binders        | is_featured             | boolean                  | YES         | false             |
| public       | cards          | id                      | text                     | NO          | null              |
| public       | cards          | name                    | text                     | NO          | null              |
| public       | cards          | subtype                 | text                     | YES         | null              |
| public       | cards          | hp                      | integer                  | YES         | null              |
| public       | cards          | evolves_from            | text                     | YES         | null              |
| public       | cards          | set_id                  | text                     | YES         | null              |
| public       | cards          | national_pokedex_number | integer                  | YES         | null              |
| public       | cards          | image_url               | text                     | YES         | null              |
| public       | cards          | image_url_hi            | text                     | YES         | null              |
| public       | cards          | market_price_usd        | numeric                  | YES         | 0                 |
| public       | cards          | is_special              | boolean                  | YES         | false             |
| public       | cards          | pokemon_type            | text                     | YES         | null              |
| public       | cards          | rarity                  | text                     | YES         | null              |
| public       | events         | id                      | text                     | NO          | null              |
| public       | events         | name                    | text                     | NO          | null              |
| public       | events         | description             | text                     | NO          | null              |
| public       | events         | icon                    | text                     | NO          | ''::text          |
| public       | events         | effect                  | text                     | NO          | null              |
| public       | events         | magnitude               | double precision         | NO          | 1.0               |
| public       | events         | color                   | text                     | NO          | '#9ca3af'::text   |
| public       | events         | accent_color            | text                     | NO          | '#000000'::text   |
| public       | events         | event_rarity            | text                     | NO          | 'common'::text    |
| public       | events         | duration_min            | double precision         | NO          | 1                 |
| public       | events         | duration_max            | double precision         | NO          | 2                 |
| public       | events         | weight                  | integer                  | NO          | 1                 |
| public       | events         | is_active               | boolean                  | NO          | true              |
| public       | events         | force_active_until      | timestamp with time zone | YES         | null              |
| public       | friendships    | id                      | uuid                     | NO          | gen_random_uuid() |
| public       | friendships    | requester_id            | uuid                     | NO          | null              |
| public       | friendships    | addressee_id            | uuid                     | NO          | null              |
| public       | friendships    | status                  | text                     | NO          | 'pending'::text   |
| public       | friendships    | created_at              | timestamp with time zone | YES         | now()             |
| public       | level_up_stash | id                      | uuid                     | NO          | gen_random_uuid() |
| public       | level_up_stash | user_id                 | uuid                     | NO          | null              |
| public       | level_up_stash | level_reached           | integer                  | NO          | null              |
| public       | level_up_stash | coins                   | integer                  | NO          | null              |
| public       | level_up_stash | pack_id                 | text                     | NO          | null              |
| public       | level_up_stash | claimed_at              | timestamp with time zone | YES         | null              |
| public       | level_up_stash | created_at              | timestamp with time zone | NO          | now()             |
| public       | moves          | id                      | integer                  | NO          | null              |
| public       | moves          | identifier              | text                     | NO          | null              |
| public       | moves          | display_name            | text                     | NO          | null              |
| public       | moves          | generation_id           | integer                  | NO          | null              |
| public       | moves          | type                    | text                     | NO          | null              |
| public       | moves          | power                   | integer                  | YES         | null              |
| public       | moves          | pp                      | integer                  | NO          | null              |
| public       | moves          | accuracy                | integer                  | YES         | null              |
| public       | moves          | priority                | integer                  | NO          | 0                 |
| public       | moves          | damage_class            | text                     | NO          | null              |
| public       | moves          | effect_id               | integer                  | YES         | null              |
| public       | moves          | effect_chance           | integer                  | YES         | null              |
| public       | moves          | effect                  | text                     | YES         | null              |
| public       | moves          | is_attack               | boolean                  | NO          | false             |
| public       | moves          | is_buff                 | boolean                  | NO          | false             |
| public       | moves          | is_heal                 | boolean                  | NO          | false             |
| public       | moves          | is_enemy_debuff         | boolean                  | NO          | false             |
| public       | moves          | heal_fraction           | numeric                  | YES         | null              |
| public       | moves          | status_inflict          | text                     | YES         | null              |
| public       | moves          | always_inflict          | boolean                  | YES         | null              |
| public       | moves          | self_status_inflict     | text                     | YES         | null              |
| public       | moves          | self_damage             | numeric                  | YES         | null              |
| public       | moves          | self_boosts             | jsonb                    | YES         | null              |
| public       | moves          | enemy_drops             | jsonb                    | YES         | null              |
| public       | moves          | seeded_at               | timestamp with time zone | YES         | null              |
| public       | moves          | created_at              | timestamp with time zone | NO          | now()             |
| public       | n_battles      | id                      | uuid                     | NO          | gen_random_uuid() |
| public       | n_battles      | user_id                 | uuid                     | YES         | null              |
| public       | n_battles      | status                  | text                     | YES         | 'active'::text    |
| public       | n_battles      | user_cards              | jsonb                    | YES         | '[]'::jsonb       |
| public       | n_battles      | n_cards                 | jsonb                    | YES         | '[]'::jsonb       |
| public       | n_battles      | user_active_index       | integer                  | YES         | 0                 |
| public       | n_battles      | n_active_index          | integer                  | YES         | 0                 |
