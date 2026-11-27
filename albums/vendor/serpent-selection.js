/*! Serpent v0.3.8 (b3714d416379ba546abfb5065bf2f447dec43314)
 * https://github.com/dolag233/Serpent
 * MIT License
 *
 * Copyright (c) 2026 Serpent contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// src/renderer/browse-selection-order.ts
function buildBrowseSelectionOrder(folderIds, assetIds) {
  return [
    ...[...new Set(folderIds)].map((id) => ({ kind: "folder", id })),
    ...[...new Set(assetIds)].map((id) => ({ kind: "asset", id }))
  ];
}
function indexInBrowseOrder(items, anchor) {
  return items.findIndex(
    (item) => item.kind === anchor.kind && item.id === anchor.id
  );
}
function resolveShiftBrowseRange(input) {
  if (!input.anchor) return null;
  const anchorIndex = indexInBrowseOrder(input.items, input.anchor);
  const targetIndex = indexInBrowseOrder(input.items, input.target);
  if (anchorIndex < 0 || targetIndex < 0) return null;
  const slice = input.items.slice(
    Math.min(anchorIndex, targetIndex),
    Math.max(anchorIndex, targetIndex) + 1
  );
  const rangeFolders = slice.filter((item) => item.kind === "folder").map((item) => item.id);
  const rangeAssets = slice.filter((item) => item.kind === "asset").map((item) => item.id);
  if (input.additive) {
    return {
      folderIds: [.../* @__PURE__ */ new Set([...input.currentFolderIds, ...rangeFolders])],
      assetIds: [.../* @__PURE__ */ new Set([...input.currentAssetIds, ...rangeAssets])],
      anchor: input.anchor
    };
  }
  return {
    folderIds: rangeFolders,
    assetIds: rangeAssets,
    anchor: input.anchor
  };
}

// src/renderer/invert-selection.ts
function invertSelection(visibleIds, selectedIds) {
  if (visibleIds.length === 0) return [];
  const selected = new Set(selectedIds);
  return visibleIds.filter((id) => !selected.has(id));
}

// src/renderer/commands/command-types.ts
function isMacPlatform(userAgent) {
  return userAgent.includes("Mac") && !userAgent.includes("Mobile");
}

// src/renderer/selection-modifiers.ts
function resolveSelectionPlatform(userAgent) {
  return isMacPlatform(userAgent) ? "mac" : "windows";
}
function isToggleSelectionModifier(modifiers, platform) {
  return platform === "mac" ? modifiers.metaKey : modifiers.ctrlKey;
}
export {
  buildBrowseSelectionOrder,
  invertSelection,
  isToggleSelectionModifier,
  resolveSelectionPlatform,
  resolveShiftBrowseRange
};
