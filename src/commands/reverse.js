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
	fs.writeFileSync(out_file, tokens.map((t) => typeof t === "object" ? t.lint(0, false, CONFIG_DEFAULTS) : t).join(""))
	// const doctype_index = tokens.indexOf("<!DOCTYPE html>")
	// if (doctype_index !== -1 && typeof tokens[doctype_index + 1] === "object" && tokens[doctype_index + 1].tag === "html") {
	// 	// check for altered lang attribute
	// 	const lang = tokens[doctype_index + 1].attrs["lang"]
	// 	if (lang === "en") delete tokens[doctype_index + 1].attrs["lang"]
	// }
}
