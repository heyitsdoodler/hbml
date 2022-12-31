import fs from "fs";
import chalk from "chalk";
import npath from "path";

export const init_runner = (args) => {
	if (args["h"] !== undefined || args["help"] !== undefined) {
		init_help()
	}
	if (args["_"] !== undefined || args["_"].length > 1) {
		console.log(chalk.red(`Too many arguments provided! Expected at most 1! See 'hbml lint -h' for help`))
		process.exit(1)
	}
	const path = args["_"] ? args["_"][0] : process.cwd()
	delete args["_"]
	if (Object.keys(args).length > 0) {
		console.log(chalk.red(`Too many flags provided! Expected none! See 'hbml lint -h' for help`))
		process.exit(1)
	}
	init(path)
}

const init_default_hbml_config = `{
	build: {
		src: ["hbml"]
		output: "html"
	}
	lint: {
		src: ["hbml"]
	}
}`

const init = (path) => {
	// make sure the path exists
	if (!fs.existsSync(path)) fs.mkdirSync(path, {recursive: true})
	fs.writeFileSync(npath.join(path, "hbml.json"), init_default_hbml_config)
	if (!fs.existsSync(npath.join(path, "html"))) fs.mkdirSync(npath.join(path, "html"))
	if (!fs.existsSync(npath.join(path, "hbml"))) fs.mkdirSync(npath.join(path, "hbml"))
}

const init_help = () => {
	console.log(`Usage: hbml init ([project dir])

Initialises a HBML project in a directory

${chalk.bold(chalk.underline('Arguments:'))}
  [project dir]  Optional directory to initialise the project in. Defaults to current directory`);
	process.exit()
}
