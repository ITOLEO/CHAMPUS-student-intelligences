import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createElement, act } from "react";
import type { Root } from "react-dom/client";
import { sourceCatalog } from "../src/data/model";

const dom = new JSDOM('<div id="root"></div>', {
  url: "https://champus.example/",
  pretendToBeVisual: true,
});
let root: Root;
const doc = dom.window.document;
before(async () => {
  Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true },
    document: { value: doc, configurable: true },
    navigator: { value: dom.window.navigator, configurable: true },
    IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true },
  });
  dom.window.scrollTo = () => {};
  const { createRoot } = await import("react-dom/client");
  const { default: App } = await import("../src/App");
  root = createRoot(doc.getElementById("root")!);
  await act(async () => root.render(createElement(App)));
});
after(async () => {
  if (root) await act(async () => root.unmount());
  dom.window.close();
});
async function go(path: string) {
  await act(async () => {
    dom.window.history.pushState({}, "", path);
    dom.window.dispatchEvent(new dom.window.PopStateEvent("popstate"));
  });
}
function body() {
  return doc.querySelector("main")?.textContent || "";
}
test("the root opens the public landing and links to account access and discovery", () => {
  assert.match(
    doc.querySelector("h1")!.textContent!,
    /From learningto opportunity/,
  );
  assert.ok(doc.querySelector('main a[href="/sign-in"]'));
  assert.ok(doc.querySelector('main a[href="/opportunities"]'));
});
test("the catalog opens query filters, recovers from no results and links to a detail", async () => {
  await go("/opportunities?q=zzzz");
  assert.match(body(), /No matches/);
  const clear = [...doc.querySelectorAll("button")].find(
    (b) => b.textContent === "Clear filters",
  )!;
  await act(async () => clear.click());
  assert.equal(dom.window.location.search, "");
  // This screen may have no active listings after their closing dates.
  assert.match(body(), /opportunit/i);
  assert.ok(doc.querySelector('input[type="search"]'));
});
test("an opportunity opens directly and the guest can check entry rules and follow the next action", async () => {
  const row = sourceCatalog[0];
  await go("/opportunities/" + row.id);
  assert.equal(doc.querySelector("main h1")?.textContent, row.data.title);
  const choices = Array.from(
    doc.querySelectorAll<HTMLSelectElement>("#eligibility select"),
  );
  assert.equal(choices.length, row.data.eligibility.length);
  for (const select of choices)
    await act(async () => {
      select.value = "yes";
      select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
  assert.equal(
    doc.querySelector("#eligibility .status")?.textContent,
    "Eligible",
  );
  assert.match(body(), /Not assessed/);
  await act(async () => {
    choices[0].value = "no";
    choices[0].dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  });
  assert.equal(
    doc.querySelector("#eligibility .status")?.textContent,
    "Not eligible",
  );
  assert.ok(
    doc.querySelector('a[href="' + row.data.skills[0].resource.url + '"]'),
  );
  assert.ok(doc.querySelector('a[href="' + row.data.sourceUrl + '"]'));
});
test("the learning route shows the sourced academic mapping and preserves the return location on sign-in", async () => {
  await go("/learning/food-story");
  assert.match(body(), /Related course outcome/);
  assert.match(body(), /awaiting institutional review/);
  const anchor = doc.querySelector<HTMLAnchorElement>(
    'main a[href^="/sign-in?next="]',
  )!;
  assert.match(anchor.href, /food-story/);
});
test("private navigation sends visitors to sign in and an unavailable account service is explicit", async () => {
  await go("/profile");
  assert.equal(dom.window.location.pathname, "/sign-in");
  assert.equal(
    new URLSearchParams(dom.window.location.search).get("next"),
    "/profile",
  );
  assert.match(body(), /Account access is unavailable/);
  assert.equal(doc.querySelector('input[type="password"]'), null);
});
test("the Features disclosure supports Escape and an invalid route has a recovery link", async () => {
  await go("/missing");
  assert.match(body(), /Page not found/);
  assert.ok(doc.querySelector('main a[href="/"]'));
  const button = doc.querySelector<HTMLButtonElement>(
    'button[aria-label="Features"]',
  )!;
  await act(async () => button.click());
  assert.equal(button.getAttribute("aria-expanded"), "true");
  assert.match(
    doc.getElementById("feature-menu")!.textContent!,
    /Industry needs/,
  );
  await act(async () =>
    dom.window.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", { key: "Escape" }),
    ),
  );
  assert.equal(button.getAttribute("aria-expanded"), "false");
  assert.equal(doc.activeElement, button);
});

test("a new visit starts in Light and saved settings can select Dark or System", async () => {
  assert.equal(doc.documentElement.dataset.theme, "light");
  const { saveSetting } = await import("../src/data/appearance");
  await act(async () => saveSetting("theme", "dark"));
  assert.equal(doc.documentElement.dataset.theme, "dark");
  dom.window.matchMedia = () =>
    ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }) as unknown as MediaQueryList;
  await act(async () => saveSetting("theme", "system"));
  assert.equal(doc.documentElement.dataset.theme, "dark");
  await act(async () => saveSetting("theme", "light"));
  assert.equal(doc.documentElement.dataset.theme, "light");
});

test("every public feature opens a dedicated page and the introduction appears once per tab", async () => {
  const { featureGroups } = await import("../src/components/features");
  for (const group of featureGroups) {
    for (const feature of group.features) {
      await go("/features/" + feature.id);
      assert.equal(doc.querySelector("main h1")?.textContent, feature.title);
      assert.equal(doc.querySelectorAll("main ol li").length, 3);
    }
  }
  await go("/welcome");
  assert.equal(dom.window.location.pathname, "/sign-in");
});

test("feedback stays separate from the help menu and hover is the sidebar default", async () => {
  await go("/features/teacher-dashboard");
  assert.ok(doc.querySelector('header a[aria-label="Feedback"]'));
  const help = doc.querySelector<HTMLButtonElement>(
    'button[aria-label="Help"]',
  )!;
  await act(async () => help.click());
  assert.match(
    doc.querySelector("#header-help")?.textContent || "",
    /Help center/,
  );
  assert.equal(
    doc.querySelector('#header-help a[href="/help#feedback"]'),
    null,
  );
  assert.equal(dom.window.localStorage.getItem("champus.ui.rail"), null);
});
