require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = "?";

// ================= STORAGE =================
const dataPath = "./data.json";
if (!fs.existsSync(dataPath)) {
  fs.writeFileSync(dataPath, JSON.stringify({}, null, 2));
}

function getGuildData(guildId) {
  const data = JSON.parse(fs.readFileSync(dataPath));
  if (!data[guildId]) {
    data[guildId] = {
      admins: [],
      logChannel: null
    };
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  }
  return data[guildId];
}

function saveGuildData(guildId, newData) {
  const data = JSON.parse(fs.readFileSync(dataPath));
  data[guildId] = newData;
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// ================= READY =================
client.once("ready", () => {
  console.log(`Bot online: ${client.user.tag}`);
});

// ================= MESSAGE =================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  const guildData = getGuildData(message.guild.id);
  const isAdmin = guildData.admins.includes(message.author.id);

  const embedData = JSON.parse(fs.readFileSync("./embed.json"));
  const description = embedData.current || embedData.default;

  // ================= HELP =================
  if (command === "help") {
    if (args[0] === "admin") {
      if (!isAdmin) return message.reply("❌ Admin only.");

      const adminHelp = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("🛠 ADMIN COMMANDS")
        .setDescription(
          "`?setlog #channel`\nSet channel log\n\n" +
          "`?addadmin <user_id>`\nTambah admin\n\n" +
          "`?editembed`\nEdit embed produk\n\n" +
          "`?ticket`\nPreview embed"
        );

      return message.reply({ embeds: [adminHelp] });
    }

    const help = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("📖 BOT GUIDE")
      .setDescription(
        "`?ticket` — Buka order\n" +
        "`?help` — Panduan bot"
      );

    return message.reply({ embeds: [help] });
  }

  // ================= SET LOG =================
  if (command === "setlog") {
    if (!isAdmin) return message.reply("❌ Admin only.");
    const channel = message.mentions.channels.first();
    if (!channel) return message.reply("❌ Tag channel log.");

    guildData.logChannel = channel.id;
    saveGuildData(message.guild.id, guildData);

    return message.reply(`✅ Log channel diset ke ${channel}`);
  }

  // ================= ADD ADMIN =================
  if (command === "addadmin") {
    if (!isAdmin) return message.reply("❌ Admin only.");
    const userId = args[0];
    if (!userId) return message.reply("❌ Masukkan user ID.");

    if (!guildData.admins.includes(userId)) {
      guildData.admins.push(userId);
      saveGuildData(message.guild.id, guildData);
    }

    return message.reply("✅ Admin berhasil ditambahkan.");
  }

  // ================= TICKET =================
  if (command === "ticket") {
    const orderEmbed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("📦 ORDER MENU")
      .setDescription(description);

    return message.reply({ embeds: [orderEmbed] });
  }

  // ================= EDIT EMBED =================
  if (command === "editembed") {
    if (!isAdmin) return message.reply("❌ Admin only.");

    await message.reply("✏️ Kirim deskripsi embed baru (2 menit).");

    try {
      const collected = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 120000,
        errors: ["time"]
      });

      const newDesc = collected.first().content;
      embedData.current = newDesc;
      fs.writeFileSync("./embed.json", JSON.stringify(embedData, null, 2));

      const preview = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("🔍 PREVIEW EMBED")
        .setDescription(newDesc);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("reset_embed")
          .setLabel("Reset ke Default")
          .setStyle(ButtonStyle.Danger)
      );

      return message.reply({ embeds: [preview], components: [row] });
    } catch {
      return message.reply("⏰ Dibatalkan.");
    }
  }
});

// ================= BUTTON =================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "reset_embed") {
    const embedData = JSON.parse(fs.readFileSync("./embed.json"));
    embedData.current = "";
    fs.writeFileSync("./embed.json", JSON.stringify(embedData, null, 2));

    return interaction.reply({
      content: "♻️ Embed direset ke default.",
      ephemeral: true
    });
  }
});

client.login(process.env.TOKEN);

