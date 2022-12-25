import {UNIQUE_ATTRS} from "./constants.js";

/**
 * Macro class
 *
 * Representation of macros as per their definition
 */
export class Macro {
	/**
	 * @param rep {(Token|string)[]} Replacement object array
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
	 * @param elements {(Token | string)[]}
	 * @param attrs {Object} Attributes on the macro call (ID and classes)
	 * @param parser {Parser} Parser class instance calling macro expansion
	 * @return {{ok: (Token | string)[] | null, err: (string | null)}}
	 */
	replace(elements, attrs, parser) {
		elements.reverse()
		let rep = []
		for (let i = 0; i < this.rep.length; i++) {
			if (typeof this.rep[i] === "string") rep.push(this.rep[i])
			else {
				const res = this.rep[i].expand_current(parser)
				if (res.err) return {ok: null, err: res.err}
				else rep = [...rep, ...res.ok]
			}
		}
		rep = rep.reduce((acc, child) => {
			if (typeof child === "string") return [...acc, child]
			const res = child.replace(elements)
			elements = res.rem
			return [...acc, ...res.expand]
		}, [])
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
}
