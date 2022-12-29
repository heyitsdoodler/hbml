import {Token} from "./token.js";
import {CONFIG_DEFAULTS} from "./constants.js";

const convert = (e) => {
	if (e.nodeName === "#text") return e.data
	if (e.nodeName === "#comment") return new Token("c t", {}, {value: e.nodeValue}, [])
	let children = []
	e.childNodes.forEach((child) => children.push(convert(child)))
	let attrs = {}
	for (let i = 0; i < e.attributes.length; i++) {
		let value = e.attributes.item(i).nodeValue
		attrs[e.attributes.item(i).nodeName] = value === "" ? true : value
	}
	return new Token(e.localName, attrs, {}, children)
}
const lint_opts = {...CONFIG_DEFAULTS, 'lint.config.element_preference': "arrow", 'lint.config.remove_empty': true}

export const snippet = (src) => {
	let children = []
	new DOMParser().parseFromString(src, "text/html")
		.body.childNodes.forEach((c) => children.push(convert(c)))
	return children.map((t) => typeof t === "object" ? t.lint(0, false, lint_opts) : t).join("")
}

export const full = (src) => {
	let children = []
	const res = new DOMParser().parseFromString(src, "text/html")
	const html = res.head.parentElement
	html.childNodes.forEach((c) => children.push(convert(c)))
	return new Token(":root", html.lang !== "en" ? {lang: html.lang} : {}, {}, children).lint(0, false, lint_opts)
}
