'use strict';
// 名前空間の定義
var learnjs = {
  region: 'ap-northeast-1',
  IdentityPoolId: 'ap-northeast-1:54fd1dbc-e565-463b-840c-e9627fa377f9',
  userPoolId: 'ap-northeast-1_AqB95iyEm',
  clientId: '62kbk9vh4a9ukhg43rdt78cso4',
  expirationTime: 7776000000
};

learnjs.identity = new $.Deferred();

learnjs.isSignined = false;
learnjs.previousHashTag = '#';

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

learnjs.signupView = function() {
  var view = learnjs.template('signup-view');
  var messageFlash = view.find('.signup-error-message');
  messageFlash.css({'color': '#fc2e8b'});
  // クリックハンドラ
  function signupClick() {
    // 全ての入力部品のスタイルを元に戻す。
    toOriginalView(view.find('.signup-name'));
    toOriginalView(view.find('.signup-email'));
    toOriginalView(view.find('.signup-passwd'));
    toOriginalView(view.find('.signup-passwd2'));
    // 2箇所のパスワード入力の一致確認
    if (view.find('.signup-passwd').val() != view.find('.signup-passwd2').val()) {
      toInvalidInputView(view.find('.signup-passwd'));
      toInvalidInputView(view.find('.signup-passwd2'));
      learnjs.flashElement(messageFlash, 'Passwords do not match');
      return;
    }
    // サインアップに必要なデータの準備
    var userPool = learnjs.getUserPool();
    // ユーザ属性の追加(メールアドレスと更新日時)
    var attributeList = [];
    var dataEmail = {
      Name: 'email',
      Value: view.find('.signup-email').val()
    };
    var attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);
    var edt = new Date().getTime();
    var dataUpdateAt = {
      Name: 'updated_at',
      Value: edt.toString()
    };
    var attributeUpdateAt = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataUpdateAt);
    attributeList.push(attributeEmail);
    attributeList.push(attributeUpdateAt);
    // サインアップ処理
    userPool.signUp(view.find('.signup-name').val(), view.find('.signup-passwd').val(), attributeList, null, function(error, result) {
      if (error) {
        if (error.message.match(/email/)) {
          toInvalidInputView(view.find('.signup-email'));
        }
        if (error.message.match(/Password/)) {
          toInvalidInputView(view.find('.signup-passwd'));
          toInvalidInputView(view.find('.signup-passwd2'));
        }
        if (error.message.match(/username/) || error.name == 'UsernameExistsException') {
          toInvalidInputView(view.find('.signup-name'));
        }
        learnjs.flashElement(messageFlash, error.message);
        return;
      }
      // console.log('user name is ' + result.user.getUsername());
      // 成功したらアクティベーションビューの表示
      var url = '#activation-' + learnjs.toBase64(result.user.getUsername());
      history.replaceState('', '', url);
      return learnjs.showView(url);
    });
    // falseを返すとサーバにフォームが送信されない。
    return false;
  }
  // クリックイベント待ちにする。
  view.find('.signup-btn').click(signupClick);

  return view;
}

learnjs.signinView = function() {
  // サインアウト処理
  if (learnjs.getSigninState()) {
    if(window.confirm('Do you want to signout ?')) {
      var userPool = learnjs.getUserPool();
      var cognitoUser = userPool.getCurrentUser();
      if (cognitoUser != null) {
        cognitoUser.signOut();  // このアプリケーションからサインアウト
        // cognitoUser.globalSignOut();  // グローバルにサインアウト
      }
      // ブラウザによる強制ログアウトの場合は、カレントユーザーが取得できない。
      learnjs.identity = new $.Deferred();
      $('.signin-bar').find('.profile-link').remove();
      learnjs.setSigninState(false);
      // TOP画面へ
      history.replaceState('', '', '#');
      return learnjs.showView('#');
    } else {
      // サインイン画面の前に表示されていたビューに戻る
      history.replaceState('', '', learnjs.previousHashTag);
      return learnjs.showView(learnjs.previousHashTag);
    }
  }
  // サインイン処理
  var view = learnjs.template('signin-view');
  var messageFlash = view.find('.signin-error-message');
  messageFlash.css({'color': '#fc2e8b'});
  // クリックハンドラ
  function signinClick() {
    // 全ての入力部品のスタイルを元に戻す。
    toOriginalView(view.find('.signin-name'));
    toOriginalView(view.find('.signin-passwd'));
    // サインインに必要なデータの準備
    var userPool = learnjs.getUserPool();
    var authenticationData = {
        Username: view.find('.signin-name').val(),
        Password: view.find('.signin-passwd').val()
    };
    var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);
    var userData = {
      Username: view.find('.signin-name').val(),
      Pool: userPool
    };
    var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: function(result) {
        learnjs.getUserAttributes(cognitoUser).done(function(userAttributes) {
          var updated_at = learnjs.getUserAttributeValue(userAttributes, 'updated_at');
          var lastUpdateTime = parseInt(updated_at, 10);
          if (!isNaN(lastUpdateTime)) {
            var edt = new Date().getTime();
            if (edt - lastUpdateTime > learnjs.expirationTime) {
              // パスワード更新画面へ
              learnjs.changeView(learnjs.passwordUpdateView(cognitoUser));
            }
          } else {
            learnjs.flashElement(messageFlash, 'An unexpected error has occurred.');
            // falseを返すとサーバにフォームが送信されない。
            return false;
          }
          // トークンを登録
          var id_token = result.getIdToken().getJwtToken();
          var email = learnjs.getUserAttributeValue(userAttributes, 'email');
          learnjs.refreshAWSConfig(id_token, email);
        });
        // サインインの確認が終わってから表示を変更する。
        learnjs.identity.done(function(identity) {
          learnjs.setSigninState(true);
        });
        history.replaceState('', '', '#');
        return learnjs.showView('#');
      },
      onFailure: function(error) {
        if (error.message.match(/username/) || error.message.match(/User/) || error.message.match(/USERNAME/)) {
          toInvalidInputView(view.find('.signin-name'));
        }
        if (error.message.match(/password/)) {
          toInvalidInputView(view.find('.signin-passwd'));
        }
        learnjs.flashElement(messageFlash, error.message);
      },
    });
    // falseを返すとサーバにフォームが送信されない。
    return false;
  }
  // クリックイベント待ちにする。
  view.find('.signin-btn').click(signinClick);

  return view;
}

learnjs.activationView = function(username) {
  var view = learnjs.template('activation-view');
  var messageFlash = view.find('.activation-error-message');
  messageFlash.css({'color': '#fc2e8b'});
  // クリックハンドラ
  function activationClick() {
    // 全ての入力部品のスタイルを元に戻す。
    toOriginalView(view.find('.activation-key'));
    // アクティベーションに必要なデータの準備
    var userPool = learnjs.getUserPool();
    var userData = {
      Username : learnjs.toText(username),
      Pool : userPool
    };
    var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
    cognitoUser.confirmRegistration(view.find('.activation-key').val(), true, function(error, result) {
      if (error) {
        toInvalidInputView(view.find('.activation-key'));
        learnjs.flashElement(messageFlash, error.message);
        return;
      }
      history.replaceState('', '', '#signin');
      return learnjs.showView('#signin');
    });
    // falseを返すとサーバにフォームが送信されない。
    return false;
  }
  // クリックイベント待ちにする。
  view.find('.activation-btn').click(activationClick);

  return view;
}

learnjs.passwordResetView = function(username) {
  var view = learnjs.template('password-reset-view');
  var messageFlash = view.find('.password-reset-error-message');
  messageFlash.css({'color': '#fc2e8b'});
  // クリックハンドラ
  function passwordResetClick() {
    // 全ての入力部品のスタイルを元に戻す。
    toOriginalView(view.find('.password-reset-name'));
    // サインインに必要なデータの準備
    var userPool = learnjs.getUserPool();
    var userData = {
      Username: view.find('.password-reset-name').val(),
      Pool: userPool
    };
    var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
    // パスワード初期化画面へ
    learnjs.changeView(learnjs.passwordInitializeView(cognitoUser));
    // falseを返すとサーバにフォームが送信されない。
    return false;
  }
  // クリックイベント待ちにする。
  view.find('.password-reset-btn').click(passwordResetClick);

  return view;
}

learnjs.passwordUpdateView = function(cognitoUser) {
  var view = learnjs.template('password-update-view');
  var messageFlash = view.find('.password-update-error-message');
  messageFlash.css({'color': '#fc2e8b'});
  // クリックハンドラ
  function passwordUpdateClick() {
    // 全ての入力部品のスタイルを元に戻す。
    toOriginalView(view.find('.password-update-current'));
    toOriginalView(view.find('.password-update-new'));
    toOriginalView(view.find('.password-update-new2'));
    // 2箇所のパスワード入力の一致確認
    if (view.find('.password-update-new').val() != view.find('.password-update-new2').val()) {
      toInvalidInputView(view.find('.password-update-new'));
      toInvalidInputView(view.find('.password-update-new2'));
      learnjs.flashElement(messageFlash, 'Passwords do not match');
      return;
    }
    cognitoUser.changePassword(view.find('.password-update-current').val(), view.find('.password-update-new').val(), function(error, result) {
      if (error) {
        if (error.message.match(/previousPassword/)) {
          toInvalidInputView(view.find('.password-update-current'));
        }
        if (error.message.match(/proposedPassword/)) {
          toInvalidInputView(view.find('.password-update-new'));
          toInvalidInputView(view.find('.password-update-new2'));
        }
        learnjs.flashElement(messageFlash, error.message);
        return;
      }
      history.replaceState('', '', '#');
      return learnjs.showView('#');
    });
    // falseを返すとサーバにフォームが送信されない。
    return false;
  }
  // リセットボタンのクリックハンドラ
  function passwordUpdateResetClick() {
    // 全ての入力部品のスタイルを元に戻す。
    toOriginalView(view.find('.password-update-current'));
    toOriginalView(view.find('.password-update-new'));
    toOriginalView(view.find('.password-update-new2'));
    // 入力をクリアする。
    view.find('.password-update-current').val('');
    view.find('.password-update-new').val('');
    view.find('.password-update-new2').val('');
    // falseを返すとサーバにフォームが送信されない。
    return false;
  }
  // クリックイベント待ちにする。
  view.find('.password-update-btn').click(passwordUpdateClick);
  view.find('.password-update-reset-btn').click(passwordUpdateResetClick);

  return view;
}

learnjs.passwordInitializeView = function(cognitoUser) {
  var view = learnjs.template('password-initialize-view');
  var messageFlash = view.find('.password-initialize-error-message');
  messageFlash.css({'color': '#fc2e8b'});
  var eventEmitter = new EventEmitter();
  // クリックハンドラ
  function passwordInitializeClick() {
    // 全ての入力部品のスタイルを元に戻す。
    toOriginalView(view.find('.password-initialize-verification-code'));
    toOriginalView(view.find('.password-initialize-new'));
    toOriginalView(view.find('.password-initialize-new2'));
    // 2箇所のパスワード入力の一致確認
    if (view.find('.password-initialize-new').val() != view.find('.password-initialize-new2').val()) {
      toInvalidInputView(view.find('.password-initialize-new'));
      toInvalidInputView(view.find('.password-initialize-new2'));
      learnjs.flashElement(messageFlash, 'Passwords do not match');
      return false;
    } else {
      eventEmitter.emit("password-initialize");
    }
    // falseを返すとサーバにフォームが送信されない。
    return false;
  }
  // リセットボタンのクリックハンドラ
  function passwordInitializeResetClick() {
    // 全ての入力部品のスタイルを元に戻す。
    toOriginalView(view.find('.password-initialize-verification-code'));
    toOriginalView(view.find('.password-initialize-new'));
    toOriginalView(view.find('.password-initialize-new2'));
    // 入力をクリアする。
    view.find('.password-initialize-verification-code').val('');
    view.find('.password-initialize-new').val('');
    view.find('.password-initialize-new2').val('');
    // falseを返すとサーバにフォームが送信されない。
    return false;
  }
  // クリックイベント待ちにする。
  view.find('.password-initialize-btn').click(passwordInitializeClick);
  view.find('.password-Initialize-reset-btn').click(passwordInitializeResetClick);
  // パスワードを忘れた時の処理(イベント待ち)
  cognitoUser.forgotPassword({
    onSuccess: function(result) {
      history.replaceState('', '', '#signin');
      return learnjs.showView('#signin');
    },
    onFailure: function(error) {
      if (error.message.match(/verification/) && error.message.match(/code/)) {
        toInvalidInputView(view.find('.password-initialize-verification-code'));
      }
      if (error.message.match(/password/)) {
        toInvalidInputView(view.find('.password-initialize-new'));
        toInvalidInputView(view.find('.password-initialize-new2'));
      }
      learnjs.flashElement(messageFlash, error.message);
    },
    inputVerificationCode() {
      eventEmitter.on("password-initialize", () => {
        cognitoUser.confirmPassword(view.find('.password-initialize-verification-code').val(), view.find('.password-initialize-new').val(), this);
      });
    }
  });
  return view;
}

learnjs.getUserInfoFromSession = function() {
  // ローカルストレージからのユーザ情報取得に必要なデータの準備
  var userPool = learnjs.getUserPool();
  var cognitoUser = userPool.getCurrentUser();
  if (cognitoUser != null) {
    cognitoUser.getSession(function(error, session) {
      if (error) {
        alert(error);
        return false;
      }
      learnjs.getUserAttributes(cognitoUser).done(function(userAttributes) {
        // トークンを登録
        var id_token = session.getIdToken().getJwtToken();
        var email = learnjs.getUserAttributeValue(userAttributes, 'email');
        learnjs.refreshAWSConfig(id_token, email);
        // サインインの確認が終わってから表示を変更する。
        learnjs.identity.done(function(identity) {
          learnjs.setSigninState(true);
        });
      });
    });
    return true;
  }
  return false;
}

learnjs.showView = function(hash) {
  var routes = {
    '': learnjs.landingView,
    '#': learnjs.landingView,
    '#problem': learnjs.problemView,
    '#profile': learnjs.profileView,
    '#signup': learnjs.signupView,
    '#signin': learnjs.signinView,
    '#activation': learnjs.activationView,
    '#password_reset': learnjs.passwordResetView
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

learnjs.changeView = function(view) {
  // Viewが置き換えられる前に削除されようとしていることを既存Viewに知らせるイベントをトリガする。
  learnjs.triggerEvent('removingView', []);
  // View Countainerの中身を置き換える。
  $('.view-container').empty().append(view);
}

learnjs.appOnReady = function() {
  // ページがロードされた後にハッシュ変更イベント待ち状態にする。
  window.onhashchange = function() {
    // window.location.hash: URLの「#」記号の後の部分を取得、もしくは、設定するプロパティ
    learnjs.showView(window.location.hash);
    // 変更後のハッシュタグをキャッシュ
    learnjs.previousHashTag = window.location.hash;
  }
  // リフレッシュされた時の振る舞い
  learnjs.showView(window.location.hash);
  learnjs.getUserInfoFromSession();
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

learnjs.sendDbRequest = function(req, retry) {
  var promise = new $.Deferred();
  req.on('error', function(error) {
    if(error.code === "CredentialsError") {
      learnjs.identity.then(function(identity) {
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
  return learnjs.identity.then(function(identity) {
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
  return learnjs.identity.then(function(identity) {
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
  return learnjs.identity.then(function(identity) {
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

learnjs.getUserPool = function() {
  AWS.config.update({
    region: learnjs.region,
    credentials: new AWS.CognitoIdentityCredentials({
      region: learnjs.region,
      IdentityPoolId: learnjs.IdentityPoolId
    })
  });

  AWSCognito.config.region = learnjs.region,
  AWSCognito.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: learnjs.IdentityPoolId
  });

  var poolData = {
    UserPoolId: learnjs.userPoolId,
    ClientId: learnjs.clientId
  };

  return new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);
}

// ユーザ属性の取得
learnjs.getUserAttributes = function(cognitoUser) {
  var deferred = new $.Deferred();
  cognitoUser.getUserAttributes(function(error, result) {
    if (error) {
      deferred.reject(error);
    }
    deferred.resolve(result);
  });
  return deferred.promise();
}

// ユーザ属性の値取得
learnjs.getUserAttributeValue = function(userAttributes, attr) {
  var ret = '';
  for (var i = 0; i < userAttributes.length; i++) {
    // console.log('attribute ' + userAttributes[i].getName() + ' has value ' + userAttributes[i].getValue());
    if (userAttributes[i].getName() == attr) {
      ret = userAttributes[i].getValue();
      break;
    }
  }
  return ret;
}

learnjs.refreshAWSConfig = function(id_token, email) {
  var loginTo = 'cognito-idp.' + learnjs.region + '.amazonaws.com/' + learnjs.userPoolId;
  AWS.config.update({
    region: learnjs.region,
    credentials: new AWS.CognitoIdentityCredentials({
      region: learnjs.region,
      IdentityPoolId: learnjs.IdentityPoolId,
      Logins: {
        [loginTo]: id_token
      }
    })
  });
  // 期限切れの場合にアイデンティティトークンを更新してAWSの認証情報を更新する。
  function refresh() {
    // AWSの場合の処理は調査中
    return learnjs.awsRefresh();
  }
  learnjs.awsRefresh().then(function(id) {
    learnjs.identity.resolve({
      id: id,
      email: email,
      refresh: refresh
    });
  });
}

learnjs.toBase64 = function(text) {
  return window.btoa(unescape(encodeURIComponent(text)));
}

learnjs.toText = function(code) {
  return decodeURIComponent(escape(window.atob(code)));
}

learnjs.setSigninState = function(flag) {
  if (flag) {
    learnjs.isSignined = true;
    $('.signin_link').text('Sign out');
  } else {
    learnjs.isSignined = false;
    $('.signin_link').text('Sign in');
  }
  return;
}

learnjs.getSigninState = function() {
  return learnjs.isSignined;
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

function toInvalidInputView(view) {
  view.css({'color': '#fc2e8b', 'border': '2px solid #fc2e8b', 'background-color': '#ffe4e1'});
  return true;
}

function toOriginalView(view) {
  view.css({'color': '', 'border': '', 'background-color': ''});
  return true;
}

// Google+ へのログインでは特定の名前空間に配置することができない。
function googleSignIn(googleUser) {
  // AWS認証情報をリクエスト
  var id_token = googleUser.getAuthResponse().id_token;
  AWS.config.update({
    region: learnjs.region,
    credentials: new AWS.CognitoIdentityCredentials({
      region: learnjs.region,
      IdentityPoolId: learnjs.IdentityPoolId,
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
