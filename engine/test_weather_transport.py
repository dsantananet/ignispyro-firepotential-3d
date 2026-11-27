import datetime as dt
import json
import os
import unittest
from unittest.mock import patch,Mock
from urllib.error import URLError
from weather_transport import load_weather

class WeatherTransportTests(unittest.TestCase):
    def setUp(self):
        self.now=dt.datetime.now(dt.timezone.utc).replace(minute=0,second=0,microsecond=0)
        self.q={'bbox':[-7.49,39.81,-7.44,39.85],'time':self.now.isoformat(),'hours':1}
        self.data={'hourly':{'time':[(self.now+dt.timedelta(hours=i)).strftime('%Y-%m-%dT%H:%M') for i in range(2)],'wind_speed_10m':[12,13],'wind_direction_10m':[180,190]}}
        self.relay={'bbox':self.q['bbox'],'model':'ecmwf_ifs025','endpoint':'forecast','source':'Open-Meteo ECMWF IFS 0.25 via QNAP','retrieved_at':dt.datetime.now(dt.timezone.utc).isoformat(),'data':self.data}
    def test_relay_retains_data_and_collection_time_without_network(self):
        with patch.dict(os.environ,WIND_WEATHER_JSON=json.dumps(self.relay)),patch('weather_transport.urlopen') as network:
            data,collected,route=load_weather(self.q)
        self.assertEqual(data,self.data);self.assertEqual(collected,self.relay['retrieved_at']);self.assertEqual(route,'NAS relay / forecast');network.assert_not_called()
    def test_mismatched_box_or_model_is_rejected(self):
        for field,value in [('bbox',[0,0,1,1]),('model','other')]:
            bad={**self.relay,field:value}
            with patch.dict(os.environ,WIND_WEATHER_JSON=json.dumps(bad)),self.assertRaises(ValueError):load_weather(self.q)
    def test_missing_hour_and_invalid_wind_are_rejected(self):
        for field,value in [('time',[self.now.strftime('%Y-%m-%dT%H:%M')]),('wind_speed_10m',[None,13]),('wind_direction_10m',[361,190])]:
            bad={**self.relay,'data':{'hourly':{**self.data['hourly'],field:value}}}
            with patch.dict(os.environ,WIND_WEATHER_JSON=json.dumps(bad)),self.assertRaises(ValueError):load_weather(self.q)
    def test_network_reset_uses_bounded_retry_and_same_model_alternative(self):
        response=Mock();response.read.return_value=json.dumps(self.data).encode();response.__enter__=Mock(return_value=response);response.__exit__=Mock(return_value=False)
        with patch.dict(os.environ,WIND_WEATHER_JSON=''),patch('weather_transport.time.sleep'),patch('weather_transport.urlopen',side_effect=[URLError('reset')]*3+[response]) as network:
            data,_,route=load_weather(self.q)
        self.assertEqual(data,self.data);self.assertEqual(route,'runner / ecmwf');self.assertEqual(network.call_count,4)
        self.assertIn('models=ecmwf_ifs025',network.call_args.args[0].full_url)
if __name__=='__main__':unittest.main()
