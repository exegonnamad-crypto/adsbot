// Start backend server first, then bot
require("./server.js");

// Small delay to let server initialize before bot starts
setTimeout(() => {
  require("./bot.js");
}, 2000);
