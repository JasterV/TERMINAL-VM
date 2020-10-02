function createCli() {
    /** PRIVATE ATTRIBUTES */
    var tree = getFilesFromStorage();
    var history = getHistory();
    var historyIndex = -1;
    var tabs = [];
    var tabsIndex = 0;
    var commands = {
        ls: {
            run: ls,
            name: "ls - list directory contents",
            synopsis: "ls [OPTION] [FILE]",
            description: "List information about the FILEs (the current directory by default)" +
                "<br>" + "-R, list subdirectories recursively" +
                "<br>" + "-S, sort by file size, largest first" +
                "<br>" + "-t, sort by modification time, newest first",
        },
        pwd: {
            run: pwd,
            name: "pwd - print name of current/working directory",
            synopsis: "pwd",
            description: "Print the full filename of the current working directory."
        },
        cd: {
            run: cd,
            name: "cd - move to another directory",
            synopsis: "cd [PATH]",
            description: "Move to the specified path (the root directory by default)"
        },
        mkdir: {
            run: function (params) {
                mkdir(params);
                saveFiles();
            },
            name: "mkdir - make directories",
            synopsis: "mkdir DIRECTORY",
            description: "Create the DIRECTORY(ies), if they do not already exist."
        },
        echo: {
            run: function (params) {
                echo(params);
                saveFiles();
            },
            name: "echo - display a line of text",
            synopsis: "echo [STRING] | echo [STRING] > [FILE]",
            description: "Echo the STRING(s) to standard output. Can be used with the '>' and '>>' operators to create a new file."
        },
        cat: {
            run: cat,
            name: "cat - print file contents on the standard output",
            synopsis: "cat [FILE]",
            description: "Echo a FILE to standard output"
        },
        rm: {
            run: function (params) {
                rm(params);
                saveFiles();
            },
            name: "rm - remove files or directories",
            synopsis: "rm [PATH]",
            description: "rm removes the specified file/directory. It can't remove parent directories or the current directory."
        },
        mv: {
            run: function (params) {
                mv(params);
                saveFiles();
            },
            name: "mv - move (rename) files",
            synopsis: "mv SOURCE DEST | mv SOURCE DIRECTORY",
            description: "Rename SOURCE to DEST, or move SOURCE to DIRECTORY."
        },
        clear: {
            run: clear,
            name: "clear - clear the terminal screen",
            synopsis: "clear",
            description: "clear clears your screen if this is possible."
        },
        help: {
            run: help,
            name: "help - display a brief explanation of each command",
            synopsis: "help",
            description: "Display a shorthand manual with all the commands available"
        },
        man: {
            run: man,
            name: "man - an interface to the system reference manuals",
            synopsis: "man [COMMAND]",
            description: "man is the system's manual pager. Each page argument given to man is normally the name of a program, utility or function.  The manual page associated with each of these arguments is then found and displayed",
        },
        urbandict: {
            run: function (params) {
                urbandict(params);
            },
            name: "urbandict - search definitions of the given word",
            synopsis: "urbandict [STRING]",
            description: "Make a GET request to the Urban Dictionary API (https://www.urbandictionary.com/) and echo the results to standard output.",
        },
        js: {
            run: function (params) {
                js(params);
            },
            name: "js - evaluate the given file",
            synopsis: "js [FILE]",
            description: "evaluates the content of a given js file and shows the result of the evaluation",
        }
    }

    /** PUBLIC METHODS */

    return {
        has(command) {
            return command in commands;
        },
        run(command, params) {
            if (params == undefined) params = [];
            commands[command].run(params);
        },
        newLine: newLine,
        getInputValue: getInputValue,
        historyUp() {
            if (historyIndex < history.length - 1) {
                historyIndex += 1;
                setInputValue(history[historyIndex]);
            }
        },
        historyDown() {
            if (historyIndex >= 0) {
                historyIndex -= 1;
                setInputValue(history[historyIndex]);
            }
        },
        addToHistory(value) {
            if (value != "") {
                history.unshift(value);
                saveHistory();
            }
            historyIndex = -1;
        },

        autocomplete() {
            var value = getInputValue();
            var tokens = value.split(' ');
            var parent = tree.currentNode();
            var path = splitPath(tree.currentPath());
            if (value.length > 0) {
                if (tokens.length > 1) {
                    path = splitPath(tokens[tokens.length - 1])
                    parent = tree.findNode(path[0]);
                }
                try {
                    var child = getNextAvailableChild(parent, path[1]);
                    var newPath = autocompleteTail(path[0], child.name);
                    if (tokens.length > 1) tokens[tokens.length - 1] = newPath;
                    else tokens.push(child.name);
                    setInputValue(tokens.join(' '));
                } catch (error) {}
            }
        },

        resetTab() {
            tabs = [];
            tabsIndex = 0;
        },
    }

    /** PRIVATE METHODS */

    function js(params) {
        if (params.length != 1) {
            newLine("USAGE: js [FILE]");
            return;
        }
        var path = params[0]
        var file = tree.findNode(path)
        try {
            var result = tree.evaluateFile(file);
            newLine(result);
        } catch (error) {
            newLine(error);
        }
    }

    function urbandict(params) {
        if (params.length != 1) {
            newLine("USAGE: urbandict [STRING]");
            return;
        }
        var word = params[0];
        getMeanings(word).then(function (response) {
            if (response.length == 0) {
                newLine("No definitions were found for " + word);
            } else {
                newLine()
                response.forEach(function (item) {
                    cliLog("<strong>DEFINITION</strong>")
                    cliLog(item.definition.replace(/[\[\]]/g, ''));
                    cliLog("<strong>EXAMPLE</strong>");
                    cliLog(item.example.replace(/[\[\]]/g, ''));
                    cliLog("<strong>REFERENCE</strong>")
                    cliLog(item.permalink)
                    cliLog("<strong>- - - - - - - - - -</strong>")
                })
            }
        }).catch(function (error) {
            newLine(error);
        })
    }

    function help(params) {
        if (params.length > 0) {
            newLine("Usage: help");
            return;
        }
        newLine();
        for (var key of Object.keys(commands))
            cliLog(commands[key].name);
    }

    function man(params) {
        if (params.length != 1) {
            newLine("Usage: man [COMMAND]");
            return;
        }
        var command = params[0];
        if (!(command in commands)) {
            newLine("Error: " + command + " is not a valid command");
            return;
        }
        command = commands[command];
        newLine();
        cliLog("<strong>NAME</strong>")
        cliLog(command.name);
        cliLog("<strong>SYNOPSIS</strong>");
        cliLog(command.synopsis);
        cliLog("<strong>DESCRIPTION</strong>");
        cliLog(command.description);
    }

    function ls(params) {
        if (params.length > 2) {
            newLine("Usage: ls [option] [path]");
            return;
        }
        var flag = undefined;
        var dir = tree.currentNode();
        if (params.length == 1) {
            if (params[0].startsWith("-")) flag = params[0]
            else dir = tree.findNode(params[0])
        } else if (params.length == 2) {
            flag = params[0]
            dir = tree.findNode(params[1])
        }
        try {
            var result = tree.listNode(dir, flag);
            newLine()
            if (flag == "-R")
                for (var elem of result) cliLog(elem[1] + elem[0])
            else
                for (var elem of result) cliLog(elem.name)
        } catch (error) {
            newLine(error);
        }
    }

    function rm(params) {
        if (params.length != 1) {
            newLine("Usage: rm [path]");
            return;
        }
        var dir = tree.findNode(params[0]);
        try {
            tree.removeNode(dir);
            newLine();
        } catch (error) {
            newLine(error)
        }
    }

    function mv(params) {
        if (params.length != 2) {
            newLine("Usage: mv [from] [to]");
            return;
        }
        var from = tree.findNode(params[0])
        var to = tree.findNode(params[1])
        try {
            if (to == undefined) {
                var path = splitPath(params[1])
                var tail = path[0],
                    fromName = path[1]
                to = tree.findNode(tail)
                tree.moveNode(from, to, fromName);
            } else tree.moveNode(from, to);
            newLine()
        } catch (error) {
            newLine(error)
        }
    }

    function clear(params) {
        if (params.length > 0) {
            newLine("Usage: clear");
            return;
        }
        var clone = $("#main-inp").clone(true);
        $(".cli-out").empty();
        $(".cli-out").append(clone);
        clearInput();
    }

    function echo(params) {
        if (params.length != 1 && params.length != 3) {
            newLine("Usage: echo [str] [>|>>] [path]")
            return;
        }
        if (params.length == 1) {
            newLine(params[0])
            return;
        }
        if (params[1] != '>' && params[1] != '>>') {
            newLine("Usage: echo [str] [>|>>] [path]")
            return;
        }
        var path = splitPath(params[2])
        var name = path[1],
            tail = path[0]
        var dir = tree.findNode(tail);
        try {
            if (params[1] == ">>") tree.createFile(dir, name, params[0], true)
            else tree.createFile(dir, name, params[0])
            newLine();
        } catch (error) {
            newLine(error);
        }
    }

    function pwd(params) {
        if (params.length > 0) {
            newLine("Usage: pwd");
            return;
        }
        newLine(tree.currentPath())
    }

    function mkdir(params) {
        if (params.length != 1) {
            newLine("Usage: mkdir [path]");
            return;
        }
        var path = splitPath(params[0])
        var name = path[1],
            tail = path[0]
        var dir = tree.findNode(tail);
        try {
            tree.createDir(dir, name)
            newLine();
        } catch (error) {
            newLine(error);
        }
    }

    function cat(params) {
        if (params.length != 1) {
            newLine("Usage: cat [path]");
            return;
        }
        var file = tree.findNode(params[0]);
        try {
            var content = tree.getContent(file);
            newLine(content);
        } catch (error) {
            newLine(error);
        }
    }

    function cd(params) {
        if (params.length > 1) {
            newLine("Usage: cd [path]");
            return;
        }
        var dir = tree.root();
        if (params.length == 1) dir = tree.findNode(params[0]);
        try {
            tree.moveTo(dir);
            newLine();
        } catch (error) {
            newLine(error);
        }
    }

    /** LOCAL STORAGE METHODS */

    function getFilesFromStorage() {
        var item = localStorage.getItem("filetree");
        if (item != undefined)
            return deserializeTree(JSON.parse(item))
        return filesTree();
    }

    function saveFiles() {
        var item = tree.serialize();
        localStorage.setItem("filetree", JSON.stringify(item));
    }

    function getHistory() {
        var item = localStorage.getItem("history");
        if (item != undefined) return JSON.parse(item);
        return [];
    }

    function saveHistory() {
        localStorage.setItem("history", JSON.stringify(history));
    }

    /** DOM INTERACTION METHODS */

    function newLine(result) {
        var clone = cloneMainInp();
        $("#main-inp").before(clone);
        if (result != undefined)
            cliLog(result)
        $("#main-inp span").text(tree.currentPath());
        clearInput();
    }

    function cliLog(result) {
        $("#main-inp").before($('<p class="cmd-result">' + result + '</p>'))
    }

    function cloneMainInp() {
        var clone = $('<div class="cli-inp"></div>');
        var route = $('<p class="route">' + '<span>' + $("#main-inp span").text() + '</span> > ' + $("#main-inp input").val() + ' </p>');
        clone.append(route);
        return clone;
    }

    function clearInput() {
        $("#main-inp input").focus();
        $("#main-inp input").val("");
    }

    function setInputValue(value) {
        $("#main-inp input").val(value);
    }

    function getInputValue() {
        return $("#main-inp input").val().trim();
    }

    /** UTIL METHODS */

    function getMeanings(word) {
        return axios({
            "url": "https://mashape-community-urban-dictionary.p.rapidapi.com/define?term=" + word,
            "method": "get",
            "timeout": 0,
            "headers": {
                "x-rapidapi-key": "a3a58aad81mshba110cbc0274d35p1d8b24jsn848d26bf6933"
            },
        }).then(function (response) {
            return response.data.list;
        })
    }

    function splitPath(path) {
        var tailRegex = /^\S*\/[\.]*|^\.+$/gm;
        var baseRegex = /[\w\-\_]+$|([\w\-\_]*\.+\w+)$|([\w\-\_]+\.+\w*)$/gm;
        var tail = tailRegex.exec(path)
        var base = baseRegex.exec(path)
        tail = tail == null ? "." : tail[0]
        base = base == null ? "" : base[0]
        return [tail, base]
    }

    function getNextAvailableChild(parent, name) {
        if (tabs.length > 0) {
            var child = tabs[tabsIndex];
            tabsIndex = (tabsIndex + 1) % tabs.length;
            return child;
        }
        tabs = tree.listNode(parent);
        for (var i = 0; i < tabs.length; i++) {
            if (tabs[i].name.startsWith(name)) {
                var child = tabs[i];
                tabsIndex = (i + 1) % tabs.length;
                return child
            }
        }
        var child = tabs[tabsIndex];
        tabsIndex = (tabsIndex + 1) % tabs.length;
        return child;
    }

    function autocompleteTail(tail, newName) {
        return tail.endsWith("/") ? tail + newName :
            tail.startsWith(".") ? newName :
            tail + "/" + newName;
    }

}