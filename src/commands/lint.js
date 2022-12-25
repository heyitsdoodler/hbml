import {CONFIG_DEFAULTS, getConfig} from "../config_parse.js";
import chalk from "chalk";
import npath from "path";
import fs from "fs";
import {Parser} from "../parser/parser.js";

export const lint_runner = (args, project) => {
	// help flags
	if (args["h"] !== undefined || args["help"] !== undefined) {
		help()
	}
	let files
	let out
	let allow = {write: false, not_found: false, parse: false}
	let conf = CONFIG_DEFAULTS
	if (project) {
		const conf_res = getConfig()
		if (conf_res.err) {
			console.log(chalk.red(`Error parsing config file (${conf_res.err})`))
			process.exit(1)
		}
		files = conf_res.ok["lint.src"]
		out = conf_res.ok["lint.output"]
		Object.keys(allow).forEach((k) => allow[k] = conf_res.ok[`build.allow.${k}`])
		conf = conf_res.ok
	} else {
		// get files to build
		files = args["_"];
		if (files === []) {
			files = ["."]
		}
		delete args["_"]
		// get output path
		out = args["o"]
		if (out === undefined) {
			out = args["p"] ? "linted" : "."
			delete args["p"]
		} else if (Array.isArray(out)) {
			console.log(chalk.red("Too many arguments given for output flag (-o)! Expected at most 1!"))
			process.exit(1)
		}
		if (args["p"]) {
			console.log(chalk.yellow("-p and -o flags found! Ignoring -p"))
			delete args["p"]
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
					console.log(chalk.red(`Unknown allow value ${s}!\nSee 'hbml lint -h' for help`))
					process.exit(1)
			}
		})
		delete args["s"]
		const expected_keys = Object.keys(CONFIG_DEFAULTS)
		let given_keys = Object.keys(args).filter((k) => !expected_keys.includes(`lint.config.${k}`))
		if (Object.keys(given_keys).length !== 0) {
			console.log(chalk.red(`Unknown argument${Object.keys(given_keys) ? "s":""}: ${given_keys.map((k) => `--${k}`).join(" ")}!\nCheck the config file docs for help`))
			process.exit(1)
		}
		Object.entries(args).forEach(([k, v]) => {
			if (typeof conf[`lint.config.${k}`] === typeof v) conf[`lint.config.${k}`] = v
			else {
				console.log(chalk.red(`Incorrect type for argument --${k}! Expected ${typeof conf[`lint.config.${k}`]} found ${typeof v}!\nCheck the config file docs for help`))
				process.exit(1)
			}
		})
	}
	// check no unexpected args were given
	if (Object.keys(args).length !== 0) {
		console.log(chalk.red(`Unexpected arguments ${Object.keys(args).join(", ")}! See 'hbml lint -h' for help`))
		process.exit(1)
	}
	lint_internal(files, out, allow, conf)
}
/**
 * Prints help for the lint command then exits
 */
const help = () => {
	console.log(`Usage: hbml lint {project}|([source]... [options])

Builds HBML files into HTML files

If project is provided, uses argumets from hbml.json in the cwd

${chalk.bold(chalk.underline('Arguments:'))}
  [source]  HBML file to build into HTML, or directory to traverse to find all HBML files to build to HTML

${chalk.bold(chalk.underline('Options:'))}
  -o <path>
        Output directory for HTML files. Defaults to current working directory
  -p
        Alias for -o "linted". If passed with -o, will raise a warning and be ignored
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
 * Internal function to run the linter on HBML files
 * @param paths {string[]} Given paths to traverse/build
 * @param output {string} Output path prefix
 * @param allow {Object} Allow arguments
 * @param lint_opts{Object} Linting options
 */
const lint_internal = (paths, output, allow, lint_opts) => {
	console.log("Linting HTML files...")
	let filtered = []
	const cwd = process.cwd();
	paths.forEach((path) => {
		const read = npath.normalize(`${npath.isAbsolute(path) ? "" : cwd}/${path}`);
		const write = npath.normalize(`${npath.isAbsolute(path) ? "" : cwd + "/" + output}/${path}`);
		// check if path is a file or directory
		if (!fs.existsSync(read)) {
			if (allow.not_found) {
				console.log(chalk.yellow(`Unable to read ${path}! Skipping over it`))
			} else {
				console.log(chalk.red(`Unable to read file ${path}! Stopping!\nTo skip over missing files, pass the -s=not_found flag`))
				process.exit(1)
			}
		} else {
			const type = fs.lstatSync(path).isDirectory() ? "dir" : "file";
			if (type === "file" && !path.endsWith(".hbml")) {
				console.log(chalk.yellow(`Cannot lint non-HBML files into HTML (${path})`));
			}
			filtered.push({read: read, write: write, type: type})
		}
	})
	while (true) {
		const path = filtered.pop()
		if (path === undefined) {
			break
		}
		if (path.type === "file") {
			lint_file(path, allow, lint_opts)
		} else {
			fs.readdirSync(path.read).forEach((subpath) => {
				const read = npath.join(path.write, subpath)
				let write = npath.join(path.write, subpath)
				const type = fs.lstatSync(read).isDirectory() ? "dir" : "file"
				if ((type === "file" && read.endsWith(".hbml")) || type === "dir") {
					filtered.push({read: read, write: write, type: type})
				}
			})
		}
	}
	console.log(`Finished linting HBML files`)
}

/**
 * Lint an individual file
 * @param path{Object} Path to file
 * @param allow{Object} Allow options
 * @param opts{Object} Lint options
 */
const lint_file = (path, allow, opts) => {
	const res = new Parser(fs.readFileSync(path.read).toString(), path.read, false).parse()
	if (res.err) {
		if (allow.parse) {
			console.log(chalk.yellow(`Unable to parse file ${path.read} ${res.err.ln}:${res.err.col}(${res.err.desc})! Skipping over file`))
		} else {
			console.log(chalk.red(`Unable to parse file ${path.read} ${res.err.ln}:${res.err.col}(${res.err.desc})! Stopping!\nTo skip over incorrectly formatted files, pass the -s=parse flag`))
			process.exit(1)
		}
		return
	}
	const out = res.ok.map((t) => typeof t === "object" ? t.lint(0, false, opts) : t).join("\n")
	fs.writeFile(path.write, out, (write_err) => {
		if (write_err) {
			if (allow.write) {
				console.log(chalk.yellow(`Unable to write file ${path.write}! Skipping over file`))
			} else {
				console.log(chalk.red(`Unable to write file ${path.write}! Stopping!\nTo skip over write errors, pass the -s=write flag`))
				process.exit(1)
			}
		}
	})
}
