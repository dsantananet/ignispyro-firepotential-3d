"""Global projected terrain domains with explicit provider and date-line limits."""
import math
MAX_LATITUDE=84.8

def validate_extent(bbox):
    if not isinstance(bbox,list) or len(bbox)!=4 or any(type(x) not in (float,int) or not math.isfinite(x) for x in bbox):raise ValueError('Finite bounding box required')
    w,s,e,n=bbox
    if not -180<w<e<180:raise ValueError('Invalid longitude extent; split areas crossing the antimeridian')
    if not -MAX_LATITUDE<s<n<MAX_LATITUDE:raise ValueError('Terrain tile coverage is limited to +/-84.8 latitude')
    if (e-w)*111320*math.cos(math.radians((s+n)/2))>24000 or (n-s)*111320>24000:raise ValueError('Domain exceeds 24 km')
    return bbox

def projected_epsg(lon,lat):
    if lat>=84:return 3413
    if lat<=-80:return 3031
    zone=max(1,min(60,int((lon+180)//6)+1))
    return (32600 if lat>=0 else 32700)+zone
