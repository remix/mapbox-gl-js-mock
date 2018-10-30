# mapbox-gl-js-mock

[![CircleCI](https://circleci.com/gh/mapbox/mapbox-gl-js-mock/tree/master.svg?style=svg)](https://circleci.com/gh/mapbox/mapbox-gl-js-mock/tree/master)

A maybe-some-day-fully-featured mock for mapbox-gl-js

Work on this is on a need come basis. As we find ourselves writing tests for Mapbox Studio and mapbox maintained mapbox-gl extensions we make this better.
If you have a feature in mapbox-gl-js that you want supported here, please feel free to create an issue or open a PR.


### Fork by Qwant Research
To [foot their needs], Qwant Research has made some changes to the [original mock library](https://github.com/mapbox/mapbox-gl-js-mock) :

- replace evented by a simple event mock with a prepare method
- insert a clickable mapbox marker
- bind the map instance to window global as window.MAP_MOCK
- flyTo method
- transform object (basic)
