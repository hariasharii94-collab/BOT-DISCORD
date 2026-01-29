require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    Partials,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// ================= ADMIN CHECK (USER ID) =================
const ADMIN_IDS = process.env.ADMIN_USER_ID.split(',');

function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}

// ================= READY =================
client.once('ready', () => {
    console.log(` Bot online: ${client.user.tag}`);
});

// ================= COMMAND ?ticket =================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content !== '?ticket') return;

    const embed = new EmbedBuilder()
        .setTitle('🎫 Ticket Order')
        .setDescription('Klik tombol di bawah untuk membuat ticket order.')
        .setColor(0x00ff99);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel('Buat Ticket')
            .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({ embeds: [embed], components: [row] });
});

// ================= INTERACTION =================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // ===== CREATE TICKET =====
    if (interaction.customId === 'create_ticket') {
        const channelName = `ticket-${interaction.user.username.toLowerCase()}`;

        const exists = interaction.guild.channels.cache.find(c => c.name === channelName);
        if (exists) {
            return interaction.reply({
                content: '❌ Kamu masih punya ticket aktif.',
                ephemeral: true
            });
        }

        const channel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages
                    ]
                }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle('📦 ORDER MENU')
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
                "**Rekomendasi**\n" +
                "• Pribadi → 20K\n" +
                "• Banyak device → 35K.\n\n" +
                "**Silakan pilih produk di bawah.**"
            )
            .setColor(0x5865F2);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('buy_a')
                .setLabel('Buy Produk A')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('buy_b')
                .setLabel('Buy Produk B')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger)
        );

        await channel.send({
            content: `<@${interaction.user.id}>`,
            embeds: [embed],
            components: [row]
        });

        return interaction.reply({
            content: `✅ Ticket dibuat: ${channel}`,
            ephemeral: true
        });
    }

    // ===== BUY PRODUCT =====
    if (interaction.customId === 'buy_a' || interaction.customId === 'buy_b') {
        const produk =
            interaction.customId === 'buy_a'
                ? 'Produk A (Rp20.000)'
                : 'Produk B (Rp35.000)';

        const paymentEmbed = new EmbedBuilder()
            .setTitle('💳 PEMBAYARAN QRIS')
            .setDescription(
                `**Produk:** ${produk}\n\n` +
                '**Metode:** QRIS GoPay Merchant\n' +
                '**Atas Nama:** Obsidian Shop\n\n' +
                '📸 Setelah bayar, kirim **bukti transfer** di channel ini.'
            )
            .setImage(process.env.QR_IMAGE_URL)
            .setColor(0x00ff99)
            .setFooter({ text: 'Pembayaran diproses manual oleh admin' });

        await interaction.channel.send({ embeds: [paymentEmbed] });

        await interaction.reply({
            content: '✅ Silakan scan QR & lakukan pembayaran.',
            ephemeral: true
        });

        const log = await client.channels.fetch(process.env.ADMIN_CHANNEL_ID);
        if (log) {
            log.send(
                `💰 **TRANSAKSI SUKSES**\n` +
                `Buyer: ${interaction.user.tag}\n` +
                `Produk: ${produk}\n` +
                `Channel: ${interaction.channel}`
            );
        }
    }

    // ===== CLOSE TICKET (ADMIN ONLY) =====
    if (interaction.customId === 'close_ticket') {
        if (!isAdmin(interaction.user.id)) {
            return interaction.reply({
                content: '❌ Kamu bukan admin.',
                ephemeral: true
            });
        }

        await interaction.reply({
            content: '🔒 Ticket akan ditutup.',
            ephemeral: true
        });

        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 2000);
    }
});

// ================= LOGIN =================
client.login(process.env.TOKEN);

