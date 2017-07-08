var logic = require("./lib/logic");

console.log("--- order process starts 10 sec later ---");

setInterval(function() {
  logic.trade();
}, 1000 * 10);
