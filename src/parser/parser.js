import {DEFAULT_MACROS} from "../constants.js";
import {Error} from "../error.js";
import {next, remaining, st, stn, update_src} from "./util.js";
import {convertReservedChar, parse_inner, parseAttrs, parseComment, parseStr, parseTag} from "./main.js";
import {handleImport, import_parse} from "./imports.js";
import {get_macro, parse_macro_def} from "./macros.js";

/**
 * # Parser Class
 * This class handles tokenisation from HBML to an AST which can then be turned into HTML.
 */
export class Parser {
	/** Dynamic source string. Is altered during parsing
	 * @type {string} */
	src
	/** Source file path. Used for error handling
	 * @type {string} */
	path
	/** Current line in input
	 * @type {number} */
	ln
	/** Current column in input
	 * @type {number} */
	col
	/** Current index character in the {@link this.src input string}
	 * @type {number} */
	index
	/** Boolean that's only `true` if the parser is being used for building HTML
	 * @type {boolean} */
	isBuild
	/** Macro array of all currently in-scope macros
	 * @type {Array<Object<Macro|function>>} */
	macros

	constructor(src, path, build = true) {
		this.src = src
		this.path = path
		this.ln = 1
		this.col = 1
		this.index = 0
		this.isBuild = build
		this.macros = [Object.assign({}, DEFAULT_MACROS)]
	}

	/** Alias for `new Parser`. Required to avoid circular imports */
	new(src, path, build = true) { return new Parser(src, path, build) }

	// util functions
	next = () => { return next(this) }
	remaining = () => { return remaining(this) }
	st = () => { return st(this) }
	stn = () => { return stn(this) }
	update_src = () => { return update_src(this) }

	// parser functions
	/**
	 * ## Parser function
	 * Returns an AST of {@link Token tokens} and strings or an error
	 * @return {{ok: (Array<Token | string> | null), err: (Error | null)}}
	 */
	parse = () => {
		let tokens = []

		while (this.remaining()) {
			let previous = this.src
			const {ok, err} = this.parse_inner("div", true, false)
			if (err) return {ok: null, err: new Error(err, this.path, this.ln, this.col)}
			if (previous === this.src) return {
				ok: null,
				err: new Error("Unable to parse remaining text", this.path, this.ln, this.col)
			}
			if (ok !== null) tokens = [...tokens, ...ok]
		}

		return {ok: tokens, err: null}
	}
	parse_inner = (default_tag, str_replace, under_macro_def) => { return parse_inner(this, default_tag, str_replace, under_macro_def)}
	import_parse = (prefix) => { return import_parse(this, prefix) }
	handleImport = () => { return handleImport(this) }
	convertReservedChar = (input) => { return convertReservedChar(this, input) }
	parseComment = () => { return parseComment(this) }
	parseStr = (delim, convert) => { return parseStr(this, delim, convert) }
	parseAttrs = (unique_replace, unique_position, initial) => { return parseAttrs(this, unique_replace, unique_position, initial) }
	parseTag = (default_tag) => { return parseTag(this, default_tag) }

	// macros
	get_macro = (name) => { return get_macro(this, name) }
	parse_macro_def = () => { return parse_macro_def(this) }
}

/**
 * Alias for tokenising and then stringifying input text
 * @param src {string} Input string
 * @param path {string} Input file path. User for error info
 * @return {{ok: (string | null), err: (Object | null )}}
 */
export const fullStringify = function (src, path) {
	const {ok, err} = new Parser(src, path, true).parse()
	if (err) {
		return {ok: null, err: err}
	}
	return {ok: ok.map((t) => t.toString()).join(""), err: null}
}
