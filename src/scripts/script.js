$(function () {
    var cli = createCli();
    var ctrl_down = false;

    /** EVENT LISTENERS */
    $(".cli-out").click(function () {
        $("#main-inp input").focus();
    });

    $(".cli-out").keydown(function (e) {
        // on ENTER
        if (e.which == 13) {
            var value = cli.getInputValue();
            cli.addToHistory(value);
            cmd(value);
        }
        // on CTRL
        if (e.which == 17) ctrl_down = true;
        // on L
        if (e.which == 76 && ctrl_down) {
            e.preventDefault();
            cli.run("clear");
            ctrl_down = false;
        }
        // on ARROW UP
        if (e.which == 38) cli.historyUp();
        // on ARROW DOWN
        if (e.which == 40) cli.historyDown();
        // on TAB
        if(e.which == 9)  {
            e.preventDefault();
            cli.autocomplete();
        } else cli.resetTab();
    });
    $(".cli-out").keyup(function (e) {
        // on CTRL UP
        if (e.which == 17) ctrl_down = false;
    });

    /** FUNCTIONS */

    function cmd(value) {
        var seq = value.split(' ');
        var command = seq[0];
        var params = seq.splice(1);
        if (cli.has(command))
            cli.run(command, params);
        else if (command == "")
            cli.newLine();
        else
            cli.newLine("Command not found: " + command);
    }
});