const TOKEN_PLACEHOLDER = 'TOKEN_HERE';
const STORE_PATH = 'data.json';
const MESSAGE_LOG_PATH = 'messages.log';

const Discord = require('discord.js');
const client = new Discord.Client();
const messageLogger = require('logger').createLogger(MESSAGE_LOG_PATH);
messageLogger.format = (level, date, sMsg) => `${date.toString()};${sMsg}`;
const Store = require('data-store');
const store = initStore();
const aDefaultCommands = store.get('enabled_defaults');

const remDot = (sCommand) => sCommand.replace(/\./g, '\\.');

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', oMsg => {
  messageLog(oMsg);

  if (oMsg.author.id === client.user.id) {
    return;
  }
  let oCommand = getCommandOf(oMsg.content);

  if (!oCommand) {
    return;
  }

  // Get args from message
  let tokenizedInput = oMsg.content.substring(oCommand.command.name.length).trim().split(' ');

  // Default commands
  switch(oCommand.command.name) {
    case '$add':
    // Adds a custom command
      if (tokenizedInput.length > 1) {
        oMsg.reply(addCommand(tokenizedInput[0], tokenizedInput.slice(1).join(' ')));
      } else {
        oMsg.reply('Improper usage\nExpected usage: $add <command> <reply...>');
      }
    break;
    case '$set':
    // Sets a custom command, overwriting an existing if need be
      if (tokenizedInput.length > 1) {
        oMsg.reply(setCommand(tokenizedInput[0], tokenizedInput.slice(1).join(' ')));
      } else {
        oMsg.reply('Improper usage\nExpected usage: $set <command> <reply...>');
      }
    break;
    case '$del':
    // Deletes a custom command
      if (tokenizedInput.length === 1) {
        oMsg.reply(delCommand(tokenizedInput[0]));
      } else {
        oMsg.reply('Improper usage\nExpected usage: $del <command>');
      }
    break;
    case '$help':
    // Displays help page listing the commands
      let sDefCommands = aDefaultCommands.join(', ');
      let sCustCommands = '';

      if (store.has('commands')) {
        sCustCommands = Object.keys(store.get('commands')).join(', ');
      } 
      oMsg.reply(`\n**Normal** ${sDefCommands}\n**Custom**: ${sCustCommands}`);
    break;
    case '$purge':
    // Removes a specified amount of messages from the channel
      if (tokenizedInput.length === 1) {
        purgeCommand(oMsg, tokenizedInput[0]);
      } else {
        oMsg.reply('Improper usage\nExpected usage: $purge <numOfMessagesToRemove>');
      }
    break;
    default:
      // Assume it is a custom command
      let sResp = oCommand.command.response;
      oMsg.reply(oCommand.command.response);
  }
});

function messageLog(oMsg) {
  let sMsgContentEscaped = JSON.stringify(String(oMsg.content));
  sMsgContentEscaped = sMsgContentEscaped.substring(1, sMsgContentEscaped.length - 1);
  messageLogger.info(`${oMsg.channel}; ${oMsg.channel.name}; ${oMsg.author.id}; ${oMsg.author.username}; ${sMsgContentEscaped}`);
}

function hasToken(store) {
  return store.has('token') && store.get('token') && store.get('token') !== TOKEN_PLACEHOLDER;
}

function initStore() {
  let store = new Store({
    path: STORE_PATH,
  });

  if (!hasToken(store)) {
    console.log('No bot token provided, enter token in data.json and try again...');
    store.set('token', TOKEN_PLACEHOLDER);
  }
  if (!store.has('commands')) {
    store.set('commands', []);
  }
  if (!store.has('enabled_defaults')) {
    store.set('enabled_defaults', ['$add', '$del', '$set', '$list', '$purge']);
  }

  return store;
}

function addCommand(sName, sResp) {
  let sReply;

  if (getCommandOf(sName)) {
    sReply = 'Command already exists!';
  } else {
    setCommand(sName, sResp);
    sReply = `Added \'${sName}\' as a command`;
  }

  return sReply;
}

function setCommand(sName, sResp) {
  store.set(`commands.${remDot(sName)}`, {
    name: sName,
    response: sResp,
  });
  return `Set \'${sName}\' command.`;
}

function delCommand(sCommand) {
  let matchedCommand = getCommandOf(sCommand);
  let sReply;

  if (!matchedCommand) {
    sReply = 'Command doesn\'t exist';
  } else if (matchedCommand.isDefault) {
    sReply = 'Cannot delete default commands';
  } else {
    store.del(`commands.${remDot(matchedCommand.command.name)}`);
    sReply = `Deleted \'${matchedCommand.command.name}\' successfully`;
  }

  return sReply;
}

function purgeCommand(oMsg, sAmount) {
  let iAmt = parseInt(sAmount);

  if (iAmt) {
    oMsg.channel.bulkDelete(iAmt)
    .then(oMessages => oMsg.reply(`Bulk deleted ${oMessages.size} messages`))
    .then(oReplyMsg => delay(30000, oReplyMsg))
    .then(oReplyMsg => oReplyMsg.delete(1))
    .catch(console.error);
  } else {
    oMsg.reply('Error purging messages, make sure a proper number is entered');
  }
}

function delay (t, v) {
  return new Promise(resolve => {
    setTimeout(resolve.bind(null, v), t);
  });
}

function getCommandOf(sMsg) {
  let sMsgCommand = sMsg.split(' ')[0];
  let oMatchedCommand = aDefaultCommands.find(sCommand => sMsgCommand === sCommand);
  let oRet;

  // If matched right away, it is a default command
  if (oMatchedCommand) {
    oRet = {
      command: {
        name: oMatchedCommand,
      },
      isDefault: true,
    }
  } else {
    // Custom command
    if (!store.has('commands')) {
      return;
    }

    let oMatchedCommand = store.get(`commands.${remDot(sMsgCommand)}`);
    if (oMatchedCommand) {
      oRet = {
        command: oMatchedCommand,
        isDefault: false,
      }
    }
  }

  return oRet;
}

if (hasToken(store)) {
  client.login(store.get('token'));
}