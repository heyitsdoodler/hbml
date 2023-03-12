#!/usr/bin/env node

import chalk from "chalk";
import minimist from "minimist"
import fs from "fs";
import path from "path";
import {fileURLToPath} from 'url';

const version = JSON.parse(fs.readFileSync(path.join(fileURLToPath(import.meta.url), "..", "..", "package.json"), 'utf8')).version

import {build_runner} from "./commands/build.js";
import {lint_runner} from "./commands/lint.js";
import {reverse_runner, reverse} from "./commands/reverse.js";
import {init_runner} from "./commands/init.js";
import {Parser, fullStringify} from "./parser/parser.js";

const project = process.argv[3] === "project"
let args = minimist(process.argv.slice(project ? 4 : 3))
args = process.argv.length > (project ? 4 : 3) ? args : {}
switch (process.argv[2]) {
	case undefined:
		console.log(chalk.red("No command given! Try running 'hbml -h' to see help messages"));
		process.exit(1)
		break
	case "help":
	case "-h":
	case "--help":
		help()
		break;
	case "-V":
	case "--version":
		console.log(`HBML version ${version}`)
		break;
	case "build":
		build_runner(args, project)
		break
	case "lint":
		lint_runner(args, project)
		break
	case "reverse":
		if (project) args["project"] = true
		reverse_runner(args)
		break
	case "init":
		if (project) args["project"] = true
		init_runner(args)
		break
	default:
		console.log(chalk.red(`Unknown command ${process.argv[2]}! Try running 'hbml -h' to see available commands`));
		process.exit(1)
}

function help() {
	console.log(`${chalk.green(chalk.bold(chalk.underline('HBML')))}
A command line interface for HBML

Usage: hbml <command>

${chalk.bold(chalk.underline('Commands:'))}
  build     Build the project or file into HTML
  lint      Lint the project or file
  init      Initiate a new HBML project
  reverse   Reverse HTML into HBML
  help      Shows this message

${chalk.bold(chalk.underline('Options:'))}
  -V,--version
        Prints version information
  -h,--help
        Shows this message`)
	process.exit()
}

export {Parser, fullStringify, reverse}
