'use strict';
// 名前空間の定義
var learnjs = {};
learnjs.showView = function(hash) {
  var problemView = $('<div class="problem-view">').text('Comming soon!');
  $('.view-container').empty().append(problemView);
}
