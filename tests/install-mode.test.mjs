import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const manifestGate = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

function manifestLinksFor(userAgent) {
  const links = [];
  const document = {
    createElement: () => ({}),
    head: { appendChild: link => links.push(link) }
  };
  runInNewContext(manifestGate, { document, navigator: { userAgent } });
  return links;
}

test("normal mode attaches the installable web-app manifest", () => {
  const links = manifestLinksFor("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
  assert.equal(links.length, 1);
  assert.equal(links[0].rel, "manifest");
  assert.equal(links[0].href, "manifest.webmanifest");
});

test("Android does not attach an APK-producing manifest", () => {
  assert.deepEqual(manifestLinksFor("Mozilla/5.0 (Linux; Android 16)"), []);
});
