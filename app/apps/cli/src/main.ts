#!/usr/bin/env node
import { parseArgs } from 'node:util';
import {
  cmdBuilderCompile,
  cmdBuilderEval,
  cmdBuilderPull,
  cmdBuilderPush,
  cmdBuilderRelease,
  cmdBuilderTests,
} from './builder-commands.js';
import { ApiError, api } from './client.js';
import {
  cmdActive,
  cmdArchive,
  cmdAudit,
  cmdDiff,
  cmdList,
  cmdNew,
  cmdPromote,
  cmdRender,
  cmdRollback,
  cmdShow,
  cmdVersionList,
  cmdVersionNew,
  cmdVersionShow,
} from './commands.js';
import { cmdExport, cmdImport } from './export-io.js';
import { c, err, out } from './format.js';

// Exit cleanly when piped into a closing reader (e.g. `promptops builder pull … | head`).
process.stdout.on('error', (e: NodeJS.ErrnoException) => {
  if (e.code === 'EPIPE') process.exit(0);
});

const HELP = `${c.bold('promptops')} — local prompt versioning CLI

${c.bold('Usage')}
  promptops <command> [args] [flags]

${c.bold('Assets')}
  list                                 List all assets
  show <asset>                         Asset detail + versions
  new <asset> [--owner --desc --tags --lifecycle]
                                       Register a new asset
  active <asset>                       Show the active version

${c.bold('Versions')}
  version list <asset>                 List versions
  version show <asset> <ver>           Version detail (body)
  version new <asset> <ver> [-m msg] [--user .. --system ..]
                                       Create a draft (opens $EDITOR if --user omitted)
  promote <asset> <ver>                Promote a draft to active
  archive <asset> <ver>                Archive a non-draft version
  rollback <asset> --reason "..."      Restore previous active version

${c.bold('Render / Audit')}
  render <asset> <ver> [-i k=v ...] [--save]
                                       Render template with manual inputs (no LLM)
  diff <asset> <verA> <verB>           Diff prompt body + model config
  audit <asset> [--limit N]            Audit log

${c.bold('Portability (git-friendly)')}
  export <asset> [--out file.yaml]     Export asset + versions to YAML (stdout if no --out)
  import <file.yaml>                   Recreate asset + versions from YAML

${c.bold('Builder (agent spec)')}
  builder pull <asset> [--out f.yaml]  Stored builder spec → YAML
  builder push <asset> <f.yaml>        YAML → stored builder spec
  builder compile <asset> [f.yaml]     Compile spec → prompt body
  builder tests <asset>                Generate baseline test cases
  builder eval <asset> <results.txt>   Import eval results
  builder release <asset> <ver> [--no-promote]
                                       Compile spec → version → promote

${c.bold('Env')}
  PROMPTOPS_API_URL    API base (default http://localhost:3013)
  PROMPTOPS_API_TOKEN  Bearer token (only if API auth is on)
`;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      owner: { type: 'string' },
      desc: { type: 'string' },
      tags: { type: 'string' },
      lifecycle: { type: 'string' },
      message: { type: 'string', short: 'm' },
      user: { type: 'string' },
      system: { type: 'string' },
      input: { type: 'string', short: 'i', multiple: true },
      save: { type: 'boolean' },
      reason: { type: 'string' },
      limit: { type: 'string' },
      out: { type: 'string' },
      'no-promote': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  const [cmd, ...rest] = positionals;

  if (!cmd || values.help) {
    out(HELP);
    return;
  }

  const limit = values.limit ? Number(values.limit) : undefined;
  const need = (n: number, usage: string): string[] => {
    if (rest.length < n) throw new Error(`Usage: promptops ${usage}`);
    return rest;
  };

  switch (cmd) {
    case 'list':
      return cmdList();
    case 'show':
      return cmdShow(need(1, 'show <asset>')[0]!);
    case 'new':
      return cmdNew(need(1, 'new <asset>')[0]!, {
        owner: values.owner,
        desc: values.desc,
        tags: values.tags,
        lifecycle: values.lifecycle,
      });
    case 'active':
      return cmdActive(need(1, 'active <asset>')[0]!);
    case 'version': {
      const [sub, asset, ver] = rest;
      if (sub === 'list') {
        if (!asset) throw new Error('Usage: promptops version list <asset>');
        return cmdVersionList(asset);
      }
      if (sub === 'show') {
        if (!asset || !ver) throw new Error('Usage: promptops version show <asset> <ver>');
        return cmdVersionShow(asset, ver);
      }
      if (sub === 'new') {
        if (!asset || !ver) throw new Error('Usage: promptops version new <asset> <ver>');
        return cmdVersionNew(asset, ver, {
          message: values.message,
          user: values.user,
          system: values.system,
        });
      }
      throw new Error('Usage: promptops version <list|show|new> ...');
    }
    case 'promote': {
      const [asset, ver] = need(2, 'promote <asset> <ver>');
      return cmdPromote(asset!, ver!);
    }
    case 'archive': {
      const [asset, ver] = need(2, 'archive <asset> <ver>');
      return cmdArchive(asset!, ver!);
    }
    case 'rollback':
      return cmdRollback(need(1, 'rollback <asset> --reason "..."')[0]!, { reason: values.reason });
    case 'render': {
      const [asset, ver] = need(2, 'render <asset> <ver> [-i k=v ...]');
      return cmdRender(asset!, ver!, { input: values.input ?? [], save: values.save });
    }
    case 'diff': {
      const [asset, verA, verB] = need(3, 'diff <asset> <verA> <verB>');
      return cmdDiff(asset!, verA!, verB!);
    }
    case 'audit':
      return cmdAudit(need(1, 'audit <asset>')[0]!, { limit });
    case 'export':
      return cmdExport(need(1, 'export <asset> [--out file]')[0]!, { out: values.out });
    case 'import':
      return cmdImport(need(1, 'import <file.yaml>')[0]!);
    case 'builder': {
      const [sub, asset, arg] = rest;
      if (!sub || !asset)
        throw new Error(
          'Usage: promptops builder <pull|push|compile|tests|eval|release> <asset> ...',
        );
      switch (sub) {
        case 'pull':
          return cmdBuilderPull(asset, { out: values.out });
        case 'push':
          if (!arg) throw new Error('Usage: promptops builder push <asset> <f.yaml>');
          return cmdBuilderPush(asset, arg);
        case 'compile':
          return cmdBuilderCompile(asset, arg);
        case 'tests':
          return cmdBuilderTests(asset);
        case 'eval':
          if (!arg) throw new Error('Usage: promptops builder eval <asset> <results.txt>');
          return cmdBuilderEval(asset, arg);
        case 'release':
          if (!arg)
            throw new Error('Usage: promptops builder release <asset> <ver> [--no-promote]');
          return cmdBuilderRelease(asset, arg, {
            file: values.out,
            promote: !values['no-promote'],
          });
        default:
          throw new Error('Usage: promptops builder <pull|push|compile|tests|eval|release> ...');
      }
    }
    case 'help':
      out(HELP);
      return;
    default:
      err(`Unknown command '${cmd}'. Run 'promptops help'.`);
      process.exitCode = 1;
  }
}

main().catch((e) => {
  if (e instanceof ApiError) {
    err(e.message);
  } else {
    err(e instanceof Error ? e.message : String(e));
  }
  out(c.dim(`API: ${api.base}`));
  process.exitCode = 1;
});
