'use strict';
// 名前空間の定義
var learnjs = {};

learnjs.problems = [
  {
    description: "What is truth ?",
    code: "function problem() { return __; }"
  },
  {
    description: "Simple Math",
    code: "function problem() { return 42 === 6 * __; }"
  }
]

learnjs.buildCorrectFlash = function(problemNumber) {
  var correctFlash = learnjs.template('correct-flash');
  var link = correctFlash.find('a');
  if (problemNumber < learnjs.problems.length) {
    link.attr('href', '#problem-' + (problemNumber + 1));
  } else {
    link.attr('href', '#');
    link.text("You're finished!");
  }
  return correctFlash;
}

learnjs.applyObject = function(obj, elem) {
  for (var key in obj) {
    elem.find('[data-name="' + key + '"]').text(obj[key]);
  }
}

learnjs.landingView = function() {
  return learnjs.template('landing-view');
}

learnjs.problemView = function(data) {
  var problemNumber = parseInt(data, 10);
  var view = learnjs.template('problem-view');
  var problemData = learnjs.problems[problemNumber - 1];
  var resultFlash = view.find('.result');

  function checkAnswer() {
    var answer = view.find('.answer').val();
    // 関数の書き換えおよび実行
    var test = problemData.code.replace('__', answer) + '; problem();';
    return eval(test);
  }
  // クリックハンドラ
  function checkAnswerClick() {
    if(checkAnswer()) {
      learnjs.flashElement(resultFlash, learnjs.buildCorrectFlash(problemNumber));
    } else {
      learnjs.flashElement(resultFlash, 'Incorrect!');
    }
    // falseを返すとサーバにフォームが送信されない。
    return false;
  }
  if (problemNumber < learnjs.problems.length) {
    var buttonItem = learnjs.template('skip-btn');
    buttonItem.find('a').attr('href', '#problem-' + (problemNumber + 1));
    $('.nav-list').append(buttonItem);
    // 「removingView」イベントをバインド
    view.bind('removingView', function() {
      buttonItem.remove();
    });
  }
  // クリックイベント待ちにする。
  view.find('.check-btn').click(checkAnswerClick);
  // titleクラスを持つ要素を取得し、inner textを追加
  view.find('.title').text('Problem #' + problemNumber);
  learnjs.applyObject(problemData, view);
  return view;
}

learnjs.showView = function(hash) {
  var routes = {
    '': learnjs.landingView,
    '#': learnjs.landingView,
    '#problem': learnjs.problemView
  };
  var hashParts = hash.split('-');
  var viewFn = routes[hashParts[0]];  //「-」で分割できない場合はhashで渡された値がそのままhashParts[0]になる。
  if (viewFn) {
    // Viewが置き換えられる前に削除されようとしていることを既存Viewに知らせるイベントをトリガする。
    learnjs.triggerEvent('removingView', []);
    // View Countainerの中身を置き換える。
    $('.view-container').empty().append(viewFn(hashParts[1]));
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

learnjs.flashElement = function(elem, content) {
  elem.fadeOut('fast', function() {
    elem.html(content);
    elem.fadeIn();
  });
}

// テンプレートをクローン
learnjs.template = function(name) {
  return $('.templates .' + name).clone();
}

learnjs.triggerEvent = function(name, args) {
  // 「>*」全ての子要素にイベントを伝搬
  $('.view-container>*').trigger(name, args);
}
