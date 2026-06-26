import { describe, expect, it } from "vitest";
import {
  coauthorDistance,
  dailyIndex,
  evaluateGuess,
  fieldMatch,
  pickDailyAuthor,
  significantFields,
  tierRank,
} from "./logic";
import type { Author, AuthorTopic, FieldRef } from "./types";
import type { CoauthorGraph } from "./types";
import realAuthors from "../data/authors.json";

function topic(
  topicId: string,
  subfieldId: string,
  fieldId: string,
  domainId = "d_soc",
): AuthorTopic {
  return {
    id: topicId,
    name: topicId,
    subfield: { id: subfieldId, name: subfieldId },
    field: { id: fieldId, name: fieldId },
    domain: { id: domainId, name: domainId },
    count: 1,
  };
}

function author(id: string, fields: FieldRef[], topics: AuthorTopic[] = []): Author {
  const t = topics.length ? topics : [topic("t", "sf", "f")];
  return {
    id,
    name: id,
    worksCount: 1,
    citedByCount: 1,
    primaryTopicId: t[0].id,
    topics: t,
    fields,
    hints: { era: "", notableWork: "", institution: "", discipline: "" },
  };
}

function f(name: string, count: number): FieldRef {
  return { name, count };
}

// Primary Economics, with Psychology also significant.
const kahneman = author("A1", [f("Economics", 50), f("Psychology", 20)]);
// Same primary + a second shared field -> hottest.
const tversky = author("A2", [f("Economics", 40), f("Psychology", 30)]);
// Same primary only (Law too sparse to count) -> warm.
const samePrimary = author("A3", [f("Economics", 40), f("Law", 4)]);
// Two shared fields but different primary -> warm.
const twoShared = author("A6", [f("Psychology", 50), f("Economics", 30)]);
// Exactly one shared field, different primary -> cool.
const sharedField = author("A4", [f("Psychology", 50), f("Sociology", 9)]);
// No overlap.
const noOverlap = author("A5", [f("Sociology", 30)]);

describe("significantFields", () => {
  it("keeps prominent fields and drops sparse ones", () => {
    expect(significantFields(samePrimary)).toEqual(["Economics"]);
  });
  it("falls back to OpenAlex topic fields when no S2 profile", () => {
    const a = author("A8", [], [topic("t", "sf", "Economics")]);
    a.fields = undefined;
    expect(significantFields(a)).toEqual(["Economics"]);
  });
});

describe("fieldMatch", () => {
  it("is hottest with same primary and >= 2 shared fields", () => {
    expect(fieldMatch(kahneman, tversky).tier).toBe("topic");
  });
  it("is warm when only the primary field is shared", () => {
    const m = fieldMatch(kahneman, samePrimary);
    expect(m.tier).toBe("subfield");
    expect(m.sharedLabel).toBe("Economics");
  });
  it("is warm when two fields overlap despite different primaries", () => {
    expect(fieldMatch(kahneman, twoShared).tier).toBe("subfield");
  });
  it("is cool when a single field is shared and primaries differ", () => {
    expect(fieldMatch(kahneman, sharedField).tier).toBe("field");
  });
  it("returns none with no shared field", () => {
    expect(fieldMatch(kahneman, noOverlap).tier).toBe("none");
  });
});

describe("coauthorDistance", () => {
  const graph: CoauthorGraph = {
    A1: ["A2"],
    A2: ["A1", "A3"],
    A3: ["A2"],
    A9: [],
  };
  it("is 0 for the same node", () => {
    expect(coauthorDistance(graph, "A1", "A1")).toBe(0);
  });
  it("finds direct links", () => {
    expect(coauthorDistance(graph, "A1", "A2")).toBe(1);
  });
  it("finds indirect links", () => {
    expect(coauthorDistance(graph, "A1", "A3")).toBe(2);
  });
  it("returns null when disconnected", () => {
    expect(coauthorDistance(graph, "A1", "A9")).toBeNull();
  });
});

describe("evaluateGuess", () => {
  const graph: CoauthorGraph = { A1: ["A2"], A2: ["A1"] };
  it("flags a correct guess", () => {
    const r = evaluateGuess(kahneman, kahneman, graph);
    expect(r.tier).toBe("correct");
    expect(r.coauthorDistance).toBe(0);
  });
  it("reports warmth and coauthor distance together", () => {
    const r = evaluateGuess(kahneman, tversky, graph);
    expect(r.tier).toBe("topic");
    expect(r.coauthorDistance).toBe(1);
  });
});

describe("dailyIndex", () => {
  it("is deterministic for a given key", () => {
    expect(dailyIndex(100, "2026-06-24")).toBe(dailyIndex(100, "2026-06-24"));
  });
  it("stays in range", () => {
    for (const k of ["2026-01-01", "2026-12-31", "2025-07-04"]) {
      const i = dailyIndex(50, k);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(50);
    }
  });
  it("visits every author once before repeating (full rotation)", () => {
    const count = 30;
    const seen = new Set<number>();
    const start = new Date(2024, 0, 1);
    for (let day = 0; day < count; day += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + day);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      seen.add(dailyIndex(count, key));
    }
    expect(seen.size).toBe(count);
  });
  it("advances to a different author the next day", () => {
    expect(dailyIndex(30, "2026-06-24")).not.toBe(dailyIndex(30, "2026-06-25"));
  });
});

describe("pickDailyAuthor", () => {
  function named(name: string): Author {
    return { ...author(name, []), name };
  }
  const pool = [
    named("Karl Marx"),
    named("Daniel Kahneman"),
    named("Michel Foucault"),
    named("Stanley Milgram"),
    named("Max Weber"),
    named("Amos Tversky"),
  ];

  it("leads with the behavioral realm before branching out", () => {
    const realm = new Set(["Stanley Milgram", "Daniel Kahneman", "Amos Tversky"]);
    // The anchor day and the days right after should all be realm authors,
    // since the realm is exhausted before the puzzle branches out.
    for (const key of ["2026-06-26", "2026-06-27", "2026-06-28"]) {
      expect(realm.has(pickDailyAuthor(pool, key).name)).toBe(true);
    }
  });

  it("does not make Milgram today's author in the real dataset", () => {
    const today = pickDailyAuthor(realAuthors as unknown as Author[], "2026-06-26");
    expect(today.name).not.toBe("Stanley Milgram");
  });

  it("is deterministic and non-repeating across a full cycle", () => {
    const start = new Date(Date.UTC(2026, 5, 24));
    const seen = new Set<string>();
    for (let d = 0; d < pool.length; d += 1) {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + d);
      const key = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, "0")}-${String(day.getUTCDate()).padStart(2, "0")}`;
      seen.add(pickDailyAuthor(pool, key).name);
    }
    expect(seen.size).toBe(pool.length);
  });
});

describe("tierRank", () => {
  it("orders tiers from cold to hot", () => {
    expect(tierRank("none")).toBeLessThan(tierRank("field"));
    expect(tierRank("field")).toBeLessThan(tierRank("subfield"));
    expect(tierRank("subfield")).toBeLessThan(tierRank("topic"));
    expect(tierRank("topic")).toBeLessThan(tierRank("correct"));
  });
});
