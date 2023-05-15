const fs = require('fs');
const turf = require('@turf/turf');
const mapshaper = require('mapshaper');
const { mergePolygonsByDistance } = require('merge-polygons');

async function main(){
  const exampleFilePath = 'example/example_complex.geojson';
  const geoValue = JSON.parse(fs.readFileSync(exampleFilePath, 'utf8'));
  
  const { 'result.geojson': buffer } = await mapshaper.applyCommands(`${exampleFilePath} -dissolve2 gap-fill-area=5km2 -o result.geojson`);
  let result = JSON.parse(buffer.toString());
  if (result.geometries[0].type === 'Polygon') {
    geoValue.geometry.coordinates = [result.geometries[0].coordinates];
  } else {
    geoValue.geometry.coordinates = result.geometries[0].coordinates;
  }
  
  const simplifiedGeoValue = turf.simplify(geoValue, { tolerance: 0.001, highQuality: false, mutate: true });
  
  const geoResult = await mergePolygonsByDistance(simplifiedGeoValue, { maxDistance: 3, units: 'kilometers', maxEdge: 4 });
  fs.writeFileSync("example/example_merged.geojson", JSON.stringify(geoResult), { flag: 'w' });
  
}
main()
