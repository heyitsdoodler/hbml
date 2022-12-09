import {defs, getConfig} from "../config_parse.js";
import chalk from "chalk";
import npath from "path";
import fs from "fs";
import {tokenise} from "../parser.js";

export const lint_runner = (args, project) => {
	// help flags
	if (args["h"] !== undefined || args["help"] !== undefined) {
		help()
	}
	let files
	let out
	let allow = {write: false, not_found: false, parse: false}
	let conf = defs
	if (project) {
		const conf_res = getConfig()
		if (conf_res.err) {
			console.log(chalk.red(`Error parsing config file (${conf_res.err})`))
			process.exit(1)
		}
		files = conf_res.ok["lint.src"]
		out = conf_res.ok["lint.out"]
		Object.keys(allow).forEach((k) => allow[k] = conf_res.ok[`build.${k}`])
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
					console.log(chalk.red(`Unknown allow value ${s}! See 'hbml lint -h' for help`))
					process.exit(1)
			}
		})
		delete args["s"]
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
				const read = npath.normalize(`${path.read}/${subpath}`)
				let write = npath.normalize(`${path.write}/${subpath}`)
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
	let tokens;
	const res = tokenise(fs.readFileSync(path.read).toString())
	if (res.err) {
		if (allow.parse) {
			console.log(chalk.yellow(`Unable to parse file ${path.read} ${res.err.ln}:${res.err.col}(${res.err.desc})! Skipping over file`))
		} else {
			console.log(chalk.red(`Unable to parse file ${path.read}! Stopping!\nTo skip over incorrectly formatted files, pass the -s=parse flag`))
			process.exit(1)
		}
		return
	}
	// remove doctype tag included by default
	tokens = res.ok.slice(1)
	let ident = 0
	let out = ""
	let i = 0;
	const stringify = (t) => {
		const ident_str = opts['lint.config.indent.character'].repeat(ident * opts['lint.config.indent.count'])
		i++
		switch (t.type) {
			case "comment":
				return `${ident_str}/* ${t.value} */\n`
			case "string_literal":
				return `${ident_str}"${t.value.replaceAll(`"`, `\\"`)}"\n`
			case "close":
				ident--
				return `${opts['lint.config.indent.character'].repeat(ident * opts['lint.config.indent.count'])}}\n`
			default:
				const tag_full = `${t.implicit && !opts['lint.config.replace_implicit'] ? "" : t.type}${t.id ? `#${t.id}` : ""}${t.class ? `.${ttclass.replaceAll(" ", ".")}` : ""}${t.attrs ? `[${t.attrs}]` : ""}`
				if (t.void) {
					return `${ident_str}${tag_full}\n`
				}
				let out = `${ident_str}${tag_full}${" ".repeat(tag_full ? opts['lint.config.pre_tag_space'] : 0)}${t.inline ? ">" : "{"}${" ".repeat(opts['lint.config.post_tag_space'])}`
				if (t.inline) {
					if (opts['lint.config.inline_same_line']) {
						let temp = ident
						ident = 0
						out += stringify(tokens[i])
						ident = temp
					} else {
						ident++
						out += stringify(tokens[i])
						ident--
					}
					// move over close bracket token
					i++
				} else {
					ident++
				}
				return out + "\n"
		}
	}
	for (i = 0; i < tokens.length; i++) {
		out += stringify(tokens[i])
	}
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
	// write out to file
}
