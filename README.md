# :robot:basic_bot 
A NodeJS discord bot that does what you need while allowing for your custom JS scripts.

## Setup
1. Clone the repo, run `npm install` to get dependencies
2. run `node app.js`, this will create necessary json files
3. Edit **data.json** and replace TOKEN_HERE with your [discord bot token](https://www.writebots.com/discord-bot-token/#:~:text=A%20Discord%20Bot%20Token%20is,generate%20a%20Discord%20Bot%20Token.)
4. From here your bot should be ready to use! Run `node app.js`

## Usage
Commands must always start with $

### Default Commands
**$help** - lists available commands.<br />
**$add <command_name> <reply...>** - adds new command. <br />
**$set <command_name> <reply...>** - overrwrites existing command reply <br />
**$del <command>** - deletes command
**$<custom_command>** - runs custom command.<br />
**$restart** - restarts bot

### :clipboard:Scripts (advanced)
You can have commands that run your very own JS scripts. See the [example script](https://github.com/duecknoah/basic_bot/blob/master/scripts/example_script.js)
