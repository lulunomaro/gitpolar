/*! Serpent v0.3.8, src/renderer/asset-grid-layout.ts
 * https://github.com/dolag233/Serpent/blob/b3714d416379ba546abfb5065bf2f447dec43314/src/renderer/asset-grid-layout.ts
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

// src/renderer/asset-grid-layout.ts
var ASSET_GRID_GAP_PX = 14;
function countFittingColumns(availableWidthPx, cardSize, gapPx = ASSET_GRID_GAP_PX) {
  const size = Math.round(cardSize);
  if (availableWidthPx <= 0 || size <= 0) return 1;
  return Math.max(1, Math.floor((availableWidthPx + gapPx) / (size + gapPx)));
}
function distributeMasonryItems(items, columnCount, estimateHeightPx) {
  const safeColumnCount = Number.isFinite(columnCount) ? Math.max(1, Math.floor(columnCount)) : 1;
  const columns = Array.from({ length: safeColumnCount }, () => ({
    items: [],
    estimatedHeightPx: 0
  }));
  items.forEach((item, index) => {
    const target = columns.reduce((shortest, column) => {
      const shortestLoad = shortest.estimatedHeightPx + shortest.items.length * ASSET_GRID_GAP_PX;
      const columnLoad = column.estimatedHeightPx + column.items.length * ASSET_GRID_GAP_PX;
      return columnLoad < shortestLoad ? column : shortest;
    }, columns[0]);
    target.items.push(item);
    const estimatedHeight = estimateHeightPx(item, index);
    if (Number.isFinite(estimatedHeight) && estimatedHeight > 0) {
      target.estimatedHeightPx += estimatedHeight;
    }
  });
  return columns;
}
var DEFAULT_ASPECT = 1;
var LAST_ROW_MAX_STRETCH = 1.18;
var JUSTIFIED_MIN_SLOT_ASPECT = 0.66;
function distributeIntegerRowWidths(aspectRatios, rowHeightPx, usableWidthPx) {
  const count = aspectRatios.length;
  if (count === 0) return [];
  const height = Math.max(1, Math.round(rowHeightPx));
  const usable = Math.max(count, Math.round(usableWidthPx));
  const raw = aspectRatios.map((aspect) => {
    const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : DEFAULT_ASPECT;
    return ratio * height;
  });
  const rawSum = raw.reduce((sum, width) => sum + width, 0);
  if (!(rawSum > 0)) {
    const widths2 = Array.from({ length: count }, () => 1);
    widths2[count - 1] = Math.max(1, usable - (count - 1));
    return widths2;
  }
  const scaled = raw.map((width) => width / rawSum * usable);
  const widths = scaled.map((width) => Math.max(0, Math.floor(width)));
  let leftover = usable - widths.reduce((sum, width) => sum + width, 0);
  const order = scaled.map((width, index) => ({ index, frac: width - Math.floor(width) })).sort((left, right) => right.frac - left.frac);
  for (const { index } of order) {
    if (leftover <= 0) break;
    widths[index] += 1;
    leftover -= 1;
  }
  for (let index = 0; index < count; index += 1) {
    if (widths[index] >= 1) continue;
    const donor = widths.reduce(
      (best, width, candidate) => width > widths[best] ? candidate : best,
      0
    );
    if (widths[donor] > 1) {
      widths[donor] -= 1;
      widths[index] = 1;
    } else {
      widths[index] = 1;
    }
  }
  return widths;
}
function aspectRatioForAsset(width, height, mediaType) {
  if (typeof width === "number" && typeof height === "number" && width > 0 && height > 0) {
    return width / height;
  }
  return mediaType === "font" ? 16 / 9 : DEFAULT_ASPECT;
}
function layoutJustifiedRows(items, containerWidthPx, targetRowHeightPx, gapPx = ASSET_GRID_GAP_PX) {
  const width = Math.max(0, Math.round(containerWidthPx));
  const targetH = Math.max(1, Math.round(targetRowHeightPx));
  if (width <= 0 || items.length === 0) return [];
  const rows = [];
  let pending = [];
  let aspectSum = 0;
  const flush = (isLast) => {
    if (pending.length === 0) return;
    const gaps = Math.max(0, pending.length - 1) * gapPx;
    const usable = Math.max(1, width - gaps);
    const naturalWidth = aspectSum * targetH;
    let scale = usable / naturalWidth;
    const withholdStretch = isLast && pending.length === 1 && scale > LAST_ROW_MAX_STRETCH;
    if (withholdStretch) {
      scale = 1;
    }
    const height = Math.max(1, Math.round(targetH * scale));
    const widths = withholdStretch ? pending.map(
      (item) => Math.max(1, Math.round(item.aspectRatio * height))
    ) : distributeIntegerRowWidths(
      pending.map((item) => item.aspectRatio),
      height,
      usable
    );
    rows.push({
      height,
      items: pending.map((item, index) => ({
        id: item.id,
        width: widths[index] ?? 1,
        height
      }))
    });
    pending = [];
    aspectSum = 0;
  };
  for (const item of items) {
    const aspect = Number.isFinite(item.aspectRatio) && item.aspectRatio > 0 ? Math.max(JUSTIFIED_MIN_SLOT_ASPECT, item.aspectRatio) : DEFAULT_ASPECT;
    const next = { id: item.id, aspectRatio: aspect };
    const nextAspectSum = aspectSum + aspect;
    const nextGaps = pending.length * gapPx;
    const nextNatural = nextAspectSum * targetH + nextGaps;
    if (pending.length > 0 && nextNatural > width) {
      const usableWithout = Math.max(1, width - (pending.length - 1) * gapPx);
      const scaleWithout = usableWithout / (aspectSum * targetH);
      const usableWith = Math.max(1, width - pending.length * gapPx);
      const scaleWith = usableWith / (nextAspectSum * targetH);
      const includeNext = Math.abs(Math.log(scaleWith)) < Math.abs(Math.log(scaleWithout));
      if (includeNext) {
        pending.push(next);
        aspectSum += aspect;
        flush(false);
        continue;
      }
      flush(false);
    }
    pending.push(next);
    aspectSum += aspect;
  }
  flush(true);
  return rows;
}
export {
  ASSET_GRID_GAP_PX,
  aspectRatioForAsset,
  countFittingColumns,
  distributeMasonryItems,
  layoutJustifiedRows
};
