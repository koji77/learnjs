'use strict';
// 名前空間の定義
var learnjs = {
  // vendor.jsはリージョンがus-east-1でないと動作しない
  poolId: 'us-east-1:e5ee7425-b8cd-4c9b-9cfe-fcc223610529'
};

/*
jQuery.Deferredによる並列処理の直列化
1. new $.Deferred() で Deferred のオブジェクトを生成
2. 非同期処理が完了した時点で、生成したDeferredオブジェクトのresolve()メソッドを実行
3. Defferedオブジェクトのpromise()メソッドを実行
4. promise()メソッドの戻り値(promise オブジェクト)のthen()メソッドに非同期処理の後に実行したい処理を渡す。

```
var d = new $.Deferred();

async(function() {
    console.log('async');
    // 非同期処理が完了した時点で、生成したDeferredオブジェクトのresolve()メソッドを実行
    d.resolve();
});

d.promise()
.then(function() {
    console.log('hoge');
})
.then(function() {
    // 非同期処理の後に実行したい処理
    console.log('fuga');
});

// 指定した関数を 1 秒後に実行
function async(f) {
    setTimeout(f, 1000);
}
```

Promiseオブジェクト
オブジェクトの状態を返す(.state) => (pending: 処理が未完了 / resolved: 処理が成功 / rejected: 処理が失敗)
状態がresolvedになった時に実行されるコールバック(.done)、resolve()の引数がdeferred.doneメソッドで設定したfunctionの引数となる。
状態がrejectedになった時に実行されるコールバック(.fail)、rejected()の引数がdeferred.failメソッドで設定したfunctionの引数となる。

*/

learnjs.identity = new $.Deferred();

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
  learnjs.identity.done(function(identity) {
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
  learnjs.showView(window.location.hash);
  learnjs.identity.done(learnjs.addProfileLink);
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

learnjs.awsRefresh = function() {
  var deferred = new $.Deferred();
  AWS.config.credentials.refresh(function(err) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(AWS.config.credentials.identityId);
    }
  });
  return deferred.promise();
}

learnjs.sendDbRequest = function(req, retry) {
  var promise = new $Deferred();
  req.on('error', function(error) {
    if(error.code === "CredentialsError") {
      learnjs.identity.then(function(identity) {
        return identity.refresh().then(function() {
          return retry();
        }, function() {
          promise.reject(resp);
        });
      });
    } else {
      promise.reject(error);
    }
  });
  req.on('success', function(resp) {
    promise.resolve(resp.data);
  });
  req.send();
  return promise;
}

learnjs.saveAnswer = function(problemId, answer) {
  return learnjs.identity.then(function(identity) {
    var db = new AWS.DynamoDB.DocumentClient();
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

// Google+ へのログインでは特定の名前空間に配置することができない。
function googleSignIn(googleUser) {
  // AWS認証情報をリクエスト
  // vendor.jsはリージョンがus-east-1でないと動作しない
  var id_token = googleUser.getAuthResponse().id_token;
  AWS.config.update({
    region: 'us-east-1',
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: learnjs.poolId,
      Logins: {
        'accounts.google.com': id_token
      }
    })
  })
  // 期限切れの場合にアイデンティティトークンを更新してAWSの認証情報を更新する。
  function refresh() {
    return gapi.auth2.getAuthInstance().signIn({
        prompt: 'login'
      }).then(function(userUpdate) {
      var creds = AWS.config.credentials;
      var newToken = userUpdate.getAuthResponse().id_token;
      creds.params.Logins['accounts.google.com'] = newToken;
      return learnjs.awsRefresh();
    });
  }
  learnjs.awsRefresh().then(function(id) {
    learnjs.identity.resolve({
      id: id,
      email: googleUser.getBasicProfile().getEmail(),
      refresh: refresh
    });
  });
}
