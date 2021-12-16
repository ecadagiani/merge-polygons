const turf = require('@turf/turf');
const { flattenDepth } = require('lodash');
const Promise = require('bluebird');

function removePolygonHoles(polygon) {
  return [polygon[0]];
}

/**
 * calcul the minimum distance between two polygons
 * @param {Array} polygon1 first polygon
 * @param {Array} polygon2 second polygon
 * @param {Number} [units=kilometers] can be degrees, radians, miles, or kilometers. Default 'kilometers'
 * @returns {Number} minimum distance between polygons, in kilometers
 */
function minDistanceBetweenPolygon(polygon1, polygon2, units = 'kilometers') {
  const pointsPolygon1 = flattenDepth(removePolygonHoles(polygon1), 1);
  const lineToCompare = turf.polygonToLine(turf.polygon(removePolygonHoles(polygon2)));
  let distance = Infinity;
  pointsPolygon1.forEach((point) => {
    const d = turf.pointToLineDistance(point, lineToCompare, { units });
    if (d < distance) { distance = d; }
  });
  return distance;
}

/**
 * extract all points from an Geo feature
 * @param {Object} feature and Geometry feature
 * @returns {Object} and featureCollection of feature points
 */
function getAllPoints(feature) {
  const points = turf.coordAll(feature);
  return turf.featureCollection(points.map(turf.point));
}

/**
 * regroup all near polygons together, and create one big polygon
 * @param {Object} feature
 * @param {Object} feature.properties
 * @param {Object} feature.geometry
 * @param {Object} options
 * @param {Number} options.maxDistance distance in kilometers to consider polygons belonging to the same group
 * @param {Number} options.maxEdge the length (in 'units') of an edge necessary for part of the hull to become concave. Cannot be lower than maxDistance + 1.
 * @param {Number} [options.units=kilometers] can be degrees, radians, miles, or kilometers. Default 'kilometers'
 * @returns {Object} feature of type multiPolygon
 */
async function mergePolygonsByDistance({ properties, geometry }, { maxDistance, units = 'kilometers', maxEdge }) {
  // polygonsToCheck is an array of all ungrouped polygons. Each time we find a group for a polygon, we remove it from this array
  // at the end of this function, polygonsToCheck need to be empty
  let polygonsToCheck = Array.from(geometry.coordinates);
  // array of group of polygons => [ [...group1Polygons], [...group2Polygons], ... ],
  const polygonsGroup = [];

  // recursive function, get an sourcePolygon and find all the polygons from this group.
  // Add the polygons on polygonsGroup array at the groupIndex
  async function addClosenessPolygonToGroup(groupIndex, sourcePolygon) {
    const { closenessPolygons, distantPolygons } = await Promise.reduce(
      polygonsToCheck,
      async (accumulator, polygon) => {
        const distance = minDistanceBetweenPolygon(sourcePolygon, polygon, units);
        if (distance <= maxDistance) {
          accumulator.closenessPolygons.push(polygon);
        } else {
          accumulator.distantPolygons.push(polygon);
        }
        return accumulator;
      },
      { closenessPolygons: [], distantPolygons: [] },
    );
    if (closenessPolygons.length === 0) return;

    polygonsGroup[groupIndex].push(...closenessPolygons);
    polygonsToCheck = distantPolygons;

    await Promise.each(
      closenessPolygons,
      (closenessPolygon) => addClosenessPolygonToGroup(groupIndex, closenessPolygon),
    );
  }

  // loop while polygonsToCheck is not empty. At each iteration find all the polygons of an group.
  // one iteration per group
  while (polygonsToCheck.length > 0) {
    // the first poly is always a non grouped polygon (because all polygon grouped is removed from polygonsToCheck)
    const actualPoly = polygonsToCheck[0];
    // create a new group
    polygonsGroup.push([actualPoly]);
    // remove from polygonsToCheck
    polygonsToCheck.splice(0, 1);
    // find all the polygon for this new group
    const groupIndex = polygonsGroup.length - 1;
    await addClosenessPolygonToGroup(groupIndex, actualPoly);
  }

  // create the concave polygon for each group
  const simplifiedPolygons = polygonsGroup.map((polygons) => {
    // extract all points, concave need only point
    const allPoints = getAllPoints(turf.multiPolygon(polygons));
    const polygonsFeature = turf.concave(
      allPoints,
      // maxEdge cannot be lower than mergePolygonGroupMaxDistance, else create fake polygon with wrong coord
      { units, maxEdge: maxDistance >= maxEdge ? maxDistance + 1 : maxEdge },
    );
    return polygonsFeature.geometry.coordinates;
  });

  return turf.multiPolygon(simplifiedPolygons, properties);
}

module.exports = { mergePolygonsByDistance, minDistanceBetweenPolygon, getAllPoints };
