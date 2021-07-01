/* ---------------------- EVENTS ---------------------- */

/* ---------------------- NODE EVENTS ---------------------- */
editor.on("nodeCreated", function(id) {
    console.log("Node created " + id);
    newNodeId = parseInt(id);
    oldToNewNodeMap[id] = newNodeId;
})

editor.on("nodeRemoved", function(id) {
    // removedNodes = parseInt(id);
    console.log("Node removed " + id);
})

editor.on("contextmenu", function(id) {
    // removedNodes = parseInt(id);
    console.log("yo what " + id);
})

editor.on("nodeSelected", function(id) {
    if ($("#group_nodes").is(":checked") && !selectedNodes.includes(id)) {
        selectedNodes.push(id);
        $("#group_nodes_msg").text("Nodes selected " + selectedNodes);
    }
    // generateIODropdown(id, editor.getNodeFromId(id)["name"], "input");
});
/* ---------------------- NODE EVENTS ---------------------- */

$("#group_nodes").change(function(e) {
    e.preventDefault();

    if ($("#group_nodes").is(":checked")) {

        $("#group_nodes_msg").text("In grouping mode");

    } else if (selectedNodes.length) {

        var groupName = $("#group_nodes_name").val();

        if (groupName && !groupNamesSet.has(groupName)) {

            groupNamesSet.add(groupName);

            $("#group_nodes_msg").text("Created: " + groupName);
            editor.addModule(groupName);
            editor.changeModule(groupName);
            var newModuleDivHtml = "<li onclick=\"editor.changeModule('" + groupName +
                                   "'); changeModule(event);\">" + groupName + "</li>";
            $(newModuleDivHtml).appendTo("#hierarchy");
            moveNodesToModule(groupName, selectedNodes);

            // reset variables and states
            selectedNodes.length = 0;
            groupedNum++;
            $("#group_nodes_name").val('group_name_' + groupedNum);
        }
    }
})

$("#export_button").click(function(e) {
    e.preventDefault();
    $.post("/export_drawflow_data", {drawflow_data : JSON.stringify(editor.export())});
});
/* ---------------------- EVENTS ---------------------- */

function allowDrop(ev) { ev.preventDefault(); }

function drag(ev) { ev.dataTransfer.setData("node", ev.target.getAttribute("data-node")); }

function drop(ev) {
    ev.preventDefault();
    var data = ev.dataTransfer.getData("node");
    addNodeToDrawFlow(data, ev.clientX, ev.clientY);
}

function addNodeToDrawFlow(name, pos_x, pos_y) {
    if (editor.editor_mode === "fixed") {
        return false;
    }
    pos_x = pos_x * (editor.precanvas.clientWidth / (editor.precanvas.clientWidth * editor.zoom)) -
            (editor.precanvas.getBoundingClientRect().x *
             (editor.precanvas.clientWidth / (editor.precanvas.clientWidth * editor.zoom)));
    pos_y =
        pos_y * (editor.precanvas.clientHeight / (editor.precanvas.clientHeight * editor.zoom)) -
        (editor.precanvas.getBoundingClientRect().y *
         (editor.precanvas.clientHeight / (editor.precanvas.clientHeight * editor.zoom)));
    editor.addNode(name, dfBoxDivs[name]["link"]["input"].length,
                   dfBoxDivs[name]["link"]["output"].length, pos_x, pos_y, name, {},
                   dfBoxDivs[name]["html"]);
}

function changeModule(event) {
    var all = document.querySelectorAll(".menu ul li");
    for (var i = 0; i < all.length; i++) {
        all[i].classList.remove("selected");
    }
    event.target.classList.add("selected");
}

function changeMode(option) {
    if (option == "lock") {
        lock.style.display = "none";
        unlock.style.display = "block";
    } else {
        lock.style.display = "block";
        unlock.style.display = "none";
    }
}

function moveConnectionsToModule(newConnections) {

    for (const i in newConnections) {

        const outputList = newConnections[i]["outputs"];
        for (const j in outputList) {

            var newOutputs = outputList[j]["connections"];
            if (newOutputs.length) {
                for (const k in newOutputs) {
                    editor.addConnection(oldToNewNodeMap[newConnections[i]["old_id"]],
                                         oldToNewNodeMap[newOutputs[k]["node"]], j,
                                         newOutputs[k]["output"]);
                }
            }
        }
    }
}

function addGroupNodesConnectionLabels(groupName, newNamesArr, io) {
    var ioStyles = "";
    var newNumIos = 0;
    for (const i in newNamesArr) {

        const ioArr = dfBoxDivs[newNamesArr[i]]["link"][io];
        for (var j = 0; j < ioArr.length; j++) {

            dfBoxDivs[groupName]["link"][io].push(ioArr[j]);
            ioStyles += `
.drawflow-node.` + groupName +
                        ` .` + io + `s .` + io + `:nth-child(` + (newNumIos + 1) + `):before {
  display: block;
  content: "` + ioArr[j] +
                        `";
  position: relative;
  ` + (io === "input" ? "right: 120" : "left: 30") +
                        `px;
}
                   `;
            newNumIos++;
        }
    }
    return ioStyles;
}

function updateIO(cb, elementName, io, ioName) {
    console.log(cb, elementName, io, ioName);
    if (!cb.checked) {
    }
}

function generateIODropdown(id, elementName, io) {

    const ioList = dfBoxDivs[elementName]["link"][io];

    var checkboxes = $("#element_inputs");
    var options = '';
    for (var val in ioList) {
        options += '<input type="checkbox" onclick="updateIO(this, \'' + elementName + '\', \'' +
                   io + '\', \'' + ioList[val] + '\');" name="' + ioList[val] + '" checked/>' +
                   ioList[val] + '<br />';
    }
    console.log(options);
    checkboxes.html(options);
}

function addGroupNodesStyles(groupName, newNamesArr) {

    dfBoxDivs[groupName]["link"] = {"input" : [], "output" : []};
    const inputStyles = addGroupNodesConnectionLabels(groupName, newNamesArr, "input");
    const outputStyles = addGroupNodesConnectionLabels(groupName, newNamesArr, "output");

    var newElementStyle = `<style type='text/css'>` + inputStyles + outputStyles + `
.drawflow-node.` + groupName +
                          ` {
  background: #2c3e50;
  text-align: center;
  color: #1abc9c;
}
  </style>
  `;
    $(newElementStyle).appendTo("head");
}

function moveNodesToModule(groupName, selectedNodes) {

    var totalInputs = 0;
    var totalOutputs = 0;
    var minPosX = Infinity;
    var minPosY = Infinity;

    const newConnections = [];

    const newNamesArr = [];

    for (var i = 0; i < selectedNodes.length; i++) {

        // get node of current module
        var oldNode = editor.getNodeFromId(selectedNodes[i]);

        // expand values into variables
        var newName = oldNode["name"];
        var newInputs = oldNode["inputs"];
        var newOutputs = oldNode["outputs"];
        var newPosX = oldNode["pos_x"];
        var newPosY = oldNode["pos_y"];
        var newData = oldNode["data"];
        var newHTML = oldNode["html"];
        var numInputs = Object.keys(newInputs).length;
        var numOutputs = Object.keys(newOutputs).length;

        editor.removeNodeId("node-" + oldNode["id"]);
        editor.addNode(newName, numInputs, numOutputs, newPosX, newPosY, newName, newData, newHTML);
        oldToNewNodeMap[oldNode["id"]] = newNodeId;
        newConnections.push({"old_id" : oldNode["id"], "outputs" : newOutputs});

        newNamesArr.push(newName);
        totalInputs += numInputs;
        totalOutputs += numOutputs;
        minPosX = Math.min(minPosX, newPosX);
        minPosY = Math.min(minPosY, newPosY);
    }

    moveConnectionsToModule(newConnections);

    editor.changeModule("Home");
    var newElementDivHtml = `
  <div class="drag-drawflow" draggable="true" ondragstart="drag(event)" data-node="` +
                            groupName + `" style="background: #2c3e50; color: #1abc9c;">
  <i class="fas fa-code"></i><span> ` +
                            groupName + `</span>
  </div>
  `;
    $(newElementDivHtml).appendTo("#element_list");

    var newGroupNodeHTML = `
  <div class="dbclickbox" ondblclick="editor.changeModule('` +
                           groupName + `')">` + groupName + `</div>
  `;
    dfBoxDivs[groupName] = {};
    dfBoxDivs[groupName]["html"] = newGroupNodeHTML;
    editor.addNode(groupName, totalInputs, totalOutputs, minPosX, minPosY, groupName, {},
                   newGroupNodeHTML);

    addGroupNodesStyles(groupName, newNamesArr);
}
