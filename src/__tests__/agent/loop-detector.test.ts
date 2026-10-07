import { describe, expect, it } from "vitest";
import { LoopDetector } from "../../agent/loop-detector.js";

describe("LoopDetector", () => {
  it("blocks repeated identical tool calls", () => {
    const detector = new LoopDetector({ maxIdenticalCalls: 3 });

    expect(detector.recordToolCall("exec", "ls")).toEqual({
      blocked: false,
      reason: "",
    });

    expect(detector.recordToolCall("exec", "ls")).toEqual({
      blocked: false,
      reason: "",
    });

    const result = detector.recordToolCall("exec", "ls");

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("identical arguments 3 times in a row");
  });

  it("allows different arguments without triggering the identical-call loop", () => {
    const detector = new LoopDetector({ maxIdenticalCalls: 3 });

    detector.recordToolCall("exec", "ls");
    detector.recordToolCall("exec", "pwd");

    const result = detector.recordToolCall("exec", "git status");

    expect(result.blocked).toBe(false);
    expect(result.reason).toBe("");
  });

  it("warns after the same tool pattern repeats for three turns", () => {
    const detector = new LoopDetector({ maxIdenticalCalls: 100 });

    detector.recordToolCall("exec", "ls");
    expect(detector.endTurn().blocked).toBe(false);

    detector.recordToolCall("exec", "ls");
    expect(detector.endTurn().blocked).toBe(false);

    detector.recordToolCall("exec", "ls");
    const result = detector.endTurn();

    expect(result.blocked).toBe(false);
    expect(result.reason).toContain("WARNING");
  });

  it("enforces a repeated pattern after the warning is ignored", () => {
    const detector = new LoopDetector({ maxIdenticalCalls: 100 });

    detector.recordToolCall("exec", "ls");
    expect(detector.endTurn().blocked).toBe(false);

    detector.recordToolCall("exec", "ls");
    expect(detector.endTurn().blocked).toBe(false);

    detector.recordToolCall("exec", "ls");
    const warning = detector.endTurn();

    expect(warning.blocked).toBe(false);
    expect(warning.reason).toContain("WARNING");

    detector.recordToolCall("exec", "ls");
    const result = detector.endTurn();

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("LOOP ENFORCEMENT");
  });
});
