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
						"keep_implicit": {"type": "boolean"},
						"void_inline": {"type": "boolean"},
						"element_preference": {"enum": ["bracket", "arrow", "preserve"]},
						"remove_empty": {"type": "boolean"}
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
	...(v && typeof v === 'object' && !Array.isArray(v) ? Object.entries(flatten(v)).reduce((p, [j, i]) => ({
		...p,
		[k + '.' + j]: i
	}), {}) : {[k]: v})
}), {});

/**
 * Default config values
 * @type {Object}
 */
export const CONFIG_DEFAULTS = {
	'lint.src': ['/'],
	'lint.output': '/',
	'lint.allow.not_found': false,
	'lint.allow.write': false,
	'lint.allow.parse': false,
	'lint.config.indent.character': '\t',
	'lint.config.indent.count': 1,
	'lint.config.pre_tag_space': 1,
	'lint.config.post_tag_space': 1,
	'lint.config.inline_same_line': true,
	'lint.config.keep_implicit': true,
	'lint.config.void_inline': true,
	'lint.config.element_preference': "preserve",
	'lint.config.remove_empty': false,
	'build.src': ['/'],
	'build.output': 'html',
	'build.allow.not_found': false,
	'build.allow.write': false,
	'build.allow.parse': false
}

/**
 * Get the config file as an object. Looks for the config file in the current working directory
 * @return {{ok: (Object | null), err: (String | null)}}
 */
export const getConfig = () => {
	const ajv = new Ajv()
	const parse = ajv.compileParser(schema)

	const conf_path = path.join(process.cwd(), "hbml.json")
	if (!fs.existsSync(conf_path)) return {ok: null, err: "Config file hbml.json not found in cwd"}
	const parsed = parse(fs.readFileSync(conf_path).toString())
	if (parsed === undefined) return {ok: null, err: parse.message}
	return {ok: {...CONFIG_DEFAULTS, ...flatten(parsed)}, err: null}
}
