"use server"

export async function sendDiscordLoginNotification(discordUsername: string) {
  const webhookUrl =
    "https://discordapp.com/api/webhooks/1458994916545003562/cBwVgc7ge7sxjtNbrdos_WbvAD7a5520Kj8tIbkuazM_CV8wd5lJoAazQLmyNohONYyH"

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [
          {
            title: "🏆 New Awards Voter",
            description: `**${discordUsername}** just connected to vote in the Doza Awards 2025!`,
            color: 0xdc2626, // Red color matching the awards theme
            timestamp: new Date().toISOString(),
            footer: {
              text: "Doza Awards 2025",
            },
          },
        ],
      }),
    })

    return { success: response.ok }
  } catch (error) {
    console.error("Failed to send Discord webhook:", error)
    return { success: false }
  }
}
