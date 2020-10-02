function filesTree(root) {
    /** PRIVATE ATTRIBUTES */
    if (root == undefined) root = {
        parent: null,
        childs: {},
        name: "/",
        time: Date.now(),
        type: "d",
    }
    var currentDir = root;

    /** PUBLIC METHODS */
    return {
        currentPath() {
            return getPath(currentDir);
        },

        currentNode() {
            return currentDir;
        },

        root() {
            return root;
        },

        findNode(path) {
            var node = currentDir;
            if (path == "/") return root;
            if (path == ".") return currentDir;
            if (path.startsWith("/")) node = root;
            tokens = path.replace(/\//g, " ").trim().split(" ")
            
            for (var i = 0; i < tokens.length; i++) {
                if (tokens[i] == '.') continue;
                if (tokens[i] == ".." && node.parent != null)
                    node = node.parent;
                else if (tokens[i] == ".." && node.parent == null) continue;
                else {
                    if (tokens[i] in node.childs) {
                        if (isdir(node.childs[tokens[i]]))
                            node = node.childs[tokens[i]];
                        else return node.childs[tokens[i]]
                    } else return undefined;
                }
            }
            return node;
        },

        listNode(node, flag) {
            var validFlags = ["-S", "-R", "-t"];
            var result = []
            if (node == undefined) throw Error("Path not found");
            if (isfile(node)) throw Error("Can't list a file");
            if (flag != undefined && !validFlags.includes(flag)) throw Error("Invalid option");

            if (flag == "-R") result = listRecursive(node)
            else {
                for (var key of Object.keys(node.childs)) result.push(node.childs[key])
                if (flag == "-S") result.sort(compareSize);
                else if (flag == "-t") result.sort(compareTime);
            }
            return result
        },

        removeNode(node) {
            if (node == undefined) throw Error("Path not found");
            if (isChild(currentDir, node)) throw Error("Can't remove a parent directory");
            if (node == currentDir) throw Error("Can't remove the current directory");
            delete node.parent.childs[node.name];
        },

        moveNode(from, to, newName) {
            if (from == undefined || to == undefined) throw Error("Path not found");
            if (from == root) throw Error("Can't move the root directory");
            if (from == currentDir) throw Error("Can't move the current directory");
            if (from == to) throw Error("File already exists");
            if (isdir(from) && isChild(currentDir, from)) throw Error("Can't move a parent directory");
            if (isChild(to, from)) throw Error("Can't move a file to a child");
            if (isdir(from) && isfile(to)) throw Error("cannot overwrite non-directory with directory");            

            this.removeNode(from);
            from.time = Date.now()
            if (isdir(to)) {
                from.parent = to;
                if (newName) from.name = newName;
            } else {
                from.name = to.name;
                from.parent = to.parent;
            }
            from.parent.childs[from.name] = from;
        },

        createDir(parent, name) {
            if (parent == undefined) throw Error("Path not found");
            if (isfile(parent)) throw Error(getPath(parent) + " is a file")
            if (name in parent.childs) throw Error("Folder already exists");
            if (name == "") throw Error(getPath(parent) + " already exists");

            parent.childs[name] = {
                name: name,
                parent: parent,
                childs: {},
                time: Date.now(),
                type: "d",
            }
        },

        createFile(parent, name, content, append) {
            if (parent == undefined) throw Error("Path not found");
            if (isfile(parent)) throw Error(getPath(parent) + " is a file")
            if (name == "") throw Error("Name undefined");
            if (name in parent.childs && isdir(parent.childs[name])) throw Error(name + " is a directory");

            parent.childs[name] = {
                name: name,
                parent: parent,
                content: append && name in parent.childs ? parent.childs[name].content + '\n' + content : content,
                time: Date.now(),
                type: "f",
            }
        },

        evaluateFile(file) {
            if(file == undefined) throw Error("Path not found");
            if(!isfile(file)) throw Error("Can't evaluate a directory");
            return eval(file.content);
        },

        moveTo(node) {
            if(node == undefined) throw Error("Path not found")
            if (node != undefined && isfile(node)) throw Error("Cannot move to a file");
            currentDir = node ? node : root;
        },

        getContent(file) {
            if (file == undefined) throw Error("Path not found");
            if (isdir(file)) throw Error("Cannot read a directory");
            return file.content;
        },

        serialize() {
            return serializeNode(root);
        },
    }

    /** PRIVATE METHODS */
    function compareSize(a, b) {
        var size1 = getNodeSize(a)
        var size2 = getNodeSize(b)
        if (size1 < size2) return 1
        if (size1 > size2) return -1
        return 0
    }

    function getNodeSize(node) {
        if (isfile(node)) return 2 * node.content.length
        var size = 0;
        for (var key of Object.keys(node.childs)) size += getNodeSize(node.childs[key])
        return 4096 + size;
    }

    function compareTime(a, b) {
        if (a.time < b.time) return 1
        if (a.time > b.time) return -1
        return 0
    }

    function listRecursive(node, level, result) {
        if (level == undefined) level = 0;
        if (result == undefined) result = [];
        var tabs = '&nbsp&nbsp&nbsp'.repeat(level);
        result.push([node.name, tabs]);
        if (isdir(node)) {
            for (var key of Object.keys(node.childs))
                listRecursive(node.childs[key], level + 1, result)
        }
        return result;
    }

    function isdir(node) {
        return node.type == "d";
    }

    function isfile(node) {
        return node.type == "f";
    }

    function isChild(child, parent) {
        if (child == null || parent == null) return false
        if (child.parent == parent) return true;
        return isChild(child.parent, parent)
    }

    function getPath(node, path) {
        if (path == undefined) path = "";
        if (node == root) return "/" + path;
        var next = path == "" ? node.name : node.name + "/" + path;
        return getPath(node.parent, next);
    }

    function serializeNode(node, result, parentId) {
        if (result == undefined) result = {}
        var id = generateUniqueId(result);

        if (parentId != undefined) result[parentId].childs.push(id);
        result[id] = Object.assign({}, node);
        result[id].parent = parentId;

        if (isdir(node)) {
            var childs = node.childs;
            result[id].childs = []
            for (var key of Object.keys(childs))
                serializeNode(childs[key], result, id)
        }
        return result
    }

    function generateUniqueId(obj) {
        var id = s4() + '-' + s4();
        while (id in obj) {
            id = s4() + '-' + s4();
        }
        return id;
    }

    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
}

/** FILES TREE CONSTRUCTOR FROM SERIALIZED OBJECT */

function deserializeTree(obj) {
    var rootNode = {}
    for (var key of Object.keys(obj)) {
        if (obj[key].name == "/") {
            rootNode = obj[key];
            break;
        }
    }
    deserializeNode(rootNode, obj);
    return filesTree(rootNode);

    function deserializeNode(node, storage) {
        if (node.parent != null) node.parent = storage[node.parent]
        if (node.type == "d") {
            var childs = node.childs;
            node.childs = {}
            for (var id of childs) {
                var child = storage[id];
                node.childs[child.name] = child;
                deserializeNode(child, storage);
            }
        }
    }
}