/**
 * CampaignX Telegram Bot v2.0
 * Full featured bot with account management, AI, campaigns, inbox
 */

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
require("dotenv").config();

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";
const ADMIN_TG_ID = process.env.ADMIN_TG_ID || "";

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ── SESSION ───────────────────────────────────────────────────────────────────
const sessions = {};
function getSession(id) {
  if (!sessions[id]) sessions[id] = { step: "idle", data: {}, lang: "en" };
  return sessions[id];
}

// ── TRANSLATIONS ──────────────────────────────────────────────────────────────
const T = {
  en: {
    welcome_title: "🚀 *Welcome to CampaignX*",
    welcome_desc: "The most powerful Telegram group marketing automation platform.\n\n✅ Auto-post to thousands of groups\n✅ Multi-account management\n✅ AI message rewriting\n✅ Smart scheduling & rotation\n✅ Inbox management with AI replies",
    login: "🔐 Login", register: "📝 Register",
    main_menu: "📋 *Main Menu*\nWelcome, *{name}*!\nPlan: `{plan}` | Credits: `{credits}`",
    not_logged: "⚠️ Please login first.",
    enter_email: "📧 Enter your email:", enter_password: "🔑 Enter your password:", enter_name: "👤 Enter your full name:",
    login_success: "✅ Login successful! Welcome, *{name}*!", login_fail: "❌ Invalid credentials.",
    register_success: "✅ Account created! Welcome, *{name}*!", register_fail: "❌ Failed: {error}",
    back: "◀️ Back",
  },
  ar: {
    welcome_title: "🚀 *مرحباً بك في CampaignX*",
    welcome_desc: "منصة أتمتة التسويق الأكثر قوة.\n\n✅ النشر التلقائي\n✅ إدارة حسابات متعددة\n✅ الذكاء الاصطناعي\n✅ جدولة ذكية",
    login: "🔐 دخول", register: "📝 تسجيل",
    main_menu: "📋 *القائمة الرئيسية*\nأهلاً، *{name}*!\nالخطة: `{plan}` | الرصيد: `{credits}`",
    not_logged: "⚠️ الرجاء تسجيل الدخول.", enter_email: "📧 أدخل بريدك:", enter_password: "🔑 أدخل كلمة المرور:", enter_name: "👤 أدخل اسمك:",
    login_success: "✅ تم الدخول! أهلاً، *{name}*!", login_fail: "❌ بيانات خاطئة.",
    register_success: "✅ تم إنشاء الحساب!", register_fail: "❌ فشل: {error}", back: "◀️ رجوع",
  },
  ru: {
    welcome_title: "🚀 *Добро пожаловать в CampaignX*",
    welcome_desc: "Самая мощная платформа автоматизации.\n\n✅ Авторассылка\n✅ Мультиаккаунты\n✅ ИИ-переписывание\n✅ Умное планирование",
    login: "🔐 Войти", register: "📝 Регистрация",
    main_menu: "📋 *Главное меню*\nДобро пожаловать, *{name}*!\nПлан: `{plan}` | Кредиты: `{credits}`",
    not_logged: "⚠️ Пожалуйста, войдите.", enter_email: "📧 Введите email:", enter_password: "🔑 Введите пароль:", enter_name: "👤 Введите имя:",
    login_success: "✅ Вход выполнен! Добро пожаловать, *{name}*!", login_fail: "❌ Неверные данные.",
    register_success: "✅ Аккаунт создан!", register_fail: "❌ Ошибка: {error}", back: "◀️ Назад",
  },
  hi: {
    welcome_title: "🚀 *CampaignX में आपका स्वागत है*",
    welcome_desc: "सबसे शक्तिशाली मार्केटिंग ऑटोमेशन प्लेटफॉर्म।\n\n✅ ऑटो-पोस्ट\n✅ मल्टी-अकाउंट\n✅ AI रिराइटिंग\n✅ स्मार्ट शेड्यूलिंग",
    login: "🔐 लॉगिन", register: "📝 रजिस्टर",
    main_menu: "📋 *मुख्य मेनू*\nस्वागत है, *{name}*!\nप्लान: `{plan}` | क्रेडिट: `{credits}`",
    not_logged: "⚠️ पहले लॉगिन करें।", enter_email: "📧 ईमेल दर्ज करें:", enter_password: "🔑 पासवर्ड दर्ज करें:", enter_name: "👤 नाम दर्ज करें:",
    login_success: "✅ लॉगिन सफल! स्वागत है, *{name}*!", login_fail: "❌ गलत जानकारी।",
    register_success: "✅ अकाउंट बना!", register_fail: "❌ विफल: {error}", back: "◀️ वापस",
  },
};

function t(lang, key, vars = {}) {
  const str = (T[lang] || T.en)[key] || T.en[key] || key;
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] !== undefined ? vars[k] : `{${k}}`);
}

// ── API ───────────────────────────────────────────────────────────────────────
async function api(method, endpoint, body = null, token = null) {
  try {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await axios({ method, url: `${BACKEND_URL}${endpoint}`, data: body, headers, timeout: 20000 });
    return { ok: true, data: res.data };
  } catch (e) {
    console.error("API ERR:", method, endpoint, e.response?.status, JSON.stringify(e.response?.data)?.slice(0, 100));
    return { ok: false, error: e.response?.data?.error || e.message };
  }
}

// ── SEND HELPERS ──────────────────────────────────────────────────────────────
async function sendMsg(chatId, text, extra = {}) {
  try { return await bot.sendMessage(chatId, text, { parse_mode: "Markdown", ...extra }); }
  catch (e) {
    try { return await bot.sendMessage(chatId, text.replace(/[*_`\[\]]/g, ""), extra); }
    catch {}
  }
}

async function editMsg(chatId, msgId, text, extra = {}) {
  try { return await bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: "Markdown", ...extra }); }
  catch { return sendMsg(chatId, text, extra); }
}

// ── KEYBOARDS ─────────────────────────────────────────────────────────────────
const langKb = () => ({ inline_keyboard: [
  [{ text: "🇬🇧 English", callback_data: "lang_en" }, { text: "🇸🇦 العربية", callback_data: "lang_ar" }],
  [{ text: "🇷🇺 Русский", callback_data: "lang_ru" }, { text: "🇮🇳 हिन्दी", callback_data: "lang_hi" }],
]});

const authKb = (lang) => ({ inline_keyboard: [
  [{ text: t(lang, "login"), callback_data: "auth_login" }, { text: t(lang, "register"), callback_data: "auth_register" }],
]});

const backKb = (lang, target = "main") => ({ inline_keyboard: [
  [{ text: t(lang, "back"), callback_data: `back_${target}` }],
]});

function mainKb(lang, isAdmin = false) {
  const rows = [
    [{ text: "📢 Campaigns", callback_data: "menu_campaigns" }, { text: "👤 Accounts", callback_data: "menu_accounts" }],
    [{ text: "👥 Groups", callback_data: "menu_groups" }, { text: "📊 Statistics", callback_data: "menu_stats" }],
    [{ text: "📝 Templates", callback_data: "menu_templates" }, { text: "📬 Inbox", callback_data: "menu_inbox" }],
    [{ text: "💳 Billing", callback_data: "menu_billing" }, { text: "⚙️ Settings", callback_data: "menu_settings" }],
    [{ text: "📤 Forward Setup", callback_data: "menu_forward" }, { text: "📩 Contact Admin", callback_data: "menu_contact" }],
    [{ text: "❓ Help", callback_data: "menu_help" }, { text: "🚪 Logout", callback_data: "auth_logout" }],
  ];
  if (isAdmin) rows.splice(rows.length - 1, 0, [{ text: "🛡️ Admin Panel", callback_data: "menu_admin" }]);
  return { inline_keyboard: rows };
}

// ── PLAN CONFIG ───────────────────────────────────────────────────────────────
const PLAN_PRICES = {
  starter: { monthly: 9, quarterly: 24, yearly: 79 },
  pro:     { monthly: 19, quarterly: 49, yearly: 149 },
  agency:  { monthly: 49, quarterly: 129, yearly: 399 },
};
const CREDIT_PACKAGES = [
  { id: "c100", credits: 100, price: 2 }, { id: "c500", credits: 500, price: 8 },
  { id: "c2000", credits: 2000, price: 25 }, { id: "c5000", credits: 5000, price: 55 },
];
const usdToStars = (usd) => Math.ceil(usd / 0.013);

// ── /start ────────────────────────────────────────────────────────────────────
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);
  session.step = "idle";
  const ref = (match[1] || "").trim();
  if (ref) session.data.referralCode = ref;
  if (session.token) {
    const r = await api("GET", "/api/me", null, session.token);
    if (r.ok) { session.user = r.data; await showMainMenu(chatId, session); return; }
    session.token = null; session.user = null;
  }
  await sendMsg(chatId, "🌐 *Choose your language / اختر لغتك / Выберите язык / भाषा चुनें:*", { reply_markup: langKb() });
});

// ── CALLBACK DEDUP ────────────────────────────────────────────────────────────
const processedCbs = new Set();

// ── MAIN CALLBACK HANDLER ─────────────────────────────────────────────────────
bot.on("callback_query", async (query) => {
  if (processedCbs.has(query.id)) return;
  processedCbs.add(query.id);
  setTimeout(() => processedCbs.delete(query.id), 10000);

  const chatId = query.message.chat.id;
  const msgId = query.message.message_id;
  const data = query.data;
  const session = getSession(chatId);
  const lang = session.lang || "en";

  await bot.answerCallbackQuery(query.id).catch(() => {});

  // ── LANGUAGE
  if (data.startsWith("lang_")) {
    session.lang = data.replace("lang_", "");
    await editMsg(chatId, msgId, `${t(session.lang, "welcome_title")}\n\n${t(session.lang, "welcome_desc")}`, { reply_markup: authKb(session.lang) });
    return;
  }

  // ── BACK
  if (data === "back_main") {
    session.step = "idle";
    if (!session.token) { await sendMsg(chatId, "🌐 Choose language:", { reply_markup: langKb() }); return; }
    await showMainMenu(chatId, session, msgId);
    return;
  }
  if (data.startsWith("back_")) {
    const target = data.replace("back_", "");
    session.step = "idle";
    if (target === "accounts") await showAccounts(chatId, msgId, session);
    else if (target === "campaigns") await showCampaigns(chatId, msgId, session);
    else if (target === "groups") await showGroups(chatId, msgId, session);
    else if (target === "billing") await showBilling(chatId, msgId, session);
    else if (target === "templates") await showTemplates(chatId, msgId, session);
    else if (target === "inbox") await showInbox(chatId, msgId, session);
    else if (target === "admin") await showAdmin(chatId, msgId, session);
    else await showMainMenu(chatId, session, msgId);
    return;
  }

  // ── AUTH
  if (data === "auth_login") { session.step = "login_email"; session.data = {}; await editMsg(chatId, msgId, `🔐 *Login*\n\n${t(lang, "enter_email")}`); return; }
  if (data === "auth_register") { session.step = "reg_name"; session.data = {}; await editMsg(chatId, msgId, `📝 *Register*\n\n${t(lang, "enter_name")}`); return; }
  if (data === "auth_logout") {
    session.token = null; session.user = null; session.step = "idle";
    await editMsg(chatId, msgId, "✅ Logged out!");
    setTimeout(() => sendMsg(chatId, "🌐 Choose language:", { reply_markup: langKb() }), 1000);
    return;
  }

  // ── REQUIRE AUTH
  if (!session.token) { await bot.answerCallbackQuery(query.id, { text: t(lang, "not_logged"), show_alert: true }); return; }

  // ── MAIN MENU
  if (data === "menu_campaigns") await showCampaigns(chatId, msgId, session);
  else if (data === "menu_accounts") await showAccounts(chatId, msgId, session);
  else if (data === "menu_groups") await showGroups(chatId, msgId, session);
  else if (data === "menu_stats") await showStats(chatId, msgId, session);
  else if (data === "menu_templates") await showTemplates(chatId, msgId, session);
  else if (data === "menu_inbox") await showInbox(chatId, msgId, session);
  else if (data === "menu_billing") await showBilling(chatId, msgId, session);
  else if (data === "menu_settings") await showSettings(chatId, msgId, session);
  else if (data === "menu_forward") await showForward(chatId, msgId, session);
  else if (data === "menu_contact") { session.step = "contact_admin"; await editMsg(chatId, msgId, "📩 *Contact Admin*\n\nSend your message:", { reply_markup: backKb(lang) }); }
  else if (data === "menu_help") await showHelp(chatId, msgId, session);
  else if (data === "menu_admin") await showAdmin(chatId, msgId, session);

  // ── ACCOUNTS
  else if (data === "accounts_add") {
    session.step = "acc_phone"; session.data = {};
    await editMsg(chatId, msgId, "📱 *Add Telegram Account*\n\nEnter phone number with country code:\nExample: `+1234567890`", { reply_markup: backKb(lang, "accounts") });
  }
  else if (data.startsWith("acc_delete_")) {
    const id = data.replace("acc_delete_", "");
    const r = await api("DELETE", `/api/accounts/${id}`, null, session.token);
    await bot.answerCallbackQuery(query.id, { text: r.ok ? "✅ Deleted!" : `❌ ${r.error}`, show_alert: true });
    await showAccounts(chatId, msgId, session);
  }
  else if (data.startsWith("acc_status_")) {
    const id = data.replace("acc_status_", "");
    const r = await api("GET", "/api/accounts", null, session.token);
    if (r.ok) {
      const acc = r.data.find(a => a._id === id);
      if (acc) await sendMsg(chatId, `📱 *${acc.label || acc.phone}*\nStatus: ${acc.status}\nSent: ${acc.groupsSent}\nDaily: ${acc.dailySent}`);
    }
  }

  // ── GROUPS
  else if (data === "groups_add") {
    session.step = "group_add";
    await editMsg(chatId, msgId, "➕ *Add Group*\n\nEnter group username:\nExample: `@mygroup` or `t.me/mygroup`", { reply_markup: backKb(lang, "groups") });
  }
  else if (data === "groups_bulk") {
    session.step = "groups_bulk";
    await editMsg(chatId, msgId, "📋 *Bulk Add Groups*\n\nSend multiple usernames, one per line:\n```\n@group1\n@group2\n@group3\n```", { reply_markup: backKb(lang, "groups") });
  }
  else if (data === "groups_clear") {
    const r = await api("DELETE", "/api/groups", null, session.token);
    await bot.answerCallbackQuery(query.id, { text: r.ok ? `✅ Deleted ${r.data.deleted} groups!` : `❌ ${r.error}`, show_alert: true });
    await showGroups(chatId, msgId, session);
  }

  // ── CAMPAIGNS
  else if (data === "camp_create") {
    session.step = "camp_name"; session.data = {};
    await editMsg(chatId, msgId, "📢 *Create Campaign*\n\nEnter campaign name:", { reply_markup: backKb(lang, "campaigns") });
  }
  else if (data.startsWith("camp_start_")) {
    const id = data.replace("camp_start_", "");
    const r = await api("POST", `/api/campaigns/${id}/start`, {}, session.token);
    await bot.answerCallbackQuery(query.id, { text: r.ok ? "✅ Started!" : `❌ ${r.error}`, show_alert: true });
    await showCampaigns(chatId, msgId, session);
  }
  else if (data.startsWith("camp_pause_")) {
    const id = data.replace("camp_pause_", "");
    const r = await api("POST", `/api/campaigns/${id}/pause`, {}, session.token);
    await bot.answerCallbackQuery(query.id, { text: r.ok ? "⏸ Paused!" : `❌ ${r.error}`, show_alert: true });
    await showCampaigns(chatId, msgId, session);
  }
  else if (data.startsWith("camp_delete_")) {
    const id = data.replace("camp_delete_", "");
    const r = await api("DELETE", `/api/campaigns/${id}`, null, session.token);
    await bot.answerCallbackQuery(query.id, { text: r.ok ? "✅ Deleted!" : `❌ ${r.error}`, show_alert: true });
    await showCampaigns(chatId, msgId, session);
  }
  else if (data.startsWith("camp_detail_")) {
    const id = data.replace("camp_detail_", "");
    const r = await api("GET", "/api/campaigns", null, session.token);
    if (r.ok) {
      const c = r.data.find(x => x._id === id);
      if (c) {
        const statusEmoji = { active: "🟢", paused: "⏸", draft: "⚪", completed: "✅" }[c.status] || "⚪";
        const text = `${statusEmoji} *${c.name}*\n\nMessage: ${c.message?.slice(0, 100)}...\nGroups: ${c.groupIds?.length || 0}\nAccounts: ${c.accountIds?.length || 0}\nSent: ${c.totalSent} | Failed: ${c.totalFailed}\nPosts/day: ${c.postsPerDay}`;
        const kb = { inline_keyboard: [
          c.status === "active"
            ? [{ text: "⏸ Pause", callback_data: `camp_pause_${id}` }]
            : [{ text: "▶️ Start", callback_data: `camp_start_${id}` }],
          [{ text: "🗑️ Delete", callback_data: `camp_delete_${id}` }],
          [{ text: t(lang, "back"), callback_data: "menu_campaigns" }],
        ]};
        await editMsg(chatId, msgId, text, { reply_markup: kb });
      }
    }
  }

  // ── TEMPLATES
  else if (data === "template_create") {
    session.step = "tpl_name"; session.data = {};
    await editMsg(chatId, msgId, "📝 *Create Template*\n\nEnter template name:", { reply_markup: backKb(lang, "templates") });
  }
  else if (data.startsWith("tpl_delete_")) {
    const id = data.replace("tpl_delete_", "");
    const r = await api("DELETE", `/api/templates/${id}`, null, session.token);
    await bot.answerCallbackQuery(query.id, { text: r.ok ? "✅ Deleted!" : `❌ ${r.error}`, show_alert: true });
    await showTemplates(chatId, msgId, session);
  }
  else if (data.startsWith("tpl_use_")) {
    const id = data.replace("tpl_use_", "");
    const r = await api("GET", "/api/templates", null, session.token);
    if (r.ok) {
      const tpl = r.data.find(t => t._id === id);
      if (tpl) {
        session.data.campMessage = tpl.message;
        session.data.campVariants = tpl.variants || [];
        session.step = "camp_name";
        await editMsg(chatId, msgId, `✅ Template loaded!\n\nNow enter campaign name:`, { reply_markup: backKb(lang, "campaigns") });
      }
    }
  }

  // ── AI REWRITE
  else if (data === "ai_rewrite") {
    session.step = "ai_rewrite";
    await editMsg(chatId, msgId, "🤖 *AI Message Rewriter*\n\nSend your message and I'll generate 5 AI variants with different tones:", { reply_markup: backKb(lang) });
  }
  else if (data.startsWith("ai_tone_")) {
    const tone = data.replace("ai_tone_", "");
    session.data.aiTone = tone;
    await bot.answerCallbackQuery(query.id, { text: `✅ Tone set to ${tone}`, show_alert: false });
  }

  // ── INBOX
  else if (data.startsWith("inbox_read_")) {
    const id = data.replace("inbox_read_", "");
    await api("PUT", `/api/inbox/${id}/read`, {}, session.token);
    await showInbox(chatId, msgId, session);
  }
  else if (data.startsWith("inbox_reply_")) {
    const id = data.replace("inbox_reply_", "");
    session.step = "inbox_reply";
    session.data.inboxMsgId = id;
    await editMsg(chatId, msgId, "✍️ Type your reply:", { reply_markup: backKb(lang, "inbox") });
  }
  else if (data.startsWith("inbox_ai_")) {
    const id = data.replace("inbox_ai_", "");
    await bot.answerCallbackQuery(query.id, { text: "🤖 Generating AI reply...", show_alert: false });
    const r = await api("POST", `/api/inbox/${id}/ai-reply`, { send: true }, session.token);
    await bot.answerCallbackQuery(query.id, { text: r.ok ? "✅ AI reply sent!" : `❌ ${r.error}`, show_alert: true });
    await showInbox(chatId, msgId, session);
  }
  else if (data === "inbox_readall") {
    await api("PUT", "/api/inbox/read-all", {}, session.token);
    await bot.answerCallbackQuery(query.id, { text: "✅ All marked as read!", show_alert: false });
    await showInbox(chatId, msgId, session);
  }

  // ── FORWARD
  else if (data === "forward_set") {
    session.step = "forward_set";
    await editMsg(chatId, msgId, "📤 Enter @username to forward replies to:", { reply_markup: backKb(lang) });
  }

  // ── BILLING / PLANS
  else if (data.startsWith("plan_")) {
    const plan = data.replace("plan_", "");
    if (plan === "credits") {
      const rows = CREDIT_PACKAGES.map(p => [{ text: `${p.credits} credits — $${p.price}`, callback_data: `credits_${p.id}` }]);
      rows.push([{ text: t(lang, "back"), callback_data: "menu_billing" }]);
      await editMsg(chatId, msgId, "🪙 *Buy Credits*\n\nCredits are used per message sent:", { reply_markup: { inline_keyboard: rows } });
    } else {
      const prices = PLAN_PRICES[plan];
      const features = { starter: "3 accounts | 500 groups | 5 campaigns | 100 posts/day", pro: "10 accounts | 2000 groups | 20 campaigns | A/B testing | Webhooks", agency: "Unlimited everything | White label | Team members" }[plan] || "";
      const text = `💎 *${plan.charAt(0).toUpperCase()+plan.slice(1)} Plan*\n\n${features}\n\n📅 Monthly: $${prices.monthly}\n📅 Quarterly: $${prices.quarterly}\n📅 Yearly: $${prices.yearly}`;
      const kb = { inline_keyboard: [
        [{ text: "Monthly", callback_data: `buy_${plan}_monthly` }, { text: "Quarterly", callback_data: `buy_${plan}_quarterly` }],
        [{ text: "Yearly (best value)", callback_data: `buy_${plan}_yearly` }],
        [{ text: t(lang, "back"), callback_data: "menu_billing" }],
      ]};
      await editMsg(chatId, msgId, text, { reply_markup: kb });
    }
  }
  else if (data.startsWith("buy_")) {
    const [, plan, period] = data.split("_");
    await editMsg(chatId, msgId, `💳 *Choose Payment*\nPlan: ${plan} | Period: ${period}`, { reply_markup: { inline_keyboard: [
      [{ text: "💰 Pay USDT Crypto", callback_data: `crypto_${plan}_${period}` }],
      [{ text: "⭐ Pay Telegram Stars", callback_data: `stars_${plan}_${period}` }],
      [{ text: t(lang, "back"), callback_data: `plan_${plan}` }],
    ]}});
  }
  else if (data.startsWith("credits_")) {
    const pkgId = data.replace("credits_", "");
    await editMsg(chatId, msgId, "💳 *Choose Payment*", { reply_markup: { inline_keyboard: [
      [{ text: "💰 Pay USDT Crypto", callback_data: `creditcrypto_${pkgId}` }],
      [{ text: "⭐ Pay Telegram Stars", callback_data: `creditstars_${pkgId}` }],
      [{ text: t(lang, "back"), callback_data: "plan_credits" }],
    ]}});
  }
  else if (data.startsWith("crypto_")) {
    const parts = data.split("_"); await handleCryptoPay(chatId, session, "subscription", parts[1], parts[2]);
  }
  else if (data.startsWith("stars_")) {
    const parts = data.split("_"); await handleStarsPay(chatId, session, "subscription", parts[1], parts[2]);
  }
  else if (data.startsWith("creditcrypto_")) {
    await handleCryptoPay(chatId, session, "credits", null, null, data.replace("creditcrypto_", ""));
  }
  else if (data.startsWith("creditstars_")) {
    await handleStarsPay(chatId, session, "credits", null, null, data.replace("creditstars_", ""));
  }
  else if (data.startsWith("checkpay_")) {
    const orderId = data.replace("checkpay_", "");
    const r = await api("GET", `/api/payments/status/${orderId}`, null, session.token);
    if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
    const emoji = { pending: "⏳", confirmed: "✅", failed: "❌", expired: "💀" }[r.data.status] || "❓";
    await sendMsg(chatId, `${emoji} Payment: *${r.data.status}*\n${r.data.status === "confirmed" ? "Your plan is active!" : "Waiting for confirmation..."}`);
    if (r.data.status === "confirmed") { const ur = await api("GET", "/api/me", null, session.token); if (ur.ok) session.user = ur.data; }
  }

  // ── SETTINGS
  else if (data === "settings_lang") await editMsg(chatId, msgId, "🌐 Choose language:", { reply_markup: langKb() });
  else if (data === "settings_referral") {
    const botInfo = await bot.getMe();
    const code = session.user?.referralCode || "";
    await sendMsg(chatId, `🔗 *Your Referral Link:*\n\nhttps://t.me/${botInfo.username}?start=${code}\n\n💰 Earn 20% commission on every referral!`);
  }

  // ── ADMIN
  else if (data === "admin_stats") await showAdminStats(chatId, msgId, session);
  else if (data === "admin_users") await showAdminUsers(chatId, msgId, session);
  else if (data === "admin_payments") await showAdminPayments(chatId, msgId, session);
  else if (data === "admin_grant") { session.step = "admin_grant_email"; session.data = {}; await editMsg(chatId, msgId, "🎁 *Grant Plan/Credits*\n\nEnter user email:", { reply_markup: backKb(lang, "admin") }); }
});

// ── TEXT HANDLER ──────────────────────────────────────────────────────────────
bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;
  const chatId = msg.chat.id;
  const session = getSession(chatId);
  const lang = session.lang || "en";
  const text = msg.text.trim();

  // ── LOGIN
  if (session.step === "login_email") { session.data.email = text; session.step = "login_password"; await sendMsg(chatId, t(lang, "enter_password")); return; }
  if (session.step === "login_password") {
    const r = await api("POST", "/api/login", { email: session.data.email, password: text });
    if (r.ok) { session.token = r.data.token; session.user = r.data.user; session.step = "idle"; await sendMsg(chatId, t(lang, "login_success", { name: r.data.user.name })); await showMainMenu(chatId, session); }
    else { session.step = "idle"; await sendMsg(chatId, t(lang, "login_fail"), { reply_markup: authKb(lang) }); }
    return;
  }

  // ── REGISTER
  if (session.step === "reg_name") { session.data.name = text; session.step = "reg_email"; await sendMsg(chatId, t(lang, "enter_email")); return; }
  if (session.step === "reg_email") { session.data.email = text; session.step = "reg_password"; await sendMsg(chatId, t(lang, "enter_password")); return; }
  if (session.step === "reg_password") {
    const r = await api("POST", "/api/register", { name: session.data.name, email: session.data.email, password: text, referralCode: session.data.referralCode || "" });
    if (r.ok) { session.token = r.data.token; session.user = r.data.user; session.step = "idle"; await sendMsg(chatId, t(lang, "register_success", { name: r.data.user.name })); await showMainMenu(chatId, session); }
    else { session.step = "idle"; await sendMsg(chatId, t(lang, "register_fail", { error: r.error }), { reply_markup: authKb(lang) }); }
    return;
  }

  if (!session.token) { await sendMsg(chatId, t(lang, "not_logged"), { reply_markup: authKb(lang) }); return; }

  // ── ADD ACCOUNT — PHONE
  if (session.step === "acc_phone") {
    const phone = text.replace(/\s/g, "");
    await sendMsg(chatId, `⏳ Sending OTP to ${phone}...`);
    const r = await api("POST", "/api/accounts/send-otp", { phone }, session.token);
    if (r.ok && r.data.success) {
      session.data.accPhone = phone;
      session.data.accPhoneCodeHash = r.data.phoneCodeHash;
      session.data.accSession = r.data.session;
      session.step = "acc_otp";
      await sendMsg(chatId, `✅ OTP sent to ${phone}!\n\nEnter the code you received:`);
    } else {
      session.step = "idle";
      await sendMsg(chatId, `❌ Failed: ${r.data?.error || r.error}\n\nMake sure the phone number is correct.`);
      await showAccounts(chatId, null, session);
    }
    return;
  }

  // ── ADD ACCOUNT — OTP
  if (session.step === "acc_otp") {
    await sendMsg(chatId, "⏳ Verifying OTP...");
    const r = await api("POST", "/api/accounts/verify-otp", {
      phone: session.data.accPhone,
      phoneCodeHash: session.data.accPhoneCodeHash,
      code: text.trim(),
      session: session.data.accSession,
      label: session.data.accPhone,
    }, session.token);
    if (r.ok && r.data.sessionString !== undefined) {
      session.step = "idle";
      await sendMsg(chatId, `✅ Account *${session.data.accPhone}* added successfully!`);
      await showAccounts(chatId, null, session);
    } else if (r.error?.includes("2FA") || r.error?.includes("password")) {
      session.step = "acc_2fa";
      await sendMsg(chatId, "🔐 2FA enabled. Enter your Telegram password:");
    } else {
      session.step = "idle";
      await sendMsg(chatId, `❌ Failed: ${r.error}`);
      await showAccounts(chatId, null, session);
    }
    return;
  }

  // ── ADD ACCOUNT — 2FA
  if (session.step === "acc_2fa") {
    await sendMsg(chatId, "⏳ Verifying 2FA...");
    const r = await api("POST", "/api/accounts/verify-otp", {
      phone: session.data.accPhone,
      phoneCodeHash: session.data.accPhoneCodeHash,
      code: session.data.accOtp || "",
      session: session.data.accSession,
      twoFaPassword: text.trim(),
      label: session.data.accPhone,
    }, session.token);
    session.step = "idle";
    if (r.ok) { await sendMsg(chatId, `✅ Account added with 2FA!`); }
    else { await sendMsg(chatId, `❌ Failed: ${r.error}`); }
    await showAccounts(chatId, null, session);
    return;
  }

  // ── ADD GROUP
  if (session.step === "group_add") {
    const username = text.replace("@","").replace("https://t.me/","").trim();
    const r = await api("POST", "/api/groups", { username, title: username, niche: "General" }, session.token);
    session.step = "idle";
    await sendMsg(chatId, r.ok ? `✅ Group @${username} added!` : `❌ ${r.error}`);
    await showGroups(chatId, null, session);
    return;
  }

  // ── BULK ADD GROUPS
  if (session.step === "groups_bulk") {
    const lines = text.split("\n").map(l => l.replace("@","").replace("https://t.me/","").trim()).filter(Boolean);
    const groups = lines.map(username => ({ username, title: username, niche: "General" }));
    const r = await api("POST", "/api/groups/bulk", { groups }, session.token);
    session.step = "idle";
    await sendMsg(chatId, r.ok ? `✅ Added ${r.data.added} groups!` : `❌ ${r.error}`);
    await showGroups(chatId, null, session);
    return;
  }

  // ── CREATE CAMPAIGN
  if (session.step === "camp_name") { session.data.campName = text; session.step = "camp_message"; await sendMsg(chatId, "📝 Enter the message to send:\n\n💡 Tip: Use `{option1|option2}` for spintax variation!"); return; }
  if (session.step === "camp_message") {
    session.data.campMessage = session.data.campMessage || text;
    session.step = "camp_accounts";
    const r = await api("GET", "/api/accounts", null, session.token);
    if (!r.ok || !r.data.length) { await sendMsg(chatId, "❌ No accounts found. Add accounts first!"); session.step = "idle"; return; }
    const rows = r.data.filter(a => a.status === "active").map(a => [{ text: `${a.label || a.phone}`, callback_data: `camp_acc_${a._id}` }]);
    rows.push([{ text: "✅ Use All Active Accounts", callback_data: "camp_acc_all" }]);
    rows.push([{ text: t(lang, "back"), callback_data: "menu_campaigns" }]);
    session.data.campAccounts = [];
    session.data.allAccounts = r.data.filter(a => a.status === "active");
    await sendMsg(chatId, "👤 Select accounts to use:\n\n_(tap to select, then tap ✅ All or continue)_", { reply_markup: { inline_keyboard: rows } });
    return;
  }

  // ── CREATE TEMPLATE
  if (session.step === "tpl_name") { session.data.tplName = text; session.step = "tpl_message"; await sendMsg(chatId, "📝 Enter template message:"); return; }
  if (session.step === "tpl_message") {
    const r = await api("POST", "/api/templates", { name: session.data.tplName, message: text, niche: "General" }, session.token);
    session.step = "idle";
    await sendMsg(chatId, r.ok ? `✅ Template *${session.data.tplName}* created!` : `❌ ${r.error}`);
    await showTemplates(chatId, null, session);
    return;
  }

  // ── AI REWRITE
  if (session.step === "ai_rewrite") {
    await sendMsg(chatId, "🤖 Generating AI variants...");
    const r = await api("POST", "/api/ai/rewrite", { message: text, count: 5, tone: session.data.aiTone || "marketing" }, session.token);
    session.step = "idle";
    if (r.ok && r.data.variants?.length) {
      let response = "✨ *AI Generated Variants:*\n\n";
      r.data.variants.forEach((v, i) => { response += `*${i+1}.* ${v}\n\n`; });
      await sendMsg(chatId, response);
    } else { await sendMsg(chatId, `❌ AI rewrite failed: ${r.error}`); }
    await showMainMenu(chatId, session);
    return;
  }

  // ── INBOX REPLY
  if (session.step === "inbox_reply") {
    const r = await api("POST", `/api/inbox/${session.data.inboxMsgId}/reply`, { replyText: text }, session.token);
    session.step = "idle";
    await sendMsg(chatId, r.ok ? "✅ Reply sent!" : `❌ ${r.error}`);
    await showInbox(chatId, null, session);
    return;
  }

  // ── FORWARD SET
  if (session.step === "forward_set") {
    const target = text.replace("@","").trim();
    session.data.forwardTarget = target;
    session.step = "idle";
    const accR = await api("GET", "/api/accounts", null, session.token);
    if (accR.ok && accR.data.length) {
      for (const acc of accR.data) await api("PUT", `/api/inbox/settings/${acc._id}`, { forwardTo: target, replyMode: "forward" }, session.token);
    }
    await sendMsg(chatId, `✅ Forward target set to: @${target}`);
    await showMainMenu(chatId, session);
    return;
  }

  // ── CONTACT ADMIN
  if (session.step === "contact_admin") {
    session.step = "idle";
    if (ADMIN_TG_ID) await sendMsg(ADMIN_TG_ID, `📩 Message from @${msg.from.username || "user"} (ID: ${msg.from.id}):\n\n${text}`);
    await sendMsg(chatId, "✅ Message sent to admin!");
    await showMainMenu(chatId, session);
    return;
  }

  // ── ADMIN GRANT
  if (session.step === "admin_grant_email") { session.data.grantEmail = text; session.step = "admin_grant_plan"; await sendMsg(chatId, "Enter plan (starter/pro/agency) or 'credits':"); return; }
  if (session.step === "admin_grant_plan") { session.data.grantPlan = text; session.step = "admin_grant_months"; await sendMsg(chatId, "Enter months (1/3/12) or credits amount:"); return; }
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

// ── CAMPAIGN ACCOUNT SELECTION ────────────────────────────────────────────────
bot.on("callback_query", async (query) => {
  if (processedCbs.has(query.id)) return;
  processedCbs.add(query.id);
  setTimeout(() => processedCbs.delete(query.id), 10000);

  const chatId = query.message.chat.id;
  const data = query.data;
  const session = getSession(chatId);
  const lang = session.lang || "en";

  await bot.answerCallbackQuery(query.id).catch(() => {});

  if (!session.token) return;

  if (data.startsWith("camp_acc_")) {
    const id = data.replace("camp_acc_", "");
    if (id === "all") {
      session.data.campAccounts = session.data.allAccounts?.map(a => a._id) || [];
    } else {
      if (!session.data.campAccounts) session.data.campAccounts = [];
      if (!session.data.campAccounts.includes(id)) session.data.campAccounts.push(id);
    }
    session.step = "camp_groups";
    const r = await api("GET", "/api/groups", null, session.token);
    if (!r.ok || !r.data.length) { await sendMsg(chatId, "❌ No groups found. Add groups first!"); session.step = "idle"; return; }
    await sendMsg(chatId, `✅ ${session.data.campAccounts.length} account(s) selected!\n\n👥 How many groups to target?`, { reply_markup: { inline_keyboard: [
      [{ text: "50 groups", callback_data: "camp_grp_50" }, { text: "100 groups", callback_data: "camp_grp_100" }],
      [{ text: "500 groups", callback_data: "camp_grp_500" }, { text: "All groups", callback_data: "camp_grp_all" }],
    ]}});
  }

  else if (data.startsWith("camp_grp_")) {
    const count = data.replace("camp_grp_", "");
    const r = await api("GET", "/api/groups", null, session.token);
    if (r.ok) {
      const groups = count === "all" ? r.data : r.data.slice(0, parseInt(count));
      session.data.campGroups = groups.map(g => g._id);
    }
    session.step = "idle";
    await sendMsg(chatId, "⏳ Creating campaign...");
    const campR = await api("POST", "/api/campaigns", {
      name: session.data.campName,
      message: session.data.campMessage,
      variants: session.data.campVariants || [],
      groupIds: session.data.campGroups,
      accountIds: session.data.campAccounts,
      postsPerDay: 10,
      delayMin: 12,
      delayMax: 45,
      intervalMinutes: 15,
      batchSize: 5,
      useSpintax: session.data.campMessage?.includes("{"),
      useSmartRotation: true,
      skipBlacklisted: true,
    }, session.token);
    if (campR.ok) {
      await sendMsg(chatId, `✅ *Campaign Created!*\n\nName: ${campR.data.name}\nGroups: ${session.data.campGroups?.length}\nAccounts: ${session.data.campAccounts?.length}\n\nStart it from the Campaigns menu!`);
    } else {
      await sendMsg(chatId, `❌ Failed: ${campR.error}`);
    }
    await showCampaigns(chatId, null, session);
  }
});

// ── MENU DISPLAY FUNCTIONS ────────────────────────────────────────────────────
async function showMainMenu(chatId, session, msgId = null) {
  const lang = session.lang || "en";
  const user = session.user;
  const text = t(lang, "main_menu", { name: user?.name || "User", plan: user?.plan || "trial", credits: user?.credits || 0 });
  const kb = mainKb(lang, user?.isAdmin);
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showAccounts(chatId, msgId, session) {
  const lang = session.lang || "en";
  const r = await api("GET", "/api/accounts", null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
  const accs = r.data;
  const statusEmoji = { active: "🟢", cooldown: "🟡", banned: "🔴", warming: "🔥", needs_auth: "⚠️" };
  const details = accs.length ? accs.slice(0, 8).map(a => `${statusEmoji[a.status]||"⚪"} *${a.label||a.phone}* — ${a.status} | Sent: ${a.groupsSent}`).join("\n") : "No accounts yet.";
  const text = `👤 *Accounts* (${accs.length})\n\n${details}`;
  const kb = { inline_keyboard: [
    [{ text: "➕ Add Account (OTP)", callback_data: "accounts_add" }],
    ...accs.slice(0, 5).map(a => [{ text: `${statusEmoji[a.status]||"⚪"} ${a.label||a.phone}`, callback_data: `acc_status_${a._id}` }, { text: "🗑️", callback_data: `acc_delete_${a._id}` }]),
    [{ text: t(lang, "back"), callback_data: "back_main" }],
  ]};
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showGroups(chatId, msgId, session) {
  const lang = session.lang || "en";
  const r = await api("GET", "/api/groups", null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
  const groups = r.data;
  const details = groups.length ? groups.slice(0, 8).map(g => `• @${g.username} — ${(g.members||0).toLocaleString()} members`).join("\n") : "No groups yet.";
  const text = `👥 *Groups* (${groups.length})\n\n${details}`;
  const kb = { inline_keyboard: [
    [{ text: "➕ Add Group", callback_data: "groups_add" }, { text: "📋 Bulk Add", callback_data: "groups_bulk" }],
    [{ text: "🗑️ Clear All", callback_data: "groups_clear" }],
    [{ text: t(lang, "back"), callback_data: "back_main" }],
  ]};
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showCampaigns(chatId, msgId, session) {
  const lang = session.lang || "en";
  const r = await api("GET", "/api/campaigns", null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
  const camps = r.data;
  const statusEmoji = { active: "🟢", paused: "⏸", draft: "⚪", completed: "✅" };
  const details = camps.length ? camps.slice(0, 5).map(c => `${statusEmoji[c.status]||"⚪"} *${c.name}* — Sent: ${c.totalSent}`).join("\n") : "No campaigns yet.";
  const text = `📢 *Campaigns* (${camps.length})\n\n${details}`;
  const rows = [
    [{ text: "➕ Create Campaign", callback_data: "camp_create" }],
    ...camps.slice(0, 5).map(c => [{
      text: `${statusEmoji[c.status]||"⚪"} ${c.name}`,
      callback_data: `camp_detail_${c._id}`
    }]),
    [{ text: t(lang, "back"), callback_data: "back_main" }],
  ];
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: { inline_keyboard: rows } });
  else await sendMsg(chatId, text, { reply_markup: { inline_keyboard: rows } });
}

async function showStats(chatId, msgId, session) {
  const r = await api("GET", "/api/stats", null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
  const s = r.data;
  const text = `📊 *Statistics*

📢 Campaigns: *${s.totalCampaigns}* (${s.activeCampaigns} active)
👤 Accounts: *${s.totalAccounts}* (🟢${s.activeAccounts} active, 🔴${s.bannedAccounts} banned)
👥 Groups: *${s.totalGroups}*

📤 Sent Today: *${s.sentToday}*
📤 Sent This Week: *${s.sentWeek}*
📤 Total Sent: *${s.totalSent}*
❌ Failed: *${s.totalFailed}*
✅ Success Rate: *${s.successRate}%*

💳 Plan: *${s.plan}*
🪙 Credits: *${s.credits}*`;
  const kb = { inline_keyboard: [[{ text: t(session.lang||"en", "back"), callback_data: "back_main" }]] };
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showTemplates(chatId, msgId, session) {
  const lang = session.lang || "en";
  const r = await api("GET", "/api/templates", null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
  const tpls = r.data;
  const details = tpls.length ? tpls.slice(0, 6).map(t => `• *${t.name}* — used ${t.usageCount}x`).join("\n") : "No templates yet.";
  const text = `📝 *Templates* (${tpls.length})\n\n${details}`;
  const rows = [
    [{ text: "➕ Create Template", callback_data: "template_create" }, { text: "🤖 AI Rewrite", callback_data: "ai_rewrite" }],
    ...tpls.slice(0, 5).map(t => [{ text: `📝 ${t.name}`, callback_data: `tpl_use_${t._id}` }, { text: "🗑️", callback_data: `tpl_delete_${t._id}` }]),
    [{ text: lang === "en" ? "◀️ Back" : "◀️", callback_data: "back_main" }],
  ];
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: { inline_keyboard: rows } });
  else await sendMsg(chatId, text, { reply_markup: { inline_keyboard: rows } });
}

async function showInbox(chatId, msgId, session) {
  const lang = session.lang || "en";
  const r = await api("GET", "/api/inbox?limit=5", null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
  const msgs = r.data.messages || [];
  const unread = r.data.unread || 0;
  const details = msgs.length ? msgs.slice(0, 5).map(m => `${m.isRead ? "📖" : "📬"} @${m.fromUsername||"?"}: ${(m.message||"").slice(0,50)}`).join("\n") : "No messages.";
  const text = `📬 *Inbox* (${unread} unread)\n\n${details}`;
  const rows = [
    [{ text: "✅ Mark All Read", callback_data: "inbox_readall" }],
    ...msgs.slice(0, 4).map(m => [
      { text: `${m.isRead?"📖":"📬"} @${m.fromUsername||"?"}`, callback_data: `inbox_reply_${m._id}` },
      { text: "🤖 AI Reply", callback_data: `inbox_ai_${m._id}` },
    ]),
    [{ text: t(lang, "back"), callback_data: "back_main" }],
  ];
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: { inline_keyboard: rows } });
  else await sendMsg(chatId, text, { reply_markup: { inline_keyboard: rows } });
}

async function showBilling(chatId, msgId, session) {
  const lang = session.lang || "en";
  const user = session.user;
  const text = `💳 *Billing*\n\nCurrent Plan: *${user?.plan||"trial"}*\nCredits: *${user?.credits||0}*\n\n🥉 *Starter* — $9/mo\n3 accounts | 500 groups\n\n⚡ *Pro* — $19/mo\n10 accounts | 2000 groups | A/B testing\n\n🏢 *Agency* — $49/mo\nUnlimited | White label | Team\n\n🪙 *Credits* — From $2`;
  const kb = { inline_keyboard: [
    [{ text: "🥉 Starter — $9/mo", callback_data: "plan_starter" }],
    [{ text: "⚡ Pro — $19/mo", callback_data: "plan_pro" }],
    [{ text: "🏢 Agency — $49/mo", callback_data: "plan_agency" }],
    [{ text: "🪙 Buy Credits", callback_data: "plan_credits" }],
    [{ text: t(lang, "back"), callback_data: "back_main" }],
  ]};
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showSettings(chatId, msgId, session) {
  const lang = session.lang || "en";
  const user = session.user;
  const text = `⚙️ *Settings*\n\n👤 Name: *${user?.name}*\n📧 Email: *${user?.email}*\n💎 Plan: *${user?.plan}*\n🔗 Referral: \`${user?.referralCode||"N/A"}\`\n🌐 Language: *${lang}*`;
  const kb = { inline_keyboard: [
    [{ text: "🌐 Change Language", callback_data: "settings_lang" }],
    [{ text: "🔗 My Referral Link", callback_data: "settings_referral" }],
    [{ text: t(lang, "back"), callback_data: "back_main" }],
  ]};
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showForward(chatId, msgId, session) {
  const lang = session.lang || "en";
  const current = session.data.forwardTarget ? `@${session.data.forwardTarget}` : "Not set";
  const text = `📤 *Forward Setup*\n\nCurrent target: *${current}*\n\nAll replies from your accounts will be forwarded to the target.`;
  const kb = { inline_keyboard: [
    [{ text: "📤 Set Forward Target", callback_data: "forward_set" }],
    [{ text: t(lang, "back"), callback_data: "back_main" }],
  ]};
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showHelp(chatId, msgId, session) {
  const text = `❓ *CampaignX Help*

*How to start:*
1️⃣ Add Telegram accounts → *Accounts* → Add Account
2️⃣ Add target groups → *Groups* → Add Group
3️⃣ Create campaign → *Campaigns* → Create
4️⃣ Start campaign and watch it go!

*Features:*
• 📢 Auto-post to thousands of groups
• 🤖 AI message rewriting (5 variants)
• 📝 Message templates with spintax
• 📬 Inbox with AI auto-replies
• 📤 Forward replies to any chat
• 📊 Real-time stats
• 💳 Crypto & Stars payments

*Spintax:* \`{Hello|Hi|Hey} there!\`
Each message will randomly pick one option.

*Support:* Contact Admin in the menu.`;
  const kb = { inline_keyboard: [[{ text: "◀️ Back", callback_data: "back_main" }]] };
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showAdmin(chatId, msgId, session) {
  if (!session.user?.isAdmin) { await sendMsg(chatId, "❌ Admin only."); return; }
  const text = "🛡️ *Admin Panel*";
  const kb = { inline_keyboard: [
    [{ text: "📊 Platform Stats", callback_data: "admin_stats" }, { text: "👥 Users", callback_data: "admin_users" }],
    [{ text: "💳 Payments", callback_data: "admin_payments" }, { text: "🎁 Grant Plan", callback_data: "admin_grant" }],
    [{ text: "◀️ Back", callback_data: "back_main" }],
  ]};
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showAdminStats(chatId, msgId, session) {
  const r = await api("GET", "/api/admin/stats", null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
  const s = r.data;
  const plans = s.planBreakdown?.map(p => `  ${p._id}: ${p.count}`).join("\n") || "";
  const text = `📊 *Platform Stats*\n\n👥 Total Users: *${s.totalUsers}*\n💎 Paid: *${s.paidUsers}*\n📢 Campaigns: *${s.totalCampaigns}*\n📤 Sent: *${s.totalSent}*\n💰 Revenue: *$${(s.totalRevenue||0).toFixed(2)}*\n\n📋 Plans:\n${plans}`;
  const kb = { inline_keyboard: [[{ text: "◀️ Back", callback_data: "back_admin" }]] };
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showAdminUsers(chatId, msgId, session) {
  const r = await api("GET", "/api/admin/users?limit=10", null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
  const users = r.data.users;
  const details = users.map(u => `• *${u.name}* — ${u.email} — ${u.plan}`).join("\n");
  const text = `👥 *Users* (${r.data.total} total)\n\n${details}`;
  const kb = { inline_keyboard: [[{ text: "🎁 Grant Plan", callback_data: "admin_grant" }, { text: "◀️ Back", callback_data: "back_admin" }]] };
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showAdminPayments(chatId, msgId, session) {
  const r = await api("GET", "/api/admin/payments", null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
  const pays = r.data.slice(0, 10);
  const details = pays.map(p => `• ${p.userId?.email||"?"} — $${p.amountUsd} (${p.status})`).join("\n") || "No payments.";
  const text = `💳 *Payments*\n\n${details}`;
  const kb = { inline_keyboard: [[{ text: "◀️ Back", callback_data: "back_admin" }]] };
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
async function handleCryptoPay(chatId, session, type, plan, period, creditPackageId = null) {
  await sendMsg(chatId, "⏳ Creating payment...");
  const r = await api("POST", "/api/payments/create", { type, plan, billingPeriod: period, creditPackageId, currency: "usdttrc20" }, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ Payment failed: ${r.error}`); return; }
  const p = r.data;
  await sendMsg(chatId, `💰 *Crypto Payment*\n\nSend exactly:\n\`${p.payAmount} ${p.payCurrency?.toUpperCase()}\`\n\nTo address:\n\`${p.payAddress}\`\n\nOrder ID: \`${p.orderId}\`\n\n⚠️ Send exact amount shown.\n✅ Plan activates automatically after confirmation.`, {
    reply_markup: { inline_keyboard: [
      [{ text: "🔄 Check Status", callback_data: `checkpay_${p.orderId}` }],
      [{ text: "◀️ Back", callback_data: "menu_billing" }],
    ]},
  });
}

async function handleStarsPay(chatId, session, type, plan, period, creditPackageId = null) {
  const pricesMap = { starter: { monthly: 9, quarterly: 24, yearly: 79 }, pro: { monthly: 19, quarterly: 49, yearly: 149 }, agency: { monthly: 49, quarterly: 129, yearly: 399 } };
  const creditsMap = { c100: { price: 2, credits: 100 }, c500: { price: 8, credits: 500 }, c2000: { price: 25, credits: 2000 }, c5000: { price: 55, credits: 5000 } };
  let usd = 0, title = "", description = "";
  if (type === "subscription") { usd = pricesMap[plan]?.[period] || 9; title = `CampaignX ${plan} Plan`; description = `${plan} - ${period}`; }
  else { const pkg = creditsMap[creditPackageId]; usd = pkg?.price || 2; title = `${pkg?.credits || 100} Credits`; description = `${pkg?.credits || 100} CampaignX credits`; }
  const stars = usdToStars(usd);
  try { await bot.sendInvoice(chatId, title, description, `stars_${type}_${plan}_${period}_${creditPackageId||""}`, "", "XTR", [{ label: title, amount: stars }]); }
  catch (e) { await sendMsg(chatId, `❌ Stars error: ${e.message}`); }
}

bot.on("pre_checkout_query", async (q) => { await bot.answerPreCheckoutQuery(q.id, true); });

bot.on("successful_payment", async (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);
  const parts = msg.successful_payment.invoice_payload.split("_");
  const type = parts[1]; const plan = parts[2]; const period = parts[3];
  if (plan) await api("POST", "/api/admin/grant", { email: session.user?.email, plan, months: period === "yearly" ? 12 : period === "quarterly" ? 3 : 1 }, session.token);
  await sendMsg(chatId, `✅ *Payment Successful!*\n\nYour ${type === "subscription" ? `*${plan}* plan` : "credits"} have been activated!`);
  const ur = await api("GET", "/api/me", null, session.token);
  if (ur.ok) session.user = ur.data;
  await showMainMenu(chatId, session);
});

// ── COMMANDS ──────────────────────────────────────────────────────────────────
bot.onText(/\/stats/, async (msg) => { const s = getSession(msg.chat.id); if (!s.token) return sendMsg(msg.chat.id, "Login first with /start"); await showStats(msg.chat.id, null, s); });
bot.onText(/\/campaigns/, async (msg) => { const s = getSession(msg.chat.id); if (!s.token) return sendMsg(msg.chat.id, "Login first with /start"); await showCampaigns(msg.chat.id, null, s); });
bot.onText(/\/groups/, async (msg) => { const s = getSession(msg.chat.id); if (!s.token) return sendMsg(msg.chat.id, "Login first with /start"); await showGroups(msg.chat.id, null, s); });
bot.onText(/\/accounts/, async (msg) => { const s = getSession(msg.chat.id); if (!s.token) return sendMsg(msg.chat.id, "Login first with /start"); await showAccounts(msg.chat.id, null, s); });
bot.onText(/\/billing/, async (msg) => { const s = getSession(msg.chat.id); if (!s.token) return sendMsg(msg.chat.id, "Login first with /start"); await showBilling(msg.chat.id, null, s); });
bot.onText(/\/help/, async (msg) => { await showHelp(msg.chat.id, null, getSession(msg.chat.id)); });

// ── ERRORS ────────────────────────────────────────────────────────────────────
bot.on("polling_error", (e) => console.error("Polling error:", e.message));
bot.on("error", (e) => console.error("Bot error:", e.message));

console.log("🚀 CampaignX Bot started!");
