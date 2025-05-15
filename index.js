const { Client, GatewayIntentBits, ActivityType, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, REST } = require('discord.js');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config/config.json');

const currentDirectory = path.resolve(__dirname);

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const rest = new REST({ version: '10', timeout: 30000 }).setToken(config.bot_token);

async function encodeFont(fontPath) {
    const fontData = await fs.readFile(fontPath);
    return Buffer.from(fontData).toString('base64');
}

let fontB64, fontMedB64, fontWhitney;
(async () => {
    fontB64 = await encodeFont(path.join(currentDirectory, 'assets', 'fonts', 'ggsans-regular.ttf'));
    fontMedB64 = await encodeFont(path.join(currentDirectory, 'assets', 'fonts', 'ggsans-medium.ttf'));
    fontWhitney = await encodeFont(path.join(currentDirectory, 'assets', 'fonts', 'Whitneyfont.woff'));
})();

class BoostPage {
    constructor(authorName, authorAvatar, authorText, receiverAvatar, receiverName, receiverText) {
        this.actualDatetime = new Date();
        this.proof = '';

        this.authorName = authorName;
        this.authorAvatar = authorAvatar;
        this.authorText = authorText;
        this.senderMessageDatetime = new Date(this.actualDatetime - Math.floor(Math.random() * 300 + 1) * 60 * 1000);
        this.senderMessageDatetime = this.formatDate(this.senderMessageDatetime);

        this.receiverName = receiverName;
        this.receiverAvatar = receiverAvatar;
        this.receiverText = receiverText;
        this.receiverMessageDatetime = new Date(this.actualDatetime.getTime() + Math.floor(Math.random() * 120 + 1) * 60 * 1000);
        this.receiverMessageDatetime = this.formatDate(this.receiverMessageDatetime);
    }

    formatDate(date) {
        return `${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })}`; // Para alterar ao Horário de Brasília, Brasil, basta trocar "en-US" para "pt-BR".
    }

    async getProof() {
        let proof = await fs.readFile(path.join(currentDirectory, 'assets', 'index.html'), 'utf-8');

        const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const nitroCode = Array.from({ length: 16 }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');

        proof = proof
            .replace('GGSANSFONT', fontB64 ? `data:font/ttf;base64,${fontB64}` : 'Arial')
            .replace('GGSANSMEDIUMFONT', fontMedB64 ? `data:font/ttf;base64,${fontMedB64}` : 'Arial')
            .replace('WHITNEY', fontWhitney ? `data:font/ttf;base64,${fontWhitney}` : 'Arial')
            .replace('AUTHORNAME', this.authorName)
            .replace('AUTHORAVATAR', this.authorAvatar)
            .replace('AUTHORDATETIME', this.senderMessageDatetime)
            .replace('AUTHORTEXT', this.authorText || '')
            .replace('USERNAME', this.receiverName)
            .replace('USERAVATAR', this.receiverAvatar)
            .replace('USERDATETIME', this.receiverMessageDatetime)
            .replace('USERTEXT', this.receiverText)
            .replace('NITROCODE', nitroCode);

        this.proof = proof;
        return this.proof;
    }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once('ready', async () => {
    await client.user.setPresence({
        activities: [{ name: 'lofygang', type: ActivityType.Watching }],
        status: 'idle',
    });
    console.log('Bot is online!');

    const command = new SlashCommandBuilder()
        .setName('cp')
        .setDescription('Generate a proof screenshot.')
        .addStringOption(option =>
            option
                .setName('receiverinfo')
                .setDescription('Find the name/avatar of an account by ID or custom name')
                .setRequired(true)
                .addChoices(
                    { name: 'User ID', value: 'id' },
                    { name: 'Custom Name', value: 'custom' }
                )
        );

    await rest.put(`/applications/${client.user.id}/commands`, { body: [command.toJSON()] });
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.content.startsWith(`<@${client.user.id}>`)) {
        await message.channel.send(`${message.author}, use /cp to generate a proof screenshot.`);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() && !interaction.isModalSubmit()) return;

    if (interaction.isCommand() && interaction.commandName === 'cp') {
        const receiverInfo = interaction.options.getString('receiverinfo');

        if (receiverInfo === 'custom') {
            const modal = new ModalBuilder()
                .setCustomId('nitroProofCustom')
                .setTitle('Proof Generator');

            const authorTextInput = new TextInputBuilder()
                .setCustomId('authortext')
                .setLabel('Message sent by you:')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Example: Thanks for the purchase.')
                .setRequired(false);

            const receiverNameInput = new TextInputBuilder()
                .setCustomId('receivername')
                .setLabel('Recipient Name:')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Example: Akira')
                .setRequired(true)
                .setMaxLength(32);

            const receiverAvatarInput = new TextInputBuilder()
                .setCustomId('receiveravatar')
                .setLabel('Recipient Avatar URL:')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Example: https://image.com/XXXX.png')
                .setRequired(false);

            const receiverTextInput = new TextInputBuilder()
                .setCustomId('receivertext')
                .setLabel('Message sent by recipient:')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Example: Thanks, bro!')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(authorTextInput),
                new ActionRowBuilder().addComponents(receiverNameInput),
                new ActionRowBuilder().addComponents(receiverAvatarInput),
                new ActionRowBuilder().addComponents(receiverTextInput)
            );

            await interaction.showModal(modal);
        } else if (receiverInfo === 'id') {
            const modal = new ModalBuilder()
                .setCustomId('nitroProofId')
                .setTitle('Proof Generator');

            const authorTextInput = new TextInputBuilder()
                .setCustomId('authortext')
                .setLabel('Message sent by you:')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Example: Thanks for the purchase.')
                .setRequired(false);

            const receiverIdInput = new TextInputBuilder()
                .setCustomId('receiverid')
                .setLabel('Recipient ID:')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Example: 464457105521508354')
                .setRequired(true)
                .setMaxLength(25);

            const receiverTextInput = new TextInputBuilder()
                .setCustomId('receivertext')
                .setLabel('Recipient Message:')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Example: Thanks, bro!')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(authorTextInput),
                new ActionRowBuilder().addComponents(receiverIdInput),
                new ActionRowBuilder().addComponents(receiverTextInput)
            );

            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        await interaction.deferReply({ ephemeral: true });

        if (interaction.customId === 'nitroProofCustom') {
            const authorText = interaction.fields.getTextInputValue('authortext');
            const receiverName = interaction.fields.getTextInputValue('receivername');
            const receiverAvatar = interaction.fields.getTextInputValue('receiveravatar') || config.default_avatar;
            const receiverText = interaction.fields.getTextInputValue('receivertext');

            const proofPage = new BoostPage(
                interaction.user.displayName,
                interaction.user.displayAvatarURL(),
                authorText,
                receiverAvatar,
                receiverName,
                receiverText
            );

            const proof = await proofPage.getProof();

            const browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
            });
            const page = await browser.newPage();
            await page.setContent(proof, { waitUntil: 'networkidle0' });
            await page.setViewport({ width: 800, height: 354 });
            await delay(2000);
            await page.screenshot({ path: 'image.png', type: 'png', fullPage: true });
            await browser.close();

            await interaction.user.send({ files: ['image.png'] });
            await interaction.editReply({ content: 'Proof generated successfully. Check your DM.', ephemeral: true });
        } else if (interaction.customId === 'nitroProofId') {
            const authorText = interaction.fields.getTextInputValue('authortext');
            const receiverId = interaction.fields.getTextInputValue('receiverid');
            const receiverText = interaction.fields.getTextInputValue('receivertext');

            const user = await client.users.fetch(receiverId);
            const authorAvatar = interaction.user.displayAvatarURL() || config.default_avatar;
            const receiverAvatar = user.displayAvatarURL() || config.default_avatar;

            const proofPage = new BoostPage(
                interaction.user.displayName,
                authorAvatar,
                authorText,
                receiverAvatar,
                user.displayName,
                receiverText
            );

            const proof = await proofPage.getProof();

            const browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
            });
            const page = await browser.newPage();
            await page.setContent(proof, { waitUntil: 'networkidle0' });
            await page.setViewport({ width: 800, height: 354 });
            await delay(2000);
            await page.screenshot({ path: 'image.png', type: 'png', fullPage: true });
            await browser.close();

            await interaction.user.send({ files: ['image.png'] });
            await interaction.editReply({ content: 'Proof generated successfully. Check your DM.', ephemeral: true });
        }
    }
});

client.login(config.bot_token);