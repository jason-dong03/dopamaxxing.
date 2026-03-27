/**
 * Dopamaxxing Discord Bot
 * Run with: npm run bot
 *
 * Awards coins and packs to users who send messages in the configured channel.
 * Rewards are based on message quality, randomness, and anti-spam logic.
 */

import { Client, EmbedBuilder, GatewayIntentBits, Message } from 'discord.js'
import { createClient } from '@supabase/supabase-js'

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN!
const WATCHED_CHANNEL = process.env.DISCORD_CHANNEL_ID!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '' // e.g. https://yourapp.com

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

// ─── pack pool ────────────────────────────────────────────────────────────────
const PACK_POOL = [
    {
        id: 'sv10.5b',
        name: 'Black Bolt',
        description: 'Scarlet & Violet — Black Bolt',
        image: '/packs/black-bolt.jpg',
        cost: 9.5,
    },
    {
        id: 'sv10.5w',
        name: 'White Flare',
        description: 'Scarlet & Violet — White Flare',
        image: '/packs/white-flare.jpg',
        cost: 9.5,
    },
    {
        id: 'base1',
        name: 'Base Set',
        description: 'Classic — Base Set',
        image: '/packs/base-set.jpg',
        cost: 565.64,
    },
    {
        id: 'me02.5',
        name: 'Ascended Heroes',
        description: 'Scarlet & Violet — Ascended Heroes',
        image: '/packs/ascended-heroes.jpg',
        cost: 11.43,
    },
]

// ─── per-user spam tracking ───────────────────────────────────────────────────
const lastMessageAt: Record<string, number> = {}
const recentMessages: Record<string, number[]> = {}

// ─── message scoring ──────────────────────────────────────────────────────────
function scoreMessage(content: string, discordId: string): number {
    const now = Date.now()
    const text = content.trim()

    // base score from length (meaningful messages are longer)
    let score = Math.min(text.length / 80, 1.0) // caps at 80 chars

    // penalise very short messages
    if (text.length < 4) return 0
    if (text.length < 8) score *= 0.3

    // penalise repeated characters (e.g. "aaaaaaa")
    const uniqueChars = new Set(text.toLowerCase()).size
    if (uniqueChars < 4) score *= 0.1

    // spam cooldown: penalise if last message was < 20s ago
    const last = lastMessageAt[discordId] ?? 0
    const secsSinceLast = (now - last) / 1000
    // TEST: spam guards disabled
    // if (secsSinceLast < 5)  return 0
    // if (secsSinceLast < 20) score *= 0.2
    // if (secsSinceLast < 60) score *= 0.5
    // if (recent.length >= 5) score *= 0.05

    return score
}

// ─── roll reward ──────────────────────────────────────────────────────────────
type PackInfo = (typeof PACK_POOL)[number]

type Reward =
    | { type: 'none' }
    | { type: 'coins'; amount: number }
    | { type: 'pack'; pack: PackInfo }

function rollReward(_score: number): Reward {
    const luck = Math.random()

    // scaled thresholds: higher score = better odds
    const coinChance = 0.99 // TEST: near-guaranteed coins
    const packChance = 0.95 // TEST: very high pack chance

    if (luck < packChance) {
        const pack = PACK_POOL[Math.floor(Math.random() * PACK_POOL.length)]
        return { type: 'pack', pack }
    }
    if (luck < packChance + coinChance) {
        const amount = Math.floor(Math.random() * 18) + 3 // 3–20 coins
        return { type: 'coins', amount }
    }
    return { type: 'none' }
}

// ─── apply reward to Supabase ─────────────────────────────────────────────────
async function applyReward(
    discordId: string,
    reward: Reward,
    message: Message,
    discordName: string,
) {
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, coins, username')
        .eq('discord_id', discordId)
        .maybeSingle()

    if (!profile) return

    if (reward.type === 'coins') {
        const { error } = await supabase
            .from('profiles')
            .update({ coins: profile.coins + reward.amount })
            .eq('id', profile.id)
        console.log(`[coins] db update error=${error?.message ?? 'none'}`)

        const embed = new EmbedBuilder()
            .setColor(0xeab308)
            .setTitle('🪙 Coin Drop!')
            .setDescription(
                `**+${reward.amount} coins** landed for **${discordName}**`,
            )
            .addFields({
                name: 'New Balance',
                value: `🪙 ${profile.coins + reward.amount}`,
                inline: true,
            })
            .setFooter({ text: 'Keep chatting to earn more' })
            .setTimestamp()

        try {
            await message.reply({ embeds: [embed] })
            console.log(`[coins] embed sent`)
        } catch (e) {
            console.error('[coins] reply failed:', e)
        }
    }

    if (reward.type === 'pack') {
        const { pack } = reward
        const { error } = await supabase.from('pending_packs').insert({
            user_id: profile.id,
            pack_id: pack.id,
            source: 'discord',
        })
        console.log(`[pack] db insert error=${error?.message ?? 'none'}`)

        const imageUrl = APP_URL ? `${APP_URL}${pack.image}` : null
        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('🎁 Pack Drop!')
            .setDescription(`**${discordName}** earned a pack from Discord!`)
            .addFields(
                { name: 'Pack', value: pack.name, inline: true },
                { name: 'Series', value: pack.description, inline: true },
                { name: 'Value', value: `🪙 ${pack.cost}`, inline: true },
            )
            .setFooter({ text: 'Open it in the app — check your Drops' })
            .setTimestamp()

        if (imageUrl) embed.setThumbnail(imageUrl)

        try {
            await message.reply({ embeds: [embed] })
            console.log(`[pack] embed sent`)
        } catch (e) {
            console.error('[pack] reply failed:', e)
        }
    }
}

// ─── bot setup ────────────────────────────────────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
})

client.once('ready', () => {
    console.log(`[bot] logged in as ${client.user?.tag}`)
    console.log(`[bot] watching channel: ${WATCHED_CHANNEL}`)
    console.log(`[bot] supabase url: ${SUPABASE_URL}`)
    console.log(`[bot] service key set: ${!!SUPABASE_SERVICE}`)
})

client.on('messageCreate', async (message) => {
    console.log(
        `[msg] channel=${message.channelId} author=${message.author.tag} bot=${message.author.bot} content="${message.content}"`,
    )

    if (message.author.bot) {
        console.log('[skip] is bot')
        return
    }
    if (message.channelId !== WATCHED_CHANNEL) {
        console.log(
            `[skip] wrong channel (got ${message.channelId}, want ${WATCHED_CHANNEL})`,
        )
        return
    }

    const discordId = message.author.id
    const now = Date.now()

    lastMessageAt[discordId] = now
    recentMessages[discordId] = [
        ...(recentMessages[discordId] ?? []).filter(
            (t) => t > now - 2 * 60_000,
        ),
        now,
    ]

    const score = scoreMessage(message.content, discordId)
    console.log(`[score] ${score.toFixed(3)} for "${message.content}"`)
    if (score <= 0) {
        console.log('[skip] score=0')
        return
    }

    const reward = rollReward(score)
    console.log(`[reward] type=${reward.type}`, reward)
    if (reward.type === 'none') return

    // lookup profile
    const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, coins, username')
        .eq('discord_id', discordId)
        .maybeSingle()

    console.log(
        `[profile] discordId=${discordId} found=${!!profile} err=${profileErr?.message ?? 'none'}`,
    )
    if (!profile) {
        console.log('[skip] no profile linked to this discord_id')
        return
    }

    const discordName = message.author.globalName ?? message.author.username
    await applyReward(discordId, reward, message, discordName)
    console.log(`[done] reward applied`)
})

client.login(DISCORD_TOKEN)
