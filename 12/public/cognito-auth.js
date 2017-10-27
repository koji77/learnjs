'use strict';
// 名前空間の定義
var cognitoAuth = {
  region: 'ap-northeast-1',
  IdentityPoolId: 'ap-northeast-1:54fd1dbc-e565-463b-840c-e9627fa377f9',
  userPoolId: 'ap-northeast-1_AqB95iyEm',
  clientId: '62kbk9vh4a9ukhg43rdt78cso4',
  expirationTime: 7776000000
}

cognitoAuth.signinEventEmitter = new EventEmitter();
cognitoAuth.identity = new $.Deferred();
cognitoAuth.isSignined = false;

// サインアップ画面用クリックハンドラ
cognitoAuth.openSignupPopup = function() {
  return cognitoAuth.openPopup($('.cognito-auth-signup-open').attr('href'), '.cognito-auth-signup-btn', cognitoAuth.signup, '.cognito-auth-close-btn', cognitoAuth.closeSignupPopup, '.cognito-auth-signup-reset-btn', cognitoAuth.resetSignup);
}

cognitoAuth.closeSignupPopup = function() {
  return cognitoAuth.close('.cognito-auth-signup-btn', '.cognito-auth-signup-reset-btn');
}

cognitoAuth.signup = function() {
  var view = $('#cognito-auth-signup-popup');
  var messageFlash = view.find('.cognito-auth-signup-error-message');
  messageFlash.css({'color': '#fc2e8b'});
  // 全ての入力部品のスタイルを元に戻す。
  cognitoAuth.toOriginalView(view.find('.cognito-auth-signup-name'));
  cognitoAuth.toOriginalView(view.find('.cognito-auth-signup-email'));
  cognitoAuth.toOriginalView(view.find('.cognito-auth-signup-passwd'));
  cognitoAuth.toOriginalView(view.find('.cognito-auth-signup-passwd2'));
  // 2箇所のパスワード入力の一致確認
  if (view.find('.cognito-auth-signup-passwd').val() != view.find('.cognito-auth-signup-passwd2').val()) {
    cognitoAuth.toInvalidInputView(view.find('.cognito-auth-signup-passwd'));
    cognitoAuth.toInvalidInputView(view.find('.cognito-auth-signup-passwd2'));
    cognitoAuth.flashElement(messageFlash, 'Passwords do not match');
    return false;
  }
  // サインアップに必要なデータの準備
  var userPool = cognitoAuth.getUserPool();
  // ユーザ属性の追加(メールアドレスと更新日時)
  var attributeList = [];
  var dataEmail = {
    Name: 'email',
    Value: view.find('.cognito-auth-signup-email').val()
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
  userPool.signUp(view.find('.cognito-auth-signup-name').val(), view.find('.cognito-auth-signup-passwd').val(), attributeList, null, function(error, result) {
    if (error) {
      if (error.message.match(/email/)) {
        toInvalidInputView(view.find('.cognito-auth-signup-email'));
      }
      if (error.message.match(/Password/)) {
        toInvalidInputView(view.find('.cognito-auth-signup-passwd'));
        toInvalidInputView(view.find('.cognito-auth-signup-passwd2'));
      }
      if (error.message.match(/username/) || error.name == 'UsernameExistsException') {
        toInvalidInputView(view.find('.cognito-auth-signup-name'));
      }
      cognitoAuth.flashElement(messageFlash, error.message);
      return false;
    }
    // console.log('user name is ' + result.user.getUsername());
    cognitoAuth.closeSignupPopup();
    cognitoAuth.openActivationPopup(result.user.getUsername());
  });
  return false;
}

cognitoAuth.resetSignup = function() {
  var view = $('#cognito-auth-signup-popup');
  // 全ての入力部品のスタイルを元に戻す。
  cognitoAuth.toOriginalView(view.find('.cognito-auth-signup-name'));
  cognitoAuth.toOriginalView(view.find('.cognito-auth-signup-email'));
  cognitoAuth.toOriginalView(view.find('.cognito-auth-signup-passwd'));
  cognitoAuth.toOriginalView(view.find('.cognito-auth-signup-passwd2'));
  // 入力をクリアする。
  view.find('.cognito-auth-signup-name').val('');
  view.find('.cognito-auth-signup-email').val('');
  view.find('.cognito-auth-signup-passwd').val('');
  view.find('.cognito-auth-signup-passwd2').val('');
  view.find('.cognito-auth-signup-error-message').text('');

  return false;
}

// アクティベーション画面用クリックハンドラ
cognitoAuth.openActivationPopup = function(username) {
  // bind()で関数をコールすることなく実引数をあらかじめ与えておくことができる。
  return cognitoAuth.openPopup('#cognito-auth-activation-popup', '.cognito-auth-activation-btn', cognitoAuth.activation.bind(this, username));
}

cognitoAuth.closeActivationPopup = function() {
  return cognitoAuth.close('.cognito-auth-activation-btn');
}

cognitoAuth.activation = function(username) {
  var view = $('#cognito-auth-activation-popup');
  var messageFlash = view.find('.cognito-auth-activation-error-message');
  messageFlash.css({'color': '#fc2e8b'});
  // 全ての入力部品のスタイルを元に戻す。
  cognitoAuth.toOriginalView(view.find('.cognito-auth-activation-key'));
  // アクティベーションに必要なデータの準備
  var userPool = cognitoAuth.getUserPool();
  var userData = {
    Username : username,
    Pool : userPool
  };
  var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
  cognitoUser.confirmRegistration(view.find('.cognito-auth-activation-key').val(), true, function(error, result) {
    if (error) {
      cognitoAuth.toInvalidInputView(view.find('.cognito-auth-activation-key'));
      cognitoAuth.flashElement(messageFlash, error.message);
      return false;
    }
    cognitoAuth.closeActivationPopup();
    // cognitoAuth.openSigninPopup();
  });
  return false;
}

// サインイン画面用クリックハンドラ
cognitoAuth.openSigninPopup = function() {
  if (cognitoAuth.isSignined) {
    // サインアウト処理(popupを表示しない)
    if(window.confirm('Do you want to signout ?')) {
      var userPool = cognitoAuth.getUserPool();
      var cognitoUser = userPool.getCurrentUser();
      if (cognitoUser != null) {
        cognitoUser.signOut();  // このアプリケーションからサインアウト
        // cognitoUser.globalSignOut();  // グローバルにサインアウト
      }
      // ブラウザによる強制ログアウトの場合は、カレントユーザーが取得できない。
      cognitoAuth.identity = new $.Deferred();
      cognitoAuth.isSignined = false;
      cognitoAuth.signinEventEmitter.emit('signinState', false);
      return false;
    } else {
      return false;
    }
  } else {
    // パスワードリセット画面へのリンクを有効化
    $(document).on('click', '.cognito-auth-password-reset-open', cognitoAuth.openPasswordResetPopup);
    // サインイン処理
    return cognitoAuth.openPopup($('.cognito-auth-signin-open').attr('href'), '.cognito-auth-signin-btn', cognitoAuth.signin, '.cognito-auth-close-btn', cognitoAuth.closeSigninPopup);
  }
}

cognitoAuth.closeSigninPopup = function() {
  // パスワードリセット画面へのリンクを無効化
  $(document).off('click', '.cognito-auth-password-reset-open');
  return cognitoAuth.close('.cognito-auth-signin-btn');
}

cognitoAuth.signin = function() {
  if (!cognitoAuth.isSignined) {
    var view = $('#cognito-auth-signin-popup');
    var messageFlash = view.find('.cognito-auth-signin-error-message');
    messageFlash.css({'color': '#fc2e8b'});
    // 全ての入力部品のスタイルを元に戻す。
    cognitoAuth.toOriginalView(view.find('.cognito-auth-signin-name'));
    cognitoAuth.toOriginalView(view.find('.cognito-auth-signin-passwd'));
    // サインインに必要なデータの準備
    var userPool = cognitoAuth.getUserPool();
    var authenticationData = {
        Username: view.find('.cognito-auth-signin-name').val(),
        Password: view.find('.cognito-auth-signin-passwd').val()
    };
    var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);
    var userData = {
      Username: view.find('.cognito-auth-signin-name').val(),
      Pool: userPool
    };
    var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: function(result) {
        cognitoAuth.getUserAttributes(cognitoUser).done(function(userAttributes) {
          var updated_at = cognitoAuth.getUserAttributeValue(userAttributes, 'updated_at');
          var lastUpdateTime = parseInt(updated_at, 10);
          // トークンを登録
          var id_token = result.getIdToken().getJwtToken();
          var email = cognitoAuth.getUserAttributeValue(userAttributes, 'email');
          cognitoAuth.refreshAWSConfig(id_token, email);
          // サインインの確認が終わってから表示を変更する。
          cognitoAuth.identity.done(function(identity) {
            cognitoAuth.isSignined = true;
            cognitoAuth.signinEventEmitter.emit('signinState', true);
            var edt = new Date().getTime();
            if (isNaN(lastUpdateTime) || edt - lastUpdateTime > cognitoAuth.expirationTime) {
              // 有効期限切れフラグを有効化(パスワード更新画面表示時にブラウザ更新されたら強制サインアウトするため)
              localStorage.setItem("Expiration", "true");
              // パスワード更新画面へ
              cognitoAuth.closeSigninPopup();
              cognitoAuth.openPasswordIUpdatePopup(cognitoUser);
            } else {
              cognitoAuth.closeSigninPopup();
            }
          });
        });
      },
      onFailure: function(error) {
        if (error.message.match(/username/) || error.message.match(/User/) || error.message.match(/USERNAME/)) {
          cognitoAuth.toInvalidInputView(view.find('.cognito-auth-signin-name'));
        }
        if (error.message.match(/password/)) {
          cognitoAuth.toInvalidInputView(view.find('.cognito-auth-signin-passwd'));
        }
        cognitoAuth.flashElement(messageFlash, error.message);
      },
    });
  }
  return false;
}

// パスワード更新画面用クリックハンドラ
cognitoAuth.openPasswordIUpdatePopup = function(cognitoUser) {
  return cognitoAuth.openPopup('#cognito-auth-password-update-popup', '.cognito-auth-password-update-btn', cognitoAuth.passwordUpdate.bind(this, cognitoUser), undefined, undefined, '.cognito-auth-password-update-reset-btn', cognitoAuth.resetPasswordUpdate);
}

cognitoAuth.closePasswordUpdatePopup = function() {
  return cognitoAuth.close('.cognito-auth-password-update-btn', '.cognito-auth-password-update-reset-btn');
}

cognitoAuth.passwordUpdate = function(cognitoUser) {
  var view = $('#cognito-auth-password-update-popup');
  var messageFlash = view.find('.cognito-auth-password-update-error-message');
  messageFlash.css({'color': '#fc2e8b'});
  // 全ての入力部品のスタイルを元に戻す。
  cognitoAuth.toOriginalView(view.find('.cognito-auth-password-update-current'));
  cognitoAuth.toOriginalView(view.find('.cognito-auth-password-update-new'));
  cognitoAuth.toOriginalView(view.find('.cognito-auth-password-update-new2'));
  // 2箇所のパスワード入力の一致確認
  if (view.find('.cognito-auth-password-update-new').val() != view.find('.cognito-auth-password-update-new2').val()) {
    cognitoAuth.toInvalidInputView(view.find('.cognito-auth-password-update-new'));
    cognitoAuth.toInvalidInputView(view.find('.cognito-auth-password-update-new2'));
    cognitoAuth.flashElement(messageFlash, 'Passwords do not match');
    return false;
  }
  // 現在パスワード入力との一致確認
  if (view.find('.cognito-auth-password-update-current').val() == view.find('.cognito-auth-password-update-new').val()) {
    cognitoAuth.toInvalidInputView(view.find('.cognito-auth-password-update-current'));
    cognitoAuth.toInvalidInputView(view.find('.cognito-auth-password-update-new'));
    cognitoAuth.toInvalidInputView(view.find('.cognito-auth-password-update-new2'));
    cognitoAuth.flashElement(messageFlash, 'Same passwords are set');
    return false;
  }
  cognitoUser.changePassword(view.find('.cognito-auth-password-update-current').val(), view.find('.cognito-auth-password-update-new').val(), function(error, result) {
    if (error) {
      if (error.message.match(/previousPassword/)) {
        cognitoAuth.toInvalidInputView(view.find('.cognito-auth-password-update-current'));
      }
      if (error.message.match(/proposedPassword/)) {
        cognitoAuth.toInvalidInputView(view.find('.cognito-auth-password-update-new'));
        cognitoAuth.toInvalidInputView(view.find('.cognito-auth-password-update-new2'));
      }
      cognitoAuth.flashElement(messageFlash, error.message);
      return false;
    }
  });
  // 有効期限切れフラグをオフ
  localStorage.removeItem("Expiration");
  cognitoAuth.closePasswordUpdatePopup();
  return false;
}

cognitoAuth.resetPasswordUpdate = function() {
  var view = $('#cognito-auth-password-update-popup');
  // 全ての入力部品のスタイルを元に戻す。
  cognitoAuth.toOriginalView(view.find('.cognito-auth-password-update-current'));
  cognitoAuth.toOriginalView(view.find('.cognito-auth-password-update-new'));
  cognitoAuth.toOriginalView(view.find('.cognito-auth-password-update-new2'));
  // 入力をクリアする。
  view.find('.cognito-auth-password-update-current').val('');
  view.find('.cognito-auth-password-update-new').val('');
  view.find('.cognito-auth-password-update-new2').val('');
  view.find('.cognito-auth-password-update-error-message').text('');
  return false;
}

// パスワードリセット要求画面
cognitoAuth.openPasswordResetPopup = function() {
  // サインイン画面を閉じる。
  cognitoAuth.closeSigninPopup();
  return cognitoAuth.openPopup($('.cognito-auth-password-reset-open').attr('href'), '.cognito-auth-password-reset-btn', cognitoAuth.passwordReset, '.cognito-auth-close-btn', cognitoAuth.closePasswordResetPopup);
}

cognitoAuth.closePasswordResetPopup = function() {
  return cognitoAuth.close('.cognito-auth-password-reset-btn');
}

cognitoAuth.passwordReset = function() {
  var view = $('#cognito-auth-password-reset-popup');
  var messageFlash = view.find('.cognito-auth-password-reset-error-message');
  messageFlash.css({'color': '#fc2e8b'});
  // 全ての入力部品のスタイルを元に戻す。
  cognitoAuth.toOriginalView(view.find('.cognito-auth-password-reset-name'));
  // サインインに必要なデータの準備
  var userPool = cognitoAuth.getUserPool();
  var userData = {
    Username: view.find('.cognito-auth-password-reset-name').val(),
    Pool: userPool
  };
  var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
  // パスワード初期化画面へ
  cognitoAuth.closePasswordResetPopup();
  cognitoAuth.openPasswordInitializePopup(cognitoUser);
  return false;
}

// パスワード忘れ画面用クリックハンドラ
cognitoAuth.openPasswordInitializePopup = function(cognitoUser) {
  var eventEmitter = new EventEmitter();
  return cognitoAuth.openPopup('#cognito-auth-password-initialize-popup', '.cognito-auth-password-initialize-btn', cognitoAuth.passwordInitialize.bind(this, eventEmitter), undefined, undefined, '.cognito-auth-password-initialize-reset-btn', cognitoAuth.resetPasswordInitialize, function() {
    var view = $('#cognito-auth-password-initialize-popup');
    var messageFlash = view.find('.cognito-auth-password-initialize-error-message');
    cognitoUser.forgotPassword({
      onSuccess: function(result) {
        cognitoAuth.closePasswordInitializePopup();
        cognitoAuth.openSigninPopup();
      },
      onFailure: function(error) {
        if (error.message.match(/verification/) && error.message.match(/code/)) {
          cognitoAuth.toInvalidInputView(view.find('.cognito-auth-password-initialize-verification-code'));
        }
        if (error.message.match(/password/)) {
          cognitoAuth.toInvalidInputView(view.find('.cognito-auth-password-initialize-new'));
          cognitoAuth.toInvalidInputView(view.find('.cognito-auth-password-initialize-new2'));
        }
        cognitoAuth.flashElement(messageFlash, error.message);
      },
      inputVerificationCode() {
        eventEmitter.on("password-initialize", () => {
          cognitoUser.confirmPassword(view.find('.cognito-auth-password-initialize-verification-code').val(), view.find('.cognito-auth-password-initialize-new').val(), this);
        });
      }
    });
  });
}

cognitoAuth.closePasswordInitializePopup = function() {
  return cognitoAuth.close('.cognito-auth-password-initialize-btn', '.cognito-auth-password-initialize-reset-btn');
}

cognitoAuth.passwordInitialize = function(eventEmitter) {
  var view = $('#cognito-auth-password-initialize-popup');
  var messageFlash = view.find('.cognito-auth-password-initialize-error-message');
  messageFlash.css({'color': '#fc2e8b'});
  // 全ての入力部品のスタイルを元に戻す。
  cognitoAuth.toOriginalView(view.find('.cognito-auth-password-initialize-verification-code'));
  cognitoAuth.toOriginalView(view.find('.cognito-auth-password-initialize-new'));
  cognitoAuth.toOriginalView(view.find('.cognito-auth-password-initialize-new2'));
  // 2箇所のパスワード入力の一致確認
  if (view.find('.cognito-auth-password-initialize-new').val() != view.find('.cognito-auth-password-initialize-new2').val()) {
    cognitoAuth.toInvalidInputView(view.find('.cognito-auth-password-initialize-new'));
    cognitoAuth.toInvalidInputView(view.find('.cognito-auth-password-initialize-new2'));
    cognitoAuth.flashElement(messageFlash, 'Passwords do not match');
    return false;
  } else {
    eventEmitter.emit("password-initialize");
  }
  return false;
}

cognitoAuth.resetPasswordInitialize = function() {
  var view = $('#cognito-auth-password-initialize-popup');
  // 全ての入力部品のスタイルを元に戻す。
  cognitoAuth.toOriginalView(view.find('.cognito-auth-password-initialize-verification-code'));
  cognitoAuth.toOriginalView(view.find('.cognito-auth-password-initialize-new'));
  cognitoAuth.toOriginalView(view.find('.cognito-auth-password-initialize-new2'));
  // 入力をクリアする。
  view.find('.cognito-auth-password-initialize-verification-code').val('');
  view.find('.cognito-auth-password-initialize-new').val('');
  view.find('.cognito-auth-password-initialize-new2').val('');
  view.find('.cognito-auth-password-initialize-error-message').text('');
  return false;
}

// 共通関数
cognitoAuth.appOnReady = function() {
  cognitoAuth.getUserInfoFromSession();
  $(document).on('click', '.cognito-auth-signup-open', cognitoAuth.openSignupPopup);
  $(document).on('click', '.cognito-auth-signin-open', cognitoAuth.openSigninPopup);
}

cognitoAuth.openPopup= function(hash, sbmitBtnSelector, sbmitFunc, closeBtnSelector, closeFunc, resetBtnSelector, resetFunc, func =function() { return; } ) {
  var $popup = $(hash);
  var mT = ($popup.outerHeight() / -2) + 'px';
  var mL = ($popup.outerWidth() / -2) + 'px';
  $('.cognito-auth-popup').hide();
  $popup.css({
      'margin-top': mT,
      'margin-left': mL
  }).show();
  $('#cognito-auth-overlay').show();
  func();
  $(document).on('click', sbmitBtnSelector, sbmitFunc);
  if (closeBtnSelector && closeFunc) {
    $(document).on('click', closeBtnSelector, closeFunc);
  }
  if (resetBtnSelector && resetFunc) {
    $(document).on('click', resetBtnSelector, resetFunc);
  }
  return false;
}

cognitoAuth.close = function(sbmitBtnSelector, resetBtnSelector) {
  $(document).off('click', sbmitBtnSelector);
  if (resetBtnSelector) {
    $(document).off('click', resetBtnSelector);
  }
  $('.cognito-auth-popup, #cognito-auth-overlay').hide();
  $(document).off('click', '.cognito-auth-close-btn');
  return false;
}

cognitoAuth.flashElement = function(elem, content) {
  elem.fadeOut('fast', function() {
    elem.html(content);
    elem.fadeIn();
  });
}

cognitoAuth.toInvalidInputView = function(view) {
  view.css({'color': '#fc2e8b', 'border': '2px solid #fc2e8b', 'background-color': '#ffe4e1'});
  return true;
}

cognitoAuth.toOriginalView = function(view) {
  view.css({'color': '', 'border': '', 'background-color': ''});
  return true;
}

cognitoAuth.toBase64 = function(text) {
  return window.btoa(unescape(encodeURIComponent(text)));
}

cognitoAuth.toText = function(code) {
  return decodeURIComponent(escape(window.atob(code)));
}

cognitoAuth.getUserPool = function() {
  AWS.config.update({
    region: cognitoAuth.region,
    credentials: new AWS.CognitoIdentityCredentials({
      region: cognitoAuth.region,
      IdentityPoolId: cognitoAuth.IdentityPoolId
    })
  });

  AWSCognito.config.region = cognitoAuth.region,
  AWSCognito.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: cognitoAuth.IdentityPoolId
  });

  var poolData = {
    UserPoolId: cognitoAuth.userPoolId,
    ClientId: cognitoAuth.clientId
  };

  return new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);
}

cognitoAuth.getUserInfoFromSession = function() {
  // ローカルストレージからのユーザ情報取得に必要なデータの準備
  var userPool = cognitoAuth.getUserPool();
  var cognitoUser = userPool.getCurrentUser();
  if (cognitoUser != null) {
    if(localStorage.getItem("Expiration")) {
      // パスワード期限切れでパスワード更新画面表示時にブラウザやF5で更新した場合は、強制サインアウト
      cognitoUser.signOut();  // このアプリケーションからサインアウト
      // cognitoUser.globalSignOut();  // グローバルにサインアウト
      cognitoAuth.identity = new $.Deferred();
      localStorage.removeItem("Expiration");
      cognitoAuth.isSignined = false;
      cognitoAuth.signinEventEmitter.emit('signinState', false);
      return false;
    }
    cognitoUser.getSession(function(error, session) {
      if (error) {
        cognitoAuth.isSignined = false;
        cognitoAuth.signinEventEmitter.emit('signinState', false);
        alert(error);
        return false;
      }
      cognitoAuth.getUserAttributes(cognitoUser).done(function(userAttributes) {
        // トークンを登録
        var id_token = session.getIdToken().getJwtToken();
        var email = cognitoAuth.getUserAttributeValue(userAttributes, 'email');
        cognitoAuth.refreshAWSConfig(id_token, email);
        // サインインの確認が終わってから表示を変更する。
        cognitoAuth.identity.done(function(identity) {
          cognitoAuth.isSignined = true;
          cognitoAuth.signinEventEmitter.emit('signinState', true);
        });
      });
    });
    return true;
  } else {
    cognitoAuth.isSignined = false;
    cognitoAuth.signinEventEmitter.emit('signinState', false);
    return false;
  }
}

cognitoAuth.refreshAWSConfig = function(id_token, email) {
  var loginTo = 'cognito-idp.' + cognitoAuth.region + '.amazonaws.com/' + cognitoAuth.userPoolId;
  AWS.config.update({
    region: cognitoAuth.region,
    credentials: new AWS.CognitoIdentityCredentials({
      region: cognitoAuth.region,
      IdentityPoolId: cognitoAuth.IdentityPoolId,
      Logins: {
        [loginTo]: id_token
      }
    })
  });
  // 期限切れの場合にアイデンティティトークンを更新してAWSの認証情報を更新する。
  function refresh() {
    // AWSの場合の処理は調査中
    return cognitoAuth.awsRefresh();
  }
  cognitoAuth.awsRefresh().then(function(id) {
    cognitoAuth.identity.resolve({
      id: id,
      email: email,
      refresh: refresh
    });
  });
}

cognitoAuth.awsRefresh = function() {
  var deferred = new $.Deferred();
  AWS.config.credentials.refresh(function(error) {
    if (error) {
      deferred.reject(error);
    } else {
      deferred.resolve(AWS.config.credentials.identityId);
    }
  });
  return deferred.promise();
}

// ユーザ属性の取得
cognitoAuth.getUserAttributes = function(cognitoUser) {
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
cognitoAuth.getUserAttributeValue = function(userAttributes, attr) {
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

/////////////////////////
// Google+ へのログインでは特定の名前空間に配置することができない。
function googleSignIn(googleUser) {
  // AWS認証情報をリクエスト
  var id_token = googleUser.getAuthResponse().id_token;
  AWS.config.update({
    region: cognitoAuth.region,
    credentials: new AWS.CognitoIdentityCredentials({
      region: cognitoAuth.region,
      IdentityPoolId: cognitoAuth.IdentityPoolId,
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
      return cognitoAuth.awsRefresh();
    });
  }
  cognitoAuth.awsRefresh().then(function(id) {
    cognitoAuth.identity.resolve({
      id: id,
      email: googleUser.getBasicProfile().getEmail(),
      refresh: refresh
    });
  });
}
