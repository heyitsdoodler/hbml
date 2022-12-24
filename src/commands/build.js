import chalk from "chalk";
import fs from "fs"
import npath from "path"
import {fullStringify} from "../parser.js";
import {getConfig} from "../config_parse.js";
import {Parser} from "../classes.js";
import {expand_paths, log_ep_err} from "./fs_prelude.js";
import {DEFAULT_ALLOW} from "../constants.js";

/**
 * Build function runner
 *
 * Takes in arguments and runs the appropriate command
 * @param args {Object} command line arguments after build command
 * @param project{boolean} is this a project command
 */
export const build_runner = (args, project) => {
	// help flags
	if (args["h"] !== undefined || args["help"] !== undefined) {
		help()
	}
	let files
	let out
	let allow = Object.assign({}, DEFAULT_ALLOW)
	if (project) {
		const conf_res = getConfig()
		if (conf_res.err) {
			console.log(chalk.red(`Error parsing config file (${conf_res.err}`))
			process.exit(1)
		}
		files = conf_res.ok["build.src"]
		out = conf_res.ok["build.output"]
		Object.keys(allow).forEach((k) => allow[k] = conf_res.ok[`build.allow.${k}`])
	} else {
		// get files to build
		files = args["_"];
		if (!files) {
			files = ["."]
		}
		delete args["_"]
		// get output path
		out = args["o"]
		if (out === undefined) {
			out = "."
		} else if (Array.isArray(out)) {
			console.log(chalk.red("Too many arguments given for output flag (-o)! Expected at most 1!"))
			process.exit(1)
		}
		delete args["o"]
		let skip_arr = args["s"];
		if (skip_arr === undefined) {
			skip_arr = []
		}
		skip_arr.forEach((s) => {
			switch (s) {
				case "write":
					allow.write = true
					break
				case "not_found":
					allow.not_found = true
					break
				case "parse":
					allow.parse = true
					break
				default:
					console.log(chalk.red(`Unknown allow value ${s}! See 'hbml build -h' for help`))
					process.exit(1)
			}
		})
		delete args["s"]
	}
	// check no unexpected args were given
	if (Object.keys(args).length !== 0) {
		console.log(chalk.red(`Unexpected arguments ${Object.keys(args).join(", ")}! See 'hbml build -h' for help`))
		process.exit(1)
	}
	build_internal(files, out, allow)
}

/**
 * Help function for build command
 *
 * Prints help info for the build command then ends the process
 */
const help = () => {
	console.log(`Usage: hbml build {project}|([source]... [options])

Builds HBML files into HTML files

If project is provided, uses argumets from hbml.json in the cwd

${chalk.bold(chalk.underline('Arguments:'))}
  [source]  HBML file to build into HTML, or directory to traverse to find all HBML files to build to HTML

${chalk.bold(chalk.underline('Options:'))}
  -o <path>
        Output directory for HTML files. Defaults to current working directory
  -a=<value>
        Allow option for errors. Allowable values are:
        - 'write' for allowing write errors
        - 'not_found' for allowing file not found errors
        - 'parse' for allowing HBML parsing errors
  -h,--help
        Shows this message`);
	process.exit()
}

/**
 * Internal function to run the builder on HBML files
 * @param paths {string[]} Given paths to traverse/build
 * @param output {string} Output path prefix
 * @param allow {Object} Allow arguments
 */
const build_internal = (paths, output, allow) => {
	console.log("Building HTML files...")
	const path_res = expand_paths(paths, output)
	if (path_res.err.length > 0) log_ep_err(path_res.err, allow)
	path_res.ok.map((p) => {
		parse_file(p, allow)
	})
	console.log(`Finished building HBML files`)
}

/**
 * File writer function
 *
 * Takes path object and builds it into a HTML file
 * @param path {{read: string, write: string}} Path object
 * @param allow {Object} Allow arguments
 */
const parse_file = (path, allow) => {
	path.write = `${path.write.slice(0, path.write.length - 5)}.html`
	const {ok, err} = fullStringify(fs.readFileSync(path.read).toString(), path.read)
	if (err) {
		if (allow.parse) {
			console.log(chalk.yellow(`Unable to parse file ${path.write} ${err.ln}:${err.col}(${err.desc})! Skipping over file`))
		} else {
			console.log(chalk.red(`Unable to parse file ${path.write} ${err.ln}:${err.col}(${err.desc})! Stopping!\nTo skip over parsing errors, pass the -s=parse flag`))
			process.exit(1)
		}
		return
	}
	if (!fs.existsSync(npath.dirname(path.write))) {
		fs.mkdirSync(npath.dirname(path.write), {recursive: true})
	}
	fs.writeFile(
		path.write, ok,
		(e) => {
			if (e) {
				if (allow.write) {
					console.log(chalk.yellow(`Unable to write file ${path.write}! Skipping over file`))
				} else {
					console.log(chalk.red(`Unable to write file ${path.write}! Stopping!\nTo skip over write errors, pass the -s=write flag`))
					process.exit(1)
				}
			}
		}
	)
}
