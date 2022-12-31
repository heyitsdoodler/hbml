/**
 * Any and all things relating to use with the `@import` keyword
 */

import npath from "path"
import fs from "fs"
import {Token, Macro, DEFAULT_MACROS} from "../token.js"
import {BUILTIN_MACROS} from "../constants.js"

/**
 * Parse and handle any `@import` statements
 * @param self {Parser} Parser instance
 */
export const handleImport = (self) => {
	self.index += 7
	self.st()
	let path = ""
	while (self.remaining()) {
		if (" \t\n".includes(self.next())) break
		path += self.next()
		self.index++
		self.col++
	}
	let prefix = ""
	if (self.remaining() && self.next() !== "\n") {
		self.st()
		while (self.remaining()) {
			if (".#[{>]}'\"` \t\n".includes(self.next())) break
			prefix += self.next()
			self.index++
			self.col++
		}
		prefix += ":"
	}
	let src
	// find the file
	if (path.startsWith("http")) {
		let req = new XMLHttpRequest()
		req.open("GET", path, false)
		req.send(null)
		if (req.status !== 200) return {ok: null, err: `Unable to access ${path} (response ${req.status} '${req.responseText}')`}
		src = req.responseText
	} else {
		path = npath.join(npath.isAbsolute(path) ? "" : process.cwd(), path)
		switch (npath.extname(path)) {
			case "": path += ".hbml"; break
			case ".hbml": break
			default:
				return {
					ok: null,
					err: `Cannot import non-HBML file ${path}!` +
					fs.existsSync(path) ? "" : "File also doesn't exist!"
				}
		}
		if (!fs.existsSync(path)) return {ok: null, err: `Imported file ${path} does not exist`}
		src = fs.readFileSync(path).toString()
	}
	const {ok, err} = self.new(src, path, true).import_parse(prefix)
	if (err !== null) return {ok: null, err: `Error importing file ${path} (${err.toString()})`}
	self.update_src()
	for (const imported_macro in ok) {
		if (self.macros[self.macros.length - 1][imported_macro] !== undefined){
			return {ok: null, err: "Cannot redefine macros through imports. Try using a namespace instead"}
		}
		self.macros[self.macros.length - 1][imported_macro] = ok[imported_macro]
	}
	return {ok: null, err: null}
}

/**
 * Parser function that returns namespaced macros to be imported
 * @param self {Parser} Parser instance
 * @param prefix {string} Namespace prefix
 * @return {{ok: (Object | null), err: (Error | null)}}
 */
export const import_parse = (self, prefix) => {
	const {_, err} = self.parse()
	if (err !== null) return {ok: null, err: err}
	let out = Object.assign({}, self.macros[0])
	// delete the returned default macros
	// might need to rework this to check if the defaults were re-defined
	Object.keys(DEFAULT_MACROS).forEach((k) => delete out[k])
	if (prefix === "") return {ok: out, err: null}
	// traverse all macros and add namespaces to them
	const updateMacroCall = (t) => {
		if (typeof t === "string") return t
		if (t.type[0] === ":" && !BUILTIN_MACROS.includes(t.type)) t.type = `:${prefix}${t.type.slice(1)}`
		return new Token(t.type, t.attributes, t.additional, t.children.map((c) => updateMacroCall(c)))
	}
	let prefixed_out = {}
	for (const outKey in out) {
		prefixed_out[`${prefix}${outKey}`] = new Macro(out[outKey].rep.map((t) => updateMacroCall(t)), out[outKey].void)
	}
	return {ok: prefixed_out, err: null}
}
