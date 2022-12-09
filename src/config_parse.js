import Ajv from "ajv/dist/jtd.js";
import fs from "fs";
import path from "path"

/**
 * HBML.json config file schema
 * @type {Object}
 */
const schema = {
	"optionalProperties": {
		"lint": {
			"optionalProperties": {
				"src": {"elements": {"type": "string"}},
				"output": {"type": "string"},
				"config": {
					"optionalProperties": {
						"indent": {
							"properties": {
								"character": {"enum": [" ", "\t"]}
							},
							"optionalProperties": {
								"count": {"type": "uint8"}
							}
						},
						"pre_tag_space": {"type": "uint8"},
						"post_tag_space": {"type": "uint8"},
						"inline_same_line": {"type": "boolean"},
						"void_inline": {"type": "boolean"}
					}
				}
			}
		},
		"build": {
			"optionalProperties": {
				"src": {"elements": {"type": "string"}},
				"output": {"type": "string"},
				"allow": {
					"optionalProperties": {
						"not_found": {"type": "boolean"},
						"write": {"type": "boolean"},
						"parse": {"type": "boolean"}
					}
				}
			}
		}
	}
}

/**
 * Flattens an object to make sure it's all single depth.
 * For example `flatten({a: 1, b: {c: 2, d: 3}}) === {'a': 1, 'b.c': 2, 'b.d': 3}`
 * @param a{Object} Object to flatten
 * @return {Object} Flattened object
 */
const flatten = (a) => Object.entries(a).reduce((q, [k, v]) => ({
	...q,
	...(v && typeof v === 'object' && !Array.isArray(v) ? Object.entries(flatten(v)).reduce((p, [j, i]) => ({...p, [k + '.' + j]: i}), {}) : {[k]: v})
}), {});

/**
 * Default config values
 * @type {Object}
 */
const defs = {
	'lint.src': [ '/' ],
	'lint.output': '/',
	'lint.config.indent.character': '\t',
	'lint.config.indent.count': 1,
	'lint.config.pre_tag_space': 1,
	'lint.config.post_tag_space': 1,
	'lint.config.inline_same_line': true,
	'lint.config.void_inline': true,
	'build.src': [ '/' ],
	'build.output': 'html',
	'build.allow.not_found': false,
	'build.allow.write': false,
	'build.allow.parse': false
}

/**
 * Get the config file as an object. Looks for the config file in the current working directory
 * @return {{ok: (Object | null), err: (String | null)}}
 */
export const getCongif = () => {
	const ajv = new Ajv()
	const parse = ajv.compileParser(schema)

	fs.readFile(path.join([process.cwd(), "hbml.json"]), (read_err, data) => {
		if (read_err) {
			return {ok: null, err: read_err.toString()}
		}
		const parsed = parse(data)
		if (!parsed) return {ok: null, err: parse.message}
		return {ok: {...defs, ...flatten(parsed)}, err: null}
	})
}
