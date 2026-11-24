# General alignment zones — 24 November 2026

Adjacent polygons with the same wind/uphill/sun favorable components are
dissolved. Speed, intensity and secondary regime changes do not split the
general alignment map. Three distinct 2/3 combinations remain distinct;
disconnected zones, holes, epochs and direction reference conventions are
preserved. This is directional alignment, not uniform physical behaviour.

Wind speed and local direction remain on the coloured wind arrows. Standalone
FirePotential has no calculated fireline intensity; it does not invent one.
Physical simulator outputs expose their values in separate reference vectors.
Polygon popups display components, area, reference time and adjacency.

`zones.js` rebuilds the general map and contact graph from analytical polygons
and existing edges, including saved cloud results with the older segmentation.
It preserves source IDs, does not modify saved records or physical arrival times,
and drops internal links after merging. Export uses the new zone IDs and links.
General zones use their analytical geometry rather than individually smoothed
boundaries. Terrain/solar background values are area-weighted summaries.

For a saved real-terrain scenario with hypothetical west wind at 20 km/h,
31 polygons/60 links become 21 zones/37 links. Coverage and factor combinations
are conserved within numerical tolerance. The reduction depends on the case.
Run `node test-zones.cjs` along with the existing checks. It tests grouping,
different 2/3 pairs, source IDs, disconnected zones and remapped adjacency.
