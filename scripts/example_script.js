/** You can add your own scripts to be run when certain commands are typed.
 * ----------------------------------
 *              SETUP
 * ----------------------------------
 * To run this script, add a command entry in data.json:
 *
 * "test_script": {
 *   "name": "test_script",
 *   "script": "example_script.js"
 * },
 *
 * ----------------------------------
 *             TO USE
 * ----------------------------------
 * Type the following in Discord:
 * test_script
 */

function main(oClient, oMsg) {
  return new Promise((res, rej) => {
    res(oMsg.reply('Hello world!'));
  });
}

module.exports.main = main;