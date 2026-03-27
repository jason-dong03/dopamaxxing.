const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!
const BASE = 'https://discord.com/api/v10'

async function discordFetch(path: string, body: object) {
    const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        const err = await res.text()
        console.error(`[discord] ${path} failed:`, err)
    }
    return res
}

export async function sendDiscordMessage(channelId: string, content: string) {
    return discordFetch(`/channels/${channelId}/messages`, { content })
}

export async function sendDiscordEmbed(channelId: string, embed: {
    title?: string
    description?: string
    color?: number
    fields?: { name: string; value: string; inline?: boolean }[]
}) {
    return discordFetch(`/channels/${channelId}/messages`, { embeds: [embed] })
}
