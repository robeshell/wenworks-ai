import { test } from "node:test";
import assert from "node:assert/strict";
import { previousMatcher } from "./aa.mjs";

const bySlug = (item) => item.slug;

test("previous values are found by model id after the slug moves", () => {
  const previous = [
    { modelId: "id-old", slug: "flash", name: "Flash 0420", releaseDate: "2026-04-20", gpqa: 0.8 },
  ];
  const find = previousMatcher(previous, bySlug);
  // The new version took the slug: it must not inherit the old numbers.
  assert.equal(
    find({ id: "id-new", slug: "flash", name: "Flash 1125", releaseDate: "2026-11-25" }),
    null,
  );
  // The old version under its dated slug keeps them.
  assert.equal(
    find({ id: "id-old", slug: "flash-0420", name: "Flash 0420", releaseDate: "2026-04-20" })?.gpqa,
    0.8,
  );
});

test("entries saved before ids are matched only while the version agrees", () => {
  const previous = [
    { slug: "flash", name: "Flash", releaseDate: "2026-04-20", gpqa: 0.8 },
    { slug: "pro", name: "Pro", releaseDate: "2026-08-13", gpqa: 0.9 },
  ];
  const find = previousMatcher(previous, bySlug);
  // Same slug, same release: same model (also after a rename).
  assert.equal(
    find({ id: "id-pro", slug: "pro", name: "Pro (Max)", releaseDate: "2026-08-13" })?.gpqa,
    0.9,
  );
  // Same slug, newer release: a new version, nothing carried over.
  assert.equal(
    find({ id: "id-new", slug: "flash", name: "Flash", releaseDate: "2026-11-25" }),
    null,
  );
  // The old version found under its new slug by name and release date.
  assert.equal(
    find({ id: "id-old", slug: "flash-0420", name: "Flash", releaseDate: "2026-04-20" })?.gpqa,
    0.8,
  );
});

test("a model the API sent without an id falls back to its slug", () => {
  const find = previousMatcher([{ modelId: "id-a", slug: "a", name: "A", gpqa: 0.5 }], bySlug);
  assert.equal(find({ id: null, slug: "a", name: "A" })?.gpqa, 0.5);
});
