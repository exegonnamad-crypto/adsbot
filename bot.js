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

// ── SESSION (MongoDB persistent) ──────────────────────────────────────────────
const sessions = {}; // in-memory cache

async function loadSession(telegramId) {
  if (sessions[telegramId]) return sessions[telegramId];
  try {
    const r = await axios.get(`${BACKEND_URL}/api/bot-session/${telegramId}`, { timeout: 5000 });
    if (r.data && r.data.telegramId) {
      sessions[telegramId] = {
        token: r.data.token || null,
        user: r.data.token ? {
          name: r.data.userName, plan: r.data.userPlan,
          credits: r.data.userCredits, isAdmin: r.data.userIsAdmin,
          email: r.data.userEmail, referralCode: r.data.userReferralCode,
        } : null,
        lang: r.data.lang || "en",
        step: "idle",
        data: {
          forwardTarget: r.data.forwardTarget,
          sentimentAlerts: r.data.sentimentAlerts,
          timezone: r.data.timezone || "UTC",
        },
      };
      return sessions[telegramId];
    }
  } catch {}
  sessions[telegramId] = { step: "idle", data: {}, lang: "en", token: null, user: null };
  return sessions[telegramId];
}

async function saveSession(telegramId, session) {
  sessions[telegramId] = session;
  try {
    await axios.post(`${BACKEND_URL}/api/bot-session/${telegramId}`, {
      token: session.token || "",
      userName: session.user?.name || "",
      userPlan: session.user?.plan || "trial",
      userCredits: session.user?.credits || 0,
      userIsAdmin: session.user?.isAdmin || false,
      userEmail: session.user?.email || "",
      userReferralCode: session.user?.referralCode || "",
      lang: session.lang || "en",
      forwardTarget: session.data?.forwardTarget || "",
      sentimentAlerts: session.data?.sentimentAlerts || false,
      timezone: session.data?.timezone || "UTC",
    }, { timeout: 5000 });
  } catch (e) { console.error("Session save error:", e.message); }
}

async function getSession(telegramId) {
  return await loadSession(String(telegramId));
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
    [{ text: "🤖 AI Tools", callback_data: "menu_ai" }, { text: "🔍 Group Finder", callback_data: "menu_groupfinder" }],
    [{ text: "🌍 Timezone Scheduler", callback_data: "menu_timezone" }, { text: "🖼️ Media Campaign", callback_data: "menu_media" }],
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
  const session = await getSession(chatId);
  session.step = "idle";
  const ref = (match[1] || "").trim();
  if (ref) session.data.referralCode = ref;
  if (session.token) {
    const r = await api("GET", "/api/me", null, session.token);
    if (r.ok) { session.user = r.data; await saveSession(chatId, session); await showMainMenu(chatId, session); return; }
    session.token = null; session.user = null;
    await saveSession(chatId, session);
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
  const session = await getSession(chatId);
  const lang = session.lang || "en";

  await bot.answerCallbackQuery(query.id).catch(() => {});

  // ── LANGUAGE
  if (data.startsWith("lang_")) {
    session.lang = data.replace("lang_", "");
    await saveSession(chatId, session);
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
    await saveSession(chatId, session);
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
  else if (data === "menu_ai") await showAITools(chatId, msgId, session);
  else if (data === "menu_groupfinder") await showGroupFinder(chatId, msgId, session);
  else if (data === "menu_timezone") await showTimezoneScheduler(chatId, msgId, session);
  else if (data === "menu_media") await showMediaCampaign(chatId, msgId, session);

  // ── ACCOUNTS
  else if (data === "accounts_add") {
    session.step = "acc_phone"; session.data = {};
    await editMsg(chatId, msgId, "📱 *Add Telegram Account*\n\nEnter phone number with country code:\nExample: `+1234567890`", { reply_markup: backKb(lang, "accounts") });
  }
  else if (data === "accounts_checkall") {
    await bot.answerCallbackQuery(query.id, { text: "🔍 Checking all accounts...", show_alert: false });
    await sendMsg(chatId, "⏳ Checking all accounts health...");
    const r = await api("POST", "/api/accounts/check-all", {}, session.token);
    if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
    const results = r.data.results;
    const text = `🔍 *Account Health Check*\n\n${results.map(a => `${a.alive ? "🟢" : "🔴"} *${a.label||a.phone}* — ${a.alive ? "Live ✅" : "Dead ❌ (needs re-auth)"}`).join("\n")}`;
    await sendMsg(chatId, text);
    await showAccounts(chatId, null, session);
  }
  else if (data.startsWith("acc_check_")) {
    const id = data.replace("acc_check_", "");
    await bot.answerCallbackQuery(query.id, { text: "🔍 Checking...", show_alert: false });
    const r = await api("POST", `/api/accounts/check/${id}`, {}, session.token);
    const accR = await api("GET", "/api/accounts", null, session.token);
    const acc = accR.ok ? accR.data.find(a => a._id === id) : null;
    await bot.answerCallbackQuery(query.id, {
      text: r.ok && r.data.alive ? `✅ ${acc?.label||acc?.phone} is LIVE!` : `❌ ${acc?.label||acc?.phone} is DEAD — needs re-auth!`,
      show_alert: true
    });
    await showAccounts(chatId, msgId, session);
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
  else if (data === "groups_blacklist") await showBlacklist(chatId, msgId, session);
  else if (data.startsWith("bl_remove_")) {
    const id = data.replace("bl_remove_", "");
    const r = await api("DELETE", `/api/blacklist/${id}`, null, session.token);
    await bot.answerCallbackQuery(query.id, { text: r.ok ? "✅ Removed from blacklist!" : `❌ ${r.error}`, show_alert: true });
    await showBlacklist(chatId, msgId, session);
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

  // ── AI TOOLS
  else if (data === "ai_campaign_creator") {
    session.step = "ai_camp_product";
    session.data = {};
    await editMsg(chatId, msgId, `🤖 *AI Campaign Creator*\n\nDescribe your product or service in a few words:\n\nExample: _"crypto trading signals", "fitness coaching", "web design services"_`, { reply_markup: backKb(lang, "ai") });
  }
  else if (data === "ai_rewrite") {
    session.step = "ai_rewrite";
    await editMsg(chatId, msgId, "✨ *AI Message Rewriter*\n\nSend your message and I'll generate 5 powerful variants:", { reply_markup: backKb(lang, "ai") });
  }
  else if (data === "ai_reply_templates") {
    session.step = "ai_reply_tpl";
    await editMsg(chatId, msgId, "💬 *AI Reply Templates*\n\nDescribe the type of replies you get (e.g. 'interested buyers', 'people asking price', 'people asking how it works'):", { reply_markup: backKb(lang, "ai") });
  }
  else if (data.startsWith("ai_tone_")) {
    session.data.aiTone = data.replace("ai_tone_", "");
    await bot.answerCallbackQuery(query.id, { text: `✅ Tone: ${session.data.aiTone}`, show_alert: false });
  }
  else if (data.startsWith("ai_camp_tone_")) {
    const tone = data.replace("ai_camp_tone_", "");
    session.data.aiCampTone = tone;
    await bot.answerCallbackQuery(query.id, { text: `✅ Tone set to ${tone}`, show_alert: false });
    // Now generate with selected tone
    await generateAICampaign(chatId, session);
  }
  else if (data === "ai_camp_save") {
    // Save generated message as template
    if (session.data.aiGeneratedMsg) {
      const r = await api("POST", "/api/templates", {
        name: `AI: ${session.data.aiProduct?.slice(0,30)}`,
        message: session.data.aiGeneratedMsg,
        variants: session.data.aiGeneratedVariants || [],
        niche: session.data.aiNiche || "General"
      }, session.token);
      await bot.answerCallbackQuery(query.id, { text: r.ok ? "✅ Saved as template!" : `❌ ${r.error}`, show_alert: true });
    }
  }
  else if (data === "ai_camp_use") {
    // Use generated message to create campaign
    session.data.campMessage = session.data.aiGeneratedMsg;
    session.data.campVariants = session.data.aiGeneratedVariants || [];
    session.step = "camp_name";
    await editMsg(chatId, msgId, "✅ Message ready!\n\nNow enter your campaign name:", { reply_markup: backKb(lang, "campaigns") });
  }
  else if (data === "ai_camp_regenerate") {
    await generateAICampaign(chatId, session);
  }

  // ── GROUP FINDER
  else if (data === "groupfinder_search") {
    session.step = "groupfinder_keyword";
    await editMsg(chatId, msgId, "🔍 *AI Group Finder*\n\nEnter keyword or niche to search:\n\nExample: `crypto`, `fitness`, `business`", { reply_markup: backKb(lang, "groupfinder") });
  }
  else if (data.startsWith("gf_add_")) {
    const username = data.replace("gf_add_", "");
    const r = await api("POST", "/api/groups", { username, title: username, niche: session.data.gfNiche || "General" }, session.token);
    await bot.answerCallbackQuery(query.id, { text: r.ok ? `✅ Added @${username}!` : `❌ ${r.error}`, show_alert: true });
  }
  else if (data === "gf_add_all") {
    const groups = session.data.gfResults || [];
    if (!groups.length) return;
    const r = await api("POST", "/api/groups/bulk", { groups: groups.map(g => ({ username: g.username, title: g.title, members: g.members, niche: session.data.gfNiche || "General" })) }, session.token);
    await bot.answerCallbackQuery(query.id, { text: r.ok ? `✅ Added ${r.data.added} groups!` : `❌ ${r.error}`, show_alert: true });
  }

  // ── TIMEZONE SCHEDULER
  else if (data === "tz_pick") {
    await editMsg(chatId, msgId, "🌍 Select your timezone:", { reply_markup: { inline_keyboard: [
      [{ text: "🇺🇸 EST (New York)", callback_data: "tz_set_EST" }, { text: "🇺🇸 PST (LA)", callback_data: "tz_set_PST" }],
      [{ text: "🇬🇧 GMT (London)", callback_data: "tz_set_GMT" }, { text: "🇩🇪 CET (Berlin)", callback_data: "tz_set_CET" }],
      [{ text: "🇷🇺 MSK (Moscow)", callback_data: "tz_set_MSK" }, { text: "🇦🇪 GST (Dubai)", callback_data: "tz_set_GST" }],
      [{ text: "🇮🇳 IST (India)", callback_data: "tz_set_IST" }, { text: "🇨🇳 SGT (Singapore)", callback_data: "tz_set_SGT" }],
      [{ text: "🇯🇵 JST (Tokyo)", callback_data: "tz_set_JST" }, { text: "🇦🇺 AEST (Sydney)", callback_data: "tz_set_AEST" }],
      [{ text: "🌐 UTC", callback_data: "tz_set_UTC" }],
      [{ text: "◀️ Back", callback_data: "menu_timezone" }],
    ]}});
  }
  else if (data.startsWith("tz_set_")) {
    const tz = data.replace("tz_set_", "");
    session.data.timezone = tz;
    await bot.answerCallbackQuery(query.id, { text: `✅ Timezone: ${tz}`, show_alert: false });
    await showTimezoneScheduler(chatId, msgId, session);
  }
  else if (data === "tz_peak_detect") {
    session.step = "tz_peak_camp";
    await editMsg(chatId, msgId, "📊 *Peak Hour Detection*\n\nEnter campaign name to enable peak-hour posting:", { reply_markup: backKb(lang, "timezone") });
  }
  else if (data === "tz_schedule_camp") {
    session.step = "tz_camp_select";
    const r = await api("GET", "/api/campaigns", null, session.token);
    if (!r.ok || !r.data.length) { await sendMsg(chatId, "❌ No campaigns found."); return; }
    const rows = r.data.slice(0, 8).map(c => [{ text: c.name, callback_data: `tz_camp_${c._id}` }]);
    rows.push([{ text: "◀️ Back", callback_data: "menu_timezone" }]);
    await editMsg(chatId, msgId, "📅 Select campaign to schedule:", { reply_markup: { inline_keyboard: rows } });
  }
  else if (data.startsWith("tz_camp_")) {
    const campId = data.replace("tz_camp_", "");
    session.data.tzCampId = campId;
    session.step = "tz_time";
    await editMsg(chatId, msgId, "⏰ Enter schedule time in your timezone:\nFormat: `HH:MM` (24hr)\nExample: `09:00` for 9 AM or `20:30` for 8:30 PM", { reply_markup: backKb(lang, "timezone") });
  }
  else if (data.startsWith("tz_days_")) {
    const days = data.replace("tz_days_", "");
    const daysMap = { weekdays: [1,2,3,4,5], weekends: [0,6], everyday: [0,1,2,3,4,5,6] };
    const selectedDays = daysMap[days] || [0,1,2,3,4,5,6];
    const tz = session.data.timezone || "UTC";
    const tzOffset = TZ_OFFSETS[tz] || 0;
    const utcHour = ((parseInt(session.data.tzHour || 9) - tzOffset) + 24) % 24;
    const scheduleTime = `${String(utcHour).padStart(2,"0")}:${session.data.tzMinute || "00"}`;
    const r = await api("PUT", `/api/campaigns/${session.data.tzCampId}`, {
      scheduleTime, scheduleDays: selectedDays
    }, session.token);
    await bot.answerCallbackQuery(query.id, { text: r.ok ? `✅ Scheduled at ${session.data.tzTime} ${tz}!` : `❌ ${r.error}`, show_alert: true });
    await showTimezoneScheduler(chatId, msgId, session);
  }

  // ── MEDIA CAMPAIGN
  else if (data === "media_photo") { session.data.mediaType = "photo"; session.step = "media_url"; await editMsg(chatId, msgId, "🖼️ Send the photo URL or direct link:", { reply_markup: backKb(lang, "media") }); }
  else if (data === "media_video") { session.data.mediaType = "video"; session.step = "media_url"; await editMsg(chatId, msgId, "🎥 Send the video URL or direct link:", { reply_markup: backKb(lang, "media") }); }
  else if (data === "media_camp_create") {
    session.step = "media_camp_name";
    await editMsg(chatId, msgId, "📢 Enter campaign name for this media campaign:", { reply_markup: backKb(lang, "media") });
  }

  // ── POLL CAMPAIGN
  else if (data === "poll_create") {
    session.step = "poll_question";
    session.data.pollOptions = [];
    await editMsg(chatId, msgId, "📊 *Create Poll Campaign*\n\nEnter your poll question:", { reply_markup: backKb(lang, "media") });
  }
  else if (data === "poll_add_option") {
    session.step = "poll_option";
    await editMsg(chatId, msgId, `➕ Enter option ${(session.data.pollOptions?.length || 0) + 1}:`, { reply_markup: backKb(lang, "media") });
  }
  else if (data === "poll_done") {
    if (!session.data.pollOptions?.length || session.data.pollOptions.length < 2) {
      await bot.answerCallbackQuery(query.id, { text: "❌ Need at least 2 options!", show_alert: true });
      return;
    }
    // Build poll message with buttons format
    const pollMsg = `📊 *${session.data.pollQuestion}*\n\n${session.data.pollOptions.map((o,i) => `${["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣"][i]||`${i+1}.`} ${o}`).join("\n")}`;
    session.data.campMessage = pollMsg;
    session.step = "camp_name";
    await editMsg(chatId, msgId, `✅ Poll ready!\n\nPreview:\n${pollMsg}\n\nNow enter campaign name:`, { reply_markup: backKb(lang, "campaigns") });
  }
  else if (data === "alerts_toggle") {
    session.data.sentimentAlerts = !session.data.sentimentAlerts;
    await bot.answerCallbackQuery(query.id, { text: session.data.sentimentAlerts ? "✅ Alerts ON!" : "🔕 Alerts OFF", show_alert: true });
    await showAITools(chatId, msgId, session);
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

  // ── CAMPAIGN ACCOUNT SELECTION
  else if (data.startsWith("camp_acc_")) {
    const id = data.replace("camp_acc_", "");
    if (id === "all") {
      session.data.campAccounts = session.data.allAccounts?.map(a => a._id) || [];
    } else {
      if (!session.data.campAccounts) session.data.campAccounts = [];
      if (!session.data.campAccounts.includes(id)) session.data.campAccounts.push(id);
    }
    const r = await api("GET", "/api/groups", null, session.token);
    if (!r.ok || !r.data.length) { await sendMsg(chatId, "❌ No groups found. Add groups first!"); session.step = "idle"; return; }
    await sendMsg(chatId, `✅ ${session.data.campAccounts.length} account(s) selected!\n\n👥 How many groups to target?`, { reply_markup: { inline_keyboard: [
      [{ text: "50 groups", callback_data: "camp_grp_50" }, { text: "100 groups", callback_data: "camp_grp_100" }],
      [{ text: "500 groups", callback_data: "camp_grp_500" }, { text: "✅ All groups", callback_data: "camp_grp_all" }],
    ]}});
  }

  // ── CAMPAIGN GROUP SELECTION
  else if (data.startsWith("camp_grp_")) {
    const count = data.replace("camp_grp_", "");
    const r = await api("GET", "/api/groups", null, session.token);
    if (r.ok) {
      const groups = count === "all" ? r.data : r.data.slice(0, parseInt(count));
      session.data.campGroups = groups.map(g => g._id);
    }
    // Ask for delay setting
    await sendMsg(chatId, `⏱️ *Choose delay between messages:*\n\n_Longer delays = safer, less bans_`, { reply_markup: { inline_keyboard: [
      [{ text: "15 mins", callback_data: "camp_delay_15" }, { text: "30 mins", callback_data: "camp_delay_30" }],
      [{ text: "45 mins", callback_data: "camp_delay_45" }, { text: "1 hour", callback_data: "camp_delay_60" }],
      [{ text: "2 hours", callback_data: "camp_delay_120" }, { text: "✏️ Custom (mins)", callback_data: "camp_delay_custom" }],
    ]}});
  }

  // ── CAMPAIGN DELAY SELECTION
  else if (data.startsWith("camp_delay_")) {
    const preset = data.replace("camp_delay_", "");
    if (preset === "custom") {
      session.step = "camp_delay_custom";
      await sendMsg(chatId, "✏️ Enter delay in minutes:\nExample: `20` = 20 minutes between each post");
      return;
    }
    const mins = parseInt(preset);
    const secMin = mins * 60;
    const secMax = mins * 60 + 60; // add 1 min variance
    session.data.campDelayMin = secMin;
    session.data.campDelayMax = secMax;
    await createCampaignFinal(chatId, session);
  }
});

// ── TEXT HANDLER ──────────────────────────────────────────────────────────────
bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;
  const chatId = msg.chat.id;
  const session = await getSession(chatId);
  const lang = session.lang || "en";
  const text = msg.text.trim();

  // ── LOGIN
  if (session.step === "login_email") { session.data.email = text; session.step = "login_password"; await sendMsg(chatId, t(lang, "enter_password")); return; }
  if (session.step === "login_password") {
    const r = await api("POST", "/api/login", { email: session.data.email, password: text });
    if (r.ok) {
      session.token = r.data.token; session.user = r.data.user; session.step = "idle";
      await saveSession(chatId, session);
      await sendMsg(chatId, t(lang, "login_success", { name: r.data.user.name }));
      await showMainMenu(chatId, session);
    } else {
      session.step = "idle";
      await sendMsg(chatId, t(lang, "login_fail"), { reply_markup: authKb(lang) });
    }
    return;
  }

  // ── REGISTER
  if (session.step === "reg_name") { session.data.name = text; session.step = "reg_email"; await sendMsg(chatId, t(lang, "enter_email")); return; }
  if (session.step === "reg_email") { session.data.email = text; session.step = "reg_password"; await sendMsg(chatId, t(lang, "enter_password")); return; }
  if (session.step === "reg_password") {
    const r = await api("POST", "/api/register", { name: session.data.name, email: session.data.email, password: text, referralCode: session.data.referralCode || "" });
    if (r.ok) {
      session.token = r.data.token; session.user = r.data.user; session.step = "idle";
      await saveSession(chatId, session);
      await sendMsg(chatId, t(lang, "register_success", { name: r.data.user.name }));
      await showMainMenu(chatId, session);
    } else {
      session.step = "idle";
      await sendMsg(chatId, t(lang, "register_fail", { error: r.error }), { reply_markup: authKb(lang) });
    }
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

  if (session.step === "tz_peak_camp") {
    const niche = text.toLowerCase();
    const peak = PEAK_HOURS[niche] || PEAK_HOURS["general"];
    session.step = "idle";
    await sendMsg(chatId, `📊 *Peak Hours for "${text}":*\n\n⏰ Best times: ${peak.hours}\n🎯 Recommended: *${peak.best}*\n\nWant to schedule your campaign at ${peak.best}?`, { reply_markup: { inline_keyboard: [
      [{ text: `✅ Schedule at ${peak.best}`, callback_data: "tz_schedule_camp" }],
      [{ text: "◀️ Back", callback_data: "menu_timezone" }],
    ]}});
    return;
  }

  // ── CUSTOM DELAY
  if (session.step === "camp_delay_custom") {
    const mins = parseInt(text.trim());
    if (isNaN(mins) || mins < 1) {
      await sendMsg(chatId, "❌ Invalid. Enter a number like `20` for 20 minutes.");
      return;
    }
    session.data.campDelayMin = mins * 60;
    session.data.campDelayMax = mins * 60 + 60;
    session.step = "idle";
    await createCampaignFinal(chatId, session);
    return;
  }

  // ── TIMEZONE SCHEDULE TIME
  if (session.step === "tz_time") {
    const timeMatch = text.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) { await sendMsg(chatId, "❌ Invalid format. Use HH:MM (e.g. 09:00)"); return; }
    session.data.tzHour = timeMatch[1];
    session.data.tzMinute = timeMatch[2];
    session.data.tzTime = text;
    session.step = "idle";
    await sendMsg(chatId, `✅ Time set to ${text} ${session.data.timezone || "UTC"}\n\nWhich days to post?`, { reply_markup: { inline_keyboard: [
      [{ text: "📅 Every Day", callback_data: "tz_days_everyday" }],
      [{ text: "💼 Weekdays Only", callback_data: "tz_days_weekdays" }, { text: "🏖️ Weekends Only", callback_data: "tz_days_weekends" }],
    ]}});
    return;
  }

  // ── MEDIA URL
  if (session.step === "media_url") {
    session.data.mediaUrl = text;
    session.step = "media_caption";
    await sendMsg(chatId, "📝 Enter caption for the media (or type 'skip' to use no caption):");
    return;
  }

  if (session.step === "media_caption") {
    session.data.mediaCaption = text === "skip" ? "" : text;
    session.step = "idle";
    await sendMsg(chatId, `✅ Media ready!\n\nType: ${session.data.mediaType}\nURL: ${session.data.mediaUrl?.slice(0,50)}...\n\nNow create a campaign to use this media:`, { reply_markup: { inline_keyboard: [
      [{ text: "🚀 Create Media Campaign", callback_data: "media_camp_create" }],
      [{ text: "◀️ Back", callback_data: "menu_media" }],
    ]}});
    return;
  }

  if (session.step === "media_camp_name") {
    session.data.campName = text;
    session.step = "media_camp_message";
    await sendMsg(chatId, "📝 Enter the text message to send with media (or type 'skip'):");
    return;
  }

  if (session.step === "media_camp_message") {
    session.data.campMessage = text === "skip" ? session.data.mediaCaption || "Check this out!" : text;
    session.step = "idle";
    await sendMsg(chatId, "⏳ Creating media campaign...");
    const accR = await api("GET", "/api/accounts", null, session.token);
    const grpR = await api("GET", "/api/groups", null, session.token);
    if (!accR.ok || !accR.data.length || !grpR.ok || !grpR.data.length) {
      await sendMsg(chatId, "❌ Need at least 1 account and 1 group first!");
      return;
    }
    const r = await api("POST", "/api/campaigns", {
      name: session.data.campName,
      message: session.data.campMessage,
      mediaUrl: session.data.mediaUrl,
      mediaType: session.data.mediaType,
      mediaCaption: session.data.mediaCaption || session.data.campMessage,
      groupIds: grpR.data.slice(0, 100).map(g => g._id),
      accountIds: accR.data.filter(a => a.status === "active").map(a => a._id),
      postsPerDay: 10, delayMin: 12, delayMax: 45, intervalMinutes: 15, batchSize: 5,
      useSmartRotation: true, skipBlacklisted: true,
    }, session.token);
    await sendMsg(chatId, r.ok ? `✅ Media campaign *${session.data.campName}* created!\n\nGo to Campaigns to start it.` : `❌ ${r.error}`);
    await showMediaCampaign(chatId, null, session);
    return;
  }

  // ── POLL
  if (session.step === "poll_question") {
    session.data.pollQuestion = text;
    session.data.pollOptions = [];
    session.step = "poll_option";
    await sendMsg(chatId, `✅ Question set!\n\nNow enter option 1:`);
    return;
  }

  if (session.step === "poll_option") {
    if (!session.data.pollOptions) session.data.pollOptions = [];
    session.data.pollOptions.push(text);
    const count = session.data.pollOptions.length;
    const kb = { inline_keyboard: [
      [{ text: `➕ Add Option ${count + 1}`, callback_data: "poll_add_option" }],
      count >= 2 ? [{ text: "✅ Done — Create Poll Campaign", callback_data: "poll_done" }] : [],
    ].filter(r => r.length > 0)};
    await sendMsg(chatId, `✅ Option ${count} added: "${text}"\n\nCurrent options:\n${session.data.pollOptions.map((o,i) => `${i+1}. ${o}`).join("\n")}`, { reply_markup: kb });
    session.step = "idle";
    return;
  }

  // ── AI CAMPAIGN CREATOR
  if (session.step === "ai_camp_product") {
    session.data.aiProduct = text;
    session.step = "ai_camp_audience";
    await sendMsg(chatId, "👥 Who is your target audience?\n\nExample: `crypto traders`, `gym lovers`, `small business owners`");
    return;
  }
  if (session.step === "ai_camp_audience") {
    session.data.aiAudience = text;
    session.step = "ai_camp_goal";
    await sendMsg(chatId, "🎯 What is your goal?\n\nExample: `get signups`, `sell product`, `grow channel`, `get clients`");
    return;
  }
  if (session.step === "ai_camp_goal") {
    session.data.aiGoal = text;
    session.data.aiCampTone = "marketing";
    session.step = "idle";
    await sendMsg(chatId, "🎨 Choose message tone:", { reply_markup: { inline_keyboard: [
      [{ text: "💼 Professional", callback_data: "ai_camp_tone_professional" }, { text: "🔥 Urgent/FOMO", callback_data: "ai_camp_tone_urgent" }],
      [{ text: "😊 Friendly", callback_data: "ai_camp_tone_casual" }, { text: "😂 Funny", callback_data: "ai_camp_tone_funny" }],
    ]}});
    return;
  }

  // ── GROUP FINDER
  if (session.step === "groupfinder_keyword") {
    const keyword = text.trim();
    session.data.gfKeyword = keyword;
    session.data.gfNiche = keyword;
    session.step = "idle";
    await sendMsg(chatId, `🔍 Searching for groups about *${keyword}*...`);
    // Need an account to search
    const accR = await api("GET", "/api/accounts", null, session.token);
    if (!accR.ok || !accR.data.length) {
      await sendMsg(chatId, "❌ No accounts found. Add an account first to search groups!");
      return;
    }
    const account = accR.data.find(a => a.status === "active");
    if (!account) { await sendMsg(chatId, "❌ No active accounts. Activate an account first!"); return; }
    const r = await api("POST", "/api/groups/search", { keyword, accountId: account._id, limit: 15 }, session.token);
    if (!r.ok || !r.data.success || !r.data.groups?.length) {
      await sendMsg(chatId, `❌ No groups found for "${keyword}". Try a different keyword.`);
      return;
    }
    session.data.gfResults = r.data.groups;
    const details = r.data.groups.slice(0, 10).map(g => `• @${g.username} — ${(g.members||0).toLocaleString()} members`).join("\n");
    const rows = r.data.groups.slice(0, 8).map(g => [{ text: `➕ @${g.username} (${(g.members||0).toLocaleString()})`, callback_data: `gf_add_${g.username}` }]);
    rows.push([{ text: `✅ Add All ${r.data.groups.length} Groups`, callback_data: "gf_add_all" }]);
    rows.push([{ text: "◀️ Back", callback_data: "menu_groupfinder" }]);
    await sendMsg(chatId, `🔍 *Found ${r.data.groups.length} groups for "${keyword}":*\n\n${details}`, { reply_markup: { inline_keyboard: rows } });
    return;
  }

  // ── AI REPLY TEMPLATES
  if (session.step === "ai_reply_tpl") {
    session.step = "idle";
    await sendMsg(chatId, "🤖 Generating reply templates...");
    const groqR = await callGroq(`Generate 5 short professional reply templates for a Telegram marketer responding to: "${text}". Each reply should be under 50 words, conversational, and end with a soft call to action. Return ONLY a JSON array of strings.`);
    if (groqR) {
      let response = "💬 *AI Reply Templates:*\n\n";
      groqR.forEach((v, i) => { response += `*${i+1}.* ${v}\n\n`; });
      response += "_Copy and use these in your inbox replies!_";
      await sendMsg(chatId, response);
    } else {
      await sendMsg(chatId, "❌ AI failed. Try again.");
    }
    await showAITools(chatId, null, session);
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
    await showAITools(chatId, null, session);
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

// ── CAMPAIGN ACCOUNT/GROUP SELECTION (merged into main handler above) ─────────


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
    [{ text: "➕ Add Account (OTP)", callback_data: "accounts_add" }, { text: "🔍 Check All", callback_data: "accounts_checkall" }],
    ...accs.slice(0, 5).map(a => [
      { text: `${statusEmoji[a.status]||"⚪"} ${a.label||a.phone}`, callback_data: `acc_status_${a._id}` },
      { text: "🔍", callback_data: `acc_check_${a._id}` },
      { text: "🗑️", callback_data: `acc_delete_${a._id}` }
    ]),
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
    [{ text: "🗑️ Clear All Groups", callback_data: "groups_clear" }, { text: "🚫 View Blacklist", callback_data: "groups_blacklist" }],
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

// ── AI GROQ HELPER ────────────────────────────────────────────────────────────
async function callGroq(prompt, systemPrompt = "You are a helpful marketing assistant. Return ONLY valid JSON, no markdown, no explanation.") {
  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
    const r = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
      max_tokens: 1500, temperature: 0.9,
    }, { headers: { Authorization: `Bearer ${GROQ_API_KEY}` }, timeout: 15000 });
    const text = r.data.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("Groq error:", e.message);
    return null;
  }
}

async function generateAICampaign(chatId, session) {
  await sendMsg(chatId, "🤖 Generating AI campaign messages...");
  const { aiProduct, aiAudience, aiGoal, aiCampTone } = session.data;
  const result = await callGroq(
    `Create 5 powerful Telegram group marketing messages for:\nProduct/Service: ${aiProduct}\nTarget audience: ${aiAudience}\nGoal: ${aiGoal}\nTone: ${aiCampTone}\n\nRules:\n- Each message under 200 words\n- Include emoji\n- Natural, not spammy\n- End with clear CTA\n- Use spintax {option1|option2} for variety\n\nReturn ONLY a JSON array of 5 strings.`
  );
  if (!result || !result.length) { await sendMsg(chatId, "❌ AI generation failed. Try again."); return; }
  session.data.aiGeneratedMsg = result[0];
  session.data.aiGeneratedVariants = result.slice(1);
  let response = `✨ *AI Generated Campaign Messages:*\n\n`;
  result.forEach((v, i) => { response += `*${i+1}.* ${v}\n\n`; });
  await sendMsg(chatId, response, { reply_markup: { inline_keyboard: [
    [{ text: "🚀 Use for Campaign", callback_data: "ai_camp_use" }],
    [{ text: "💾 Save as Template", callback_data: "ai_camp_save" }],
    [{ text: "🔄 Regenerate", callback_data: "ai_camp_regenerate" }],
    [{ text: "◀️ Back", callback_data: "menu_ai" }],
  ]}});
}

// ── SENTIMENT ALERT SYSTEM ────────────────────────────────────────────────────
const sentimentAlertUsers = new Set(); // track who has alerts on

async function checkSentimentAlerts() {
  try {
    for (const [chatId, session] of Object.entries(sessions)) {
      if (!session.token || !session.data.sentimentAlerts) continue;
      const r = await api("GET", "/api/inbox?limit=20&isRead=false", null, session.token);
      if (!r.ok || !r.data.messages?.length) continue;
      for (const msg of r.data.messages) {
        if (msg.sentiment === "positive" && !session.data.alertedMsgs?.includes(msg._id)) {
          if (!session.data.alertedMsgs) session.data.alertedMsgs = [];
          session.data.alertedMsgs.push(msg._id);
          await sendMsg(chatId, `🔔 *Positive Reply Alert!*\n\n@${msg.fromUsername||"Someone"} replied positively:\n\n_"${(msg.message||"").slice(0,100)}"_\n\nReply now from Inbox! 🎯`, {
            reply_markup: { inline_keyboard: [[{ text: "📬 Open Inbox", callback_data: "menu_inbox" }]] }
          });
          // Mark as read
          await api("PUT", `/api/inbox/${msg._id}/read`, {}, session.token);
        }
      }
    }
  } catch (e) { console.error("Sentiment alert error:", e.message); }
}

// Run sentiment alerts every 2 minutes
setInterval(checkSentimentAlerts, 2 * 60 * 1000);

// ── AI TOOLS DISPLAY ──────────────────────────────────────────────────────────
async function showAITools(chatId, msgId, session) {
  const lang = session.lang || "en";
  const alertsOn = session.data.sentimentAlerts || false;
  const text = `🤖 *AI Tools*\n\nPowerful AI features to supercharge your campaigns:\n\n🎯 *Campaign Creator* — Describe your product, AI writes the perfect message\n✨ *Message Rewriter* — Get 5 variants of any message\n💬 *Reply Templates* — AI suggests replies for your inbox\n🔔 *Sentiment Alerts* — Get notified when someone replies positively\n\nAlerts: ${alertsOn ? "🟢 ON" : "🔴 OFF"}`;
  const kb = { inline_keyboard: [
    [{ text: "🎯 AI Campaign Creator", callback_data: "ai_campaign_creator" }],
    [{ text: "✨ AI Message Rewriter", callback_data: "ai_rewrite" }],
    [{ text: "💬 AI Reply Templates", callback_data: "ai_reply_templates" }],
    [{ text: `${alertsOn ? "🔕 Disable" : "🔔 Enable"} Sentiment Alerts`, callback_data: "alerts_toggle" }],
    [{ text: "◀️ Back", callback_data: "back_main" }],
  ]};
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function createCampaignFinal(chatId, session) {
  session.step = "idle";
  const dMin = session.data.campDelayMin || 1800;
  const dMax = session.data.campDelayMax || 1860;
  const dMins = Math.round(dMin / 60);
  await sendMsg(chatId, `⏳ Creating campaign...\n\nDelay: ~${dMins} minutes between posts`);
  const campR = await api("POST", "/api/campaigns", {
    name: session.data.campName,
    message: session.data.campMessage,
    variants: session.data.campVariants || [],
    groupIds: session.data.campGroups,
    accountIds: session.data.campAccounts,
    postsPerDay: 10,
    delayMin: dMin,
    delayMax: dMax,
    intervalMinutes: 15,
    batchSize: 5,
    useSpintax: session.data.campMessage?.includes("{"),
    useSmartRotation: true,
    skipBlacklisted: true,
  }, session.token);
  if (campR.ok) {
    await sendMsg(chatId, `✅ *Campaign Created!*\n\nName: *${campR.data.name}*\nGroups: ${session.data.campGroups?.length}\nAccounts: ${session.data.campAccounts?.length}\n⏱️ Delay: ~${dMins} mins between posts\n\nGo to Campaigns to start it! 🚀`);
  } else {
    await sendMsg(chatId, `❌ Failed: ${campR.error}`);
  }
  await showCampaigns(chatId, null, session);
}

async function showBlacklist(chatId, msgId, session) {
  const lang = session.lang || "en";
  const r = await api("GET", "/api/blacklist", null, session.token);
  if (!r.ok) { await sendMsg(chatId, `❌ ${r.error}`); return; }
  const list = r.data;
  const details = list.length ? list.slice(0, 8).map(b => `• @${b.username} — ${b.autoAdded ? "auto" : "manual"}`).join("\n") : "Blacklist is empty.";
  const text = `🚫 *Blacklist* (${list.length})\n\n${details}`;
  const rows = list.slice(0, 8).map(b => [{ text: `✅ Remove @${b.username}`, callback_data: `bl_remove_${b._id}` }]);
  rows.push([{ text: "◀️ Back", callback_data: "menu_groups" }]);
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: { inline_keyboard: rows } });
  else await sendMsg(chatId, text, { reply_markup: { inline_keyboard: rows } });
}

async function showGroupFinder(chatId, msgId, session) {
  const lang = session.lang || "en";
  const text = `🔍 *AI Group Finder*\n\nFind relevant Telegram groups by keyword or niche automatically.\n\n_Uses your connected account to search Telegram._`;
  const kb = { inline_keyboard: [
    [{ text: "🔍 Search Groups by Keyword", callback_data: "groupfinder_search" }],
    [{ text: "◀️ Back", callback_data: "back_main" }],
  ]};
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

// ── TIMEZONE DATA ─────────────────────────────────────────────────────────────
const TZ_OFFSETS = {
  "UTC": 0, "EST": -5, "PST": -8, "CST": -6, "MST": -7,
  "GMT": 0, "BST": 1, "CET": 1, "EET": 2, "MSK": 3,
  "GST": 4, "PKT": 5, "IST": 5.5, "BST+6": 6, "ICT": 7,
  "SGT": 8, "JST": 9, "AEST": 10, "NZST": 12,
  "BRT": -3, "ART": -3, "CAT": 2, "EAT": 3, "WAT": 1,
};

const PEAK_HOURS = {
  "crypto":    { hours: "08:00-10:00, 14:00-16:00, 20:00-22:00", best: "20:00" },
  "business":  { hours: "09:00-11:00, 13:00-15:00", best: "10:00" },
  "ecommerce": { hours: "10:00-12:00, 18:00-21:00", best: "19:00" },
  "general":   { hours: "08:00-10:00, 12:00-14:00, 19:00-21:00", best: "19:00" },
  "news":      { hours: "07:00-09:00, 12:00-13:00, 17:00-19:00", best: "08:00" },
};

async function showTimezoneScheduler(chatId, msgId, session) {
  const lang = session.lang || "en";
  const currentTz = session.data.timezone || "UTC";
  const text = `🌍 *Timezone Scheduler*\n\nCurrent timezone: *${currentTz}*\n\nSchedule your campaigns to post at the perfect time in YOUR timezone — no manual UTC conversion needed!\n\n📊 *Peak Hours by Niche:*\n🔐 Crypto: 8-10am, 2-4pm, 8-10pm\n💼 Business: 9-11am, 1-3pm\n🛒 E-commerce: 10am-12pm, 6-9pm\n📰 News/General: 7-9am, 7-9pm`;
  const kb = { inline_keyboard: [
    [{ text: `🌍 Set Timezone (now: ${currentTz})`, callback_data: "tz_pick" }],
    [{ text: "📅 Schedule a Campaign", callback_data: "tz_schedule_camp" }],
    [{ text: "📊 Peak Hour Auto-Post", callback_data: "tz_peak_detect" }],
    [{ text: "◀️ Back", callback_data: "back_main" }],
  ]};
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

async function showMediaCampaign(chatId, msgId, session) {
  const lang = session.lang || "en";
  const text = `🖼️ *Media Campaigns*\n\nSend images, videos or create poll campaigns to boost engagement!\n\n📸 *Photo Campaign* — Image + caption\n🎥 *Video Campaign* — Video + caption\n📊 *Poll Campaign* — Interactive poll message`;
  const kb = { inline_keyboard: [
    [{ text: "📸 Photo Campaign", callback_data: "media_photo" }, { text: "🎥 Video Campaign", callback_data: "media_video" }],
    [{ text: "📊 Poll/Button Campaign", callback_data: "poll_create" }],
    [{ text: "◀️ Back", callback_data: "back_main" }],
  ]};
  if (msgId) await editMsg(chatId, msgId, text, { reply_markup: kb });
  else await sendMsg(chatId, text, { reply_markup: kb });
}

// ── COMMANDS ──────────────────────────────────────────────────────────────────
bot.onText(/\/stats/, async (msg) => { const s = await getSession(msg.chat.id); if (!s.token) return sendMsg(msg.chat.id, "Login first with /start"); await showStats(msg.chat.id, null, s); });
bot.onText(/\/campaigns/, async (msg) => { const s = await getSession(msg.chat.id); if (!s.token) return sendMsg(msg.chat.id, "Login first with /start"); await showCampaigns(msg.chat.id, null, s); });
bot.onText(/\/groups/, async (msg) => { const s = await getSession(msg.chat.id); if (!s.token) return sendMsg(msg.chat.id, "Login first with /start"); await showGroups(msg.chat.id, null, s); });
bot.onText(/\/accounts/, async (msg) => { const s = await getSession(msg.chat.id); if (!s.token) return sendMsg(msg.chat.id, "Login first with /start"); await showAccounts(msg.chat.id, null, s); });
bot.onText(/\/billing/, async (msg) => { const s = await getSession(msg.chat.id); if (!s.token) return sendMsg(msg.chat.id, "Login first with /start"); await showBilling(msg.chat.id, null, s); });
bot.onText(/\/help/, async (msg) => { await showHelp(msg.chat.id, null, await getSession(msg.chat.id)); });

// ── ERRORS ────────────────────────────────────────────────────────────────────
bot.on("polling_error", (e) => console.error("Polling error:", e.message));
bot.on("error", (e) => console.error("Bot error:", e.message));

console.log("🚀 CampaignX Bot started!");
