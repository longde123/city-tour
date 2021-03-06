"use strict";

var CityTour = CityTour || {};

CityTour.FlythroughGestureProcessor = function() {
  var previousTouches;
  var vehicleView;
  var enabled = false;

  var processGesture = function(currentTouches) {
    var newAzimuthAngleOffset, newTiltAngleOffset;
    var normalizedDragDistanceX, normalizedDragDistanceY;

    if (currentTouches === undefined) {
      vehicleView.enabledResetToCenterAnimation();
    }
    else {
      vehicleView.disableResetToCenterAnimation();

      if (previousTouches !== undefined && (currentTouches.count() === 1 || currentTouches.count() === 2)) {
        normalizedDragDistanceX = currentTouches.normalizedScreenMidpoint().x - previousTouches.normalizedScreenMidpoint().x;
        normalizedDragDistanceY = currentTouches.normalizedScreenMidpoint().y - previousTouches.normalizedScreenMidpoint().y;

        vehicleView.setAzimuthAngleOffset(vehicleView.azimuthAngleOffset() - (normalizedDragDistanceX * (Math.PI / 2)));
        vehicleView.setTiltAngleOffset(vehicleView.tiltAngleOffset() + (normalizedDragDistanceY * (Math.PI / 2)));
      }
    }

    previousTouches = currentTouches;
  };

  return {
    processGesture: processGesture,
    previousTouches: function() { return previousTouches; },
    setVehicleView: function(newVehicleView) { vehicleView = newVehicleView; },
  };
};
