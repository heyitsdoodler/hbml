/**
 * All the classes. Contains {@link Parser}, {@link Token}, {@link Macro}, and {@link Error}
 */
import "./parser.js"

export class Parser {
	constructor(src, path) {
		this.src = src
		this.path = path
		this.ln = 1
		this.col = 1
		this.index = 0
	}
	next = function() {
		return this.src[this.index]
	}
	remaining() {
		return this.index < this.src.length
	}
	/**
	 * Skip space tab newline
	 */
	stn() {
		while (this.remaining()) {
			if (this.next() === " " || this.next() === "\t") {
				this.col++
				this.index++
			} else if (this.next() === "\n") {
				this.col = 1
				this.index++
				this.ln++
			} else {
				this.update_src()
				break
			}
		}
		if (!this.remaining()) this.update_src()
	}
	/**
	 * Skip space tab
	 */
	st() {
		while (this.remaining()) {
			if (this.next() === " " || this.next() === "\t") {
				this.col++
				this.index++
			} else {
				this.update_src()
				break
			}
		}
		if (!this.remaining()) this.update_src()
	}
	/**
	 * Slices `this.src` to  and resets `this.index`
	 */
	update_src = () => {
		this.src = this.src.slice(this.index)
		this.index = 0
	}
}

export class Token {
	/**
	 * Token class
	 *
	 * Holds the type, attributes, and children of a given token
	 * @param type{string}
	 * @param attributes{Object}
	 * @param additional{Object}
	 * @param children{(Token|string)[]}
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
			case "string_literal":
				return this.additional.value
			case "c t":
				return `<!--${this.additional.value}-->`
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
		// indentation prefix before the line
		let ident_str = opts['lint.config.indent.character'].repeat(inline ? 0 : ident * opts['lint.config.indent.count'])
		// comments are handled like strings but are caught here
		if (this.type === "comment") return `${ident_str}/* ${this.additional["value"].trim()} */\n`
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
}

export class Macro {
	/**
	 * @param rep {Object[]} Replacement object array
	 * @param isVoid {boolean} Does the macro accept child elements
	 * @return {Macro}
	 */
	constructor(rep, isVoid) {
		this.rep = rep
		this.void = isVoid
		return this
	}

	/**
	 * Replace elements with a macro expansion. Requires the macro inputs to be nested objects not a token stream
	 * @param elements {Token[]}
	 * @return {Token[]}
	 */
	replace(elements) {

	}
}

export class Error {
	constructor(desc, file, ln, col) {
		this.desc = desc
		this.file = file
		this.ln = ln
		this.col = col
	}
	toString() {
		`${this.desc} ${this.file} ${this.ln}:${this.col}`
	}
}
