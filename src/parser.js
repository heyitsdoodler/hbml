/**
 * # HBML Parser
 *
 * Split into a {@link tokenise tokeniser} and {@link stringify de-tokeniser} to allow for parsing
 */

import {VOID_ELEMENTS, INLINE_ELEMENTS, LITERAL_DELIMITERS, SPACE_AND_TAB, UNIQUE_ATTRS} from "./constants.js"
import {Token, Error, Macro} from "./classes.js";
import chalk from "chalk";

/**
 * Line number in the input string
 * @type {number}
 */
let line = 0
/**
 * Column number in the input string
 * @type {number}
 */
let col = 0
/**
 * Path to current file
 * @type {string}
 */
let file = ""

/**
 * Convert reserved HTML characters to their corresponding entities
 * @param string {string} String to convert
 */
const convertReservedChar = (string) => {
	// These are the only two characters that need to be replaced, modern browsers seem to be fine with other characters
	const reserved = {
		"<": "&lt;",
		">": "&gt;",
	}
	for (const property in reserved)
		string = string.replaceAll(property, reserved[property])

	return string
}

/**
 * Parse comment
 * @param src {string} String to take comment from
 * @return {{ok: (Token | null), err: (string | null), rem: string}}
 */
const parseComment = (src) => {
	let out = ""
	let index = 0

	const multiline = src.slice(0,2) === "/*"

	if (!(multiline || src.slice(0,2) === "//")) return {ok: null, err: "Expected '*' or '/' after /", rem: ""}
	src = src.slice(2)

	while (true) {
		if (index === src.length) {
			if (!multiline) break
			return {ok: null, err: "Expected end of comment! Found EOF", rem: ""}
		}
		const next = src[index]

		index++
		col++
		if (multiline && next === "*" && src[index] === "/") {
			index++
			break
		} else if (next === "\n") {
			if (!multiline) break

			out += next
			col = 0
			line++
		} else {
			out += next
		}
	}

	return {ok: new Token("comment", {}, {value: out}, []), err: null, rem: src.slice(index, src.length)}
}

/**
 * Parse double quote string
 * Modified from original
 * @param str {string} String to parse string literal from
 * @param char {string} Opening string character to match
 * @param convert {boolean} Convert string via {@link convertReservedChar}
 * @return {{ok: (string | null), err: (string | null), rem: string}}
 */
const parseStr = (str, char = "\"", convert = true) => {
	let index = 1
	col++
	const remaining = () => index < str.length
	const next = () => str[index]
	let out = ""

	let escape = false

	while (remaining()) {
		if (next() === "\\" && !escape) escape = true
		else if (char.includes(next()) && !escape) {
			if (next() === "]") index--
			break
		}
		else if (next() === "\n") {
			col = 0
			line++
			if (char === "`") out += "\n"
		}
		else {
			escape = false
			out += next()
		}
		index++
		col++
	}
	index++
	col++
	
	return {
		ok: convert ? convertReservedChar(out) : out,
		err: null,
		rem: str.slice(index, str.length)
	}
}

/**
 * Parse parameters from inside square brackets
 * @param src{string} Source string to parse
 * @param unique_replace{number} Allow unique attribute replacements (0 -> no message, 1 -> warning, 2 -> error)
 * @param unique_position{boolean} false if keep first occurrence of a uniquer attribute, true for keep the last occurrence
 * @param initial {Object} Initial attributes
 * @return {{ok: (Object | null), err: (null | string), rem: string}}
 */
const getAttrs = (src, unique_replace, unique_position, initial) => {
	let attrsObj = initial
	let index = 0
	const remaining = () => index < src.length
	const next = () => src[index]

	const insertValue = (key, value) => {
		if (attrsObj[key] === undefined) attrsObj[key] = value
		else {
			if (UNIQUE_ATTRS.includes(key)) {
				switch (unique_replace) {
					case 0:
						attrsObj[key] = value
						break
					case 1:
						console.log(chalk.yellow(`Duplicate unique value found (${attrsObj[key]} and ${value}) ${file} ${line}:${col}`));
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

	while (remaining() && next() !== "]") {
		// skip stn
		while (remaining()) {
			if (next() === " " || next() === "\t") {
				col++
				index++
			} else if (next() === "\n") {
				col = 0
				line++
				index++
			} else break
		}
		// parse key
		let key = ""
		while (index < src.length) {
			if (" \t\n='\"`]".includes(src[index])) break
			key += src[index]
			index++
			col++
		}
		if (next() === "]") {
			if (key) {
				const res = insertValue(key, true)
				if (res) return res
			}
			index++
			col++
			return { ok: attrsObj, err: null, rem: src.slice(index) }
		}
		if (!key) return {ok: null, err: "Empty attribute key!", rem: ""}
		if (next() === "=") {
			// parse attribute value
			let res
			if (LITERAL_DELIMITERS.includes(src[index + 1])) {
				index++
				res = parseStr(src.slice(index, src.length), next(), false)
			} else {
				res = parseStr(src.slice(index, src.length), " \t\n]", false)
			}
			if (res.err) return {ok: null, err: res.err, rem: ""}
			src = res.rem
			index = -1
			res.ok.replaceAll("\"", "&quot;").split(/ +/g).forEach((v) => {
				const res = insertValue(key, v)
				if (res) return res
			})
		} else {
			const res = insertValue(key, true)
			if (res) return res
		}
		index++
	}

	if (!remaining()) return {ok: null, err: "Unclosed attribute brackets", rem: ""}
	index++
	col++

	return { ok: attrsObj, err: null, rem: src.slice(index) }
}

/**
 * ### Tokeniser wrapper
 *
 * Wrapper for the main tokeniser. Adds the doctype tag and not much else really
 * @param src {string} String to tokenise
 * @param path {string} Path to file to be tokenised. Used for error info
 * @return {{ok: ((Object | string)[] | null), err: (Error | null)}}
 */
export const tokenise = (src, path) => {
	let tokens = []
	let macros = [[{"root": new Macro([
			new Token("!DOCTYPE", {html: true}, []),
			new Token("html", {}, {":children": true}, [new Token(":children", {}, [])])
		], false)}]]

	while (src.length > 0) {
		const {ok, err, rem} = tokenise_inner(src, "div", true, macros)
		if (err) return {ok: null, err: new Error(err, path, line, col)}
		if (rem === src) return {ok: null, err: new Error("Unable to parse remaining text", path, line, col)}
		src = rem
		tokens = [...tokens, ...ok]
	}

	return {ok: tokens, err: null}
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
 * @param src {string} String to tokenise
 * @param default_tag {string} Default tag to use when no other is given
 * @param str_replace {boolean} Pass any string through the {@link convertReservedChar} function
 * @param macros {Object[][]} Macro arrays
 * @return {{ok: (Token | string)[], err: (string | null), rem: string}}} (Ok: ``array of tokens, Err: Error description, rem: remaining string to parse)
 */
const tokenise_inner = (src, default_tag, str_replace, macros) => {
	let index = 0;
	const remaining = () => src.length > index
	const next = () => src[index]

	let out = []

	// move over "blank" characters
	while (remaining()) {
		if (next() === " " || next() === "\t") {
			col++
			index++
		} else if (next() === "\n") {
			col = 0
			index++
			line++
		}
		// jump out of empty block
		else if (next() === "}") {
			return {ok: [], err: null, rem: src.slice(index, src.length)}
		} else {
			break
		}
	}
	if (!remaining()) {
		return {ok: [], err: null, rem: ""}
	}
	// check for string
	if (LITERAL_DELIMITERS.includes(next())) {
		let res = parseStr(src.slice(index, src.length), next(), str_replace)
		if (res.err) {
			return {ok: [], err: res.err, rem: ""}
		}
		return {ok: [res.ok], err: null, rem: res.rem}
	}
	// check for comment
	if (next() === "/") {
		let res = parseComment(src.slice(index, src.length))
		if (res.err) {
			return {ok: [], err: res.err, rem: ""}
		}
		return {ok: [res.ok], err: null, rem: res.rem}
	}
	// check for tag name
	let type;
	let implicit;
	if (!">#.{[>}".includes(next())) {
		implicit = false
		type = ""
		while (remaining() && !"#. \t\n\"'`/>{[}".includes(next())) {
			type += next()
			index++
			col++
		}
	} else {
		implicit = true
		type = default_tag
	}
	if (!remaining()) {
		return {ok: [new Token(type, {}, {implicit: implicit}, [])], err: null, rem: ""}
	}
	let attrs = {}
	// check for id
	if (next() === "#") {
		let id = ""
		index++
		col++
		while (remaining() && !">{.[ \t\n".includes(next())) {
			id += next()
			index++
			col++
		}
		attrs["id"] = id
	}
	if (!remaining()) {
		return {ok: [new Token(type, attrs, {implicit: implicit}, [])], err: null, rem: ""}
	}
	// check for classes
	if (next() === ".") {
		let class_ = ""
		while (remaining() && !">{[ \t\n".includes(next())) {
			class_ += next()
			index++
			col++
		}
		attrs["class"] = class_.replaceAll(".", " ").slice(1, class_.length)
	}
	if (!remaining()) {
		return {ok: [new Token(type, attrs, {implicit: implicit}, [])], err: null, rem: ""}
	}
	// check for attributes
	if (next() === "[") {
		index++
		const attr_res = getAttrs(src.slice(index), 1, true, attrs)
		if (attr_res.err) return {ok: null, err: attr_res.err, rem: ""}
		attrs = attr_res.ok
		src = attr_res.rem
		index = 0
	}

	if (VOID_ELEMENTS.includes(type)) {
		out.push(new Token(type, attrs, {"void": true, implicit: implicit}, []))
		return {ok: out, err: null, rem: src.slice(index, src.length)}
	}

	// match the inner section
	let children = []
	default_tag = INLINE_ELEMENTS.includes(type) ? "span" : "div"
	str_replace = type !== "style"
	// skip spaces and tabs
	while (remaining() && SPACE_AND_TAB.includes(next())) {
		index++
		col++
	}
	if (!remaining()) {
		out.push(new Token(type, attrs, {implicit: implicit}, []))
		return {ok: out, err: null, rem: src.slice(index, src.length)}
	}
	let additional = {implicit: implicit}
	// check if element has one inner or block inner
	if (next() === ">") {
		additional["inline"] = true
		index++
		col++
		let res = tokenise_inner(src.slice(index, src.length), default_tag, str_replace, macros)
		if (res.err) {
			return {ok: [], err: res.err, rem: ""}
		}
		src = res.rem
		index = 0
		children = [...children, ...res.ok]
	} else if (next() === "{") {
		index++
		col++
		src = src.slice(index, src.length)
		index = 0
		while (remaining() && next() !== "}") {
			let res = tokenise_inner(src, default_tag, str_replace, macros)
			if (res.err) return {ok: [], err: res.err, rem: ""}
			children = [...children, ...res.ok]
			src = res.rem
			index = 0
			while (remaining()) {
				if (next() === " " || next() === "\t") {
					col++
					index++
				} else if (next() === "\n") {
					col = 0
					index++
					line++
				} else break
			}
			src = src.slice(index, src.length)
			index = 0
		}
		if (!remaining()) return {ok: [], err: "Unclosed block! Expected closing '}' found EOF!", rem: ""}
		index++
		col++
	}

	out.push(new Token(type, attrs, additional, children))
	return {ok: out, err: null, rem: src.slice(index, src.length)}
}

/**
 * Alias for tokenising and then stringifying input text
 * @param src {string} Input string
 * @param path {string} Input file path. User for error info
 * @return {{ok: (string | null), err: (Object | null )}}
 */
export const fullStringify = (src, path) => {
	line = 1
	col = 0
	file = path
	const {ok, err} = tokenise(src, path)
	if (err) {
		return {ok: null, err: err}
	}
	return {ok: ok.map((t) => t.toString()).join(""), err: null}
}
