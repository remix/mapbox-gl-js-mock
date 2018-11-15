var Bounds = require('./bounds');
var union = require('@turf/union');
var bboxPolygon = require('@turf/bbox-polygon');
var buffer = require('@turf/buffer');
var Point = require('@mapbox/point-geometry');

var LngLat = require('mapbox-gl').LngLat;
var Evented = require('./evented');
var Transform = require('./transform')

var Style = require('./style');

var defaultOptions = {
  doubleClickZoom: true
};

function functor(x) {
  return function() {
    return x;
  };
}

function _fakeResourceTiming(name) {
  return {
    name: name,
    secureConnectionStart: 0,
    redirectEnd: 0,
    redirectStart: 0,
    workerStart: 0,
    startTime: 2886.775,
    connectStart: 2886.775,
    connectEnd: 2886.875,
    fetchStart: 2886.875,
    domainLookupStart: 2886.775,
    domainLookupEnd: 2886.875,
    requestStart: 2890.3700000000003,
    responseStart: 2893.1650000000004,
    responseEnd: 2893.78,
    duration: 7.005000000000109,
    entryType: 'resource',
    initiatorType: 'xmlhttprequest',
    nextHopProtocol: 'http/1.1',
    encodedBodySize: 155,
    decodedBodySize: 155,
    serverTiming: [],
    transferSize: 443
  };
}

var Map = function(options) {
  window.MAP_MOCK = this
  this.evented = new Evented();
  this.options = Object.assign({}, defaultOptions, options);
  this._events = {};
  this._sources = {};
  this._images = {};
  this.layers = {};
  this._collectResourceTiming = !!this.options.collectResourceTiming;
  this.zoom = this.options.zoom || 0;
  this.center = this.options.center ? new LngLat(this.options.center[0], this.options.center[1]) : new LngLat(0, 0);
  this.style = new Style();
  this.canvas = document.createElement('canvas');
  this.popups = [];
  this.transform = new Transform();
  this._controlCorners = {
    'top-left': {
      appendChild: function() {}
    }
  };
  const container = this.options.container;
  if(container && document.querySelector(`#${container}`)) {
    document.querySelector(`#${container}`).innerHTML = '<div><H1>THIS IS A MOCK MAP</H1><canvas class="mapboxgl-canvas"></canvas><div style="width: 300px;height: 100px;background: crimson" id="mock_poi" onmouseenter="MAP_MOCK.fire(\'mouseenter\', \'poi-level-1\')" onclick="MAP_MOCK.fire(\'click\',\'poi-level-1\')"></div></div>';
  }
  setTimeout(function() {
    this.fire('style.load');
    this.fire('load');
  }.bind(this), 0);

  var setters = [
    // Camera options
    'jumpTo', 'panTo', 'panBy',
    'setBearing',
    'setPitch',
    'setZoom',
    'resetNorth',
    'snapToNorth',
    // Settings
    'setMaxBounds', 'setMinZoom', 'setMaxZoom',
    // Layer properties
    'setLayoutProperty',
    'setPaintProperty'
  ];
  var genericSetter = functor(this);
  for (var i = 0; i < setters.length; i++) {
    this[setters[i]] = genericSetter;
  }
};

Map.prototype.addImage = function(id, el) {
  this._images[id] = el;
};

Map.prototype.hasImage = function(id) {
  return this._images[id];
};

Map.prototype.addControl = function(control) {
  control.onAdd(this);
};

Map.prototype.removeControl = function(control) {
  control.onRemove(this);
};

Map.prototype.getContainer = function() {
  if(this.options.container){
    return this.options.container;
  }
  var container = {
    parentNode: container,
    appendChild: function() {},
    removeChild: function() {},
    getElementsByClassName: function() {
      return [container];
    },
    addEventListener: function(name, handle) {},
    removeEventListener: function(){},
    classList: {
      add: function() {},
      remove: function(){}
    }
  };

  return container;
};

Map.prototype.getSource = function(name) {
  if (this._sources[name]) {
    return {
      setData: function(data) {
        this._sources[name].data = data;
        if (this._sources[name].type === 'geojson') {
          const e = {
            type: 'data',
            sourceDataType: 'content',
            sourceId: name,
            isSourceLoaded: true,
            dataType: 'source',
            source: this._sources[name]
          };
          // typeof data === 'string' corresponds to an AJAX load
          if (this._collectResourceTiming && data && (typeof data === 'string')){
            e.resourceTiming = [ _fakeResourceTiming(data) ];
          }
          this.fire('data', e);
        }
      }.bind(this),
      loadTile: function() {}
    };
  }
};

Map.prototype.setStyle = function() {
  setTimeout(function() {
    this.fire('style.load');
  }.bind(this), 0);
};

Map.prototype.loaded = function() {
  return true;
};


Map.prototype.addSource = function(name, source) {
  this._sources[name] = source;
  if (source.type === 'geojson') {
    const e = {
      type: 'data',
      sourceDataType: 'metadata',
      sourceId: name,
      isSourceLoaded: true,
      dataType: 'source',
      source: source
    };
    if (this._collectResourceTiming && source.data && (typeof source.data === 'string')){
      e.resourceTiming = [ _fakeResourceTiming(source.data) ];
    }
    this.fire('data', e);
  }
};

Map.prototype.removeSource = function(name) {
  delete this._sources[name];
};

Map.prototype.addLayer = function(layer, before) { this.layers[layer.id] = layer; };
Map.prototype.removeLayer = function(layerId) { delete this.layers[layerId]; };
Map.prototype.getLayer = function(layerId) {return this.layers[layerId]; };

Map.prototype.getZoom = function() { return this.zoom; };
Map.prototype.getBearing = functor(0);
Map.prototype.getPitch = functor(0);
Map.prototype.getCenter = function() { return this.center; };
Map.prototype.setCenter = function(x) { this.center = new LngLat(x[0], x[1]); };

Map.prototype.doubleClickZoom = {
  disable: function() {},
  enable: function() {}
};

Map.prototype.boxZoom = {
  disable: function() {},
  enable: function() {}
};

Map.prototype.dragPan = {
  disable: function() {},
  enable: function() {}
};

Map.prototype.project = function(lnglat) {
  return new Point(0, 0);
};

Map.prototype.unproject = function(point) {
  point = point || { x: 0, y: 0};
  return new LngLat((point.x || 0), (point.y || 0));
};

/**
 * Returns an array of features that overlap with the pointOrBox
 * Currently it does not respect queryParams
 *
 * pointOrBox: either [x, y] pixel coordinates of a point, or [ [x1, y1] , [x2, y2] ]
 */
Map.prototype.queryRenderedFeatures = function(pointOrBox, queryParams) {
  var searchBoundingBox = [];
  if (pointOrBox[0].x !== undefined) {
    // convert point into bounding box
    searchBoundingBox = [
      Math.min(pointOrBox[0].x, pointOrBox[1].x),
      Math.min(pointOrBox[0].y, pointOrBox[1].y),
      Math.max(pointOrBox[0].x, pointOrBox[1].y),
      Math.max(pointOrBox[0].x, pointOrBox[1].y)
    ];
  } else {
    // convert box in bounding box
    searchBoundingBox = [
      Math.min(pointOrBox[0][0], pointOrBox[1][0]),
      Math.min(pointOrBox[0][1], pointOrBox[1][1]),
      Math.max(pointOrBox[0][0], pointOrBox[1][0]),
      Math.max(pointOrBox[0][1], pointOrBox[1][1])
    ];
  }

  var searchPolygon = bboxPolygon(searchBoundingBox);
  var features = Object.keys(this._sources).reduce(
    (memo, name) => memo.concat(this._sources[name].data.features), []
  );
  features = features.filter(feature => {
    var subFeatures = [];
    if (feature.geometry.type.startsWith('Multi')) {
      // Break multi features up into single features so we can look at each one
      var type = feature.geometry.type.replace('Multi', '');
      subFeatures = feature.geometry.coordinates.map(coords => {
        return {
          type: 'Feature',
          properties: feature.properties,
          geometry: {
            type: type,
            coordinates: coords
          }
        };
      });
    } else {
      subFeatures.push(feature);
    }

    // union only works with polygons, so we convert points and lines into polygons
    // TODO: Look into having this buffer match the style
    subFeatures = subFeatures.map(subFeature => {
      if (subFeature.geometry.type === 'Point' || subFeature.geometry.type === 'LineString') {
        return buffer(subFeature, .00000001, 'kilometers');
      } else {
        return subFeature;
      }
    });

    // if any of the sub features intersect with the seach box, return true
    // if none of them intersect with the search box, return false
    return subFeatures.some(subFeature => {
      // union takes two polygons and merges them.
      // If they intersect it returns them merged Polygon geometry type
      // If they don't intersect it retuns them as a MultiPolygon geomentry type
      var merged = union(subFeature, searchPolygon);
      return merged.geometry.type === 'Polygon';
    });
  });

  return features;
};

Map.prototype.remove = function() {
  this.layers = {};
  this._events = [];
  this.sources = [];
  this._images = {};
};

Map.prototype.resize = function() {
};

Map.prototype.isStyleLoaded = function() {
  return true;
};

Map.prototype.getCanvasContainer = function() {
  return this.canvas;
};

Map.prototype.addImage = function(id, image) {
};

Map.prototype.getStyle = function() {
  return {
    layers: Object.values(this.layers),
    metadata: {},
    sources: Object.values(this._sources),
    zoom : this.zoom,
    center: this.center
  };
};

Map.prototype.selectPoi = function() {
  return {name : 'poi test'}
};

Map.prototype.getBounds = function () {
  return new Bounds(this)
}

Map.prototype.on = function(type, ...options) {
  this.evented.on(type, ...options)
}

Map.prototype.off = function(type, layer, fn) {
  this.evented.off(type, layer, fn)
}

Map.prototype.once = function(type, layer, fn) {
  this.evented.once(type, layer, fn)
}

Map.prototype.fire = function(type, layer) {
  this.evented.fire(type, layer)
}

Map.prototype.listens = function(type, layer) {
  this.evented.listens(type, layer)
}

Map.prototype.flyTo = function({center, zoom}) {
  this.center = center
  this.zoom = zoom
}

Map.prototype.fitBounds = function(bounds) {
  this.center = {lat : bounds[0], lng : bounds[3]}
  this.zoom = zoom
}

Map.prototype.getCanvas = function() {
  return document.createElement('canvas')
}

module.exports = Map;
