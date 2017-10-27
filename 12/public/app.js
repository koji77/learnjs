'use strict';
// 名前空間の定義
var learnjs = {
  region: 'ap-northeast-1'
};

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

learnjs.profileView = function() {
  var view = learnjs.template('profile-view');
  cognitoAuth.identity.done(function(identity) {
    view.find('.email').text(identity.email);
  });
  return view;
}

learnjs.addProfileLink = function(profile) {
  var link = learnjs.template('profile-link');
  link.find('a').text(profile.email);
  $('.signin-bar').prepend(link);
}

learnjs.problemView = function(data) {
  var problemNumber = parseInt(data, 10);
  var view = learnjs.template('problem-view');
  var problemData = learnjs.problems[problemNumber - 1];
  var resultFlash = view.find('.result');
  var answer = view.find('.answer');  // 教科書になかったが必要

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
      learnjs.saveAnswer(problemNumber, answer.val());
    } else {
      learnjs.flashElement(resultFlash, 'Incorrect!');
    }
    // falseを返すとサーバにフォームが送信されない。
    return false;
  }
  // ナビゲーションバーに「Skip this ploblem」リンクを追加
  if (problemNumber < learnjs.problems.length) {
    var buttonItem = learnjs.template('skip-btn');
    buttonItem.find('a').attr('href', '#problem-' + (problemNumber + 1));

    $('.nav-list').append(buttonItem);
    // 「removingView」イベントをバインド
    view.bind('removingView', function() {
      buttonItem.remove();
    });
  }

  learnjs.fetchAnswer(problemNumber).then(function(data) {
    if(data.Item) {
      answer.val(data.Item.answer);
    }
  });
  // クリックイベント待ちにする。
  view.find('.check-btn').click(checkAnswerClick);
  // 回答数を取得
  learnjs.countAnswers(problemNumber).then(function(data) {
    if(data.Count) {
      view.find('.title').text('Problem #' + problemNumber+ '(Number of answers: ' + data.Count + ')');
    }
  });
  // titleクラスを持つ要素を取得し、inner textを追加
  view.find('.title').text('Problem #' + problemNumber);
  learnjs.applyObject(problemData, view);
  return view;
}

learnjs.showView = function(hash) {
  var routes = {
    '': learnjs.landingView,
    '#': learnjs.landingView,
    '#problem': learnjs.problemView,
    '#profile': learnjs.profileView
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
  // リフレッシュされた時の振る舞い
  learnjs.showView(window.location.hash);
  cognitoAuth.identity.done(learnjs.addProfileLink);
  cognitoAuth.signinEventEmitter.on('signinState', signinState => {
    if (signinState) {
      $('.cognito-auth-signin-open').text('Sign out');
    } else {
      $('.cognito-auth-signin-open').text('Sign in');
      $('.signin-bar').find('.profile-link').remove();
    }
  });
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

learnjs.sendDbRequest = function(req, retry) {
  var promise = new $.Deferred();
  req.on('error', function(error) {
    if(error.code === "CredentialsError") {
      cognitoAuth.identity.then(function(identity) {
        return identity.refresh().then(function() {
          return retry();
        }, function() {
          promise.reject(resp);
        });
      });
    } else if(error.code === "AccessDeniedException") {
      console.log('AWS IAM Role Authentication Error');
      promise.reject(error);
    } else {
      promise.reject(error);
    }
  });
  req.on('success', function(resp) {
    promise.resolve(resp.data);
  });
  /*
  req.on('complete', function(resp) {
    console.log(resp);
  })
  */
  req.send();
  return promise;
}

learnjs.saveAnswer = function(problemId, answer) {
  return cognitoAuth.identity.then(function(identity) {
    var db = new AWS.DynamoDB.DocumentClient({region: learnjs.region});
    var item = {
      TableName: 'learnjs',
      Item: {
        userId: identity.id,
        problemId: problemId,
        answer: answer
      }
    };
    return learnjs.sendDbRequest(db.put(item), function() {
      return learnjs.saveAnswer(problemId, answer);
    });
  });
}

learnjs.fetchAnswer = function(problemId) {
  return cognitoAuth.identity.then(function(identity) {
    var db = new AWS.DynamoDB.DocumentClient({region: learnjs.region});
    var item = {
      TableName: 'learnjs',
      Key: {
        userId: identity.id,
        problemId: problemId
      }
    };
    return learnjs.sendDbRequest(db.get(item), function() {
      return learnjs.fetchAnswer(problemId);
    });
  });
}

learnjs.countAnswers = function(problemId) {
  return cognitoAuth.identity.then(function(identity) {
    var db = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: 'learnjs',
      Select: 'COUNT',
      FilterExpression: 'problemId = :problemId',
      ExpressionAttributeValues: {':problemId': problemId}
    };
    return learnjs.sendDbRequest(db.scan(params), function() {
      return learnjs.countAnswers(problemId);
    });
  });
}
