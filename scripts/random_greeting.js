/** You can add your own scripts to be run when certain commands are typed.
 * ----------------------------------
 *              SETUP
 * ----------------------------------
 * To run this script, add a command entry in data.json:
 *
 * "greetme": {
 *   "name": "greetme",
 *   "script": "random_greeting.js"
 * },
 *
 * ----------------------------------
 *             TO USE
 * ----------------------------------
 * Type the following in Discord:
 * greetme
 */

function getGreeting() {
  switch(Math.floor(Math.random() * 4)) {
    case 0: return `Nice to meeting you!`;
    case 1: return `Hello there :)`;
    case 2: return `Bonjour`;
    case 3: return `What a nice day it is!`;
    default: return `Hi`;
  }
}

 function main(oClient, oMsg) {
  return new Promise((res, rej) => {
    let greeting = getGreeting();
    res(oMsg.reply(greeting));
  });
}

module.exports.main = main;