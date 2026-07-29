#!/usr/bin/env node
// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

/**
 * Tool-surface eval.
 *
 * Unit tests verify that a tool emits what we intended. They cannot tell us whether an
 * agent reading our tool descriptions and schemas actually reaches for the right tool with
 * the right arguments — and that is what most of the design guidance in this repo is: text
 * a model reads. This eval closes that gap.
 *
 * It hands the model our real tool definitions (descriptions and JSON-Schema-converted zod
 * input schemas, straight off the tool registry), gives it a task, and inspects the tool
 * calls it makes. Where a call lands on style_builder_tool the tool is executed for real —
 * it needs no network — so checks run against the style JSON that would actually ship.
 *
 * Checks are deterministic predicates rather than an LLM judge, because the thing being
 * measured is structured output. That keeps the score stable run to run, so a change in it
 * means a change in behavior rather than judge variance.
 *
 * Usage:
 *   npm run build && npm run eval:tools
 *   EVAL_MODEL=claude-opus-5 npm run eval:tools
 *   EVAL_EFFORT=low npm run eval:tools
 *   npm run eval:tools -- --json out.json
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf-8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = (m[2] || '').replace(/^["']|["']$/g, '');
    }
  }
}

const MODEL = process.env.EVAL_MODEL || 'claude-sonnet-5';
const EFFORT = process.env.EVAL_EFFORT || '';
// Enough for build → create → preview plus a closing turn. Exhausting it is reported rather than
// scored quietly: a truncated conversation fails checks for a reason that is not a behavior change.
const MAX_TURNS = 5;

// Resolved against cwd rather than this file, so the script works from an npm script.
const REGISTRY = resolve(process.cwd(), 'dist/esm/tools/toolRegistry.js');
if (!existsSync(REGISTRY)) {
  console.error('Build output missing. Run `npm run build` first.');
  process.exit(1);
}

// ALL_TOOLS rather than CORE_TOOLS so a tool moved into a capability-gated group stays visible
// here — the eval measures the surface an agent sees, and silently dropping one would read as a
// behavior change in the score.
const { ALL_TOOLS } = await import(pathToFileURL(REGISTRY).href);
const allTools = [...ALL_TOOLS];

// The style/design surface. Narrowed so the model isn't picking between 25 tools for a
// task about map appearance, and so the eval stays cheap.
const SURFACE = [
  'style_builder_tool',
  'create_style_tool',
  'update_style_tool',
  'preview_style_tool',
  'list_styles_tool',
  'retrieve_style_tool',
  'validate_style_tool',
  'check_color_contrast_tool'
];

function toolDefinitions() {
  const defs = [];
  for (const tool of allTools) {
    if (!SURFACE.includes(tool.name)) continue;
    let input_schema;
    try {
      input_schema = z.toJSONSchema(tool.inputSchema, {
        io: 'input',
        unrepresentable: 'any'
      });
      delete input_schema.$schema;
    } catch (error) {
      // Loudly: the fallback hands the model a tool with no parameters, so the eval would go on
      // measuring a surface that is not the one we ship, and the score would drop with no clue why.
      console.warn(
        `WARNING: could not convert ${tool.name} input schema (${error.message}). ` +
          `Exposing it with no parameters — checks touching this tool are not meaningful.`
      );
      input_schema = { type: 'object', properties: {} };
    }
    if (input_schema.type !== 'object') {
      console.warn(
        `WARNING: ${tool.name} input schema converted to type "${input_schema.type}", not ` +
          `"object". Exposing it with no parameters.`
      );
      input_schema = { type: 'object', properties: {} };
    }
    defs.push({
      name: tool.name,
      description: String(tool.description || '').slice(0, 8000),
      input_schema
    });
  }
  return defs;
}

const styleBuilder = allTools.find((t) => t.name === 'style_builder_tool');

/** Layers a style declares itself, i.e. excluding anything the import supplies. */
const ownLayers = (style) =>
  (style?.layers || []).filter((l) => l.type !== 'background');

/** The call that actually ships a style, whichever tool the model routed through. */
const uploadCall = (calls) =>
  calls.find(
    (c) => c.name === 'create_style_tool' || c.name === 'update_style_tool'
  );

const EMISSIVE = {
  fill: 'fill-emissive-strength',
  line: 'line-emissive-strength',
  circle: 'circle-emissive-strength'
};

const RD_YL_GN = ['#d7191c', '#1a9641', '#a6d96a', '#fdae61', '#ffffbf'];

const CASES = [
  {
    id: 'dark-mode',
    prompt:
      'Build me a dark map style for a nighttime food delivery app. I want the base map to be dark so the delivery info on top stands out.',
    checks: {
      'uses style_builder_tool': (c) => c.called('style_builder_tool'),
      'base_style is standard': (c) => {
        const call = c.first('style_builder_tool');
        return !call || (call.input.base_style ?? 'standard') === 'standard';
      },
      'dark via lightPreset night': (c) =>
        c.first('style_builder_tool')?.input?.standard_config?.lightPreset ===
        'night',
      'does not use a dark base style': (c) =>
        !c.calls.some((x) =>
          /dark-v11|navigation-night/.test(JSON.stringify(x.input))
        ),
      'does not use global_settings.mode': (c) =>
        !c.calls.some((x) => x.input?.global_settings?.mode)
    }
  },
  {
    id: 'custom-data-layer',
    prompt:
      'I have a GeoJSON of delivery zone polygons and a route line. Put them on a Mapbox map. The map needs to work at night as well as during the day.',
    // These checks deliberately inspect the style that would actually be uploaded, not the
    // tool used to build it. The model is free to hand-author the layers; what matters is
    // whether the style it ships is correct.
    checks: {
      // The capability is only worth having if the model finds it. Before custom_sources
      // existed the builder rejected user data outright ("layer not found"), so the model
      // had to hand-author the layers and upload them raw.
      'routes user data through custom_sources': (c) => {
        const call = c.first('style_builder_tool');
        return !!call && !!call.input?.custom_sources;
      },
      'uploaded style is Standard-based': (c) => {
        const call = c.uploaded();
        return !!call && Array.isArray(call.input?.style?.imports);
      },
      'every custom layer has a slot': (c) => {
        const layers = ownLayers(c.uploaded()?.input?.style);
        return layers.length > 0 && layers.every((l) => !!l.slot);
      },
      'fill/line/circle layers set emissive strength': (c) => {
        const lit = ownLayers(c.uploaded()?.input?.style).filter(
          (l) => EMISSIVE[l.type]
        );
        return (
          lit.length > 0 && lit.every((l) => l.paint?.[EMISSIVE[l.type]] === 1)
        );
      },
      'route sets line-occlusion-opacity': (c) => {
        const lines = ownLayers(c.uploaded()?.input?.style).filter(
          (l) => l.type === 'line'
        );
        return (
          lines.length > 0 &&
          lines.some((l) => l.paint?.['line-occlusion-opacity'] !== undefined)
        );
      },
      'mentions night visibility in its reasoning': (c) =>
        /emissive|night|light preset|lightPreset/i.test(c.text)
    }
  },
  {
    id: 'config-first',
    prompt:
      'On my existing Mapbox map the roads are too loud and the POI labels are cluttering everything. Quiet them down.',
    checks: {
      'reaches for Standard config': (c) =>
        /standard_config|lightPreset|theme|showPointOfInterestLabels|setConfigProperty|setStyleImportConfigProperty/.test(
          JSON.stringify(c.calls.map((x) => x.input)) + c.text
        ),
      'uses a theme or POI toggle rather than new layers': (c) =>
        /faded|monochrome|showPointOfInterestLabels|densityPointOfInterestLabels/.test(
          JSON.stringify(c.calls.map((x) => x.input)) + c.text
        ),
      'does not create a new style for a config change': (c) =>
        !c.called('create_style_tool')
    }
  },
  {
    id: 'diverging-ramp',
    prompt:
      'Shade US counties by temperature anomaly — how far above or below the long-run average each one is. Give me the paint expression.',
    checks: {
      'avoids a red-to-green ramp': (c) =>
        !RD_YL_GN.some((hex) =>
          (JSON.stringify(c.calls.map((x) => x.input)) + c.text)
            .toLowerCase()
            .includes(hex)
        ),
      'uses a colorblind-safe diverging scheme': (c) =>
        /RdBu|PuOr|BrBG|#b2182b|#2166ac|#67a9cf|#ef8a62/i.test(
          JSON.stringify(c.calls.map((x) => x.input)) + c.text
        )
    }
  },
  {
    id: 'explicit-classic',
    prompt:
      'I need a classic Mapbox style, not Standard — we are on an old GL JS version that does not support style imports. Build me a dark classic style with water, parks, roads and city labels.',
    // The counterpart to 'dark-mode': everything else steers hard at Standard, so nothing
    // checked that a caller who genuinely wants Classic gets a coherent Classic style rather
    // than Standard advice applied to a base that ignores it.
    checks: {
      'honours the explicit Classic request': (c) => {
        const call = c.first('style_builder_tool');
        return !!call && (call.input.base_style ?? 'standard') !== 'standard';
      },
      // A Classic base authors nothing for you, so an empty layers array is an empty map.
      'lists the features it wants drawn': (c) => {
        const layers = c.first('style_builder_tool')?.input?.layers ?? [];
        const kinds = JSON.stringify(layers);
        return (
          layers.length >= 4 &&
          /water/.test(kinds) &&
          /landuse|park/.test(kinds) &&
          /road/.test(kinds) &&
          /place_label/.test(kinds)
        );
      },
      // slot is Standard-only and now rejected outright on Classic, so reaching for it means
      // the model carried Standard guidance across the boundary.
      'does not pass Standard-only options': (c) => {
        const call = c.first('style_builder_tool');
        if (!call) return false;
        const layers = call.input?.layers ?? [];
        return (
          !call.input?.standard_config &&
          !layers.some((l) => l.slot !== undefined)
        );
      },
      'gets dark from the base or global_settings, not lightPreset': (c) => {
        const call = c.first('style_builder_tool');
        if (!call) return false;
        return (
          /dark-v11|navigation-night/.test(call.input.base_style ?? '') ||
          call.input?.global_settings?.mode === 'dark'
        );
      },
      'ships a Classic style with no imports': (c) => {
        const call = c.uploaded();
        return !!call && !call.input?.style?.imports;
      }
    }
  },
  {
    id: 'hide-basemap-feature',
    prompt:
      'On my Mapbox Standard style, get rid of the points of interest entirely — I do not want any POI icons or labels on the map.',
    // Omitting the layer hides nothing on Standard, so the only correct answer is the config
    // toggle. The failure this guards is a style that looks finished and changed nothing.
    checks: {
      'hides POIs through the Standard config toggle': (c) =>
        /showPointOfInterestLabels/.test(
          JSON.stringify(c.calls.map((x) => x.input)) + c.text
        ),
      'sets the toggle to false': (c) => {
        const haystack = JSON.stringify(c.calls.map((x) => x.input)) + c.text;
        return /showPointOfInterestLabels["']?\s*[:=]\s*false/.test(haystack);
      },
      'asks for the POI feature by name, not something adjacent': (c) => {
        const call = c.first('style_builder_tool');
        if (!call) return true;
        // Either route is correct: the toggle set directly, or `hide` on the POI layer, which
        // the builder converts into that toggle. Anything else — recolouring the POIs, hiding
        // some other layer, listing no POI layer at all — leaves them on the map.
        if (call.input?.standard_config?.showPointOfInterestLabels === false) {
          return true;
        }
        return (call.input?.layers ?? []).some(
          (l) => l.action === 'hide' && /poi/i.test(l.layer_type ?? '')
        );
      },
      'uploaded style carries the config': (c) => {
        const call = c.uploaded();
        if (!call) return true;
        return (
          call.input?.style?.imports?.[0]?.config?.showPointOfInterestLabels ===
          false
        );
      }
    }
  },
  {
    id: 'create-style-routing',
    prompt:
      'Create a brand new style in my Mapbox account for a public transit app and give me a preview link.',
    checks: {
      'builds the JSON with style_builder_tool': (c) =>
        c.called('style_builder_tool'),
      'any uploaded style is Standard-based': (c) => {
        const call = c.first('create_style_tool');
        if (!call) return true; // nothing uploaded yet is not a failure
        return Array.isArray(call.input?.style?.imports);
      },
      'does not hand-author a background layer': (c) => {
        const call = c.first('create_style_tool');
        if (!call) return true;
        return !(call.input?.style?.layers || []).some(
          (l) => l.type === 'background'
        );
      }
    }
  }
];

const SYSTEM = `You are helping a developer build Mapbox maps. You have the Mapbox MCP DevKit tools available. Use them to do the work rather than only describing it. Explain your choices briefly.`;

async function runCase(client, tools, testCase) {
  const messages = [{ role: 'user', content: testCase.prompt }];
  const calls = [];
  let text = '';
  let truncated = false;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    // Thinking is left at each model's default (adaptive on every current model) rather than
    // disabled. Disabling it made the eval both narrower and wrong-headed: `thinking:
    // {type: "disabled"}` is rejected outright on Claude Fable 5, and on the Sonnet/Opus models
    // it measurably reduces how readily the model reaches for tools — which is the only thing
    // this eval scores. Set EVAL_EFFORT to trade thoroughness for cost.
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      tools,
      messages,
      ...(EFFORT ? { output_config: { effort: EFFORT } } : {})
    });

    for (const block of response.content) {
      if (block.type === 'text') text += `\n${block.text}`;
      if (block.type === 'tool_use') {
        calls.push({ name: block.name, input: block.input });
      }
    }

    if (response.stop_reason !== 'tool_use') break;
    // Still mid-conversation with no turns left: the checks below are about to score a partial
    // transcript, so say so rather than let a turn-limit artifact read as a regression.
    if (turn === MAX_TURNS - 1) {
      truncated = true;
      break;
    }

    messages.push({ role: 'assistant', content: response.content });
    const results = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      let content;
      if (block.name === 'style_builder_tool') {
        // Feed back the tool's real output so the model can chain into create_style_tool.
        const real = await styleBuilder.run(block.input);
        content = (real.content?.[0]?.text ?? '').slice(0, 6000);
      } else {
        content = `Success. (Eval stub — no live Mapbox API call was made.)`;
      }
      results.push({ type: 'tool_result', tool_use_id: block.id, content });
    }
    messages.push({ role: 'user', content: results });
  }

  const ctx = {
    calls,
    text,
    called: (name) => calls.some((c) => c.name === name),
    first: (name) => calls.find((c) => c.name === name),
    uploaded: () => uploadCall(calls)
  };

  const results = {};
  for (const [label, check] of Object.entries(testCase.checks)) {
    try {
      results[label] = (await check(ctx)) === true;
    } catch {
      results[label] = false;
    }
  }
  return {
    id: testCase.id,
    results,
    truncated,
    toolsUsed: calls.map((c) => c.name)
  };
}

const client = new Anthropic();
const tools = toolDefinitions();
console.log(
  `Model: ${MODEL}\nTools exposed: ${tools.map((t) => t.name).join(', ')}\n`
);

// allSettled, not all: cases run concurrently, and one rate limit or transport error would
// otherwise reject the whole run and discard every other case's results with it.
const settled = await Promise.allSettled(
  CASES.map((c) => runCase(client, tools, c))
);
const outcomes = settled.map((result, i) =>
  result.status === 'fulfilled'
    ? result.value
    : {
        id: CASES[i].id,
        results: {},
        toolsUsed: [],
        error: result.reason?.message || String(result.reason)
      }
);

let passed = 0;
let total = 0;
let errored = 0;
for (const outcome of outcomes) {
  if (outcome.error) {
    errored++;
    // Its checks still count against the total, so a case that never ran cannot raise the score.
    const testCase = CASES.find((c) => c.id === outcome.id);
    total += Object.keys(testCase.checks).length;
    console.log(`! ${outcome.id}  did not run`);
    console.log(`    error: ${outcome.error}\n`);
    continue;
  }
  const entries = Object.entries(outcome.results);
  const casePassed = entries.filter(([, ok]) => ok).length;
  passed += casePassed;
  total += entries.length;
  const mark = casePassed === entries.length ? '✓' : '✗';
  console.log(
    `${mark} ${outcome.id}  ${casePassed}/${entries.length}` +
      (outcome.truncated ? `  (TRUNCATED at ${MAX_TURNS} turns)` : '')
  );
  for (const [label, ok] of entries) {
    console.log(`    ${ok ? 'pass' : 'FAIL'}  ${label}`);
  }
  console.log(`    tools: ${outcome.toolsUsed.join(' → ') || '(none)'}\n`);
}

const pct = total ? ((passed / total) * 100).toFixed(1) : '0.0';
console.log(
  `Total: ${passed}/${total} checks (${pct}%)` +
    (errored ? ` — ${errored} case(s) failed to run` : '')
);

const jsonFlag = process.argv.indexOf('--json');
if (jsonFlag !== -1 && process.argv[jsonFlag + 1]) {
  writeFileSync(
    process.argv[jsonFlag + 1],
    JSON.stringify({ model: MODEL, passed, total, pct, outcomes }, null, 2)
  );
}

process.exit(passed === total ? 0 : 1);
