import {Token} from "../token.js";
import {BUILTIN_MACROS, INLINE_ELEMENTS, LITERAL_DELIMITERS, UNIQUE_ATTRS, VOID_ELEMENTS} from "../constants.js";
import chalk from "chalk";

/**
 * Main parser function. Called by {@link Parser.parse}
 * @param self {Parser} Parser instance
 * @param default_tag {string} Default tag to use when no other is given
 * @param str_replace {boolean} Pass any string through the {@link convertReservedChar} function
 * @param under_macro_def {boolean} Is the parser parsing under a macro definition
 * @return {{ok: (Array<Token|string> | null), err: (string | null)}}
 */
export const parse_inner = (self, default_tag, str_replace, under_macro_def) => {
	// move over blank characters
	self.stn()
	if (!self.remaining() || self.next() === "}") return {ok: null, err: null}
	// check for string
	if (LITERAL_DELIMITERS.includes(self.next())) {
		let res = self.parseStr(self.next(), str_replace)
		if (res.err) return {ok: null, err: res.err}
		return {ok: [res.ok], err: null}
	}
	//check for macro def
	if (self.next() === "-" && self.src[self.index + 1] === "-") {
		self.index += 2
		return self.parse_macro_def()
	}
	// check for comment
	if (self.next() === "/") {
		self.src = self.src.slice(self.index)
		let res = self.parseComment()
		if (res.err) return {ok: null, err: res.err}
		return {ok: [res.ok], err: null}
	}
	// check for import statement
	if (self.src.startsWith("@import", self.index)) return self.handleImport()
	// get tag
	let tag_res = self.parseTag(default_tag)
	if (tag_res.err) return {ok: null, err: tag_res.err}
	let {type, attrs, additional} = tag_res.ok

	// check if the tag is a macro
	let macro = undefined
	if (type[0] === ":" && !BUILTIN_MACROS.includes(type)) {
		// try to get macro
		if (type === ":") return {ok: null, err: "Macro cannot have an empty name"}
		if (!under_macro_def) {
			const {ok, err} = self.get_macro(type.slice(1))
			if (ok === null && self.isBuild) return {ok: null, err: err}
			macro = ok
			if (ok.void) {
				self.update_src()
				return self.isBuild ? {ok: ok.expand([], attrs, self).ok, err: null} : {ok: [new Token(type, attrs, additional, [])], err: null}
			}
		}
	}

	if (additional["void"]) {
		self.update_src()
		return {ok: [new Token(type, attrs, additional, [])], err: null}
	}

	// match the inner section
	let children = []
	default_tag = INLINE_ELEMENTS.includes(type) ? "span" : "div"
	str_replace = type !== "style"
	// skip spaces and tabs
	self.st()
	if (!self.remaining()){
		self.update_src()
		if (macro === undefined) return {ok: [new Token(type, attrs, additional, [])], err: null}
		return typeof macro === "object" ? macro.expand([], attrs, self) : {ok: macro([]), err: null}
	}
	// check if element has one inner or block inner
	if (self.next() === ">") {
		additional["inline"] = true
		self.index++
		self.col++
		self.update_src()
		self.macros.push({})
		let res = self.parse_inner(default_tag, str_replace, under_macro_def)
		self.macros.pop()
		if (res.err) return {ok: null, err: res.err}
		if (res.ok !== null) children = [...children, ...res.ok]
	} else if (self.next() === "{") {
		self.macros.push({})
		self.index++
		self.col++
		self.update_src()
		while (self.remaining() && self.next() !== "}") {
			let res = self.parse_inner(default_tag, str_replace, under_macro_def)
			if (res.err) return {ok: null, err: res.err, rem: ""}
			if (res.ok !== null) children = [...children, ...res.ok]
			self.stn()
		}
		if (!self.remaining()) return {ok: null, err: "Unclosed block! Expected closing '}' found EOF!"}
		self.macros.pop()
		self.index++
		self.col++
	}
	self.update_src()

	if (macro !== undefined && self.isBuild) {
		if (typeof macro === "object") return macro.expand(children, attrs, self)
		return {ok: macro(children), err: null}
	}

	return {ok: [new Token(type, attrs, additional, children)], err: null}
}

/**
 * Converts reserved HTML characters into their respective HTML codes
 * @param self {Parser} Parser instance
 * @param input {string} Input string to convert
 * @return {string} Converted string
 */
export const convertReservedChar = (self, input) => {
	const reserved = {
		"<": "&lt;",
		">": "&gt;",
	}
	for (const property in reserved) input = input.replaceAll(property, reserved[property])
	return input
}

/**
 * Parse a comment
 * @param self {Parser} Parser instance
 * @return {{ok: (Token | null), err: (string | null)}}
 */
export const parseComment = (self) => {
	let out = ""
	const multiline = self.src[1] === "*"

	if (!(multiline || self.src[1] === "/")) return {ok: null, err: "Expected '*' or '/' after /"}
	self.index = 2

	while (true) {
		if (!self.remaining()) {
			if (!multiline) break
			return {ok: null, err: "Expected end of comment! Found EOF"}
		}
		const next = self.next()

		self.index++
		self.col++
		if (multiline && next === "*" && self.next() === "/") {
			self.index++
			break
		} else if (next === "\n") {
			if (!multiline) break
			out += next
			self.col = 0
			self.ln++
		} else out += next
	}
	self.update_src()

	return {ok: new Token("c t", {}, {value: out}, []), err: null}
}

/**
 * Parse a string until required closing delimiters are found
 * @param self {Parser} Parser instance
 * @param delim {string} String delimiter
 * @param convert {boolean} Pass the output through {@link Parser.convertReservedChar}
 * @return {{ok: (string | null), err: (null | string)}}
 */
export const parseStr = (self, delim, convert) => {
	self.index++
	self.col++
	let out = ""

	let escape = false

	while (self.remaining()) {
		if (self.next() === "\\" && !escape) escape = true
		else if (delim.includes(self.next()) && !escape) {
			if (self.next() === "]") self.index--
			break
		} else if (self.next() === "\n") {
			self.col = 0
			self.ln++
			if (delim === "`") out += "\n"
		} else {
			escape = false
			out += self.next()
		}
		self.index++
		self.col++
	}
	if (!self.remaining()) return {ok: null, err: "Unclosed string"}
	self.index++
	self.col++
	self.update_src()

	return {
		ok: convert ? self.convertReservedChar(out) : out,
		err: null,
	}
}

/**
 * Parse attributes from inside square brackets. Called after finding an opening square bracket
 * @param self {Parser} Parser instance
 * @param unique_replace {number} Allow unique attribute replacements (0 -> no message, 1 -> warning, 2 -> error)
 * @param unique_position {boolean} `false` if keep first occurrence of a uniquer attribute, `true` for keep the last occurrence
 * @param initial {Object} Initial attributes
 * @return {{ok: (Object | null), err: (null | string)}}
 */
export const parseAttrs = (self, unique_replace, unique_position, initial) => {
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
						console.log(chalk.yellow(`Duplicate unique value found (${attrsObj[key]} and ${value}) ${self.file} ${self.line}:${self.col}`));
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

	while (self.remaining() && self.next() !== "]") {
		// skip stn
		self.stn()
		// parse key
		let key = ""
		while (self.remaining()) {
			if (" \t\n='\"`]".includes(self.next())) break
			key += self.next()
			self.index++
			self.col++
		}
		if (self.next() === "]") {
			if (key) {
				const res = insertValue(key, true)
				if (res) return res
			}
			self.index++
			self.col++
			self.update_src()
			return {ok: attrsObj, err: null}
		}
		if (!key) return {ok: null, err: "Empty attribute key!"}
		if (self.next() === "=") {
			// parse attribute value
			if (LITERAL_DELIMITERS.includes(self.src[self.index + 1])) self.index++
			const delim = LITERAL_DELIMITERS.includes(self.next()) ? self.next() : " \t\n]"
			self.update_src()
			const res = self.parseStr(delim, false)
			if (res.err) return {ok: null, err: res.err, rem: ""}
			self.index--
			res.ok.replaceAll("\"", "&quot;").split(/ +/g).forEach((v) => {
				const res = insertValue(key, v)
				if (res) return res
			})
		} else {
			const res = insertValue(key, true)
			if (res) return res
		}
		self.index++
	}

	if (!self.remaining()) return {ok: null, err: "Unclosed attribute brackets", rem: ""}
	self.index++
	self.col++
	self.update_src()

	return {ok: attrsObj, err: null}
}

/**
 * Parse a tag name, classes, and id; then return the type, attributes, and additional objects
 * @param self {Parser} Parser instance
 * @param default_tag {string} default tag if the tag is implicit
 * @return {{ok: ({type: string, attrs: Object, additional: Object} | null), err: (null | string)}}
 */
export const parseTag = (self, default_tag) => {
	let type;
	let implicit;
	if (!">#.{[>}".includes(self.next())) {
		implicit = false
		type = ""
		while (self.remaining() && !"#. \t\n\"'`/>{[}".includes(self.next())) {
			type += self.next()
			self.index++
			self.col++
		}
	} else {
		implicit = true
		type = default_tag
	}
	const isVoid = VOID_ELEMENTS.includes(type)
	if (!self.remaining()) {
		return {ok: {type: type, attrs: {}, additional: {void: isVoid, implicit: implicit}}, err: null}
	}
	let attrs = {}
	// check for id
	if (self.next() === "#") {
		let id = ""
		self.index++
		self.col++
		while (self.remaining() && !">{.[ \t\n".includes(self.next())) {
			id += self.next()
			self.index++
			self.col++
		}
		attrs["id"] = id
	}
	if (!self.remaining()) {
		return {ok: {type: type, attrs: attrs, additional: {void: isVoid, implicit: implicit}}, err: null}
	}
	// check for classes
	if (self.next() === ".") {
		let class_ = ""
		while (self.remaining() && !">{[ \t\n".includes(self.next())) {
			class_ += self.next()
			self.index++
			self.col++
		}
		attrs["class"] = class_.replaceAll(".", " ").slice(1)
	}
	if (!self.remaining()) return {
		ok: {type: type, attrs: attrs, additional: {void: isVoid, implicit: implicit}},
		err: null
	}

	// check for attributes
	if (self.next() === "[") {
		self.index++
		self.update_src()
		const attr_res = self.parseAttrs(1, true, attrs)
		if (attr_res.err) return {ok: null, err: attr_res.err}
		attrs = attr_res.ok
		self.index = 0
	}
	return {ok: {type: type, attrs: attrs, additional: {void: isVoid, implicit: implicit}}, err: null}
}
