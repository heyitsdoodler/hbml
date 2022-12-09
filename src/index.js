#!/usr/bin/env node

import chalk from "chalk";
import minimist from "minimist"
import fs from "fs";

const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version

import {build_runner} from "./commands/build.js";
import {lint_runner} from "./commands/lint.js";

const project = process.argv[3] === "project"
const args = minimist(process.argv.slice(project ? 4 : 3))
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
  help      Shows this message

${chalk.bold(chalk.underline('Options:'))}
  -V,--version
        Prints version information
  -h,--help
        Shows this message`)
	process.exit()
}
