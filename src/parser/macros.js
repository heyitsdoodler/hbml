import {Macro} from "../macro.js"
import {Token} from "../token.js"

/**
 * Get macro by name. Name does not include `:` before the macro call
 * @param self {Parser} Parser instance
 * @param name {string} Macro name (*without* colon prefix)
 * @return {{ok: ((Macro | function) | null), err: (null | string)}}
 */
export const get_macro = (self, name) => {
	let macro = undefined
	let index_to_check = self.macros.length
	while (index_to_check > 0) {
		index_to_check--
		const possible = self.macros[index_to_check][name]
		if (possible) {
			macro = possible
			break
		}
	}
	if (macro === undefined) return {ok: null, err: `Unknown macro :${name}`}
	return {ok: macro, err: null}
}

/**
 * Parse a macro definition
 * @param self {Parser} Parser instance
 * @return {{ok: (Token[] | null), err: (null | string)}}
 */
export const parse_macro_def = (self) => {
	let {ok: ok, err} = self.parse_inner("div", false, true)
	if (err) return {ok: null, err: err}
	// get required macro info
	const count_res = ok[0].count_child()
	let m_ok = count_res.tok
	const previous = self.get_macro(m_ok.type)
	if (previous.ok && previous.ok.void !== count_res.isVoid) return {ok: null, err: "Macro redefinitions must preserve voidness"}
	self.macros[self.macros.length - 1][m_ok.type] = new Macro(m_ok.children, count_res.isVoid)
	self.update_src()
	return self.isBuild ? {ok: null, err: null} : {ok: [new Token(`--${ok[0].type}`, ok[0].attributes, {...ok[0].additional, void: m_ok.children.length === 0}, m_ok.children)], err: null}
}
