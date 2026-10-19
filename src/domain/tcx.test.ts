import { describe, expect, it } from "vitest";
import { buildTcx, escapeXml, type TcxActivity } from "./tcx";

const ride: TcxActivity = {
  sport: "Biking",
  startUtc: "2026-10-18T16:58:51Z",
  durationSec: 1800,
  distanceM: 14200.5,
  calories: 410,
  notes: "Peloton · 30 min Power Zone Ride <Instructor & co>",
  samples: [
    {
      offsetSec: 0,
      watts: 0,
      cadenceRpm: 0,
      heartRateBpm: 0,
      speedMps: 0,
      distanceM: 0,
    },
    {
      offsetSec: 1,
      watts: 180.4,
      cadenceRpm: 85,
      heartRateBpm: 131,
      speedMps: 7.9,
      distanceM: 7.9,
    },
    { offsetSec: 2, watts: null, cadenceRpm: 300, heartRateBpm: null },
  ],
};

describe("buildTcx", () => {
  const xml = buildTcx(ride);

  it("is a TCX document with the sport, id and one lap", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain(
      'xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"',
    );
    expect(xml).toContain(
      '<Activity Sport="Biking"><Id>2026-10-18T16:58:51.000Z</Id>',
    );
    expect(xml).toContain('<Lap StartTime="2026-10-18T16:58:51.000Z">');
    expect(xml).toContain("<TotalTimeSeconds>1800.0</TotalTimeSeconds>");
    expect(xml).toContain("<DistanceMeters>14200.5</DistanceMeters>");
    expect(xml).toContain("<Calories>410</Calories>");
    expect(xml).toContain("<Intensity>Active</Intensity>");
  });

  it("writes power, cadence, heart rate and speed per trackpoint", () => {
    expect(xml).toContain(
      "<Trackpoint><Time>2026-10-18T16:58:52.000Z</Time><DistanceMeters>7.9</DistanceMeters>" +
        "<HeartRateBpm><Value>131</Value></HeartRateBpm><Cadence>85</Cadence>" +
        "<Extensions><ns3:TPX><ns3:Speed>7.90</ns3:Speed><ns3:Watts>180</ns3:Watts></ns3:TPX></Extensions></Trackpoint>",
    );
  });

  it("omits what is missing, drops a zero heart rate and caps cadence", () => {
    expect(xml).toContain(
      "<Trackpoint><Time>2026-10-18T16:58:53.000Z</Time><Cadence>254</Cadence></Trackpoint>",
    );
    const first = xml.slice(
      xml.indexOf("<Trackpoint>"),
      xml.indexOf("</Trackpoint>"),
    );
    expect(first).not.toContain("HeartRateBpm");
  });

  it("escapes the notes", () => {
    expect(xml).toContain(
      "<Notes>Peloton · 30 min Power Zone Ride &lt;Instructor &amp; co&gt;</Notes>",
    );
    expect(escapeXml('a"b')).toBe("a&quot;b");
  });

  it("falls back to zero distance and calories, with no notes", () => {
    const bare = buildTcx({
      sport: "Other",
      startUtc: "2026-10-18T16:58:51Z",
      durationSec: 60,
      distanceM: null,
      calories: null,
      samples: [],
    });
    expect(bare).toContain(
      "<DistanceMeters>0.0</DistanceMeters><Calories>0</Calories>",
    );
    expect(bare).toContain("<Track></Track></Lap></Activity>");
    expect(bare).not.toContain("<Notes>");
  });
});
