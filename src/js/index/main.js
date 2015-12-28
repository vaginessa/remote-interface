/*
 * Copyright (C) 2015 Opersys inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var CommSocket = require("../common/comm_socket.js");
var DisplaySocket = require("../common/display_socket.js");

var devicePixelRatio = window.devicePixelRatio || 1;
var density = Math.max(1, Math.min(1.5, devicePixelRatio || 1));
var minscale = 0.36;

var initialWs, actualWs, actualRot, comm, disp, firstFrame = null;

function getWindowSize(dw, dh, rot) {

    function adjustBoundedSize(w, h) {
        var sw = w * density,
            sh = h * density,
            f;

        if (sw < (f = dw * minscale)) {
            sw *= f / sw;
            sh *= f / sh;
        }

        if (sh < (f = dh * minscale)) {
            sw *= f / sw;
            sh *= f / sh;
        }

        return {
            w: Math.ceil(sw),
            h: Math.ceil(sh),
            r: rot
        }
    }

    var w = 100;
    var h = 100;

    switch (rot) {
        case 90:
        case 270:
            return adjustBoundedSize(h, w);
        case 0:
        case 180:
        /* falls through */
        default:
            return adjustBoundedSize(w, h);
    }
}

function onCommInfo(info) {
    document.getElementById("info-manufacturer").textContent = info.manufacturer;
    document.getElementById("info-model").textContent = info.model;
    document.getElementById("info-abi").textContent = info.abi;

    actualRot = info.rotation;

    if (!initialWs) {
        // Get a basic starting window size.
        initialWs = getWindowSize(info.displaySize.x, info.displaySize.y, info.rotation);

        // Send the geometry to minicap.
        window.disp.geom(initialWs.w, initialWs.h);
    }
}

function onRotation(rotation) {
    actualRot = rotation;
}

function onDisplayInfo(info) {
    document.getElementById("info-display").textContent = info.realWidth + "x" + info.realHeight;
    document.getElementById("info-virt").textContent = info.virtualWidth + "x" + info.virtualHeight;

    if (actualRot == 90 || actualRot == 270) {
        actualWs = {
            h: info.virtualWidth,
            w: info.virtualHeight
        };
    } else {
        actualWs = {
            w: info.virtualHeight,
            h: info.virtualWidth
        };
    }
}

function refreshPreview() {
    var url, img, pimg, pimgW, pimgH;

    url = URL.createObjectURL(firstFrame);
    pimg = document.getElementById("previewImage");
    pimg.setAttribute("src", url);
}

function onDisplayFrame(frame) {
    firstFrame = frame;
}

module.exports.onLoad = function () {
    window.comm = new CommSocket();
    window.comm.onInfo.add(onCommInfo);
    window.comm.onRotation.add(onRotation);

    window.disp = new DisplaySocket();
    window.disp.onInfo.add(onDisplayInfo);
    window.disp.onFrame.add(onDisplayFrame);

    setInterval(refreshPreview, 2000);
};

module.exports.openDisplay = function () {
    var parent = window;
    var win = window.open("display.html", "Remote Display",
        "menubar=no,status=no,innerWidth=" + actualWs.w + ",innerHeight=" + actualWs.h);

    win.addEventListener("load", function () {
        win.JS.runDisplay(parent.comm, parent.disp, firstFrame);
    });
};