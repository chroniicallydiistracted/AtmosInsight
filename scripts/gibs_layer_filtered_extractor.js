#!/usr/bin/env node
// scripts/gibs_layer_filtered_extractor.js
// Extracts detailed layer information from GIBS WMTS GetCapabilities
// Filters layers by time options (oldest value at least from previous day)
// and by keyword in identifier (case-insensitive substring search).
// Outputs data to console in JSON format.
// Usage: node gibs_layer_filtered_extractor.js [keyword]

import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';
import path from 'path';

const WMTS_URL =
  process.env.WMTS_URL ||
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities';

// Get keyword from command line arguments
const keyword = process.argv[2];

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

    // Calculate yesterday's date at midnight UTC for comparison
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setUTCDate(today.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0); // Set to midnight UTC

    for (const L of layers) {
      const layerInfo = {
        identifier: textOf(L?.Identifier),
        title: textOf(L?.Title),
        timeOptions: {},
        tileMatrixSets: [],
        resourceUrls: [],
      };

      // Extract Time Dimension - get all values first for filtering
      let allTimeValues = [];
      const timeDimension = toArray(L?.Dimension).find(
        (dim) => textOf(dim?.Identifier) === 'Time'
      );
      if (timeDimension) {
        allTimeValues = toArray(timeDimension?.Value).map(textOf);
        layerInfo.timeOptions.default = textOf(timeDimension?.Default);
      }

      // --- Apply Filters ---

      // 1. Time Options Filter: Oldest Time Options Value must be no older than the previous day
      let passesTimeFilter = true;
      if (allTimeValues.length > 0) {
        // Find the oldest date among the values from the full list
        const oldestValue = allTimeValues[0]; // Assuming values are sorted oldest to newest
        const oldestValueDatePart = oldestValue.split('/')[0]; // e.g., "2025-08-24"
        const oldestDate = new Date(oldestValueDatePart + 'T00:00:00Z'); // Parse as UTC midnight

        if (oldestDate < yesterday) {
          passesTimeFilter = false;
        }
      } else {
        // If no time values, it doesn't pass the time filter
        passesTimeFilter = false;
      }

      if (!passesTimeFilter) {
        continue; // Skip this layer if it doesn't pass the time filter
      }

      // 2. Identifier Keyword Filter: Case-insensitive substring search
      let passesKeywordFilter = true;
      if (keyword) {
        if (!layerInfo.identifier.toLowerCase().includes(keyword.toLowerCase())) {
          passesKeywordFilter = false;
        }
      }

      if (!passesKeywordFilter) {
        continue; // Skip this layer if it doesn't pass the keyword filter
      }

      // If filters passed, now set the time values for output (only the most recent)
      if (allTimeValues.length > 0) {
        layerInfo.timeOptions.values = [allTimeValues[allTimeValues.length - 1]];
      } else {
        layerInfo.timeOptions.values = [];
      }

      // Extract TileMatrixSetLink (only if passed filters)
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

      // Extract ResourceURLs (only if passed filters)
      const resourceUrls = toArray(L?.ResourceURL).map((url) => ({
        format: url?.format,
        resourceType: url?.resourceType,
        template: url?.template,
        ext: url?.format ? url.format.split('/').pop() : null, // Extract extension
      }));
      layerInfo.resourceUrls = resourceUrls;

      // --- Clean up layerInfo for cleaner output ---
      if (layerInfo.timeOptions && Object.keys(layerInfo.timeOptions).length === 0) {
        delete layerInfo.timeOptions;
      }
      if (layerInfo.tileMatrixSets.length === 0) {
        delete layerInfo.tileMatrixSets;
      }
      if (layerInfo.resourceUrls.length === 0) {
        delete layerInfo.resourceUrls;
      }

      extractedData.push(layerInfo);
    }

    // --- Custom Formatting for Clean Output ---
    let outputString = '';
    if (extractedData.length === 0) {
      outputString = 'No layers found matching the criteria.';
    } else {
      extractedData.forEach((layer) => {
        outputString += `--- Layer: ${layer.identifier} ---
`;
        outputString += `Title: ${layer.title}
`;

        if (layer.timeOptions && layer.timeOptions.values && layer.timeOptions.values.length > 0) {
          outputString += `Most Recent Time: ${layer.timeOptions.values[0]} (Default: ${layer.timeOptions.default})
`;
        }

        if (layer.tileMatrixSets && layer.tileMatrixSets.length > 0) {
          outputString += `
Tile Matrix Sets:
`;
          layer.tileMatrixSets.forEach((tms) => {
            outputString += `  - Name: ${tms.name}
`;
            if (tms.limits && tms.limits.length > 0) {
              const matrixLevels = tms.limits.map(limit => limit.tileMatrix).join(', ');
              // Calculate overall min/max for rows and columns
              const allMinRows = tms.limits.map(limit => parseInt(limit.minTileRow, 10));
              const allMaxRows = tms.limits.map(limit => parseInt(limit.maxTileRow, 10));
              const allMinCols = tms.limits.map(limit => parseInt(limit.minTileCol, 10));
              const allMaxCols = tms.limits.map(limit => parseInt(limit.maxTileCol, 10));

              const overallMinRow = Math.min(...allMinRows);
              const overallMaxRow = Math.max(...allMaxRows);
              const overallMinCol = Math.min(...allMinCols);
              const overallMaxCol = Math.max(...allMaxCols);

              outputString += `    Matrix Levels: ${matrixLevels}
`;
              outputString += `    Row Range: ${overallMinRow}-${overallMaxRow}
`;
              outputString += `    Col Range: ${overallMinCol}-${overallMaxCol}
`;
            }
          });
        }

        if (layer.resourceUrls && layer.resourceUrls.length > 0) {
          outputString += `
Resource URLs:
`;
          layer.resourceUrls.forEach((url) => {
            outputString += `  - Template: ${url.template}
`;
            outputString += `    Format: ${url.format}, Type: ${url.resourceType}, Ext: ${url.ext}
`;
          });
        }
        outputString += 
`
--------------------------------------------------
`;
      });
    }

    console.log(outputString);
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
    process.exit(1);
  }
}

fetchAndExtractLayers();
