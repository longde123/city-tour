"use strict";

var CityTour = CityTour || {};
CityTour.Meshes = CityTour.Meshes || {};

CityTour.Meshes.RoadMeshBuilder = function() {
  var HALF_PI = Math.PI / 2;
  var SIDEWALK_X_CENTER = (CityTour.Config.STREET_WIDTH / 2) - (CityTour.Config.SIDEWALK_WIDTH / 2);
  var SIDEWALK_Z_CENTER = (CityTour.Config.STREET_DEPTH / 2) - (CityTour.Config.SIDEWALK_DEPTH / 2);

  var COLOR_ROAD = 0xaaaaaa;
  var COLOR_SIDEWALK = 0xcccccc;
  var COLOR_GUARDRAIL = 0xbbbbbb;

  var calculateRoadSegment = function(heightAtPoint1, heightAtPoint2, mapLength) {
    var midpointHeight = (heightAtPoint1 + heightAtPoint2) / 2;
    var angle = Math.atan2((heightAtPoint1 - heightAtPoint2), mapLength);
    var length = CityTour.Math.distanceBetweenPoints(heightAtPoint1, 0, heightAtPoint2, mapLength);

    return {
      angle: angle,
      midpointHeight: midpointHeight,
      length: length,
    };
  };

  var buildReusableIntersectionCornerMesh = function(sidewalkMaterial) {
    var reusableIntersectionSidewalkCornerMesh = new THREE.Mesh(new THREE.PlaneGeometry(CityTour.Config.SIDEWALK_WIDTH, CityTour.Config.SIDEWALK_DEPTH));
    reusableIntersectionSidewalkCornerMesh.rotation.x = -HALF_PI;

    var intersectionSidewalkCornerGeometry = new THREE.Geometry();

    reusableIntersectionSidewalkCornerMesh.position.x = -SIDEWALK_X_CENTER;
    reusableIntersectionSidewalkCornerMesh.position.z = -SIDEWALK_Z_CENTER;
    reusableIntersectionSidewalkCornerMesh.updateMatrix();
    intersectionSidewalkCornerGeometry.merge(reusableIntersectionSidewalkCornerMesh.geometry, reusableIntersectionSidewalkCornerMesh.matrix);

    reusableIntersectionSidewalkCornerMesh.position.x = SIDEWALK_X_CENTER;
    reusableIntersectionSidewalkCornerMesh.position.z = -SIDEWALK_Z_CENTER;
    reusableIntersectionSidewalkCornerMesh.updateMatrix();
    intersectionSidewalkCornerGeometry.merge(reusableIntersectionSidewalkCornerMesh.geometry, reusableIntersectionSidewalkCornerMesh.matrix);

    reusableIntersectionSidewalkCornerMesh.position.x = -SIDEWALK_X_CENTER;
    reusableIntersectionSidewalkCornerMesh.position.z = SIDEWALK_Z_CENTER;
    reusableIntersectionSidewalkCornerMesh.updateMatrix();
    intersectionSidewalkCornerGeometry.merge(reusableIntersectionSidewalkCornerMesh.geometry, reusableIntersectionSidewalkCornerMesh.matrix);

    reusableIntersectionSidewalkCornerMesh.position.x = SIDEWALK_X_CENTER;
    reusableIntersectionSidewalkCornerMesh.position.z = SIDEWALK_Z_CENTER;
    reusableIntersectionSidewalkCornerMesh.updateMatrix();
    intersectionSidewalkCornerGeometry.merge(reusableIntersectionSidewalkCornerMesh.geometry, reusableIntersectionSidewalkCornerMesh.matrix);

    return new THREE.Mesh(intersectionSidewalkCornerGeometry);
  };

  var roadMeshBuilder = {};

  roadMeshBuilder.build = function(terrain, roadNetwork) {
    var HALF_BLOCK_AND_STREET_WIDTH = CityTour.Config.BLOCK_AND_STREET_WIDTH / 2;
    var HALF_BLOCK_AND_STREET_DEPTH = CityTour.Config.BLOCK_AND_STREET_DEPTH / 2;
    var BRIDGE_SUPPORT_HEIGHT = 8.333333333333333;
    var HALF_BRIDGE_SUPPORT_HEIGHT = BRIDGE_SUPPORT_HEIGHT / 2;
    var BRIDGE_SUPPORT_SEPARATION_FROM_ROAD_DECK = 0.020833333333333;

    var mapX, mapZ;

    var roadSegment;

    var roadMaterial = new THREE.MeshBasicMaterial({ color: COLOR_ROAD, side: THREE.DoubleSide });
    var roadGeometry = new THREE.Geometry();
    var roadSegmentMesh;

    var sidewalkMaterial = new THREE.MeshBasicMaterial({ color: COLOR_SIDEWALK, side: THREE.DoubleSide });
    var sidewalkGeometry = new THREE.Geometry();
    var sidewalkSegmentMesh;

    var guardrailMaterial = new THREE.MeshBasicMaterial({ color: COLOR_GUARDRAIL, side: THREE.DoubleSide });
    var guardrailGeometry = new THREE.Geometry();
    var guardrailSegmentMesh;

    var reusableIntersectionMesh = new THREE.Mesh(new THREE.PlaneGeometry(CityTour.Config.ROAD_WIDTH, CityTour.Config.ROAD_DEPTH));
    reusableIntersectionMesh.rotation.x = -HALF_PI;

    var reusableIntersectionFillerNorthSouthMesh = new THREE.Mesh(new THREE.PlaneGeometry(CityTour.Config.SIDEWALK_WIDTH, CityTour.Config.ROAD_DEPTH));
    reusableIntersectionFillerNorthSouthMesh.rotation.x = -HALF_PI;

    var reusableIntersectionFillerEastWestMesh = new THREE.Mesh(new THREE.PlaneGeometry(CityTour.Config.ROAD_WIDTH, CityTour.Config.SIDEWALK_DEPTH));
    reusableIntersectionFillerEastWestMesh.rotation.x = -HALF_PI;

    var reusableNorthSouthMesh = new THREE.Mesh(new THREE.PlaneGeometry(CityTour.Config.ROAD_WIDTH, 1.0));
    var reusableEastWestMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.0, CityTour.Config.ROAD_DEPTH));
    reusableEastWestMesh.rotation.x = -HALF_PI;

    var reusableNorthSouthSidewalkMesh = new THREE.Mesh(new THREE.PlaneGeometry(CityTour.Config.SIDEWALK_WIDTH, 1.0));
    var reusableEastWestSidewalkMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.0, CityTour.Config.SIDEWALK_DEPTH));
    reusableEastWestSidewalkMesh.rotation.x = -HALF_PI;

    var intersectionSidewalkCornerMesh = buildReusableIntersectionCornerMesh(sidewalkMaterial);

    var reusableBridgeSupportMesh = new THREE.Mesh(new THREE.BoxGeometry(0.083333333333333, BRIDGE_SUPPORT_HEIGHT, 0.083333333333333));
    var reusableGuardrailMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.083333333333333, 1.0));

    var northRoad, eastRoad, southRoad, westRoad;
    var selfSurfaceHeight, southSurfaceHeight, eastSurfaceHeight;

    var minX = roadNetwork.minColumn();
    var maxX = roadNetwork.maxColumn();
    var minZ = roadNetwork.minRow();
    var maxZ = roadNetwork.maxRow();

    for (mapX = minX; mapX <= maxX; mapX++) {
      for (mapZ = minZ; mapZ <= maxZ; mapZ++) {
        if (roadNetwork.hasIntersection(mapX, mapZ)) {
          selfSurfaceHeight = roadNetwork.getRoadHeight(mapX, mapZ);

          northRoad = roadNetwork.hasEdgeBetween(mapX, mapZ, mapX, mapZ - 1);
          eastRoad = roadNetwork.hasEdgeBetween(mapX, mapZ, mapX + 1, mapZ);
          southRoad = roadNetwork.hasEdgeBetween(mapX, mapZ, mapX, mapZ + 1);
          westRoad = roadNetwork.hasEdgeBetween(mapX, mapZ, mapX - 1, mapZ);

          // Road intersection
          roadSegmentMesh = reusableIntersectionMesh;
          roadSegmentMesh.position.x = mapX;
          roadSegmentMesh.position.y = selfSurfaceHeight;
          roadSegmentMesh.position.z = mapZ;
          roadSegmentMesh.updateMatrix();
          roadGeometry.merge(roadSegmentMesh.geometry, roadSegmentMesh.matrix);

          if (roadNetwork.getIntersectionSurfaceType(mapX, mapZ) === CityTour.RoadNetwork.BRIDGE_SURFACE) {
            reusableBridgeSupportMesh.position.x = mapX;
            reusableBridgeSupportMesh.position.y = selfSurfaceHeight - HALF_BRIDGE_SUPPORT_HEIGHT - BRIDGE_SUPPORT_SEPARATION_FROM_ROAD_DECK;
            reusableBridgeSupportMesh.position.z = mapZ;
            reusableBridgeSupportMesh.updateMatrix();
            sidewalkGeometry.merge(reusableBridgeSupportMesh.geometry, reusableBridgeSupportMesh.matrix);

            // Guardrail
            if (northRoad === true && southRoad === true) {
              guardrailSegmentMesh = reusableGuardrailMesh;
              guardrailSegmentMesh.scale.y = CityTour.Config.STREET_WIDTH;
              guardrailSegmentMesh.position.y = selfSurfaceHeight;
              guardrailSegmentMesh.rotation.x = 0.0;
              guardrailSegmentMesh.rotation.y = HALF_PI;
              guardrailSegmentMesh.rotation.z = HALF_PI;
              guardrailSegmentMesh.position.z = mapZ;

              // Left guardrail
              guardrailSegmentMesh.position.x = mapX - (CityTour.Config.STREET_WIDTH / 2);
              guardrailSegmentMesh.updateMatrix();
              guardrailGeometry.merge(guardrailSegmentMesh.geometry, guardrailSegmentMesh.matrix);

              // Right guardrail
              guardrailSegmentMesh.position.x = mapX + (CityTour.Config.STREET_WIDTH / 2);
              guardrailSegmentMesh.updateMatrix();
              guardrailGeometry.merge(guardrailSegmentMesh.geometry, guardrailSegmentMesh.matrix);
            }
            else if (eastRoad === true && westRoad === true) {
              guardrailSegmentMesh = reusableGuardrailMesh;
              guardrailSegmentMesh.position.x = mapX;
              guardrailSegmentMesh.rotation.x = 0.0;
              guardrailSegmentMesh.scale.y = CityTour.Config.STREET_DEPTH;
              guardrailSegmentMesh.position.y = selfSurfaceHeight;
              guardrailSegmentMesh.rotation.y = 0.0;
              guardrailSegmentMesh.rotation.z = HALF_PI;

              // North guardrail
              guardrailSegmentMesh.position.z = mapZ - (CityTour.Config.STREET_DEPTH / 2);
              guardrailSegmentMesh.updateMatrix();
              guardrailGeometry.merge(guardrailSegmentMesh.geometry, guardrailSegmentMesh.matrix);

              // South guardrail
              guardrailSegmentMesh.position.z = mapZ + (CityTour.Config.STREET_DEPTH / 2);
              guardrailSegmentMesh.updateMatrix();
              guardrailGeometry.merge(guardrailSegmentMesh.geometry, guardrailSegmentMesh.matrix);
            }
          }

          sidewalkSegmentMesh = intersectionSidewalkCornerMesh;
          sidewalkSegmentMesh.position.x = mapX;
          sidewalkSegmentMesh.position.y = selfSurfaceHeight;
          sidewalkSegmentMesh.position.z = mapZ;
          sidewalkSegmentMesh.updateMatrix();
          sidewalkGeometry.merge(sidewalkSegmentMesh.geometry, sidewalkSegmentMesh.matrix);

          sidewalkSegmentMesh = reusableIntersectionFillerEastWestMesh;
          sidewalkSegmentMesh.position.y = selfSurfaceHeight;

          // Top sidewalk "filler"
          sidewalkSegmentMesh.position.x = mapX;
          sidewalkSegmentMesh.position.z = mapZ - SIDEWALK_Z_CENTER;
          sidewalkSegmentMesh.updateMatrix();
          if (northRoad === true) {
            roadGeometry.merge(sidewalkSegmentMesh.geometry, sidewalkSegmentMesh.matrix);
          }
          else {
            sidewalkGeometry.merge(sidewalkSegmentMesh.geometry, sidewalkSegmentMesh.matrix);
          }

          // Bottom sidewalk "filler"
          sidewalkSegmentMesh.position.x = mapX;
          sidewalkSegmentMesh.position.z = mapZ + SIDEWALK_Z_CENTER;
          sidewalkSegmentMesh.updateMatrix();
          if (southRoad === true) {
            roadGeometry.merge(sidewalkSegmentMesh.geometry, sidewalkSegmentMesh.matrix);
          }
          else {
            sidewalkGeometry.merge(sidewalkSegmentMesh.geometry, sidewalkSegmentMesh.matrix);
          }

          sidewalkSegmentMesh = reusableIntersectionFillerNorthSouthMesh;
          sidewalkSegmentMesh.position.y = selfSurfaceHeight;

          // Left sidewalk "filler"
          sidewalkSegmentMesh.position.x = mapX - SIDEWALK_X_CENTER;
          sidewalkSegmentMesh.position.z = mapZ;
          sidewalkSegmentMesh.updateMatrix();
          if (westRoad === true) {
            roadGeometry.merge(sidewalkSegmentMesh.geometry, sidewalkSegmentMesh.matrix);
          }
          else {
            sidewalkGeometry.merge(sidewalkSegmentMesh.geometry, sidewalkSegmentMesh.matrix);
          }

          // Right sidewalk "filler"
          sidewalkSegmentMesh.position.x = mapX + SIDEWALK_X_CENTER;
          sidewalkSegmentMesh.position.z = mapZ;
          sidewalkSegmentMesh.updateMatrix();
          if (eastRoad === true) {
            roadGeometry.merge(sidewalkSegmentMesh.geometry, sidewalkSegmentMesh.matrix);
          }
          else {
            sidewalkGeometry.merge(sidewalkSegmentMesh.geometry, sidewalkSegmentMesh.matrix);
          }


          // North/South road segment
          if (southRoad === true) {
            southSurfaceHeight = roadNetwork.getRoadHeight(mapX, mapZ + 1);

            roadSegment = calculateRoadSegment(selfSurfaceHeight,
                                               southSurfaceHeight,
                                               CityTour.Config.BLOCK_DEPTH);

            roadSegmentMesh = reusableNorthSouthMesh;
            roadSegmentMesh.position.x = mapX;
            roadSegmentMesh.rotation.x = roadSegment.angle - HALF_PI;
            roadSegmentMesh.scale.y = roadSegment.length;
            roadSegmentMesh.position.y = roadSegment.midpointHeight;
            roadSegmentMesh.position.z = mapZ + HALF_BLOCK_AND_STREET_DEPTH;
            roadSegmentMesh.updateMatrix();
            roadGeometry.merge(roadSegmentMesh.geometry, roadSegmentMesh.matrix);

            sidewalkSegmentMesh = reusableNorthSouthSidewalkMesh;
            sidewalkSegmentMesh.rotation.x = roadSegment.angle - HALF_PI;
            sidewalkSegmentMesh.scale.y = roadSegment.length;
            sidewalkSegmentMesh.position.y = roadSegment.midpointHeight;
            sidewalkSegmentMesh.position.z = mapZ + HALF_BLOCK_AND_STREET_DEPTH;

            // Left sidewalk
            sidewalkSegmentMesh.position.x = mapX - SIDEWALK_X_CENTER;
            sidewalkSegmentMesh.updateMatrix();
            sidewalkGeometry.merge(sidewalkSegmentMesh.geometry, sidewalkSegmentMesh.matrix);

            // Right sidewalk
            sidewalkSegmentMesh.position.x = mapX + SIDEWALK_X_CENTER;
            sidewalkSegmentMesh.updateMatrix();
            sidewalkGeometry.merge(sidewalkSegmentMesh.geometry, sidewalkSegmentMesh.matrix);

            if (roadNetwork.edgeBetween(mapX, mapZ, mapX, mapZ + 1).surfaceType === CityTour.RoadNetwork.BRIDGE_SURFACE) {
              // Guardrail
              guardrailSegmentMesh = reusableGuardrailMesh;
              guardrailSegmentMesh.rotation.x = roadSegment.angle;
              guardrailSegmentMesh.scale.y = roadSegment.length;
              guardrailSegmentMesh.position.y = roadSegment.midpointHeight;
              guardrailSegmentMesh.rotation.y = HALF_PI;
              guardrailSegmentMesh.rotation.z = HALF_PI;
              guardrailSegmentMesh.position.z = mapZ + HALF_BLOCK_AND_STREET_DEPTH;

              // Left guardrail
              guardrailSegmentMesh.position.x = mapX - (CityTour.Config.STREET_WIDTH / 2);
              guardrailSegmentMesh.updateMatrix();
              guardrailGeometry.merge(guardrailSegmentMesh.geometry, guardrailSegmentMesh.matrix);

              // Right guardrail
              guardrailSegmentMesh.position.x = mapX + (CityTour.Config.STREET_WIDTH / 2);
              guardrailSegmentMesh.updateMatrix();
              guardrailGeometry.merge(guardrailSegmentMesh.geometry, guardrailSegmentMesh.matrix);
            }
          }

          // East/West road segment
          if (eastRoad === true) {
            eastSurfaceHeight = roadNetwork.getRoadHeight(mapX + 1, mapZ);

            roadSegment = calculateRoadSegment(selfSurfaceHeight,
                                               eastSurfaceHeight,
                                               CityTour.Config.BLOCK_WIDTH);

            roadSegmentMesh = reusableEastWestMesh;
            roadSegmentMesh.scale.x = roadSegment.length;
            roadSegmentMesh.position.x = mapX + HALF_BLOCK_AND_STREET_WIDTH;
            roadSegmentMesh.position.y = roadSegment.midpointHeight;
            roadSegmentMesh.rotation.y = roadSegment.angle;
            roadSegmentMesh.position.z = mapZ;
            roadSegmentMesh.updateMatrix();
            roadGeometry.merge(roadSegmentMesh.geometry, roadSegmentMesh.matrix);

            sidewalkSegmentMesh = reusableEastWestSidewalkMesh;
            sidewalkSegmentMesh.scale.x = roadSegment.length;
            sidewalkSegmentMesh.position.x = mapX + HALF_BLOCK_AND_STREET_WIDTH;
            sidewalkSegmentMesh.position.y = roadSegment.midpointHeight;
            sidewalkSegmentMesh.rotation.y = roadSegment.angle;

            // North sidewalk
            sidewalkSegmentMesh.position.z = mapZ - SIDEWALK_Z_CENTER;
            sidewalkSegmentMesh.updateMatrix();
            sidewalkGeometry.merge(sidewalkSegmentMesh.geometry, sidewalkSegmentMesh.matrix);

            // South sidewalk
            sidewalkSegmentMesh.position.z = mapZ + SIDEWALK_Z_CENTER;
            sidewalkSegmentMesh.updateMatrix();
            sidewalkGeometry.merge(sidewalkSegmentMesh.geometry, sidewalkSegmentMesh.matrix);

            if (roadNetwork.edgeBetween(mapX, mapZ, mapX + 1, mapZ).surfaceType === CityTour.RoadNetwork.BRIDGE_SURFACE) {
              // Guardrail
              guardrailSegmentMesh = reusableGuardrailMesh;
              guardrailSegmentMesh.position.x = mapX + HALF_BLOCK_AND_STREET_DEPTH;
              guardrailSegmentMesh.rotation.x = 0.0;
              guardrailSegmentMesh.scale.y = roadSegment.length;
              guardrailSegmentMesh.position.y = roadSegment.midpointHeight;
              guardrailSegmentMesh.rotation.y = 0.0;
              guardrailSegmentMesh.rotation.z = -roadSegment.angle - HALF_PI;

              // Left guardrail
              guardrailSegmentMesh.position.z = mapZ - (CityTour.Config.STREET_DEPTH / 2);
              guardrailSegmentMesh.updateMatrix();
              guardrailGeometry.merge(guardrailSegmentMesh.geometry, guardrailSegmentMesh.matrix);

              // Right guardrail
              guardrailSegmentMesh.position.z = mapZ + (CityTour.Config.STREET_DEPTH / 2);
              guardrailSegmentMesh.updateMatrix();
              guardrailGeometry.merge(guardrailSegmentMesh.geometry, guardrailSegmentMesh.matrix);
            }
          }
        }
      }
    }

    return [new THREE.Mesh(roadGeometry, roadMaterial),
            new THREE.Mesh(sidewalkGeometry, sidewalkMaterial),
            new THREE.Mesh(guardrailGeometry, guardrailMaterial)];
  };

  return roadMeshBuilder;
};
