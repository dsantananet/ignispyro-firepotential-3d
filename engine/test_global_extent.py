import unittest
from global_extent import validate_extent,projected_epsg
class GlobalExtentTests(unittest.TestCase):
 def test_projected_hemispheres_and_polar_domains(self):
  for lon,lat,expected in [(-8,40,32629),(-44.6,-22.4,32723),(139,36,32654),(15.6,78.2,32633),(10,84.2,3413),(10,-82,3031)]:self.assertEqual(projected_epsg(lon,lat),expected)
 def test_realistic_global_domains(self):
  for b in [[-8.15,41.72,-8.11,41.76],[-44.63,-22.48,-44.59,-22.44],[15.60,78.20,15.66,78.24],[10,84.1,10.05,84.13]]:self.assertEqual(validate_extent(b),b)
 def test_unknown_poles_date_line_and_unbounded_requests_are_rejected(self):
  for b in [[179.9,0,-179.9,.05],[0,85,1,85.1],[-8,40,-7,41],[0,float('nan'),.1,1]]:
   with self.assertRaises(ValueError):validate_extent(b)
