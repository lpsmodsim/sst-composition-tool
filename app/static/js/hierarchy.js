/* ---------------------- EVENTS ---------------------- */

/* ---------------------- NODE EVENTS ---------------------- */
editor.on("nodeCreated", function (id) {
  newNodeId = parseInt(id);
  nodeHistory[id] = newNodeId;
});

editor.on("nodeRemoved", function (id) {
  // removedNodes = parseInt(id);
  // console.log("Node removed " + id);
});

editor.on("nodeSelected", function (id) {
  if ($("#group_nodes").is(":checked") && !selectedNodes.includes(id)) {
    selectedNodes.push(id);
    $("#group_nodes_msg").text("Nodes selected " + selectedNodes);
  }
});
/* ---------------------- NODE EVENTS ---------------------- */

$("#group_nodes").change(function (e) {
  e.preventDefault();

  if ($("#group_nodes").is(":checked")) {
    $("#group_nodes_msg").text("In grouping mode");
  } else {
    $("#group_nodes_msg").text("");
    selectedNodes.length = 0;
  }
});

$("#export_button").click(function (e) {
  e.preventDefault();
  var export_data = {
    data: editor.export()["drawflow"],
    library: $("#library").val(),
  };
  $.post("/export_drawflow_data", {
    drawflow_data: JSON.stringify(export_data),
  });
});
/* ---------------------- EVENTS ---------------------- */

$("#create_component").click(function (e) {
  var name = $("#component_name").val();
  var desc = $("#component_desc").val();
  var $params = $("#component_params :input");

  var paramValues = {};
  var paramKey = "";
  $params.each(function () {
    var valueId = $(this).attr("id");
    if (valueId.includes("label")) {
      paramKey = $(this).val();
    } else {
      paramValues[paramKey] = $(this).val();
    }
  });

  var $links = $("#component_links :input");

  var linkValues = {};
  var linkKey = "";
  $links.each(function () {
    var valueId = $(this).attr("id");
    if (valueId.includes("label")) {
      linkKey = $(this).val();
    } else {
      linkValues[linkKey] = $(this).val();
    }
  });

  console.log(paramValues, linkValues);
});

$("#group_button").click(function (e) {
  if (selectedNodes.length) {
    var groupName = $("#group_nodes_name").val();

    if (groupName && !groupNamesSet.has(groupName)) {
      groupNamesSet.add(groupName);

      $("#group_nodes_msg").text("Created: " + groupName);
      editor.addModule(groupName);
      editor.changeModule(groupName);
      var newModuleDivHtml = String.format(NEWMODULEDIVHTML, groupName);
      $(newModuleDivHtml).appendTo("#hierarchy");
      moveNodesToModule(groupName, selectedNodes);

      // reset variables and states
      selectedNodes.length = 0;
      groupedNum++;
      $("#group_nodes_name").val("group_name_" + groupedNum);
      $("#group_nodes").prop("checked", false);
    }
  }
});

function allowDrop(ev) {
  ev.preventDefault();
}

function drag(ev) {
  ev.dataTransfer.setData("node", ev.target.getAttribute("data-node"));
}

function drop(ev) {
  ev.preventDefault();
  var data = ev.dataTransfer.getData("node");
  addNodeToDrawFlow(data, ev.clientX, ev.clientY);
}

function addNodeToDrawFlow(name, pos_x, pos_y) {
  if (editor.editor_mode === "fixed") {
    return false;
  }
  pos_x =
    pos_x *
      (editor.precanvas.clientWidth /
        (editor.precanvas.clientWidth * editor.zoom)) -
    editor.precanvas.getBoundingClientRect().x *
      (editor.precanvas.clientWidth /
        (editor.precanvas.clientWidth * editor.zoom));
  pos_y =
    pos_y *
      (editor.precanvas.clientHeight /
        (editor.precanvas.clientHeight * editor.zoom)) -
    editor.precanvas.getBoundingClientRect().y *
      (editor.precanvas.clientHeight /
        (editor.precanvas.clientHeight * editor.zoom));
  editor.addNode(
    name,
    dfBoxDivs[name]["links"]["inputs"].length,
    dfBoxDivs[name]["links"]["outputs"].length,
    pos_x,
    pos_y,
    name,
    { links: dfBoxDivs[name]["links"], param: dfBoxDivs[name]["param"] },
    dfBoxDivs[name]["html"]
  );
}

function changeModule(event) {
  var all = document.querySelectorAll(".menu ul li");
  for (var i = 0; i < all.length; i++) {
    all[i].classList.remove("selected");
  }
  event.target.classList.add("selected");
}

function moveConnectionsToModule(newConnectionsArr) {
  for (const i in newConnectionsArr) {
    const outputList = newConnectionsArr[i]["outputs"];
    for (const j in outputList) {
      var newOutputs = outputList[j]["connections"];
      if (newOutputs.length) {
        for (const k in newOutputs) {
          editor.addConnection(
            nodeHistory[newConnectionsArr[i]["old_id"]],
            nodeHistory[newOutputs[k]["node"]],
            j,
            newOutputs[k]["output"]
          );
        }
      }
    }
  }
}

function addGroupNodesConnectionLabels(groupName, newNamesArr, io) {
  var ioStyles = "";
  var newNumIos = 0;
  for (const i in newNamesArr) {
    const ioArr = dfBoxDivs[newNamesArr[i]]["links"][io];
    for (var j = 0; j < ioArr.length; j++) {
      ioStyles += String.format(
        IOSTYLE,
        groupName,
        io,
        io.substring(0, io.length - 1),
        newNumIos + 1,
        ioArr[j],
        io === "inputs" ? "right: 120" : "left: 30"
      );

      newNumIos++;
    }
  }
  return ioStyles;
}

function addGroupNodesStyles(groupName, newNamesArr) {
  const inputStyles = addGroupNodesConnectionLabels(
    groupName,
    newNamesArr,
    "inputs"
  );
  const outputStyles = addGroupNodesConnectionLabels(
    groupName,
    newNamesArr,
    "outputs"
  );

  var newElementStyle = String.format(
    NEWELEMENTSTYLE,
    inputStyles + outputStyles,
    groupName
  );
  $(newElementStyle).appendTo("head");
}

function moveNodesToModule(groupName, selectedNodes) {
  function mapNewLinks(arr, nodeId) {
    return arr.map(function (e) {
      e += "#" + nodeId;
      return e;
    });
  }

  var totalInputs = 0;
  var totalOutputs = 0;
  var minPosX = Infinity;
  var minPosY = Infinity;

  var newLinks = { inputs: [], outputs: [] };
  var newParams = [];

  const newConnectionsArr = [];
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
    editor.addNode(
      newName,
      numInputs,
      numOutputs,
      newPosX,
      newPosY,
      newName,
      newData,
      newHTML
    );
    nodeHistory[oldNode["id"]] = newNodeId;
    newConnectionsArr.push({ old_id: oldNode["id"], outputs: newOutputs });

    newNamesArr.push(newName);
    totalInputs += numInputs;
    totalOutputs += numOutputs;
    minPosX = Math.min(minPosX, newPosX);
    minPosY = Math.min(minPosY, newPosY);

    newLinks["inputs"] = newLinks["inputs"].concat(
      mapNewLinks(newData["links"]["inputs"], newNodeId)
    );
    newLinks["outputs"] = newLinks["outputs"].concat(
      mapNewLinks(newData["links"]["outputs"], newNodeId)
    );
    newParams.push({ [newName]: newData["param"] });
  }

  moveConnectionsToModule(newConnectionsArr);

  editor.changeModule("Home");
  var newElementDivHtml = String.format(NEWELEMENTDIVHTML, groupName);
  $(newElementDivHtml).appendTo("#element_list");

  var newGroupNodeHTML = String.format(NEWGROUPNODEHTML, groupName);

  dfBoxDivs[groupName] = {};
  dfBoxDivs[groupName]["html"] = newGroupNodeHTML;
  dfBoxDivs[groupName]["links"] = newLinks;
  dfBoxDivs[groupName]["param"] = newParams;
  editor.addNode(
    groupName,
    totalInputs,
    totalOutputs,
    minPosX,
    minPosY,
    groupName,
    { links: newLinks, param: newParams },
    newGroupNodeHTML
  );

  addGroupNodesStyles(groupName, newNamesArr);
}
