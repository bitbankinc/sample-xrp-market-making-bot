var bitbank = require("node-bitbankcc");
var async = require("async");
var cache = require("./cache").cache;

// *****************
// 設定 / Settings
// *****************
var api = bitbank.privateApi("your api key", "your private key");
var orderAmout = 100; // 注文数量 / order amount
var maxHoldXrp = 10000.0; // XRPの最大保有量 / Max BTC holding amount
var spreadPercentage = 0.01; // スプレッド設定値 1% / Spread
// 例) 1XRP=50円の場合、売り注文と買い注文を中央値から0.5円離した価格に提示する
var pair = "xrp_jpy";

module.exports.trade = function() {
  console.log("--- prepare to trade ---");

  async.waterfall([
    function(callback) {
      // アセット取得
      api.getAsset().then(function(res){
        callback(null, res);
      });
    },
    function(assets, callback) {
      var xrpAvailable = Number(assets.assets.filter(function(element, index, array) {
        return element.asset == "xrp";
      })[0].free_amount);
      var jpyAvailable = Number(assets.assets.filter(function(element, index, array) {
        return element.asset == "jpy";
      })[0].free_amount);

      // アクティブオーダー取得
      api.getActiveOrders(pair, {}).then(function(res){
        callback(null, xrpAvailable, jpyAvailable, res);
      });
    },
    function(xrpAvailable, jpyAvailable, activeOrders, callback) {
      //console.log(activeOrders);
      var ids = activeOrders.orders.map(function(element, index, array) {
        return element.order_id;
      });
      // 全てキャンセル
      if(ids.length > 0) {
        console.log("--- cancel all active orders ---");
        api.cancelOrders(pair, ids).then(function(res) {
          console.log(res);
          callback(null, xrpAvailable, jpyAvailable);
        });
      } else {
        callback(null, xrpAvailable, jpyAvailable);
      }
    },
    function(xrpAvailable, jpyAvailable, callback) {
      // 新規注文
      var bestBid = parseInt(cache.get("best_bid"));
      var bestAsk = parseInt(cache.get("best_ask"));
      var spread = (bestBid + bestAsk) * 0.5 * spreadPercentage;
      var buyPrice = parseInt(bestBid - spread);
      var sellPrice = parseInt(bestAsk + spread);

      if(xrpAvailable > maxHoldXrp) {
        callback("BTC amount is over the threthold.", null);
      }

      // 売り注文
      if(xrpAvailable > orderAmout) {
        console.log("--- sell order --- ", sellPrice, orderAmout);
        api.order(pair, sellPrice, orderAmout, "sell", "limit").then(function(orderRes) {
          // 買い注文
          if(jpyAvailable > buyPrice * orderAmout) {
            console.log("--- buy order --- ", buyPrice, orderAmout);
            api.order(pair, buyPrice, orderAmout, "buy", "limit").then(function(orderRes) {
              //console.log(orderRes);
            });
          }
          //console.log(orderRes);
        });
      }
    }
  ],
  function(err, results) {
    if(err){
      console.log("[ERROR] " + err);
    }
  });

};
