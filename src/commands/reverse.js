import {parser} from 'posthtml-parser'
import {Token} from "../classes.js";
import fs from "fs";
import {VOID_ELEMENTS} from "../constants.js";
import {CONFIG_DEFAULTS} from "../config_parse.js";

/**
 * HTML to HBML converter. Takes a path to the file and parses the HTML then converts it to HBML. Write the output to
 * a specified output path
 * @param file_name {string} Path to the HTML file to convert to HBML
 * @param out_file {string} Path to the output HBML file
 * @return {{err: (null|string), ok: (null|(Token|string)[])}}
 */
export const T2B = (file_name, out_file) => {
	if (!fs.existsSync(file_name)) return {ok: null, err: `${file_name} does not exist`}
	const src = fs.readFileSync(file_name).toString()
	if (src.trim() === "") return {ok: null, err: null}
	let tokens = parser(src)
	if (tokens.length === 0) return {ok: null, err: `Unable to parse ${file_name}`}
	const convert = (t) => {
		if (typeof t === "string") {
			if (/<!--(.+)-->/.test(t)) return new Token("c t", {}, {value: /<!--(.+)-->/.exec(t)[1]}, [])
			return t
		}
		return new Token(
			t.tag, t.attrs ? t.attrs : {}, {void: VOID_ELEMENTS.includes(t.tag)},
			t.content ? t.content.filter((t) => typeof t === "string" ? t.trim() !== "" : true).map((c) => convert(c)) : []
		)
	}
	tokens = tokens.filter((t) => typeof t === "string" ? t.trim() !== "" : true).map((t) => convert(t))
	const doctype_index = tokens.findIndex((t) => typeof t === "string" && /<!doctype html>/i.test(t))
	if (doctype_index >= 0) {
		let n = 1
		let found = false
		while (doctype_index + n < tokens.length) {
			if (typeof tokens[doctype_index + n] === "object") {
				if (tokens[doctype_index + n].type === "html") {
					found = true
					break
				} else if (tokens[doctype_index + n].type === "c t") n++
				else break
			} else break
		}
		if (found) {
			let new_attrs = Object.assign({}, tokens[doctype_index + n].attributes)
			if (new_attrs["lang"] === "en") delete new_attrs["lang"]
			const clone = (t) => {
				if (typeof t === "string") return t
				return new Token(
					t.type, Object.assign({}, t.attributes), Object.assign({}, t.additional),
					t.children.map((t) => clone(t))
				)
			}
			tokens = [
				...tokens.slice(0, doctype_index), ...tokens.slice(doctype_index + 1, doctype_index + n),
				new Token(
					":root", new_attrs, Object.assign({}, tokens[doctype_index + n].additional),
					tokens[doctype_index + n].children.map((t) => clone(t))
				), ...tokens.slice(doctype_index + n + 1)
			]
		}
	}
	fs.writeFileSync(out_file, tokens.map((t) => typeof t === "object" ? t.lint(0, false, CONFIG_DEFAULTS) : t).join(""))
	// const doctype_index = tokens.indexOf("<!DOCTYPE html>")
	// if (doctype_index !== -1 && typeof tokens[doctype_index + 1] === "object" && tokens[doctype_index + 1].tag === "html") {
	// 	// check for altered lang attribute
	// 	const lang = tokens[doctype_index + 1].attrs["lang"]
	// 	if (lang === "en") delete tokens[doctype_index + 1].attrs["lang"]
	// }
}
