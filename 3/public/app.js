'use strict';
// 名前空間の定義
var learnjs = {};

learnjs.problemView = function(problemNumber) {
  var title = 'Problem #' + problemNumber + ' Coming soon!';
  return $('<div class="problem-view">').text(title);
}

learnjs.showView = function(hash) {
  // ハッシュが定義されているか判定
  if(hash) {
    var routes = {
      '#problem': learnjs.problemView
    };
    var hashParts = hash.split('-');
    var viewFn = routes[hashParts[0]];
    if (viewFn) {
      $('.view-container').empty().append(viewFn(hashParts[1]));
    }
  }
}

learnjs.appOnReady = function() {
  // ページがロードされた後にハッシュ変更イベント待ち状態にする。
  window.onhashchange = function() {
    // window.location.hash: URLの「#」記号の後の部分を取得、もしくは、設定するプロパティ
    learnjs.showView(window.location.hash);
  }
  learnjs.showView(window.location.hash);
}
