import { describe, expect, it } from "vitest";
import { classifyInput } from "../../orchestration/mission-classifier.js";

describe("classifyInput", () => {
  it("classifies ordinary messages as conversation", () => {
    expect(classifyInput("Hello, how are you?")).toBe("conversation");
  });

  it("classifies mission-prefixed input as a mission", () => {
    expect(classifyInput("mission: inspect the repository")).toBe("mission");
  });

  it("classifies supported action keywords as missions", () => {
    expect(classifyInput("Analyze this project")).toBe("mission");
    expect(classifyInput("Create a new file")).toBe("mission");
    expect(classifyInput("Write the documentation")).toBe("mission");
    expect(classifyInput("Inspect the codebase")).toBe("mission");
    expect(classifyInput("Fix this bug")).toBe("mission");
  });

  it("is case-insensitive", () => {
    expect(classifyInput("ANALYZE THIS PROJECT")).toBe("mission");
    expect(classifyInput("CREATE A FILE")).toBe("mission");
  });
});
