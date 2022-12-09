/**
 * # HBML Parser
 *
 * Split into a {@link tokenise tokeniser} and {@link stringify de-tokeniser} to allow for parsing
 */

import {VOID_ELEMENTS, INLINE_ELEMENTS} from "./constants.js"

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
 * Convert reserved HTML characters to their corresponding entities
 * @param string {string} String to convert
 */
const convertReservedChar = (string) => {
	const reserved = {
		"&": "&amp;", // Has to be done first, otherwise it'll match the '&' in replaced text
		"<": "&lt;",
		">": "&gt;",
	}
	for (const property in reserved)
		string = string.replaceAll(property, reserved[property])

	return string
}

/**
 * Parse multiline comment
 * @param src {String} String to take comment from
 * @return {{ok: (Object | null), err: (String | null), rem: String}}
 */
const parseComment = (src) => {
	let out = ""
	let index = 0

	while (true) {
		if (index === src.length) {
			return {ok: null, err: "Expected end of comment! Found EOF", rem: ""}
		}
		const next = src[index]

		index++
		col++
		if (next === "*" && src[index] === "/") {
			index++
			break
		} else if (next === "\n") {
			out += next
			col = 0
			line++
		} else {
			out += next
		}
	}

	return {ok: {type: "comment", value: out}, err: null, rem: src.slice(index, src.length)}
}

/**
 * Parse double quote string
 * Modified from original
 * @param str {string} String to parse string literal from
 * @param char {string} Opening string character to match
 * @param convert {boolean} Convert string via {@link convertReservedChar}
 * @return {{ok: (Object | number), err: (String | null), rem: String}}
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
		else if (next() === char && !escape) break
		else if (next() === "\n") {
			index++
			col = 0
			line++
			if (char === "`") out += "\n"
		}
		else {
			if (escape && next() !== char) {
				out += "\\"
				escape = false
			}
			out += next()
		}
		index++
		col++
	}
	index++
	col++

	return {
		ok: {type: "string_literal", value: convert ? convertReservedChar(out) : out},
		err: null,
		rem: str.slice(index, str.length)
	}
}

/**
 * ### Tokeniser wrapper
 *
 * Wrapper for the main tokeniser. Adds the doctype tag and not much else really
 * @param src {string} String to tokenise
 * @return {{ok: Object[], err: (Object | null)}}} (Ok: ``array of tokens, Err: Error description and position)
 */
export const tokenise = (src) => {
	let out = [{type: "doctype"}]

	const {ok, err, rem} = tokenise_inner(src, "div")
	if (err) {
		return {ok: [], err: {desc: err, ln: line, col: col}}
	}
	// check that the whole string was used
	if (rem.trim().length !== 0) {
		return {ok: [], err: {desc: "Unexpected tokens! Expected EOF", ln: line, col: col}}
	}

	// check that a ':root' or 'html' tag is the first, and make sure it has a 'lang' attribute
	if (ok[0] !== undefined) {
		if (ok[0].type !== ":root" && ok[0].type !== "html") {
			return {ok: [], err: {desc: `Expected a root element! Found '${ok[0].type}' element!`, ln: 0, col: 0}}
		}
		if (!/[^lang *= *"^""]/i.test(ok[0].attrs)) {
			ok[0].attrs += ok[0].attrs ? ` lang="en"` : `lang="en"`
		}
	}

	ok.forEach((tok) => {
		out.push(tok)
	})

	return {ok: out, err: null}
}

/**
 * ### Tokenises an input string
 *
 * This works by parsing the start of the tag, then parsing the inner section recursively, then checking for an ending tag
 *
 * The tag objects all have a type which is their HTML tag. If the type is `close`, that  represents a closing tag; if
 * the tag is `doctype` that represents the `<!DOCTYPE html>` at the start of the HTML file. All other can have an
 * `id`, `class`, and `attrs` value which are sef explanatory. Each of these are strings.
 *
 * If an error is found, the error object will contain a `ln` and `col` value for the line and column where the error was found
 * @param src {string} String to tokenise
 * @param default_tag {string} Default tag to use when no other is given
 * @param str_replace {boolean} Pass any string through the {@link convertReservedChar} function
 * @return {{ok: Object[], err: (String | null), rem: String}}} (Ok: ``array of tokens, Err: Error description, rem: remaining string to parse)
 */
const tokenise_inner = (src, default_tag, str_replace = true) => {
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
		} else {
			break
		}
	}
	if (!remaining()) {
		return {ok: [], err: null, rem: ""}
	}
	// check for string
	if ("\"'`".includes(next())) {
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
	if (!">#.{[>".includes(next())) {
		implicit = false
		type = ""
		while (remaining() && !"#. \t\n\"'`/>{[".includes(next())) {
			type += next()
			index++
			col++
		}
	} else {
		implicit = true
		type = default_tag
	}
	if (!remaining()) {
		return {ok: [{type: type, id: "", class: "", attrs: "", implicit: implicit}, {type: "close"}], err: null, rem: ""}
	}
	// check for id
	let id = "";
	if (next() === "#") {
		index++
		col++
		while (remaining() && !">{. \t\n".includes(next())) {
			id += next()
			index++
			col++
		}
	}
	if (!remaining()) {
		return {ok: [{type: type, id: id, class: "", attrs: ""}, {type: "close"}], err: null, rem: ""}
	}
	// check for classes
	let class_ = "";
	if (next() === ".") {
		while (remaining() && !">{ \t\n".includes(next())) {
			id += next()
			index++
			col++
		}
		class_ = class_.replaceAll(".", " ").slice(1, class_.length)
	}
	if (!remaining()) {
		return {ok: [{type: type, id: id, class: class_, attrs: ""}, {type: "close"}], err: null, rem: ""}
	}
	// check for attributes
	// we cheat a bit here and treat everything in the brackets as valid HTML attributes
	let attrs = "";
	if (next() === "[") {
		index++
		col++
		while (remaining() && next() !== "]") {
			switch (next()) {
				case "\t":
					attrs += " "
					break
				case "\n":
					attrs += " "
					col = 0
					line++
					index++
					continue
				default:
					attrs += next()
			}
			index++
			col++
		}
		if (!remaining() && next() !== "]") {
			return {ok: [], err: "Unclosed attribute brackets", rem: ""}
		}
		index++
		col++
		class_ = class_.replaceAll(/[ +]/g, " ")
	}

	if (VOID_ELEMENTS.includes(type)) {
		out.push({type: type, id: id, class: class_, attrs: attrs, void: true})
		return {ok: out, err: null, rem: src.slice(index, src.length)}
	}

	out.push({type: type, id: id, class: class_, attrs: attrs})

	// match the inner section
	default_tag = INLINE_ELEMENTS.includes(type) ? "span" : "div"
	str_replace = type !== "style"
	// skip spaces and tabs
	while (remaining() && " \t".includes(next())) {
		index++
		col++
	}
	if (!remaining()) {
		out.push({type: "close"})
		return {ok: out, err: null, rem: src.slice(index, src.length)}
	}
	// check if element has one inner or block inner
	if (next() === ">") {
		out.push({...out.pop(), inline: true})
		index++
		col++
		let res = tokenise_inner(src.slice(index, src.length), default_tag, str_replace)
		if (res.err) {
			return {ok: [], err: res.err, rem: ""}
		}
		src = res.rem
		index = 0
		res.ok.forEach((tok) => {
			out.push(tok)
		})
	} else if (next() === "{") {
		index++
		col++
		src = src.slice(index, src.length)
		index = 0
		while (remaining() && next() !== "}") {
			let res = tokenise_inner(src, default_tag, str_replace)
			if (res.err) {
				return {ok: [], err: res.err, rem: ""}
			}
			res.ok.forEach((tok) => {
				out.push(tok)
			})
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
				} else {
					break
				}
			}
			src = src.slice(index, src.length)
			index = 0
		}
		if (!remaining()) {
			return {ok: [], err: "Unclosed block! Expected closing '}' found EOF!", rem: ""}
		}
		index++
		col++
	}

	out.push({type: "close"})

	return {ok: out, err: null, rem: src.slice(index, src.length)}
}

/**
 * ### Token stringification
 *
 * Turns a token stream into a string
 * @param src {Object[]} Token stream from {@link tokenise}
 * @return {string}
 */
export const stringify = (src) => {
	let tag_buff = []
	return src.reduce((acc, curr) => {
		switch (curr.type) {
			case "doctype":
				return `${acc}<!DOCTYPE html>`
			case "close":
				return `${acc}</${tag_buff.pop()}>`
			case "string_literal":
				return `${acc}${curr.value}`
			case "comment":
				return `${acc}<!-- ${curr.value} -->`
			case ":root":
				tag_buff.push("html")
				let root_attr_str = `${curr.id ? ` id="${curr.id}"` : ""}${curr.class ? ` class="${curr.class}"` : ""}${curr.attrs ? ` ${curr.attrs}` : ""}`
				return `${acc}<html${root_attr_str}>`
			default:
				let attr_str = `${curr.id ? ` id="${curr.id}"` : ""}${curr.class ? ` class="${curr.class}"` : ""}${curr.attrs ? ` ${curr.attrs}` : ""}`
				if (curr.void) {
					return `${acc}<${curr.type}${attr_str}/>`
				}
				tag_buff.push(curr.type)
				return `${acc}<${curr.type}${attr_str}>`
		}
	}, "")
}

/**
 * Alias for tokenising and then stringifying input text
 * @param src {string} Input string
 * @return {{ok: (String | null), err: (Object | null )}}
 */
export const fullStringify = (src) => {
	line = 0
	col = 0
	const {ok, err} = tokenise(src)
	if (err) {
		return {ok: null, err: err}
	}
	return {ok: stringify(ok), err: null}
}
