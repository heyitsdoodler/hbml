import npath from "path";
import fs from "fs";
import chalk from "chalk";

/**
 * Expand paths and directories into absolute path objects (read and write) with a write path prefix for relative paths
 * and directories
 * @param paths {string[]} Path and directory array to expand
 * @param prefix {string} Write path prefix for relative paths
 * @param pre {string} File extension for read file to look for
 * @param post {string} File extension for write file to look for
 * @return {{ok: {read: string, write: string}[], err: {path: string, type: string}[]}}
 */
export const expand_paths = (paths, prefix, pre = ".hbml", post = ".html") => {
	let out = []
	let err = []
	const cwd = process.cwd()
	const inner = (path, underDir) => {
		if (fs.existsSync(path)) {
			const isAbs = npath.isAbsolute(path)
			if (fs.lstatSync(path).isDirectory()) {
				fs.readdirSync(path).forEach((p) => inner(npath.join(path, p), true))
			} else {
				if (!path.endsWith(pre)) { if (!underDir) err.push({
					path: npath.join(isAbs ? "" : cwd, path),
					type: "file type"
				}) }
				else {
					out.push({
						read: npath.join(isAbs ? "" : cwd, path),
						write: npath.join(isAbs ? "" : npath.join(cwd, prefix), path.slice(0, -pre.length) + post)
					})
				}
			}
		} else {
			err.push({path: path, type: "not found"})
		}
	}
	paths.forEach((p) => inner(p, false))
	return {ok: out, err: err}
}

/**
 * Log {@link expand_paths} error result
 * @param errs {{path: string, type: string}[]} Error array
 * @param allow {Object} Allow argument object
 */
export const log_ep_err = (errs, allow) => {
	let breaking = false
	errs.forEach(({path, type}) => {
		switch (type) {
			case "file type":
				console.log(chalk.yellow(`Cannot build non-HBML files into HTML (${path})`));
				break
			case "not found":
				if (allow.not_found) {
					console.log(chalk.yellow(`Unable to read ${path}! Skipping over it`))
				} else {
					console.log(chalk.red(`Unable to read file ${path}! Stopping!\nTo skip over missing files, pass the -s=not_found flag`))
					breaking = true
				}
		}
	})
	if (breaking) process.exit(1)
}
