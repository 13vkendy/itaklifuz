require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Vaqtinchalik ma'lumotlar bazasi (xotirada saqlash)
const invitations = {};

// Telegram Bot /start buyrug'i
bot.start((ctx) => {
    ctx.reply(
        '✨ Assalomu alaykum! To\'y yoki tug\'ilgan kun uchun chiroyli va zamonaviy taklifnoma yaratish uchun quyidagi tugmani bosing:', 
        {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '💌 Taklifnoma Yaratish', web_app: { url: process.env.WEB_APP_URL } }]
                ]
            }
        }
    );
});

// Mini App'dan ma'lumotlarni qabul qilish va unikal link generatsiya qilish API
app.post('/api/create-invite', async (req, res) => {
    try {
        const data = req.body;
        const inviteId = uuidv4();
        
        // Ma'lumotni bazaga saqlaymiz
        invitations[inviteId] = data;

        const uniqueLink = `${process.env.WEB_APP_URL}invite.html?id=${inviteId}`;

        // Agar foydalanuvchi Telegram ID si mavjud bo'lsa, bot orqali avtomatik xabar yuboramiz
        if (data.telegramId) {
            try {
                await bot.telegram.sendMessage(
                    data.telegramId,
                    `🎉 <b>Tabriklaymiz! Taklifnomangiz tayyorlandi.</b>\n\n🔗 Quyidagi havola orqali do'stlaringizga ulashishingiz mumkin:\n${uniqueLink}`,
                    { parse_mode: 'HTML' }
                );
            } catch (telegramErr) {
                console.log('Telegramga xabar yuborishda xatolik:', telegramErr.message);
            }
        }

        res.json({ success: true, link: uniqueLink });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Unikal ID bo'yicha taklifnoma ma'lumotlarini qaytarish API'si
app.get('/api/invite/:id', (req, res) => {
    const invite = invitations[req.params.id];
    if (!invite) {
        return res.status(404).json({ success: false, error: 'Taklifnoma topilmadi' });
    }
    res.json({ success: true, data: invite });
});

// Bot va serverni birgalikda ishga tushirish
bot.launch().then(() => console.log('🤖 Telegram bot muvaffaqiyatli ishga tushdi!'));
app.listen(PORT, () => console.log(`🚀 Server ${PORT}-portda ishlamqda`));

// Xavfsiz to'xtatish
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));