#!/usr/bin/env node
// scripts/gibs_layer_extractor.js
// Extracts detailed layer information from GIBS WMTS GetCapabilities
// Outputs data to console in JSON format

import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';
import path from 'path';

const WMTS_URL =
  process.env.WMTS_URL ||
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities';

// Helpers
const toArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);
function textOf(v) {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && '#text' in v) {
    const t = v['#text'];
    return typeof t === 'string' ? t : String(t ?? '');
  }
  return String(v ?? '');
}

async function fetchAndExtractLayers() {
  try {
    const res = await fetch(WMTS_URL);
    if (!res.ok) {
      console.error(`Fetch failed: ${res.status} ${res.statusText}`);
      process.exit(1);
    }
    const xml = await res.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
      attributeNamePrefix: '',
    });
    const cap = parser.parse(xml);

    const layers = toArray(cap?.Capabilities?.Contents?.Layer);
    const extractedData = [];

    for (const L of layers) {
      const layerInfo = {
        identifier: textOf(L?.Identifier),
        title: textOf(L?.Title),
        timeOptions: {},
        tileMatrixSets: [],
        resourceUrls: [],
      };

      // Extract Time Dimension
      const timeDimension = toArray(L?.Dimension).find(
        (dim) => textOf(dim?.Identifier) === 'Time'
      );
      if (timeDimension) {
        layerInfo.timeOptions = {
          default: textOf(timeDimension?.Default),
          values: toArray(timeDimension?.Value).map(textOf),
        };
      }

      // Extract TileMatrixSetLink
      const tileMatrixSetLinks = toArray(L?.TileMatrixSetLink);
      for (const tmsLink of tileMatrixSetLinks) {
        const tileMatrixSet = textOf(tmsLink?.TileMatrixSet);
        const tileMatrixSetLimits = toArray(tmsLink?.TileMatrixSetLimits?.TileMatrixLimits).map(
          (limit) => ({
            tileMatrix: textOf(limit?.TileMatrix),
            minTileRow: textOf(limit?.MinTileRow),
            maxTileRow: textOf(limit?.MaxTileRow),
            minTileCol: textOf(limit?.MinTileCol),
            maxTileCol: textOf(limit?.MaxTileCol),
          })
        );
        layerInfo.tileMatrixSets.push({
          name: tileMatrixSet,
          limits: tileMatrixSetLimits,
        });
      }

      // Extract ResourceURLs
      const resourceUrls = toArray(L?.ResourceURL).map((url) => ({
        format: url?.format,
        resourceType: url?.resourceType,
        template: url?.template,
        ext: url?.format ? url.format.split('/').pop() : null, // Extract extension
      }));
      layerInfo.resourceUrls = resourceUrls;

      extractedData.push(layerInfo);
    }

    console.log(JSON.stringify(extractedData, null, 2));
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
    process.exit(1);
  }
}

fetchAndExtractLayers();
