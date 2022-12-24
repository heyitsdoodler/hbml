import {parser} from 'posthtml-parser'
import {Token} from "../classes.js";
import fs from "fs";
import {DEFAULT_ALLOW, VOID_ELEMENTS} from "../constants.js";
import {CONFIG_DEFAULTS} from "../config_parse.js";
import chalk from "chalk";
import {expand_paths, log_ep_err} from "./fs_prelude.js";
import npath from "path";

export const reverse_runner = (args) => {
	if (args["h"] !== undefined || args["help"] !== undefined) {
		help()
	}
	if (args["o"] !== undefined && typeof args["o"] !== "string") {
		console.log(chalk.red(`Too many output prefixes specified! Expected at most 1! See 'hbml build -h' for help`))
		process.exit(1)
	}
	const paths_res = expand_paths(
		args["_"] ? args["_"] : [],
		args["o"] ?  args["o"] : "", ".html", ".hbml")
	if (paths_res.err.length > 0) log_ep_err(paths_res.err, DEFAULT_ALLOW)
	const paths = paths_res.ok
	delete args["_"]
	delete args["o"]
	if (args["v"] !== undefined && typeof args["v"] !== "boolean") {
		console.log(chalk.red(`Verbose flag does not take any values! See 'hbml build -h' for help`))
		process.exit(1)
	}
	const verbose = args["v"] ? args["v"] : false
	delete args["v"]
	if (Object.keys(args).length !== 0) {
		console.log(chalk.red(`Unexpected arguments ${Object.keys(args).join(", ")}! See 'hbml build -h' for help`))
		process.exit(1)
	}
	paths.forEach((p) => {
		if (verbose) process.stdout.write(`[ ] ${p.read}\r`)
		const {ok, err} = reverse(fs.readFileSync(p.read).toString())
		if (err !== null) {
			console.log(chalk.red(verbose ? `[✖] ${p.read} error: ${err}` : `Error in ${p.read}: ${err}`))
		} else {
			if (!fs.existsSync(npath.dirname(p.write))) fs.mkdirSync(npath.dirname(p.write), {recursive: true})
			fs.writeFileSync(p.write, ok)
			if (verbose) console.log(chalk.green(`[✓] ${p.read}\r`))
		}
	})
}

const help = () => {
	console.log(`Usage: hbml reverse [files]...

Converts HTML files into HBML

${chalk.bold(chalk.underline('Arguments:'))}
  [files]  HTML files to turn into HBML. These can be files or directories which will be recursively traversed

${chalk.bold(chalk.underline('Options:'))}
  -o <path>
        Output path prefix. Prefixes relative paths only
  -v
        Verbose output. Prints the name of the current file being converted followed by the conversion result
  -h,--help
        Shows this message`);
	process.exit()
}

/**
 * HTML to HBML converter. Takes a path to the file and parses the HTML then converts it to HBML. Write the output to
 * a specified output path
 * @param src {string} HTML to convert into HBML
 * @return {{ok: (string|null), err: (null|string)}}
 */
export const reverse = (src) => {
	if (src.trim() === "") return {ok: "", err: null}
	let tokens = parser(src)
	if (tokens.length === 0) return {ok: null, err: `Unable to parse input`}
	const convert = (t) => {
		if (typeof t === "string") {
			if (/<!--(.+)-->/.test(t)) return new Token("c t", {}, {value: /<!--(.+)-->/.exec(t)[1]}, [])
			return t
		}
		return new Token(
			t.tag, t.attrs ? t.attrs : {}, {void: VOID_ELEMENTS.includes(t.tag)},
			t.content ? t.content.filter((t) => typeof t === "string" ? t.trim() !== "" : true).map((c) => convert(c)) : []
		)
	}
	tokens = tokens.filter((t) => typeof t === "string" ? t.trim() !== "" : true).map((t) => convert(t))
	const doctype_index = tokens.findIndex((t) => typeof t === "string" && /<!doctype html>/i.test(t))
	if (doctype_index >= 0) {
		let n = 1
		let found = false
		while (doctype_index + n < tokens.length) {
			if (typeof tokens[doctype_index + n] === "object") {
				if (tokens[doctype_index + n].type === "html") {
					found = true
					break
				} else if (tokens[doctype_index + n].type === "c t") n++
				else break
			} else break
		}
		if (found) {
			let new_attrs = Object.assign({}, tokens[doctype_index + n].attributes)
			if (new_attrs["lang"] === "en") delete new_attrs["lang"]
			const clone = (t) => {
				if (typeof t === "string") return t
				return new Token(
					t.type, Object.assign({}, t.attributes), Object.assign({}, t.additional),
					t.children.map((t) => clone(t))
				)
			}
			tokens = [
				...tokens.slice(0, doctype_index), ...tokens.slice(doctype_index + 1, doctype_index + n),
				new Token(
					":root", new_attrs, Object.assign({}, tokens[doctype_index + n].additional),
					tokens[doctype_index + n].children.map((t) => clone(t))
				), ...tokens.slice(doctype_index + n + 1)
			]
		}
	}
	const lint_opts = {...CONFIG_DEFAULTS, 'lint.config.element_preference': "arrow", 'lint.config.remove_empty': true}
	return {ok: tokens.map((t) => typeof t === "object" ? t.lint(0, false, lint_opts) : t).join(""), err: null}
}
