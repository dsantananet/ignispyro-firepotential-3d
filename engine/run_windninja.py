"""Bounded real-terrain WindNinja job. No fire/fuel model or synthetic terrain."""
import argparse, datetime as dt, hashlib, json, math, os, subprocess, urllib.request
from pathlib import Path
import numpy as np
import rasterio
from rasterio.io import MemoryFile
from rasterio.transform import from_origin
from pyproj import Transformer, Geod

def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()

def validate(q):
    bbox=q['bbox']
    if len(bbox)!=4 or any(type(v) not in (int,float) or not math.isfinite(v) for v in bbox):
        raise ValueError('Finite bounding box required')
    w,s,e,n=bbox
    if not (-179<w<e<179 and -70<s<n<70): raise ValueError('Invalid extent')
    if (e-w)*111320*math.cos(math.radians((s+n)/2))>24000 or (n-s)*111320>24000:
        raise ValueError('Domain exceeds 24 km')
    if q.get('vegetation') not in ('grass','brush','trees'): raise ValueError('Choose surface roughness')
    time=dt.datetime.fromisoformat(q['time'].replace('Z','+00:00'))
    if time.tzinfo is None: raise ValueError('Timezone required')
    if q.get('hours',1) not in range(1,7): raise ValueError('1 to 6 hourly fields')
    return time.astimezone(dt.timezone.utc)

def terrain(bbox,out):
    w,s,e,n=bbox;lon=(w+e)/2;lat=(s+n)/2
    epsg=(32600 if lat>=0 else 32700)+int((lon+180)//6)+1
    forward=Transformer.from_crs(4326,epsg,always_xy=True)
    inverse=Transformer.from_crs(epsg,4326,always_xy=True)
    corners=[forward.transform(x,y) for x in (w,e) for y in (s,n)]
    # 25% buffer outside requested area; crop results back to requested bounds.
    xmin=min(p[0] for p in corners);xmax=max(p[0] for p in corners)
    ymin=min(p[1] for p in corners);ymax=max(p[1] for p in corners)
    pad=max(xmax-xmin,ymax-ymin)*.25+300
    xmin=math.floor((xmin-pad)/100)*100;ymax=math.ceil((ymax+pad)/100)*100
    cols=math.ceil((max(p[0] for p in corners)+pad-xmin)/100)
    rows=math.ceil((ymax-min(p[1] for p in corners)+pad)/100)
    if rows*cols>160000: raise ValueError('DEM too large')
    transform=from_origin(xmin,ymax,100,100)
    rr,cc=np.indices((rows,cols));x,y=transform*(cc+.5,rr+.5)
    lons,lats=inverse.transform(x,y)
    tx=(lons+180)/360*4096;ty=(1-np.arcsinh(np.tan(np.radians(lats)))/np.pi)/2*4096
    ix=np.floor(tx).astype(int);iy=np.floor(ty).astype(int)
    dem=np.full((rows,cols),np.nan,dtype='float32');hashes={}
    for a,b in sorted(set(zip(ix.ravel(),iy.ravel()))):
        url=f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/{a}/{b}.png'
        raw=get(url);hashes[f'12/{a}/{b}']=hashlib.sha256(raw).hexdigest()
        with MemoryFile(raw) as mem:
            with mem.open() as ds: rgb=ds.read()
        mask=(ix==a)&(iy==b);px=np.minimum(255,((tx[mask]-a)*256).astype(int));py=np.minimum(255,((ty[mask]-b)*256).astype(int))
        values=rgb[0,py,px].astype(float)*256+rgb[1,py,px]+rgb[2,py,px]/256-32768
        if np.any(rgb[0,py,px]==0): raise ValueError('Missing terrain tile pixels')
        dem[mask]=values
    if not np.isfinite(dem).all(): raise ValueError('Incomplete terrain')
    path=out/'dem.tif'
    with rasterio.open(path,'w',driver='GTiff',height=rows,width=cols,count=1,dtype='float32',crs=f'EPSG:{epsg}',transform=transform,nodata=-9999) as ds: ds.write(dem,1)
    return path,{'source':'Mapzen Terrarium / AWS terrain tiles','zoom':12,'resampled_m':100,'buffer_fraction':.25,'tile_sha256':hashes,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'crs':f'EPSG:{epsg}'}

def run(q,package,out):
    start=validate(q);out=Path(out).resolve();out.mkdir(parents=True,exist_ok=True)
    w,s,e,n=q['bbox'];lat=(s+n)/2;lon=(w+e)/2
    weather=json.loads(get(f'https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh&timezone=UTC&forecast_days=7&models=ecmwf_ifs025'))
    retrieved=dt.datetime.now(dt.timezone.utc).isoformat();times=[dt.datetime.fromisoformat(t).replace(tzinfo=dt.timezone.utc) for t in weather['hourly']['time']]
    requested=[start+dt.timedelta(hours=i) for i in range(q.get('hours',1))]
    if min(requested)<times[0] or max(requested)>times[-1]: raise ValueError('Selected time outside current ECMWF forecast')
    dem,dem_meta=terrain(q['bbox'],out)
    exe=list(Path(package).rglob('*CLI*.exe'))+list(Path(package).rglob('*cli*.exe'))
    exe=list({p.resolve() for p in exe if 'ninja' in p.name.lower()})
    if len(exe)!=1: raise ValueError('Unique official WindNinja CLI required')
    exe=exe[0];env=os.environ.copy();env['PATH']=str(exe.parent)+os.pathsep+env.get('PATH','')
    manifest={'request':q,'fields':[],'dem':dem_meta,'experimental':True,'operational':False,'fire_solver_ready':False,'windninja_exe_sha256':hashlib.sha256(exe.read_bytes()).hexdigest()}
    for i,time in enumerate(requested):
        k=max(k for k,t in enumerate(times) if t<=time);k2=min(k+1,len(times)-1)
        weight=0 if k==k2 else (time-times[k]).total_seconds()/3600
        vectors=[]
        for j in (k,k2):
            speed=weather['hourly']['wind_speed_10m'][j];direction=weather['hourly']['wind_direction_10m'][j]
            if speed is None or direction is None or not 0<=speed<=150 or not 0<=direction<=360: raise ValueError('Invalid forecast wind')
            vectors.append((-speed/3.6*math.sin(math.radians(direction)),-speed/3.6*math.cos(math.radians(direction))))
        u,v=[vectors[0][j]*(1-weight)+vectors[1][j]*weight for j in (0,1)]
        speed=math.hypot(u,v);direction=math.degrees(math.atan2(-u,-v))%360
        raw=out/f'raw-{i}';raw.mkdir();cfg=out/f'wind-{i}.cfg'
        settings={'num_threads':2,'elevation_file':str(dem),'output_path':str(raw),'initialization_method':'domainAverageInitialization','input_speed':speed,'input_speed_units':'mps','input_direction':direction,'input_wind_height':10,'units_input_wind_height':'m','output_wind_height':10,'units_output_wind_height':'m','output_speed_units':'mps','vegetation':q['vegetation'],'mesh_choice':'coarse','write_ascii_output':'true','ascii_out_resolution':100,'units_ascii_out_resolution':'m','write_goog_output':'false','write_shapefile_output':'false'}
        executed=speed>1e-6
        if executed:
            cfg.write_text(''.join(f'{key} = {value}\n' for key,value in settings.items()),encoding='utf-8')
            process=subprocess.run([str(exe),str(cfg)],cwd=exe.parent,env=env,capture_output=True,timeout=300)
            (raw/'stdout.txt').write_bytes(process.stdout);(raw/'stderr.txt').write_bytes(process.stderr)
            if process.returncode: raise RuntimeError(f'WindNinja failed ({process.returncode})')
            speeds=list(raw.glob('*_vel.asc'));angles=list(raw.glob('*_ang.asc'))
            if len(speeds)!=1 or len(angles)!=1: raise ValueError('Incomplete native outputs')
            with rasterio.open(speeds[0]) as ds,rasterio.open(angles[0]) as ds2:
                if (ds.crs,ds.transform,ds.shape)!=(ds2.crs,ds2.transform,ds2.shape) or not ds.crs.is_projected: raise ValueError('Wind grid mismatch')
                a=ds.read(1,masked=True).filled(np.nan);b=ds2.read(1,masked=True).filled(np.nan);aff=ds.transform;crs=ds.crs
        else:
            with rasterio.open(dem) as ds: a=np.zeros(ds.shape);b=a.copy();aff=ds.transform;crs=ds.crs
        rr,cc=np.indices(a.shape);xx,yy=aff*(cc+.5,rr+.5)
        inverse=Transformer.from_crs(crs,4326,always_xy=True);lons,lats=inverse.transform(xx,yy);nl,nla=inverse.transform(xx,yy+10)
        north,_,_=Geod(ellps='WGS84').inv(lons,lats,nl,nla)
        bearing=np.radians(b+north);us=-a*np.sin(bearing);vs=-a*np.cos(bearing)
        vector_dir=out/f'vectors-{i}';vector_dir.mkdir()
        for name,component in [('u',us),('v',vs)]:
            with rasterio.open(vector_dir/(name+'.tif'),'w',driver='GTiff',height=a.shape[0],width=a.shape[1],count=1,dtype='float32',crs=crs,transform=aff,nodata=-9999,compress='deflate') as ds:
                ds.write(np.where(np.isfinite(component),component,-9999).astype('float32'),1)
                ds.set_band_unit(1,'m/s');ds.update_tags(vector_reference='true_east_north',height_m='10',height_reference='above_vegetation')
        mask=(lons>=w-.002)&(lons<=e+.002)&(lats>=s-.002)&(lats<=n+.002)
        if not mask.any() or not np.isfinite(a[mask]).all() or not np.isfinite(b[mask]).all(): raise ValueError('Incomplete output coverage')
        if np.any(a[mask]<0) or np.any(a[mask]>100): raise ValueError('Invalid native wind speeds')
        valid=time.isoformat().replace('+00:00','Z')
        field={'type':'FeatureCollection','wind_source':'WindNinja 4.0.0 / ECMWF IFS 0.25 via Open-Meteo','valid_time':valid,'height_m':10,'height_reference':'above_vegetation','vegetation':q['vegetation'],'roughness_validated':False,'native_solver_executed':executed,'windninja':executed,'dem':dem_meta,'weather':{'source':'ECMWF via Open-Meteo','model':'ecmwf_ifs025','retrieved_at':retrieved,'issued_at':None,'input_height_reference':'10m_AGL_model; above-vegetation transfer unvalidated','speed_m_s':speed,'direction_from_true_deg':direction,'interpolation':'linear_uv','bracket':[times[k].isoformat(),times[k2].isoformat()]},'resolution_m':100,'mesh_choice':'coarse','diurnal_model':False,'stability_model':False,'operationally_validated':False,'features':[]}
        for row,col in zip(*np.where(mask)):
            field['features'].append({'type':'Feature','geometry':{'type':'Point','coordinates':[round(float(lons[row,col]),7),round(float(lats[row,col]),7)]},'properties':{'u':round(float(us[row,col]),5),'v':round(float(vs[row,col]),5)}})
        filename=f'field-{i}.geojson';(out/filename).write_text(json.dumps(field,separators=(',',':')),encoding='utf-8')
        manifest['fields'].append({'path':filename,'u':f'vectors-{i}/u.tif','v':f'vectors-{i}/v.tif','valid_time':valid,'end_at':(time+dt.timedelta(hours=1)).isoformat().replace('+00:00','Z'),'available_at':retrieved,'vectors':len(field['features']),'speed_min_ms':float(a[mask].min()),'speed_max_ms':float(a[mask].max())})
        (out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    return manifest

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--request',required=True);p.add_argument('--package',required=True);p.add_argument('--out',required=True);args=p.parse_args()
    run(json.loads(Path(args.request).read_text(encoding='utf-8-sig')),args.package,args.out)
