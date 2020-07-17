// Handles commands relating to game servers
// Usage: server <game> <type> <start|stop|restart>
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const exec = require('child_process').exec;

const LGSM_DIR = "/home/noahdueck/lgsm_servers/";
const REGEX_COLOR_CODES = /\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?[mGK]/g;

function main(oClient, oMsg) {
    return new Promise(() => {
        const rawMsg = oMsg.content;
        const tokenizedInput = rawMsg.split(' ');
        const sArgs = rawMsg.substring(tokenizedInput[0].length).trim();

        switch(tokenizedInput.length) {
        case 2:
            if (tokenizedInput[1] === 'list') {
                return listServers(oMsg);
            }
        break;
        case 4:
            const sGame = tokenizedInput[1];
            const sType = tokenizedInput[2];
            const sAction = tokenizedInput[3];
            const fPath = path.join(LGSM_DIR, sGame, sType);
    
            return fs.stat(fPath, function(err, stat) {
                // File not found
                if (err != null) {
                    console.log(err);
                    return oMsg.reply(`Server game: ${sGame}, of type ${sType} doesn\'t exist.`);
                }
                // Prevent access violation
                if (!fPath.startsWith(LGSM_DIR)) {
                    return oMsg.reply('Cannot access outside of server directory');
                }
    
                switch(sAction) {
                    case 'start':
                        return startServer(oMsg, fPath);
                    case 'stop':
                        return stopServer(oMsg, fPath);
                    case 'restart':
                        return restartServer(oMsg, fPath);
                    case 'status':
                        return getServerStatus(oMsg, fPath);
                    default:
                        return oMsg.reply(`Invalid action ${sAction}`);
                }
            });
        default:
            return oMsg.reply('Improper usage:\nserver <game> <type> <start|stop|restart|status> | server list');
        }

    });
}
// Converts child process to promise
function promiseFromChildProcess(child) {
    return new Promise((res, rej) => {
        child.addListener('error', rej);
        child.addListener('exit', res);
    });  
}

// Returns child process
function execServerCmd(fPath, action, otherShell) {
    let execStr = `cd ${fPath} && ./*server ${action}`;
    if (otherShell) {
        execStr = `${execStr} ${otherShell}`;
    }
    return exec(execStr);
}

function startServer(oMsg, fPath) {
    let child = execServerCmd(fPath, 'start');
    return promiseFromChildProcess(child)
    .then(res => {
        // Success
        if (res === 0) {
            Promise.resolve(
                oMsg.reply('Successfully started server')
                .then(getServerStatus(oMsg, fPath))
            );
        } else {
            Promise.reject(oMsg.reply(`Server couldn\'t start properly (Exit code ${res}), already running?`));
        }
    }, rej => {
        console.error(`Error starting server at ${fPath}: ${rej}`);
        Promise.reject(oMsg.reply('Error starting server'));
    });
}

function getServerStatus(oMsg, fPath) {
    // Get server details
    let child = execServerCmd(fPath, 'details', '| grep -E "Server name: |Internet IP: |Status: "');

    return new Promise((res, rej) => {
        child.stdout.on('data', data => {
            let finalData = data.replace(REGEX_COLOR_CODES, '');
            res(oMsg.reply(finalData));
        });
        child.stderr.on('data', data => {
            rej(oMsg.reply('err: ' + data));
        });
    });
}

function stopServer(oMsg, fPath) {
    let child = execServerCmd(fPath, 'stop');

    return promiseFromChildProcess(child).then(res => {
        // Success
        if (res === 0) {
            Promise.resolve(oMsg.reply('Successfully stopped server'));
        } else {
            Promise.reject(oMsg.reply(`Server couldn\'t be stopped (Exit code ${res}), already stopped?`));
        }
    }, rej => {
        console.error(`Error starting server at ${fPath}: ${rej}`);
        Promise.reject(oMsg.reply('Error starting server'));
    });
}

function restartServer(oMsg, fPath) {
    return stopServer(oMsg, fPath)
    .then(
        res => startServer(oMsg, fPath)
    )
    .catch((rej) => {
        oMsg.reply('Failed to restart server');
        console.log(err);
    });
}

// Lists all the game servers and available types
function listServers(oMsg) {
    let aGamesDir = fs.readdirSync(LGSM_DIR);
    let aGamesListing = aGamesDir.map((sGameDir) => {
        let sGamePath = path.join(LGSM_DIR, sGameDir);
        let aTypes = fs.readdirSync(sGamePath);

        return {
            'game': sGameDir,
            'types': aTypes
        };
    });
    // Turn into readable string to send
    let sReply = "**Servers (with types)**\n";
    aGamesListing.forEach((oGameListing) => {
        sReply += `__${oGameListing.game}__: ${oGameListing.types}\n`;
    });
    return oMsg.reply(sReply);
}

module.exports.main = main;