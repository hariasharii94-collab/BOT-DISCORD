require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const PREFIX = process.env.PREFIX || '?';
const ADMIN_ROLE_NAME = process.env.ADMIN_ROLE_NAME;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

// simpan data ticket
const ticketData = new Map();

// ===== DEBUG LOG =====
client.on('messageCreate', msg => console.log('[DEBUG] messageCreate:', msg.content));
client.on('interactionCreate', i => console.log('[DEBUG] interactionCreate:', i.customId));

// ===== READY =====
client.once('ready', () => {
  console.log(`Bot online: ${client.user.tag}`);
});

// ===== ?ticket COMMAND =====
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(`${PREFIX}ticket`)) return;

  console.log('[DEBUG] Command ?ticket detected');

  const guild = message.guild;
  const adminRole = guild.roles.cache.find(r => r.name === ADMIN_ROLE_NAME);
  if (!adminRole) return message.reply('❌ Role admin tidak ditemukan.');

  // BUAT CHANNEL PRIVATE
  const channel = await guild.channels.create({
    name: `ticket-${message.author.username}`,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: message.author.id, allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ] },
      { id: adminRole.id, allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ] }
    ]
  });

  // EMBED MENU PEMBELIAN
  const embed = new EmbedBuilder()
    .setTitle('🛒 MENU PEMBELIAN')
    .setDescription('💠 Paket BASIC — 10.000\n💠 Paket PREMIUM — 50.000')
    .setColor(0x2f3136)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('buy_10000').setLabel('Harga 10.000').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('buy_50000').setLabel('Harga 50.000').setStyle(ButtonStyle.Success)
  );

  ticketData.set(channel.id, { buyerId: message.author.id, price: null, package: null });

  // KIRIM EMBED + TAG ADMIN
  await channel.send({ content: `<@&${adminRole.id}>`, embeds: [embed], components: [row] });
  await message.reply(`✅ Ticket berhasil dibuat: ${channel}`);
});

// ===== INTERACTION BUTTON =====
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  const data = ticketData.get(interaction.channel.id);
  if (!data) return;

  console.log('[DEBUG] Button clicked:', interaction.customId);

  // BUY BUTTON
  if (interaction.customId === 'buy_10000' || interaction.customId === 'buy_50000') {
    if (interaction.user.id !== data.buyerId) return interaction.reply({ content: '❌ Ini bukan ticket kamu.', ephemeral: true });
    data.price = interaction.customId === 'buy_10000' ? '10.000' : '50.000';
    data.package = interaction.customId === 'buy_10000' ? 'BASIC' : 'PREMIUM';

    const resultEmbed = new EmbedBuilder()
      .setTitle('📦 PILIHAN PEMBELIAN')
      .setDescription(`**Paket:** ${data.package}\n**Harga:** ${data.price}\nSilakan tunggu admin mengirim QR pembayaran.`)
      .setColor(0x00ff99)
      .setTimestamp();

    await interaction.update({ embeds: [resultEmbed], components: [] });
  }

  // CLOSE TICKET
  if (interaction.customId === 'close_ticket') {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.some(r => r.name === ADMIN_ROLE_NAME)) {
      return interaction.reply({ content: '❌ Hanya admin yang bisa close ticket.', ephemeral: true });
    }

    const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel && data.price) {
      const logEmbed = new EmbedBuilder()
        .setTitle('✅ PEMBELIAN BERHASIL')
        .addFields(
          { name: 'ADMIN', value: `<@${interaction.user.id}>` },
          { name: 'BUYER', value: `<@${data.buyerId}>` },
          { name: 'HARGA', value: data.price }
        )
        .setDescription('Terima kasih sudah melakukan pembelian 🙏')
        .setColor(0x00ff00)
        .setTimestamp();

      logChannel.send({ embeds: [logEmbed] });
    }

    await interaction.reply({ content: '🔒 Ticket akan ditutup dalam 5 detik...', ephemeral: true });
    setTimeout(() => { interaction.channel.delete().catch(() => {}); }, 5000);
  }
});

// ===== ?close COMMAND =====
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.content !== `${PREFIX}close`) return;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
  );

  await message.channel.send({ components: [row] });
});

// ===== LOGIN =====
client.login(process.env.DISCORD_TOKEN);

