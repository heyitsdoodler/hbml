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
 * Merge two objects dynamically using `a` as the default and `b` as the new object
 * See {@link https://stackoverflow.com/a/74743115/13285842|here} for were I got the code from
 * @param a{Object} Default values
 * @param b{Object} New values
 * @return {Object}
 */
const merge = (a, b) => [a, b].reduce((r, o) => Object
	.entries(o)
	.reduce((q, [k, v]) => ({
		...q,
		[k]: v && typeof v === 'object' ? merge(q[k] || {}, v) : v
	}), r), {})

/**
 * Default config values
 * @type {Object}
 */
const defs = {
	lint: {
		src: ["/"],
		output: "/",
		config: {
			indent: {
				character: "\t",
				count: 1
			},
			pre_tag_space: 1,
			post_tag_space: 1,
			inline_same_line: true,
			void_inline: true
		}
	},
	build: {
		src: ["/"],
		output: "html",
		allow: {
			not_found: false,
			write: false,
			parse: false,
		}
	}
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
		return {ok: merge(defs, parsed), err: null}
	})
}
