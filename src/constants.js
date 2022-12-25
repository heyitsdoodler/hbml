/**
 * Constants used by the parser
 */

import {Macro} from "./macro.js"
import {Token} from "./token.js"

/**
 * Characters that delimit text
 */
export const LITERAL_DELIMITERS = "\"'`"

/**
 * Elements that are not allowed to have contents
 */
export const VOID_ELEMENTS = [
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
	"!DOCTYPE",
	":child", ":children"
]

/**
 * Elements that cause their children to become spans instead of divs when no element is specified
 */
export const INLINE_ELEMENTS = [
	"abbr",
	"acronym",
	"audio",
	"b",
	"bdi",
	"bdo",
	"big",
	"br",
	"button",
	"canvas",
	"cite",
	"code",
	"data",
	"datalist",
	"del",
	"dfn",
	"em",
	"embed",
	"i",
	"iframe",
	"img",
	"input",
	"ins",
	"kbd",
	"label",
	"map",
	"mark",
	"meter",
	"noscript",
	"object",
	"output",
	"picture",
	"progress",
	"q",
	"ruby",
	"s",
	"samp",
	"script",
	"select",
	"slot",
	"small",
	"span",
	"strong",
	"sub",
	"sup",
	"svg",
	"template",
	"textarea",
	"time",
	"u",
	"tt",
	"var",
	"video",
	"wbr"
]

/**
 * Attributes that can only hav e one value or appear once
 */
export const UNIQUE_ATTRS = [
	"lang",
	"id"
]

/**
 * Built-in macro names that aren't defined as standard macros
 * @type {string[]}
 */
export const BUILTIN_MACROS = [
	":child", ":children", ":consume", ":consume-all"
]

/**
 * Default allow values
 * @type {{parse: boolean, not_found: boolean, write: boolean}}
 */
export const DEFAULT_ALLOW = {write: false, not_found: false, parse: false}

export const DEFAULT_MACROS = {
	"root": new Macro([
		new Token("!DOCTYPE", {html: true}, {}, []),
		new Token("html", {lang: "en"}, {"child count": 0, "children": true}, [new Token(":children", {}, {}, [])])
	], false),
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
