require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`Bot online: ${client.user.tag}`);
});

/* ================= MESSAGE ================= */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  /* ===== OPEN TICKET ===== */
  if (message.content === "?ticket") {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);

    const channel = await guild.channels.create({
      name: `ticket-${message.author.username}`,
      type: ChannelType.GuildText,
      parent: process.env.CATEGORY_ID,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: message.author.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        },
        {
          id: process.env.ADMIN_ID,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });

    const orderEmbed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("📦 PILIH PAKET")
      .setDescription(
        "**Paket A**\n" +
        "• Rp.20.000 — 1 Key / 1 Device\n\n" +
        "**Paket B**\n" +
        "• Rp.35.000 — 1 Key / hingga 5 Device\n" +
        "**(Permanent)**\n\n" +
        "**Benefit**\n" +
        "• Full fitur\n" +
        "• Stabil & smooth\n" +
        "• Update gratis\n" +
        "• Support prioritas\n" +
        "• Device fleksibel\n\n" +
        "**Silakan pilih paket di bawah.**"
      )
      .setFooter({ text: "Obsidian Shop • Pembayaran QRIS Manual" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("paket_a")
        .setLabel("Paket A — 20K")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("paket_b")
        .setLabel("Paket B — 35K")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `<@${message.author.id}>`,
      embeds: [orderEmbed],
      components: [row]
    });

    return message.reply(`✅ Ticket dibuat: ${channel}`);
  }
});

/* ================= BUTTON ================= */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  /* ===== PILIH PAKET ===== */
  if (interaction.customId === "paket_a") {
    return interaction.reply(
      "💳 Kamu memilih **Paket A (Rp.20.000)**\n" +
      "Silakan lakukan pembayaran QRIS.\n" +
      "Setelah bayar, kirim **bukti transfer** di sini."
    );
  }

  if (interaction.customId === "paket_b") {
    return interaction.reply(
      "💳 Kamu memilih **Paket B (Rp.35.000)**\n" +
      "Silakan lakukan pembayaran QRIS.\n" +
      "Setelah bayar, kirim **bukti transfer** di sini."
    );
  }

  /* ===== CLOSE TICKET ===== */
  if (interaction.customId === "close_ticket") {
    if (interaction.user.id !== process.env.ADMIN_ID) {
      return interaction.reply({
        content: "❌ Hanya admin yang bisa menutup ticket.",
        ephemeral: true
      });
    }

    await interaction.reply("🔒 Ticket akan ditutup...");
    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 2000);
  }
});

client.login(process.env.TOKEN);

