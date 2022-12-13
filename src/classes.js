/**
 * Token handling
 */

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
			case "comment":
				return `<!--${this.additional.value}-->`
			default:
				const attrs = Object.keys(this.attributes).length === 0 ? "" : Object.entries(this.attributes)
					.reduce((acc, [k, v]) => v === true ? `${acc} ${k}` : `${acc} ${k}="${v}"`, "")
				if (this.additional["void"]) return `<${this.type}${attrs}${this.type === "!DOCTYPE" ? "" : "/"}>`
				return `<${this.type}${attrs}>${
					this.children.reduce((acc, tok) => `${acc}${tok.toString()}`, "")
				}</${this.type}>`
		}
	}

	/**
	 * Stringify a token into HTML
	 * @param ident{number} Indent depth
	 * @param ident_char{string} Indent character
	 * @return {string}
	 */
	lint_stringify(ident, ident_char) {}
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
	replace(elements) {}
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
