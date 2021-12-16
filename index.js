const yargs = require('yargs');
const fs = require('fs');
const { mergePolygonsByDistance, minDistanceBetweenPolygon, getAllPoints } = require('./mergePolygonsByDistance');

async function start() {
  const { argv } = yargs
    .option('input', {
      alias: 'i',
      description: 'Input path of geojson file',
      type: 'string',
    })
    .option('output', {
      alias: 'o',
      description: 'Output path of geojson file',
      type: 'string',
      default: 'output.geojson',
    })
    .option('maxDistance', {
      alias: 'd',
      description: 'distance in kilometers to consider polygons belonging to the same group',
      type: 'number',
      default: 4,
    })
    .option('maxEdge', {
      alias: 'e',
      description: "the length (in 'units') of an edge necessary for part of the hull to become concave. Cannot be lower than maxDistance + 1.",
      type: 'number',
      default: 5,
    })
    .option('units', {
      alias: 'u',
      description: 'can be degrees, radians, miles, or kilometers',
      type: 'string',
      default: 'kilometers',
    })
    .demandOption(['input'], 'Please provide input file path')
    .help()
    .alias('help', 'h');

  const { input } = argv;
  if (!input) {
    throw new Error('no input provided');
  }
  const output = argv.output || 'output.geojson';
  const maxDistance = argv.maxDistance || 4;
  const maxEdge = argv.maxEdge || 5;
  const units = argv.units || 'kilometers';

  const geoInput = JSON.parse(fs.readFileSync(input, 'utf8'));
  const geoResult = await mergePolygonsByDistance(geoInput, { maxDistance, units, maxEdge });
  fs.writeFileSync(output, JSON.stringify(geoResult), { flag: 'w' });
}

if (require.main === module) {
  start();
}

module.exports = { mergePolygonsByDistance, minDistanceBetweenPolygon, getAllPoints };
