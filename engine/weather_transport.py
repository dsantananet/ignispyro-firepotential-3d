"""Bounded transport of the existing ECMWF IFS 0.25 wind inputs.

NAS input is bound to the requested box and retains its collection timestamp.
There is no synthetic weather fallback or change to the physical solver.
"""
import datetime as dt
import json
import math
import os
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def validate_hourly(data, request):
    hourly = data['hourly']
    times = hourly['time']
    speeds = hourly['wind_speed_10m']
    directions = hourly['wind_direction_10m']
    if not 2 <= len(times) <= 500 or len(times) != len(speeds) or len(times) != len(directions):
        raise ValueError('Incomplete ECMWF wind series')
    stamps = [dt.datetime.fromisoformat(t).replace(tzinfo=dt.timezone.utc) for t in times]
    if any(b-a != dt.timedelta(hours=1) for a,b in zip(stamps,stamps[1:])):
        raise ValueError('ECMWF wind timestamps are not continuous')
    for speed, direction in zip(speeds,directions):
        if (type(speed) not in (int,float) or type(direction) not in (int,float)
                or not math.isfinite(speed) or not math.isfinite(direction)
                or not 0 <= speed <= 150 or not 0 <= direction <= 360):
            raise ValueError('Invalid ECMWF wind values')
    start = dt.datetime.fromisoformat(request['time'].replace('Z','+00:00')).astimezone(dt.timezone.utc)
    end = start + dt.timedelta(hours=request.get('hours',1)-1)
    if not stamps[0] <= start <= end <= stamps[-1]:
        raise ValueError('ECMWF wind does not cover the requested hours')
    return data


def load_weather(request):
    supplied = os.environ.get('WIND_WEATHER_JSON','').strip()
    if supplied:
        if len(supplied.encode()) > 65536:
            raise ValueError('NAS weather input limit')
        value = json.loads(supplied)
        if (value.get('bbox') != request['bbox'] or value.get('model') != 'ecmwf_ifs025'
                or value.get('endpoint') not in ('forecast','ecmwf')
                or value.get('source') != 'Open-Meteo ECMWF IFS 0.25 via QNAP'):
            raise ValueError('NAS weather provenance does not match the request')
        collected = dt.datetime.fromisoformat(value['retrieved_at'].replace('Z','+00:00'))
        if collected.tzinfo is None or not -300 <= (dt.datetime.now(dt.timezone.utc)-collected).total_seconds() <= 7200:
            raise ValueError('NAS weather collection timestamp is invalid or stale')
        return validate_hourly(value['data'],request), value['retrieved_at'], 'NAS relay / '+value['endpoint']
    w,s,e,n = request['bbox']
    query = urlencode(dict(latitude=(s+n)/2,longitude=(w+e)/2,
        hourly='wind_speed_10m,wind_direction_10m',wind_speed_unit='kmh',timezone='UTC',
        past_days=1,forecast_days=7,models='ecmwf_ifs025'))
    error = None
    for endpoint in ('forecast','ecmwf'):
        for attempt in range(3):
            try:
                req = Request('https://api.open-meteo.com/v1/'+endpoint+'?'+query,
                              headers={'User-Agent':'IGNISPYRO-WindNinja/4.0.0'})
                with urlopen(req,timeout=15) as response:
                    raw = response.read(1_000_001)
                if len(raw) > 1_000_000:
                    raise ValueError('ECMWF response limit')
                data = validate_hourly(json.loads(raw),request)
                return data, dt.datetime.now(dt.timezone.utc).isoformat(), 'runner / '+endpoint
            except (OSError,ValueError,KeyError,TypeError) as exc:
                error = exc
                if attempt < 2:
                    time.sleep(.5*(attempt+1))
    raise RuntimeError('ECMWF weather unavailable on both validated routes') from error
