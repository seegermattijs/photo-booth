/* 
 * This file is part of "photo-booth" 
 * Copyright (c) 2018 Philipp Trenz
 *
 * For more information on the project go to
 * <https://github.com/philipptrenz/photo-booth>
 * 
 * This program is free software: you can redistribute it and/or modify  
 * it under the terms of the GNU General Public License as published by  
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but 
 * WITHOUT ANY WARRANTY; without even the implied warranty of 
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU 
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License 
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

//'use strict';
$('body').fadeIn();
import 'util';

import $ from 'jquery';

import 'popper.js';
import 'bootstrap';

import utils from "./utils.js";
import camera from "./camera.js";
import { 
  SpinnerPrompt, 
  CountdownPrompt, 
  PreviewPrompt, 
  CameraErrorPrompt, 
  CameraErrorOnStartupPrompt, 
  SharpErrorPrompt
} from "./prompt.js";
import slideshow from "./slideshow.js";

// import webApp from './webapp_server.js';
var fs = require('fs');
require('dotenv').load();

camera.initialize(function( res, msg, err) {
  if (!res) {
    console.error('camera:', msg, err);

    new CameraErrorOnStartupPrompt(-1).start(false, false);

  }
});


/*
 * Trigger photo when clicking / touching anywhere at the screen
 */
$( ".take-picture" ).click(function() {
  window.scroll(0, 0);
  trigger();
});

/* Listen for pushbutton on GPIO 3 (PIN 5)
 * Activate the use of GPIOs by setting useGPIO in config.json to true.
 */
if (utils.getConfig().init.useGPIO !== undefined ? utils.getConfig().init.useGPIO : true) {
  console.log('GPIO usage activated');
  var gpio = require('rpi-gpio');
  gpio.setMode(gpio.MODE_BCM);
  gpio.setup(3, gpio.DIR_IN, gpio.EDGE_BOTH);
  gpio.on('change', function(channel, value) {
    if (channel == 3 && !value) trigger();
    // NOTE: takePhoto() is secure to don't run twice 
    // at the same time, make sure this is also so for
    // your code.
  });
}

const countdownLength = (typeof utils.getConfig().countdownLength == 'number') ? utils.getConfig().countdownLength : 5;

var executing = false;
function trigger() {

  if (executing) return;

  executing = true;

  slideshow.stop();

  if (camera.isInitialized()) {

    var triggerPhotoOffsetBeforeZero = 0.5; // in seconds

    // start countdown and show spinner afterwards
    var prompt = new CountdownPrompt(countdownLength).start( true, false, function() {
      prompt = new SpinnerPrompt();
      // wait a sec for spinner to start
      setTimeout(function() {
        prompt.start(true, false);
      }, 500);
    });

    // take picture after countdown
    setTimeout(function() {
      camera.takePicture(function(res, msg1, msg2) {
        var timer;
        const message1 = msg1;
        const message2 = msg2
        prompt.stop(true, false, function() { // stop spinner if image is ready
            var didClick = false;
            var didCancel = false;
            if (res == 0) {
              // after that show preview
              const previewDuration = 10;
              timer = previewDuration-1;
              prompt = new PreviewPrompt(message1, previewDuration).start(false, false, function() {
                // end photo task after preview ended
                executing = false;
                if(!didClick) saveImage();
                // else return cancel();
              });

              $('.save-buttons').fadeIn(250);

              function message() {
                console.log(timer);
                if(timer === 0) {
                  clearInterval(timerFunc);
                } 
                else if(didCancel) {
                  clearInterval(timerFunc);
                }
                else {
                  $('.save-buttons').find('span').text(timer);
                  timer--;
                }
              }
              var timerFunc = setInterval(function() { message(timer); }, 1000);

              $( ".save" ).click(function() {
                didClick = true;
                return saveImage();
              });
              $( ".cancel" ).click(function() {
                didCancel=true;
                return cancel(message1);
              });

              function saveImage() { 
                if(!didCancel) {
                  var dbx = new Dropbox.Dropbox({ accessToken: process.env.TOKEN });

                  fs.readFile(message1, function(err, data) {
                   dbx.filesUpload({path: '/herman60/' + message2, contents: data})
                   .then(function(response) {
                     console.log(response);
                   })
                   .catch(function(error) {
                     console.error(error);
                   }); 
                  clearInterval(timerFunc);

                 })
                  // webApp.sendNewPhoto(message2);  // send image to connected web clients
                  setTimeout(function() {
                    utils.prependImage(message1);     // add image to collage
                  }, 500);
                  $('.save-buttons').fadeOut(250);
                  $('#prompt').fadeOut(250);
                  $( ".save" ).off('click');
                }
                location.reload();
              }

            } else {

              console.error(message1, '\n', message2);

              if (res == -1 ) {  // camera not initialized
                new CameraErrorPrompt(5).start(false, false, function() { executing = false; });
              } else if (res == -2) { // gphoto2 error
                new CameraErrorPrompt(5).start(false, false, function() { executing = false; });
              } else if (res == -3) { // sharp error
                 new SharpErrorPrompt(5).start(false, false, function() { executing = false; });
              }
            }

        });

      });

    }, (countdownLength-triggerPhotoOffsetBeforeZero)*1000);

  } else {

    // TODO: Handle uninitialized camera

    camera.initialize(function( res, msg, err) {
      if (res) {

        executing = false;
        trigger();

      } else {

        // TODO: handle error
        new CameraErrorPrompt(5).start(false, false, function() {
          executing = false;
        })

      }

    });

  }
  
}
function cancel(img) {
  fs.unlink(img,function(err, data) {
    console.log('deleted '+img);
  });
  $('.save-buttons').fadeOut(250);
  $('#prompt').fadeOut(250);
  location.reload();
}
/*
 * Module exports
 */
module.exports.triggerPhoto = trigger;


function minimizeWindow () {
  mainWindow.setFullScreen(false);
  console.log(mainWindow);
}

app.on('ready', function() {

const ret = electron.globalShortcut.register('Escape', function(){
  console.log('Escape is pressed');

      minimizeWindow();
});

console.log(electron.globalShortcut.isRegistered('Escape'));
});

app.on('will-quit', function(){

electron.globalShortcut.unregister('Escape');

electron.globalShortcut.unregisterAll();
});