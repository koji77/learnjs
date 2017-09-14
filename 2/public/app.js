'use strict';
// 名前空間の定義
var learnjs = {};

learing.problemView = function() {
  return $('<div class="problem-view">').text('Comming soon!');
}

learnjs.showView = function(hash) {
  var routes = {
    'problem-view': learnjs.problemView
  };
  var viewFn = routes[hash];
  if (viewFn) {
    $('.view-container').empty().append(viewFn());
  }
}
