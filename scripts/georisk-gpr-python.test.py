import importlib.util
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import xlrd

spec = importlib.util.spec_from_file_location("gpr", Path(__file__).with_name("collect-georisk-gpr.py"))
gpr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gpr)


class Sheet:
    def __init__(self, rows):
        self.rows, self.nrows = rows, len(rows)

    def row_values(self, row):
        return self.rows[row]

    def cell_value(self, row, col):
        return self.rows[row][col]


class GprParserTests(unittest.TestCase):
    now = datetime(2026, 10, 4, tzinfo=timezone.utc)

    def parse(self, rows, frequency):
        sheet = Sheet(rows)
        with patch.object(xlrd, "open_workbook", return_value=SimpleNamespace(datemode=0, sheet_by_index=lambda _: sheet)):
            return gpr.parse_workbook(b"fixture", frequency, self.now)

    def test_monthly_country_values_keep_percent_units(self):
        columns = ["month", "GPR", "GPRT", "GPRA"] + ["GPRC_" + code for code in gpr.COUNTRIES]
        rows = [columns, [xlrd.xldate.xldate_from_date_tuple((2026, 9, 1), 0), 150, 160, 140] + [0.15] * len(gpr.COUNTRIES)]
        series = self.parse(rows, "monthly")
        self.assertEqual(series[0]["latest"], {"date": "2026-09-01", "value": 150})
        self.assertEqual(series[3]["unit"], "% de artículos")
        self.assertEqual(series[3]["latest"]["value"], 0.15)

    def test_source_schema_changes_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "schema changed"):
            self.parse([["DAY", "GPRD"], ["20261001", 123]], "daily")

    def test_invalid_future_and_duplicate_daily_data_are_rejected(self):
        columns = ["DAY", "GPRD", "GPRD_THREAT", "GPRD_ACT"]
        for rows in [[["20261005", 100, 100, 100]], [["20261001", -1, 100, 100]],
                     [["20261001", 100, 100, 100], ["20261001", 101, 100, 100]]]:
            with self.assertRaises(ValueError):
                self.parse([columns] + rows, "daily")


if __name__ == "__main__":
    unittest.main()
