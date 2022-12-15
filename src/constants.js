/**
 * Constants used by the parser
 */

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
