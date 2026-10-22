import importlib.util
import unittest
from unittest.mock import patch
import io
import json
from datetime import datetime, timezone
from pathlib import Path

path = Path(__file__).with_name("collect-georisk-market-research.py")
spec = importlib.util.spec_from_file_location("collector", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

def fixture(series, n=410):
    from datetime import timedelta
    start=datetime(2025,1,1)
    return ("observation_date,"+series+"\n"+"\n".join(
        (start+timedelta(days=i)).strftime("%Y-%m-%d")+","+str(50+i/100)
        for i in range(n))).encode()

class CollectorTests(unittest.TestCase):
    def test_official_api_observations_converted_to_csv(self):
        payload={'observations':[{'date':'2026-10-19','value':'4.15'},{'date':'2026-10-20','value':'.'}]}
        class Response(io.BytesIO):
            def __enter__(self): return self
            def __exit__(self,*args): self.close()
        with patch.object(mod.urllib.request,'urlopen',return_value=Response(json.dumps(payload).encode())) as mocked:
            raw=mod.fetch_fred_api('DGS10','testkey')
        self.assertIn(b'2026-10-19,4.15',raw)
        self.assertIn(b'2026-10-20,.',raw)
        self.assertIn('api.stlouisfed.org',mocked.call_args.args[0].full_url)

    def test_valid_with_dates_and_provenance(self):
        def fetch(url):
            return fixture(url.split("id=")[-1])
        out=mod.collect(fetch=fetch,now=datetime(2026,2,14,tzinfo=timezone.utc))
        self.assertEqual(len(out["series"]),5)
        self.assertEqual(out["status"],"available")
        self.assertEqual(len(out["series"][0]["download_sha256"]),64)
        self.assertEqual(out["series"][0]["points"][0]["date"],"2025-01-01")
    def test_missing_header_fails(self):
        with self.assertRaises(ValueError):
            mod.parse_csv(b"DATE,OTHER\n2026-01-01,2\n","DGS10","2026-01-02")
    def test_fictitious_prices_fail(self):
        raw=fixture("DGS10").replace(b",50.0",b",NaN")
        with self.assertRaises(ValueError):
            mod.parse_csv(raw,"DGS10","2026-02-14")
    def test_partial_collection_reports_source_failure(self):
        def fetch(url):
            if url.endswith("DGS10"): raise RuntimeError("offline")
            return fixture(url.split("id=")[-1])
        out=mod.collect(fetch=fetch,now=datetime(2026,2,14,tzinfo=timezone.utc))
        self.assertEqual(out["status"],"partial")
        self.assertEqual(len(out["series"]),4)
        self.assertEqual(out["failures"][0]["id"],"DGS10")
        self.assertFalse(any(x["id"]=="DGS10" for x in out["series"]))

if __name__=="__main__":
    unittest.main()
