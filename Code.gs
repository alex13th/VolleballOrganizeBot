const API_TOKEN = '';
const GOOGLE_SPREAD_SHEET = '';
const ENTRY_SHEET_NAME = 'List1';
const LIST_SHEET_NAME = 'List2';

var helpText = '/list - список настоящих волейболистов, в качестве аргумента можно указать количество строк кнопок времени;\n';
helpText += '/ask - вывести меню записи, в качестве аргумента можно указать количество строк кнопок времени;\n';
helpText += '/sorry - ОЙ, я передумал(а);\n';
helpText += '/help - эта самая пояснялка.';

const askText = 'В какое время пойдешь?';
const ballText = 'Ваш мяч очень важен для нас!';
const netText = 'КРАСАВА!!!';
const recordText = 'Записан на ';

const arriveTimeText = 'подойдет к ';
const arriveText = 'появится вдруг.';

const playerListCaption = '<b>Настоящие волейболисты:</b>';
const playerListFooter = '<b>Присоединяйся!</b>';

const noPlayersCaption = '<b>Пока смелых нет</b>';
const noPlayersFooter = '<b>Будь первым!</b>';

const ballIcon = '\ud83c\udfd0';
const netIcon = '\ud83d\udc51';

const ballButtonCaption = ballIcon + ' Беру мяч';
const netButtonCaption = netIcon + ' Беру сетку';

const dateColumn = 0;
const userNameColumn = 1;
const timeColumn = 2;
const userIdColumn = 3;
const netColumn = 4;
const ballColumn = 5;

function doPost(e) {
  
  var update = JSON.parse(e.postData.contents);

  if (update.hasOwnProperty('message')) {
    var msg = update.message;
    var chatId = msg.chat.id;

    if (isCommand(msg)) {
      proceedCommand(msg);
    }
  } else if(update.hasOwnProperty('callback_query')){
    var callbackQuery = update.callback_query;
    proceedCallback(callbackQuery);
  }
}

function proceedCallback(callbackQuery) {
  var msg = callbackQuery.message;
  var callbackId = callbackQuery.id;
  var data = callbackQuery.data;
  var userName = parseUserName(callbackQuery.from);
  
  if(data == 'ball') {
    setPlayerBall(callbackQuery.from);
    callbackToQuery(callbackId, ballText);
  } else if (data == 'net') {
    setPlayerNet(callbackQuery.from);
    callbackToQuery(callbackId, netText);
  } else {
    setPlayerTime(callbackQuery.from, data);
    callbackToQuery(callbackId, recordText + data);
  }

  editMessage(msg, getPlayerListMessage(), msg.reply_markup);
}

function editMessage(msg, posttext, keyboard) {
  var chatId = msg.chat.id;
  var msgId = msg.message_id;
  
  var payload = {
    'method': 'editMessageText',
    'chat_id': String(chatId),
    'message_id': String(msgId),
    'text': posttext,
    'parse_mode': 'HTML',
    'reply_markup': JSON.stringify(keyboard)
  };
  var data = {
    "method": "post",
    "payload": payload
  };
  
  UrlFetchApp.fetch('https://api.telegram.org/bot' + API_TOKEN + '/', data);
}

function getPlayerListMessage() {
  var result = '';
  var playerList = readPlayersFromSheet();
  
  if(playerList.length > 0) {
    result += playerListCaption + '\n';
    result += playerList;
    result += '\n' + playerListFooter;
  } else {
    result += noPlayersCaption + '\n';
    result += noPlayersFooter;
  }
  
  return result;
}

function callbackToQuery(callbackId, callbackText) {
  var payload = {
    'method': 'answerCallbackQuery',
    'callback_query_id': callbackId,
    'text': callbackText
  }
  var data = {
    "method": "post",
    "payload": payload
  }
  
  UrlFetchApp.fetch('https://api.telegram.org/bot' + API_TOKEN + '/', data);
}

function proceedCommand(msg) {
  var cmd = getCommand(msg);

  switch(cmd.command) {
    case 'help':
      postHTML(cmd.chatId, helpText);
      break;
    case 'ask':
      var rowCount = 2;
      if(cmd.params.length > 0) 
        rowCount = parseInt(cmd.params[0]);
      sendKeyboard(cmd.chatId, askText, getPlusKeyboard(rowCount));
      break;
    case 'sorry':
      deletePlayerEntries(msg.from.id);
      break;
    case 'list':
      var rowCount = 2;
      if(cmd.params.length > 0) 
        rowCount = parseInt(cmd.params[0]);
      sendKeyboard(cmd.chatId, getPlayerListMessage(), getPlusKeyboard(rowCount));
      break;
  }
}

function getPlusKeyboard(rowCount = 2) {
  var keyboard;
  var buttons = [];
  var buttonRow;
  var startTime = 21 - rowCount * 2;
  
  for(var i = 0; i < rowCount; i++) {
    var buttonRow = [];
    var buttonText;
    
    if((i + rowCount) % 2 == 0) {
      buttonRow = createTimeButtonsRow(startTime + i * 2, ':00', 4);
    } else {
      buttonRow = createTimeButtonsRow(startTime + (i - 1) * 2, ':30', 4);
    }
    
    buttons.push(buttonRow);
  }
  
  buttonRow = [];
  buttonRow.push({'text': ballButtonCaption, callback_data: 'ball'});
  buttonRow.push({'text': netButtonCaption, callback_data: 'net'});
  buttons.push(buttonRow);
  
  return {'inline_keyboard': buttons};
}

function createTimeButtonsRow(startTime, sufixText, count) {
  var result = [];
  
  for(var i = 0; i < count; i++) {
    buttonText = '' + (startTime + i) + sufixText;
    result.push({text: buttonText, callback_data: buttonText});
  }

  return result;
}

function sendKeyboard(chatId, posttext, keyboard) {
  var payload = {
    'method': 'sendMessage',
    'chat_id': String(chatId),
    'text': posttext,
    'parse_mode': 'HTML',
    'reply_markup': JSON.stringify(keyboard)
  };
  
  var data = {
    "method": "post",
    "payload": payload
  };

  UrlFetchApp.fetch('https://api.telegram.org/bot' + API_TOKEN + '/', data);
}

function postHTML(chatId, posttext) {
  var payload = {
    'method': 'sendMessage',
    'chat_id': String(chatId),
    'text': posttext,
    'parse_mode': 'HTML'
  }
  var data = {
    "method": "post",
    "payload": payload
  }
  
  UrlFetchApp.fetch('https://api.telegram.org/bot' + API_TOKEN + '/', data);
}

function isCommand(msg) {
  return msg.hasOwnProperty('entities') && msg.entities[0].type == 'bot_command';
}

function getCommand(msg) {
  var result = {chatId: msg.chat.id, command: null, params: []};
  var splittedText = msg.text.split(' ');
  var splittedCmd = splittedText[0].split('@');
  
  result.command = splittedCmd[0].substring(1);

  if(splittedCmd.length > 1)
    result.botName = splittedCmd[1];
  
  for(var i = 1; i < splittedText.length; i++) {
    result.params.push(splittedText[i]);
  }
  
  return result;
}

function readPlayersFromSheet() {
  var sheet = openSheet(GOOGLE_SPREAD_SHEET, LIST_SHEET_NAME);
  var values = sheet.getDataRange().getDisplayValues();

  var result = '';

  for (var i = 1; i < values.length; i++) {
    var row = '';
    row = '<b>' + i + '. ' + values[i][userNameColumn] + '</b>';

    if(values[i][timeColumn]) {
      row += ' ' + arriveTimeText + '<b>' + values[i][timeColumn] + '</b>';
    } else {
      row += ' ' + arriveText;
    }
    
    if(values[i][ballColumn]){
      row += ' ' + ballIcon;
    }
    
    if(values[i][netColumn]){
      row += ' ' + netIcon;
    }

    result = result + row + '\n';
  }
  
  return result;
}

function openSheet(spreadSheet, sheetName) {
  return SpreadsheetApp.openById(spreadSheet).getSheetByName(sheetName);
}

function parseUserName(user) {
  var result = user.first_name;
  
  if(user.hasOwnProperty('last_name')) {
     result = result + ' ' + user.last_name;
  }
  
  return result;
}

function setPlayerBall(user) {
  setPlayerField(user, ballColumn, 1)
}

function setPlayerNet(user) {
  setPlayerField(user, netColumn, 1);
}

function setPlayerTime(user, time) {
  setPlayerField(user, timeColumn, time)
}

function setPlayerField(user, column, value) {
  var sheet = openSheet(GOOGLE_SPREAD_SHEET, ENTRY_SHEET_NAME);
  var range = sheet.getDataRange();
  var values = range.getValues();
  var userId = user.id;

  var nowDate = new Date();
  var currDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
  for(var i = 0; i < values.length; i++) {
    if(values[i][dateColumn] >= currDate && values[i][userIdColumn] == userId) {
      values[i][column] = value;
      range.setValues(values);
      return true;
    }
  }
  
  appendPlayer(user, column, value);
  return false;
}

function appendPlayer(user, column, value) {
  var sheet = openSheet(GOOGLE_SPREAD_SHEET, ENTRY_SHEET_NAME);
  var msgDate = new Date();

  var row = [];
  row.push(msgDate);
  row.push(parseUserName(user));
  row[column] = value;
  row[userIdColumn] = user.id;
  
  sheet.appendRow(row);
}

function deletePlayerEntries(userId) {
  var sheet = openSheet(GOOGLE_SPREAD_SHEET, ENTRY_SHEET_NAME);
  var range = sheet.getDataRange();
  var values = range.getValues();
  
  var nowDate = new Date();
  var currDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
  var rowsDeleted = 0;
  for(var i = 0; i < values.length; i++) {
    if(values[i][dateColumn] >= currDate && values[i][userIdColumn] == userId) {
      sheet.deleteRow((parseInt(i)+1) - rowsDeleted);
      rowsDeleted++;
    }
  }
}
