/*
  Javascript version: ECMAScript 6 (Javascript 6)
 */

var loaded_plates = null;
var animation = null;

function getLoadedPlate() {
  // return first (and only) plate
  return loaded_plates[Object.keys(loaded_plates)[0]];
}

function getLoadedPlateName() {
  // return key of first (and only) plate
  return Object.keys(loaded_plates)[0];
}

function apiQuery(event) {
  event.preventDefault();

  document.getElementById("left-sidebar-spinner").style.visibility = "visible";

  fetch('/api/query', {
    method: 'POST',
    body: new FormData(document.getElementById('query-form'))})
        .then(response => response.json())
        .then(data => {

          console.log('data', data);

          console.log('hiding spinner');
          document.getElementById("left-sidebar-spinner").style.visibility = "hidden";

          queryResultLoaded(data);

        })
        .catch(error => console.error('Error:', error));
}

function queryResultLoaded(data) {
  let queryResults = data.results;
  drawPlatesListSidebar(queryResults);
}

function drawPlatesListSidebar(queryResults){

  let list = document.getElementById('result-list');

  // Clear menu
  removeChildren(list);

  let last_proj = "";
  let plate_list = null;
  // Create sidebar as nested lists from query result
  queryResults.forEach(result => {

    // Create a list with all projects
    let proj = result._id.project;
    let plate = result._id.plate;

    // create a new sublist for each project
    if (last_proj != proj) {
      let proj_item = document.createElement('li');
      proj_item.innerHTML = "<span style='cursor: pointer;''>" + proj + "</span>";
      list.appendChild(proj_item);
      plate_list = document.createElement('ul');
      proj_item.appendChild(plate_list);
    }

    // Create a list item for the plate
    let plate_item = document.createElement('li');
    let link = document.createElement('a');
    link.className = "text-info";
    link.href = "";
    let linktext = plate;
    let content = document.createTextNode(linktext);
    link.appendChild(content);
    plate_item.appendChild(link);

    // Add plate click handler
    plate_item.onclick = function (e) {
      e.preventDefault();
      loadPlate(plate)
    };

    // add plate item to projects plate_list
    plate_list.appendChild(plate_item);
    last_proj = proj;
  })


  //
  // Turn sidebar list into a clickable tree-view with projects collapsed
  // with this jQuery plugin
  //
  $('#result-list').bonsai({
    expandAll: false, // expand all items
    expand: null, // optional function to expand an item
    collapse: null, // optional function to collapse an item
    addExpandAll: false, // add a link to expand all items
    addSelectAll: false, // add a link to select all checkboxes
    selectAllExclude: null, // a filter selector or function for selectAll
    createInputs: false,
    checkboxes: false, // run qubit(this.options) on the root node (requires jquery.qubit)
    handleDuplicateCheckboxes: false //update any other checkboxes that have the same value
  });

  // Tweak to get clickable project-names instead of only the little arrow
  // the project names are enclosed in <span></span>
  // https://github.com/aexmachina/jquery-bonsai/issues/23
  $('#result-list').on('click', 'span', function () {
    $(this).closest('li').find('> .thumb').click();
  });

}

function loadPlateFromViewer(plate_name, timepoint, well, wellsample, channel){

  // stop any current animation
  stopAnimation();
  document.getElementById("animate-cbx").checked = false;

  fetch('/api/list/' + plate_name)
        .then(response => response.json())
        .then(data => {

          window.loaded_plates = data['data'].plates;
          console.log(window.loaded_plates);

          updateToolbar();

          setSelectedTimepoint(timepoint);
          setWellSelection(well);
          setWellsampleSelection(wellsample);
          setChannelSelection(channel);

        })
        .catch(error => {
          console.error('Error:', error);
        })
}

function loadPlate(plate_name) {

  // stop any current animation
  stopAnimation();
  document.getElementById("animate-cbx").checked = false;

  fetch('/api/list/' + plate_name)
        .then(response => response.json())
        .then(data => {

          window.loaded_plates = data['data'].plates;
          console.log(window.loaded_plates);

          updateToolbar();

          redrawPlate(true);

        })
        .catch(error => {
          console.error('Error:', error);
        })
}


function updateToolbar() {

  updatePlateNameLabel(getLoadedPlateName());
  updateMetaData(getLoadedPlate());
  updateTimepointSelect(getLoadedPlate());
  updateTimepointSlider(getLoadedPlate());
  updateWellSelect(getLoadedPlate());
  updateWellsampleSelect(getLoadedPlate());
  updateChannelSelect(getLoadedPlate());
  updateMetaData(getLoadedPlate());

   // Enable Animate checkbox
  if (countTimepoints(getLoadedPlate()) > 1){
    document.getElementById("animate-cbx").disabled = false;
  }
}


function redrawPlateAndViewer(clearFirst = false) {

  if (document.getElementById('viewer-div')) {
    redrawImageViewer(clearFirst);
  }
  if (document.getElementById('table-div')) {
    redrawPlate(clearFirst);
  }
}

function redrawImageViewer(clearFirst = false) {

  console.log("inside redrawImageViewer()");

  // get what to redraw
  let timepoint = getSelectedTimepointIndex();
  let wellsample = getSelectedWellsampleIndex();
  let well_name = getSelectedWell();
  let channels = getLoadedPlate()[timepoint][well_name][wellsample];
  let imgURL = createMergeImgURLFromChannels(channels);

  // http://18.62.11.24/Nora/030917_Norm_1_bot/zstack.html

  viewer.addSimpleImage({
    opacity: 1,
    preload: false,
    type: 'image',
    url:  imgURL,
    buildPyramid: false,
    success: function(event) {

        console.log("image-loaded");

        console.log(viewer.world.getItemCount());

        // Remove old items
        let nCount = viewer.world.getItemCount();
        for( let n=0; n + 1 < nCount; n++){
          viewer.world.removeItem(viewer.world.getItemAt(n));
        }


        // var delay = Math.max(1, endTime - Date.now());
        // setTimeout(function() {
        //   viewer.world.removeItem(oldTiledImage);
        //   tiledImage.setOpacity(1);
        //   frameLoaded(tiledImage);
        // }, delay);

//      if (tiledImage.getFullyLoaded()) {
//        ready();
//      } else {
//        tiledImage.addOnceHandler('fully-loaded-change', ready);
//      }
    }
  });

  console.log("done redrawImageViewer()");

}

function openViewer(well_name) {

  let timepoint = getSelectedTimepointIndex();
  let wellsample = getSelectedWellsampleIndex()
  let channels = getLoadedPlate()[timepoint][well_name][wellsample];

  let imgURL = createMergeImgURLFromChannels(channels);

  let viewerURL = "/image-viewer/" +
        getLoadedPlateName() + "/" +
        timepoint + "/" +
        well_name + "/" +
        wellsample + "/" +
        getSelectedChannelValue() + "/" +
        imgURL

  //window.open(viewerURL, "ImageViewerWindow");
  window.open(viewerURL);

}

function openViewerInMainDiv(imageURL) {
  let container = document.getElementById('table-div');
  removeChildren(container);

  var viewer = OpenSeadragon({
    id: "table-div",
    prefixUrl: "/static/openseadragon/images/",
    animationTime: 0.5, // default 1.2
    zoomPerSecond: 1, // default: 1
    zoomPerScroll: 1.4, // default: 1.2
    minZoomImageRatio: 0.9, // default: 0.8
    maxZoomPixelRatio: 10,  // deault: 2
    tileSources: {
      type: 'image',
      url: imageURL,
      buildPyramid: false
    }
  });

}



function redrawPlate(clearFirst = false) {
  // get plate to draw
  let plateObj = getLoadedPlate();

  // get timepoint to draw
  let timepoint = getSelectedTimepointIndex();

  // get wellsample to draw
  let wellsample = getSelectedWellsampleIndex();

  drawPlate(plateObj, timepoint, wellsample, clearFirst);
}

function createEmptyTable(rows, cols) {
  let table = document.createElement('table');
  table.id = 'plateTable';
  table.className = 'plateTable';

  // First add header row
  let headerRow = document.createElement('tr');
  for (let col = 1; col <= cols; col++) {
    // If first col then add empty cell before (to match column headers)
    if (col == 1) {
      let empty_cell = document.createElement('td');
      empty_cell.innerHTML = "";
      empty_cell.className = 'headerCell';
      headerRow.appendChild(empty_cell);
    }
    let row = 0;
    let well_name = getWellName(row, col);
    let header_cell = document.createElement('td');
    header_cell.innerHTML = well_name.substring(1);
    header_cell.className = 'headerCell';
    headerRow.appendChild(header_cell);
  }
  table.appendChild(headerRow);

  // Now add rows and columns
  for (let row = 0; row < rows; row++) {
    let rowElement = document.createElement('tr');
    for (let col = 1; col <= cols; col++) {

      let well_name = getWellName(row, col);

      // Add column header before first column cell
      if (col == 1) {
        let header_cell = document.createElement('td');
        header_cell.innerHTML = well_name.charAt(0);
        header_cell.className = 'headerCell';
        rowElement.appendChild(header_cell);
      }

      let well_cell = document.createElement('td');
      well_cell.id = well_name;
      well_cell.className = 'wellCell';
      rowElement.appendChild(well_cell);
    }
    table.appendChild(rowElement);
  }

  return table;
}

function drawPlate(plateObj, timepoint, wellsample, clearFirst) {

  console.log(plateObj);

  let container = document.getElementById('table-div');

  if (container)

  // If for example a new plate have been selected
  // all old well_images should be removed since plate layout might change
    if (clearFirst) {
      removeChildren(container);
    }

  // first create a new plate consisting of empty well-div's
  // TODO fix for other plate sizes
  if (document.getElementById('plateTable') == null) {
    let rows = 8;
    let cols = 12;
    let table = createEmptyTable(rows, cols);
    container.appendChild(table);
  }

  console.log(container);
  console.log('done create div');
  console.log('plate:' + plateObj);

  // now populate well-div's with the plateObj contents
  Object.keys(plateObj[timepoint]).forEach(well => {

    let channels = plateObj[timepoint][well][wellsample];
    //console.log('channels:' + channels);

    let well_cell = document.getElementById(well);

    // Try to get existing canvas - if it doesn't exist create it
    // this way we are only drawing images on top of existing images
    // and animation becomes smooth
    let wellCanvas = document.getElementById('wellCanvas' + well);
    if (wellCanvas == null) {

      wellCanvas = document.createElement('canvas');
      wellCanvas.className = 'wellCanvas';
      wellCanvas.id = 'wellCanvas' + well;

      // TODO fix resizing of canvas
      // Canvas size should not be set with css-style
      wellCanvas.width = 100;
      wellCanvas.height = 100;

      well_cell.appendChild(wellCanvas);
    }

    let context = wellCanvas.getContext('2d');
    let url = createMergeThumbImgURLFromChannels(channels);
    let img = document.createElement('img');
    img.src = url;
    img.className = 'wellThumbImg';
    img.id = 'wellThumbImg' + well;

    img.onload = function () {
      context.drawImage(img, 0, 0);
    }

    // Create open Viewer click handlers
    wellCanvas.onclick = function () {
      openViewer(well);
    }

  })
}


function getSelectedTimepointIndex() {
  let elem = document.getElementById('timepoint-select');
  return parseInt(elem.options[elem.selectedIndex].value);
}

function setSelectedTimepoint(index) {
  let elem = document.getElementById('timepoint-select');
  // TODO Can not update this due to recursion from slider onChange method
  elem.selectedIndex = index - 1;
  //elem.options[elem.selectedIndex].value = index;
  updateTimepointSliderPos();
  console.log("set ix=" + index);
  redrawPlateAndViewer();
}

function getSelectedChannelValue() {
  let elem = document.getElementById('channel-select');
  return elem.options[elem.selectedIndex].value;
}

function getSelectedWellsampleIndex() {
  let elem = document.getElementById('wellsample-select');
  return parseInt(elem.options[elem.selectedIndex].value);
}

function getSelectedWell() {
  let elem = document.getElementById('well-select');
  return elem.options[elem.selectedIndex].value;
}

function getSelectedAnimationSpeed() {
  let elem = document.getElementById('animation-speed-select');
  return parseInt(elem.options[elem.selectedIndex].value);
}


function updateTimepointSelect(plateObj) {
  elemSelect = document.getElementById('timepoint-select');

  // reset
  elemSelect.options.length = 0;

  // add as many options as timepoints
  let nCount = countTimepoints(plateObj);
  for (let n = 0; n < nCount; n++) {
    elemSelect.options[n] = new Option(n + 1);
  }
}

function updateTimepointSliderPos() {
  // Get slider function
  let slider = $("#timepoint-slider").data("ionRangeSlider");

  nSelected = getSelectedTimepointIndex();

  // update
  slider.update({
    from: nSelected
  });
}

function updateTimepointSliderPos() {
  nSelected = getSelectedTimepointIndex();

  // update
  let slider = $("#timepoint-slider").data("ionRangeSlider");
  slider.update({
    from: nSelected
  });
}


function updateTimepointSlider(plateObj) {
  let nCount = countTimepoints(plateObj);

  // disable if single timepoint
  if (nCount == 1) {
    disable = true;
  } else {
    disable = false;
  }

  // Get slider function
  let slider = $("#timepoint-slider").data("ionRangeSlider");

  nSelected = getSelectedTimepointIndex();

  // update
  slider.update({
    from: nSelected,
    min: 1,
    max: nCount,
    disable: disable
  });
}

function toggleAnimation() {
  if (document.getElementById("animate-cbx").checked) {
    // Check that animation is not ongoing already
    if (animation == null) {
      startAnimation();
    }
  } else {
    stopAnimation();
  }
}

function updateShowScalebar() {

  // Default 0 pixPerMeter which means scalebar will be hidden
  let pixPerMeter = 0;
  if (document.getElementById("scalebar-cbx").checked) {

    // TODO get actual pix per meter for current image
    pixPerMeter = 1000000;
  }

  let scalebarOptions = {};
  scalebarOptions["pixelsPerMeter"] = pixPerMeter;
  viewer.scalebar(scalebarOptions);
}


function stopAnimation() {
  if (animation) {
    clearInterval(animation);
    animation = null;
  }
}

function startAnimation() {
  let speed = getSelectedAnimationSpeed();
  let delay = 1000 - (speed * 100);
  let nTimepoints = countTimepoints(getLoadedPlate());

  animation = setInterval(function () {
    let current = getSelectedTimepointIndex();
    let next = current + 1;
    if (next > nTimepoints) {
      next = 1;
    }
    setSelectedTimepoint(next);

  }, delay);
}

function updateAnimationSpeed() {
  // Only update if running
  if (animation) {
    stopAnimation();
    startAnimation();
  }
}


function updateWellSelect(plateObj) {
  let elemSelect = document.getElementById('well-select');

  // This select is not available on all pages, return if not
  if(elemSelect == null){
    return;
  }

  // reset
  elemSelect.options.length = 0;

  // Just loop all wells for first timepoint
  Object.keys(getLoadedPlate()["1"]).forEach(function(well){
    elemSelect.options.add(new Option(well));
  });
}

function setWellSelection(well){
  let elemSelect = document.getElementById('well-select');
  let selectedIdx = getSelectIndexFromSelectValue(elemSelect, well);
  elemSelect.selectedIndex = selectedIdx;
}

function setWellsampleSelection(wellsample){
  let elemSelect = document.getElementById('wellsample-select');
  elemSelect.selectedIndex = wellsample - 1;
}

function setChannelSelection(channel){
  let elemSelect = document.getElementById('channel-select');
  let selectedIdx = getSelectIndexFromSelectValue(elemSelect, channel);
  elemSelect.selectedIndex = selectedIdx;
}


function getSelectIndexFromSelectValue(elemSelect, value) {
  let i = 0;
  for(i = 0; i < elemSelect.length; i++) {
    if( value == elemSelect.options[i].value ){
      index = i;
      break;
    }
  }
  return index;
}

function updateWellsampleSelect(plateObj) {
  elemSelect = document.getElementById('wellsample-select');

  // reset
  elemSelect.options.length = 0;

  // add as many options as wellsamples
  let nCount = countWellsamples(plateObj);
  for (let n = 0; n < nCount; n++) {
    elemSelect.options[n] = new Option(n + 1);
  }
}

function updatePlateNameLabel(plate_name) {
  document.getElementById('plate-name-label').innerHTML = "Plate: " + plate_name;
}

function updateMetaData(plateObj) {
  // Clear first
  document.getElementById('meta-div-json').innerHTML = "";

  let jsonViewer = new JSONViewer("");
  document.querySelector("#meta-div-json").appendChild(jsonViewer.getContainer());
  jsonViewer.showJSON(plateObj, null, 2);
}

function updateMetaData_old(plateObj) {
  metaDiv = document.getElementById('meta-div');
  let prettyJSON = JSON.stringify(plateObj, null, 2); // spacing level = 2
  console.log(prettyJSON);
  metaDiv.innerHTML = "Plate meta:<br>" + prettyJSON;
}

function updateChannelSelect(plateObj) {
  elemSelect = document.getElementById('channel-select');

  // reset
  elemSelect.options.length = 0;

  let nCount = countChannels(plateObj);

  // First add default (Merge channels options)
  if (nCount == 1) {
    elemSelect.options[0] = new Option("1", 1);
  } else if (nCount == 2) {
    elemSelect.options[0] = new Option("1-2");
  } else if (nCount >= 3) {
    elemSelect.options[0] = new Option("1-3");
  }

  // add as many options as channels
  for (let n = 0; n < nCount; n++) {
    elemSelect.options[n + 1] = new Option(n + 1);
  }
}

function countTimepoints(plateObj) {
  // A plate-object is nothing but a dict of timepoints
  let timepoints = plateObj;
  // Count number of keys in timepoint object
  return Object.keys(timepoints).length;
}

function countChannels(plateObj) {
  // Count number of keys for the first wellsample of first well of first Timepoint in plate object
  nCount = 0;
  looplabel:
        Object.keys(plateObj).every(timepoint => {
          console.log('timepoint:' + timepoint);
          Object.keys(plateObj[timepoint]).every(well => {
            console.log('well:' + well);
            Object.keys(plateObj[timepoint][well]).every(wellsample => {
              // The wellsample object contains a dict of channels
              nCount = Object.keys(plateObj[timepoint][well][wellsample]).length;
              return nCount;
            })
          })
        })

  return nCount;
}

function countWells(plateObj) {
  // Count number of keys for the first Timepoint in plate object
  nCount = 0;
  looplabel:
        Object.keys(plateObj).every(timepoint => {
          console.log('timepoint:' + timepoint);
          nCount = Object.keys(plateObj[timepoint]).length;
          return nCount;
        })

  return nCount;
}

function countWellsamples(plateObj) {
  // Count number of keys for the first well of first Timepoint in plate object
  nCount = 0;
  looplabel:
        Object.keys(plateObj).every(timepoint => {
          console.log('timepoint:' + timepoint);
          Object.keys(plateObj[timepoint]).every(well => {
            // The well object contains a dict of wellsamples
            nCount = Object.keys(plateObj[timepoint][well]).length;
            return nCount;
          })
        })

  return nCount;
}

function removeChildren(domObject) {
  while (domObject.firstChild) {
    domObject.removeChild(domObject.firstChild);
  }
}

function getWellName(row, col) {
  var rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];
  return rows[row] + col.toString().padStart(2, 0)
}

function createMergeThumbImgURLFromChannels(channels) {

  let val = getSelectedChannelValue();

  let url = null;
  if(val == '1-2' || val == '1-3') {
    url = "/api/image-merge-thumb/ch1/" + channels[1] + "/ch2/" + channels[2] + "/ch3/" + channels[3]+ "/channels.png"
  }else{
    let selectedChannel = parseInt(val);
    url = "/api/image-merge-thumb/ch1/" + channels[selectedChannel] + "/ch2/" + 'undefined' + "/ch3/" + 'undefined' + "/channels.png"
  }

  return url;
}

function createMergeImgURLFromChannels(channels) {

  let val = getSelectedChannelValue();

  let url = null;
  if(val == '1' || val == '1-2' || val == '1-3') {
    url = "/api/image-merge/ch1/" + channels[1] + "/ch2/" + channels[2] + "/ch3/" + channels[3] + "/channels.png"
  }else{
    let selectedChannel = parseInt(val);
    url = "/api/image-merge/ch1/" + channels[selectedChannel] + "/ch2/" + 'undefined' + "/ch3/" + 'undefined'+ "/channels.png"
  }

  return url;
}

