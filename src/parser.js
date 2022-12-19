/**
 * # HBML Parser
 *
 * Contains the main parsing functions used by the {@link Parser} class. Also contains a stringification function
 * {@link fullStringify} to take HBML and return HTML
 */

import {VOID_ELEMENTS, INLINE_ELEMENTS, LITERAL_DELIMITERS, UNIQUE_ATTRS, DEFAULT_MACROS} from "./constants.js"
import {Token, Error, Macro, Parser} from "./classes.js";
import chalk from "chalk";
import fs from "fs"
import npath from "path"

/**
 * Convert reserved HTML characters to their corresponding entities
 * @param string {string} String to convert
 */
Parser.prototype.convertReservedChar = function (string) {
	// These are the only two characters that need to be replaced, modern browsers seem to be fine with other characters
	const reserved = {
		"<": "&lt;",
		">": "&gt;",
	}
	for (const property in reserved) string = string.replaceAll(property, reserved[property])

	return string
}

/**
 * Parse comment
 * @return {{ok: (Token | null), err: (string | null)}}
 */
Parser.prototype.parseComment = function () {
	let out = ""

	const multiline = this.src[1] === "*"

	if (!(multiline || this.src[1] === "/")) return {ok: null, err: "Expected '*' or '/' after /", rem: ""}
	this.index = 2

	while (true) {
		if (!this.remaining()) {
			if (!multiline) break
			return {ok: null, err: "Expected end of comment! Found EOF", rem: ""}
		}
		const next = this.next()

		this.index++
		this.col++
		if (multiline && next === "*" && this.next() === "/") {
			this.index++
			break
		} else if (next === "\n") {
			if (!multiline) break

			out += next
			this.col = 0
			this.line++
		} else {
			out += next
		}
	}
	this.update_src()

	return {ok: new Token("c t", {}, {value: out}, []), err: null}
}

/**
 * Parse double quote string
 * Modified from original
 * @param char {string} Opening string character to match
 * @param convert {boolean} Convert string via {@link convertReservedChar}
 * @return {{ok: (string | null), err: (string | null)}}
 */
Parser.prototype.parseStr = function (char = "\"", convert = true) {
	this.index++
	this.col++
	let out = ""

	let escape = false

	while (this.remaining()) {
		if (this.next() === "\\" && !escape) escape = true
		else if (char.includes(this.next()) && !escape) {
			if (this.next() === "]") this.index--
			break
		} else if (this.next() === "\n") {
			this.col = 0
			this.line++
			if (char === "`") out += "\n"
		} else {
			escape = false
			out += this.next()
		}
		this.index++
		this.col++
	}
	if (!this.remaining()) return {ok: null, err: "Unclosed string"}
	this.index++
	this.col++
	this.update_src()

	return {
		ok: convert ? this.convertReservedChar(out) : out,
		err: null,
	}
}

/**
 * Parse parameters from inside square brackets
 * @param unique_replace{number} Allow unique attribute replacements (0 -> no message, 1 -> warning, 2 -> error)
 * @param unique_position{boolean} false if keep first occurrence of a uniquer attribute, true for keep the last occurrence
 * @param initial {Object} Initial attributes
 * @return {{ok: (Object | null), err: (null | string)}}
 */
Parser.prototype.parseAttrs = function (unique_replace, unique_position, initial) {
	let attrsObj = initial

	const insertValue = (key, value) => {
		if (attrsObj[key] === undefined) attrsObj[key] = value
		else {
			if (UNIQUE_ATTRS.includes(key)) {
				switch (unique_replace) {
					case 0:
						attrsObj[key] = value
						break
					case 1:
						console.log(chalk.yellow(`Duplicate unique value found (${attrsObj[key]} and ${value}) ${this.file} ${this.line}:${this.col}`));
						attrsObj[key] = value
						break
					default:
						return {ok: null, err: `Duplicate unique value found (${attrsObj[key]} and ${value})`, rem: ""}
				}
			} else {
				switch (`${typeof attrsObj[key]} ${typeof value}`) {
					case "string string":
						attrsObj[key] += ` ${value}`
						break
					case "boolean string":
						attrsObj[key] = value
				}
			}
		}
	}

	while (this.remaining() && this.next() !== "]") {
		// skip stn
		this.stn()
		// parse key
		let key = ""
		while (this.remaining()) {
			if (" \t\n='\"`]".includes(this.next())) break
			key += this.next()
			this.index++
			this.col++
		}
		if (this.next() === "]") {
			if (key) {
				const res = insertValue(key, true)
				if (res) return res
			}
			this.index++
			this.col++
			this.update_src()
			return {ok: attrsObj, err: null}
		}
		if (!key) return {ok: null, err: "Empty attribute key!"}
		if (this.next() === "=") {
			// parse attribute value
			if (LITERAL_DELIMITERS.includes(this.src[this.index + 1])) this.index++
			const delim = LITERAL_DELIMITERS.includes(this.next()) ? this.next() : " \t\n]"
			this.update_src()
			const res = this.parseStr(delim, false)
			if (res.err) return {ok: null, err: res.err, rem: ""}
			this.index--
			res.ok.replaceAll("\"", "&quot;").split(/ +/g).forEach((v) => {
				const res = insertValue(key, v)
				if (res) return res
			})
		} else {
			const res = insertValue(key, true)
			if (res) return res
		}
		this.index++
	}

	if (!this.remaining()) return {ok: null, err: "Unclosed attribute brackets", rem: ""}
	this.index++
	this.col++
	this.update_src()

	return {ok: attrsObj, err: null}
}

/**
 * Parse a tag from input
 * @param default_tag{string} default tag if the tag is implicit
 * @return {{ok: ({type: string, attrs: Object, additional: Object} | null), err: (null | string)}}
 */
Parser.prototype.parseTag = function (default_tag) {
	let type;
	let implicit;
	if (!">#.{[>}".includes(this.next())) {
		implicit = false
		type = ""
		while (this.remaining() && !"#. \t\n\"'`/>{[}".includes(this.next())) {
			type += this.next()
			this.index++
			this.col++
		}
	} else {
		implicit = true
		type = default_tag
	}
	const isVoid = VOID_ELEMENTS.includes(type)
	if (!this.remaining()) {
		return {ok: {type: type, attrs: {}, additional: {void: isVoid, implicit: implicit}}, err: null}
	}
	let attrs = {}
	// check for id
	if (this.next() === "#") {
		let id = ""
		this.index++
		this.col++
		while (this.remaining() && !">{.[ \t\n".includes(this.next())) {
			id += this.next()
			this.index++
			this.col++
		}
		attrs["id"] = id
	}
	if (!this.remaining()) {
		return {ok: {type: type, attrs: attrs, additional: {void: isVoid, implicit: implicit}}, err: null}
	}
	// check for classes
	if (this.next() === ".") {
		let class_ = ""
		while (this.remaining() && !">{[ \t\n".includes(this.next())) {
			class_ += this.next()
			this.index++
			this.col++
		}
		attrs["class"] = class_.replaceAll(".", " ").slice(1)
	}
	if (!this.remaining()) return {
		ok: {type: type, attrs: attrs, additional: {void: isVoid, implicit: implicit}},
		err: null
	}

	// check for attributes
	if (this.next() === "[") {
		this.index++
		this.update_src()
		const attr_res = this.parseAttrs(1, true, attrs)
		if (attr_res.err) return {ok: null, err: attr_res.err}
		attrs = attr_res.ok
		this.index = 0
	}
	return {ok: {type: type, attrs: attrs, additional: {void: isVoid, implicit: implicit}}, err: null}
}

/**
 * ### Tokeniser wrapper
 *
 * Wrapper for the main tokeniser. Adds the doctype tag and not much else really
 * @return {{ok: ((Object | string)[] | null), err: (Error | null)}}
 */
Parser.prototype.parse = function () {
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

/**
 * ### Import specific parser
 *
 * Used for parsing imported files and getting macro definitions
 * @param prefix {string} Namespace prefix
 * @return {{ok: (Object | null), err: (Error | null)}}
 */
Parser.prototype.import_parse = function (prefix) {
	const {_, err} = this.parse()
	if (err !== null) return {ok: null, err: err}
	let out = Object.assign({}, this.macros[0])
	Object.keys(DEFAULT_MACROS).forEach((k) => delete out[k])
	if (prefix === "") return {ok: out, err: null}
	// traverse all macros and add namespaces to them
	const updateMacroCall = (t) => {
		if (typeof t === "string") return t
		if (t.type[0] === ":") t.type = `:${prefix}${t.type.slice(1)}`
		return new Token(t.type, t.attributes, t.additional, t.children.map((c) => updateMacroCall(c)))
	}
	let prefixed_out = {}
	for (const outKey in out) {
		prefixed_out[`${prefix}${outKey}`] = new Macro(out[outKey].rep.map((t) => updateMacroCall(t)), out[outKey].void)
	}
	return {ok: prefixed_out, err: null}
}

/**
 * ### Tokenises an input string
 *
 * This works by parsing the start of the tag, then parsing the inner section recursively, then checking for an ending tag
 *
 * The tag objects all have a type which is their HTML tag. If the tag is `!DOCTYPE` that represents the
 * `<!DOCTYPE html>` at the start of the HTML file. All other can have an `id`, `class`, and `attrs` value which are
 * self-explanatory. Each of these are strings.
 *
 * If an error is found, the error object will contain a `ln` and `col` value for the line and column where the error was found
 * @param default_tag {string} Default tag to use when no other is given
 * @param str_replace {boolean} Pass any string through the {@link convertReservedChar} function
 * @param under_macro_def {boolean} Is the parser parsing under a macro definition
 * @return {{ok: ((Token | string)[] | null), err: (string | null)}}} (Ok: ``array of tokens, Err: Error description, rem: remaining string to parse)
 */
Parser.prototype.parse_inner = function (default_tag, str_replace, under_macro_def) {
	// move over "blank" characters
	this.stn()
	if (this.next() === "}") {
		this.update_src()
		return {ok: null, err: null}
	}
	if (!this.remaining()) return {ok: null, err: null}
	// check for string
	if (LITERAL_DELIMITERS.includes(this.next())) {
		let res = this.parseStr(this.next(), str_replace)
		if (res.err) return {ok: null, err: res.err}
		return {ok: [res.ok], err: null}
	}
	//check for macro def
	if (this.next() === "-" && this.src[this.index + 1] === "-") {
		this.index += 2
		return this.parse_macro_def()
	}
	// check for comment
	if (this.next() === "/") {
		this.src = this.src.slice(this.index)
		let res = this.parseComment()
		if (res.err) return {ok: null, err: res.err}
		return {ok: [res.ok], err: null}
	}
	// check for import statement
	if (this.src.startsWith("@import", this.index)) {
		this.index += 7
		this.st()
		let path = ""
		while (this.remaining()) {
			if (" \t\n".includes(this.next())) break
			path += this.next()
			this.index++
			this.col++
		}
		let prefix = ""
		if (this.remaining() && this.next() !== "\n") {
			this.st()
			while (this.remaining()) {
				if (".#[{>]}'\"` \t\n".includes(this.next())) break
				prefix += this.next()
				this.index++
				this.col++
			}
			prefix += ":"
		}
		let src
		// find the file
		if (path.startsWith("http")) {
			let req = new XMLHttpRequest()
			req.open("GET", path, false)
			req.timeout = 15
			req.send(null)
			if (req.status !== 200) return {ok: null, err: `Unable to access ${path} (response ${req.status} '${req.responseText}')`}
			src = req.responseText
		} else {
			path = npath.join(npath.isAbsolute(path) ? "" : process.cwd(), path)
			if (!path.endsWith(".hbml")) path += ".hbml"
			if (!fs.existsSync(path)) return {ok: null, err: `Imported file ${path} does not exist`}
			src = fs.readFileSync(path).toString()
		}
		const {ok, err} = new Parser(src, path, true).import_parse(prefix)
		if (err !== null) return {ok: null, err: `Error importing file ${path} (${err.toString()})`}
		this.update_src()
		for (const imported_macro in ok) {
			if (this.macros[this.macros.length - 1][imported_macro] !== undefined){
				return {ok: null, err: "Cannot redefine macros through imports. Try using a namespace instead"}
			}
			this.macros[this.macros.length - 1][imported_macro] = ok[imported_macro]
		}
		return {ok: null, err: null}
	}
	// get tag
	let tag_res = this.parseTag(default_tag)
	if (tag_res.err) return {ok: null, err: tag_res.err}
	let {type, attrs, additional} = tag_res.ok

	// check if the tag is a macro
	let macro = undefined
	if (type[0] === ":" && ![":child", ":unwrap-child", ":children", ":consume", ":consume-all"].includes(type)) {
		// try to get macro
		if (type === ":") return {ok: null, err: "Macro cannot have an empty name"}
		if (!under_macro_def) {
			const {ok, err} = this.get_macro(type.slice(1))
			if (ok === null && this.isBuild) return {ok: null, err: err}
			macro = ok
			if (ok.void) {
				this.update_src()
				return this.isBuild ? {ok: ok.replace([], attrs, this).ok, err: null} : {ok: [new Token(type, attrs, additional, [])], err: null}
			}
		}
	}

	if (additional["void"]) {
		this.update_src()
		return {ok: [new Token(type, attrs, additional, [])], err: null}
	}

	// match the inner section
	let children = []
	default_tag = INLINE_ELEMENTS.includes(type) ? "span" : "div"
	str_replace = type !== "style"
	// skip spaces and tabs
	this.st()
	if (!this.remaining()){
		this.update_src()
		if (macro === undefined) return {ok: [new Token(type, attrs, additional, [])], err: null}
		return typeof macro === "object" ? macro.replace([], attrs) : {ok: macro([]), err: null}
	}
	// check if element has one inner or block inner
	if (this.next() === ">") {
		additional["inline"] = true
		this.index++
		this.col++
		this.update_src()
		let res = this.parse_inner(default_tag, str_replace, under_macro_def)
		if (res.err) return {ok: null, err: res.err}
		if (res.ok !== null) children = [...children, ...res.ok]
	} else if (this.next() === "{") {
		this.macros.push({})
		this.index++
		this.col++
		this.update_src()
		while (this.remaining() && this.next() !== "}") {
			let res = this.parse_inner(default_tag, str_replace, under_macro_def)
			if (res.err) return {ok: null, err: res.err, rem: ""}
			if (res.ok !== null) children = [...children, ...res.ok]
			this.stn()
		}
		if (!this.remaining()) return {ok: null, err: "Unclosed block! Expected closing '}' found EOF!"}
		this.macros.pop()
		this.index++
		this.col++
	}
	this.update_src()

	if (macro !== undefined && this.isBuild) {
		if (typeof macro === "object") return macro.replace(children, attrs, this)
		return {ok: macro(children), err: null}
	}

	return {ok: [new Token(type, attrs, additional, children)], err: null}
}

/**
 * Parse macros into un-expanded tokens and add to current macros in scope
 * @return {{err: (string|null), ok: null}}
 */
Parser.prototype.parse_macro_def = function () {
	let {ok: ok, err} = this.parse_inner("div", false, true)
	if (err) return {ok: null, err: err}
	// get required macro info
	const count_res = ok[0].count_child()
	let m_ok = count_res.tok
	const previous = this.get_macro(m_ok.type)
	if (previous.ok && previous.ok.void !== count_res.isVoid) return {ok: null, err: "Macro redefinitions must preserve voidness"}
	this.macros[this.macros.length - 1][m_ok.type] = new Macro(m_ok.children, count_res.isVoid)
	this.update_src()
	return this.isBuild ? {ok: null, err: null} : {ok: [new Token(`--${ok[0].type}`, ok[0].attributes, {...ok[0].additional, void: m_ok.children.length === 0}, m_ok.children)], err: null}
}

/**
 *
 * @param name {string} Macro name (*without* colon prefix)
 * @return {{err: null, ok: Macro}|{err: string, ok: null}}
 */
Parser.prototype.get_macro = function (name) {
	let macro = undefined
	let index_to_check = this.macros.length
	while (index_to_check > 0) {
		index_to_check--
		const possible = this.macros[index_to_check][name]
		if (possible) {
			macro = possible
			break
		}
	}
	if (macro === undefined) return {ok: null, err: `Unknown macro :${name}`}
	return {ok: macro, err: null}
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
