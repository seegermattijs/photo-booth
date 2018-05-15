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

import sharp from 'sharp';
import gphoto2 from 'gphoto2';

import utils from "./utils.js";
var Dropbox = require('dropbox').Dropbox;


class Camera {

	constructor() {
	}

	/*
	* Detect and configure camera
	*/
	initialize(callback) {
		this.GPhoto = new gphoto2.GPhoto2();

		// Negative value or undefined will disable logging, levels 0-4 enable it.
		this.GPhoto.setLogLevel(-1);

		var self = this;
		this.GPhoto.list(function (list) {
			if (list.length === 0) {
				callback(false, 'No camera found', null);
				return;
			}
			self.camera = list[0];

			console.log('gphoto2: Found', self.camera.model);

			if (utils.getConfig().gphoto2.capturetarget) {
				self.camera.setConfigValue('capturetarget', utils.getConfig().gphoto2.capturetarget, function (err) {
					if (err){
						callback(false, 'setting config failed', err);
					} else {
						callback(true);
					}
				});
			}
		});
	}

	

	isInitialized(){
		return (this.camera !== undefined);
	}

	isConnected(callback) {
		this.camera.getConfig(function (err, settings) {
			if (err) {
				if (callback) callback(false, 'connection test failed', err);
			} else {
				self.camera == undefined;	// needs to be reinitialized
				if (callback) callback(true);
			}
		});
	}

	takePicture(callback) {
		var self = this;

		if (self.camera === undefined) {
			callback(-1, 'camera not initialized', null);
			return;
		}


		const filepath = utils.getPhotosDirectory() + "img_" + utils.getTimestamp() + ".jpg";
		const webFilepath = utils.getWebAppPhotosDirectory() + "img_" + utils.getTimestamp() + ".jpg";
		const maxImageSize = utils.getConfig().maxImageSize ? utils.getConfig().maxImageSize : 1500;
		const keep = utils.getConfig().gphoto2.keep === true ?  true : false;

		self.camera.takePicture({ download: true, keep: keep}, function (err, data) {

			if (err) {
				self.camera = undefined;	// needs to be reinitialized
				callback(-2, 'connection to camera failed', err);
				return;
			} 

			sharp(data) // resize image to given maxSize
				.resize(Number(maxImageSize)) // scale width to 1500
				.toFile(filepath, function(err) {
					
				if (err) {
					callback(-3, 'resizing image failed', err)
				} else {
					callback(0, filepath, webFilepath);
				}
			});

		});

	}

}

/*
 * Module exports for connection
 */
let camera = new Camera();
export { camera as default };