"use strict";

var CityTour = CityTour || {};

CityTour.OrbitalCamera = function(messageBroker) {
  var TWO_PI = Math.PI * 2;

  var MIN_CENTER_X = -83.333333333333333;
  var MAX_CENTER_X = 83.333333333333333;

  var MIN_CENTER_Z = -83.333333333333333;
  var MAX_CENTER_Z = 83.333333333333333;

  var MIN_TILT_ANGLE = -Math.PI / 2;
  var MAX_TILT_ANGLE = -0.1;

  var MIN_ZOOM_DISTANCE = 1.666666666666667;
  var MAX_ZOOM_DISTANCE = 83.333333333333333;

  var MINIMUM_HEIGHT_OFF_GROUND = 0.416666666666667;

  var centerX = 0.0;
  var centerZ = 0.0;
  var zoomDistance = MAX_ZOOM_DISTANCE;
  var tiltAngle = (MIN_TILT_ANGLE - MAX_TILT_ANGLE) * 0.2;
  var azimuthAngle = 0.0;

  var setCenterCoordinates = function(newCenterX, newCenterZ) {
    centerX = CityTour.Math.clamp(newCenterX, MIN_CENTER_X, MAX_CENTER_X);
    centerZ = CityTour.Math.clamp(newCenterZ, MIN_CENTER_Z, MAX_CENTER_Z);

    messageBroker.publish("camera.updated", {});
  };

  var setZoomDistance = function(newZoomDistance) {
    zoomDistance = CityTour.Math.clamp(newZoomDistance, MIN_ZOOM_DISTANCE, MAX_ZOOM_DISTANCE);

    messageBroker.publish("camera.updated", {});
  };

  var setTiltAngle = function(newTiltAngle) {
    tiltAngle = CityTour.Math.clamp(newTiltAngle, MIN_TILT_ANGLE, MAX_TILT_ANGLE);

    messageBroker.publish("camera.updated", {});
  };

  var setAzimuthAngle = function(newAzimuthAngle) {
    azimuthAngle = newAzimuthAngle;

    if (azimuthAngle < -Math.PI) {
      azimuthAngle += TWO_PI;
    }
    else if (azimuthAngle > Math.PI) {
      azimuthAngle -= TWO_PI;
    }

    messageBroker.publish("camera.updated", {});
  };

  var minimumCameraHeightAtCoordinates = function(terrain, cameraX, cameraZ) {
    var terrainHeight = Number.NEGATIVE_INFINITY;

    if (terrain !== undefined) {
      terrainHeight = terrain.heightAtCoordinates(cameraX, cameraZ);
      if (terrainHeight === undefined) {
        terrainHeight = Number.NEGATIVE_INFINITY;
      }
    }

    return terrainHeight + MINIMUM_HEIGHT_OFF_GROUND;
  };


  /*    C
       /|
      / |
     /  |
    X----

  X == Map center point
  C == Camera position
  rotationX == angle X == angle between camera and center point
  Hypotenuse == Zoom == Distance of camera from center point
  Opposite == Height of camera off the ground
  Adjacent == X/Z distance of camera from center point
  rotationY == rotation of this triangle around y-axis of center point
  */
  var syncToCamera = function(camera, terrain) {
    var hypotenuse = zoomDistance;
    var adjacent = Math.cos(tiltAngle) * hypotenuse;
    var opposite = -Math.sin(tiltAngle) * hypotenuse;

    var cameraX = centerX + (adjacent * Math.sin(azimuthAngle));
    var cameraZ = centerZ + (adjacent * Math.cos(-azimuthAngle));

    camera.position.x = cameraX;
    camera.position.y = Math.max(minimumCameraHeightAtCoordinates(terrain, cameraX, cameraZ), opposite);
    camera.position.z = cameraZ;
    camera.rotation.x = tiltAngle;
    camera.rotation.y = azimuthAngle;
  };

  var syncFromCamera = function(camera) {
    azimuthAngle = camera.rotation.y;
    tiltAngle = Math.min(MAX_TILT_ANGLE, camera.rotation.x);

    var opposite = camera.position.y;
    var hypotenuse = Math.max(MIN_ZOOM_DISTANCE, (1 / Math.sin(-tiltAngle)) * opposite);
    var adjacent = Math.sqrt((hypotenuse * hypotenuse) - (opposite * opposite));

    centerX = camera.position.x - (adjacent * Math.sin(azimuthAngle));
    centerZ = camera.position.z - (adjacent * Math.cos(azimuthAngle));
    zoomDistance = hypotenuse;

    messageBroker.publish("camera.updated", {});
  };


  return {
    centerX: function() { return centerX; },
    centerZ: function() { return centerZ; },
    setCenterCoordinates: setCenterCoordinates,
    minZoomDistance: function() { return MIN_ZOOM_DISTANCE; },
    maxZoomDistance: function() { return MAX_ZOOM_DISTANCE; },
    zoomDistance: function() { return zoomDistance; },
    setZoomDistance: setZoomDistance,
    minTiltAngle: function() { return MIN_TILT_ANGLE; },
    maxTiltAngle: function() { return MAX_TILT_ANGLE; },
    tiltAngle: function() { return tiltAngle; },
    setTiltAngle: setTiltAngle,
    azimuthAngle: function() { return azimuthAngle; },
    setAzimuthAngle: setAzimuthAngle,
    syncToCamera: syncToCamera,
    syncFromCamera: syncFromCamera,
  };
};
