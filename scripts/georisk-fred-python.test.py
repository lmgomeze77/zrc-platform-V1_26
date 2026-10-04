import importlib.util
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('collector', Path(__file__).with_name('collect-georisk-fred.py'))
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)

class FredTests(unittest.TestCase):
    def data(self, extra=''):
        return ('observation_date,CPIAUCNS\n' + ''.join(f'2025-{m:02d}-01,{100+m}\n' for m in range(1,13)) + '2026-01-01,120\n2026-08-01,130\n' + extra).encode()
    def test_source_metadata_and_raw_index(self):
        result = collector.convert(self.data(), '2026-10-04T12:00:00+00:00')
        self.assertEqual(result['original_provider'], 'BLS')
        self.assertEqual(result['series'], 'CPIAUCNS')
        self.assertEqual(result['points'][-1], {'date':'2026-08-01','value':130})
        self.assertEqual(len(result['source_sha256']),64)
    def test_reject_invalid_or_duplicate_values_and_stale_release(self):
        for extra in ['2026-08-01,140\n','2026-09-01,-1\n','2026-09-01,NaN\n','2027-01-01,140\n']:
            with self.assertRaises(ValueError): collector.convert(self.data(extra), '2026-10-04T12:00:00+00:00')
        with self.assertRaises(ValueError): collector.convert(self.data(), '2027-01-04T12:00:00+00:00')
    def test_gap_is_not_zero_and_wrong_adjustment_is_rejected(self):
        result = collector.convert(self.data('2026-09-01,.\n'), '2026-10-04T12:00:00+00:00')
        self.assertEqual(result['points'][-1]['date'], '2026-08-01')
        with self.assertRaises(ValueError): collector.convert(self.data().replace(b'CPIAUCNS',b'CPIAUCSL'), '2026-10-04T12:00:00+00:00')

if __name__ == '__main__': unittest.main()
