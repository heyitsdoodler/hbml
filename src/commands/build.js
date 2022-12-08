import chalk from "chalk";
import fs from "fs"
import npath from "path"
import {parseHBML} from "../parser.js";

/**
 * Build function runer
 *
 * Takes in arguments and runs the appropriate command
 * @param args {Object} command line arguments after build command
 */
export function build_runner(args) {
	// help flags
	if (args["h"] !== undefined || args["help"] !== undefined) {
		help()
	}
	// get files to build
	let files = args["_"];
	if (files === []) {
		files = ["."]
	}
	delete args["_"]
	// get output path
	let out = args["o"]
	if (out === undefined) {
		out = "."
	} else if (Array.isArray(out)) {
		console.log(chalk.red("Too many arguments given for output flat (-o)! Expected at most 1!"))
		process.exit(1)
	}
	delete args["o"]
	let skip_arr = args["s"];
	if (skip_arr === undefined) { skip_arr = [] }
	let allow = { write: false, not_found: false }
	skip_arr.forEach((s) => {
		switch (s) {
			case "write":
				allow.write = true
				break
			case "not_found":
				allow.not_found = true
				break
			default:
				console.log(chalk.red(`Unknown allow value ${s}! See 'hbml build -h' for help`))
				process.exit(1)
		}
	})
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
function help() {
	console.log(`Usage: hbml build [source]... [options]

Builds HBML files into HTML files

${chalk.bold(chalk.underline('Arguments:'))}
  [source]  HBML file to build into HTML, or directory to traverse to find all HBML files to build to HTML

${chalk.bold(chalk.underline('Options:'))}
  -o
        Output directory for HTML files. Defaults to current working directory
  -a=<value>
        Allow option for errors. Allowable values are 'write' and 'not_found' for allowing write errors and file not found errors
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
function build_internal(paths, output, allow) {
	console.log("Building HTML files...")
	let file_num = 0
	console.time("hbml_build")
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
				console.log(chalk.yellow(`Cannot build non-HBML files into HTML (${path})`));
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
			file_num += 1
			parse_file(path, allow)
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
	console.log(`Finished building ${file_num} HBML files`)
}

/**
 * File writer function
 *
 * Takes path object and builds it into a HTML file
 * @param path {Object} Path object
 * @param allow {Object} Allow arguments
 */
function parse_file(path, allow) {
	fs.readFile(path.read, (err, data) => {
		if (err) {
			if (allow.not_found) {
				console.log(chalk.yellow(`Unable to read file ${path.read}! Skipping over file`))
			} else {
				console.log(chalk.red(`Unable to read file ${path.read}! Stopping!\nTo skip over missing files, pass the -s=not_found flag`))
				process.exit(1)
			}
			return
		}
		path.write = `${path.write.slice(0, path.write.length - 5)}.html`
		const parsed = parseHBML(data.toString())
		if (!fs.existsSync(npath.dirname(path.write))) {
			fs.mkdirSync(npath.dirname(path.write), {recursive: true})
		}
		fs.writeFile(
			path.write, parsed,
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
	})
}
