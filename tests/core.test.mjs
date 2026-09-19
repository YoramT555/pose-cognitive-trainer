import test from "node:test";
import assert from "node:assert/strict";
import { clampInteger, formatTime, shuffledSet, shouldFinishSet } from "../core.mjs";

test("shuffledSet contains every pose once", () => {
  assert.deepEqual([...shuffledSet(5, () => 0.4)].sort((a, b) => a - b), [1, 2, 3, 4, 5]);
});
test("clampInteger enforces requirements", () => {
  assert.equal(clampInteger("0", 1, 10, 4), 1);
  assert.equal(clampInteger("99", 1, 10, 4), 10);
  assert.equal(clampInteger("bad", 1, 10, 4), 4);
});
test("formatTime rounds up and formats", () => {
  assert.equal(formatTime(119.2), "02:00");
  assert.equal(formatTime(-1), "00:00");
});
test("set completes when target active time is reached", () => {
  assert.equal(shouldFinishSet(120000, 120000), true);
  assert.equal(shouldFinishSet(119999, 120000), false);
});
