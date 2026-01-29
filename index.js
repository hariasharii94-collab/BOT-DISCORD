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

// ===== ADMIN CHECK (USER ID) =====
const ADMIN_IDS = process.env.ADMIN_USER_ID.split(',');

function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}

// ===== READY =====
client.once('ready', () => {
    console.log(`✅ Bot online: ${client.user.tag}`);
});

// ===== COMMAND ?ticket =====
client.on('messageCreate', async (message) => {
    if (message.content !== '?ticket') return;
    if (message.author.bot) return;

    const embed = new EmbedBuilder()
        .setTitle('🎫 Ticket System')
        .setDescription('Klik tombol di bawah untuk membuat ticket order / support.')
        .setColor(0x00ff99);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel('Buat Ticket')
            .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({ embeds: [embed], components: [row] });
});

// ===== INTERACTIONS =====
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // === CREATE TICKET ===
    if (interaction.customId === 'create_ticket') {
        const channelName = `ticket-${interaction.user.username.toLowerCase()}`;

        const existing = interaction.guild.channels.cache.find(
            ch => ch.name === channelName
        );
        if (existing) {
            return interaction.reply({
                content: '❌ Kamu masih punya ticket yang aktif.',
                ephemeral: true
            });
        }

        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle('📦 Order Ticket')
            .setDescription(
                '**Produk A** — Rp20.000\n' +
                '**Produk B** — Rp35.000\n\n' +
                'Pilih produk di bawah.'
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

        await ticketChannel.send({
            content: `<@${interaction.user.id}>`,
            embeds: [embed],
            components: [row]
        });

        return interaction.reply({
            content: `✅ Ticket dibuat: ${ticketChannel}`,
            ephemeral: true
        });
    }

    // === BUY PRODUCT ===
    if (interaction.customId === 'buy_a' || interaction.customId === 'buy_b') {
        const produk =
            interaction.customId === 'buy_a' ? 'Produk A (20K)' : 'Produk B (35K)';

        await interaction.reply({
            content: `✅ Kamu memilih **${produk}**.\nAdmin akan memproses.`,
            ephemeral: true
        });

        const logChannel = await client.channels.fetch(process.env.ADMIN_CHANNEL_ID);
        if (logChannel) {
            logChannel.send(
                `🛒 **ORDER MASUK**\nUser: ${interaction.user.tag}\nProduk: **${produk}**\nChannel: ${interaction.channel}`
            );
        }
    }

    // === CLOSE TICKET (ADMIN ONLY) ===
    if (interaction.customId === 'close_ticket') {
        if (!isAdmin(interaction.user.id)) {
            return interaction.reply({
                content: '❌ Kamu bukan admin.',
                ephemeral: true
            });
        }

        await interaction.reply({
            content: '🔒 Ticket ditutup.',
            ephemeral: true
        });

        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 2000);
    }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);

