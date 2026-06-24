import { describe, expect, it } from "vitest";
import {
  bestTopicMatch,
  coauthorDistance,
  dailyIndex,
  evaluateGuess,
  tierRank,
} from "./logic";
import type { Author, AuthorTopic, CoauthorGraph } from "./types";

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

function author(id: string, topics: AuthorTopic[]): Author {
  return {
    id,
    name: id,
    worksCount: 1,
    citedByCount: 1,
    primaryTopicId: topics[0].id,
    topics,
    hints: { era: "", notableWork: "", institution: "", discipline: "" },
  };
}

const kahneman = author("A1", [topic("t_decision", "sf_decision", "f_decision")]);
const tversky = author("A2", [topic("t_decision", "sf_decision", "f_decision")]);
const sameSubfield = author("A3", [topic("t_other", "sf_decision", "f_decision")]);
const sameField = author("A4", [topic("t_x", "sf_x", "f_decision")]);
const sameDomain = author("A5", [topic("t_y", "sf_y", "f_socio")]);
const differentDomain = author("A6", [topic("t_z", "sf_z", "f_bio", "d_life")]);

describe("bestTopicMatch", () => {
  it("matches at the topic level", () => {
    expect(bestTopicMatch(kahneman, tversky).tier).toBe("topic");
  });
  it("matches at the subfield level", () => {
    const m = bestTopicMatch(kahneman, sameSubfield);
    expect(m.tier).toBe("subfield");
    expect(m.sharedLabel).toBe("sf_decision");
  });
  it("matches at the field level", () => {
    expect(bestTopicMatch(kahneman, sameField).tier).toBe("field");
  });
  it("matches at the domain level", () => {
    expect(bestTopicMatch(kahneman, sameDomain).tier).toBe("domain");
  });
  it("returns none across domains", () => {
    expect(bestTopicMatch(kahneman, differentDomain).tier).toBe("none");
  });
  it("uses the best branch across multiple topics", () => {
    const multi = author("A7", [
      topic("t_far", "sf_far", "f_far", "d_far"),
      topic("t_decision", "sf_decision", "f_decision"),
    ]);
    expect(bestTopicMatch(multi, tversky).tier).toBe("topic");
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

describe("tierRank", () => {
  it("orders tiers from cold to hot", () => {
    expect(tierRank("none")).toBeLessThan(tierRank("domain"));
    expect(tierRank("domain")).toBeLessThan(tierRank("field"));
    expect(tierRank("field")).toBeLessThan(tierRank("subfield"));
    expect(tierRank("subfield")).toBeLessThan(tierRank("topic"));
    expect(tierRank("topic")).toBeLessThan(tierRank("correct"));
  });
});
