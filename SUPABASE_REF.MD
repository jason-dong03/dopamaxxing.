# Supabase Schema Reference

## achievements

`id` text · `name` text · `description` text · `icon` text · `is_hidden` bool · `coin_reward` int

## battle_lineups

`id` uuid · `user_id` uuid · `name` text · `card_ids` text[] · `created_at` timestamptz · `updated_at` timestamptz

## binder_cards

`id` uuid · `binder_id` uuid · `user_card_id` uuid · `position` int · `created_at` timestamptz

## binder_likes

`id` uuid · `binder_id` uuid · `user_id` uuid · `created_at` timestamptz

## binders

`id` uuid · `user_id` uuid · `name` text · `color` text · `include_slabs` bool · `is_featured` bool · `created_at` timestamptz · `updated_at` timestamptz

## card_evolutions

`id` uuid · `card_id` text · `evolves_into` text

## card_types

`id` uuid · `card_id` text · `type` text

## cards

`id` text · `name` text · `subtype` text · `hp` int · `evolves_from` text · `set_id` text · `national_pokedex_number` int · `image_url` text · `image_url_hi` text · `market_price_usd` numeric · `is_special` bool · `rarity` text · `pokemon_type` text

## events

`id` text · `name` text · `description` text · `icon` text · `effect` text · `magnitude` float · `color` text · `accent_color` text · `event_rarity` text · `duration_min` float · `duration_max` float · `weight` int · `is_active` bool · `force_active_until` timestamptz

## friendships

`id` uuid · `requester_id` uuid · `addressee_id` uuid · `status` text(pending) · `created_at` timestamptz

## level_up_stash

`id` uuid · `user_id` uuid · `level_reached` int · `coins` int · `pack_id` text · `claimed_at` timestamptz · `created_at` timestamptz

## n_battles

`id` uuid · `user_id` uuid · `status` text(active) · `user_cards` jsonb · `n_cards` jsonb · `user_active_index` int · `n_active_index` int · `turn` int · `n_next_move` jsonb · `battle_log` jsonb · `created_at` timestamptz · `updated_at` timestamptz

## n_quest_progress

`user_id` uuid · `opened_white_flare` bool · `opened_black_bolt` bool · `sold_highest_count` int · `found_liberator` bool · `found_n_farewell` bool · `act6_unlocked` bool · `found_liberator_phrase` bool · `battle_won` bool · `created_at` timestamptz · `updated_at` timestamptz

## pending_packs

`id` uuid · `user_id` uuid · `pack_id` text · `source` text(discord) · `created_at` timestamptz

## profiles

`id` uuid · `username` text · `first_name` text · `last_name` text · `profile_url` text · `coins` numeric · `xp` int · `level` int(1) · `pity_counter` int · `pity_threshold` int(50) · `packs_opened` int · `cards_fed` int · `daily_packs_today` int · `daily_cards_fed_today` int · `daily_reset_date` date · `login_streak` int · `last_login_date` date · `discord_id` text · `discord_username` text · `discord_linked` bool · `phone` text · `passive_coin_at` timestamptz · `pack_count` int · `cards_sold` int · `active_title` text · `last_daily_pack_date` text · `tos_accepted_at` timestamptz · `age_verified` bool · `new_user_promo_used` bool · `bag_capacity` int(50) · `is_admin` bool · `tutorial_completed` bool

## purchases

`id` uuid · `user_id` uuid · `stripe_payment_intent` text · `stripe_session_id` text · `package_id` text · `coins_credited` int · `amount_cents` int · `created_at` timestamptz

## quests

`id` uuid · `name` text · `description` text · `quest_type` text · `coin_reward` int · `xp_reward` int · `slug` text · `cooldown_hours` int · `requirement_metric` text · `requirement_target` int · `category` text · `difficulty` text · `is_active` bool · `timed_minutes` int · `title_reward` text · `is_hidden` bool · `prerequisite_slug` text · `min_level` int · `sort_order` int

## sets

`id` text · `name` text · `series` text · `total_cards` int · `release_date` date · `image_url` text

## user_achievements

`id` uuid · `user_id` uuid · `achievement_id` text · `earned_at` timestamptz · `coins_claimed` bool

## user_cards

`id` uuid · `user_id` uuid · `card_id` text · `card_xp` int · `card_level` int(1) · `exp` int · `is_favorited` bool · `obtained_at` timestamptz · `worth` numeric · `is_hot` bool · `attr_centering` numeric · `attr_corners` numeric · `attr_edges` numeric · `attr_surface` numeric · `grade` smallint · `grade_count` smallint · `stat_atk` int · `stat_def` int · `stat_spatk` int · `stat_spdef` int · `stat_spd` int · `stat_accuracy` int · `stat_evasion` int · `nature` text · `moves` jsonb · `pending_moves` jsonb

## user_items

`id` uuid · `user_id` uuid · `item_id` text · `quantity` int

## user_quest_metrics

`user_id` uuid · `packs_opened` int · `cards_fed` int · `cards_owned` bigint

## user_quests

`id` uuid · `user_id` uuid · `quest_id` uuid · `status` quest_status_enum(in_progress) · `started_at` timestamptz · `completed_at` timestamptz · `notes` text
