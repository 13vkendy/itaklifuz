require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Vaqtinchalik ma'lumotlar bazasi (keyingi bosqichlarda PostgreSQL/MongoDB ga o'tkazamiz)
const invitations = {};

// Bot /start komandasi
bot.start((ctx) => {
    ctx.reply('Assalomu alaykum! To\'y yoki tug\'ilgan kun uchun <b>chiroyli taklifnoma</b> yaratish uchun quyidagi tugmani bosing:', {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '💌 Taklifnoma yaratish', web_app: { url: process.env.WEB_APP_URL } }]
            ]
        }
    });
});

// Mini App'dan kelgan ma'lumotlarni qabul qilish va unikal link generatsiya qilish API
app.post('/api/create-invite', (ctxReq, res) => {
    try {
        const data = ctxReq.body;
        const inviteId = uuidv4();
        
        // Ma'lumotni saqlash
        invitations[inviteId] = data;

        const uniqueLink = `${process.env.WEB_APP_URL}invite.html?id=${inviteId}`;

        // Telegram bot orqali foydalanuvchiga xabar yuborish (agar telegramId bo'lsa)
        if (data.telegramId) {
            bot.telegram.sendMessage(
                data.telegramId, 
                `🎉 Sizning taklifnomangiz muvaffaqiyatli tayyorlandi!\n\n🔗 Havola: ${uniqueLink}`
            ).catch(err => console.log('Telegram xabarini yuborishda xatolik:', err));
        }

        res.json({ success: true, link: uniqueLink });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Taklifnoma ma'lumotlarini olish uchun API
app.get('/api/invite/:id', (req, res) => {
    const invite = invitations[req.params.id];
    if (!invite) {
        return res.status(404).json({ success: false, error: 'Taklifnoma topilmadi' });
    }
    res.json({ success: true, data: invite });
});

// Botni va serverni ishga tushirish
bot.launch().then(() => {
    console.log('Telegram bot ishga tushdi!');
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server ${process.env.PORT || 3000}-portda ishlamqda`);
});

// Dastur to'xtaganda botni to'g'ri yopish
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));