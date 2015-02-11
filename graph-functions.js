var fs = require('fs'),
    options = JSON.parse(fs.readFileSync('config.json', 'utf8')),
    grex = require('grex'),
    client = grex.createClient(options),
    gremlin = grex.gremlin,
    g = grex.g;

function execute(query, callback) {
  client.execute(query, function(err, response) {
    if (response) {
      return callback(response);
    }
    if (err) {
      process.stderr.write("ERROR:");
      process.stderr.write(err);
      callback(null);
    }
  });
}

function gremlinToD3(query, callback) {
  execute(gremlin(query), function(response) {
    //console.log(JSON.stringify(response, undefined, 2));

    if (response.results.length > 0) {
      var geojson = {
        type: "FeatureCollection",
        features: []
      };

      response.results.forEach(function(pathOrVertex) {
        var path = [],
            feature = {
              type: "Feature",
              properties: {
                type: "",
                pits: [],
                relations: []
              },
              geometry: {
                type: "GeometryCollection",
                geometries: []
              }
            },
            geometryIndex = 0;

        if (pathOrVertex.constructor === Array) {
          path = pathOrVertex;
        } else {
          path = [pathOrVertex];
        }
        path.forEach(function(object) {
          feature.properties.type = object.type;

          if (object._type === "vertex") {
            var pit = {
              startDate: object.startDate,
              source: object.source,
              name: object.name,
              endDate: object.endDate,
              type: object.type,
              uri: object.uri,
              // TODO: matched-query: true/false
            };

            if (object.geometry && object.geometry.type) {
              pit.geometryIndex = geometryIndex;
              feature.geometry.geometries.push(object.geometry);
              geometryIndex += 1;
            } else {
              pit.geometryIndex = -1;
            }

            feature.properties.pits.push(pit);
          } else {
            // Found edge!

            // Naming convention for edge URIs, example:
            // hg:conceptIdentical-inferredAtomicRelationEdge-geonames/2758064-tgn/1047690

            var uriElements = object.uri.split("-");
            feature.properties.relations.push({
              from: uriElements[2],
              to: uriElements[3],
              source: object.source,
              uri: object._label
            });
          }
        });
        geojson.features.push(feature);
      });

      callback(geojson);
    } else {
      callback({
        "message": "Nothing found..."
      });
    }
  });
}

module.exports.gremlinToD3 = gremlinToD3;