const TOKEN_PLACEHOLDER = 'TOKEN_HERE';
const STORE_PATH = 'data.json';
const MESSAGE_LOG_PATH = 'messages.log';
const SCRIPT_PATH = './scripts/';

const Discord = require('discord.js');
const client = new Discord.Client();
const messageLogger = require('logger').createLogger(MESSAGE_LOG_PATH);
messageLogger.format = (level, date, sMsg) => `${date.toString()};${sMsg}`;
const Store = require('data-store');
const Nltk = require('nltk');
const Nltk_ngram = new Nltk.ngram(2);
const CMD_PREFIX = '$';

var store;
var aDefaultCommands;

const remDot = sCommand => sCommand.replace(/\./g, '\\.');

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', oMsg => {
  messageLog(oMsg);

  if (oMsg.author.id === client.user.id) {
    return;
  }

  // Check if command is prefixed
  if (!oMsg.content.startsWith(CMD_PREFIX)) {
    return;
  }

  try {
    oMsg.content = oMsg.content.substring(CMD_PREFIX.length); // Remove prefix
    let oCommand = getCommandOf(oMsg.content);

    if (!oCommand) {
      return;
    }
    // Get args from message
    let tokenizedInput = oMsg.content.substring(oCommand.command.name.length).trim();
    tokenizedInput = (tokenizedInput === '') ? [] : tokenizedInput.split(' '); // forces empty array if no tokens after command name

    // Default commands
    switch(oCommand.command.name) {
      case 'add':
      // Adds a custom command
        if (tokenizedInput.length > 1) {
          oMsg.reply(addCommand(tokenizedInput[0], tokenizedInput.slice(1).join(' ')));
        } else {
          oMsg.reply('Improper usage\nExpected usage: $add <command> <reply...>');
        }
      break;
      case 'set':
      // Sets a custom command, overwriting an existing if need be
        if (tokenizedInput.length > 1) {
          oMsg.reply(setCommand(tokenizedInput[0], tokenizedInput.slice(1).join(' ')));
        } else {
          oMsg.reply('Improper usage\nExpected usage: $set <command> <reply...>');
        }
      break;
      case 'del':
      // Deletes a custom command
        if (tokenizedInput.length === 1) {
          oMsg.reply(delCommand(tokenizedInput[0]));
        } else {
          oMsg.reply('Improper usage\nExpected usage: $del <command>');
        }
      break;
      case 'help':
      // Displays help page listing the commands
        if (tokenizedInput.length === 1) {
          // Specific command help listing for custom commands
          console.log(tokenizedInput);
          let cmdStrPath = `commands.${remDot(tokenizedInput[0])}`;
          if (store.has(cmdStrPath) && store.has(`${cmdStrPath}.help_msg`)) {
            let help_msg = store.get(`${cmdStrPath}.help_msg`);
            oMsg.reply(help_msg);
          } else {
            oMsg.reply(`No help message for command '${tokenizedInput[0]}'`);
          }
        } else {
          // Default help listing of all commands
          let sDefCommands = aDefaultCommands.join(', ');
          let sCustCommands = '';

          if (store.has('commands')) {
            sCustCommands = Object.keys(store.get('commands')).join(', ');
          }
          oMsg.reply(`\n**Normal** ${sDefCommands}\n**Custom**: ${sCustCommands}`);
        }

      break;
      case 'purge':
      // Removes a specified amount of messages from the channel
        if (tokenizedInput.length > 1) {
          purgeCommand(oMsg, tokenizedInput[0]);
        } else {
          oMsg.reply('Improper usage\nExpected usage: $purge <numOfMessagesToRemove>');
        }
      break;
      case 'restart':
      // Restarts the bot
        oMsg.reply('Restarting bot...');
        restart();
      break;
      case 'sethelp':
        // Sets help message for custom commands
        if (tokenizedInput.length > 1) {
          console.log(tokenizedInput);
          oMsg.reply(setHelpCommand(tokenizedInput[0], tokenizedInput.slice(1).join(' ')));
        } else {
          oMsg.reply('Improper usage\nExpected usage: $sethelp <command> <help_msg...>')
        }
      default:
        // Assume it is a custom command
        let sResp = oCommand.command.response;
        let sScript = oCommand.command.script;
        if (sResp) {
          oMsg.reply(oCommand.command.response).then(() => {
            if (sScript) {
              scriptCommand(oMsg, sScript);
            }
          });
        } else if (sScript) {
          scriptCommand(oMsg, sScript);
        }
    }
  } catch (oEx) {
    console.error('Exception thrown! See error below');
    console.trace(oEx);
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
    store.set('enabled_defaults', ['add', 'del', 'set', 'help', 'purge', 'restart', 'sethelp']);
  }

  return store;
}

function restart() {
    client.destroy()
    .then(() => main());
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
  let sReply;
  let oCommand = getCommandOf(sName);

  if (oCommand && oCommand.command.script) {
    sReply = 'Cannot overwrite commands that contain scripts';
  } else {
    store.set(`commands.${remDot(sName)}`, {
      name: sName,
      response: sResp,
    });
    sReply = `Set \'${sName}\' command.`;
  }

  return sReply;
}

function delCommand(sCommand) {
  let matchedCommand = getCommandOf(sCommand);
  let sReply;

  if (!matchedCommand) {
    sReply = 'Command doesn\'t exist';
  } else if (matchedCommand.isDefault) {
    sReply = 'Cannot delete default commands';
  } else if (matchedCommand.command.script) {
    sReply = 'Cannot delete commands with scripts';
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

function setHelpCommand(sName, sHelpMsg) {
  let sReply;
  let matchedCommand = getCommandOf(sName);

  if (!matchedCommand) {
    sReply = 'Command doesn\'t exist';
  } else if (matchedCommand.isDefault) {
    sReply = 'Cannot set help message for default commands';
  } else if (matchedCommand.command.script) {
    sReply = 'Cannot set help message for commands with scripts';
  } else {
    store.set(`commands.${remDot(sName)}.help_msg`, sHelpMsg);
    sReply = `Set help message for \'${sName}\' command.`;
  }

  return sReply;
}

function scriptCommand(oMsg, sScript) {
  const sScriptPath = SCRIPT_PATH + sScript;
  let sErrorResp;
  try {
    let script = require(sScriptPath).main;

    if (script) {
      if (script instanceof Function) {
        script(client, oMsg, this).catch((ex) => {
          sErrorResp = `Error: Script \'${sScript}\' failed with exception: ${ex}`;
        });
      } else {
        sErrorResp = `Error: Script \'${sScript}\' is not a function`;
      }
    } else {
      sErrorResp = `Error: Script \'${sScript}\' doesn\'t exist`;
    }
  } catch (oEx) {
    sErrorResp = oEx;
  } finally {
    if (sErrorResp) {
      oMsg.reply(`There was a problem running the script, see console for details.`);
      console.error(sErrorResp);
    }
  }
}

function delay (t, v) {
  return new Promise(resolve => {
    setTimeout(resolve.bind(null, v), t);
  });
}

// Returns the closest (via Levenstein's distance) string match from the array of
// strings (aCompare). Returns null if no close matches
function getClosestString(str, aCompare) {
  let closestDist = 0;
  let closestString = null;
  let closestMatchCount = 0; // Number of closest matches that are equally close
  const minThreshold = 0.7; // minimum % match to be considered a similar string

  // Find closest String
  aCompare.find(sCompare => {
    let dist = Nltk_ngram.sim(str, sCompare);
    if (dist >= minThreshold) {
      if (dist == closestDist) {
        closestMatchCount ++;
      }
      if (dist > closestDist) {
        closestDist = dist;
        closestString = sCompare;
        closestMatchCount = 1;
      }
    }
  });

  // If there are multiple equally close matches, then there is no clear closest string
  if (closestMatchCount > 1) {
    closestString = null;
  }

  return closestString;
}

// A wrapper function for getClosestString to allow command
// objects to be compared. The closest match will return the
// closest matched command object. Returns null if no close matches
function getClosestCommand(sCommandName, aCompareCommands) {
  let closestKey = getClosestString(sCommandName, Object.keys(aCompareCommands));
  return (closestKey) ? aCompareCommands[closestKey] : null;
}

function getCommandOf(sMsg) {
  let sMsgCommand = sMsg.split(' ')[0];
  let sMatchedCommand = getClosestString(sMsgCommand, aDefaultCommands);
  let oRet;

  // If matched right away, it is a default command
  if (sMatchedCommand) {
    oRet = {
      command: {
        name: sMatchedCommand,
      },
      isDefault: true,
    };
  } else {
    // Custom command
    if (!store.has('commands')) {
      return;
    }

    let oMatchedCommand = getClosestCommand(sMsgCommand, store.get('commands'));

    if (oMatchedCommand) {
      oRet = {
        command: oMatchedCommand,
        isDefault: false,
      };
    }
  }

  return oRet;
}

function main() {
  store = initStore();
  aDefaultCommands = store.get('enabled_defaults');

  if (hasToken(store)) {
    client.login(store.get('token'));
  }
}

main();
