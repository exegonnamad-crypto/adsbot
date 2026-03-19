/**
 * CampaignX Telegram Bot
 * Professional multi-language bot frontend for CampaignX platform
 */

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

// ── CONFIG ────────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const BACKEND_URL = process.env.BACKEND_URL || "https://flex-production-da21.up.railway.app";
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || "";
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || "";
const ADMIN_TG_ID = process.env.ADMIN_TG_ID || ""; // Your Telegram user ID
const BOT_URL = process.env.BOT_URL || ""; // e.g. https://yourbot.railway.app

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ── SESSION STORE (in-memory) ─────────────────────────────────────────────────
const sessions = {}; // { telegramId: { token, user, step, data, lang } }

function getSession(telegramId) {
  if (!sessions[telegramId]) sessions[telegramId] = { step: "idle", data: {}, lang: "en" };
  return sessions[telegramId];
}

// ── TRANSLATIONS ──────────────────────────────────────────────────────────────
const T = {
  en: {
    welcome_title: "🚀 *Welcome to CampaignX Bot*",
    welcome_desc: "The most powerful Telegram group marketing automation platform.\n\n✅ Auto-post to thousands of groups\n✅ Multi-account management\n✅ AI message rewriting\n✅ Real-time analytics\n✅ Smart scheduling",
    choose_lang: "🌐 Choose your language:",
    login: "🔐 Login",
    register: "📝 Register",
    main_menu: "📋 *Main Menu*\nWelcome back, *{name}*!\nPlan: `{plan}` | Credits: `{credits}`",
    campaigns: "📢 Campaigns",
    accounts: "👤 Accounts",
    groups: "👥 Groups",
    stats: "📊 Statistics",
    billing: "💳 Billing",
    settings: "⚙️ Settings",
    admin: "🛡️ Admin Panel",
    help: "❓ Help",
    back: "◀️ Back",
    logout: "🚪 Logout",
    enter_email: "📧 Enter your email:",
    enter_password: "🔑 Enter your password:",
    enter_name: "👤 Enter your full name:",
    login_success: "✅ Login successful! Welcome back, *{name}*!",
    login_fail: "❌ Invalid credentials. Try again.",
    register_success: "✅ Account created! Welcome, *{name}*!",
    register_fail: "❌ Registration failed: {error}",
    not_logged: "⚠️ Please login first.",
    plans_title: "💎 *CampaignX Plans*",
    pay_crypto: "💰 Pay Crypto",
    pay_stars: "⭐ Pay Stars",
    campaigns_list: "📢 *Your Campaigns*\nTotal: {count}",
    no_campaigns: "No campaigns yet. Create one from the web dashboard.",
    accounts_list: "👤 *Your Accounts*\nTotal: {count}",
    no_accounts: "No accounts added yet.",
    groups_list: "👥 *Your Groups*\nTotal: {count}",
    no_groups: "No groups added yet.",
    stats_title: "📊 *Your Statistics*",
    add_group: "➕ Add Group",
    enter_group: "Enter group username (e.g. @mygroup or t.me/mygroup):",
    group_added: "✅ Group @{username} added!",
    group_fail: "❌ Failed: {error}",
    forward_menu: "📤 *Forward Messages*\nForward campaign replies to your DM or a group.",
    forward_set: "✅ Forward target set to: @{target}",
    contact_admin: "📩 *Contact Admin*\nSend your message and we'll reply ASAP:",
    msg_sent_admin: "✅ Message sent to admin!",
    admin_msg: "📩 Message from @{username} (ID: {id}):\n\n{message}",
  },
  ar: {
    welcome_title: "🚀 *مرحباً بك في CampaignX Bot*",
    welcome_desc: "منصة أتمتة التسويق عبر مجموعات تيليغرام الأكثر قوة.\n\n✅ النشر التلقائي في آلاف المجموعات\n✅ إدارة حسابات متعددة\n✅ إعادة كتابة الرسائل بالذكاء الاصطناعي\n✅ تحليلات فورية\n✅ جدولة ذكية",
    choose_lang: "🌐 اختر لغتك:",
    login: "🔐 تسجيل الدخول",
    register: "📝 إنشاء حساب",
    main_menu: "📋 *القائمة الرئيسية*\nأهلاً، *{name}*!\nالخطة: `{plan}` | الرصيد: `{credits}`",
    campaigns: "📢 الحملات",
    accounts: "👤 الحسابات",
    groups: "👥 المجموعات",
    stats: "📊 الإحصائيات",
    billing: "💳 الفواتير",
    settings: "⚙️ الإعدادات",
    admin: "🛡️ لوحة الإدارة",
    help: "❓ مساعدة",
    back: "◀️ رجوع",
    logout: "🚪 تسجيل الخروج",
    enter_email: "📧 أدخل بريدك الإلكتروني:",
    enter_password: "🔑 أدخل كلمة المرور:",
    enter_name: "👤 أدخل اسمك الكامل:",
    login_success: "✅ تم تسجيل الدخول! أهلاً، *{name}*!",
    login_fail: "❌ بيانات غير صحيحة. حاول مرة أخرى.",
    register_success: "✅ تم إنشاء الحساب! أهلاً، *{name}*!",
    register_fail: "❌ فشل التسجيل: {error}",
    not_logged: "⚠️ الرجاء تسجيل الدخول أولاً.",
    plans_title: "💎 *خطط CampaignX*",
    pay_crypto: "💰 الدفع بالعملات المشفرة",
    pay_stars: "⭐ الدفع بالنجوم",
    campaigns_list: "📢 *حملاتك*\nالإجمالي: {count}",
    no_campaigns: "لا توجد حملات بعد.",
    accounts_list: "👤 *حساباتك*\nالإجمالي: {count}",
    no_accounts: "لم يتم إضافة حسابات بعد.",
    groups_list: "👥 *مجموعاتك*\nالإجمالي: {count}",
    no_groups: "لم يتم إضافة مجموعات بعد.",
    stats_title: "📊 *إحصائياتك*",
    add_group: "➕ إضافة مجموعة",
    enter_group: "أدخل اسم المجموعة (مثل @mygroup أو t.me/mygroup):",
    group_added: "✅ تمت إضافة @{username}!",
    group_fail: "❌ فشل: {error}",
    forward_menu: "📤 *إعادة التوجيه*\nأعد توجيه الردود إلى DM أو مجموعة.",
    forward_set: "✅ تم تعيين الهدف: @{target}",
    contact_admin: "📩 *تواصل مع الإدارة*\nأرسل رسالتك وسنرد في أقرب وقت:",
    msg_sent_admin: "✅ تم إرسال الرسالة للإدارة!",
    admin_msg: "📩 رسالة من @{username} (ID: {id}):\n\n{message}",
  },
  ru: {
    welcome_title: "🚀 *Добро пожаловать в CampaignX Bot*",
    welcome_desc: "Самая мощная платформа автоматизации маркетинга в Telegram.\n\n✅ Авторассылка в тысячи групп\n✅ Управление несколькими аккаунтами\n✅ ИИ-переписывание сообщений\n✅ Аналитика в реальном времени\n✅ Умное планирование",
    choose_lang: "🌐 Выберите язык:",
    login: "🔐 Войти",
    register: "📝 Регистрация",
    main_menu: "📋 *Главное меню*\nДобро пожаловать, *{name}*!\nПлан: `{plan}` | Кредиты: `{credits}`",
    campaigns: "📢 Кампании",
    accounts: "👤 Аккаунты",
    groups: "👥 Группы",
    stats: "📊 Статистика",
    billing: "💳 Оплата",
    settings: "⚙️ Настройки",
    admin: "🛡️ Админ панель",
    help: "❓ Помощь",
    back: "◀️ Назад",
    logout: "🚪 Выйти",
    enter_email: "📧 Введите email:",
    enter_password: "🔑 Введите пароль:",
    enter_name: "👤 Введите ваше имя:",
    login_success: "✅ Вход выполнен! Добро пожаловать, *{name}*!",
    login_fail: "❌ Неверные данные. Попробуйте снова.",
    register_success: "✅ Аккаунт создан! Добро пожаловать, *{name}*!",
    register_fail: "❌ Ошибка регистрации: {error}",
    not_logged: "⚠️ Пожалуйста, войдите сначала.",
    plans_title: "💎 *Тарифы CampaignX*",
    pay_crypto: "💰 Оплата криптовалютой",
    pay_stars: "⭐ Оплата Stars",
    campaigns_list: "📢 *Ваши кампании*\nВсего: {count}",
    no_campaigns: "Кампаний пока нет.",
    accounts_list: "👤 *Ваши аккаунты*\nВсего: {count}",
    no_accounts: "Аккаунты не добавлены.",
    groups_list: "👥 *Ваши группы*\nВсего: {count}",
    no_groups: "Группы не добавлены.",
    stats_title: "📊 *Ваша статистика*",
    add_group: "➕ Добавить группу",
    enter_group: "Введите username группы (например @mygroup):",
    group_added: "✅ Группа @{username} добавлена!",
    group_fail: "❌ Ошибка: {error}",
    forward_menu: "📤 *Пересылка сообщений*\nПеренаправляйте ответы в ваш DM или группу.",
    forward_set: "✅ Цель установлена: @{target}",
    contact_admin: "📩 *Связаться с администратором*\nОтправьте сообщение и мы ответим:",
    msg_sent_admin: "✅ Сообщение отправлено администратору!",
    admin_msg: "📩 Сообщение от @{username} (ID: {id}):\n\n{message}",
  },
  hi: {
    welcome_title: "🚀 *CampaignX Bot में आपका स्वागत है*",
    welcome_desc: "टेलीग्राम ग्रुप मार्केटिंग ऑटोमेशन का सबसे शक्तिशाली प्लेटफॉर्म।\n\n✅ हजारों ग्रुप्स में ऑटो-पोस्ट\n✅ मल्टी-अकाउंट मैनेजमेंट\n✅ AI मैसेज रिराइटिंग\n✅ रियल-टाइम एनालिटिक्स\n✅ स्मार्ट शेड्यूलिंग",
    choose_lang: "🌐 अपनी भाषा चुनें:",
    login: "🔐 लॉगिन",
    register: "📝 रजिस्टर",
    main_menu: "📋 *मुख्य मेनू*\nवापस आपका स्वागत है, *{name}*!\nप्लान: `{plan}` | क्रेडिट: `{credits}`",
    campaigns: "📢 कैम्पेन",
    accounts: "👤 अकाउंट",
    groups: "👥 ग्रुप्स",
    stats: "📊 आँकड़े",
    billing: "💳 बिलिंग",
    settings: "⚙️ सेटिंग्स",
    admin: "🛡️ एडमिन पैनल",
    help: "❓ मदद",
    back: "◀️ वापस",
    logout: "🚪 लॉगआउट",
    enter_email: "📧 अपना ईमेल दर्ज करें:",
    enter_password: "🔑 पासवर्ड दर्ज करें:",
    enter_name: "👤 अपना पूरा नाम दर्ज करें:",
    login_success: "✅ लॉगिन सफल! स्वागत है, *{name}*!",
    login_fail: "❌ गलत जानकारी। फिर कोशिश करें।",
    register_success: "✅ अकाउंट बना दिया गया! स्वागत है, *{name}*!",
    register_fail: "❌ रजिस्ट्रेशन विफल: {error}",
    not_logged: "⚠️ कृपया पहले लॉगिन करें।",
    plans_title: "💎 *CampaignX प्लान्स*",
    pay_crypto: "💰 क्रिप्टो से भुगतान",
    pay_stars: "⭐ Stars से भुगतान",
    campaigns_list: "📢 *आपके कैम्पेन*\nकुल: {count}",
    no_campaigns: "अभी कोई कैम्पेन नहीं।",
    accounts_list: "👤 *आपके अकाउंट*\nकुल: {count}",
    no_accounts: "कोई अकाउंट नहीं जोड़ा गया।",
    groups_list: "👥 *आपके ग्रुप्स*\nकुल: {count}",
    no_groups: "कोई ग्रुप नहीं जोड़ा गया।",
    stats_title: "📊 *आपके आँकड़े*",
    add_group: "➕ ग्रुप जोड़ें",
    enter_group: "ग्रुप यूज़रनेम दर्ज करें (जैसे @mygroup):",
    group_added: "✅ ग्रुप @{username} जोड़ा गया!",
    group_fail: "❌ विफल: {error}",
    forward_menu: "📤 *मैसेज फॉरवर्ड*\nकैम्पेन रिप्लाई को DM या ग्रुप में फॉरवर्ड करें।",
    forward_set: "✅ फॉरवर्ड टार्गेट सेट: @{target}",
    contact_admin: "📩 *एडमिन से संपर्क करें*\nअपना संदेश भेजें:",
    msg_sent_admin: "✅ संदेश एडमिन को भेज दिया गया!",
    admin_msg: "📩 @{username} (ID: {id}) का संदेश:\n\n{message}",
  },
};

function t(lang, key, vars = {}) {
  const str = (T[lang] || T.en)[key] || (T.en)[key] || key;
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] !== undefined ? vars[k] : `{${k}}`);
}

// ── API HELPERS ───────────────────────────────────────────────────────────────
async function api(method, endpoint, body = null, token = null) {
  try {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await axios({ method, url: `${BACKEND_URL}${endpoint}`, data: body, headers, timeout: 15000 });
    return { ok: true, data: res.data };
  } catch (e) {
    return { ok: false, error: e.response?.data?.error || e.message };
  }
}

// ── KEYBOARDS ─────────────────────────────────────────────────────────────────
function langKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🇬🇧 English", callback_data: "lang_en" }, { text: "🇸🇦 العربية", callback_data: "lang_ar" }],
      [{ text: "🇷🇺 Русский", callback_data: "lang_ru" }, { text: "🇮🇳 हिन्दी", callback_data: "lang_hi" }],
    ],
  };
}

function authKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: t(lang, "login"), callback_data: "auth_login" }, { text: t(lang, "register"), callback_data: "auth_register" }],
    ],
  };
}

function mainMenuKeyboard(lang, isAdmin = false) {
  const rows = [
    [{ text: t(lang, "campaigns"), callback_data: "menu_campaigns" }, { text: t(lang, "accounts"), callback_data: "menu_accounts" }],
    [{ text: t(lang, "groups"), callback_data: "menu_groups" }, { text: t(lang, "stats"), callback_data: "menu_stats" }],
    [{ text: t(lang, "billing"), callback_data: "menu_billing" }, { text: t(lang, "settings"), callback_data: "menu_settings" }],
    [{ text: "📤 Forward Setup", callback_data: "menu_forward" }, { text: "📩 Contact Admin", callback_data: "menu_contact" }],
    [{ text: t(lang, "help"), callback_data: "menu_help" }, { text: t(lang, "logout"), callback_data: "auth_logout" }],
  ];
  if (isAdmin) rows.splice(4, 0, [{ text: t(lang, "admin"), callback_data: "menu_admin" }]);
  return { inline_keyboard: rows };
}

function backKeyboard(lang, target = "main") {
  return { inline_keyboard: [[{ text: t(lang, "back"), callback_data: `back_${target}` }]] };
}

function plansKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: "🥉 Starter — $9/mo", callback_data: "plan_starter" }],
      [{ text: "⚡ Pro — $19/mo", callback_data: "plan_pro" }],
      [{ text: "🏢 Agency — $49/mo", callback_data: "plan_agency" }],
      [{ text: "🪙 Buy Credits", callback_data: "plan_credits" }],
      [{ text: t(lang, "back"), callback_data: "back_main" }],
    ],
  };
}

function planDetailKeyboard(lang, plan) {
  return {
    inline_keyboard: [
      [{ text: "📅 Monthly", callback_data: `buy_${plan}_monthly` }, { text: "📅 Quarterly (-15%)", callback_data: `buy_${plan}_quarterly` }],
      [{ text: "📅 Yearly (-30%)", callback_data: `buy_${plan}_yearly` }],
      [{ text: t(lang, "back"), callback_data: "menu_billing" }],
    ],
  };
}

function payMethodKeyboard(lang, plan, period) {
  return {
    inline_keyboard: [
      [{ text: t(lang, "pay_crypto"), callback_data: `crypto_${plan}_${period}` }],
      [{ text: t(lang, "pay_stars"), callback_data: `stars_${plan}_${period}` }],
      [{ text: t(lang, "back"), callback_data: `plan_${plan}` }],
    ],
  };
}

function creditsKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: "100 credits — $2", callback_data: "credits_c100" }, { text: "500 credits — $8", callback_data: "credits_c500" }],
      [{ text: "2000 credits — $25", callback_data: "credits_c2000" }, { text: "5000 credits — $55", callback_data: "credits_c5000" }],
      [{ text: t(lang, "back"), callback_data: "menu_billing" }],
    ],
  };
}

function adminKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: "📊 Platform Stats", callback_data: "admin_stats" }, { text: "👥 All Users", callback_data: "admin_users" }],
      [{ text: "🎁 Grant Plan/Credits", callback_data: "admin_grant" }, { text: "💳 All Payments", callback_data: "admin_payments" }],
      [{ text: t(lang, "back"), callback_data: "back_main" }],
    ],
  };
}

// ── PLAN INFO ─────────────────────────────────────────────────────────────────
const PLAN_PRICES = {
  starter: { monthly: 9, quarterly: 24, yearly: 79 },
  pro:     { monthly: 19, quarterly: 49, yearly: 149 },
  agency:  { monthly: 49, quarterly: 129, yearly: 399 },
};

const PLAN_FEATURES_TEXT = {
  starter: "3 accounts | 500 groups | 5 campaigns | 100 posts/day",
  pro:     "10 accounts | 2000 groups | 20 campaigns | 500 posts/day | A/B testing | Webhooks",
  agency:  "∞ accounts | ∞ groups | ∞ campaigns | White label | Team members",
};

// Stars price (1 star ≈ $0.013)
const usdToStars = (usd) => Math.ceil(usd / 0.013);

// ── SEND HELPERS ──────────────────────────────────────────────────────────────
async function sendMsg(chatId, text, extra = {}) {
  try {
    return await bot.sendMessage(chatId, text, { parse_mode: "Markdown", ...extra });
  } catch (e) {
    console.error("sendMsg error:", e.message);
  }
}

async function editMsg(chatId, msgId, text, extra = {}) {
  try {
    return await bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: "Markdown", ...extra });
  } catch (e) {
    // fallback: send new
    return sendMsg(chatId, text, extra);
  }
}

// ── WELCOME / START ───────────────────────────────────────────────────────────
async function showWelcome(chatId, lang = "en") {
  const text = `${t(lang, "welcome_title")}\n\n${t(lang, "welcome_desc")}`;
  await sendMsg(chatId, text, { reply_markup: authKeyboard(lang) });
}

async function showLangSelect(chatId) {
  await sendMsg(chatId, "🌐 *Choose your language / اختر لغتك / Выберите язык / भाषा चुनें:*", {
    reply_markup: langKeyboard(),
  });
}

async function showMainMenu(chatId, session, msgId = null) {
  const lang = session.lang || "en";
  const user = session.user;
  const text = t(lang, "main_menu", { name: user?.name || "User", plan: user?.plan || "trial", credits: user?.credits || 0 });
  const kb = mainMenuKeyboard(lang, user?.isAdmin);
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

// ── /start ────────────────────────────────────────────────────────────────────
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);
  session.step = "idle";

  // Check referral
  const ref = (match[1] || "").trim();
  if (ref) session.data.referralCode = ref;

  if (session.token) {
    // Already logged in — refresh user
    const r = await api("GET", "/api/me", null, session.token);
    if (r.ok) {
      session.user = r.data;
      await showMainMenu(chatId, session);
      return;
    } else {
      session.token = null;
      session.user = null;
    }
  }
  await showLangSelect(chatId);
});

// ── CALLBACK HANDLER ──────────────────────────────────────────────────────────
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const msgId = query.message.message_id;
  const data = query.data;
  const session = getSession(chatId);
  const lang = session.lang || "en";

  await bot.answerCallbackQuery(query.id).catch(() => {});

  // ── LANGUAGE SELECT
  if (data.startsWith("lang_")) {
    session.lang = data.replace("lang_", "");
    await editMsg(chatId, msgId, `${t(session.lang, "welcome_title")}\n\n${t(session.lang, "welcome_desc")}`, {
      reply_markup: authKeyboard(session.lang),
    });
    return;
  }

  // ── BACK
  if (data === "back_main") {
    if (!session.token) { await showLangSelect(chatId); return; }
    session.step = "idle";
    await showMainMenu(chatId, session, msgId);
    return;
  }

  // ── AUTH
  if (data === "auth_login") {
    session.step = "login_email";
    session.data = {};
    await editMsg(chatId, msgId, `🔐 *Login*\n\n${t(lang, "enter_email")}`);
    return;
  }

  if (data === "auth_register") {
    session.step = "reg_name";
    session.data = {};
    await editMsg(chatId, msgId, `📝 *Register*\n\n${t(lang, "enter_name")}`);
    return;
  }

  if (data === "auth_logout") {
    session.token = null;
    session.user = null;
    session.step = "idle";
    await editMsg(chatId, msgId, "✅ Logged out successfully!");
    setTimeout(() => showLangSelect(chatId), 1000);
    return;
  }

  // ── REQUIRE AUTH for rest
  if (!session.token) {
    await bot.answerCallbackQuery(query.id, { text: t(lang, "not_logged"), show_alert: true });
    return;
  }

  // ── MAIN MENU
  if (data === "menu_campaigns") await showCampaigns(chatId, msgId, session);
  else if (data === "menu_accounts") await showAccounts(chatId, msgId, session);
  else if (data === "menu_groups") await showGroups(chatId, msgId, session);
  else if (data === "menu_stats") await showStats(chatId, msgId, session);
  else if (data === "menu_billing") await showBilling(chatId, msgId, session);
  else if (data === "menu_settings") await showSettings(chatId, msgId, session);
  else if (data === "menu_forward") await showForward(chatId, msgId, session);
  else if (data === "menu_contact") await showContact(chatId, msgId, session);
  else if (data === "menu_help") await showHelp(chatId, msgId, session);
  else if (data === "menu_admin") await showAdmin(chatId, msgId, session);

  // ── GROUPS
  else if (data === "groups_add") {
    session.step = "group_add";
    await editMsg(chatId, msgId, `➕ *Add Group*\n\n${t(lang, "enter_group")}`, { reply_markup: backKeyboard(lang, "main") });
  }

  // ── PLANS
  else if (data.startsWith("plan_")) {
    const plan = data.replace("plan_", "");
    if (plan === "credits") {
      await editMsg(chatId, msgId, `🪙 *Buy Credits*\n\nCredits are used per message sent.`, { reply_markup: creditsKeyboard(lang) });
    } else {
      const info = PLAN_FEATURES_TEXT[plan] || "";
      const prices = PLAN_PRICES[plan];
      const text = `💎 *${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan*\n\n${info}\n\n📅 Monthly: $${prices.monthly}\n📅 Quarterly: $${prices.quarterly} *(save ${Math.round((1-prices.quarterly/(prices.monthly*3))*100)}%)*\n📅 Yearly: $${prices.yearly} *(save ${Math.round((1-prices.yearly/(prices.monthly*12))*100)}%)*`;
      await editMsg(chatId, msgId, text, { reply_markup: planDetailKeyboard(lang, plan) });
    }
  }

  // ── BUY PLAN
  else if (data.startsWith("buy_")) {
    const [, plan, period] = data.split("_");
    await editMsg(chatId, msgId, `💳 *Choose Payment Method*\n\nPlan: ${plan} | Period: ${period}`, {
      reply_markup: payMethodKeyboard(lang, plan, period),
    });
  }

  // ── CRYPTO PAYMENT
  else if (data.startsWith("crypto_")) {
    const parts = data.split("_");
    const plan = parts[1];
    const period = parts[2];
    await handleCryptoPayment(chatId, msgId, session, "subscription", plan, period);
  }

  // ── STARS PAYMENT
  else if (data.startsWith("stars_")) {
    const parts = data.split("_");
    const plan = parts[1];
    const period = parts[2];
    await handleStarsPayment(chatId, session, "subscription", plan, period);
  }

  // ── CREDITS BUY
  else if (data.startsWith("credits_")) {
    const pkgId = data.replace("credits_", "");
    await editMsg(chatId, msgId, `💳 *Choose Payment Method for Credits*`, {
      inline_keyboard: [
        [{ text: t(lang, "pay_crypto"), callback_data: `creditcrypto_${pkgId}` }],
        [{ text: t(lang, "pay_stars"), callback_data: `creditstars_${pkgId}` }],
        [{ text: t(lang, "back"), callback_data: "plan_credits" }],
      ],
    });
  }

  else if (data.startsWith("creditcrypto_")) {
    const pkgId = data.replace("creditcrypto_", "");
    await handleCryptoPayment(chatId, msgId, session, "credits", null, null, pkgId);
  }

  else if (data.startsWith("creditstars_")) {
    const pkgId = data.replace("creditstars_", "");
    await handleStarsPayment(chatId, session, "credits", null, null, pkgId);
  }

  // ── CAMPAIGN ACTIONS
  else if (data.startsWith("camp_start_")) {
    const id = data.replace("camp_start_", "");
    const r = await api("POST", `/api/campaigns/${id}/start`, {}, session.token);
    await bot.answerCallbackQuery(query.id, { text: r.ok ? "✅ Campaign started!" : `❌ ${r.error}`, show_alert: true });
    await showCampaigns(chatId, msgId, session);
  }
  else if (data.startsWith("camp_pause_")) {
    const id = data.replace("camp_pause_", "");
    const r = await api("POST", `/api/campaigns/${id}/pause`, {}, session.token);
    await bot.answerCallbackQuery(query.id, { text: r.ok ? "⏸ Campaign paused!" : `❌ ${r.error}`, show_alert: true });
    await showCampaigns(chatId, msgId, session);
  }

  // ── FORWARD
  else if (data === "forward_set") {
    session.step = "forward_set";
    await editMsg(chatId, msgId, "📤 Enter the @username or group username to forward replies to:", { reply_markup: backKeyboard(lang, "main") });
  }

  // ── SETTINGS
  else if (data === "settings_lang") {
    await editMsg(chatId, msgId, "🌐 Choose your language:", { reply_markup: langKeyboard() });
  }
  else if (data === "settings_referral") {
    const code = session.user?.referralCode || "";
    const botInfo = await bot.getMe();
    const link = `https://t.me/${botInfo.username}?start=${code}`;
    await sendMsg(chatId, `🔗 *Your Referral Link:*\n\n${link}\n\n💰 Earn 20% commission on every referral payment!`);
  }

  // ── CHECK PAYMENT
  else if (data.startsWith("checkpay_")) {
    await handleCheckPay(query);
  }

  // ── ADMIN
  else if (data === "admin_stats") await showAdminStats(chatId, msgId, session);
  else if (data === "admin_users") await showAdminUsers(chatId, msgId, session);
  else if (data === "admin_grant") {
    session.step = "admin_grant_email";
    session.data = {};
    await editMsg(chatId, msgId, "🎁 *Grant Plan/Credits*\n\nEnter user email:", { reply_markup: backKeyboard(lang, "main") });
  }
  else if (data === "admin_payments") await showAdminPayments(chatId, msgId, session);
});

// ── TEXT HANDLER (steps/wizard) ───────────────────────────────────────────────
bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;
  const chatId = msg.chat.id;
  const session = getSession(chatId);
  const lang = session.lang || "en";
  const text = msg.text.trim();

  // ── LOGIN WIZARD
  if (session.step === "login_email") {
    session.data.email = text;
    session.step = "login_password";
    await sendMsg(chatId, t(lang, "enter_password"));
    return;
  }

  if (session.step === "login_password") {
    const r = await api("POST", "/api/login", { email: session.data.email, password: text });
    if (r.ok) {
      session.token = r.data.token;
      session.user = r.data.user;
      session.step = "idle";
      await sendMsg(chatId, t(lang, "login_success", { name: r.data.user.name }));
      await showMainMenu(chatId, session);
    } else {
      session.step = "idle";
      await sendMsg(chatId, t(lang, "login_fail"), { reply_markup: authKeyboard(lang) });
    }
    return;
  }

  // ── REGISTER WIZARD
  if (session.step === "reg_name") {
    session.data.name = text;
    session.step = "reg_email";
    await sendMsg(chatId, t(lang, "enter_email"));
    return;
  }

  if (session.step === "reg_email") {
    session.data.email = text;
    session.step = "reg_password";
    await sendMsg(chatId, t(lang, "enter_password"));
    return;
  }

  if (session.step === "reg_password") {
    const r = await api("POST", "/api/register", {
      name: session.data.name,
      email: session.data.email,
      password: text,
      referralCode: session.data.referralCode || "",
    });
    if (r.ok) {
      session.token = r.data.token;
      session.user = r.data.user;
      session.step = "idle";
      await sendMsg(chatId, t(lang, "register_success", { name: r.data.user.name }));
      await showMainMenu(chatId, session);
    } else {
      session.step = "idle";
      await sendMsg(chatId, t(lang, "register_fail", { error: r.error }), { reply_markup: authKeyboard(lang) });
    }
    return;
  }

  // ── Require auth from here
  if (!session.token) {
    await sendMsg(chatId, t(lang, "not_logged"), { reply_markup: authKeyboard(lang) });
    return;
  }

  // ── GROUP ADD
  if (session.step === "group_add") {
    const username = text.replace("@","").replace("https://t.me/","").trim();
    const r = await api("POST", "/api/groups", { username, title: username, niche: "General" }, session.token);
    session.step = "idle";
    if (r.ok) await sendMsg(chatId, t(lang, "group_added", { username }));
    else await sendMsg(chatId, t(lang, "group_fail", { error: r.error }));
    await showGroups(chatId, null, session);
    return;
  }

  // ── FORWARD SET
  if (session.step === "forward_set") {
    const target = text.replace("@","").trim();
    session.data.forwardTarget = target;
    session.step = "idle";
    // Save to inbox settings if accounts exist
    const accR = await api("GET", "/api/accounts", null, session.token);
    if (accR.ok && accR.data.length) {
      for (const acc of accR.data) {
        await api("PUT", `/api/inbox/settings/${acc._id}`, { forwardTo: target, replyMode: "forward" }, session.token);
      }
    }
    await sendMsg(chatId, t(lang, "forward_set", { target }));
    await showMainMenu(chatId, session);
    return;
  }

  // ── CONTACT ADMIN
  if (session.step === "contact_admin") {
    session.step = "idle";
    if (ADMIN_TG_ID) {
      await sendMsg(ADMIN_TG_ID, t(lang, "admin_msg", {
        username: msg.from.username || "unknown",
        id: msg.from.id,
        message: text,
      }));
    }
    await sendMsg(chatId, t(lang, "msg_sent_admin"));
    await showMainMenu(chatId, session);
    return;
  }

  // ── ADMIN GRANT WIZARD
  if (session.step === "admin_grant_email") {
    session.data.grantEmail = text;
    session.step = "admin_grant_plan";
    await sendMsg(chatId, "Enter plan to grant (starter/pro/agency) or type 'credits':");
    return;
  }

  if (session.step === "admin_grant_plan") {
    session.data.grantPlan = text;
    session.step = "admin_grant_months";
    await sendMsg(chatId, "Enter number of months (e.g. 1, 3, 12) or credits amount:");
    return;
  }

  if (session.step === "admin_grant_months") {
    const isCredits = session.data.grantPlan === "credits";
    const r = await api("POST", "/api/admin/grant", {
      email: session.data.grantEmail,
      plan: isCredits ? undefined : session.data.grantPlan,
      months: isCredits ? undefined : parseInt(text) || 1,
      credits: isCredits ? parseInt(text) || 0 : 0,
    }, session.token);
    session.step = "idle";
    await sendMsg(chatId, r.ok ? `✅ ${r.data.message}` : `❌ ${r.error}`);
    await showAdmin(chatId, null, session);
    return;
  }
});

// ── MENU HANDLERS ─────────────────────────────────────────────────────────────
async function showCampaigns(chatId, msgId, session) {
  const lang = session.lang || "en";
  const r = await api("GET", "/api/campaigns", null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
  const camps = r.data;
  const text = t(lang, "campaigns_list", { count: camps.length });

  if (!camps.length) {
    const kb = { inline_keyboard: [[{ text: t(lang, "back"), callback_data: "back_main" }]] };
    if (msgId) await editMsg(chatId, msgId, `${text}\n\n${t(lang, "no_campaigns")}`, { reply_markup: kb });
    else await sendMsg(chatId, `${text}\n\n${t(lang, "no_campaigns")}`, { reply_markup: kb });
    return;
  }

  const rows = camps.slice(0, 8).map(c => {
    const statusEmoji = { active: "🟢", paused: "⏸", draft: "⚪", completed: "✅" }[c.status] || "⚪";
    const btn = c.status === "active"
      ? [{ text: `${statusEmoji} ${c.name} | Pause`, callback_data: `camp_pause_${c._id}` }]
      : [{ text: `${statusEmoji} ${c.name} | Start`, callback_data: `camp_start_${c._id}` }];
    return btn;
  });
  rows.push([{ text: t(lang, "back"), callback_data: "back_main" }]);

  const details = camps.slice(0, 5).map(c =>
    `• *${c.name}* — Sent: ${c.totalSent} | Failed: ${c.totalFailed}`
  ).join("\n");

  const fullText = `${text}\n\n${details}`;
  const kb = { inline_keyboard: rows };
  if (msgId) await editMsg(chatId, msgId, fullText, { reply_markup: kb });
  else await sendMsg(chatId, fullText, { reply_markup: kb });
}

async function showAccounts(chatId, msgId, session) {
  const lang = session.lang || "en";
  const r = await api("GET", "/api/accounts", null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
  const accs = r.data;

  const statusEmoji = { active: "🟢", cooldown: "🟡", banned: "🔴", warming: "🔥", needs_auth: "⚠️" };
  const details = accs.length
    ? accs.slice(0, 10).map(a => `${statusEmoji[a.status] || "⚪"} *${a.label || a.phone}* — ${a.status} | Sent: ${a.groupsSent}`).join("\n")
    : t(lang, "no_accounts");

  const text = `${t(lang, "accounts_list", { count: accs.length })}\n\n${details}\n\n💡 _Add accounts via the web dashboard_`;
  const kb = { inline_keyboard: [[{ text: t(lang, "back"), callback_data: "back_main" }]] };

  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showGroups(chatId, msgId, session) {
  const lang = session.lang || "en";
  const r = await api("GET", "/api/groups", null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
  const groups = r.data;

  const details = groups.length
    ? groups.slice(0, 10).map(g => `• @${g.username} — ${g.members.toLocaleString()} members | ${g.niche}`).join("\n")
    : t(lang, "no_groups");

  const text = `${t(lang, "groups_list", { count: groups.length })}\n\n${details}`;
  const kb = {
    inline_keyboard: [
      [{ text: t(lang, "add_group"), callback_data: "groups_add" }],
      [{ text: t(lang, "back"), callback_data: "back_main" }],
    ],
  };

  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showStats(chatId, msgId, session) {
  const lang = session.lang || "en";
  const r = await api("GET", "/api/stats", null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
  const s = r.data;

  const text = `${t(lang, "stats_title")}

📢 Campaigns: *${s.totalCampaigns}* (${s.activeCampaigns} active)
👤 Accounts: *${s.totalAccounts}* (${s.activeAccounts} active, ${s.bannedAccounts} banned)
👥 Groups: *${s.totalGroups}*

📤 Sent Today: *${s.sentToday}*
📤 Sent This Week: *${s.sentWeek}*
📤 Total Sent: *${s.totalSent}*
❌ Total Failed: *${s.totalFailed}*
✅ Success Rate: *${s.successRate}%*

💳 Plan: *${s.plan}*
🪙 Credits: *${s.credits}*
📬 Inbox Unread: *${s.inboxUnread}*`;

  const kb = { inline_keyboard: [[{ text: t(lang, "back"), callback_data: "back_main" }]] };
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showBilling(chatId, msgId, session) {
  const lang = session.lang || "en";
  const user = session.user;
  const text = `${t(lang, "plans_title")}

Current Plan: *${user?.plan || "trial"}*
Credits: *${user?.credits || 0}*

🥉 *Starter* — $9/mo
   3 accounts | 500 groups | 5 campaigns

⚡ *Pro* — $19/mo
   10 accounts | 2000 groups | A/B testing

🏢 *Agency* — $49/mo
   Unlimited everything | White label | Team

🪙 *Credits* — From $2
   Pay per message sent`;

  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: plansKeyboard(lang) });
  else await sendMsg(chatId, text, { reply_markup: plansKeyboard(lang) });
}

async function showSettings(chatId, msgId, session) {
  const lang = session.lang || "en";
  const r = await api("GET", "/api/me", null, session.token);
  const user = r.ok ? r.data : session.user;
  session.user = user;

  const text = `⚙️ *Settings*

👤 Name: *${user?.name}*
📧 Email: *${user?.email}*
💎 Plan: *${user?.plan}*
🔗 Referral Code: \`${user?.referralCode || "N/A"}\`
🌐 Language: *${lang}*`;

  const kb = {
    inline_keyboard: [
      [{ text: "🌐 Change Language", callback_data: "settings_lang" }],
      [{ text: "🔗 My Referral Link", callback_data: "settings_referral" }],
      [{ text: t(lang, "back"), callback_data: "back_main" }],
    ],
  };

  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showForward(chatId, msgId, session) {
  const lang = session.lang || "en";
  const current = session.data.forwardTarget ? `@${session.data.forwardTarget}` : "Not set";
  const text = `${t(lang, "forward_menu")}\n\nCurrent target: *${current}*\n\nWhen your Telegram accounts receive replies to group posts, they will be forwarded to your chosen target automatically.`;
  const kb = {
    inline_keyboard: [
      [{ text: "📤 Set Forward Target", callback_data: "forward_set" }],
      [{ text: t(lang, "back"), callback_data: "back_main" }],
    ],
  };
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showContact(chatId, msgId, session) {
  const lang = session.lang || "en";
  session.step = "contact_admin";
  const text = t(lang, "contact_admin");
  const kb = backKeyboard(lang, "main");
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showHelp(chatId, msgId, session) {
  const lang = session.lang || "en";
  const text = `❓ *CampaignX Help*

*How it works:*
1️⃣ Add your Telegram accounts (web dashboard)
2️⃣ Add target groups (bot or dashboard)
3️⃣ Create a campaign with your message
4️⃣ Set it live — CampaignX auto-posts!

*Features:*
• 📢 Auto-post to thousands of groups
• 🔄 Smart account rotation
• 🤖 AI message rewriting (spintax)
• 📊 Real-time analytics
• 📬 Inbox management with AI replies
• 📤 Forward replies to any chat

*Plans:*
• Trial: 1 account, 50 groups
• Starter: 3 accounts, 500 groups
• Pro: 10 accounts, 2000 groups
• Agency: Unlimited

*Support:* Use "Contact Admin" in the menu.`;

  const kb = { inline_keyboard: [[{ text: t(lang, "back"), callback_data: "back_main" }]] };
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showAdmin(chatId, msgId, session) {
  const lang = session.lang || "en";
  if (!session.user?.isAdmin) { await sendMsg(chatId, "❌ Admin only."); return; }
  const text = "🛡️ *Admin Panel*\nManage your CampaignX platform.";
  const kb = adminKeyboard(lang);
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showAdminStats(chatId, msgId, session) {
  const r = await api("GET", "/api/admin/stats", null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
  const s = r.data;
  const planSummary = s.planBreakdown.map(p => `  ${p._id}: ${p.count}`).join("\n");

  const text = `📊 *Platform Statistics*

👥 Total Users: *${s.totalUsers}*
💎 Paid Users: *${s.paidUsers}*
📢 Total Campaigns: *${s.totalCampaigns}*
📤 Total Messages Sent: *${s.totalSent}*
💰 Total Revenue: *$${(s.totalRevenue||0).toFixed(2)}*

📋 *Plans:*
${planSummary}`;

  const kb = adminKeyboard(session.lang || "en");
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showAdminUsers(chatId, msgId, session) {
  const r = await api("GET", "/api/admin/users?limit=10", null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
  const users = r.data.users;
  const details = users.map(u => `• *${u.name}* (${u.email}) — ${u.plan}`).join("\n");

  const text = `👥 *Recent Users* (${r.data.total} total)\n\n${details}`;
  const kb = {
    inline_keyboard: [
      [{ text: "🎁 Grant Plan", callback_data: "admin_grant" }],
      [{ text: "◀️ Back", callback_data: "menu_admin" }],
    ],
  };
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showAdminPayments(chatId, msgId, session) {
  const r = await api("GET", "/api/admin/payments", null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
  const pays = r.data.slice(0, 10);
  const details = pays.map(p => `• ${p.userId?.email || "?"} — $${p.amountUsd} (${p.status})`).join("\n");
  const text = `💳 *Recent Payments*\n\n${details || "No payments yet."}`;
  const kb = { inline_keyboard: [[{ text: "◀️ Back", callback_data: "menu_admin" }]] };
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

// ── PAYMENT HANDLERS ──────────────────────────────────────────────────────────
async function handleCryptoPayment(chatId, msgId, session, type, plan, period, creditPackageId = null) {
  const lang = session.lang || "en";
  await sendMsg(chatId, "⏳ Creating payment...");

  const r = await api("POST", "/api/payments/create", {
    type, plan, billingPeriod: period, creditPackageId, currency: "usdttrc20",
  }, session.token);

  if (!r.ok) {
    await sendMsg(chatId, `❌ Payment failed: ${r.error}`);
    return;
  }

  const p = r.data;
  const text = `💰 *Crypto Payment*

Send exactly:
\`${p.payAmount} ${p.payCurrency?.toUpperCase()}\`

To address:
\`${p.payAddress}\`

Order ID: \`${p.orderId}\`

⚠️ Send the *exact* amount shown.
✅ Your plan will activate automatically after confirmation.`;

  const kb = {
    inline_keyboard: [
      [{ text: "🔄 Check Payment Status", callback_data: `checkpay_${p.orderId}` }],
      [{ text: t(lang, "back"), callback_data: "menu_billing" }],
    ],
  };

  await sendMsg(chatId, text, { reply_markup: kb });
}

async function handleStarsPayment(chatId, session, type, plan, period, creditPackageId = null) {
  const PLAN_PRICES_MAP = { starter: { monthly: 9, quarterly: 24, yearly: 79 }, pro: { monthly: 19, quarterly: 49, yearly: 149 }, agency: { monthly: 49, quarterly: 129, yearly: 399 } };
  const CREDITS_MAP = { c100: { price: 2, credits: 100 }, c500: { price: 8, credits: 500 }, c2000: { price: 25, credits: 2000 }, c5000: { price: 55, credits: 5000 } };

  let usd = 0, title = "", description = "";
  if (type === "subscription") {
    usd = PLAN_PRICES_MAP[plan]?.[period] || 9;
    title = `CampaignX ${plan} Plan`;
    description = `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan - ${period}`;
  } else {
    const pkg = CREDITS_MAP[creditPackageId];
    usd = pkg?.price || 2;
    title = `${pkg?.credits || 100} CampaignX Credits`;
    description = `${pkg?.credits || 100} credits for CampaignX`;
  }

  const stars = usdToStars(usd);

  try {
    await bot.sendInvoice(chatId, title, description, `stars_${type}_${plan}_${period}_${creditPackageId || ""}`, "", "XTR", [{ label: title, amount: stars }]);
  } catch (e) {
    await sendMsg(chatId, `❌ Stars payment error: ${e.message}`);
  }
}

// ── STARS PAYMENT HANDLER ─────────────────────────────────────────────────────
bot.on("pre_checkout_query", async (query) => {
  await bot.answerPreCheckoutQuery(query.id, true);
});

bot.on("successful_payment", async (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);
  const payload = msg.successful_payment.invoice_payload;

  const parts = payload.split("_");
  // stars_subscription_pro_monthly_ or stars_credits___c500
  const type = parts[1];
  const plan = parts[2] || null;
  const period = parts[3] || "monthly";
  const pkgId = parts[4] || null;

  // Credit the user via backend
  const r = await api("POST", "/api/payments/create", {
    type: type === "subscription" ? "subscription" : "credits",
    plan, billingPeriod: period,
    creditPackageId: pkgId || undefined,
    currency: "stars",
  }, session.token);

  // Since Stars are instant — manually confirm via admin grant
  if (plan) {
    await api("POST", "/api/admin/grant", { email: session.user?.email, plan, months: period === "yearly" ? 12 : period === "quarterly" ? 3 : 1 }, session.token);
  }

  await sendMsg(chatId, `✅ *Payment Successful!*\n\nThank you! Your ${type === "subscription" ? `*${plan}* plan` : "credits"} have been activated.`);
  await showMainMenu(chatId, session);
});

// ── CHECK PAYMENT STATUS ──────────────────────────────────────────────────────
async function handleCheckPay(query) {
  if (!query.data.startsWith("checkpay_")) return;
  const chatId = query.message.chat.id;
  const session = getSession(chatId);
  const orderId = query.data.replace("checkpay_", "");

  await bot.answerCallbackQuery(query.id, { text: "⏳ Checking...", show_alert: false });

  const r = await api("GET", `/api/payments/status/${orderId}`, null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }

  const p = r.data;
  const statusEmoji = { pending: "⏳", confirmed: "✅", failed: "❌", expired: "💀" };
  await sendMsg(chatId, `${statusEmoji[p.status] || "❓"} Payment status: *${p.status}*\n\n${p.status === "confirmed" ? "Your plan is now active!" : "Waiting for blockchain confirmation..."}`);

  // Refresh user if confirmed
  if (p.status === "confirmed") {
    const ur = await api("GET", "/api/me", null, session.token);
    if (ur.ok) session.user = ur.data;
  }
}

// ── /stats command ────────────────────────────────────────────────────────────
bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);
  if (!session.token) { await sendMsg(chatId, t(session.lang || "en", "not_logged")); return; }
  await showStats(chatId, null, session);
});

bot.onText(/\/campaigns/, async (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);
  if (!session.token) { await sendMsg(chatId, t(session.lang || "en", "not_logged")); return; }
  await showCampaigns(chatId, null, session);
});

bot.onText(/\/groups/, async (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);
  if (!session.token) { await sendMsg(chatId, t(session.lang || "en", "not_logged")); return; }
  await showGroups(chatId, null, session);
});

bot.onText(/\/billing/, async (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);
  if (!session.token) { await sendMsg(chatId, t(session.lang || "en", "not_logged")); return; }
  await showBilling(chatId, null, session);
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);
  await showHelp(chatId, null, session);
});

// ── ERROR HANDLING ────────────────────────────────────────────────────────────
bot.on("polling_error", (err) => console.error("Polling error:", err.message));
bot.on("error", (err) => console.error("Bot error:", err.message));

console.log("🚀 CampaignX Bot started!");
