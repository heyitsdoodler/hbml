import {UNIQUE_ATTRS, BUILTIN_MACROS} from "./constants.js";

/**
 * Token class
 *
 * Contains
 */
export class Token {
	/** Token type (tag)
	 * @type {string} */
	type
	/** Token attributes object. Includes ID and classes
	 * @type {Object} */
	attributes
	/** Additional token information such as voidness
	 * @type {Object} */
	additional
	/** token child tokens
	 * @type {(Token|string)[]} */
	children
	/**
	 * Token class
	 *
	 * Holds the type, attributes, and children of a given token
	 * @param type {string}
	 * @param attributes {Object}
	 * @param additional {Object}
	 * @param children {(Token|string)[]}
	 */
	constructor(type, attributes, additional = {}, children) {
		this.type = type
		this.attributes = attributes
		this.additional = additional
		this.children = children
	}

	/**
	 * Stringify the token and child elements into HTML
	 * @return {string}
	 */
	toString() {
		switch (this.type) {
			case "c t":
				return `<!--${this.additional.value}-->`
			case "!DOCTYPE":
				return '<!DOCTYPE html>'
			default:
				const attrs = Object.keys(this.attributes).length === 0 ? "" : " " + Object.entries(this.attributes)
					.reduce((acc, [k, v]) => v === true ? `${acc} ${k}` : `${acc} ${k}="${v}"`, "").slice(1)
				if (this.additional["void"]) return `<${this.type}${attrs}${this.type === "!DOCTYPE" ? "" : "/"}>`
				return `<${this.type}${attrs}>${
					this.children.reduce((acc, tok) => `${acc}${tok.toString()}`, "")
				}</${this.type}>`
		}
	}

	/**
	 * Lint an element. kill me
	 * @param ident{number} Indent depth
	 * @param inline{boolean} true if the element is on the same line as its parent, false otherwise
	 * @param opts{Object} Lint options
	 * @return {string}
	 */
	lint(ident, inline, opts) {
		// additional modifying options
		switch (opts['lint.config.element_preference']) {
			case "arrow":
				if (this.children.length === 1) this.additional["inline"] = true
				break
			case "bracket":
				this.additional["inline"] = false
				break
		}
		if (opts['lint.config.remove_empty']) {
			if (this.children.length === 0) this.additional["void"] = true
		}

		// indentation prefix before the line
		let ident_str = opts['lint.config.indent.character'].repeat(inline ? 0 : ident * opts['lint.config.indent.count'])
		// comments are handled like strings but are caught here
		if (this.type === "c t") return `${ident_str}/* ${this.additional["value"].trim()} */\n`
		// get tag in accordance with config values
		const reduces_attrs = Object.entries(this.attributes).filter(([k, _]) => k !== "id" && k !== "class")
		const modified_attrs = Object.keys(reduces_attrs).length > 0 ? reduces_attrs.reduce((acc, [k, v]) => v === true ? `${acc} ${k}` : `${acc} ${k}="${v.replaceAll('"', '\\"')}"`, "").slice(1) : ""
		const full_tag_str = `${
			(this.additional["implicit"] && !opts['lint.config.replace_implicit']) ? "" : this.type}${
			this.attributes["id"] ? `#${this.attributes["id"]}` : ""}${
			this.attributes["class"] ? `.${this.attributes["class"].replaceAll(" ", ".")}` : ""}${
			modified_attrs ? `[${modified_attrs}]` : ""}`
		// if it's a void tag just return the tag
		if (this.additional["void"]) return `${ident_str}${full_tag_str}\n`
		// otherwise set up the return variable
		let out = `${ident_str}${full_tag_str}${" ".repeat(full_tag_str ? opts['lint.config.pre_tag_space'] : 0)}` +
			`${this.additional["inline"] ? `>${" ".repeat(opts['lint.config.inline_same_line'] ? opts['lint.config.post_tag_space'] : 0)}` : "{"}`
		if (this.additional["inline"] && opts['lint.config.inline_same_line']) {
			// inline elements have one child so we just append to the output string
			const child = this.children.pop()
			out += typeof child === "string" ? `"${child}"` : child.lint(ident, true, opts)
		} else {
			if (this.children.length !== 0) out += "\n"
			// reset the indent string. if the element is inline, the original will be an empty string so we update it to be properly indented
			ident_str = opts['lint.config.indent.character'].repeat(ident * opts['lint.config.indent.count'])
			out += this.children.reduce((acc, child) => {
				return acc + (typeof child === "string" ? `${ident_str}${opts['lint.config.indent.character']}"${child}"\n` : child.lint(ident + 1, false, opts))
			}, "")
			if (!this.additional["inline"]) out += `${this.children.length !== 0 ? ident_str : " ".repeat(opts['lint.config.post_tag_space'])}}`
		}
		return out + (inline ? "" : "\n")
	}

	/**
	 * Recursively counts the number of `:child` child elements under an element. Used for macros
	 */
	count_child() {
		let child_count = 0
		let isVoid = true
		let children = false
		this.children = this.children.map((child) => {
			if (typeof child !== "string") {
				if (child.type === ":child" || child.type === ":unwrap-child") {
					child_count++
					isVoid = false
				} else if (child.type === ":children") {
					this.additional["children"] = true
					isVoid = false
				} else {
					const res = child.count_child()
					child = res.tok
					if (!children) children = child.additional["children"]
					if (isVoid) isVoid = res.isVoid
					if (![":consume", ":consume-all"].includes(child.type)) child_count += child.additional["child count"]
				}
			}
			return child
		})
		this.additional["child count"] = child_count
		this.additional["children"] = children
		return {tok: this, isVoid: isVoid}
	}

	/**
	 * Replace built-in macros (`:child` etc.) with the correct elements
	 * @param elements {(Token | string)[]}
	 * @return {(Token | string)[]}
	 */
	replace(elements) {
		switch (this.type) {
			case ":child":
				const child = elements.pop()
				return [child ? child : ""]
			case ":unwrap-child":
				return elements.at(-1)?.children ? elements.pop().children : [""]
			case ":children":
				const j = elements.length
				let out = []
				for (let i = 0; i < j; i++) out.push(elements.pop())
				return out
			case ":consume":
				if (elements.length >= this.additional["child count"]) {
					return this.children.reduce((acc, tok) => {
						if (typeof tok === "string") return {expand: [...acc.expand, tok], rem: acc.rem}
						const res = tok.replace(elements)
						return [...acc, ...res]
					}, [])
				} else return []
			case ":consume-all":
				if (elements.length >= this.additional["child count"]) {
					let holdover = []
					while (elements.length >= this.additional["child count"]) {
						holdover = this.children.reduce((acc, tok) => {
							if (typeof tok === "string") return [...acc, tok]
							const res = tok.replace(elements)
							return [...acc, ...res]
						}, holdover)
					}
					return holdover
				} else return []
			default:
				const inner = this.children.reduce((acc, tok) => {
					if (typeof tok === "string") return [...acc, tok]
					const res = tok.replace(elements)
					return [...acc, ...res]
				}, [])
				return [new Token(this.type, this.attributes, this.additional, inner)]
		}
	}

	/**
	 * Expands a macro with error handling
	 * @param p {Parser} Parser instance
	 * @return {{ok: (Token|string)[]|null, err: null|string}} Cloned token
	 */
	expand(p) {
		// Get replaced children
		let new_children = []
		for (let i = 0; i < this.children.length; i++) {
			if (typeof this.children[i] === "string") new_children.push(this.children[i])
			else {
				const res = this.children[i].expand(p)
				if (res.err) return {ok: null, err: res.err}
				new_children = [...new_children, ...res.ok]
			}
		}
		// Return a cloned token or expanded macro
		if (this.type[0] === ":" && !BUILTIN_MACROS.includes(this.type)) {
			const {ok, err} = p.get_macro(this.type.slice(1))
			if (err) return {ok: null, err: err}
			if (typeof ok === "function") return {ok: ok(new_children), err: null}
			if (ok.void) {
				const res = ok.get_rep(p)
				if (res.err) return {ok: null, err: err}
				return {ok: [...res.ok, ...new_children], err: null}
			} else return ok.expand(new_children, this.attributes, p)
		} else return {
			ok: [new Token(
				this.type,
				Object.assign({}, this.attributes),
				Object.assign({}, this.additional),
				new_children
			)],
			err: null
		}
	}
}

/**
 * Macro class
 *
 * Representation of macros as per their definition
 */
export class Macro {
	/**
	 * @param rep {(Token|string)[]} Replacement object array
	 * @param isVoid {boolean} Does the macro accept child elements
	 * @param name {string} Macro name
	 * @param def {{file: string, line: number, col: number}}
	 * @return {Macro}
	 */
	constructor(rep, isVoid, name, def) {
		this.rep = rep
		this.void = isVoid
		this.name = name
		this.def = def
		return this
	}

	/**
	 * Replace elements with a macro expansion. Requires the macro inputs to be nested objects not a token stream
	 * @param elements {(Token | string)[]}
	 * @param attrs {Object} Attributes on the macro call (ID and classes)
	 * @param parser {Parser} Parser class instance calling macro expansion
	 * @return {{ok: (Token | string)[] | null, err: (string | null)}}
	 */
	expand(elements, attrs, parser) {
		// Reverse elements so `.pop()` return the next element, not next last
		elements.reverse()
		// Replace all the built-in macros (`:child` etc.) with the correct element(s)
		let child_replaced = []
		for (let i = 0; i < this.rep.length; i++) {
			if (typeof this.rep[i] === "string") child_replaced.push(this.rep[i])
			else child_replaced = [...child_replaced, ...this.rep[i].replace(elements)]
		}
		// Expand the macros or clone tokens for the macr definition
		let rep = []
		for (let i = 0; i < child_replaced.length; i++) {
			if (typeof child_replaced[i] === "string") rep.push(child_replaced[i])
			else {
				const res = child_replaced[i].expand(parser)
				if (res.err) return {ok: null, err: `${res.err}\n\tunder macro call :${this.name}(${this.def.file} ${this.def.line}:${this.def.col})`}
				else rep = [...rep, ...res.ok]
			}
		}
		// Apply attributes to the root element(s) of the expanded macro
		if (rep.length === 0) delete attrs["id"]
		if (rep.length === 1) {
			if (typeof rep[0] !== "string" && attrs["id"] !== undefined) {
				rep[0].attributes["id"] = attrs["id"]
			}
			delete attrs["id"]
		}
		if (attrs["id"] !== undefined) return {ok: null, err: "ID cannot be applied to a macro with multiple root elements"}
		rep.map((t) => {
			if (typeof t === "string") return t
			for (const attr in attrs) {
				if (UNIQUE_ATTRS.includes(attr)) t.attributes[attr] = attrs[attr]
				else {
					// check if attr already exists
					if (t.attributes[attr] !== undefined) {
						if (typeof t.attributes[attr] === "string") t.attributes[attr] += " " + attrs[attr]
						else t.attributes[attr] = attrs[attr]
					} else {
						t.attributes[attr] = attrs[attr]
					}
				}
			}
			return t
		})
		return {ok: rep, err: null}
	}

	/**
	 * Gets a clone of a macro replacement where the replacement is expanded properly
	 * @param p {Parser} Parser instance
	 * @return {{err: null, ok: *[]}}
	 */
	get_rep = (p) => {
		let rep = []
		this.rep.map((t) => {
			if (typeof t === "string") rep.push(t)
			else {
				const {ok, err} = t.expand(p)
				if (err) return {ok: null, err: err}
			rep = [...rep, ...ok]
			}
		})
		return {ok: rep, err: null}
	}
}

/**
 * Default macros. These also show the two types of macro. Firstly, the `:root` macro is a class macro meaning it could
 * be defined by the user. These are the standard macros. The `:unwrap` macro is a function macro and can only be
 * defined internally. These macros are just functions that take one argument, macro call child elements of type
 * `Array<Token|string>`, and return the same type. The child elements passed are already expanded. Function macros
 * cannot return errors.
 * @type {{root: Macro, unwrap: (function(Array<Token|string>): Array<Token|string>)}}
 */
export const DEFAULT_MACROS = {
	"root": new Macro([
		new Token("!DOCTYPE", {html: true}, {}, []),
		new Token("html", {lang: "en"}, {"child count": 0, "children": true}, [new Token(":children", {}, {}, [])])
	], false, "root", {file: "Built-in", col: 0, line: 0}),
	"unwrap": (c) => {
		let out = []
		c.forEach((t) => {
			if (typeof t === "string") out.push(t)
			else {
				if (t.type === "c t") out.push(t)
				else out = [...out, ...t.children]
			}
		})
		return out
	}
}
